"use client";

/**
 * 统一的现代化表格组件
 *
 * 提供卡片式设计，支持搜索、选择、操作等功能
 */

import { type ComponentProps, type ReactNode, useState } from "react";
import Link from "next/link";
import { Search, Plus, MoreHorizontal, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableFilter,
  type TableFilterOption,
  type TableFilterType,
  type TableFilterValue,
} from "@/components/ui/table-filter";
import { Card, CardContent } from "@/components/ui/card";
import { AdminLoading } from "@/components/ui/loading";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type ActionVariant = "default" | "danger" | "warning" | "success";
type TableFilters = Record<string, TableFilterValue>;

interface ColumnFilter {
  type: TableFilterType;
  options?: TableFilterOption[];
  placeholder?: string;
}

interface ModernTableColumn<T> {
  key: string;
  title: string;
  width?: string;
  className?: string;
  render?: (value: unknown, record: T) => ReactNode;
  filter?: ColumnFilter;
}

interface ModernTableAction<T> {
  key: string;
  label: string | ((record: T) => string);
  icon?: ReactNode;
  onClick: (record: T) => void;
  className?: string;
  variant?: ActionVariant | ((record: T) => ActionVariant);
}

interface ModernTableProps<T> {
  // 数据
  data: T[];
  columns: ModernTableColumn<T>[];

  // 状态
  loading?: boolean;
  error?: string | null;

  // 搜索
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // 筛选
  filterable?: boolean;
  onFilterChange?: (filters: TableFilters) => void;

  // 选择
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;

  // 操作
  actions?: ModernTableAction<T>[];

  // 新建按钮
  createButton?: {
    label: string;
    href?: ComponentProps<typeof Link>["href"];
    onClick?: () => void;
    icon?: ReactNode;
  };

  // 批量操作
  batchActions?: Array<{
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?: "default" | "danger";
    icon?: ReactNode;
    disabled?: boolean;
  }>;

  // 分页
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
  };

  // 样式
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;

  // 获取记录ID的函数
  getRecordId: (record: T) => string;

  // 重试函数
  onRetry?: () => void;
}

