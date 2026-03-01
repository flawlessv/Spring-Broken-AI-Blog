import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// 允许的图片类型
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
// 最大文件大小 5MB
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // cover 或 content

    if (!file) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 });
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "不支持的文件类型，仅支持 JPG、PNG、GIF、WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件大小不能超过 5MB" },
        { status: 400 }
      );
    }

    // 确定保存目录
    let uploadDir: string;
    let publicPath: string;

    if (type === "cover") {
      uploadDir = join(process.cwd(), "public", "images", "posts", "covers");
      publicPath = "/images/posts/covers/";
    } else if (type === "content") {
      uploadDir = join(process.cwd(), "public", "images", "posts", "content");
      publicPath = "/images/posts/content/";
    } else if (type === "avatar") {
      uploadDir = join(process.cwd(), "public", "images");
      publicPath = "/images/";
    } else {
      return NextResponse.json({ error: "无效的类型参数" }, { status: 400 });
    }

    // 确保目录存在
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const filepath = join(uploadDir, filename);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // 返回公开访问路径
    const finalPublicPath = publicPath + filename;

    return NextResponse.json({
      success: true,
      url: finalPublicPath,
      filename: filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("图片上传失败:", error);
    return NextResponse.json({ error: "图片上传失败" }, { status: 500 });
  }
}

// 配置 Next.js 不解析 body，我们需要处理 multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};
