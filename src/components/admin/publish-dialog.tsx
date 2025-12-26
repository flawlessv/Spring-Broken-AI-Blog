"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Send,
  Image as ImageIcon,
  Tag,
  Folder,
  Star,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PublishData } from "./fullscreen-editor";

const publishSchema = z.object({
  categoryId: z.string().optional(),
  coverImage: z
    .string()
    .url("请输入有效的图片URL")
    .optional()
    .or(z.literal("")),
  excerpt: z.string().max(500, "摘要不能超过500个字符").optional(),
  published: z.boolean(),
  featured: z.boolean(),
});

type PublishFormData = z.infer<typeof publishSchema>;

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (data: PublishData) => void;
  mode?: "create" | "edit";
  initialData?: Partial<PublishData>;
}

export default function PublishDialog({
  open,
  onOpenChange,
  onPublish,
  mode = "create",
  initialData,
}: PublishDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const form = useForm<PublishFormData>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      categoryId: undefined,
      coverImage: "",
      excerpt: "",
      published: true,
      featured: false,
    },
  });

  // 获取分类数据
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("获取分类失败:", error);
      // 使用默认分类
      setCategories([
        { id: "tech", name: "技术", color: "#3B82F6" },
        { id: "life", name: "生活", color: "#10B981" },
        { id: "thoughts", name: "随想", color: "#8B5CF6" },
      ]);
    }
  };

  // 获取标签数据
  const fetchTags = async () => {
    try {
      const response = await fetch("/api/admin/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags);
      }
    } catch (error) {
      console.error("获取标签失败:", error);
      // 使用默认标签
      setTags([
        { id: "react", name: "React", color: "#61DAFB" },
        { id: "typescript", name: "TypeScript", color: "#3178C6" },
        { id: "nextjs", name: "Next.js", color: "#000000" },
        { id: "javascript", name: "JavaScript", color: "#F7DF1E" },
        { id: "css", name: "CSS", color: "#1572B6" },
        { id: "nodejs", name: "Node.js", color: "#339933" },
      ]);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchTags();

      // 设置初始数据
      if (initialData) {
        form.reset({
          categoryId: initialData.categoryId,
          coverImage: initialData.coverImage || "",
          excerpt: initialData.excerpt || "",
          published: initialData.published ?? true,
          featured: initialData.featured ?? false,
        });
        setSelectedTags(initialData.tags || []);
      } else {
        // 如果没有初始数据，重置为默认值
        form.reset({
          categoryId: undefined,
          coverImage: "",
          excerpt: "",
          published: true,
          featured: false,
        });
        setSelectedTags([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const handleSubmit = async (data: PublishFormData) => {
    setIsLoading(true);

    try {
      await onPublish({
        ...data,
        tags: selectedTags,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>{mode === "create" ? "发布文章" : "更新文章"}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 分类选择 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Folder className="h-4 w-4" />
                  <span>分类</span>
                </div>
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? undefined : v)
                        }
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">无分类</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center space-x-2">
                                {category.color && (
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                )}
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 发布设置 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Star className="h-4 w-4" />
                  <span>设置</span>
                </div>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-sm">立即发布</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="text-sm">设为精选</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 标签选择 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                <span>标签</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="flex items-center space-x-2 text-sm cursor-pointer"
                    >
                      {tag.color && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span>{tag.name}</span>
                    </label>
                  </div>
                ))}
              </div>

              {/* 已选标签显示 */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tagId}
                        variant="secondary"
                        className="text-xs"
                        style={
                          tag.color
                            ? {
                                backgroundColor: tag.color + "20",
                                borderColor: tag.color,
                              }
                            : {}
                        }
                      >
                        {tag.name}
                        <button
                          type="button"
                          className="ml-1 hover:text-red-500"
                          onClick={() => handleTagToggle(tagId)}
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 封面图片 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4" />
                <span>封面图片</span>
              </div>
              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="图片 URL (可选)" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      输入封面图片的 URL 地址，用于文章展示
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 文章摘要 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                <span>文章摘要</span>
              </div>
              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="输入文章摘要 (可选)..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      用于文章列表展示和SEO优化，不超过500字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {mode === "create" ? "发布文章" : "更新文章"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
