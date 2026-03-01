/**
 * 获取文章图片列表 API
 *
 * GET /api/admin/images/[postId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImageType } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { postId } = await params;

    // 查询文章是否存在，同时获取 coverImage 和 content
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        content: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 查询 Image 表中的图片记录
    const images = await prisma.image.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
    });

    // 分类图片：封面图和内容配图
    let coverImage = null;
    const contentImages: any[] = [];

    // 1. 首先从 Image 表查找封面图
    const dbCover = images.find(
      (img: { type: ImageType }) => img.type === "COVER"
    );
    if (dbCover) {
      coverImage = dbCover;
    }
    // 2. 如果 Image 表没有，但 Post.coverImage 有值，则构造一个虚拟的封面图对象
    else if (post.coverImage) {
      coverImage = {
        id: `cover-${post.id}`,
        filename: post.coverImage.split("/").pop() || "cover",
        path: post.coverImage,
        size: 0,
        mimeType: "image/*",
        type: "COVER",
        isVirtual: true, // 标记这是从 Post.coverImage 衍生的虚拟记录
      };
    }

    // 3. 从 Image 表获取内容配图
    const dbContentImages = images.filter(
      (img: { type: ImageType }) => img.type === "CONTENT"
    );
    contentImages.push(...dbContentImages);

    // 4. 从文章内容中提取 Markdown 图片链接
    // 匹配 ![alt](url) 或 <img src="url">
    const imageRegex = /!\[.*?\]\(([^)]+)\)|<img[^>]+src=["']([^"']+)["']/gi;
    const contentImageMatches = [...post.content.matchAll(imageRegex)];

    // 去重并添加到内容图片列表
    const extractedUrls = new Set<string>();
    contentImageMatches.forEach((match, index) => {
      const url = match[1] || match[2];
      // 过滤掉外部链接，只保留本地图片
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        // 标准化路径（去除开头的 /public/ 如果有的话）
        const normalizedUrl = url.replace(/^\/public\//, "/");
        const key = `content-img-${index}-${normalizedUrl}`;

        if (!extractedUrls.has(normalizedUrl)) {
          extractedUrls.add(normalizedUrl);
          contentImages.push({
            id: key,
            filename: normalizedUrl.split("/").pop() || `image-${index}`,
            path: normalizedUrl,
            size: 0,
            mimeType: "image/*",
            type: "CONTENT",
            isVirtual: true, // 标记这是从内容中提取的虚拟记录
          });
        }
      }
    });

    return NextResponse.json({
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
      },
      cover: coverImage,
      content: contentImages,
      total: (coverImage ? 1 : 0) + contentImages.length,
    });
  } catch (error) {
    console.error("获取图片列表失败:", error);
    return NextResponse.json({ error: "获取图片列表失败" }, { status: 500 });
  }
}
