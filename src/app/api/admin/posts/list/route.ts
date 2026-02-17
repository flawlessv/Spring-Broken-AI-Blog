import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取文章列表（用于图片管理）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("获取文章列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