export function ModernTable<T = unknown>({
  data,
  columns,
  loading = false,
  error = null,
  searchable = true,
  searchPlaceholder = "搜索...",
  onSearch,
  filterable = false,
  onFilterChange,
  selectable = true,
  selectedIds = [],
  onSelectionChange,
  actions = [],
  createButton,
  batchActions = [],
  pagination,
  emptyIcon,
  emptyTitle = "暂无数据",
  emptyDescription = "没有找到相关数据",
  getRecordId,
  onRetry,
}: ModernTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteRecord, setDeleteRecord] = useState<T | null>(null);
  const [deleteAction, setDeleteAction] = useState<ModernTableAction<T> | null>(
    null
  );
  const [filters, setFilters] = useState<TableFilters>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFilterChange = (columnKey: string, value: TableFilterValue) => {
    const newFilters = { ...filters, [columnKey]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilter = (columnKey: string) => {
    const newFilters = { ...filters };
    delete newFilters[columnKey];
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const openPopover = (columnKey: string) => {
    setOpenPopovers((prev) => ({ ...prev, [columnKey]: true }));
  };

  const closePopover = (columnKey: string) => {
    setOpenPopovers((prev) => ({ ...prev, [columnKey]: false }));
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const newSelection = checked === true ? data.map(getRecordId) : [];
    onSelectionChange?.(newSelection);
  };

  const handleSelectRecord = (
    recordId: string,
    checked: boolean | "indeterminate"
  ) => {
    const newSelection =
      checked === true
        ? Array.from(new Set([...selectedIds, recordId]))
        : selectedIds.filter((id) => id !== recordId);
    onSelectionChange?.(newSelection);
  };

  const resolveActionVariant = (
    action: ModernTableAction<T>,
    record: T
  ): ActionVariant => {
    if (typeof action.variant === "function") {
      return action.variant(record);
    }
    return action.variant ?? "default";
  };

  const handleAction = (action: ModernTableAction<T>, record: T) => {
    if (resolveActionVariant(action, record) === "danger") {
      setDeleteRecord(record);
      setDeleteAction(action);
    } else {
      setDeleteAction(null);
      action.onClick(record);
    }
  };

  const confirmDelete = () => {
    if (deleteRecord && deleteAction) {
      deleteAction.onClick(deleteRecord);
      setDeleteRecord(null);
      setDeleteAction(null);
    }
  };

  // 加载状态
  if (loading && data.length === 0) {
    return (
      <Card>
        <CardContent className="py-20">
          <AdminLoading text="正在加载数据..." />
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error && data.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-950 rounded-2xl mb-4">
            <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            加载失败
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="shadow-sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 -translate-y-1/2" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors rounded-xl"
            />
          </div>
        )}

        <div className="flex items-center space-x-3">
          {/* 批量操作区域 - 始终保持空间以避免抖动 */}
          {selectable && batchActions.length > 0 && (
            <div
              className={cn(
                "transition-all duration-200 ease-in-out",
                selectedIds.length > 0
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4 pointer-events-none"
              )}
            >
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl min-w-0">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                  已选择 {selectedIds.length} 项
                </span>
                {batchActions.map((batchAction, index) => {
                  const isDisabled =
                    selectedIds.length === 0 || batchAction.disabled;
                  return (
                    <Button
                      key={index}
                      variant={
                        batchAction.variant === "danger"
                          ? "destructive"
                          : "default"
                      }
                      size="sm"
                      onClick={() => batchAction.onClick(selectedIds)}
                      disabled={isDisabled}
                      className={cn(
                        "rounded-lg transition-all duration-200",
                        batchAction.variant === "danger" &&
                          "bg-red-500 hover:bg-red-600",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {batchAction.icon}
                      {batchAction.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 新建按钮 */}
          {createButton &&
            (createButton.href ? (
              <Link href={createButton.href}>
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl shadow-md border-0">
                  {createButton.icon || <Plus className="mr-2 h-4 w-4" />}
                  {createButton.label}
                </Button>
              </Link>
            ) : (
              <Button
                onClick={createButton.onClick}
                className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl shadow-md border-0"
              >
                {createButton.icon || <Plus className="mr-2 h-4 w-4" />}
                {createButton.label}
              </Button>
            ))}
        </div>
      </div>

      {/* 表格内容 */}
      {data.length === 0 &&
      !loading &&
      !filterable &&
      Object.keys(filters).length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
              {emptyIcon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {emptyTitle}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery ? "未找到匹配的结果" : emptyDescription}
            </p>
            {!searchQuery &&
              createButton &&
              (createButton.href ? (
                <Link href={createButton.href}>
                  <Button className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl shadow-md border-0">
                    {createButton.icon || <Plus className="mr-2 h-4 w-4" />}
                    {createButton.label}
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={createButton.onClick}
                  className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl shadow-md border-0"
                >
                  {createButton.icon || <Plus className="mr-2 h-4 w-4" />}
                  {createButton.label}
                </Button>
              ))}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 表头 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectable && (
                <div className="w-8">
                  <Checkbox
                    checked={
                      selectedIds.length === data.length && data.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    className="rounded-md"
                  />
                </div>
              )}
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    column.width || "flex-1",
                    column.className,
                    "flex items-center space-x-2"
                  )}
                >
                  <span>{column.title}</span>
                  {filterable && column.filter && (
                    <TableFilter
                      columnKey={column.key}
                      columnTitle={column.title}
                      filterType={column.filter.type}
                      options={column.filter.options}
                      placeholder={column.filter.placeholder}
                      currentValue={filters[column.key]}
                      onFilterChange={handleFilterChange}
                      onApply={closePopover}
                      onReset={clearFilter}
                      onOpen={openPopover}
                      onClose={closePopover}
                      isOpen={openPopovers[column.key] || false}
                    />
                  )}
                </div>
              ))}
              {actions.length > 0 && (
                <div className="w-12 text-center">操作</div>
              )}
            </div>
          </div>

          {/* 数据行 */}
          {data.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  <Filter className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm">没有找到匹配筛选条件的数据</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    请尝试调整筛选条件
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            data.map((record) => {
              const recordId = getRecordId(record);
              return (
                <Card
                  key={recordId}
                  className="overflow-hidden hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {selectable && (
                        <div>
                          <Checkbox
                            checked={selectedIds.includes(recordId)}
                            onCheckedChange={(checked) => {
                              handleSelectRecord(recordId, checked);
                            }}
                            className="rounded-md"
                          />
                        </div>
                      )}

                      {columns.map((column) => (
                        <div
                          key={column.key}
                          className={cn(
                            column.width || "flex-1",
                            "min-w-0",
                            column.className
                          )}
                        >
                          {column.render
                            ? column.render(
                                (record as Record<string, unknown>)[column.key],
                                record
                              )
                            : (() => {
                                const cellValue = (
                                  record as Record<string, unknown>
                                )[column.key];
                                return cellValue == null
                                  ? ""
                                  : String(cellValue);
                              })()}
                        </div>
                      ))}

                      {actions.length > 0 && (
                        <div className="w-12">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                              <DropdownMenuLabel className="text-gray-700 dark:text-gray-300">
                                操作
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {actions.map((action) => {
                                const actionVariant = resolveActionVariant(
                                  action,
                                  record
                                );
                                return (
                                  <DropdownMenuItem
                                    key={action.key}
                                    onClick={() => handleAction(action, record)}
                                    className={cn(
                                      "rounded-lg",
                                      actionVariant === "danger" &&
                                        "text-red-600 dark:text-red-400",
                                      actionVariant === "warning" &&
                                        "text-orange-600 dark:text-orange-400",
                                      actionVariant === "success" &&
                                        "text-green-600 dark:text-green-400",
                                      action.className
                                    )}
                                  >
                                    {action.icon && (
                                      <span className="mr-2">
                                        {action.icon}
                                      </span>
                                    )}
                                    {typeof action.label === "function"
                                      ? action.label(record)
                                      : action.label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 分页 */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between px-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {pagination.total} 条，第 {pagination.current} /{" "}
            {Math.ceil(pagination.total / pagination.pageSize)} 页
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current <= 1 || loading}
              onClick={() => pagination.onChange(pagination.current - 1)}
              className="rounded-lg"
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.current >=
                  Math.ceil(pagination.total / pagination.pageSize) || loading
              }
              onClick={() => pagination.onChange(pagination.current + 1)}
              className="rounded-lg"
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={!!deleteRecord}
        onClose={() => {
          setDeleteRecord(null);
          setDeleteAction(null);
        }}
        onConfirm={confirmDelete}
        itemName="记录"
        itemType="数据"
      />
    </div>
  );
}
