/**
 * 单个文章的 API 路由
 *
 * 提供文章的获取、更新和删除功能
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 更新文章的验证schema
const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, "标题不能为空")
    .max(200, "标题不能超过200个字符")
    .optional(),
  slug: z
    .string()
    .min(1, "URL slug不能为空")
    .max(100, "URL slug不能超过100个字符")
    .optional(),
  content: z.string().min(1, "内容不能为空").optional(),
  excerpt: z.string().max(500, "摘要不能超过500个字符").optional(),
  coverImage: z
    .string()
    .url("请输入有效的图片URL")
    .optional()
    .or(z.literal("")),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/admin/posts/[id]
 * 获取单个文章详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
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

    if (!post) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 格式化数据
    const formattedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      published: post.published,
      featured: post.featured,
      views: post.views,
      readingTime: post.readingTime,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
      author: {
        username: post.author.username,
        displayName: post.author.profile?.displayName,
        profile: post.author.profile,
      },
      categoryId: post.categoryId,
      category: post.category,
      tags: post.tags.map((pt) => pt.tag),
    };

    return NextResponse.json(formattedPost);
  } catch (error) {
    console.error("获取文章详情失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/posts/[id]
 * 更新文章
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const body = await request.json();
    const data = updatePostSchema.parse(body);

    // 检查文章是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 如果更新了slug，检查是否重复
    if (data.slug && data.slug !== existingPost.slug) {
      const slugExists = await prisma.post.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "该URL slug已存在，请选择其他" },
          { status: 400 }
        );
      }
    }

    // 构建更新数据
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.categoryId !== undefined)
      updateData.categoryId = data.categoryId || null;

    if (data.published !== undefined) {
      updateData.published = data.published;
      // 如果从未发布变为发布，设置发布时间
      if (data.published && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      }
      // 如果从发布变为未发布，清除发布时间
      if (!data.published && existingPost.publishedAt) {
        updateData.publishedAt = null;
      }
    }

    if (data.featured !== undefined) updateData.featured = data.featured;

    // 处理标签关联（如果提供）
    if (data.tags) {
      // 先删除现有的标签关联
      await prisma.postTag.deleteMany({
        where: { postId: id },
      });

      // 创建新的标签关联
      if (data.tags.length > 0) {
        updateData.tags = {
          create: data.tags.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        };
      }
    }

    // 更新文章
    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("更新文章失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/posts/[id]
 * 部分更新文章（用于快速操作，如切换发布状态）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const body = await request.json();

    // 检查文章是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    // 处理发布状态变更
    if (body.published !== undefined) {
      updateData.published = body.published;
      if (body.published && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      }
      if (!body.published) {
        updateData.publishedAt = null;
      }
    }

    // 处理精选状态变更
    if (body.featured !== undefined) {
      updateData.featured = body.featured;
    }

    // 处理封面图变更
    if (body.coverImage !== undefined) {
      updateData.coverImage = body.coverImage;
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("更新文章状态失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/posts/[id]
 * 删除文章
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // 检查文章是否存在
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 删除文章（关联的标签会通过 Cascade 自动删除）
    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ message: "文章删除成功" });
  } catch (error) {
    console.error("删除文章失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
