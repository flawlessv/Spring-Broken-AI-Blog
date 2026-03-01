/**
 * 个人信息管理 API
 *
 * GET: 获取当前用户的个人信息
 * PUT: 更新当前用户的个人信息
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  // 基础信息
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().optional(),
  displayName: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().optional(), // 支持相对路径和绝对路径

  // 联系信息
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  wechat: z.string().optional(),
  qq: z.string().optional(),

  // 社交链接
  website: z.string().url().optional().or(z.literal("")),
  github: z.string().optional(),
  twitter: z.string().optional(),
  weibo: z.string().optional(),
  bilibili: z.string().optional(),
  youtube: z.string().optional(),

  // 地址信息
  location: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
});

// 获取个人信息
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不返回密码字段
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("获取个人信息失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 更新个人信息
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // 检查用户名是否已被其他用户使用
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: "用户名已被使用" }, { status: 400 });
      }
    }

    // 准备用户数据更新
    const userData: any = {
      username: data.username,
    };

    // 如果提供了新密码，则加密并更新
    if (data.password && data.password.trim() !== "") {
      userData.password = await bcrypt.hash(data.password, 12);
    }

    // 准备profile数据
    const profileData = {
      displayName: data.displayName || null,
      bio: data.bio || null,
      avatar: data.avatar || null,
      email: data.email || null,
      phone: data.phone || null,
      wechat: data.wechat || null,
      qq: data.qq || null,
      website: data.website || null,
      github: data.github || null,
      twitter: data.twitter || null,
      weibo: data.weibo || null,
      bilibili: data.bilibili || null,
      youtube: data.youtube || null,
      location: data.location || null,
      company: data.company || null,
      position: data.position || null,
    };

    // 更新用户信息和profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...userData,
        profile: {
          upsert: {
            create: profileData,
            update: profileData,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // 不返回密码字段
    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      message: "个人信息更新成功",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("更新个人信息失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
