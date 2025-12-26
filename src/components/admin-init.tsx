"use client";

import { useEffect } from "react";

/**
 * 管理员账户自动初始化组件
 *
 * 在应用加载时自动检查并创建默认管理员账户
 * 如果不存在 admin 账户，会自动创建 admin/0919
 */
export default function AdminInit() {
  useEffect(() => {
    // 只在客户端执行一次
    const initAdmin = async () => {
      try {
        const response = await fetch("/api/admin/init");
        const data = await response.json();

        if (data.success && data.message === "管理员账户创建成功") {
          console.log("✅ 默认管理员账户已自动创建");
          console.log("📝 用户名: admin");
          console.log("🔑 密码: 0919");
        }
      } catch (error) {
        console.error("初始化管理员账户失败:", error);
      }
    };

    initAdmin();
  }, []);

  // 不渲染任何内容
  return null;
}
