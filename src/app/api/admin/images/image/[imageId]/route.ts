/**
 * 图片删除和重命名 API
 *
 * DELETE /api/admin/images/[imageId] - 删除图片
 * PATCH /api/admin/images/[imageId] - 重命名图片
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImageFile, renameImageFile } from "@/lib/images/utils";
import { isValidExtension } from "@/lib/images/validator";

/**
 * 删除图片
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { imageId } = await params;

    // 查询图片
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { post: { select: { id: true } } },
    });

    if (!image) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    // 删除文件系统中的文件
    try {
      await deleteImageFile(image.path);
    } catch (error) {
      console.error("删除图片文件失败:", error);
      // 即使文件删除失败，也继续删除数据库记录
    }

    // 删除数据库记录
    await prisma.image.delete({
      where: { id: imageId },
    });

    // 如果是封面图，清空文章的 coverImage 字段
    if (image.type === "COVER") {
      await prisma.post.update({
        where: { id: image.postId },
        data: { coverImage: null },
      });
    }

    return NextResponse.json({
      success: true,
      message: "图片删除成功",
    });
  } catch (error) {
    console.error("删除图片失败:", error);
    return NextResponse.json({ error: "删除图片失败" }, { status: 500 });
  }
}

/**
 * 重命名图片
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { imageId } = await params;
    const body = await request.json();
    const { newFilename } = body;

    // 参数验证
    if (!newFilename) {
      return NextResponse.json(
        { error: "缺少必要参数：newFilename" },
        { status: 400 }
      );
    }

    // 验证文件名
    if (!isValidExtension(newFilename)) {
      return NextResponse.json(
        { error: "无效的文件名或扩展名" },
        { status: 400 }
      );
    }

    // 查询图片
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { post: { select: { id: true, slug: true } } },
    });

    if (!image) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    // 封面图不允许重命名（固定为 cover.ext）
    if (image.type === "COVER") {
      return NextResponse.json(
        { error: "封面图不支持重命名" },
        { status: 400 }
      );
    }

    // 重命名文件
    let newPath: string;
    try {
      newPath = await renameImageFile(image.path, newFilename);
    } catch (error) {
      console.error("重命名文件失败:", error);
      return NextResponse.json({ error: "重命名文件失败" }, { status: 500 });
    }

    // 更新数据库
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        filename: newFilename,
        path: newPath,
      },
    });

    return NextResponse.json({
      success: true,
      image: updatedImage,
      message: "图片重命名成功",
    });
  } catch (error) {
    console.error("重命名图片失败:", error);
    return NextResponse.json({ error: "重命名图片失败" }, { status: 500 });
  }
}
