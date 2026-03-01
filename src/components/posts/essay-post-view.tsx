/**
 * 随笔风格的文章详情页面组件
 *
 * 设计理念：
 * - 简洁文艺，突出文字本身
 * - 去除所有装饰性元素
 * - 使用优雅的排版和间距
 * - 只展示作者信息和发布日期
 */

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { OptimizedAvatar } from "@/components/optimized/optimized-image";
import MarkdownRenderer from "@/components/markdown/markdown-renderer";

interface EssayPostViewProps {
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  author: {
    profile?: {
      displayName?: string;
      avatar?: string;
    };
    username: string;
  };
}

export default function EssayPostView({
  title,
  content,
  createdAt,
  updatedAt,
  publishedAt,
  author,
}: EssayPostViewProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
      {/* 文章标题 - 垂直居中，优雅简洁 */}
      <header className="mb-16 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 dark:text-gray-100 leading-relaxed tracking-wide">
          {title}
        </h1>
      </header>

      {/* 作者信息 - 极简风格 */}
      <div className="flex items-center justify-center gap-4 mb-16 pb-12 border-b border-gray-200 dark:border-gray-800">
        {author.profile?.avatar ? (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            <OptimizedAvatar
              src={author.profile.avatar}
              alt={author.profile.displayName || author.username}
              className="w-full h-full"
              priority={true}
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm">
            {(author.profile?.displayName || author.username)
              .charAt(0)
              .toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-light">
            {author.profile?.displayName || author.username}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-light">
            {format(new Date(publishedAt || createdAt), "yyyy年MM月dd日", {
              locale: zhCN,
            })}
          </span>
        </div>
      </div>

      {/* 文章内容 - 优雅的排版，增强可读性 */}
      <article
        className="prose prose-gray dark:prose-invert max-w-none
        prose-p:text-lg prose-p:leading-loose prose-p:text-gray-700 dark:prose-p:text-gray-300
        prose-h1:font-light prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-8 prose-h1:text-gray-900 dark:prose-h1:text-gray-100
        prose-h2:font-light prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-6 prose-h2:text-gray-900 dark:prose-h2:text-gray-100
        prose-h3:font-light prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-5 prose-h3:text-gray-900 dark:prose-h3:text-gray-100
        prose-strong:font-medium prose-a:font-normal prose-blockquote:font-normal
        prose-img:border-none prose-img:shadow-none prose-img:my-8
      "
      >
        <MarkdownRenderer content={content || "暂无内容"} showToc={false} />
      </article>

      {/* 底部装饰 - 简洁的线条 */}
      <div className="mt-24 pt-12 text-center">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-16 h-px bg-gray-300 dark:bg-gray-700"></div>
          <span className="text-xs text-gray-400 dark:text-gray-600 font-light tracking-widest">
            END
          </span>
          <div className="w-16 h-px bg-gray-300 dark:bg-gray-700"></div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 font-light">
          最后修改于{" "}
          {format(new Date(updatedAt), "yyyy年MM月dd日", { locale: zhCN })}
        </p>
      </div>
    </div>
  );
}
