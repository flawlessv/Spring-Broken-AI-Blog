"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ImageUploaderProps {
  postId: string;
  type: "content"; // 仅支持内容配图上传，封面图使用远程URL
  onUploadComplete?: () => void;
  maxFiles?: number;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
  uploading: boolean;
  error?: string;
}

export default function ImageUploader({
  postId,
  type,
  onUploadComplete,
  maxFiles = 10, // 默认最多10张内容配图
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    // 限制文件数量
    const filesToUpload = files.slice(0, maxFiles);

    // 验证文件
    const validFiles = filesToUpload.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "文件类型错误",
          description: `${file.name} 不是图片文件`,
          variant: "destructive",
        });
        return false;
      }

      // 检查文件大小（内容配图最大 2MB）
      const maxSize = 2;
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "文件过大",
          description: `${file.name} 超过 ${maxSize}MB 限制`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // 创建预览
    const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      uploading: false,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    // 开始上传
    validFiles.forEach((file, index) => {
      uploadFile(file, uploadingFiles.length + index);
    });
  };

  const uploadFile = async (file: File, index: number) => {
    setUploadingFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], uploading: true };
      return updated;
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("postId", postId);
      formData.append("type", type);

      const response = await fetch("/api/admin/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "上传失败");
      }

      // 上传成功
      setUploadingFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], progress: 100, uploading: false };
        return updated;
      });

      // 延迟移除预览
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
      }, 1000);

      toast({
        title: "上传成功",
        description: `${file.name} 已上传`,
        variant: "default",
      });

      onUploadComplete?.();
    } catch (error) {
      console.error("上传失败:", error);

      setUploadingFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          uploading: false,
          error: error instanceof Error ? error.message : "上传失败",
        };
        return updated;
      });

      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "上传失败",
        variant: "destructive",
      });
    }
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={type === "content"}
          onChange={handleFileSelect}
          className="hidden"
        />

        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">点击上传或拖拽图片到这里</p>
        <p className="text-xs text-muted-foreground">
          支持 JPG、PNG、WebP、GIF，最大 2MB
          {maxFiles > 1 ? `，最多 ${maxFiles} 张` : ""}
        </p>
      </div>

      {/* 上传中的文件列表 */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          {uploadingFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card"
            >
              {/* 预览图 */}
              <div className="relative h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                <Image
                  src={item.preview}
                  alt="预览"
                  fill
                  className="object-cover"
                />
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </p>

                {/* 进度条 */}
                {item.uploading && (
                  <Progress value={item.progress} className="mt-2 h-1" />
                )}

                {/* 错误信息 */}
                {item.error && (
                  <p className="text-xs text-destructive mt-1">{item.error}</p>
                )}
              </div>

              {/* 状态图标 */}
              <div className="flex-shrink-0">
                {item.uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : item.error ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeUploadingFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-5 w-5 rounded-full bg-black dark:bg-white flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-white dark:text-black"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
