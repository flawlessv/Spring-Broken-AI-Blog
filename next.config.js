/** @type {import('next').NextConfig} */

/**
 * Next.js 配置文件
 *
 * 这个文件用于自定义 Next.js 的构建和运行时行为
 * 支持的配置项包括：webpack 配置、路径重写、环境变量等
 *
 * 文档：https://nextjs.org/docs/app/api-reference/next-config-js
 */
const nextConfig = {
  // 禁用构建工作线程 - 在服务器环境中可能导致构建中断
  // BUILD_ID 缺失通常是由于构建工作线程在静态生成阶段异常退出
  webpack: (config) => {
    return config;
  },

  // 实验性功能配置
  experimental: {
    /**
     * 类型化路由 (Typed Routes)
     *
     * 注意：在生产环境构建时可能导致 BUILD_ID 缺失的问题
     * 因此在生产环境完全禁用此功能
     */
    typedRoutes: false, // 完全禁用以避免构建问题
    // 禁用构建工作线程
    workerThreads: false,
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
