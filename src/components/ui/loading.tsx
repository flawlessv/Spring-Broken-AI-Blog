"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function Loading({ className, size = "md", text }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && (
        <span className="ml-2 text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

export function LoadingSpinner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-center p-4", className)}
      {...props}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * 全屏博客风格Loading组件
 * 优雅的动画效果，适合博客场景
 */
export function FullScreenLoading({
  text = "加载中...",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* 优雅的加载动画 - 双层旋转圆环 */}
        <div className="relative">
          {/* 外层静态圆环 */}
          <div className="w-20 h-20 border-4 border-muted/30 rounded-full"></div>
          {/* 内层旋转圆环 - 渐变效果 */}
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-primary border-r-primary/50 rounded-full animate-spin"></div>
          {/* 中心脉冲点 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* 文字动画 */}
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium text-foreground tracking-wide">
            {text}
          </span>
          <div className="flex space-x-1.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]"></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]"></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]"></span>
          </div>
        </div>

        {/* 优雅的进度条动画 */}
        <div className="w-64 h-1 bg-muted/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export function LoadingButton({
  children,
  isLoading,
  className,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
