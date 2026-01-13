"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ImageUploader from "./image-uploader";
import ImageGrid from "./image-grid";
import Image from "next/image";

interface Post {
  id: string;
  title: string;
  slug: string;
}

interface ImageData {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  type: "COVER" | "CONTENT";
  isVirtual?: boolean; // 标记是否为虚拟记录（从文章内容或封面图衍生）
}

interface PostImages {
  post: {
    id: string;
    slug: string;
    title: string;
  };
  cover: ImageData | null;
  content: ImageData[];
  total: number;
}

export default function ImageManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postImages, setPostImages] = useState<PostImages | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // 加载文章列表
  useEffect(() => {
    loadPosts();
  }, []);

  // 当选中文章时加载图片
  useEffect(() => {
    if (selectedPostId) {
      loadPostImages(selectedPostId);
    }
  }, [selectedPostId]);

  const loadPosts = async () => {
    try {
      setIsLoadingPosts(true);
      const response = await fetch("/api/admin/posts/list");
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);

        // 自动选中第一篇文章
        if (data.posts.length > 0 && !selectedPostId) {
          setSelectedPostId(data.posts[0].id);
        }
      }
    } catch (error) {
      console.error("加载文章列表失败:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const loadPostImages = async (postId: string) => {
    try {
      setIsLoadingImages(true);
      const response = await fetch(`/api/admin/images/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPostImages(data);
      }
    } catch (error) {
      console.error("加载图片列表失败:", error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleUploadComplete = () => {
    if (selectedPostId) {
      loadPostImages(selectedPostId);
    }
  };

  const handleDeleteImage = () => {
    if (selectedPostId) {
      loadPostImages(selectedPostId);
    }
  };

  const handleRenameImage = () => {
    if (selectedPostId) {
      loadPostImages(selectedPostId);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 左侧：文章列表 */}
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文章..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 文章列表 */}
          <div className="border rounded-lg overflow-hidden">
            {isLoadingPosts ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无文章</p>
              </div>
            ) : (
              <div className="divide-y max-h-[calc(100vh-280px)] overflow-y-auto">
                {filteredPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className={`
                      w-full text-left p-4 hover:bg-muted/50 transition-colors
                      ${selectedPostId === post.id ? "bg-muted" : ""}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {post.slug}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧：图片管理 */}
      <div className="lg:col-span-8 xl:col-span-9">
        {!selectedPostId ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">请选择一篇文章来管理图片</p>
          </div>
        ) : isLoadingImages ? (
          <div className="border rounded-lg p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : postImages ? (
          <div className="space-y-6">
            {/* 文章标题 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{postImages.post.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {postImages.post.slug}
                </p>
              </div>
              <Badge variant="secondary">共 {postImages.total} 张图片</Badge>
            </div>

            {/* 封面图区块 */}
            <div className="border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  封面图
                </h3>
              </div>

              {postImages.cover ? (
                <div className="space-y-4">
                  {/* 封面图预览 */}
                  <div className="relative aspect-video w-full max-w-2xl rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={postImages.cover.path}
                      alt="封面图"
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* 封面图信息 */}
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{postImages.cover.filename}</p>
                      <p className="text-muted-foreground">
                        {(postImages.cover.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteImage()}
                    >
                      更换封面
                    </Button>
                  </div>

                  {/* 上传新封面（替换） */}
                  <details className="border rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-sm">
                      上传新封面（替换当前封面）
                    </summary>
                    <div className="mt-4">
                      <ImageUploader
                        postId={postImages.post.id}
                        type="cover"
                        onUploadComplete={handleUploadComplete}
                      />
                    </div>
                  </details>
                </div>
              ) : (
                <ImageUploader
                  postId={postImages.post.id}
                  type="cover"
                  onUploadComplete={handleUploadComplete}
                />
              )}
            </div>

            {/* 内容配图区块 */}
            <div className="border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  内容配图
                  {postImages.content.length > 0 && (
                    <Badge variant="outline">
                      {postImages.content.length} 张
                    </Badge>
                  )}
                </h3>
              </div>

              {/* 上传区域 */}
              <div className="mb-6">
                <ImageUploader
                  postId={postImages.post.id}
                  type="content"
                  onUploadComplete={handleUploadComplete}
                  maxFiles={10}
                />
              </div>

              {/* 图片网格 */}
              {postImages.content.length > 0 && (
                <div className="pt-4 border-t">
                  <ImageGrid
                    images={postImages.content}
                    onDelete={handleDeleteImage}
                    onRename={handleRenameImage}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
