import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 获取公开发布的文章列表
 * GET /api/posts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      published: true,
    };

    if (category) {
      // 支持通过category ID或slug筛选
      const isId = /^[a-zA-Z0-9_-]+$/.test(category) && category.length > 10;
      if (isId) {
        where.categoryId = category;
      } else {
        where.category = {
          slug: category,
        };
      }
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag,
          },
        },
      };
    }

    // 获取文章列表
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          featured: "desc",
        },
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: limit,
    });

    // 获取总数
    const total = await prisma.post.count({
      where,
    });

    // 格式化返回数据
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      slug: post.slug,
      featured: post.featured,
      coverImage: post.coverImage,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
      author: post.author,
      categories: post.category ? [post.category] : [],
      tags: post.tags.map((postTag) => postTag.tag),
      commentsCount: 0, // 当前版本暂未启用评论系统，保持固定占位值
    }));

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        current: page,
        pageSize: limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取文章列表失败:", error);
    return NextResponse.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}
