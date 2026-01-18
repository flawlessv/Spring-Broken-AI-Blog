"use client";

import { useState, useEffect } from "react";
import PublicLayout from "@/components/layout/public-layout";
import AdminProfileCard from "@/components/profile/admin-profile-card";
import PostList from "@/components/posts/post-list";
import { SeasonalBackground } from "@/components/home/seasonal-background";
import { FlowerClick } from "@/components/home/flower-click";
import { SimpleLoading } from "@/components/ui/loading";

export default function Home() {
  const [profileData, setProfileData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [postsData, setPostsData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 并行请求所有数据
        const [profileRes, categoriesRes, postsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/categories"),
          fetch("/api/posts?page=1&limit=10"),
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setProfileData(profile.profile);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }

        if (postsRes.ok) {
          const data = await postsRes.json();
          setPostsData(data.posts);
          // 判断是否还有更多数据
          setHasMore(data.pagination.current < data.pagination.pages);
        }
      } catch (error) {
        console.error("获取数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <>
        <SeasonalBackground />
        <FlowerClick />
        <PublicLayout>
          <SimpleLoading />
        </PublicLayout>
      </>
    );
  }

  return (
    <>
      {/* 季节背景效果（使用seasonalfx库） */}
      <SeasonalBackground />

      {/* 点击小红花效果 */}
      <FlowerClick />

      <PublicLayout
        sidebar={
          profileData && (
            <AdminProfileCard profile={profileData} categories={categories} />
          )
        }
      >
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-16 lg:ml-32">
          {/* 桌面端：个人信息在左侧 */}
          <aside className="hidden lg:block order-1 lg:order-none pt-4">
            <AdminProfileCard profile={profileData} categories={categories} />
          </aside>

          {/* 文章列表 */}
          <main className="order-2 lg:order-none max-w-2xl">
            <PostList initialPosts={postsData} initialHasMore={hasMore} />
          </main>
        </div>
      </PublicLayout>
    </>
  );
}
