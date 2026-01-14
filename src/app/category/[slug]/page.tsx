"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import AdminProfileCard from "@/components/profile/admin-profile-card";
import PostList from "@/components/posts/post-list";
import { SimpleLoading } from "@/components/ui/loading";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [profileData, setProfileData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, categoriesRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/categories"),
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setProfileData(profile.profile);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
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
    return <SimpleLoading />;
  }

  return (
    <PublicLayout
      sidebar={
        profileData && (
          <AdminProfileCard profile={profileData} categories={categories} />
        )
      }
    >
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        {/* 个人信息卡片 */}
        <aside className="lg:col-span-3 order-1 lg:order-none lg:pl-8">
          <AdminProfileCard profile={profileData} categories={categories} />
        </aside>

        {/* 分类文章列表 */}
        <main className="lg:col-span-9 order-2 lg:order-none">
          <PostList categorySlug={slug} />
        </main>
      </div>
    </PublicLayout>
  );
}
