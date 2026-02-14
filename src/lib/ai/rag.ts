/**
 * RAG（检索增强生成）模块
 *
 * 本模块提供三个核心函数，用于不同的使用场景：
 *
 * 1. **semanticSearch** - 语义搜索（仅搜索）
 *    - 功能：只做向量搜索，不生成回答
 *    - 返回：文章列表（包含相似度分数）
 *    - 适用：文章推荐、内容搜索
 *    - 特点：不调用 LLM，性能最快
 *
 * 2. **ragQuery** - RAG 问答（同步）
 *    - 功能：搜索 + 生成完整回答
 *    - 返回：完整回答、来源、token 消耗
 *    - 适用：后台处理、API 调用
 *    - 特点：同步返回，需要等待完整生成
 *
 * 3. **ragQueryStream** - RAG 问答（流式）
 *    - 功能：搜索 + 流式生成回答
 *    - 返回：通过回调函数实时返回
 *    - 适用：前端聊天界面、实时交互
 *    - 特点：流式返回，用户体验最佳
 *
 * **选择建议**：
 * - 需要相关文章 → 使用 `semanticSearch`
 * - 需要完整回答且不要求实时 → 使用 `ragQuery`
 * - 需要实时交互体验 → 使用 `ragQueryStream`
 *
 * @module RAG
 */

import { getAIClient } from "./client";
import { getVectorStore } from "../vector/store";
import { prisma } from "../prisma";
import { RAG_SYSTEM_MESSAGE, buildRAGPrompt } from "./prompts/rag";

/**
 * RAG 查询选项
 */
export interface RAGOptions {
  /** 检索结果数量限制（默认 5） */
  limit?: number;
  /** 过滤条件 */
  filters?: {
    /** 按文章 ID 过滤 */
    postId?: string;
    /** 按分类 ID 过滤 */
    categoryId?: string;
    /** 按标签过滤 */
    tags?: string[];
  };
  /** LLM 最大 token 数（默认 1000） */
  maxTokens?: number;
}

/**
 * RAG 查询响应
 */
export interface RAGResponse {
  /** AI 生成的完整回答 */
  answer: string;
  /** 来源文章列表 */
  sources: Array<{
    postId: string;
    title: string;
    slug: string;
    excerpt: string;
    score: number; // 相似度分数（0-1）
  }>;
  /** 消耗的 token 数量 */
  tokensUsed?: number;
}

/**
 * 检查 Ollama 服务是否可用
 */
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2秒超时
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * RAG 检索增强生成（同步版本）
 *
 * **功能说明**：
 * - 基于向量检索的智能问答，搜索相关文章并生成完整回答
 * - 同步返回：等待 LLM 生成完整回答后一次性返回
 * - 适用于：后台处理、API 调用、不需要实时反馈的场景
 *
 * **与其他函数的区别**：
 * - vs `semanticSearch`: 不仅搜索，还会调用 LLM 生成回答
 * - vs `ragQueryStream`: 同步返回完整回答，而非流式返回片段
 *
 * **工作流程**：
 * 1. 将问题向量化
 * 2. 向量相似度搜索（默认 Top 5）
 * 3. 构建上下文（组合多个检索到的块）
 * 4. 调用 LLM 生成完整回答
 * 5. 返回回答、来源和 token 消耗
 *
 * **使用场景**：
 * - 后台批量处理问答
 * - API 接口调用（不需要实时反馈）
 * - 需要完整回答后再处理的场景
 *
 * @param question - 用户问题
 * @param options - RAG 选项
 * @param options.limit - 检索结果数量（默认 5）
 * @param options.filters - 过滤条件（分类、标签等）
 * @param options.maxTokens - LLM 最大 token 数（默认 1000）
 * @returns 包含完整回答、来源和 token 消耗的对象
 *
 * @example
 * ```typescript
 * const result = await ragQuery("什么是 React Hooks？");
 * console.log(result.answer); // 完整的回答文本
 * console.log(result.sources); // 来源文章列表
 * ```
 *
 * @throws {Error} 如果 Ollama 服务不可用或没有搜索结果
 */
