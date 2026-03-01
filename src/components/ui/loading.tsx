"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * 简单的圆形 Loading - 推荐使用
 * 统一默认文案：永言配命，莫向外求。
 */
export function SimpleLoading({
  text = "永言配命，莫向外求",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center gap-8 bg-background z-50",
        className
      )}
    >
      {/* 简洁的旋转圆环 */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 animate-spin">
          <div className="w-full h-full border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 w-full h-full border-4 border-transparent border-t-primary rounded-full" />
        </div>
      </div>

      {/* 文字带跳动省略号 */}
      {text && (
        <div className="flex items-end gap-1">
          <span className="text-sm text-muted-foreground tracking-wide">
            {text}
          </span>
          <span className="flex gap-[3px] mb-[3px]">
            <span
              className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "600ms" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "150ms", animationDuration: "600ms" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: "300ms", animationDuration: "600ms" }}
            />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 简单的 Loading Spinner - 用于表格等组件
 */
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
 * 后台专用的简洁 Loading - 只是个转圈
 */
export function AdminLoading({
  className,
  text = "处理中...",
}: {
  className?: string;
  text?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-8",
        className
      )}
    >
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full" />
        <div className="absolute inset-0 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
      {text && (
        <p className="text-sm font-bold text-black dark:text-white uppercase tracking-widest animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * 后台全屏 Loading 遮罩
 */
export function AdminLoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px] rounded-xl overflow-hidden animate-in fade-in duration-200">
      <AdminLoading text={text} />
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
