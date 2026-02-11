import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  createdAt: Date;
  category: { name: string; slug: string } | null;
  score: number;
}

/**
 * 获取相关文章推荐
 *
 * 基于向量相似度推荐相关文章，如果向量服务不可用则降级为同分类推荐
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);

    // 1. 获取当前文章
    const currentPost = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        content: true,
        categoryId: true,
        tags: { include: { tag: true } },
      },
    });

    if (!currentPost) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 2. 尝试使用向量相似度推荐
    let relatedPosts: RelatedPost[] = [];
    let mode: "vector" | "category" | "tags" = "category";

    try {
      relatedPosts = await getVectorRelatedPosts(currentPost, limit);
      if (relatedPosts.length > 0) {
        mode = "vector";
      }
    } catch (error) {
      console.warn("[Related] 向量推荐失败，降级为分类推荐:", error);
    }

    // 3. 如果向量推荐结果不足，使用分类/标签降级推荐
    if (relatedPosts.length < limit) {
      const fallbackPosts = await getFallbackRelatedPosts(
        currentPost,
        limit - relatedPosts.length,
        relatedPosts.map((p) => p.id)
      );
      relatedPosts = [...relatedPosts, ...fallbackPosts];
      if (mode !== "vector" && fallbackPosts.length > 0) {
        mode = currentPost.categoryId ? "category" : "tags";
      }
    }

    return NextResponse.json({
      posts: relatedPosts,
      mode,
      total: relatedPosts.length,
    });
  } catch (error) {
    console.error("[Related] 获取相关文章失败:", error);
    return NextResponse.json({ error: "获取相关文章失败" }, { status: 500 });
  }
}

/**
 * 基于向量相似度获取相关文章
 */
async function getVectorRelatedPosts(
  currentPost: {
    id: string;
    title: string;
    content: string;
  },
  limit: number
): Promise<RelatedPost[]> {
  // 动态导入服务器端模块,避免客户端打包警告
  const { getAIClient } = await import("@/lib/ai/client");
  const { getVectorStore } = await import("@/lib/vector/store");

  const aiClient = getAIClient();
  const vectorStore = getVectorStore();

  // 使用文章标题 + 摘要生成查询向量（比全文更高效）
  const queryText = `${currentPost.title}\n${currentPost.content.slice(0, 500)}`;
  const [queryVector] = await aiClient.embed(queryText);

  // 搜索相似文章（多取一些，因为要排除当前文章和去重）
  const searchResults = await vectorStore.search(queryVector, {
    limit: limit * 3,
  });

  // 获取相关文章的详细信息（排除当前文章，去重）
  const seenPostIds = new Set<string>([currentPost.id]);
  const relatedPostIds: string[] = [];

  for (const result of searchResults) {
    const postId = result.metadata.postId as string;
    if (!seenPostIds.has(postId)) {
      seenPostIds.add(postId);
      relatedPostIds.push(postId);
      if (relatedPostIds.length >= limit) break;
    }
  }

  if (relatedPostIds.length === 0) {
    return [];
  }

  // 查询文章详情
  const posts = await prisma.post.findMany({
    where: {
      id: { in: relatedPostIds },
      published: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
    },
  });

  // 按相似度排序
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const scoreMap = new Map<string, number>();

  for (const result of searchResults) {
    const postId = result.metadata.postId as string;
    if (!scoreMap.has(postId)) {
      scoreMap.set(postId, result.score);
    }
  }

  return relatedPostIds
    .map((id) => {
      const post = postMap.get(id);
      if (!post) return null;
      return {
        ...post,
        score: scoreMap.get(id) || 0,
      };
    })
    .filter((p): p is RelatedPost => p !== null);
}

/**
 * 降级推荐：基于分类和标签
 */
async function getFallbackRelatedPosts(
  currentPost: {
    id: string;
    categoryId: string | null;
    tags: Array<{ tag: { id: string; name: string } }>;
  },
  limit: number,
  excludeIds: string[]
): Promise<RelatedPost[]> {
  const excludeSet = new Set([currentPost.id, ...excludeIds]);
  const tagIds = currentPost.tags.map((t) => t.tag.id);

  // 构建查询条件：同分类或有共同标签
  const where: any = {
    id: { notIn: Array.from(excludeSet) },
    published: true,
    OR: [] as any[],
  };

  if (currentPost.categoryId) {
    where.OR.push({ categoryId: currentPost.categoryId });
  }

  if (tagIds.length > 0) {
    where.OR.push({
      tags: {
        some: {
          tagId: { in: tagIds },
        },
      },
    });
  }

  // 如果没有分类也没有标签，返回最新文章
  if (where.OR.length === 0) {
    delete where.OR;
  }

  const posts = await prisma.post.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      createdAt: true,
      categoryId: true,
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2, // 多取一些用于计算相关度
  });

  // 计算相关度分数（共同标签数量）
  const scored = posts.map((post) => {
    const postTagIds = new Set(post.tags.map((t) => t.tag.id));
    const commonTags = tagIds.filter((id) => postTagIds.has(id)).length;
    const sameCategory =
      post.categoryId && currentPost.categoryId === post.categoryId ? 1 : 0;

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      createdAt: post.createdAt,
      category: post.category,
      score: commonTags * 0.3 + sameCategory * 0.5, // 简单的相关度计算
    };
  });

  // 按相关度排序，取前 limit 个
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
