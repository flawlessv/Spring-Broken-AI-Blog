"use client";

import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpenText,
  Loader2,
  MessageCircleMore,
  SendHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 前台看板娘聊天组件（客户端）
 *
 * 职责拆分：
 * 1) UI：右下角悬浮入口 + 聊天面板
 * 2) 网络：调用 /api/ai/companion/chat/stream 并解析 SSE
 * 3) 状态：消息列表、模式、输入框、流式进行中状态
 * 4) 增强：加载 Live2D 模型；Markdown 渲染失败兜底
 */

type CompanionMode = "articles" | "author" | "free";
type MessageRole = "user" | "assistant";

interface CompanionMessage {
  /** 前端本地唯一 ID：用于 React 渲染 key 和定位占位消息 */
  id: string;
  /** 消息来源角色 */
  role: MessageRole;
  /** 消息文本正文 */
  content: string;
  /** 是否错误消息：用于 UI 高亮红色边框和文本 */
  isError?: boolean;
}

interface PersistedChatState {
  /** 上次用户选择的模式 */
  mode: CompanionMode;
  /** 本地缓存的历史消息 */
  messages: CompanionMessage[];
}

interface CompanionArticlesResponse {
  /** 站内公开文章总数（用于顶部提示） */
  total?: number;
}

interface SSEPayload {
  /**
   * 服务端 chunk/done 事件主字段：
   * - chunk: 增量文本
   * - done: 完整文本兜底
   */
  content?: string;
  /** 服务端 error 事件主字段 */
  message?: string;
  /** 兼容扩展字段 */
  [key: string]: unknown;
}

declare global {
  interface Window {
    // live2d-widget 脚本会在 window 上挂载全局对象
    L2Dwidget?: {
      init: (config: Record<string, unknown>) => void;
    };
    // 防止在 React 重新渲染或多页面切换时重复 init 同一个 widget
    __sbLive2DInitialized?: boolean;
  }
}

const STORAGE_KEY = "anime-companion-chat-v1";
// 仅在浏览器本地保存最近 N 条消息，防止 localStorage 膨胀
const MAX_LOCAL_MESSAGES = 30;
// 每次请求只携带最近 N 条上下文，控制 token 和响应耗时
const MAX_HISTORY_MESSAGES = 12;
// 高频 SSE chunk 的前端合批策略：超过阈值立即 flush，否则按固定间隔 flush
const CHUNK_FLUSH_INTERVAL_MS = 33;
const CHUNK_FLUSH_MIN_CHARS = 24;
const LIVE2D_ENABLED =
  (process.env.NEXT_PUBLIC_COMPANION_LIVE2D_ENABLED || "true")
    .trim()
    .toLowerCase() !== "false";
const LIVE2D_SCRIPT_URL =
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_SCRIPT_URL ||
  "https://unpkg.com/live2d-widget@3.1.4/lib/L2Dwidget.min.js";
const LIVE2D_MODEL_URL =
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_MODEL_URL ||
  "https://unpkg.com/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json";
const LIVE2D_DISPLAY_POSITION =
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_POSITION === "left"
    ? "left"
    : "right";
const LIVE2D_DISPLAY_WIDTH = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_WIDTH || "176"
);
const LIVE2D_DISPLAY_HEIGHT = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_HEIGHT || "360"
);
const LIVE2D_H_OFFSET = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_H_OFFSET || "8"
);
const LIVE2D_V_OFFSET = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_V_OFFSET || "-18"
);
const LIVE2D_SCALE = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_SCALE || "0.9"
);
const LIVE2D_OPACITY = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_OPACITY || "0.95"
);
const LIVE2D_MOBILE_SHOW =
  (process.env.NEXT_PUBLIC_COMPANION_LIVE2D_MOBILE_SHOW || "false")
    .trim()
    .toLowerCase() === "true";
const LIVE2D_MOBILE_SCALE = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_MOBILE_SCALE || "0.5"
);
const LIVE2D_DISABLE_AT_OR_BELOW_WIDTH = Number(
  process.env.NEXT_PUBLIC_COMPANION_LIVE2D_DISABLE_AT_OR_BELOW_WIDTH || "768"
);
const QUICK_START_OPTIONS: Array<{
  mode: CompanionMode;
  label: string;
  prompt: string;
}> = [
  {
    mode: "articles",
    label: "了解文章",
    prompt: "推荐 3 篇适合先看的文章，并说下推荐理由。",
  },
  {
    mode: "author",
    label: "了解作者",
    prompt: "简单介绍一下作者的技术背景和擅长方向。",
  },
  {
    mode: "free",
    label: "随便聊",
    prompt: "你好，先用一句话介绍你自己。",
  },
];

