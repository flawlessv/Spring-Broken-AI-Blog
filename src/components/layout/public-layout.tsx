"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Moon, Sun } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: ReactNode;
  extraButtons?: ReactNode; // 额外的按钮，用于文章详情页的沉浸式阅读
  leftButtons?: ReactNode; // 左侧按钮，用于返回等操作
}

export default function PublicLayout({
  children,
  extraButtons,
  leftButtons,
}: PublicLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航栏背景 - 滚动时显示 */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b h-16 sm:h-20 flex items-center",
          scrolled
            ? "bg-background/80 backdrop-blur-md border-border/40 shadow-sm h-14 sm:h-16"
            : "bg-transparent border-transparent"
        )}
      >
        <div
          className={cn(
            "mx-auto px-6 lg:px-8 flex items-center justify-between w-full transition-all duration-300",
            "max-w-7xl"
          )}
        >
          {/* 左侧区域 */}
          <div className="flex items-center gap-4">{leftButtons}</div>

          {/* 右侧区域 */}
          <div className="flex items-center gap-2 sm:gap-4">
            {extraButtons}
            <ThemeToggle />
            <Link
              href="/admin"
              className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors"
              title="后台管理"
            >
              <LayoutDashboard
                className="w-4 h-4 text-foreground"
                strokeWidth={2}
              />
            </Link>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 w-full px-6 lg:px-12 pt-16 pb-16 animate-fade-in">
        <div className="w-full">{children}</div>
      </main>

      {/* 极简底部 */}
      <footer className="border-t border-border/40 bg-background mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-2">
          <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
            &ldquo;哪里的海都一样 东京也可以变成獾子岛&rdquo;
            <br />
            &ldquo;The sea is the same everywhere，even Tokyo can become Badger
            Island.&rdquo;
          </p>
        </div>
      </footer>
    </div>
  );
}
