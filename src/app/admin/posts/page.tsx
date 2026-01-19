"use client";

/**
 * 文章管理页面
 *
 * 提供文章的创建、编辑、删除和批量操作功能
 * 包括筛选、搜索和分页功能
 */

import { useState, useRef } from "react";
import CleanAdminLayout from "@/components/admin/clean-admin-layout";
import UnifiedPostsTable from "@/components/admin/unified-posts-table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Loader2,
  Upload,
  FolderUp,
  FileUp,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PostsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportingAll, setExportingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 导出所有文章
  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const response = await fetch("/api/admin/posts/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exportAll: true,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `blog-export-all-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "导出成功",
          description: "已导出所有文章",
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
      setExportingAll(false);
    }
  };

  /**
   * 从文件列表中提取文件及其相对路径
   *
   * 原理：
   * 当用户选择文件夹时，File 对象的 webkitRelativePath 属性会包含相对路径
   * 我们需要将这些路径信息一起发送到后端
   */
  const extractFilesWithPaths = (
    files: FileList
  ): { files: File[]; paths: string[] } => {
    const fileArray: File[] = [];
    const paths: string[] = [];

    Array.from(files).forEach((file) => {
      fileArray.push(file);
      // webkitRelativePath 在选择文件夹时会有值，选择单个文件时为空
      const relativePath =
        (file as { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;
      paths.push(relativePath);
    });

    return { files: fileArray, paths };
  };

  /**
   * 导入 Markdown 文件
   *
   * 支持：
   * 1. 单个或多个文件上传
   * 2. 整个文件夹上传（递归遍历所有子文件夹）
   */
  const handleImportFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setImporting(true);
    try {
      const { files: fileArray, paths } = extractFilesWithPaths(files);

      const formData = new FormData();

      // 添加文件
      fileArray.forEach((file) => {
        formData.append("files", file);
      });

      // 添加路径信息
      paths.forEach((path, index) => {
        formData.append(`filePaths[${index}]`, path);
      });

      const response = await fetch("/api/admin/posts/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        // 构建详细的成功消息
        let description = result.message;
        if (result.results.fileStructure) {
          const { totalFiles, markdownFiles, directories, maxDepth } =
            result.results.fileStructure;
          description += `\n\n文件结构：\n`;
          description += `- 总文件数: ${totalFiles}\n`;
          description += `- Markdown 文件: ${markdownFiles}\n`;
          if (directories > 0) {
            description += `- 目录数: ${directories}\n`;
            description += `- 最大深度: ${maxDepth}`;
          }
        }

        // 显示结果
        toast({
          title: "导入完成",
          description: result.message,
        });

        // 如果有跳过的文件，显示详细信息
        if (result.results.errors.length > 0) {
          // 只显示前 5 个错误
          const errorPreview = result.results.errors.slice(0, 5).join("\n");

          toast({
            title: `跳过了 ${result.results.skipped} 个文件`,
            description: `${errorPreview}${result.results.errors.length > 5 ? `\n...还有 ${result.results.errors.length - 5} 个` : ""}`,
            variant: "destructive",
          });
        }
      } else {
        const result = await response.json();
        throw new Error(result.error || "导入失败");
      }
    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      // 重置文件输入框
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 点击导入文件按钮
  const handleImportFilesClick = () => {
    fileInputRef.current?.click();
  };

  // 点击导入文件夹按钮
  const handleImportFolderClick = () => {
    folderInputRef.current?.click();
  };

  // 文件选择改变
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleImportFiles(files);
    }
  };

  // 文件夹选择改变
  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleImportFiles(files);
    }
  };

  return (
    <CleanAdminLayout>
      <div className="space-y-4">
        {/* 页面标题和操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              文章管理
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* 导入hover菜单 */}
            <div className="relative group">
              <Button
                variant="outline"
                disabled={importing}
                className="flex items-center"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    导入文章
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  onClick={handleImportFilesClick}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  导入文件
                </button>
                <button
                  onClick={handleImportFolderClick}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <FolderUp className="mr-2 h-4 w-4" />
                  导入文件夹
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleExportAll}
              disabled={exportingAll}
              className="flex items-center"
            >
              {exportingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  导出所有文章
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 文章列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <UnifiedPostsTable
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            onSelectionChange={setSelectedIds}
            enableTableFilters={true}
          />
        </div>

        {/* 隐藏的文件输入框 - 用于选择多个文件 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".md,.markdown"
          multiple
          className="hidden"
        />

        {/* 隐藏的文件夹输入框 - 用于选择整个文件夹 */}
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderChange}
          accept=".md,.markdown"
          // @ts-expect-error - webkitdirectory 是非标准属性，但所有主流浏览器都支持
          webkitdirectory=""
          directory=""
          className="hidden"
        />
      </div>
    </CleanAdminLayout>
  );
}
