import { NextRequest, NextResponse } from "next/server";
import { getAIClient, type ChatMessage } from "@/lib/ai/client";
import {
  buildCompanionSystemPrompt,
  getAuthorSummary,
  getPublicArticleMeta,
  type CompanionMode,
} from "@/lib/ai/companion";

/**
 * 这个文件负责「前台看板娘聊天」的服务端流式输出。
 *
 * 为什么不用普通 JSON 一次性返回？
 * - LLM 生成文本需要时间，如果一次性返回，用户会长时间无反馈。
 * - 用 SSE 可以把模型输出按 chunk 实时推送给前端，实现“边生成边显示”。
 *
 * 整体流程：
 * 1) 校验请求体（mode/message/history）
 * 2) 拉取上下文（作者信息 + 公开文章元信息）
 * 3) 组装 system prompt 与历史消息
 * 4) 调用 AIClient.chatStream，边收到 chunk 边通过 SSE 推给前端
 * 5) 发送 done / error 事件并收尾
 */

interface CompanionHistoryMessage {
  /** 谁说的话，只允许 user / assistant，拒绝 system 等外部注入角色 */
  role: "user" | "assistant";
  /** 文本内容（会在入参阶段做长度裁剪） */
  content: string;
}

/**
 * 单条用户输入最大长度。
 * 目标：防止极端长输入直接把 token 打爆，导致延迟高/成本高/失败率上升。
 */
const MAX_USER_MESSAGE_LENGTH = 2000;

/**
 * 只保留最近 N 条历史消息。
 * 目标：保留上下文连续性，同时控制 prompt 体积。
 */
const MAX_HISTORY_MESSAGES = 12;

/**
 * 历史消息单条最大长度。
 * 即使某条历史消息非常长，也会被裁剪，避免污染当前请求。
 */
const MAX_HISTORY_MESSAGE_LENGTH = 1200;
// 服务端 chunk 合批：字符达到阈值立即发送，否则按固定间隔发送
const STREAM_CHUNK_FLUSH_INTERVAL_MS = 45;
const STREAM_CHUNK_FLUSH_MIN_CHARS = 48;

function isCompanionMode(value: unknown): value is CompanionMode {
  return value === "articles" || value === "author" || value === "free";
}

/**
 * 文本标准化：
 * - 非字符串 => 空字符串
 * - trim 去首尾空白
 * - slice 控制最大长度
 */
function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeHistory(value: unknown): CompanionHistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  /**
   * history 来自客户端，不可信：
   * - 角色必须命中白名单（user/assistant）
   * - content 必须是非空字符串
   * - content 会做长度裁剪
   */
  const normalized: CompanionHistoryMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const role = (item as { role?: unknown }).role;
    if (role !== "user" && role !== "assistant") {
      continue;
    }

    const content = normalizeText(
      (item as { content?: unknown }).content,
      MAX_HISTORY_MESSAGE_LENGTH
    );
    if (!content) {
      continue;
    }

    normalized.push({ role, content });
  }

  return normalized.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * 把事件编码为 SSE 协议帧：
 * event: <事件名>
 * data:  <JSON 字符串>
 *
 * <空行结束一帧>
 */
function formatSSEEvent(event: string, data: unknown): string {
  // SSE 协议格式：event + data + 空行，前端按空行分帧解析
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * 错误信息统一收敛：
 * - 避免把复杂错误对象直接透传给前端
 * - 统一成可展示的 message 文本
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "请求失败，请稍后重试";
  }
  return "请求失败，请稍后重试";
}

/**
 * 前台看板娘聊天（非 RAG，流式）
 * POST /api/ai/companion/chat/stream
 */
