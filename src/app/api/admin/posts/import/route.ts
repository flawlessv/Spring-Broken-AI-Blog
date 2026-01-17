import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import matter from "gray-matter";
import { createSlug, calculateReadingTime, generateExcerpt } from "@/lib/utils";

/**
 * 类型定义
 */
// 导入结果统计
interface ImportResults {
  success: number;
  updated: number; // 更新的文章数量
  created: number; // 新建的文章数量
  failed: number;
  skipped: number;
  errors: string[];
  imported: ImportedPostInfo[];
  fileStructure?: FileStructureInfo;
}

// 导入的文章信息
interface ImportedPostInfo {
  id: string;
  title: string;
  slug: string;
  filePath?: string;
  action: "created" | "updated"; // 标记是新建还是更新
}

// 文件结构信息
interface FileStructureInfo {
  totalFiles: number;
  markdownFiles: number;
  directories: number;
  maxDepth: number;
}

// 解析后的文章数据
interface ParsedPostData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  readingTime: number;
  coverImage: string | null;
  categoryName: string | null;
  tags: string[];
}

/**
 * 从 Markdown 文件解析文章数据
 *
 * 原理：
 * 1. 读取文件内容
 * 2. 使用 gray-matter 库解析 YAML front matter
 * 3. 提取或生成文章所需的各个字段
 *
 * @param file - 上传的 Markdown 文件
 * @returns 解析后的文章数据
 */
async function parseMarkdownFile(file: File): Promise<ParsedPostData> {
  // 读取文件内容
  const content = await file.text();

  // 解析 YAML front matter 和 Markdown 内容
  // gray-matter 会将 --- 包裹的 YAML 部分解析为 data 对象
  const { data: frontMatter, content: markdownContent } = matter(content);

  // 提取或生成标题（优先使用 front matter 中的 title）
  const title = frontMatter.title || file.name.replace(".md", "");

  // 提取或生成 slug（URL 友好的标识符）
  const slug = frontMatter.slug || createSlug(title);

  // 提取或生成摘要
  const excerpt = frontMatter.excerpt || generateExcerpt(markdownContent);

  // 提取布尔值字段（使用 ?? 运算符设置默认值）
  const published = frontMatter.published ?? false;
  const featured = frontMatter.featured ?? false;

  // 处理发布时间（如果提供则转换为 Date 对象）
  const publishedAt = frontMatter.publishedAt
    ? new Date(frontMatter.publishedAt)
    : null;

  // 提取或计算阅读时间
  const readingTime =
    frontMatter.readingTime || calculateReadingTime(markdownContent);

  // 提取分类和标签
  const categoryName = frontMatter.category || null;
  const tags = Array.isArray(frontMatter.tags) ? frontMatter.tags : [];

  return {
    title,
    slug,
    content: markdownContent,
    excerpt,
    published,
    featured,
    publishedAt,
    readingTime,
    coverImage: frontMatter.coverImage || null,
    categoryName,
    tags,
  };
}

/**
 * 查找分类（不自动创建）
 *
 * 原理：严格模式，要求分类必须预先存在
 * 1. 优先按 name 查找（因为 name 是用户指定的）
 * 2. 如果找不到，再按 slug 查找（处理 slug 变化的情况）
 * 3. 都找不到则抛出错误
 *
 * @param categoryName - 分类名称
 * @returns 分类 ID，如果没有分类则返回 null
 * @throws Error 如果分类不存在
 */
async function findCategory(
  categoryName: string | null
): Promise<string | null> {
  if (!categoryName) {
    return null;
  }

  // 生成 slug
  const slug = createSlug(categoryName);

  // 优先按 name 查找（name 也是唯一的）
  let category = await prisma.category.findUnique({
    where: { name: categoryName },
  });

  // 如果按 name 找不到，再按 slug 查找
  if (!category) {
    category = await prisma.category.findUnique({
      where: { slug },
    });
  }

  // 如果都找不到，抛出错误
  if (!category) {
    throw new Error(`分类 "${categoryName}" 不存在，请先在后台创建该分类`);
  }

  return category.id;
}

/**
 * 查找标签（不自动创建）
 *
 * 原理：严格模式，要求标签必须预先存在
 * 1. 优先按 name 查找（因为 name 是用户指定的）
 * 2. 如果找不到，再按 slug 查找（处理 slug 变化的情况）
 * 3. 都找不到则抛出错误
 *
 * @param tagName - 标签名称
 * @returns 标签对象
 * @throws Error 如果标签不存在
 */