function createId(): string {
  // 优先使用浏览器原生 UUID，降级为时间戳+随机串
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSSEBlock(
  block: string
): { event: string; payload: SSEPayload | null } | null {
  // SSE 原始块可能包含 CRLF，统一处理成 LF 便于解析
  const normalized = block.replace(/\r/g, "").trim();
  if (!normalized) {
    return null;
  }

  let event = "message";
  const dataLines: string[] = [];

  for (const line of normalized.split("\n")) {
    // 形如：event: chunk
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }

    // 形如：data: {"content":"..."}
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    // 某些事件可能只有 event 没有 data
    return { event, payload: null };
  }

  const rawData = dataLines.join("\n");
  try {
    const payload = JSON.parse(rawData) as SSEPayload;
    return { event, payload };
  } catch {
    // 兼容后端异常场景：data 不是 JSON 时也尽量保留文本
    return { event, payload: { message: rawData } };
  }
}

async function consumeSSE(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: string, payload: SSEPayload | null) => void
) {
  // fetch 流式读取 + 手动分帧，避免 EventSource 不能带 POST body 的限制
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    // 逐段拼接文本，SSE 一帧可能被拆在多次 read 中
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      // SSE 帧之间以空行分隔
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const parsed = parseSSEBlock(block);
      if (parsed) {
        // 把解析后的事件交给调用方（sendMessage）处理
        onEvent(parsed.event, parsed.payload);
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) {
    // 处理“最后一帧刚好没有双换行结尾”的尾包场景
    const parsed = parseSSEBlock(buffer);
    if (parsed) {
      onEvent(parsed.event, parsed.payload);
    }
  }
}

class MarkdownErrorBoundary extends Component<
  { content: string; children: ReactNode },
  { hasError: boolean }
> {
  // Markdown 渲染报错时降级为纯文本，避免整块聊天 UI 崩溃
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Markdown 渲染失败，已降级为纯文本:", error);
  }

  componentDidUpdate(prevProps: { content: string }) {
    if (prevProps.content !== this.props.content && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
          {this.props.content}
        </p>
      );
    }
    return this.props.children;
  }
}

