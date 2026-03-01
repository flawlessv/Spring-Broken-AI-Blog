"use client";

/**
 * 统一风格的标签管理表格
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Edit, Trash2, Tags, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModernTable } from "@/components/ui/modern-table";
import { useToast } from "@/hooks/use-toast";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  description?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    posts: number;
  };
}

interface TagApiItem {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  color?: unknown;
  description?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  stats?: {
    totalPosts?: unknown;
  };
}

interface TagsResponse {
  tags?: TagApiItem[];
}

interface UnifiedTagsTableProps {
  onEdit?: (tag: Tag) => void;
  onCreate?: () => void;
}

function normalizeTag(tag: TagApiItem): Tag | null {
  if (
    typeof tag.id !== "string" ||
    typeof tag.name !== "string" ||
    typeof tag.slug !== "string"
  ) {
    return null;
  }

  if (tag.color !== undefined && typeof tag.color !== "string") {
    return null;
  }

  if (tag.description !== undefined && typeof tag.description !== "string") {
    return null;
  }

  const createdAt = tag.createdAt;
  const updatedAt = tag.updatedAt;
  const validCreatedAt =
    typeof createdAt === "string" || createdAt instanceof Date;
  const validUpdatedAt =
    typeof updatedAt === "string" || updatedAt instanceof Date;

  if (!validCreatedAt || !validUpdatedAt) {
    return null;
  }

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    description: tag.description,
    createdAt,
    updatedAt,
    _count: {
      posts:
        typeof tag.stats?.totalPosts === "number" ? tag.stats.totalPosts : 0,
    },
  };
}

export default function UnifiedTagsTable({
  onEdit,
  onCreate,
}: UnifiedTagsTableProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const { toast } = useToast();

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tags?includeStats=true");

      if (!response.ok) {
        throw new Error("获取标签数据失败");
      }

      const data = (await response.json()) as TagsResponse;
      setTags(
        (data.tags || [])
          .map(normalizeTag)
          .filter((tag): tag is Tag => tag !== null)
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "yyyy年MM月dd日", { locale: zhCN });
  };

  const handleDelete = async (tag: Tag) => {
    try {
      const response = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "删除成功",
          description: `标签"${tag.name}"已成功删除`,
          variant: "success",
        });
        await fetchTags();
      } else {
        throw new Error("删除失败");
      }
    } catch {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/admin/tags/${id}`, { method: "DELETE" }))
      );

      toast({
        title: "批量删除成功",
        description: `已删除 ${ids.length} 个标签`,
        variant: "success",
      });

      setSelectedIds([]);
      await fetchTags();
    } catch {
      toast({
        title: "批量删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const columns = [
    {
      key: "name",
      title: "标签",
      width: "w-48",
      render: (_: unknown, tag: Tag) => (
        <Badge variant="secondary" className="font-medium rounded-lg">
          {tag.name}
        </Badge>
      ),
    },
    {
      key: "slug",
      title: "URL",
      width: "flex-1",
      render: (_: unknown, tag: Tag) => (
        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-600 dark:text-gray-300">
          {tag.slug}
        </code>
      ),
    },
    {
      key: "posts",
      title: "文章数量",
      width: "w-32",
      className: "text-center",
      render: (_: unknown, tag: Tag) => (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <FileText className="h-4 w-4 text-black dark:text-white" />
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {tag._count?.posts || 0} 篇
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: "w-40",
      className: "text-center",
      render: (_: unknown, tag: Tag) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(tag.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "w-24",
      className: "text-center",
      render: (_: unknown, tag: Tag) => (
        <div className="flex items-center justify-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onEdit?.(tag)}
            title="编辑"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => setDeleteTag(tag)}
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const batchActions = [
    {
      label: "批量删除",
      onClick: () => setIsBatchDeleting(true),
      variant: "danger" as const,
      icon: <Trash2 className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <>
      <DeleteConfirmDialog
        open={!!deleteTag}
        onClose={() => setDeleteTag(null)}
        onConfirm={async () => {
          if (deleteTag) await handleDelete(deleteTag);
        }}
        itemType="标签"
        itemName={deleteTag?.name || ""}
      />

      <DeleteConfirmDialog
        open={isBatchDeleting}
        onClose={() => setIsBatchDeleting(false)}
        onConfirm={async () => {
          await handleBatchDelete(selectedIds);
        }}
        itemType="标签"
        itemName={`选中的 ${selectedIds.length} 个标签`}
      />

      <ModernTable<Tag>
        data={tags}
        columns={columns}
        loading={loading}
        error={error}
        searchable={true}
        searchPlaceholder="搜索标签名称..."
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        createButton={{
          label: "新建标签",
          onClick: onCreate,
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
        batchActions={batchActions}
        emptyIcon={<Tags className="h-10 w-10 text-gray-400" />}
        emptyTitle="暂无标签"
        emptyDescription="创建第一个标签来组织您的内容"
        getRecordId={(tag) => tag.id}
        onRetry={fetchTags}
      />
    </>
  );
}
