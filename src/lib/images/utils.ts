/**
 * 图片管理工具函数
 *
 * 提供文件系统操作和路径管理功能
 */

import fs from "fs/promises";
import path from "path";

/**
 * 获取文章图片目录的绝对路径
 * @param slug 文章 slug
 * @returns 绝对路径
 */
export function getPostImageDir(slug: string): string {
  return path.join(process.cwd(), "public", "images", "posts", slug);
}

/**
 * 获取文章图片目录的 URL 路径（用于前端访问）
 * @param slug 文章 slug
 * @returns URL 路径（如 /images/posts/my-article）
 */
export function getPostImageDirUrl(slug: string): string {
  return `/images/posts/${slug}`;
}

/**
 * 清理文件名，移除特殊字符
 * @param filename 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFilename(filename: string): string {
  // 移除扩展名
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // 移除或替换特殊字符
  const cleaned = nameWithoutExt
    .replace(/[\s]+/g, "-") // 空格替换为横线
    .replace(/[^\w\u4e00-\u9fa5-]/g, "") // 只保留字母、数字、中文、横线
    .replace(/^-+|-+$/g, "") // 移除首尾横线
    .toLowerCase();

  return cleaned || "image";
}

/**
 * 生成图片文件名
 * @param type 图片类型：cover（封面）或 content（内容配图）
 * @param ext 文件扩展名（如 jpg, png）
 * @param originalFilename 原始文件名（可选，用于保留有意义的名称）
 * @returns 文件名
 */
export function generateImageFilename(
  type: "cover" | "content",
  ext: string,
  originalFilename?: string
): string {
  if (type === "cover") {
    return `cover.${ext}`;
  }

  // 内容配图：优先使用清理后的原文件名
  if (originalFilename) {
    const baseName = sanitizeFilename(originalFilename);
    return `${baseName}.${ext}`;
  }

  // 如果没有原文件名，使用时间戳（作为后备方案）
  const timestamp = Date.now();
  return `image-${timestamp}.${ext}`;
}

/**
 * 确保图片目录存在，不存在则创建
 * @param slug 文章 slug
 */
export async function ensureImageDir(slug: string): Promise<void> {
  const dir = getPostImageDir(slug);
  try {
    await fs.access(dir);
  } catch {
    // 目录不存在，创建目录
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 删除图片文件
 * @param filePath 图片的相对路径（如 /images/posts/my-article/cover.jpg）
 */
export async function deleteImageFile(filePath: string): Promise<void> {
  // 移除开头的 /，构建绝对路径
  const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    console.error(`删除图片失败: ${absolutePath}`, error);
    throw new Error("删除图片文件失败");
  }
}

/**
 * 重命名图片文件
 * @param oldPath 旧的图片路径（如 /images/posts/my-article/image-123.jpg）
 * @param newFilename 新的文件名（仅文件名，如 new-image.jpg）
 * @returns 新的图片路径
 */
export async function renameImageFile(
  oldPath: string,
  newFilename: string
): Promise<string> {
  // 移除开头的 /
  const relativeOldPath = oldPath.startsWith("/") ? oldPath.slice(1) : oldPath;
  const absoluteOldPath = path.join(process.cwd(), "public", relativeOldPath);

  // 构建新路径
  const dir = path.dirname(absoluteOldPath);
  const absoluteNewPath = path.join(dir, newFilename);

  try {
    await fs.rename(absoluteOldPath, absoluteNewPath);

    // 返回新的相对路径（用于存储到数据库）
    const relativeDir = path.dirname(relativeOldPath);
    return `/${relativeDir}/${newFilename}`;
  } catch (error) {
    console.error(
      `重命名图片失败: ${absoluteOldPath} -> ${absoluteNewPath}`,
      error
    );
    throw new Error("重命名图片文件失败");
  }
}

/**
 * 获取图片的 URL
 * @param slug 文章 slug
 * @param filename 文件名
 * @returns 图片 URL
 */
export function getImageUrl(slug: string, filename: string): string {
  return `/images/posts/${slug}/${filename}`;
}

/**
 * 从文件扩展名提取不带点的扩展名
 * @param filename 文件名
 * @returns 扩展名（小写，不带点）
 */
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串（如 1.5 MB）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径（相对路径，如 /images/posts/my-article/cover.jpg）
 * @returns 是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成唯一的文件名（如果文件已存在，自动添加序号）
 * @param slug 文章 slug
 * @param filename 期望的文件名
 * @returns 唯一的文件名
 */
export async function generateUniqueFilename(
  slug: string,
  filename: string
): Promise<string> {
  const ext = getFileExtension(filename);
  const baseName = filename.replace(/\.[^/.]+$/, "");

  let counter = 1;
  let uniqueFilename = filename;

  // 检查文件是否存在，如果存在则添加序号
  while (await fileExists(getImageUrl(slug, uniqueFilename))) {
    uniqueFilename = `${baseName}-${counter}.${ext}`;
    counter++;
  }

  return uniqueFilename;
}
