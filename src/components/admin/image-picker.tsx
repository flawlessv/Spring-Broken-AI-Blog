"use client";

import { useState, useEffect, useCallback } from "react";
import { Image as ImageIcon, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface ImageData {
  id: string;
  filename: string;
  path: string;
  size: number;
  type: "COVER" | "CONTENT";
}

interface PostImages {
  cover: ImageData | null;
  content: ImageData[];
  total: number;
}

interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  postId?: string;
  onInsertImage: (markdown: string) => void;
}

export default function ImagePicker({
  open,
  onClose,
  postId,
  onInsertImage,
}: ImagePickerProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<PostImages | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadImages = useCallback(async () => {
    if (!postId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/images/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error("加载图片失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载图片列表",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [postId, toast]);

  useEffect(() => {
    if (open && postId) {
      loadImages();
    }
  }, [open, postId, loadImages]);

  const handleInsert = (image: ImageData) => {
    const markdown = `![${image.filename}](${image.path})`;
    onInsertImage(markdown);
    toast({
      title: "已插入",
      description: `图片 ${image.filename} 已添加到编辑器`,
      variant: "default",
    });
  };

  const handleCopy = (image: ImageData) => {
    const markdown = `![${image.filename}](${image.path})`;
    navigator.clipboard.writeText(markdown);
    toast({
      title: "已复制",
      description: "Markdown 格式已复制到剪贴板",
      variant: "default",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            文章配图
          </SheetTitle>
          <SheetDescription>
            点击图片快速插入到编辑器，或复制 Markdown 格式
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !postId ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">请先保存文章，然后才能上传图片</p>
            </div>
          ) : !images || images.total === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-2">暂无图片</p>
              <p className="text-xs">前往图片管理页面上传图片</p>
            </div>
          ) : (
            <>
              {/* 封面图 */}
              {images.cover && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">封面图</h3>
                    <Badge variant="secondary">COVER</Badge>
                  </div>
                  <div
                    className="group relative border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleInsert(images.cover!)}
                  >
                    <div className="relative aspect-video bg-muted">
                      <Image
                        src={images.cover.path}
                        alt={images.cover.filename}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-sm font-medium">
                          点击插入
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-background">
                      <p className="text-xs font-medium truncate">
                        {images.cover.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(images.cover.size)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(images.cover!);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* 内容配图 */}
              {images.content.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">内容配图</h3>
                    <Badge variant="secondary">
                      {images.content.length} 张
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {images.content.map((image) => (
                      <div
                        key={image.id}
                        className="group relative border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleInsert(image)}
                      >
                        <div className="relative aspect-square bg-muted">
                          <Image
                            src={image.path}
                            alt={image.filename}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-xs font-medium">
                              点击插入
                            </div>
                          </div>
                        </div>
                        <div className="p-2 bg-background">
                          <p className="text-xs font-medium truncate">
                            {image.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(image.size)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(image);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 提示 */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 <strong>提示：</strong>
                点击图片直接插入到光标位置，或点击复制按钮手动粘贴
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
