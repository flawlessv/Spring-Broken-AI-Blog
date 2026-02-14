import OpenAI from "openai";

// openai 库是 Kimi 官方推荐的调用方式，因为 Kimi API 兼容 OpenAI 格式

export interface AIClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse>;
  embed(text: string | string[]): Promise<number[][]>;
}

/**
 * 聊天消息接口
 * 用于定义与 AI 模型交互的消息格式
 */
export interface ChatMessage {
  /** 消息角色：用户、助手或系统 */
  role: "user" | "assistant" | "system";
  /** 消息内容 */
  content: string;
}

/**
 * 聊天选项配置接口
 * 用于自定义 AI 对话的行为参数
 */
export interface ChatOptions {
  /** 使用的模型名称，默认使用环境变量 KIMI_MODEL 或 "moonshot-v1-32k" */
  model?: string;
  /** 温度参数，控制输出的随机性（0-2），值越高越随机，默认 0.7 */
  temperature?: number;
  /** 最大生成 token 数，限制回复长度，默认 2000 */
  maxTokens?: number;
  /** 中断信号，用于取消流式请求 */
  signal?: AbortSignal;
}

/**
 * 聊天响应接口
 * 包含 AI 生成的回复内容和 token 使用统计
 */
export interface ChatResponse {
  /** AI 生成的完整回复内容 */
  content: string;
  /** 本次对话消耗的 token 数量（如果 API 返回） */
  tokensUsed?: number;
}

/**
 * 对多个 embedding 向量求平均
 * 用于合并长文本分块后的多个 embedding 向量
 */
function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error("无法对空数组求平均");
  }

  const dimension = embeddings[0].length;
  const averaged = new Array(dimension).fill(0);

  // 累加所有向量
  for (const embedding of embeddings) {
    if (embedding.length !== dimension) {
      throw new Error(
        `Embedding 向量维度不一致: 期望 ${dimension}，实际 ${embedding.length}`
      );
    }
    for (let i = 0; i < dimension; i++) {
      averaged[i] += embedding[i];
    }
  }

  // 求平均
  for (let i = 0; i < dimension; i++) {
    averaged[i] /= embeddings.length;
  }

  return averaged;
}

/**
 * 带重试机制的 Ollama embedding 获取
 * @param baseUrl Ollama 服务地址
 * @param model 使用的模型名称
 * @param text 要处理的文本
 * @param maxRetries 最大重试次数
 * @returns embedding 向量
 */
