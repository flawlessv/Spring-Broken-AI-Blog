/**
 * Next.js 中间件 - 路由保护
 *
 * 这个中间件在每个请求到达页面之前运行
 * 用于保护管理员路由，确保只有已认证的管理员用户可以访问
 *
 * 文档：https://nextjs.org/docs/app/building-your-application/routing/middleware
 * NextAuth中间件：https://next-auth.js.org/configuration/nextjs#middleware
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // 如果用户已登录且访问登录页，重定向到管理员页面
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // 继续处理请求
    return NextResponse.next();
  },
  {
    callbacks: {
      /**
       * 授权回调
       *
       * 返回 true 表示允许访问
       * 返回 false 表示重定向到登录页
       */
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // 保护所有 /admin 路由（页面和 API）
        if (pathname.startsWith("/admin")) {
          return !!token;
        }

        // 保护 /api/admin 路由
        if (pathname.startsWith("/api/admin")) {
          return !!token;
        }

        // 其他路由都允许访问
        return true;
      },
    },
    pages: {
      signIn: "/login", // 确保重定向到正确的登录页面
    },
  }
);

/**
 * 中间件匹配器配置
 *
 * 定义哪些路由会运行中间件
 * 必须保护所有管理后台路由和 API
 */
export const config = {
  matcher: [
    // 保护所有管理后台页面
    "/admin/:path*",
    // 保护所有管理后台 API
    "/api/admin/:path*",
    // 登录页面（用于重定向已登录用户）
    "/login",
  ],
};
