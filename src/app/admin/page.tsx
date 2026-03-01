/**
 * 简洁的管理员仪表盘页面
 *
 * 专注于核心数据展示，去除不必要的功能
 */

import { Suspense } from "react";
import CleanAdminLayout from "@/components/admin/clean-admin-layout";
import CleanDashboardStats from "@/components/admin/clean-dashboard-stats";
import { SimpleLoading } from "@/components/ui/loading";

export default function AdminDashboard() {
  return (
    <CleanAdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-6 bg-black dark:bg-white rounded-full"></div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            管理概览
          </h1>
        </div>

        {/* 统计卡片 */}
        <Suspense fallback={<SimpleLoading />}>
          <CleanDashboardStats />
        </Suspense>
      </div>
    </CleanAdminLayout>
  );
}
