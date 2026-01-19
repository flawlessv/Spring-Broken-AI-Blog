import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import matter from "gray-matter";
import { createSlug, calculateReadingTime, generateExcerpt } from "@/lib/utils";

/**
 * 简化版文章导入 API
 *
 * 核心逻辑：
 * 1. slug 已存在 → 跳过
 * 2. 分类不存在 → 跳过
 * 3. 标签不存在 → 跳过该标签（不影响文章导入）
 * 4. 其他错误 → 跳过
 */

// 导入结果
interface ImportResults {
  imported: number; // 成功导入数量
  skipped: number; // 跳过数量
  errors: string[]; // 错误详情
}

// 解析 Markdown 文件
async function parseMarkdownFile(file: File) {
  const content = await file.text();
  const { data: frontMatter, content: markdownContent } = matter(content);

  const title = frontMatter.title || file.name.replace(".md", "");
  const slug = frontMatter.slug || createSlug(title);

  // 验证必要字段
  if (!slug || slug.trim() === "") {
    throw new Error("slug 为空，请检查文件名或 front matter");
  }

  return {
    title,
    slug,
    content: markdownContent,
    excerpt: frontMatter.excerpt || generateExcerpt(markdownContent),
    published: frontMatter.published ?? false,
    featured: frontMatter.featured ?? false,
    publishedAt: frontMatter.publishedAt
      ? new Date(frontMatter.publishedAt)
      : null,
    readingTime:
      frontMatter.readingTime || calculateReadingTime(markdownContent),
    coverImage: frontMatter.coverImage || null,
    category: frontMatter.category || null,
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
  };
}

// 检查分类是否存在（不存在返回 null）
async function checkCategoryExists(categoryName: string | null) {
  if (!categoryName) return null;

  const category = await prisma.category.findFirst({
    where: {
      OR: [{ name: categoryName }, { slug: createSlug(categoryName) }],
    },
  });

  return category?.id || null;
}

// 检查标签是否存在（返回存在的标签 ID 列表）
async function checkTagsExist(tagNames: string[]) {
  if (tagNames.length === 0) return [];

  const tags = await Promise.all(
    tagNames.map(async (tagName) => {
      const tag = await prisma.tag.findFirst({
        where: {
          OR: [{ name: tagName }, { slug: createSlug(tagName) }],
        },
      });
      return tag?.id || null;
    })
  );

  return tags.filter((id): id is string => id !== null);
}

// 处理单个文件导入
async function processFile(file: File, userId: string, results: ImportResults) {
  const fileName = file.name;

  // 验证文件格式
  if (!file.name.endsWith(".md")) {
    return; // 跳过非 Markdown 文件
  }

  try {
    // 解析文件
    const data = await parseMarkdownFile(file);

    // 检查 slug 是否已存在
    const existingPost = await prisma.post.findUnique({
      where: { slug: data.slug },
    });

    if (existingPost) {
      results.skipped++;
      const status = existingPost.published ? "已发布" : "草稿";
      results.errors.push(
        `${fileName}: slug "${data.slug}" 已存在 (${status})`
      );
      console.log(
        `[跳过] ${fileName} - slug 已存在 (ID: ${existingPost.id}, 状态: ${status}, 标题: "${existingPost.title}")`
      );
      return;
    }

    // 检查分类是否存在
    const categoryId = await checkCategoryExists(data.category);
    if (data.category && !categoryId) {
      results.skipped++;
      results.errors.push(`${fileName}: 分类 "${data.category}" 不存在`);
      console.log(`[跳过] ${fileName} - 分类不存在`);
      return;
    }

    // 检查标签是否存在
    const validTagIds = await checkTagsExist(data.tags);
    if (data.tags.length > 0 && validTagIds.length === 0) {
      console.log(`[警告] ${fileName} - 所有标签都不存在，将不关联任何标签`);
    } else if (validTagIds.length < data.tags.length) {
      const missingTags = data.tags.filter((_, i) => !validTagIds[i]);
      console.log(
        `[警告] ${fileName} - 标签不存在，已跳过: ${missingTags.join(", ")}`
      );
    }

    // 创建文章
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        published: data.published,
        featured: data.featured,
        publishedAt: data.publishedAt,
        readingTime: data.readingTime,
        coverImage: data.coverImage,
        authorId: userId,
        categoryId,
      },
    });

    // 关联存在的标签
    if (validTagIds.length > 0) {
      await prisma.postTag.createMany({
        data: validTagIds.map((tagId) => ({
          postId: post.id,
          tagId,
        })),
      });
    }

    results.imported++;
    console.log(`[成功] ${fileName} -> "${data.title}" (${data.slug})`);
  } catch (error) {
    results.skipped++;
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    results.errors.push(`${fileName}: ${errorMsg}`);
    console.error(`[错误] ${fileName}:`, errorMsg);
  }
}

// POST /api/admin/posts/import
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // 获取上传的文件
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    // 初始化结果
    const results: ImportResults = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // 处理每个文件
    for (const file of files) {
      await processFile(file, session.user.id, results);
    }

    // 返回结果
    return NextResponse.json({
      message: `导入完成：成功 ${results.imported} 篇，跳过 ${results.skipped} 篇`,
      results,
    });
  } catch (error) {
    console.error("导入失败:", error);
    return NextResponse.json(
      { error: "导入失败，请稍后重试" },
      { status: 500 }
    );
  }
}
