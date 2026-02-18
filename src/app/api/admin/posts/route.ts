/**
 * 文章管理 API 路由
 *
 * 提供文章的 CRUD 操作和批量处理功能
 * 支持筛选、搜索和分页
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const STATUS_ALL = "all";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePositiveIntParam = (fallback: number, max?: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return fallback;
      }

      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }

      return max ? Math.min(parsed, max) : parsed;
    });

const normalizeNullableParam = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

const createPostSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空"),
  slug: z.string().trim().min(1, "URL slug不能为空"),
  content: z.string().trim().min(1, "内容不能为空"),
  excerpt: z.string().trim().optional(),
  coverImage: z.string().trim().optional(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  categoryId: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
});

// 查询参数验证schema
const querySchema = z.object({
  page: parsePositiveIntParam(DEFAULT_PAGE),
  limit: parsePositiveIntParam(DEFAULT_LIMIT, MAX_LIMIT),
  search: normalizeNullableParam,
  status: normalizeNullableParam, // 支持逗号分隔的多个状态
  categoryId: normalizeNullableParam,
  categoryNames: normalizeNullableParam, // 分类名称筛选：逗号分隔的分类名称列表
  tagIds: normalizeNullableParam, // 标签过滤：逗号分隔的标签ID列表
  sortBy: z
    .enum(["createdAt", "updatedAt", "views", "title"])
    .optional()
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

function parseCsvParam(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * GET /api/admin/posts
 * 获取文章列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 权限检查
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      categoryId: searchParams.get("categoryId"),
      categoryNames: searchParams.get("categoryNames"),
      tagIds: searchParams.get("tagIds"),
      sortBy: searchParams.get("sortBy") || "updatedAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    // 构建查询条件
    const where: Prisma.PostWhereInput = {};
    const andClauses: Prisma.PostWhereInput[] = [];

    // 搜索条件
    if (query.search) {
      andClauses.push({
        OR: [
          { title: { contains: query.search } },
          { content: { contains: query.search } },
          { excerpt: { contains: query.search } },
        ],
      });
    }

    // 状态筛选（支持多个状态）
    if (query.status && query.status !== STATUS_ALL) {
      const statusArray = parseCsvParam(query.status);
      if (statusArray.length > 0) {
        const statusConditions: Prisma.PostWhereInput[] = [];

        for (const status of statusArray) {
          switch (status) {
            case "published":
              statusConditions.push({
                published: true,
                featured: false,
              });
              break;
            case "draft":
              statusConditions.push({
                published: false,
              });
              break;
            case "featured":
              statusConditions.push({
                featured: true,
              });
              break;
          }
        }

        if (statusConditions.length > 0) {
          andClauses.push({
            OR: statusConditions,
          });
        }
      }
    }

    // 分类筛选
    if (query.categoryId && query.categoryId !== STATUS_ALL) {
      where.categoryId = query.categoryId;
    }

    // 分类名称筛选（支持多选）
    if (query.categoryNames && query.categoryNames !== STATUS_ALL) {
      const categoryNames = parseCsvParam(query.categoryNames);
      if (categoryNames.length > 0) {
        andClauses.push({
          category: {
            name: {
              in: categoryNames,
            },
          },
        });
      }
    }

    // 标签筛选（支持多选，按标签 ID）
    if (query.tagIds && query.tagIds !== STATUS_ALL) {
      const tagIds = parseCsvParam(query.tagIds);
      if (tagIds.length > 0) {
        andClauses.push({
          tags: {
            some: {
              tagId: {
                in: tagIds,
              },
            },
          },
        });
      }
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    // 排序配置
    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    // 分页配置
    const skip = (query.page - 1) * query.limit;

    // 查询文章数据
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: {
          author: {
            include: {
              profile: true,
            },
          },
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // 格式化数据
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      published: post.published,
      featured: post.featured,
      views: post.views,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
      author: {
        username: post.author.username,
        displayName: post.author.profile?.displayName,
        profile: post.author.profile,
      },
      category: post.category,
      tags: post.tags.map((pt) => pt.tag),
    }));

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
        hasNextPage: query.page * query.limit < totalCount,
        hasPrevPage: query.page > 1,
      },
    });
  } catch (error) {
    console.error("获取文章列表失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数无效", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/admin/posts
 * 创建新文章
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const body = await request.json();

    const data = createPostSchema.parse(body);
    const categoryId = data.categoryId || null;
    const uniqueTagIds = Array.from(new Set(data.tags ?? []));
    const coverImage = data.coverImage || null;

    // 验证分类 ID 是否存在
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return NextResponse.json({ error: "所选分类不存在" }, { status: 400 });
      }
    }

    // 验证标签 ID 是否存在
    if (uniqueTagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: { id: { in: uniqueTagIds } },
      });
      if (tags.length !== uniqueTagIds.length) {
        return NextResponse.json({ error: "部分标签不存在" }, { status: 400 });
      }
    }

    // POST 语义只负责创建，不允许“slug 已存在时覆盖旧文章”
    const existingPost = await prisma.post.findUnique({
      where: { slug: data.slug },
    });

    if (existingPost) {
      return NextResponse.json(
        { error: "该 URL slug 已存在，请使用其他 slug" },
        { status: 409 }
      );
    }

    // 验证 authorId 是否存在
    const authorExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!authorExists) {
      return NextResponse.json(
        { error: "当前登录用户不存在" },
        { status: 400 }
      );
    }

    // 创建文章
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        coverImage,
        published: data.published,
        featured: data.featured,
        publishedAt: data.published ? new Date() : null,
        authorId: session.user.id,
        categoryId,
        tags: uniqueTagIds.length
          ? {
              create: uniqueTagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
      include: {
        author: {
          include: { profile: true },
        },
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("创建文章失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
