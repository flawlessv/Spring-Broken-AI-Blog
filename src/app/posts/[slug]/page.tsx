import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";

import PublicLayout from "@/components/layout/public-layout";
import MarkdownRenderer from "@/components/markdown/markdown-renderer";
import { ImmersiveReaderToggle } from "@/components/immersive-reader";
import RelatedPosts from "@/components/posts/related-posts";
import { SeasonalBackground } from "@/components/home/seasonal-background";
import { FlowerClick } from "@/components/home/flower-click";
import { OptimizedAvatar } from "@/components/optimized/optimized-image";

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  author: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    color?: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color?: string;
  }>;
  commentsCount: number;
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:7777"}/api/posts/${slug}`,
      {
        cache: "no-store", // 确保获取最新数据
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error("获取文章详情失败:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "文章不存在 - Spring Broken AI Blog Blog",
    };
  }

  return {
    title: `${post.title} - Spring Broken AI Blog Blog`,
    description: post.excerpt || "Spring Broken AI Blog Blog 文章详情",
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      {/* 季节背景效果 */}
      <SeasonalBackground />

      {/* 点击小红花效果 */}
      <FlowerClick />

      <PublicLayout
        leftButtons={
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-1.5 border-[2px] border-black dark:border-white rounded-full text-sm font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>返回首页</span>
          </Link>
        }
        extraButtons={
          <ImmersiveReaderToggle
            title={post.title}
            content={post.content || "暂无内容"}
            author={post.author}
            createdAt={post.createdAt}
          />
        }
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 文章头部 */}
          <header className="mb-12 pt-8">
            {/* 分类和标签 */}
            {(post.categories.length > 0 || post.tags.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold rounded-full uppercase tracking-wider"
                  >
                    {cat.name}
                  </span>
                ))}
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 border-2 border-black dark:border-white text-black dark:text-white text-[10px] font-bold rounded-full uppercase tracking-wider"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* 标题 */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-8 leading-[1.1] tracking-tight font-sans">
              {post.title}
              {post.featured && (
                <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-yellow-400 text-black uppercase tracking-tighter align-middle">
                  Featured
                </span>
              )}
            </h1>

            {/* 文章信息 - 极简风格 */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400 font-medium">
              <div className="flex items-center gap-3">
                {post.author.profile?.avatar ? (
                  <div className="w-10 h-10 rounded-full border-2 border-black dark:border-white overflow-hidden bg-white">
                    <OptimizedAvatar
                      src={post.author.profile.avatar}
                      alt={
                        post.author.profile?.displayName || post.author.username
                      }
                      className="w-full h-full"
                      priority={true}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black text-xs font-bold border-2 border-black dark:border-white">
                    {(post.author.profile?.displayName || post.author.username)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-black dark:text-white font-bold">
                    {post.author.profile?.displayName || post.author.username}
                  </span>
                  <span className="text-[12px] opacity-70">
                    {format(
                      new Date(post.publishedAt || post.createdAt),
                      "yyyy年MM月dd日",
                      { locale: zhCN }
                    )}
                  </span>
                </div>
              </div>

              <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-800 hidden sm:block" />

              {post.commentsCount > 0 && (
                <span className="flex items-center gap-1.5 hover:text-black dark:hover:text-white transition-colors cursor-default">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {post.commentsCount} Comments
                </span>
              )}
            </div>
          </header>

          {/* 文章内容 */}
          <article className="mb-16">
            <MarkdownRenderer
              content={post.content || "暂无内容"}
              showToc={true}
            />
          </article>

          <div className="h-[2px] w-full bg-black dark:bg-white mb-16 opacity-10" />

          {/* 相关文章推荐 */}
          <RelatedPosts slug={slug} limit={3} />

          {/* 底部导航 */}
          <footer className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="text-[12px] text-gray-400 flex items-center gap-2 font-mono italic">
                <span>LAST UPDATED:</span>
                <span className="text-black dark:text-white font-bold not-italic">
                  {format(new Date(post.updatedAt), "yyyy.MM.dd", {
                    locale: zhCN,
                  })}
                </span>
              </div>
              <Link
                href="/"
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold hover:opacity-80 transition-opacity uppercase tracking-widest"
              >
                Back to Home
              </Link>
            </div>
          </footer>
        </div>
      </PublicLayout>
    </>
  );
}
