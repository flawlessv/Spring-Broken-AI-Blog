"use client";

import PublicLayout from "@/components/layout/public-layout";
import AdminProfileCard from "@/components/profile/admin-profile-card";
import PostList from "@/components/posts/post-list";
import { SeasonalBackground } from "@/components/home/seasonal-background";
import { FlowerClick } from "@/components/home/flower-click";

export default function Home() {
  return (
    <>
      {/* 季节背景效果（使用seasonalfx库） */}
      <SeasonalBackground />

      {/* 点击小红花效果 */}
      <FlowerClick />

      <PublicLayout sidebar={<AdminProfileCard />}>
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          {/* 桌面端：个人信息在左侧 */}
          <aside className="hidden lg:block lg:col-span-3 order-1 lg:order-none lg:pl-20">
            <AdminProfileCard />
          </aside>

          {/* 文章列表 */}
          <main className="lg:col-span-9 order-2 lg:order-none">
            <PostList />
          </main>
        </div>
      </PublicLayout>
    </>
  );
}
