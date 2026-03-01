"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import FullscreenEditor, { PublishData } from "./fullscreen-editor";

interface NewPostEditorProps {
  mode: "create" | "edit";
  postId?: string;
}

export default function NewPostEditor({ mode, postId }: NewPostEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialPublishData, setInitialPublishData] = useState<
    Partial<PublishData> | undefined
  >();

  const loadPost = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/posts/${postId}`);

      if (!response.ok) {
        throw new Error("加载文章失败");
      }

      const post = await response.json();
      setTitle(post.title);
      setContent(post.content);
      setSlug(post.slug);

      // 保存发布相关的数据
      setInitialPublishData({
        categoryId: post.categoryId || undefined,
        tags: post.tags?.map((tag: any) => tag.id) || [],
        coverImage: post.coverImage || "",
        excerpt: post.excerpt || "",
        published: post.published ?? true,
        featured: post.featured ?? false,
      });
    } catch (error) {
      console.error("加载文章失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载文章内容，请重试",
        variant: "destructive",
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [postId, router, toast]);

  // 加载现有文章数据（编辑模式）
  useEffect(() => {
    if (mode === "edit" && postId) {
      loadPost();
    }
  }, [mode, postId, loadPost]);

  const handleCloseEditor = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "标题不能为空",
        description: "请输入文章标题后再保存",
        variant: "warning",
      });
      return;
    }

    try {
      setIsLoading(true);

      // 生成slug
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const url =
        mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${postId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          content,
          published: false, // 保存为草稿
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存失败");
      }

      toast({
        title: "草稿保存成功",
        description: "文章已保存为草稿",
        variant: "success",
      });
    } catch (error) {
      console.error("保存失败:", error);
      toast({
        title: "保存失败",
        description:
          error instanceof Error ? error.message : "保存失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (publishData: PublishData) => {
    if (!title.trim()) {
      toast({
        title: "标题不能为空",
        description: "请输入文章标题后再发布",
        variant: "warning",
      });
      return;
    }

    try {
      setIsLoading(true);

      // 生成slug
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const url =
        mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${postId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          content,
          excerpt: publishData.excerpt,
          coverImage: publishData.coverImage,
          published: publishData.published,
          featured: publishData.featured,
          categoryId: publishData.categoryId,
          tags: publishData.tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "发布失败");
      }

      // 发布成功后返回列表页
      toast({
        title: "发布成功",
        description: `文章已${publishData.published ? "发布" : "保存为草稿"}`,
        variant: "success",
      });
      router.push("/admin/posts");
    } catch (error) {
      console.error("发布失败:", error);
      toast({
        title: "发布失败",
        description:
          error instanceof Error ? error.message : "发布失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && mode === "edit") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-muted-foreground">正在加载文章...</div>
      </div>
    );
  }

  // 直接渲染全屏编辑器，不再有欢迎页面
  return (
    <FullscreenEditor
      title={title}
      content={content}
      onTitleChange={setTitle}
      onContentChange={setContent}
      onClose={handleCloseEditor}
      onSave={handleSave}
      onPublish={handlePublish}
      isLoading={isLoading}
      mode={mode}
      initialPublishData={initialPublishData}
      postId={postId}
      postSlug={slug}
    />
  );
}