export async function ragQuery(
  question: string,
  options: RAGOptions = {}
): Promise<RAGResponse> {
  // 检查 Ollama 是否可用
  const ollamaAvailable = await isOllamaAvailable();

  if (!ollamaAvailable) {
    throw new Error(
      "RAG 服务不可用：请确保 Ollama 服务已启动（默认端口 11434）"
    );
  }

  const aiClient = getAIClient();
  const vectorStore = getVectorStore();

  // 1. 将问题向量化
  const [queryVector] = await aiClient.embed(question);

  // 2. 构建过滤条件
  const filters: Record<string, unknown> = {};
  if (options.filters?.categoryId) {
    filters.categoryId = options.filters.categoryId;
  }

  // 3. 向量相似度搜索
  const searchResults = await vectorStore.search(queryVector, {
    limit: options.limit || 5,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // 如果没有搜索结果，提示用户
  if (searchResults.length === 0) {
    throw new Error("未找到相关内容，请尝试调整问题或确保文章已建立索引");
  }

  // 4. 获取文章详细信息
  const postIds = [
    ...new Set(searchResults.map((r) => r.metadata.postId as string)),
  ];
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
    },
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));

  // 5. 构建上下文
  const context = searchResults
    .map((result) => {
      const post = postMap.get(result.metadata.postId as string);
      if (!post) return null;
      return `[${post.title}]\n${result.document}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  // 6. 构建 Prompt
  const prompt = buildRAGPrompt(context, question);

  // 7. 调用 LLM
  const response = await aiClient.chat(
    [
      {
        role: "system",
        content: RAG_SYSTEM_MESSAGE,
      },
      { role: "user", content: prompt },
    ],
    {
      maxTokens: options.maxTokens || 1000,
    }
  );

  // 8. 构建来源信息
  const sources = searchResults.map((result) => {
    const post = postMap.get(result.metadata.postId as string);
    return {
      postId: result.metadata.postId as string,
      title: post?.title || "未知",
      slug: post?.slug || "",
      excerpt: result.document?.slice(0, 200) || "",
      score: result.score,
    };
  });

  return {
    answer: response.content,
    sources,
    tokensUsed: response.tokensUsed,
  };
}

/**
 * 语义搜索文章（仅搜索，不生成回答）
 *
 * **功能说明**：
 * - 基于向量相似度的语义搜索，查找相关文章
 * - 只做搜索，不调用 LLM 生成回答
 * - 适用于：文章推荐、内容搜索、相关文章查找
 *
 * **与其他函数的区别**：
 * - vs `ragQuery`: 不生成回答，只返回搜索结果
 * - vs `ragQueryStream`: 不调用 LLM，只做向量搜索
 *
 * **工作流程**：
 * 1. 将查询文本向量化
 * 2. 向量相似度搜索（默认 Top 10）
 * 3. 去重处理（同一篇文章只返回一次）
 * 4. 返回文章列表（包含相似度分数）
 *
 * **使用场景**：
 * - 文章推荐系统（相关文章推荐）
 * - 内容搜索功能（查找相关文章）
 * - 标签云、分类页面的文章筛选
 * - 不需要 AI 生成回答的场景
 *
 * @param query - 搜索查询文本（可以是关键词、问题或描述）
 * @param options - 搜索选项
 * @param options.limit - 返回结果数量（默认 10）
 * @returns 文章列表，包含 postId、title、slug、excerpt 和相似度 score
 *
 * @example
 * ```typescript
 * // 查找相关文章
 * const relatedPosts = await semanticSearch("React Hooks", { limit: 5 });
 *
 * // 用于文章推荐
 * const recommendations = await semanticSearch(currentPost.title, { limit: 10 });
 * ```
 *
 * @throws {Error} 如果 Ollama 服务不可用
 */
export async function semanticSearch(
  query: string,
  options: { limit?: number } = {}
): Promise<
  Array<{
    postId: string;
    title: string;
    slug: string;
    excerpt: string;
    score: number;
  }>
> {
  // 检查 Ollama 是否可用
  const ollamaAvailable = await isOllamaAvailable();

  if (!ollamaAvailable) {
    throw new Error(
      "语义搜索服务不可用：请确保 Ollama 服务已启动（默认端口 11434）"
    );
  }

  const aiClient = getAIClient();
  const vectorStore = getVectorStore();

  // 1. 将查询向量化
  const [queryVector] = await aiClient.embed(query);

  // 2. 搜索
  const searchResults = await vectorStore.search(queryVector, {
    limit: options.limit || 10,
  });

  // 3. 获取文章信息
  const postIds = [
    ...new Set(searchResults.map((r) => r.metadata.postId as string)),
  ];
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
    },
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));

  // 4. 合并结果（去重）
  // 注意：同一篇文章可能被多个块匹配到，需要去重
  const seenPosts = new Set<string>();
  const results: Array<{
    postId: string;
    title: string;
    slug: string;
    excerpt: string;
    score: number;
  }> = [];

  for (const result of searchResults) {
    const postId = result.metadata.postId as string;
    // 如果已经处理过这篇文章，跳过（保留第一个匹配结果）
    if (seenPosts.has(postId)) continue;
    seenPosts.add(postId);

    const post = postMap.get(postId);
    if (post) {
      results.push({
        postId,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || result.document?.slice(0, 200) || "",
        score: result.score,
      });
    }
  }

  return results;
}

/**
 * 流式 RAG 查询回调接口
 *
 * **回调说明**：
 * - `onSources`: 检索完成后立即调用，返回来源文章列表
 * - `onChunk`: LLM 生成回答时实时调用，每次返回一个文本片段
 * - `onComplete`: 回答生成完成后调用，返回 token 消耗统计
 * - `onError`: 发生错误时调用
 */
export interface RAGStreamCallbacks {
  /** 检索完成后立即调用，返回来源文章列表 */
  onSources?: (sources: RAGResponse["sources"]) => void;
  /** LLM 生成回答时实时调用，每次返回一个文本片段 */
  onChunk?: (chunk: string) => void;
  /** 回答生成完成后调用，返回 token 消耗统计 */
  onComplete?: (result: { tokensUsed?: number }) => void;
  /** 发生错误时调用 */
  onError?: (error: Error) => void;
}

/**
 * RAG 检索增强生成（流式版本）
 *
 * **功能说明**：
 * - 基于向量检索的智能问答，搜索相关文章并生成回答
 * - 流式返回：实时返回回答片段，类似 ChatGPT 的交互体验
 * - 适用于：前端聊天界面、需要实时反馈的场景
 *
 * **与其他函数的区别**：
 * - vs `ragQuery`: 流式返回回答片段，而非等待完整回答
 * - vs `semanticSearch`: 不仅搜索，还会调用 LLM 生成回答
 *
 * **工作流程**：
 * 1. 将问题向量化
 * 2. 向量相似度搜索（默认 Top 5）
 * 3. 构建上下文（组合多个检索到的块）
 * 4. 通过 `onSources` 回调返回来源信息
 * 5. 流式调用 LLM，通过 `onChunk` 实时返回回答片段
 * 6. 完成后通过 `onComplete` 返回统计信息
 *
 * **使用场景**：
 * - 前端聊天界面（实时显示回答）
 * - 需要实时反馈的用户交互
 * - 类似 ChatGPT 的对话体验
 * - 降低用户等待焦虑
 *
 * **回调执行顺序**：
 * 1. `onSources` - 检索完成后立即执行
 * 2. `onChunk` - LLM 生成时多次执行（每次返回一个片段）
 * 3. `onComplete` - 生成完成后执行
 * 4. `onError` - 发生错误时执行（如果有）
 *
 * @param question - 用户问题
 * @param options - RAG 选项（与 ragQuery 相同）
 * @param callbacks - 流式回调函数
 * @returns Promise<void> - 结果通过回调函数返回
 *
 * @example
 * ```typescript
 * await ragQueryStream("什么是 React Hooks？", {}, {
 *   onSources: (sources) => {
 *     console.log("来源：", sources); // 先显示来源
 *   },
 *   onChunk: (chunk) => {
 *     console.log(chunk); // 实时显示回答片段
 *     // 在前端可以逐字追加到 UI
 *   },
 *   onComplete: (result) => {
 *     console.log("完成，消耗 token：", result.tokensUsed);
 *   },
 *   onError: (error) => {
 *     console.error("错误：", error);
 *   }
 * });
 * ```
 *
 * @throws {Error} 如果 Ollama 服务不可用或没有搜索结果（通过 onError 回调）
 */
export async function ragQueryStream(
  question: string,
  options: RAGOptions = {},
  callbacks: RAGStreamCallbacks = {},
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    if (abortSignal?.aborted) {
      return;
    }

    // 检查 Ollama 是否可用
    const ollamaAvailable = await isOllamaAvailable();

    if (!ollamaAvailable) {
      throw new Error(
        "RAG 服务不可用：请确保 Ollama 服务已启动（默认端口 11434）"
      );
    }

    const aiClient = getAIClient();
    const vectorStore = getVectorStore();

    // 1. 将问题向量化
    const [queryVector] = await aiClient.embed(question);

    if (abortSignal?.aborted) {
      return;
    }

    // 2. 构建过滤条件
    const filters: Record<string, unknown> = {};
    if (options.filters?.categoryId) {
      filters.categoryId = options.filters.categoryId;
    }

    // 3. 向量相似度搜索
    const searchResults = await vectorStore.search(queryVector, {
      limit: options.limit || 5,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    if (abortSignal?.aborted) {
      return;
    }

    // 如果没有搜索结果，提示用户
    if (searchResults.length === 0) {
      throw new Error("未找到相关内容，请尝试调整问题或确保文章已建立索引");
    }

    // 4. 获取文章详细信息
    const postIds = [
      ...new Set(searchResults.map((r) => r.metadata.postId as string)),
    ];
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
      },
    });

    const postMap = new Map(posts.map((p) => [p.id, p]));

    // 5. 构建来源信息
    const sources = searchResults.map((result) => {
      const post = postMap.get(result.metadata.postId as string);
      return {
        postId: result.metadata.postId as string,
        title: post?.title || "未知",
        slug: post?.slug || "",
        excerpt: post?.excerpt || result.document?.slice(0, 200) || "",
        score: result.score,
      };
    });

    // 6. 构建上下文
    const context = searchResults
      .map((result) => {
        const post = postMap.get(result.metadata.postId as string);
        if (!post) return null;
        return `[${post.title}]\n${result.document}`;
      })
      .filter(Boolean)
      .join("\n\n---\n\n");

    // 7. 发送来源信息（在生成回答前先返回来源，提升用户体验）
    callbacks.onSources?.(sources);

    if (abortSignal?.aborted) {
      return;
    }

    // 8. 构建 Prompt（使用结构化 Prompt 确保回答质量）
    const prompt = buildRAGPrompt(context, question);

    // 9. 流式调用 LLM（通过 onChunk 回调实时返回回答片段）
    const result = await aiClient.chatStream(
      [
        {
          role: "system",
          content: RAG_SYSTEM_MESSAGE,
        },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: options.maxTokens || 1000,
        signal: abortSignal,
      },
      callbacks.onChunk
    );

    if (abortSignal?.aborted) {
      return;
    }

    // 10. 完成回调
    callbacks.onComplete?.({ tokensUsed: result.tokensUsed });
  } catch (error) {
    if (abortSignal?.aborted) {
      return;
    }
    callbacks.onError?.(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