async function findTag(tagName: string) {
  // 生成 slug
  const slug = createSlug(tagName);

  // 优先按 name 查找（name 也是唯一的）
  let tag = await prisma.tag.findUnique({
    where: { name: tagName },
  });

  // 如果按 name 找不到，再按 slug 查找
  if (!tag) {
    tag = await prisma.tag.findUnique({
      where: { slug },
    });
  }

  // 如果都找不到，抛出错误
  if (!tag) {
    throw new Error(`标签 "${tagName}" 不存在，请先在后台创建该标签`);
  }

  return tag;
}

/**
 * 关联文章和标签
 *
 * 原理：
 * 1. 遍历所有标签名称
 * 2. 查找或创建标签
 * 3. 在 PostTag 关联表中创建记录
 *
 * @param postId - 文章 ID
 * @param tagNames - 标签名称数组
 */
async function attachTagsToPost(
  postId: string,
  tagNames: string[]
): Promise<void> {
  for (const tagName of tagNames) {
    // 查找标签（不存在会抛出错误）
    const tag = await findTag(tagName);

    // 创建文章-标签关联记录
    await prisma.postTag.create({
      data: {
        postId,
        tagId: tag.id,
      },
    });
  }
}

/**
 * 处理单个文件的导入
 *
 * 原理：
 * 1. 验证文件格式（必须是 .md 文件）
 * 2. 解析 Markdown 文件内容
 * 3. 检查 slug 是否重复
 * 4. 处理分类（查找或创建）
 * 5. 创建文章记录
 * 6. 处理标签（查找或创建并关联）
 *
 * @param file - 上传的文件
 * @param userId - 用户 ID（作为文章作者）
 * @param results - 导入结果统计对象（会被修改）
 * @param filePath - 文件的相对路径（用于记录和显示）
 */
async function processFileImport(
  file: File,
  userId: string,
  results: ImportResults,
  filePath?: string
): Promise<void> {
  const displayPath = filePath || file.name;

  // ========== 1. 验证文件格式 ==========
  if (!file.name.endsWith(".md")) {
    results.skipped++;
    // 非 Markdown 文件不算错误，只是跳过
    return;
  }

  try {
    // ========== 2. 解析文件内容 ==========
    const postData = await parseMarkdownFile(file);

    // ========== 3. 检查 slug 是否已存在 ==========
    const existingPost = await prisma.post.findUnique({
      where: { slug: postData.slug },
    });

    // ========== 4. 处理分类 ==========
    const categoryId = await findCategory(postData.categoryName);

    let post;

    if (existingPost) {
      // ========== 5a. 更新现有文章 ==========
      post = await prisma.post.update({
        where: { id: existingPost.id },
        data: {
          title: postData.title,
          slug: postData.slug,
          content: postData.content,
          excerpt: postData.excerpt,
          published: postData.published,
          featured: postData.featured,
          publishedAt: postData.publishedAt,
          readingTime: postData.readingTime,
          coverImage: postData.coverImage,
          categoryId,
        },
      });

      // ========== 6a. 更新标签（删除旧的，添加新的）==========
      // 先删除所有现有标签关联
      await prisma.postTag.deleteMany({
        where: { postId: post.id },
      });

      // 添加新的标签关联
      if (postData.tags.length > 0) {
        await attachTagsToPost(post.id, postData.tags);
      }
    } else {
      // ========== 5b. 创建新文章 ==========
      post = await prisma.post.create({
        data: {
          title: postData.title,
          slug: postData.slug,
          content: postData.content,
          excerpt: postData.excerpt,
          published: postData.published,
          featured: postData.featured,
          publishedAt: postData.publishedAt,
          readingTime: postData.readingTime,
          coverImage: postData.coverImage,
          authorId: userId,
          categoryId,
        },
      });

      // ========== 6b. 处理标签 ==========
      if (postData.tags.length > 0) {
        await attachTagsToPost(post.id, postData.tags);
      }
    }

    // ========== 7. 记录成功结果 ==========
    results.success++;
    const action = existingPost ? "updated" : "created";
    if (action === "updated") {
      results.updated++;
    } else {
      results.created++;
    }
    results.imported.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      filePath: displayPath,
      action,
    });
  } catch (error) {
    // 记录失败结果
    results.failed++;
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    results.errors.push(`${displayPath}: ${errorMessage}`);
  }
}