async function getEmbeddingWithRetry(
  baseUrl: string,
  model: string,
  text: string,
  maxRetries: number
): Promise<number[]> {
  let retries = maxRetries;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
        signal: controller.signal,
        cache: "no-store", // 禁用 Next.js 的 fetch 缓存
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama embedding 失败: ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("Ollama 返回的 embedding 数据无效");
      }

      return data.embedding; // 成功，返回 embedding
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries--;

      if (retries > 0) {
        console.warn(
          `[Ollama] Embedding 失败，剩余重试次数: ${retries}，错误: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒后重试
      }
    }
  }

  // 所有重试都失败
  throw new Error(
    `Ollama embedding 失败: ${lastError?.message}，请确保 Ollama 服务已启动`
  );
}

/**
 * Ollama 本地 Embedding (免费)
 * 注意：Kimi 目前不支持 embedding API，所以需要用 Ollama 来生成向量
 *
 * @param text 要处理的文本，可以是单个字符串或字符串数组
 *   - 单个字符串：一个文本块（如文章的一个语义段落）
 *   - 字符串数组：多个文本块（批量处理）
 *
 * @returns 返回 embedding 向量数组
 *
 * 处理逻辑：
 * 1. 如果输入是数组，遍历每个文本块
 * 2. 对于每个文本块：
 *    - 如果 ≤ 800 字符：直接生成 embedding，返回 1 个向量
 *    - 如果 > 800 字符：按 800 字符硬切分块，对每个子块生成 embedding，返回多个向量
 * 3. 返回所有 embedding 向量数组
 *
 * 重要：如果输入文本超过 800 字符，会返回多个向量（每个子块一个）
 * 调用方需要处理这种情况，为每个向量创建独立的存储记录
 *
 * 注意：
 * - 在 RAG 场景中，文章应该先用 chunkPost() 按语义分块，每个块单独调用此函数
 * - chunkPost() 已经严格控制块大小，理论上不应该超过 800 字符
 * - 如果仍有超过 800 字符的块，会被硬切并返回多个向量，保持子块的独立性
 */
async function ollamaEmbed(text: string | string[]): Promise<number[][]> {
  const texts = Array.isArray(text) ? text : [text];
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

  const embeddings: number[][] = [];

  // 遍历每个输入的文本块
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    const MAX_CHUNK_SIZE = 800; // Ollama nomic-embed-text 对单次输入限制在 800 字符

    if (t.length <= MAX_CHUNK_SIZE) {
      // 短文本（≤800字符）：直接处理，生成一个 embedding
      const embedding = await getEmbeddingWithRetry(baseUrl, model, t, 3);
      embeddings.push(embedding);
    } else {
      // 长文本（>800字符）：硬切分块处理
      // 注意：这是按字符数硬切，不考虑语义边界，可能破坏语义完整性
      // 但为了遵守 Ollama 的限制，必须这样做
      const chunks: string[] = [];
      const chunkOverlap = 50; // 子块之间的重叠，减少割裂感

      let start = 0;
      while (start < t.length) {
        const end = Math.min(start + MAX_CHUNK_SIZE, t.length);
        chunks.push(t.slice(start, end));

        // 下一个块的起始位置，保留重叠
        start = end - chunkOverlap;
        if (start >= t.length - chunkOverlap) {
          // 处理最后一部分
          if (end < t.length) {
            chunks.push(t.slice(start));
          }
          break;
        }
      }

      console.log(
        `[Ollama] 文本长度 ${t.length} 字符，硬切为 ${chunks.length} 个子块处理`
      );

      // 对每个子块分别生成 embedding，返回多个向量
      // 这样保持子块的独立性，不会丢失信息
      for (const chunk of chunks) {
        const embedding = await getEmbeddingWithRetry(baseUrl, model, chunk, 3);
        embeddings.push(embedding);
      }
    }
  }

  // 返回结果：可能包含多个向量（如果输入文本超过 800 字符）
  return embeddings;
}

/**
 * Kimi 客户端 (Moonshot AI)
 *
 * 使用 openai 库调用，因为 Kimi API 完全兼容 OpenAI 格式
 * 只需要修改 baseURL 和 apiKey 即可
 */
class KimiClient implements AIClient {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      throw new Error("请配置 KIMI_API_KEY 环境变量");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
    });
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || process.env.KIMI_MODEL || "moonshot-v1-32k",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      tokensUsed: response.usage?.total_tokens,
    };
  }

  async chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {},
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    const stream = await this.client.chat.completions.create(
      {
        model: options.model || process.env.KIMI_MODEL || "moonshot-v1-32k",
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true,
      },
      options.signal ? { signal: options.signal } : undefined
    );

    let fullContent = "";
    let tokensUsed = 0;

    for await (const chunk of stream) {
      if (options.signal?.aborted) {
        break;
      }

      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        onChunk?.(content);
      }

      // 累计 token 使用量（如果可用）
      if (chunk.usage?.total_tokens) {
        tokensUsed = chunk.usage.total_tokens;
      }
    }

    return {
      content: fullContent,
      tokensUsed: tokensUsed || undefined,
    };
  }

  async embed(text: string | string[]): Promise<number[][]> {
    // Kimi 不支持 embedding API，使用 Ollama 本地服务
    return ollamaEmbed(text);
  }
}

// 单例
let aiClientInstance: AIClient | null = null;

/**
 * 获取 AI 客户端实例（单例模式）
 */
export function getAIClient(): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new KimiClient();
  }
  return aiClientInstance;
}
