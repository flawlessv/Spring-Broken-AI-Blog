import { Metadata } from "next";
import AdminLayout from "@/components/admin/clean-admin-layout";
import ImageManager from "@/components/admin/image-manager";

export const metadata: Metadata = {
  title: "图片管理 - Spring Broken AI Blog",
  description: "以文章为粒度管理博客图片",
};

export default function ImagesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">图片管理</h1>
          <p className="text-muted-foreground">
            以文章为粒度管理封面图和内容配图
          </p>
        </div>
        <ImageManager />
      </div>
    </AdminLayout>
  );
}
