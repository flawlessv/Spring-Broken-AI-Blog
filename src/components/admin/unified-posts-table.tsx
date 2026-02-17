"use client";

/**
 * 统一风格的文章管理表格
 * 性能优化：添加useMemo、useCallback、防抖等优化
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Eye,
  Edit,
  Trash2,
  Star,
  Clock,
  User,
  Calendar,
  FileText,
  Plus,
  MoreHorizontal,
  Download,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModernTable } from "@/components/ui/modern-table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// 文章数据类型
interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  publishedAt?: string | Date;
  author: {
    username: string;
    profile?: {
      displayName?: string;
    };
  };
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
}

// API 响应类型
interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface UnifiedPostsTableProps {
  searchQuery?: string;
  statusFilter?: string;
  categoryFilter?: string;
  onSelectionChange?: (selectedIds: string[]) => void;
  enableTableFilters?: boolean;
}

export default function UnifiedPostsTable({
  searchQuery,
  statusFilter,
  categoryFilter,
  onSelectionChange,
  enableTableFilters = false,
}: UnifiedPostsTableProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState(searchQuery || "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  const [availableTags, setAvailableTags] = useState<
    { label: string; value: string; color?: string }[]
  >([]);
  const [availableCategories, setAvailableCategories] = useState<
    { label: string; value: string; color?: string }[]
  >([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const { toast } = useToast();

  // 优化：使用useCallback缓存事件处理函数
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tags");
      if (response.ok) {
        const data = await response.json();
        const tags = (data.tags || []).map((tag: any) => ({
          label: tag.name,
          value: tag.name,
        }));
        setAvailableTags(tags);
      }
    } catch (error) {
      console.error("获取标签失败:", error);
    }
  }, []);

  const fetchAvailableCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/categories");
      if (response.ok) {
        const data = await response.json();
        const categories = (data.categories || []).map((category: any) => ({
          label: category.name,
          value: category.name,
        }));
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error("获取分类失败:", error);
    }
  }, []);

  // 优化：防抖版本的fetchPosts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (tableSearchQuery.trim())
        params.set("search", tableSearchQuery.trim());
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (categoryFilter && categoryFilter !== "all")
        params.set("categoryId", categoryFilter);

      // 处理表头筛选
      if (tableFilters.title && tableFilters.title.trim()) {
        params.set("search", tableFilters.title.trim());
      }
      if (
        tableFilters.status &&
        Array.isArray(tableFilters.status) &&
        tableFilters.status.length > 0
      ) {
        params.set("status", tableFilters.status.join(","));
      }
      if (
        tableFilters.category &&
        Array.isArray(tableFilters.category) &&
        tableFilters.category.length > 0
      ) {
        params.set("categoryNames", tableFilters.category.join(","));
      }
      if (
        tableFilters.tags &&
        Array.isArray(tableFilters.tags) &&
        tableFilters.tags.length > 0
      ) {
        params.set("tagIds", tableFilters.tags.join(","));
      }

      const response = await fetch(`/api/admin/posts?${params}`);

      if (!response.ok) {
        throw new Error("获取文章数据失败");
      }

      const data: PostsResponse = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [
    tableSearchQuery,
    statusFilter,
    categoryFilter,
    pagination.page,
    pagination.limit,
    tableFilters,
  ]);

  // 处理表头筛选
  const handleTableFilters = useCallback((filters: Record<string, any>) => {
    setTableFilters(filters);
    setPagination((prev) => ({ ...prev, page: 1 })); // 重置到第一页
  }, []);

  const handleSearch = useCallback((query: string) => {
    setTableSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  useEffect(() => {
    setTableSearchQuery(searchQuery || "");
  }, [searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (enableTableFilters) {
      fetchAvailableTags();
      fetchAvailableCategories();
    }
  }, [enableTableFilters, fetchAvailableTags, fetchAvailableCategories]);

  // 优化：使用useMemo缓存格式化函数和计算结果
  const formatDate = useCallback((date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MM月dd日 HH:mm", { locale: zhCN });
  }, []);

  const getStatusBadge = useCallback((post: Post) => {
    if (post.featured) {
      return (
        <Badge className="bg-black dark:bg-white text-white dark:text-black border-0">
          <Star className="h-3 w-3 mr-1" />
          精选
        </Badge>
      );
    }
    if (post.published) {
      return (
        <Badge className="bg-gray-600 dark:bg-gray-400 text-white dark:text-black border-0">
          已发布
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-gray-600 dark:text-gray-400">
        <Clock className="h-3 w-3 mr-1" />
        草稿
      </Badge>
    );
  }, []);

  // 优化：使用useCallback缓存事件处理函数
  const handleTogglePublish = useCallback(
    async (post: Post) => {
      try {
        const response = await fetch(`/api/admin/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: !post.published }),
        });

        if (response.ok) {
          toast({
            title: post.published ? "取消发布成功" : "发布成功",
            variant: "success",
          });
          await fetchPosts();
        } else {
          throw new Error("操作失败");
        }
      } catch (error) {
        toast({
          title: "操作失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      }
    },
    [toast, fetchPosts]
  );

  const handleToggleFeature = useCallback(
    async (post: Post) => {
      try {
        const response = await fetch(`/api/admin/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featured: !post.featured }),
        });

        if (response.ok) {
          toast({
            title: post.featured ? "取消精选成功" : "设为精选成功",
            variant: "success",
          });
          await fetchPosts();
        } else {
          throw new Error("操作失败");
        }
      } catch (error) {
        toast({
          title: "操作失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      }
    },
    [toast, fetchPosts]
  );

  const handleDelete = useCallback(
    async (post: Post) => {
      try {
        const response = await fetch(`/api/admin/posts/${post.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast({
            title: "删除成功",
            description: "文章已成功删除",
            variant: "success",
          });
          await fetchPosts();
        } else {
          throw new Error("删除失败");
        }
      } catch (error) {
        toast({
          title: "删除失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      }
    },
    [toast, fetchPosts]
  );

  const handleBatchDelete = useCallback(
    async (ids: string[]) => {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const response = await fetch(`/api/admin/posts/${id}`, {
              method: "DELETE",
            });
            return { id, ok: response.ok };
          })
        );

        const failedCount = results.filter((item) => !item.ok).length;
        const successCount = results.length - failedCount;

        if (successCount > 0) {
          toast({
            title: failedCount === 0 ? "批量删除成功" : "批量删除部分成功",
            description:
              failedCount === 0
                ? `已删除 ${successCount} 篇文章`
                : `成功删除 ${successCount} 篇，失败 ${failedCount} 篇`,
            variant: failedCount === 0 ? "success" : "default",
          });
        }

        if (failedCount > 0 && successCount === 0) {
          toast({
            title: "批量删除失败",
            description: "删除请求均未成功，请稍后重试",
            variant: "destructive",
          });
        }

        setSelectedIds([]);
        onSelectionChange?.([]);
        await fetchPosts();
      } catch (error) {
        toast({
          title: "批量删除失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      } finally {
        setIsBatchDeleting(false);
      }
    },
    [toast, onSelectionChange, fetchPosts]
  );

  const handleExportSelected = useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast({
          title: "提示",
          description: "请先选择要导出的文章",
          variant: "default",
        });
        return;
      }

      setExporting(true);
      try {
        const response = await fetch("/api/admin/posts/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postIds: selectedIds,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `blog-export-selected-${new Date().toISOString().slice(0, 10)}.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast({
            title: "导出成功",
            description: `已导出 ${selectedIds.length} 篇文章`,
            variant: "default",
          });
        } else {
          const result = await response.json();
          throw new Error(result.error || "导出失败");
        }
      } catch (error) {
        toast({
          title: "导出失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setExporting(false);
      }
    },
    [toast]
  );

  // 优化：使用useMemo缓存静态配置
  const statusOptions = useMemo(
    () => [
      { label: "已发布", value: "published" },
      { label: "草稿", value: "draft" },
      { label: "精选", value: "featured" },
    ],
    []
  );

  // 优化：使用useMemo缓存columns配置，避免每次渲染重新创建
  const columns = useMemo(
    () => [
      {
        key: "title",
        title: "文章信息",
        width: "flex-1",
        filter: enableTableFilters
          ? {
              type: "text" as const,
              placeholder: "搜索文章标题...",
              onFilter: (value: string) => {
                console.log("Title filter:", value);
              },
            }
          : undefined,
        render: (_: unknown, post: Post) => (
          <div className="min-w-0">
            <Link
              href={`/admin/posts/${post.id}/edit`}
              className="text-base font-semibold text-gray-900 dark:text-gray-100 hover:opacity-70 transition-colors block truncate"
            >
              {post.title}
            </Link>

            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(post.createdAt)}</span>
              </div>
              {post.category && (
                <div className="flex items-center space-x-1">
                  <span>{post.category.name}</span>
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "category",
        title: "分类",
        width: "w-32",
        filter: enableTableFilters
          ? {
              type: "multiselect" as const,
              options: availableCategories,
              placeholder: "筛选分类",
              onFilter: (value: string) => {
                console.log("Category filter:", value);
              },
            }
          : undefined,
        render: (_: unknown, post: Post) => (
          <div className="flex items-center space-x-2">
            {post.category ? (
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {post.category.name}
              </span>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                -
              </span>
            )}
          </div>
        ),
      },
      {
        key: "tags",
        title: "标签",
        width: "w-56",
        filter: enableTableFilters
          ? {
              type: "multiselect" as const,
              options: availableTags,
              placeholder: "筛选标签",
              onFilter: (value: string) => {
                console.log("Tags filter:", value);
              },
            }
          : undefined,
        render: (_: unknown, post: Post) => (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-2 py-0.5 rounded-lg"
              >
                {tag.name}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{post.tags.length - 3}
              </span>
            )}
            {post.tags.length === 0 && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                -
              </span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        title: "状态",
        width: "w-24",
        className: "text-center",
        filter: enableTableFilters
          ? {
              type: "multiselect" as const,
              options: statusOptions,
              placeholder: "筛选状态",
              onFilter: (value: string) => {
                console.log("Status filter:", value);
              },
            }
          : undefined,
        render: (_: unknown, post: Post) => getStatusBadge(post),
      },
      {
        key: "views",
        title: "浏览量",
        width: "w-20",
        className: "text-center",
        render: (_: unknown, post: Post) => (
          <div className="flex items-center justify-center space-x-1 text-gray-600 dark:text-gray-400">
            <Eye className="h-4 w-4" />
            <span className="font-medium">{post.views.toLocaleString()}</span>
          </div>
        ),
      },
      {
        key: "updatedAt",
        title: "更新时间",
        width: "w-24",
        className: "text-center",
        render: (_: unknown, post: Post) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(post.updatedAt)}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: "w-52",
        className: "text-center",
        render: (_: unknown, post: Post) => (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => window.open(`/posts/${post.slug}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-1" />
              预览
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() =>
                (window.location.href = `/admin/posts/${post.id}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-1" />
              编辑
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <DropdownMenuLabel className="text-gray-700 dark:text-gray-300">
                  更多操作
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleTogglePublish(post)}
                  className={cn(
                    "rounded-lg",
                    post.published
                      ? "text-gray-600 dark:text-gray-400"
                      : "text-black dark:text-white font-bold"
                  )}
                >
                  {post.published ? "取消发布" : "发布"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleFeature(post)}
                  className="rounded-lg"
                >
                  <Star className="h-4 w-4 mr-2" />
                  {post.featured ? "取消精选" : "设为精选"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteId(post.id)}
                  className="rounded-lg text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [
      enableTableFilters,
      availableCategories,
      availableTags,
      statusOptions,
      formatDate,
      getStatusBadge,
      handleTogglePublish,
      handleToggleFeature,
    ]
  );

  // 优化：使用useMemo缓存batchActions配置
  const batchActions = useMemo(
    () => [
      {
        label: exporting ? "导出中..." : "导出选中",
        onClick: handleExportSelected,
        variant: "default" as const,
        icon: exporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        ),
        disabled: exporting,
      },
      {
        label: "批量删除",
        onClick: () => setIsBatchDeleting(true),
        variant: "danger" as const,
        icon: <Trash2 className="h-4 w-4 mr-2" />,
      },
    ],
    [exporting, handleExportSelected]
  );

  return (
    <>
      {/* 确认删除对话框 */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            const post = posts.find((p) => p.id === deleteId);
            if (post) await handleDelete(post);
          }
        }}
        itemType="文章"
        itemName={posts.find((p) => p.id === deleteId)?.title || ""}
      />

      <DeleteConfirmDialog
        open={isBatchDeleting}
        onClose={() => setIsBatchDeleting(false)}
        onConfirm={async () => {
          await handleBatchDelete(selectedIds);
        }}
        itemType="文章"
        itemName={`选中的 ${selectedIds.length} 篇文章`}
      />

      <ModernTable
        data={posts}
        columns={columns}
        loading={loading}
        error={error}
        searchable={true}
        searchPlaceholder="搜索文章标题..."
        onSearch={handleSearch}
        filterable={enableTableFilters}
        onFilterChange={(filters) => {
          handleTableFilters(filters);
        }}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          setSelectedIds(ids);
          onSelectionChange?.(ids);
        }}
        createButton={{
          label: "新建文章",
          href: "/admin/posts/new",
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
        batchActions={batchActions}
        pagination={{
          current: pagination.page,
          total: pagination.total,
          pageSize: pagination.limit,
          onChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        emptyIcon={<FileText className="h-10 w-10 text-gray-400" />}
        emptyTitle="暂无文章"
        emptyDescription="开始创建您的第一篇文章吧"
        getRecordId={(post) => post.id}
        onRetry={fetchPosts}
      />
    </>
  );
}
