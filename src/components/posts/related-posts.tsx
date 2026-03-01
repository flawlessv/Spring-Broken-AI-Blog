"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
}

interface RelatedPostsProps {
  slug: string;
  limit?: number;
}

export default function RelatedPosts({ slug, limit = 3 }: RelatedPostsProps) {
  const [posts, setPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"vector" | "category" | "tags">("category");

  useEffect(() => {
    async function fetchRelatedPosts() {
      try {
        setLoading(true);
        const res = await fetch(`/api/posts/${slug}/related?limit=${limit}`);
        if (!res.ok) throw new Error("获取失败");

        const data = await res.json();
        setPosts((data.posts || []).slice(0, limit));
        setMode(data.mode || "category");
      } catch (error) {
        console.error("获取相关文章失败:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedPosts();
  }, [slug, limit]);

  if (loading) {
    return (
      <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">加载相关文章...</span>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-8 border-t-2 border-black dark:border-white">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black dark:bg-white flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white dark:text-black" />
          </div>
          <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">
            Related Stories
          </h2>
        </div>
        {mode === "vector" && (
          <span className="text-[10px] px-3 py-1 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest rounded-full">
            AI Powered
          </span>
        )}
      </div>

      {/* 文章列表 - 卡片网格化或更简洁的列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}`}
            className="group block p-6 border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300"
          >
            <div className="flex flex-col h-full justify-between">
              <h3 className="text-lg font-bold leading-tight line-clamp-2 mb-4 group-hover:underline decoration-2 underline-offset-4">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">
                <span>Read More</span>
                <ChevronRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
