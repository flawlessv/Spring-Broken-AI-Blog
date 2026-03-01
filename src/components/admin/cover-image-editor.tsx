"use client";

import { useState } from "react";
import { ImageIcon, ExternalLink, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface CoverImageEditorProps {
  postId: string;
  currentUrl: string | null;
  onUpdate: () => void;
}

export default function CoverImageEditor({
  postId,
  currentUrl,
  onUpdate,
}: CoverImageEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(currentUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const handleSave = async () => {
    if (!postId) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url || null }),
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate();
      } else {
        const error = await response.json();
        alert(`保存失败: ${error.message || "未知错误"}`);
      }
    } catch (error) {
      console.error("保存封面图失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUrl(currentUrl || "");
    setIsEditing(false);
    setPreviewError(false);
  };

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          封面图（远程图床）
        </h3>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            编辑
          </Button>
        )}
      </div>

      {/* 编辑模式 */}
      {isEditing ? (
        <div className="space-y-4">
          {/* URL 输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">封面图 URL</label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="输入图片 URL，例如：https://example.com/image.jpg"
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    保存中
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              支持的图床：新浪图床、腾讯云 COS、阿里云 OSS、GitHub 等
            </p>
          </div>

          {/* 预览 */}
          {url && (
            <div className="space-y-2">
              <label className="text-sm font-medium">预览</label>
              <div className="relative aspect-video w-full max-w-2xl rounded-lg overflow-hidden border bg-muted">
                {!previewError ? (
                  <Image
                    src={url}
                    alt="封面图预览"
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <ImageIcon className="h-12 w-12 mx-auto" />
                      <p className="text-sm">图片加载失败</p>
                      <p className="text-xs">请检查 URL 是否正确</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 查看模式 */
        <div className="space-y-4">
          {currentUrl ? (
            <>
              {/* 封面图预览 */}
              <div className="relative aspect-video w-full max-w-2xl rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={currentUrl}
                  alt="封面图"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* 封面图信息 */}
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate flex-1">
                    {currentUrl.split("/").pop() || "封面图"}
                  </p>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-muted-foreground text-xs break-all">
                  {currentUrl}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                暂无封面图，点击上方&ldquo;编辑&rdquo;按钮添加
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