/**
 * 从 FormData 中提取文件及其路径信息
 *
 * 原理：
 * 当用户上传文件夹时，前端会将每个文件的相对路径也一起发送
 * 这样我们可以保留文件的目录结构信息
 *
 * @param formData - 表单数据
 * @returns 文件数组和路径映射
 */
function extractFilesWithPaths(formData: FormData): {
  files: File[];
  pathMap: Map<string, string>;
} {
  const files = formData.getAll("files") as File[];
  const pathMap = new Map<string, string>();

  // 尝试获取文件路径信息
  files.forEach((file, index) => {
    const pathKey = `filePaths[${index}]`;
    const path = formData.get(pathKey);
    if (path && typeof path === "string") {
      pathMap.set(file.name, path);
    }
  });

  return { files, pathMap };
}

/**
 * 分析文件结构
 *
 * @param files - 文件数组
 * @param pathMap - 路径映射
 * @returns 文件结构信息
 */
function analyzeFileStructure(
  files: File[],
  pathMap: Map<string, string>
): FileStructureInfo {
  const directories = new Set<string>();
  let maxDepth = 0;
  let markdownFiles = 0;

  files.forEach((file) => {
    const path = pathMap.get(file.name) || file.name;
    const parts = path.split("/");

    // 计算深度
    maxDepth = Math.max(maxDepth, parts.length - 1);

    // 收集目录
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts.slice(0, i + 1).join("/");
      directories.add(dir);
    }

    // 统计 Markdown 文件
    if (file.name.endsWith(".md")) {
      markdownFiles++;
    }
  });

  return {
    totalFiles: files.length,
    markdownFiles,
    directories: directories.size,
    maxDepth,
  };
}

/**
 * POST /api/admin/posts/import
 * 批量导入 Markdown 文件为文章
 *
 * 工作原理：
 * 1. 验证管理员权限
 * 2. 从 FormData 中提取上传的文件（支持文件夹）
 * 3. 递归遍历所有文件并处理导入
 * 4. 返回导入结果统计
 *
 * 特性：
 * - ✅ 支持批量导入多个 Markdown 文件
 * - ✅ 支持上传整个文件夹（递归遍历所有子文件夹）
 * - ✅ 自动解析 YAML front matter
 * - ✅ 自动创建不存在的分类和标签
 * - ✅ 自动生成缺失的字段（slug、excerpt、readingTime）
 * - ✅ 防止 slug 重复
 * - ✅ 详细的错误报告
 * - ✅ 保留文件路径信息
 * - ✅ 文件结构分析
 */
export async function POST(request: NextRequest) {
  try {
    // ============ 1. 权限验证 ============
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    // ============ 2. 提取上传的文件及路径信息 ============
    const formData = await request.formData();
    const { files, pathMap } = extractFilesWithPaths(formData);

    // 验证是否有文件
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    // ============ 3. 验证用户存在 ============
    // 在开始处理前验证用户，避免处理多个文件后才发现用户不存在
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在，请重新登录" },
        { status: 401 }
      );
    }

    // ============ 4. 分析文件结构 ============
    const fileStructure = analyzeFileStructure(files, pathMap);

    // ============ 5. 初始化结果统计对象 ============
    const results: ImportResults = {
      success: 0,
      updated: 0,
      created: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      imported: [],
      fileStructure,
    };

    // ============ 6. 处理每个文件 ============
    for (const file of files) {
      const filePath = pathMap.get(file.name);
      await processFileImport(file, user.id, results, filePath);
    }

    // ============ 7. 返回导入结果 ============
    const message = [
      `导入完成:`,
      results.created > 0 ? `新建 ${results.created} 个` : null,
      results.updated > 0 ? `更新 ${results.updated} 个` : null,
      results.failed > 0 ? `失败 ${results.failed} 个` : null,
      results.skipped > 0 ? `跳过 ${results.skipped} 个` : null,
    ]
      .filter(Boolean)
      .join("，");

    return NextResponse.json({
      message,
      results,
    });
  } catch (error) {
    console.error("Markdown 导入错误:", error);
    return NextResponse.json(
      { error: "导入失败，请稍后重试" },
      { status: 500 }
    );
  }
}
