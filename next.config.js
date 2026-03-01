/** @type {import('next').NextConfig} */

/**
 * Next.js 配置文件
 *
 * 这个文件用于自定义 Next.js 的构建和运行时行为
 * 支持的配置项包括：webpack 配置、路径重写、环境变量等
 *
 * 文档：https://nextjs.org/docs/app/api-reference/next-config-js
 */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // 实验性功能配置
  experimental: {
    /**
     * 类型化路由 (Typed Routes)
     *
     * 启用后，Next.js 会自动生成路由的 TypeScript 类型
     * 提供编译时的路由检查和自动完成
     *
     * 优势：
     * - 防止路由拼写错误
     * - 提供更好的 IDE 支持
     * - 重构时自动更新路由引用
     *
     * 注意：在生产环境构建时可能消耗较多资源，如果构建卡住可以临时禁用
     */
    typedRoutes: !isProd, // 生产环境禁用以加快构建速度
    // 启用优化包导入
    optimizePackageImports: ["lucide-react"],
  },
  basePath: "",
  // 图片优化配置
  images: {
    // 允许的外部图片域名
    remotePatterns: [
      // 允许所有 HTTPS 域名（更灵活的配置，适用于动态内容）
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
    // 图片格式优化 - 优先使用 AVIF，降级到 WebP
    formats: ["image/avif", "image/webp"],
    // 设备尺寸 - 优化为常用尺寸，减少构建时间
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // 图片尺寸 - 更精细的尺寸梯度
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    // 最小缓存时间（秒）- 增加缓存时间提升性能
    minimumCacheTTL: 31536000, // 1年
  },
  /**
   * 其他常用配置项（当前未启用）：
   *
   * // 自定义域名和路径
   * basePath: '/my-app',
   *
   * // 静态文件导出
   * output: 'export',
   *
   * // 重定向配置
   * redirects: async () => [...],
   *
   * // 环境变量
   * env: {
   *   customKey: 'value'
   * }
   */
};

// 使用 CommonJS 格式导出，确保与 Node.js 兼容
module.exports = nextConfig;