export async function POST(request: NextRequest) {
  // ===== A. 解析并校验请求 =====
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const mode = (body as { mode?: unknown })?.mode;
  const message = normalizeText(
    (body as { message?: unknown })?.message,
    MAX_USER_MESSAGE_LENGTH
  );
  // 历史消息只允许 user/assistant 角色，不信任前端传来的任意字段
  const history = normalizeHistory((body as { history?: unknown })?.history);

  if (!isCompanionMode(mode)) {
    return NextResponse.json(
      { error: "mode 必须是 articles / author / free" },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
  }

  // TextEncoder: 把字符串 SSE 帧编码为 Uint8Array 后写入 stream
  const encoder = new TextEncoder();

  /**
   * ReadableStream 是这里的核心：
   * - start(controller) 中可以持续 enqueue 数据块
   * - 每个 enqueue 都会尽快发给客户端（受代理配置影响）
   */
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // controller.close 可能同时由 abort/finally 触发，使用标记防止重复 close
      let closed = false;
      // 暂存尚未下发的增量 chunk，避免每个 token 都发一次 SSE 事件
      let bufferedChunk = "";
      let chunkFlushTimer: ReturnType<typeof setTimeout> | null = null;

      const clearChunkFlushTimer = () => {
        if (chunkFlushTimer === null) {
          return;
        }
        clearTimeout(chunkFlushTimer);
        chunkFlushTimer = null;
      };

      /**
       * 统一关闭出口：
       * - 客户端断开（abort）会触发
       * - 正常结束（finally）也会触发
       */
      const close = () => {
        clearChunkFlushTimer();
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      /**
       * 统一发事件方法：
       * - 如果已经关闭或请求已中断，直接丢弃后续事件
       * - 每次发送一帧完整 SSE
       */
      const sendEvent = (event: string, data: unknown) => {
        if (closed || request.signal.aborted) {
          return;
        }

        // 每次 enqueue 一帧 SSE，前端会实时消费
        controller.enqueue(encoder.encode(formatSSEEvent(event, data)));
      };

      const flushBufferedChunk = () => {
        clearChunkFlushTimer();
        if (!bufferedChunk) {
          return;
        }
        sendEvent("chunk", { content: bufferedChunk });
        bufferedChunk = "";
      };

      const scheduleChunkFlush = () => {
        if (chunkFlushTimer !== null || closed || request.signal.aborted) {
          return;
        }
        chunkFlushTimer = setTimeout(() => {
          chunkFlushTimer = null;
          flushBufferedChunk();
        }, STREAM_CHUNK_FLUSH_INTERVAL_MS);
      };

      const handleAbort = () => {
        close();
      };

      request.signal.addEventListener("abort", handleAbort);

      try {
        // ===== B. 启动阶段事件 =====
        // 事件1：告诉前端“已接收请求并开始处理”
        sendEvent("start", {
          mode,
          startedAt: new Date().toISOString(),
        });

        // ===== C. 准备上下文 =====
        // 拉取“站内上下文”：用于构造系统提示词，不走 RAG 检索
        const [articles, author] = await Promise.all([
          getPublicArticleMeta(),
          getAuthorSummary(),
        ]);

        // 事件2：把上下文规模告诉前端，便于 UI 做状态展示（非必须）
        sendEvent("context", {
          articleCount: articles.length,
          author: author.displayName,
        });

        const systemPrompt = buildCompanionSystemPrompt({
          mode,
          author,
          articles,
        });

        /**
         * messages 顺序说明：
         * 1) system：定义助手身份、模式、站内边界
         * 2) history：承接上下文
         * 3) user：本轮最新问题
         */
        const messages: ChatMessage[] = [
          // 系统提示词 + 裁剪后的历史 + 当前问题
          { role: "system", content: systemPrompt },
          ...history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: "user", content: message },
        ];

        const aiClient = getAIClient();
        let streamedContent = "";
        // ===== D. 调用模型并流式转发 =====
        // chatStream 会持续回调 chunk，这里把每个 chunk 转成 SSE 推给前端
        const response = await aiClient.chatStream(
          messages,
          {
            // 自由聊模式允许更发散；文章/作者模式更收敛
            temperature: mode === "free" ? 0.8 : 0.6,
            // 单轮回复长度上限
            maxTokens: 1000,
            // 与 HTTP 请求生命周期联动：前端 stop 或断开会中断模型生成
            signal: request.signal,
          },
          (chunk) => {
            streamedContent += chunk;
            bufferedChunk += chunk;

            if (bufferedChunk.length >= STREAM_CHUNK_FLUSH_MIN_CHARS) {
              // 到达字符阈值立即发送，避免用户感知延迟
              flushBufferedChunk();
              return;
            }

            // 小 chunk 按固定间隔批量发送，减少 SSE 事件风暴
            scheduleChunkFlush();
          }
        );

        // ===== E. 正常完成 =====
        flushBufferedChunk();
        // 事件4：最终完成，返回完整文本与 token 消耗
        sendEvent("done", {
          // 理论上 response.content 与 streamedContent 一致，这里做一次兜底
          content: response.content || streamedContent,
          tokensUsed: response.tokensUsed,
          finishedAt: new Date().toISOString(),
        });
      } catch (error) {
        // ===== F. 异常处理 =====
        if (!request.signal.aborted) {
          flushBufferedChunk();
          console.error("AI 看板娘流式对话失败:", error);
          // 事件5：错误事件，前端会显示友好报错而不是直接中断
          sendEvent("error", { message: getErrorMessage(error) });
        }
      } finally {
        // ===== G. 收尾 =====
        // 避免事件监听泄漏
        request.signal.removeEventListener("abort", handleAbort);
        close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform 避免中间层对流式内容做压缩/改写，影响分块实时性
      "Cache-Control": "no-cache, no-transform",
      // 告诉代理保持长连接
      Connection: "keep-alive",
      // 禁用 Nginx 代理缓冲，保证 chunk 即时下发
      "X-Accel-Buffering": "no",
    },
  });
}
