"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface SimpleImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
}

/**
 * 简化的图片组件 - 直接使用 Next.js Image
 * 所有优化由 Next.js 自动处理
 */
export function SimpleImage({
  src,
  alt,
  className,
  priority = false,
  fill = false,
  width,
  height,
  sizes,
}: SimpleImageProps) {
  // 检测是否为远程图片
  const isRemote = src.startsWith("http://") || src.startsWith("https://");

  if (!src) {
    return (
      <div
        className={cn(
          "bg-gray-200 dark:bg-gray-800 flex items-center justify-center",
          className
        )}
      >
        <svg
          className="w-16 h-16 text-gray-300 dark:text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      unoptimized={isRemote} // 远程图片不优化
    />
  );
}
