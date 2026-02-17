/**
 * Markdown 渲染器组件
 *
 * 功能特性：
 * 1. 将 Markdown 文本转换为格式化的 HTML 内容
 * 2. 支持 GitHub Flavored Markdown (表格、删除线、任务列表等)
 * 3. 代码语法高亮（基于 highlight.js）
 * 4. 自动生成文章目录 (Table of Contents)
 * 5. 支持章节跳转和滚动高亮
 * 6. 响应式设计：移动端折叠目录，桌面端浮动目录
 *
 * 使用的第三方库：
 * - react-markdown: Markdown 解析和渲染
 * - remark-gfm: GitHub Flavored Markdown 支持
 * - rehype-highlight: 代码语法高亮
 * - rehype-raw: 原始 HTML 支持
 * - lucide-react: 图标库
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { List, ChevronRight, ChevronDown, ChevronLeft, X } from "lucide-react";

import Mermaid from "./mermaid";
import CodeBlock from "./code-block";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";

// 组件属性接口定义
interface MarkdownRendererProps {
  content: string | undefined; // 要渲染的 Markdown 文本内容，可能为空
  showToc?: boolean; // 是否显示目录（Table of Contents），默认为 true
}

// 目录项数据结构
interface TocItem {
  id: string; // 标题的唯一标识符，用于页面内跳转
  text: string; // 标题的文本内容
  level: number; // 标题级别（1-6，对应 h1-h6）
}

export default function MarkdownRenderer({
  content,
  showToc = true,
}: MarkdownRendererProps) {
  // 确保 content 不为空，提供默认值
  const safeContent = content || "";

  // 状态管理
  const [activeHeading, setActiveHeading] = useState<string>(""); // 当前激活的标题 ID
  const [tocOpen, setTocOpen] = useState(false); // 移动端目录是否展开
  const [desktopTocCollapsed, setDesktopTocCollapsed] = useState(false); // 桌面端目录是否折叠
  const [readingProgress, setReadingProgress] = useState(0); // 阅读进度
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // 图片放大状态

  // 生成稳定的唯一 ID - 基于内容哈希，确保服务端和客户端一致
  const generateStableUniqueId = (text: string, index: number) => {
    const baseId = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
      .replace(/\s+/g, "-");

    // 使用内容哈希 + 索引确保唯一性和稳定性
    const hash = text.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    return `${baseId}-${Math.abs(hash).toString(36)}-${index}`;
  };

  // 预生成所有标题及其稳定 ID，确保目录和标题渲染使用一致的 ID
  const { toc, headingIdMap } = useMemo(() => {
    // 首先移除代码块内容，避免将代码中的#号误解析为标题
    const codeBlockRegex = /```[\s\S]*?```/g;
    let contentWithoutCodeBlocks = safeContent.replace(codeBlockRegex, "");

    const inlineCodeRegex = /`[^`]*`/g;
    contentWithoutCodeBlocks = contentWithoutCodeBlocks.replace(
      inlineCodeRegex,
      ""
    );

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: TocItem[] = [];
    const idMap = new Map<string, string>();
    const textCounters = new Map<string, number>(); // 跟踪每个文本的出现次数
    let match;
    let globalCounter = 0;

    // 循环匹配所有标题
    while ((match = headingRegex.exec(contentWithoutCodeBlocks)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();

      // 生成稳定的唯一 ID
      const id = generateStableUniqueId(text, globalCounter);

      // 为重复的文本创建唯一的键
      const currentCount = textCounters.get(text) || 0;
      const uniqueKey = currentCount === 0 ? text : `${text}___${currentCount}`;
      textCounters.set(text, currentCount + 1);

      headings.push({ id, text, level });
      idMap.set(uniqueKey, id); // 使用唯一键建立映射

      globalCounter++;
    }

    return { toc: headings, headingIdMap: idMap };
  }, [safeContent]);

  // 使用 useEffect 监听滚动事件，实现目录高亮功能和阅读进度
  useEffect(() => {
    const handleScroll = () => {
      // 获取页面中所有的标题元素
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      // 当前滚动位置，加上100px的偏移量（避免标题刚好在顶部时的边界问题）
      const scrollTop = window.scrollY + 100;

      // 计算阅读进度
      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(
        100,
        Math.max(0, (window.scrollY / documentHeight) * 100)
      );
      setReadingProgress(progress);

      // 从最后一个标题开始向前检查，找到当前应该高亮的标题
      // 这样可以确保找到的是用户正在阅读的章节
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i] as HTMLElement;
        // 如果标题的位置在当前滚动位置之上，说明用户正在阅读这个章节
        if (heading.offsetTop <= scrollTop) {
          setActiveHeading(heading.id); // 更新激活的标题 ID
          break;
        }
      }
    };

    // 添加滚动事件监听器
    window.addEventListener("scroll", handleScroll);
    // 组件挂载时立即执行一次，设置初始状态
    handleScroll();

    // 清理函数：组件卸载时移除事件监听器，防止内存泄漏
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // 空依赖数组：只在组件挂载和卸载时执行

  // 重置标题计数器
  useEffect(() => {
    // 清理全局计数器
    if (typeof window !== "undefined") {
      (window as any).__headingCounters = {};
    }
  }, [safeContent]); // 当内容变化时重置

  // 跳转到指定章节的函数
  const scrollToHeading = (id: string) => {
    // 根据 ID 查找对应的 DOM 元素
    const element = document.getElementById(id);
    if (element) {
      // 使用平滑滚动效果跳转到目标元素
      // behavior: "smooth" - 平滑滚动动画
      // block: "start" - 元素顶部对齐到视口顶部
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // 跳转后关闭移动端的目录面板
      setTocOpen(false);
    }
  };

  return (
    <>
      {/* 图片放大弹窗 */}
      <Dialog
        open={lightboxImage !== null}
        onOpenChange={() => setLightboxImage(null)}
      >
        <DialogOverlay />
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => setLightboxImage(null)}
        >
          <DialogTitle className="sr-only">图片预览</DialogTitle>
          <div className="relative flex items-center justify-center w-full h-full">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-200 transition-colors"
              aria-label="关闭"
            >
              <X className="w-6 h-6" />
            </button>
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="放大图片"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 顶部阅读进度条 */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800 z-50">
        <div
          className="h-full bg-black dark:bg-white transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div className="flex gap-20 min-w-0">
        {/* 文章内容区域 */}
        <div className="flex-1 min-w-0 overflow-x-hidden">
          {/* 移动端目录切换按钮 */}
          {showToc && toc.length > 0 && (
            <div className="mb-6 xl:hidden">
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="inline-flex items-center space-x-2 px-4 py-2 text-sm text-black dark:text-white border-2 border-black dark:border-white rounded-lg font-bold transition-colors"
              >
                <List className="w-4 h-4" />
                <span>目录</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${tocOpen ? "rotate-90" : ""}`}
                />
              </button>

              {/* 移动端目录内容面板 */}
              {tocOpen && (
                <div className="mt-4 max-h-80 overflow-y-auto border-2 border-black dark:border-white rounded-lg bg-white dark:bg-black">
                  <nav className="space-y-1 p-3">
                    {toc.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left py-2 px-3 text-sm rounded transition-all truncate ${
                          activeHeading === item.id
                            ? "text-white dark:text-black bg-black dark:bg-white font-bold"
                            : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                        }`}
                        style={{
                          paddingLeft: `${(item.level - 1) * 12 + 12}px`,
                        }}
                        title={item.text}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          )}

          {/* Markdown 内容渲染区域 */}
          <div
            className="prose prose-gray dark:prose-invert w-full max-w-full min-w-0 overflow-x-hidden break-words break-all font-sans
          prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold prose-headings:font-sans
          prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:border-b-4 prose-h1:border-black dark:prose-h1:border-white prose-h1:pb-3
          prose-h2:text-2xl prose-h2:mb-5 prose-h2:mt-10 prose-h2:border-l-4 prose-h2:border-black dark:prose-h2:border-white prose-h2:pl-4
          prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-8
          prose-h4:text-lg prose-h4:mb-4 prose-h4:mt-6
          prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:leading-[1.7] prose-p:mb-6 prose-p:text-base
          prose-li:text-gray-800 dark:prose-li:text-gray-200 prose-li:mb-2 prose-li:leading-relaxed
          prose-strong:text-black dark:prose-strong:text-white prose-strong:font-black
          prose-em:text-gray-600 dark:prose-em:text-gray-400 prose-em:italic
          prose-code:text-black dark:prose-code:text-white prose-code:font-mono prose-code:text-[0.9em] prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-8
          prose-blockquote:border-l-[6px] prose-blockquote:border-black dark:prose-blockquote:border-white prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:py-1
          prose-table:text-sm prose-table:font-sans prose-table:my-8
          prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:border-2 prose-th:border-black dark:prose-th:border-white prose-th:font-bold prose-th:text-black dark:prose-th:text-white prose-th:px-4 prose-th:py-2
          prose-td:border-2 prose-td:border-black dark:prose-td:border-white prose-td:px-4 prose-td:py-2
          prose-a:text-black dark:prose-a:text-white prose-a:font-bold prose-a:underline prose-a:underline-offset-4 decoration-2 transition-all
          prose-img:max-w-full prose-img:mx-auto prose-img:rounded-none prose-img:border-[4px] prose-img:border-black dark:prose-img:border-white prose-img:my-12 prose-img:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:prose-img:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]
          [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto
          [&_iframe]:max-w-full [&_iframe]:w-full
        "
          >
            {useMemo(
              () => (
                <ReactMarkdown
                  // remark 插件：处理 Markdown 语法解析阶段
                  remarkPlugins={[remarkGfm]} // 支持 GitHub Flavored Markdown 扩展语法
                  // 安全策略：不启用原始 HTML 直通渲染，避免注入风险
                  // 如需白名单 HTML，请引入 rehype-sanitize 后再开启。
                  // 自定义组件：覆盖默认的 HTML 元素渲染
                  components={{
                    // 自定义 h1 标题渲染 - 为每个标题添加唯一 ID 以支持锚点跳转
                    h1: ({ children, ...props }) => {
                      const text = children?.toString() || "";
                      // 创建或获取当前标题的计数器
                      const currentCount =
                        (window as any).__headingCounters?.[text] || 0;
                      const uniqueKey =
                        currentCount === 0 ? text : `${text}___${currentCount}`;

                      // 更新计数器
                      if (!(window as any).__headingCounters) {
                        (window as any).__headingCounters = {};
                      }
                      (window as any).__headingCounters[text] =
                        currentCount + 1;

                      // 获取预生成的 ID
                      const id =
                        headingIdMap.get(uniqueKey) ||
                        generateStableUniqueId(text, currentCount);
                      return (
                        <h1 id={id} className="scroll-mt-20" {...props}>
                          {children}
                        </h1>
                      );
                    },
                    // h2-h6 标题渲染
                    h2: ({ children, ...props }) => {
                      const text = children?.toString() || "";
                      const currentCount =
                        (window as any).__headingCounters?.[text] || 0;
                      const uniqueKey =
                        currentCount === 0 ? text : `${text}___${currentCount}`;

                      if (!(window as any).__headingCounters) {
                        (window as any).__headingCounters = {};
                      }
                      (window as any).__headingCounters[text] =
                        currentCount + 1;

                      const id =
                        headingIdMap.get(uniqueKey) ||
                        generateStableUniqueId(text, currentCount);
                      return (
                        <h2 id={id} className="scroll-mt-20" {...props}>
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children, ...props }) => {
                      const text = children?.toString() || "";
                      const currentCount =
                        (window as any).__headingCounters?.[text] || 0;
                      const uniqueKey =
                        currentCount === 0 ? text : `${text}___${currentCount}`;

                      if (!(window as any).__headingCounters) {
                        (window as any).__headingCounters = {};
                      }
                      (window as any).__headingCounters[text] =
                        currentCount + 1;

                      const id =
                        headingIdMap.get(uniqueKey) ||
                        generateStableUniqueId(text, currentCount);
                      return (
                        <h3 id={id} className="scroll-mt-20" {...props}>
                          {children}
                        </h3>
                      );
                    },
                    h4: ({ children, ...props }) => {
                      const text = children?.toString() || "";
                      const currentCount =
                        (window as any).__headingCounters?.[text] || 0;
                      const uniqueKey =
                        currentCount === 0 ? text : `${text}___${currentCount}`;

                      if (!(window as any).__headingCounters) {
                        (window as any).__headingCounters = {};
                      }
                      (window as any).__headingCounters[text] =
                        currentCount + 1;

                      const id =
                        headingIdMap.get(uniqueKey) ||
                        generateStableUniqueId(text, currentCount);
                      return (
                        <h4 id={id} className="scroll-mt-20" {...props}>
                          {children}
                        </h4>
                      );
                    },
                    h5: ({ children, ...props }) => {
                      const text = children?.toString() || "";
                      const currentCount =
                        (window as any).__headingCounters?.[text] || 0;
                      const uniqueKey =
                        currentCount === 0 ? text : `${text}___${currentCount}`;

                      if (!(window as any).__headingCounters) {
                        (window as any).__headingCounters = {};
                      }
                      (window as any).__headingCounters[text] =
                        currentCount + 1;

                      const id =
                        headingIdMap.get(uniqueKey) ||
                        generateStableUniqueId(text, currentCount);
                      return (
                        <h5 id={id} className="scroll-mt-20" {...props}>
                          {children}
                        </h5>
                      );
                    },
                    h6: ({ children, ...props }) => {
                      const text = children?.toString() || "";
                      const currentCount =
                        (window as any).__headingCounters?.[text] || 0;
                      const uniqueKey =
                        currentCount === 0 ? text : `${text}___${currentCount}`;

                      if (!(window as any).__headingCounters) {
                        (window as any).__headingCounters = {};
                      }
                      (window as any).__headingCounters[text] =
                        currentCount + 1;

                      const id =
                        headingIdMap.get(uniqueKey) ||
                        generateStableUniqueId(text, currentCount);
                      return (
                        <h6 id={id} className="scroll-mt-20" {...props}>
                          {children}
                        </h6>
                      );
                    },
                    // 自定义代码渲染 - 支持代码块、行内代码和 Mermaid 图表
                    code: ({ className, children, node, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const language = match ? match[1] : "text"; // 默认语言为 text
                      const code = String(children).replace(/\n$/, "");

                      // 判断是否为行内代码：
                      // 1. 检查是否有 className（代码块通常有 language-xxx 类名）
                      // 2. 检查代码是否包含换行符（行内代码通常不包含换行）
                      // 3. 检查父节点
                      const hasLanguageClass = /^language-/.test(
                        className || ""
                      );
                      const hasNewlines = code.includes("\n");
                      const isCodeBlock =
                        hasLanguageClass ||
                        hasNewlines ||
                        node?.parent?.tagName === "pre";

                      // 行内代码：如 `console.log()`
                      if (!isCodeBlock) {
                        return (
                          <code
                            className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      // Mermaid 图表
                      if (language === "mermaid") {
                        // 使用内容的哈希值生成稳定的 ID
                        const hashCode = (str: string) => {
                          let hash = 0;
                          for (let i = 0; i < str.length; i++) {
                            const char = str.charCodeAt(i);
                            hash = (hash << 5) - hash + char;
                            hash = hash & hash; // Convert to 32bit integer
                          }
                          return Math.abs(hash).toString(36);
                        };

                        const stableId = `mermaid-${hashCode(code)}`;

                        return <Mermaid chart={code} id={stableId} />;
                      }

                      // 代码块（包括没有指定语言的代码块）
                      return (
                        <CodeBlock className={className || "language-text"}>
                          {code}
                        </CodeBlock>
                      );
                    },
                    // 自定义链接样式 - 外部链接在新窗口打开
                    a: ({ children, ...props }) => (
                      <a
                        className="text-black dark:text-white font-bold underline underline-offset-4 decoration-2 transition-all"
                        target="_blank" // 在新窗口打开链接
                        rel="noopener noreferrer" // 安全属性：防止新窗口访问原窗口对象
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    // 自定义表格样式 - 响应式表格，支持水平滚动
                    table: ({ children, ...props }) => (
                      <div className="overflow-x-auto my-8">
                        {" "}
                        {/* 水平滚动容器，防止表格在小屏幕上溢出 */}
                        <table
                          className="min-w-full border-2 border-black dark:border-white"
                          {...props}
                        >
                          {children}
                        </table>
                      </div>
                    ),
                    // 表格头部单元格样式
                    th: ({ children, ...props }) => (
                      <th
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-black dark:border-white text-left font-bold text-black dark:text-white"
                        {...props}
                      >
                        {children}
                      </th>
                    ),
                    // 表格数据单元格样式
                    td: ({ children, ...props }) => (
                      <td
                        className="px-4 py-2 border-2 border-black dark:border-white text-gray-800 dark:text-gray-200"
                        {...props}
                      >
                        {children}
                      </td>
                    ),
                    // 自定义引用块样式 - 左侧蓝色边框，浅蓝背景
                    blockquote: ({ children, ...props }) => (
                      <blockquote
                        className="border-l-[6px] border-black dark:border-white pl-6 py-4 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 italic font-serif my-8"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    ),
                    // 自定义图片样式 - 添加点击放大功能
                    img: ({ src, alt, ...props }: any) => (
                      <img
                        src={src}
                        alt={alt || ""}
                        className="max-w-full mx-auto rounded-none border-[4px] border-black dark:border-white my-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxImage(src)}
                        {...props}
                      />
                    ),
                  }}
                >
                  {content || ""}
                </ReactMarkdown>
              ),
              [content, headingIdMap]
            )}{" "}
            {/* 只依赖content和headingIdMap */}
          </div>
        </div>

        {/* 桌面端右侧目录 */}
        {showToc && toc.length > 0 && (
          <div
            className={`hidden xl:block flex-shrink-0 transition-all duration-300 ${
              desktopTocCollapsed ? "w-12" : "w-64"
            }`}
          >
            <div className="sticky top-24 max-h-[calc(100vh-6rem)]">
              {/* 目录折叠按钮 */}
              <div className="flex items-center justify-between mb-6">
                {!desktopTocCollapsed && (
                  <h4 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em]">
                    Table of Contents
                  </h4>
                )}
                <button
                  onClick={() => setDesktopTocCollapsed(!desktopTocCollapsed)}
                  className="p-2 border-2 border-black dark:border-white rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
                  title={desktopTocCollapsed ? "展开目录" : "折叠目录"}
                >
                  {desktopTocCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* 目录内容 */}
              {!desktopTocCollapsed && (
                <div className="overflow-y-auto max-h-[calc(100vh-12rem)] pr-4 custom-scrollbar">
                  <nav className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                    {toc.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left py-2 px-3 text-sm rounded-none border-l-4 transition-all truncate ${
                          activeHeading === item.id
                            ? "text-black dark:text-white border-black dark:border-white bg-gray-100 dark:bg-gray-800 font-bold"
                            : "text-gray-400 dark:text-gray-500 border-transparent hover:text-black dark:hover:text-white hover:border-gray-200 dark:hover:border-gray-700"
                        }`}
                        style={{
                          paddingLeft: `${(item.level - 1) * 12 + 12}px`,
                        }}
                        title={item.text}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