function AssistantMarkdown({ content }: { content: string }) {
  // AI 回复默认按 Markdown 渲染，出错时由 ErrorBoundary 兜底为纯文本
  return (
    <MarkdownErrorBoundary content={content}>
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}

export default function AnimeAssistantChat() {
  // 是否展开聊天面板
  const [open, setOpen] = useState(false);
  // 当前对话模式：文章 / 作者 / 自由聊
  const [mode, setMode] = useState<CompanionMode>("articles");
  // 当前会话消息（用户+助手）
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  // 输入框内容
  const [input, setInput] = useState("");
  // 当前是否处于流式接收中（用于禁用重复发送/显示停止按钮）
  const [isStreaming, setIsStreaming] = useState(false);
  // 文章元信息统计（用于头部提示）
  const [articlesTotal, setArticlesTotal] = useState<number | null>(null);
  // 文章元信息加载错误提示
  const [metaError, setMetaError] = useState<string>("");
  // Live2D 是否成功初始化并可交互
  const [live2dReady, setLive2dReady] = useState(false);
  // Live2D 加载失败标记（显示降级提示）
  const [live2dFailed, setLive2dFailed] = useState(false);
  // 移动端主动禁用 Live2D 标记
  const [live2dDisabledOnMobile, setLive2dDisabledOnMobile] = useState(false);

  // 聊天滚动容器，用于每次追加消息后自动滚到底部
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 记录当前请求的 AbortController，支持“停止生成”
  const abortRef = useRef<AbortController | null>(null);
  // 当前流式会话对应的 assistant 消息 ID（用于定向更新最后一条助手消息）
  const activeAssistantIdRef = useRef<string | null>(null);
  // 暂存尚未刷入 UI 的增量 chunk，避免每个 token 都触发一次 setState
  const streamChunkBufferRef = useRef("");
  // chunk flush 定时器句柄
  const streamFlushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 首次挂载：从 localStorage 恢复模式和最近聊天记录
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }
      const parsed = JSON.parse(saved) as PersistedChatState;
      if (
        parsed.mode === "articles" ||
        parsed.mode === "author" ||
        parsed.mode === "free"
      ) {
        setMode(parsed.mode);
      }
      if (Array.isArray(parsed.messages)) {
        // 只接收结构合法的数据，防止本地缓存脏数据污染运行时
        const safeMessages = parsed.messages
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-MAX_LOCAL_MESSAGES);
        setMessages(safeMessages);
      }
    } catch {
      // localStorage 非关键逻辑，解析失败直接忽略，避免影响首次使用
    }
  }, []);

  useEffect(() => {
    // 每次 mode/messages 变化，持久化到 localStorage
    const toSave: PersistedChatState = {
      mode,
      messages: messages.slice(-MAX_LOCAL_MESSAGES),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [mode, messages]);

  useEffect(() => {
    // 拉取站内公开文章元信息，仅用于前端显示和提示（不参与回答渲染）
    let active = true;

    fetch("/api/ai/companion/articles", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("文章元信息加载失败");
        }
        const data = (await res.json()) as CompanionArticlesResponse;
        // active 防止组件卸载后 setState
        if (!active) {
          return;
        }
        setArticlesTotal(typeof data.total === "number" ? data.total : null);
        setMetaError("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        // 这里不阻断聊天，只提示“文章统计不可用”
        console.error("加载看板娘文章元信息失败:", error);
        setMetaError("文章列表加载失败");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // 初始化 Live2D 看板娘：桌面端启用，移动端禁用
    if (typeof window === "undefined") {
      return;
    }

    if (!LIVE2D_ENABLED) {
      return;
    }

    // 移动端禁用 Live2D：避免首屏成本和遮挡交互
    const isMobile = window.matchMedia(
      `(max-width: ${LIVE2D_DISABLE_AT_OR_BELOW_WIDTH}px)`
    ).matches;
    if (isMobile) {
      setLive2dDisabledOnMobile(true);
      return;
    }

    let disposed = false;
    let widgetEl: HTMLElement | null = null;

    const onWidgetClick = () => {
      // 允许用户直接点击看板娘实体打开聊天
      setOpen(true);
    };

    const bindWidget = (retry = 0) => {
      if (disposed) {
        return;
      }

      widgetEl = document.getElementById("live2d-widget");
      if (!widgetEl) {
        // 脚本加载后 DOM 可能稍晚插入，短暂重试绑定
        if (retry < 20) {
          window.setTimeout(() => bindWidget(retry + 1), 160);
        } else {
          setLive2dFailed(true);
        }
        return;
      }

      widgetEl.style.zIndex = "65";
      widgetEl.style.pointerEvents = "auto";
      widgetEl.style.right = "10px";
      widgetEl.style.bottom = "0";
      // 这里统一强制定位，避免外部样式覆盖导致模型飘位
      // 绑定点击事件，把“形象展示”和“聊天交互”连接起来
      widgetEl.addEventListener("click", onWidgetClick);
      setLive2dReady(true);
      setLive2dFailed(false);
    };

    const initWidget = () => {
      if (disposed || !window.L2Dwidget) {
        return;
      }

      if (!window.__sbLive2DInitialized) {
        // 仅首次真正 init，后续页面复用已挂载的全局 widget
        window.L2Dwidget.init({
          model: {
            jsonPath: LIVE2D_MODEL_URL,
            scale: LIVE2D_SCALE,
          },
          display: {
            // 固定右下角显示尺寸
            position: LIVE2D_DISPLAY_POSITION,
            width: LIVE2D_DISPLAY_WIDTH,
            height: LIVE2D_DISPLAY_HEIGHT,
            // 通过偏移与聊天按钮避让
            hOffset: LIVE2D_H_OFFSET,
            vOffset: LIVE2D_V_OFFSET,
          },
          mobile: {
            // 在库层面也关闭移动端展示
            show: LIVE2D_MOBILE_SHOW,
            scale: LIVE2D_MOBILE_SCALE,
          },
          react: {
            // 非 1.0 的不透明度可以减少“贴纸感”
            opacity: LIVE2D_OPACITY,
          },
          dialog: {
            // 关闭模型自带对话泡泡，避免和我们自定义聊天 UI 冲突
            enable: false,
          },
        });

        window.__sbLive2DInitialized = true;
      }

      // 初始化后统一在这里处理交互绑定与状态同步
      bindWidget();
    };

    const scriptId = "sb-live2d-widget-script";
    const existingScript = document.getElementById(
      scriptId
    ) as HTMLScriptElement | null;

    let removeLoadListener: (() => void) | null = null;
    let removeErrorListener: (() => void) | null = null;

    if (window.L2Dwidget) {
      // 脚本已在别处加载过，直接复用
      initWidget();
    } else if (existingScript) {
      // 脚本正在加载中，监听已有 script 的 load/error
      const handleLoad = () => {
        initWidget();
      };
      const handleError = () => {
        if (!disposed) {
          setLive2dFailed(true);
        }
      };
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
      removeLoadListener = () =>
        existingScript.removeEventListener("load", handleLoad);
      removeErrorListener = () =>
        existingScript.removeEventListener("error", handleError);
    } else {
      // 首次进入页面时动态注入脚本，按需加载减少首屏体积
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = LIVE2D_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        initWidget();
      };
      script.onerror = () => {
        if (!disposed) {
          setLive2dFailed(true);
        }
      };
      document.body.appendChild(script);
    }

    return () => {
      // 组件卸载时清理事件，防止重复绑定和内存泄漏
      disposed = true;
      if (widgetEl) {
        widgetEl.removeEventListener("click", onWidgetClick);
      }
      removeLoadListener?.();
      removeErrorListener?.();
    };
  }, []);

  useEffect(() => {
    // 面板打开时，只要消息有变化就滚动到底部
    if (!open) {
      return;
    }
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  useEffect(
    () => () => {
      // 组件卸载时中断进行中的请求，避免后台继续占用资源
      abortRef.current?.abort();
      if (streamFlushTimerRef.current !== null) {
        window.clearTimeout(streamFlushTimerRef.current);
        streamFlushTimerRef.current = null;
      }
    },
    []
  );

  const stopStream = () => {
    // “停止生成”：直接触发 abort，服务端会收到中断信号
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  };

  const clearConversation = () => {
    // 清空前先停止正在进行的流式请求，避免后续 chunk 再写回旧会话
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    resetStreamingRuntime();
    setInput("");
    setMessages([]);
  };

  const updateActiveAssistantMessage = (
    updater: (item: CompanionMessage) => CompanionMessage
  ) => {
    const assistantId = activeAssistantIdRef.current;
    if (!assistantId) {
      return;
    }

    setMessages((prev) => {
      const index = prev.findIndex((item) => item.id === assistantId);
      if (index === -1) {
        return prev;
      }
      const current = prev[index];
      const nextItem = updater(current);
      if (nextItem === current) {
        return prev;
      }
      const next = [...prev];
      next[index] = nextItem;
      return next;
    });
  };

  const clearChunkFlushTimer = () => {
    if (streamFlushTimerRef.current === null) {
      return;
    }
    window.clearTimeout(streamFlushTimerRef.current);
    streamFlushTimerRef.current = null;
  };

  const flushPendingAssistantChunk = () => {
    const pendingChunk = streamChunkBufferRef.current;
    if (!pendingChunk) {
      return;
    }
    streamChunkBufferRef.current = "";
    updateActiveAssistantMessage((item) => ({
      ...item,
      content: `${item.content}${pendingChunk}`,
    }));
  };

  const scheduleChunkFlush = () => {
    if (streamFlushTimerRef.current !== null) {
      return;
    }
    streamFlushTimerRef.current = window.setTimeout(() => {
      streamFlushTimerRef.current = null;
      flushPendingAssistantChunk();
    }, CHUNK_FLUSH_INTERVAL_MS);
  };

  const enqueueAssistantChunk = (chunk: string) => {
    if (!chunk) {
      return;
    }
    streamChunkBufferRef.current += chunk;

    if (streamChunkBufferRef.current.length >= CHUNK_FLUSH_MIN_CHARS) {
      // 达到字符阈值立刻提交，保证响应足够实时
      clearChunkFlushTimer();
      flushPendingAssistantChunk();
      return;
    }

    // 小 chunk 走定时批量提交，降低渲染频率
    scheduleChunkFlush();
  };

  const resetStreamingRuntime = () => {
    clearChunkFlushTimer();
    streamChunkBufferRef.current = "";
    activeAssistantIdRef.current = null;
  };

  const sendMessage = async (options?: {
    content?: string;
    mode?: CompanionMode;
  }) => {
    // ===== 第 0 步：前置校验 =====
    const content = (options?.content ?? input).trim();
    const modeToSend = options?.mode ?? mode;
    // 空文本或当前已有进行中的请求时，不允许重复发送
    if (!content || isStreaming) {
      return;
    }

    // 通过“快速开始”发送时，同步更新当前模式，便于后续继续追问
    if (mode !== modeToSend) {
      setMode(modeToSend);
    }

    // 仅带最近消息给后端，控制 token 消耗和延迟
    const history = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((item) => ({ role: item.role, content: item.content }));

    const userMessage: CompanionMessage = {
      id: createId(),
      role: "user",
      content,
    };
    const assistantId = createId();
    const assistantPlaceholder: CompanionMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    // ===== 第 1 步：乐观更新 UI =====
    // 立即把“用户消息 + 空助手气泡”插入列表，避免用户感知等待
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    // 当前请求只会更新这条助手占位消息
    activeAssistantIdRef.current = assistantId;
    streamChunkBufferRef.current = "";
    clearChunkFlushTimer();
    setInput("");
    setIsStreaming(true);

    // ===== 第 2 步：发起流式请求 =====
    const controller = new AbortController();
    // 存到 ref，供 stopStream 和卸载清理时访问
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/companion/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: modeToSend,
          message: content,
          history,
        }),
        signal: controller.signal,
      });

      // 这里要求 response.body 存在，否则无法按 chunk 读取
      if (!response.ok || !response.body) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error || "AI 助手暂时不可用");
      }

      // ===== 第 3 步：消费 SSE，按事件类型更新 UI =====
      await consumeSSE(response.body, (event, payload) => {
        if (event === "chunk") {
          // 先写入 buffer，再批量 flush 到 UI，避免“每 token 一次 setState”
          const chunk =
            typeof payload?.content === "string" ? payload.content : "";
          enqueueAssistantChunk(chunk);
          return;
        }

        if (event === "done") {
          // done 前先把 buffer 里未刷新的尾巴提交到 UI
          flushPendingAssistantChunk();
          // 正常情况下 chunk 已经拼满；这里处理“只收到 done”或最后补齐
          const finalContent =
            typeof payload?.content === "string" ? payload.content : "";
          if (!finalContent) {
            return;
          }
          updateActiveAssistantMessage((item) =>
            item.content ? item : { ...item, content: finalContent }
          );
          return;
        }

        if (event === "error") {
          // 服务端显式 error 事件也走统一异常分支
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "AI 助手处理失败，请稍后重试"
          );
        }
      });
    } catch (error) {
      // ===== 第 4 步：统一异常兜底 =====
      // 避免定时器尚未触发导致“最后几个 chunk 丢失”
      clearChunkFlushTimer();
      flushPendingAssistantChunk();

      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";
      if (!isAbortError) {
        console.error("看板娘对话失败:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "AI 助手处理失败，请稍后重试";
        updateActiveAssistantMessage((item) => ({
          ...item,
          content: `抱歉，这次回复失败了：${errorMessage}`,
          isError: true,
        }));
      } else {
        // 用户主动停止时，如果助手气泡还是空的，给一条中断提示
        updateActiveAssistantMessage((item) =>
          item.content
            ? item
            : {
                ...item,
                content: "本次回复已停止，你可以继续提问。",
                isError: true,
              }
        );
      }
    } finally {
      // ===== 第 5 步：收尾，释放请求句柄 =====
      abortRef.current = null;
      setIsStreaming(false);
      resetStreamingRuntime();
    }
  };

  const handleQuickStart = (option: (typeof QUICK_START_OPTIONS)[number]) => {
    if (isStreaming) {
      return;
    }

    // 满足“先填充到输入框，再自动发送”的交互预期
    setInput(option.prompt);
    void sendMessage({ content: option.prompt, mode: option.mode });
  };

  return (
    <div
      className={cn(
        "fixed right-4 z-[70] flex flex-col items-end gap-3",
        live2dReady ? "bottom-6" : "bottom-5"
      )}
    >
      {open && (
        // 聊天主面板（标题区 / 消息区 / 输入区）
        <section className="w-[min(92vw,380px)] h-[min(72vh,560px)] rounded-3xl border border-border/70 bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col">
          <header className="relative px-4 py-3 border-b border-border/70 bg-gradient-to-r from-rose-100/70 via-orange-100/60 to-yellow-100/70 dark:from-rose-950/50 dark:via-zinc-900 dark:to-amber-950/40">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  前台看板娘 小春
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {metaError
                    ? metaError
                    : `已加载 ${articlesTotal ?? "…"} 篇公开文章元信息`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="关闭聊天"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={clearConversation}
                disabled={
                  messages.length === 0 && !isStreaming && !input.trim()
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                清空对话
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          >
            {/* 空态提示 */}
            {messages.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground leading-6">
                <p>
                  我是小春，可以陪你快速了解站点内容。
                  <br />
                  你也可以直接点下面的快速问题开始聊天。
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {QUICK_START_OPTIONS.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => handleQuickStart(option)}
                      className="rounded-xl border border-border bg-background/80 px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <span className="mb-1 inline-flex w-full items-center justify-center">
                        {option.mode === "articles" && (
                          <BookOpenText className="h-3.5 w-3.5" />
                        )}
                        {option.mode === "author" && (
                          <UserRound className="h-3.5 w-3.5" />
                        )}
                        {option.mode === "free" && (
                          <MessageCircleMore className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                    : "mr-auto bg-muted text-foreground rounded-bl-md border border-border/60",
                  message.isError && "border-destructive/40 text-destructive"
                )}
              >
                {message.role === "assistant" ? (
                  isStreaming &&
                  message.id === activeAssistantIdRef.current &&
                  message.content.trim().length === 0 ? (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      思考中...
                    </p>
                  ) : (
                    // 助手消息始终按 Markdown 渲染
                    <AssistantMarkdown content={message.content} />
                  )
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            ))}
          </div>

          <footer className="border-t border-border/70 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter 发送；Shift+Enter 换行
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="输入内容，回车发送，Shift+回车换行"
                className="flex-1 min-h-[42px] max-h-28 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStream}
                  className="h-[42px] px-3 rounded-xl border border-border bg-muted text-sm font-medium hover:bg-accent"
                >
                  {/* 流式进行中显示“停止”，直接触发 abort */}
                  停止
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim()}
                  className="h-[42px] w-[42px] inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="发送消息"
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </footer>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "group relative",
          live2dReady &&
            "h-11 px-4 rounded-full border border-border/70 bg-background/95 backdrop-blur-md shadow-lg"
        )}
        aria-label={open ? "收起看板娘聊天" : "打开看板娘聊天"}
      >
        {live2dReady ? (
          // Live2D 可用时：入口按钮简化为“文字胶囊”，避免遮挡模型主体
          <span className="relative inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircleMore className="w-4 h-4" />
            )}
            {open ? "收起对话" : "和小春聊天"}
          </span>
        ) : (
          // Live2D 不可用时：退化成内置小头像，不影响聊天能力
          <>
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300 blur opacity-60 group-hover:opacity-90 transition-opacity" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-xl bg-gradient-to-b from-pink-200 via-rose-200 to-orange-200 dark:from-rose-900 dark:via-zinc-800 dark:to-amber-900">
              <span className="absolute top-[6px] h-4 w-10 rounded-t-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400" />
              <span className="absolute top-[25px] left-[20px] h-2.5 w-2.5 rounded-full bg-zinc-800 dark:bg-zinc-100" />
              <span className="absolute top-[25px] right-[20px] h-2.5 w-2.5 rounded-full bg-zinc-800 dark:bg-zinc-100" />
              <span className="absolute top-[33px] left-[30px] h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span className="absolute top-[37px] left-[25px] h-[2px] w-7 rounded-full bg-zinc-700 dark:bg-zinc-200" />
              {isStreaming && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              )}
            </span>
          </>
        )}
      </button>

      {live2dFailed && !live2dReady && !live2dDisabledOnMobile && (
        // 仅在桌面端且加载失败时提示，避免用户误以为“聊天也坏了”
        <p className="max-w-[220px] rounded-lg bg-muted/80 px-2.5 py-1.5 text-[11px] leading-4 text-muted-foreground border border-border/60">
          看板娘模型加载失败，当前使用简化头像。可能是 CDN 网络不可达。
        </p>
      )}
    </div>
  );
}
