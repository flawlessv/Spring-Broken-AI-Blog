import { prisma } from "../prisma";
import { getAIClient } from "../ai/client";
import { getVectorStore } from "./store";
import { chunkPost } from "./chunker";

export interface IndexOptions {
  force?: boolean;
}

/**
 * 索引单篇文章
 */
export async function indexPost(
  postId: string,
  options: IndexOptions = {}
): Promise<void> {
  // 1. 获取文章
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  if (!post) {
    throw new Error("文章不存在");
  }

  // 2. 检查是否已索引
  const existingIndex = await prisma.postVectorIndex.findUnique({
    where: { postId },
  });

  if (existingIndex && !options.force) {
    console.log(`[RAG] 文章 ${postId} 已索引,跳过`);
    return;
  }

  // 3. 分块
  const chunks = chunkPost(post.content);

  if (chunks.length === 0) {
    console.log(`[RAG] 文章 ${postId} 内容为空,跳过`);
    return;
  }

  console.log(
    `[RAG] 文章 "${post.title}" 分为 ${chunks.length} 块，开始生成 embedding...`
  );

  // 4. 生成向量 - 逐个处理，添加延迟避免 Ollama 过载
  const aiClient = getAIClient();
  const vectors: Array<{
    id: string;
    embedding: number[];
    metadata: Record<string, unknown>;
    document: string;
  }> = [];

  let vectorIndex = 0; // 全局向量索引，用于生成唯一 ID

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // 生成 embedding（可能返回多个向量，如果块超过 800 字符）
    const chunkEmbeddings = await aiClient.embed(chunk.content);

    // 处理返回的向量（可能是一个或多个）
    if (chunkEmbeddings.length === 1) {
      // 正常情况：一个 chunk 对应一个向量
      vectors.push({
        id: `${postId}_${chunk.index}`,
        embedding: chunkEmbeddings[0],
        metadata: {
          postId: post.id,
          chunkIndex: chunk.index,
          subChunkIndex: 0, // 子块索引（单个块时为 0）
          title: post.title,
          slug: post.slug,
          category: post.category?.name || "",
          tags: post.tags.map((pt) => pt.tag.name).join(","),
        },
        document: chunk.content,
      });
      vectorIndex++;
    } else {
      // 异常情况：一个 chunk 被硬切成了多个子块（超过 800 字符）
      // 这种情况理论上不应该发生，因为 chunkPost() 已经严格控制了大小
      // 但如果发生了，我们需要为每个子块创建独立的向量记录
      console.warn(
        `[RAG] 块 ${chunk.index} 被切分为 ${chunkEmbeddings.length} 个子块 ` +
          `（原始长度: ${chunk.content.length} 字符）`
      );

      // 将原始块内容也按相同方式切分，以便为每个子块存储对应的文本
      const MAX_CHUNK_SIZE = 800;
      const chunkOverlap = 50;
      const subChunks: string[] = [];

      let start = 0;
      while (start < chunk.content.length) {
        const end = Math.min(start + MAX_CHUNK_SIZE, chunk.content.length);
        subChunks.push(chunk.content.slice(start, end));
        start = end - chunkOverlap;
        if (start >= chunk.content.length - chunkOverlap) {
          if (end < chunk.content.length) {
            subChunks.push(chunk.content.slice(start));
          }
          break;
        }
      }

      // 为每个子块创建向量记录
      for (let j = 0; j < chunkEmbeddings.length; j++) {
        vectors.push({
          id: `${postId}_${chunk.index}_${j}`, // 使用 chunkIndex_subChunkIndex 作为 ID
          embedding: chunkEmbeddings[j],
          metadata: {
            postId: post.id,
            chunkIndex: chunk.index,
            subChunkIndex: j, // 子块索引
            isSubChunk: true, // 标记这是子块
            title: post.title,
            slug: post.slug,
            category: post.category?.name || "",
            tags: post.tags.map((pt) => pt.tag.name).join(","),
          },
          document:
            subChunks[j] ||
            chunk.content.slice(j * MAX_CHUNK_SIZE, (j + 1) * MAX_CHUNK_SIZE),
        });
        vectorIndex++;
      }
    }

    // 每处理5个块后等待100ms，让 Ollama 有时间恢复
    if ((i + 1) % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `[RAG] Embedding 生成完成，共 ${vectors.length} 个向量（${chunks.length} 个语义块）`
  );

  // 5. 存储到向量数据库
  const vectorStore = getVectorStore();
  const vectorIds = await vectorStore.upsert(vectors);

  // 6. 更新索引记录
  await prisma.postVectorIndex.upsert({
    where: { postId },
    create: {
      postId,
      vectorId: vectorIds[0], // 使用第一个向量 ID 作为标识
      chunkCount: chunks.length, // 语义块数量
    },
    update: {
      vectorId: vectorIds[0],
      chunkCount: chunks.length,
      updatedAt: new Date(),
    },
  });

  console.log(
    `文章 ${postId} 索引完成: ${chunks.length} 个语义块, ${vectors.length} 个向量`
  );
}

/**
 * 删除文章索引
 */
export async function deletePostIndex(postId: string): Promise<void> {
  const existingIndex = await prisma.postVectorIndex.findUnique({
    where: { postId },
  });

  if (!existingIndex) {
    return;
  }

  // 删除向量数据库中的数据
  const vectorStore = getVectorStore();
  const idsToDelete = Array.from(
    { length: existingIndex.chunkCount },
    (_, i) => `${postId}_${i}`
  );
  await vectorStore.delete(idsToDelete);

  // 删除索引记录
  await prisma.postVectorIndex.delete({
    where: { postId },
  });

  console.log(`文章 ${postId} 索引已删除`);
}

/**
 * 批量索引所有已发布文章
 */
export async function indexAllPosts(options: IndexOptions = {}): Promise<{
  indexed: number;
  skipped: number;
  failed: number;
  errors?: string[];
}> {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { id: true, title: true },
  });

  console.log(`[RAG] 开始索引，共找到 ${posts.length} 篇已发布文章`);

  let indexed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const post of posts) {
    try {
      const existingIndex = await prisma.postVectorIndex.findUnique({
        where: { postId: post.id },
      });

      if (existingIndex && !options.force) {
        skipped++;
        continue;
      }

      console.log(`[RAG] 正在索引: ${post.title}`);
      await indexPost(post.id, options);
      indexed++;
      console.log(`[RAG] 索引成功: ${post.title}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[RAG] 索引文章 "${post.title}" 失败:`, errorMsg);
      errors.push(`${post.title}: ${errorMsg}`);
      failed++;
    }
  }

  console.log(
    `[RAG] 索引完成: ${indexed} 成功, ${skipped} 跳过, ${failed} 失败`
  );
  return {
    indexed,
    skipped,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
