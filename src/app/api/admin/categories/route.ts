/**
 * 分类管理 API 路由
 *
 * 提供分类的 CRUD 操作
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 创建分类的验证schema
const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "分类名称不能为空")
    .max(50, "分类名称不能超过50个字符"),
  slug: z
    .string()
    .min(1, "URL slug不能为空")
    .max(50, "URL slug不能超过50个字符"),
  description: z.string().max(200, "描述不能超过200个字符").optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "请输入有效的颜色代码")
    .optional(),
  icon: z.string().max(50, "图标不能超过50个字符").optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * GET /api/admin/categories
 * 获取分类列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    if (includeStats) {
      const categoriesWithPosts = await prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          posts: {
            select: { id: true, published: true },
          },
        },
      });

      const formattedCategories = categoriesWithPosts.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        color: category.color,
        icon: category.icon,
        sortOrder: category.sortOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        stats: {
          totalPosts: category.posts.length,
          publishedPosts: category.posts.filter((p) => p.published).length,
        },
      }));

      return NextResponse.json({ categories: formattedCategories });
    }

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      color: category.color,
      icon: category.icon,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return NextResponse.json({ categories: formattedCategories });
  } catch (error) {
    console.error("获取分类列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/admin/categories
 * 创建新分类
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const body = await request.json();
    const data = createCategorySchema.parse(body);

    // 检查名称和slug是否已存在
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: data.name }, { slug: data.slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.name === data.name ? "分类名称已存在" : "URL slug已存在",
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("创建分类失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
