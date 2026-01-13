"use client";

import { useState } from "react";
import { Trash2, Edit2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ImageData {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  type: "COVER" | "CONTENT";
  isVirtual?: boolean; // 标记是否为虚拟记录（从文章内容或封面图衍生）
}

interface ImageGridProps {
  images: ImageData[];
  onDelete?: (imageId: string) => void;
  onRename?: (imageId: string, newFilename: string) => void;
}

export default function ImageGrid({
  images,
  onDelete,
  onRename,
}: ImageGridProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [newFilename, setNewFilename] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleCopyUrl = (
    path: string,
    filename: string,
    type: "url" | "markdown"
  ) => {
    const url = path;
    const text = type === "markdown" ? `![${filename}](${url})` : url;

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "已复制到剪贴板",
        description:
          type === "markdown"
            ? `Markdown 格式：![${filename}](${url})`
            : `图片路径：${url}`,
        variant: "default",
      });
    });
  };

  const handleDeleteClick = (image: ImageData) => {
    setSelectedImage(image);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (image: ImageData) => {
    if (image.type === "COVER") {
      toast({
        title: "无法重命名",
        description: "封面图不支持重命名",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(image);
    setNewFilename(image.filename);
    setRenameDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/images/image/${selectedImage.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("删除失败");
      }

      toast({
        title: "删除成功",
        description: "图片已删除",
        variant: "default",
      });

      onDelete?.(selectedImage.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRename = async () => {
    if (!selectedImage || !newFilename) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/images/image/${selectedImage.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newFilename }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "重命名失败");
      }

      toast({
        title: "重命名成功",
        description: "图片已重命名",
        variant: "default",
      });

      onRename?.(selectedImage.id, newFilename);
      setRenameDialogOpen(false);
    } catch (error) {
      toast({
        title: "重命名失败",
        description: error instanceof Error ? error.message : "重命名失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">暂无图片</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
          >
            {/* 图片预览 */}
            <div className="relative aspect-square bg-muted">
              <Image
                src={image.path}
                alt={image.filename}
                fill
                className="object-cover"
              />

              {/* 悬浮操作按钮 */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      handleCopyUrl(image.path, image.filename, "markdown")
                    }
                    title="复制 Markdown 格式"
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Markdown
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      handleCopyUrl(image.path, image.filename, "url")
                    }
                    title="复制图片路径"
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    URL
                  </Button>
                </div>
                <div className="flex gap-2">
                  {image.type !== "COVER" && !image.isVirtual && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRenameClick(image)}
                      title="重命名"
                      className="text-xs"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  {!image.isVirtual ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(image)}
                      title="删除"
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      title="虚拟图片无法删除（请在文章编辑器中删除）"
                      className="text-xs opacity-50 cursor-not-allowed"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* 图片信息 */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p
                  className="text-sm font-medium truncate"
                  title={image.filename}
                >
                  {image.filename}
                </p>
                {image.isVirtual && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded">
                    虚拟
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(image.size)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除图片 &quot;{selectedImage?.filename}&quot;
              吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isLoading}
            >
              {isLoading ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名图片</DialogTitle>
            <DialogDescription>输入新的文件名（包含扩展名）</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="例如：new-image.jpg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={confirmRename}
              disabled={isLoading || !newFilename}
            >
              {isLoading ? "重命名中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
