"use client";

/**
 * 分类创建/编辑对话框组件
 *
 * 提供分类的创建和编辑功能
 */

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// 表单验证 schema
const categorySchema = z.object({
  name: z
    .string()
    .min(1, "分类名称不能为空")
    .max(50, "分类名称不能超过50个字符"),
  slug: z
    .string()
    .min(1, "URL slug不能为空")
    .max(50, "URL slug不能超过50个字符"),
  description: z.string().max(200, "描述不能超过200个字符").optional(),
});

type CategoryFormInput = z.input<typeof categorySchema>;
type CategoryFormOutput = z.output<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  } | null;
}

export default function CategoryDialog({
  open,
  onClose,
  category,
}: CategoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!category;

  const form = useForm<CategoryFormInput, any, CategoryFormOutput>({
    resolver: zodResolver<CategoryFormInput, any, CategoryFormOutput>(
      categorySchema
    ),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const { watch, setValue, reset } = form;
  const name = watch("name");

  // 自动生成 slug
  useEffect(() => {
    if (!isEdit && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setValue("slug", slug);
    }
  }, [name, isEdit, setValue]);

  // 当对话框打开时，填充编辑数据
  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          slug: category.slug,
          description: category.description || "",
        });
      } else {
        reset({
          name: "",
          slug: "",
          description: "",
        });
      }
    }
  }, [open, category, reset]);

  const onSubmit: SubmitHandler<CategoryFormOutput> = async (data) => {
    try {
      setIsLoading(true);

      const url = isEdit
        ? `/api/admin/categories/${category.id}`
        : "/api/admin/categories";

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "操作失败");
      }

      // 成功后关闭对话框并刷新页面
      onClose();
    } catch (error) {
      console.error("操作失败:", error);
      alert(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑分类" : "新建分类"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 分类名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分类名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入分类名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="url-slug" {...field} />
                  </FormControl>
                  <FormDescription>
                    用于URL路径，会自动根据分类名称生成
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入分类描述..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 按钮 */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "更新" : "创建"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
