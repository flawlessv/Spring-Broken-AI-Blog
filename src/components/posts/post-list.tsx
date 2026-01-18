"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

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
  const observerTarget = useRef<HTMLDivElement>(null);

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

  // 监听 initialPosts 变化，重置状态
  useEffect(() => {
    setPosts(initialPosts);
    setPage(1);
    setHasMore(initialHasMore);
    setLoadingMore(false);
  }, [initialPosts, initialHasMore, categorySlug]);

  // 无限滚动观察器
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, page, fetchPosts]);

  useEffect(() => {
    if (initialPosts.length === 0 && page === 1) {
      fetchPosts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`space-y-12 ${className}`}>
      {posts.length === 0 && !loadingMore ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无文章</h3>
          <p className="text-gray-500 text-sm">
            {categorySlug ? "该分类下还没有发布任何文章" : "还没有发布任何文章"}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post, index) => (
            <article key={post.id} className="w-full">
              <Link href={`/posts/${post.slug}`} className="group block w-full">
                <div className="relative w-full h-[220px] sm:h-[280px] overflow-hidden bg-gray-100">
                  {/* 背景图片 - 直接使用 Next.js Image */}
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    {post.coverImage ? (
                      <>
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                          priority={index === 0}
                          className="object-cover"
                          unoptimized={post.coverImage.startsWith("http")}
                        />
                        {/* 叠加层：深色渐变保证文字可读性 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"></div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300"></div>
                    )}
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

          {/* 观察目标 - 用于触发无限滚动 */}
          <div ref={observerTarget} className="h-4" />

          {loadingMore && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-t-black border-r-black/30 border-b-transparent border-l-transparent rounded-full animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              已经到底啦
            </div>
          )}
        </>
      )}
    </div>
  );
}
