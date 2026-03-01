"use client";

import { useState, useEffect, useRef } from "react";
import { X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "@/components/markdown/markdown-renderer";
import { cn } from "@/lib/utils";

interface ImmersiveReaderProps {
  title: string;
  content: string;
  author: {
    username: string;
    profile?: {
      displayName?: string;
    };
  };
  createdAt: string;
}

export function ImmersiveReaderToggle({
  title,
  content,
  author,
  createdAt,
}: ImmersiveReaderProps) {
  const [isImmersive, setIsImmersive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 进入全屏模式
  const enterFullscreen = async () => {
    setIsImmersive(true);
    // 等待 DOM 更新
    setTimeout(async () => {
      if (containerRef.current) {
        try {
          await containerRef.current.requestFullscreen();
        } catch (err) {
          console.log("无法进入全屏模式:", err);
        }
      }
    }, 100);
  };

  // 退出全屏模式
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.log("退出全屏失败:", err);
    }
    setIsImmersive(false);
  };

  // 处理 ESC 键和全屏变化
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isImmersive) {
        exitFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      // 当用户通过浏览器按钮或 ESC 退出全屏时
      if (!document.fullscreenElement && isImmersive) {
        setIsImmersive(false);
      }
    };

    if (isImmersive) {
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      // 禁用页面滚动
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.body.style.overflow = "unset";
    };
  }, [isImmersive]);

  return (
    <>
      {/* 沉浸式阅读按钮 - 只显示图标 */}
      <button
        onClick={enterFullscreen}
        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors"
        title="沉浸式阅读"
      >
        <Maximize2 className="w-4 h-4 text-foreground" strokeWidth={2} />
      </button>

      {/* 沉浸式阅读模式 */}
      {isImmersive && (
        <div
          ref={containerRef}
          className="fixed inset-0 z-50 bg-white dark:bg-black overflow-y-auto"
        >
          {/* 文章内容区域 */}
          <div className="max-w-4xl mx-auto px-6 py-16">
            {/* 文章标题 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black dark:text-white mb-12 leading-tight tracking-tighter uppercase">
              {title}
            </h1>

            {/* 文章元信息 */}
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-16 pb-8 border-b-2 border-black dark:border-white">
              <span className="text-black dark:text-white">
                {author.profile?.displayName || author.username}
              </span>
              <span>/</span>
              <span>
                {new Date(createdAt)
                  .toLocaleDateString("zh-CN")
                  .replace(/\//g, ".")}
              </span>
            </div>

            {/* Markdown 内容 */}
            <article className="prose-immersive">
              <MarkdownRenderer content={content} showToc={false} />
            </article>

            {/* 底部返回按钮 */}
            <div className="mt-24 pt-12 border-t-2 border-black dark:border-white text-center">
              <button
                onClick={exitFullscreen}
                className="inline-flex items-center gap-3 px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                <X className="w-5 h-5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
