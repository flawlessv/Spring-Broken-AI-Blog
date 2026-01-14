/**
 * 图片上传 API
 *
 * POST /api/admin/images/upload
 * Body: FormData { postId, type, file }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureImageDir,
  generateImageFilename,
  generateUniqueFilename,
  getImageUrl,
  getFileExtension,
  deleteImageFile,
} from "@/lib/images/utils";
import {
  isValidMimeType,
  validateFileSize,
  getExtensionFromMimeType,
} from "@/lib/images/validator";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 解析表单数据
    const formData = await request.formData();
    const postId = formData.get("postId") as string;
    const type = formData.get("type") as "content"; // 仅支持内容配图上传
    const file = formData.get("file") as File;

    // 参数验证
    if (!postId || !type || !file) {
      return NextResponse.json(
        { error: "缺少必要参数：postId, type, file" },
        { status: 400 }
      );
    }

    if (type !== "content") {
      return NextResponse.json(
        { error: "仅支持上传内容配图，封面图请使用远程图床链接" },
        { status: 400 }
      );
    }

    // 查询文章
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, slug: true },
    });

    if (!post) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 验证文件类型
    if (!isValidMimeType(file.type)) {
      return NextResponse.json(
        { error: "不支持的图片格式。仅支持：jpg, jpeg, png, webp, gif" },
        { status: 400 }
      );
    }

    // 验证文件大小（内容配图最大 5MB）
    const sizeValidation = validateFileSize(file.size, "content");
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // 确保目录存在
    await ensureImageDir(post.slug);

    // 生成文件名（保留原文件名的有意义部分）
    const ext = getExtensionFromMimeType(file.type);
    const originalName = file.name.replace(/\.[^/.]+$/, ""); // 去除扩展名
    const baseFilename = generateImageFilename("content", ext, originalName);

    // 确保文件名唯一（如果已存在则自动添加序号）
    const filename = await generateUniqueFilename(post.slug, baseFilename);

    // 写入文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(
      process.cwd(),
      "public",
      "images",
      "posts",
      post.slug,
      filename
    );
    await writeFile(filePath, buffer);

    // 保存到数据库（仅保存内容配图）
    const imagePath = getImageUrl(post.slug, filename);
    const image = await prisma.image.create({
      data: {
        filename,
        path: imagePath,
        size: file.size,
        mimeType: file.type,
        type: "CONTENT", // 固定为内容配图
        postId,
      },
    });

    return NextResponse.json({
      success: true,
      image,
      message: "图片上传成功",
    });
  } catch (error) {
    console.error("图片上传失败:", error);
    return NextResponse.json({ error: "图片上传失败" }, { status: 500 });
  }
}
