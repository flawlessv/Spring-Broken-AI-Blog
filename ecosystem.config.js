// 加载环境变量
require("dotenv").config({ path: ".env.production" });

module.exports = {
  apps: [
    {
      name: "spring-broken-ai-blog",
      script: "npm",
      args: "start",
      cwd: "/www/wwwroot/my-next-app",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s", // 最小运行时间
      max_restarts: 5, // 最大重启次数
      restart_delay: 4000, // 重启延迟
      kill_timeout: 5000, // 强制杀死进程的超时时间
      wait_ready: true, // 等待应用就绪信号
      listen_timeout: 10000, // 监听超时时间
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // 从 .env.production 加载的环境变量
        DATABASE_URL: process.env.DATABASE_URL,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        // AI 相关配置
        KIMI_API_KEY: process.env.KIMI_API_KEY,
        KIMI_BASE_URL: process.env.KIMI_BASE_URL,
        KIMI_MODEL: process.env.KIMI_MODEL,
        // Ollama 配置
        OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
        OLLAMA_EMBEDDING_MODEL: process.env.OLLAMA_EMBEDDING_MODEL,
        // ChromaDB 配置
        CHROMADB_HOST: process.env.CHROMADB_HOST,
        CHROMADB_PORT: process.env.CHROMADB_PORT,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
