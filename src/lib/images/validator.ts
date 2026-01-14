/**
 * 图片验证工具
 *
 * 提供图片文件的类型和大小验证功能
 */

/**
 * 允许的图片 MIME 类型
 */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * 允许的文件扩展名
 */
export const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
] as const;

/**
 * 封面图最大大小（字节）- 2MB
 */
export const MAX_SIZE_COVER = 2 * 1024 * 1024;

/**
 * 内容配图最大大小（字节）- 2MB
 */
export const MAX_SIZE_CONTENT = 2 * 1024 * 1024;

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 验证图片文件（用于客户端 File 对象）
 * @param file File 对象
 * @param type 图片类型：cover 或 content
 * @returns 验证结果
 */
export function validateImageFile(
  file: File,
  type: "cover" | "content" = "content"
): ValidationResult {
  // 检查文件类型
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `不支持的图片格式。仅支持：${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // 检查文件大小
  const maxSize = type === "cover" ? MAX_SIZE_COVER : MAX_SIZE_CONTENT;
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `图片大小超过限制。${type === "cover" ? "封面图" : "内容配图"}最大 ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * 验证 MIME 类型
 * @param mimeType MIME 类型字符串
 * @returns 是否有效
 */
export function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * 验证文件扩展名
 * @param filename 文件名
 * @returns 是否有效
 */
export function isValidExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS.includes(ext as any) : false;
}

/**
 * 验证文件大小
 * @param size 文件大小（字节）
 * @param type 图片类型
 * @returns 验证结果
 */
export function validateFileSize(
  size: number,
  type: "cover" | "content" = "content"
): ValidationResult {
  const maxSize = type === "cover" ? MAX_SIZE_COVER : MAX_SIZE_CONTENT;

  if (size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `文件大小超过限制（最大 ${maxSizeMB}MB）`,
    };
  }

  return { valid: true };
}

/**
 * 从 MIME 类型获取文件扩展名
 * @param mimeType MIME 类型
 * @returns 文件扩展名（不带点）
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return map[mimeType] || "jpg";
}

/**
 * 获取 MIME 类型的显示名称
 * @param mimeType MIME 类型
 * @returns 显示名称
 */
export function getMimeTypeDisplayName(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "JPEG",
    "image/jpg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "image/gif": "GIF",
  };

  return map[mimeType] || "未知格式";
}
