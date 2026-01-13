"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { OptimizedCover } from "@/components/optimized/optimized-image";

interface Post {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  createdAt: Date;
  publishedAt?: Date;
}

interface PostListProps {
  className?: string;
  categorySlug?: string;
  initialPosts?: Post[];
  initialHasMore?: boolean;
}

export default function PostList({
  className = "",
  categorySlug,
  initialPosts = [],
  initialHasMore = true,
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(
    async (pageNum: number) => {
      try {
        if (pageNum > 1) setLoadingMore(true);

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "10",
        });

        if (categorySlug) {
          params.append("category", categorySlug);
        }

        const response = await fetch(`/api/posts?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (pageNum === 1) {
            setPosts(data.posts);
          } else {
            setPosts((prev) => [...prev, ...data.posts]);
          }
          setHasMore(data.pagination.current < data.pagination.pages);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setLoadingMore(false);
      }
    },
    [categorySlug]
  );

  useEffect(() => {
    if (initialPosts.length === 0 && page === 1) {
      fetchPosts(1);
    }
  }, [fetchPosts, initialPosts.length, page]);

  return (
    <div className={`space-y-12 ${className}`}>
      {posts.map((post, index) => (
        <article key={post.id} className="w-full">
          <Link href={`/posts/${post.slug}`} className="group block w-full">
            <div className="relative w-full h-[220px] sm:h-[280px] overflow-hidden bg-gray-100">
              {/* 背景图片 - 使用优化的图片组件 */}
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                <OptimizedCover
                  src={post.coverImage || ""}
                  alt={post.title}
                  className="w-full h-full"
                  priority={index < 2}
                />
                {/* 叠加层：深色渐变保证文字可读性 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"></div>
              </div>

              {/* 内容区域：左下角对齐 */}
              <div className="relative h-full flex flex-col justify-end p-6 sm:p-10 text-white">
                <div className="space-y-3">
                  {/* 日期：全大写，间距拉开 */}
                  <div className="text-[11px] sm:text-[13px] font-bold tracking-[0.2em] uppercase opacity-90">
                    {format(
                      new Date(post.publishedAt || post.createdAt),
                      "MMM dd, yyyy"
                    )}
                  </div>

                  {/* 标题：大且醒目 */}
                  <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold leading-tight drop-shadow-sm">
                    {post.title}
                  </h2>
                </div>
              </div>
            </div>
          </Link>
        </article>
      ))}

      {loadingMore && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-t-black border-r-black/30 border-b-transparent border-l-transparent rounded-full animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
