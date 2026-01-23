"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  fallbackSrc?: string;
  blurDataURL?: string;
  loading?: "lazy" | "eager";
  unoptimized?: boolean; // 支持远程图片
}

// 极低质量的模糊占位符 (用于渐进式加载)
const generateBlurPlaceholder = (width: number, height: number) => {
  return `data:image/svg+xml;base64,${btoa(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(229,231,235);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(243,244,246);stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(#grad)"/></svg>`
  )}`;
};

export function OptimizedAvatar({
  src,
  alt,
  className,
  priority = true,
}: Pick<OptimizedImageProps, "src" | "alt" | "className" | "priority">) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-100 dark:bg-gray-800",
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
      )}

      {!hasError && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 80px, (max-width: 1024px) 100px, 120px"
          quality={85}
          priority={priority}
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
          <span className="text-2xl font-bold text-gray-400">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

export function OptimizedCover({
  src,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw",
}: Pick<
  OptimizedImageProps,
  "src" | "alt" | "className" | "priority" | "sizes"
>) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 检测是否为远程图片URL
  const isRemoteUrl =
    src && (src.startsWith("http://") || src.startsWith("https://"));

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-100 dark:bg-gray-800",
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400 animate-pulse" />
      )}

      {!hasError && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={85}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          unoptimized={isRemoteUrl ? true : false}
          className={cn(
            "object-cover transition-all duration-500",
            isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100"
          )}
          placeholder={isRemoteUrl ? undefined : ("blur" as any)} // 远程图片不使用模糊占位符
          blurDataURL={
            isRemoteUrl ? undefined : generateBlurPlaceholder(10, 10)
          }
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
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
      )}
    </div>
  );
}

export function OptimizedContentImage({
  src,
  alt,
  className,
}: Pick<OptimizedImageProps, "src" | "alt" | "className">) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("w-full h-full object-cover", className)}
    />
  );
}
