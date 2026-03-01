"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  type?: "avatar" | "cover";
  aspectRatio?: string;
}

/**
 * 简单的图片上传组件
 * 用于头像、个人资料等场景
 */
export default function ImageUpload({
  value,
  onChange,
  type = "avatar",
  aspectRatio = "1:1",
}: ImageUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast({
        title: "文件类型错误",
        description: "请选择图片文件",
        variant: "destructive",
      });
      return;
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // 创建本地预览 URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onChange(dataUrl);

        toast({
          title: "上传成功",
          description: "图片已更新（预览模式）",
          variant: "default",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("上传失败:", error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "上传失败",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative inline-block">
          {/* 图片预览 */}
          <div
            className={`
              relative overflow-hidden rounded-lg border bg-muted
              ${type === "avatar" ? "w-32 h-32" : "w-full max-w-md aspect-video"}
            `}
          >
            <Image src={value} alt="预览" fill className="object-cover" />
          </div>

          {/* 删除按钮 */}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            hover:border-primary hover:bg-muted/50 transition-colors
            ${type === "avatar" ? "w-32 h-32 flex flex-col items-center justify-center" : ""}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {type === "avatar" ? "上传头像" : "点击上传"}
              </p>
            </>
          )}
        </div>
      )}

      {/* 提示文字 */}
      <p className="text-xs text-muted-foreground">
        支持 JPG、PNG、WebP，最大 2MB
      </p>
    </div>
  );
}
