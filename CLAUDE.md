# Spring Broken AI Blog 博客系统 - Claude 开发文档

这是一个基于 Next.js 15 + TypeScript + shadcn/ui + NextAuth.js 构建的现代化个人博客系统，集成了 AI 智能助手和 RAG (检索增强生成) 功能。

## 🚀 项目概览

Spring Broken AI Blog 是一个全栈博客系统，专注于**高效创作**和**优雅展示**。系统采用现代化技术栈，提供完整的内容管理功能和用户友好的管理界面，并通过 AI 技术增强写作体验。

### 核心特性

#### 基础功能

- ✅ **现代化前端**: Next.js 15 + App Router + Turbopack
- ✅ **类型安全**: 全栈 TypeScript 支持
- ✅ **无头组件**: shadcn/ui + Radix UI + Tailwind CSS
- ✅ **身份认证**: NextAuth.js v4 + JWT 策略
- ✅ **数据库**: Prisma ORM + SQLite/PostgreSQL
- ✅ **代码质量**: ESLint + Prettier + Husky
- ✅ **响应式设计**: 移动端友好的界面

#### AI 功能亮点

- 🤖 **智能写作助手**: 基于 Kimi API 的 AI 辅助创作
- 🧠 **向量索引系统**: ChromaDB + Ollama 实现本地向量存储
- 🔍 **RAG 聊天功能**: 基于文章内容的智能问答
- ✨ **AI 补全功能**: 编辑器内的智能内容续写
- 📝 **智能推荐**: AI 自动推荐分类和标签
- 💬 **流式输出**: 实时展示 AI 生成内容

## 📁 项目结构

```
Spring-Broken-AI-Blog/
├── src/
│   ├── app/                         # Next.js App Router 页面
│   │   ├── admin/                   # 管理后台页面
│   │   │   ├── page.tsx            # 后台首页
│   │   │   ├── posts/              # 文章管理
│   │   │   ├── categories/         # 分类管理
│   │   │   ├── tags/               # 标签管理
│   │   │   ├── profile/            # 个人资料
│   │   │   └── settings/           # 系统设置
│   │   ├── login/                   # 登录页面
│   │   ├── api/                     # API 路由
│   │   │   ├── auth/               # NextAuth.js API
│   │   │   ├── admin/              # 管理后台 API
│   │   │   └── ai/                 # AI 功能 API
│   │   ├── posts/[slug]/           # 文章详情页
│   │   ├── category/[slug]/        # 分类页面
│   │   ├── globals.css             # 全局样式
│   │   └── layout.tsx              # 根布局
│   ├── components/                  # React 组件
│   │   ├── ui/                     # shadcn/ui 基础组件
│   │   ├── admin/                  # 管理后台组件
│   │   │   ├── ai-assistant.tsx   # AI 写作助手
│   │   │   ├── rag-chat.tsx       # RAG 聊天组件
│   │   │   ├── post-editor.tsx    # 文章编辑器
│   │   │   └── publish-dialog.tsx # 发布对话框
│   │   ├── markdown/               # Markdown 渲染组件
│   │   ├── posts/                  # 文章展示组件
│   │   ├── providers/              # 上下文提供器
│   │   └── layout/                 # 布局组件
│   ├── lib/                        # 工具库和配置
│   │   ├── auth.ts                 # NextAuth.js 配置
│   │   ├── prisma.ts               # Prisma 客户端
│   │   ├── utils.ts                # 工具函数
│   │   ├── ai/                     # AI 相关
│   │   │   ├── client.ts          # AI 客户端 (Kimi + Ollama)
│   │   │   ├── prompts/           # AI 提示词
│   │   │   └── rag.ts             # RAG 实现
│   │   ├── vector/                 # 向量索引
│   │   │   ├── chunker.ts         # 文本分块
│   │   │   ├── indexer.ts         # 索引管理
│   │   │   └── store.ts           # 向量存储 (ChromaDB)
│   │   └── editor/                 # 编辑器相关
│   │       ├── ai-completion-extension.ts
│   │       └── markdown-converter.ts
│   └── types/                      # TypeScript 类型定义
├── prisma/                         # Prisma 数据库配置
│   ├── schema.prisma               # 数据库模型
│   ├── seed.ts                     # 数据库种子
│   └── dev.db                      # SQLite 数据库 (开发环境)
├── docs/                           # 项目文档
├── public/                         # 静态资源
├── components.json                 # shadcn/ui 配置
├── tailwind.config.ts              # Tailwind CSS 配置
├── middleware.ts                   # Next.js 中间件 (路由保护)
└── ecosystem.config.js             # PM2 配置文件
```

## 🛠️ 技术栈

### 核心框架

- **Next.js 15**: React 全栈框架，使用 App Router + Turbopack
- **TypeScript**: 静态类型检查
- **React 18**: 用户界面库

### UI 系统

- **shadcn/ui**: 无头组件库
- **Radix UI**: 无头 UI 原语
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Lucide React**: 现代化图标库
- **Novel**: Notion 风格的编辑器
- **react-markdown**: Markdown 渲染
- **remark/rehype**: Markdown 处理插件
- **highlight.js**: 代码高亮

### AI 能力

- **Kimi API (Moonshot AI)**: AI 对话和生成
- **Ollama**: 本地 Embedding 生成 (nomic-embed-text 模型)
- **ChromaDB**: 向量数据库，用于 RAG 检索
- **OpenAI SDK**: 兼容 Kimi API 的调用方式

### 数据层

- **Prisma 6.16.1**: 现代化 ORM
- **SQLite**: 开发/生产环境数据库
- **Prisma Adapter**: NextAuth.js 数据库适配器

### 身份认证

- **NextAuth.js v4**: 身份认证库
- **JWT**: 会话管理策略
- **bcryptjs**: 密码哈希

### 开发工具

- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Husky**: Git hooks 管理
- **lint-staged**: 暂存区文件检查

### 部署工具

- **PM2**: Node.js 进程管理器
- **Nginx**: Web 服务器和反向代理
- **GitHub Actions**: CI/CD 自动化部署 (可选)

## 🔧 快速开始

### 环境要求

```bash
Node.js >= 18.0.0
npm >= 8.0.0
```

### AI 功能依赖 (可选)

如需使用 AI 功能，需要安装以下服务:

#### 1. Ollama (用于向量生成)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# 启动 Ollama 服务
ollama serve

# 拉取 Embedding 模型
ollama pull nomic-embed-text
```

#### 2. ChromaDB (用于向量存储)

```bash
# 使用 Docker
docker run -d --name chromadb -p 8000:8000 chromadb/chroma:latest

# 或直接使用 Python
pip install chromadb
chroma run --host localhost --port 8000
```

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd Spring-Broken-AI-Blog

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
```

编辑 `.env.local` 文件:

```bash
# 数据库配置
DATABASE_URL="file:./prisma/dev.db"

# NextAuth 配置
NEXTAUTH_SECRET="your-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:7777"

# 管理员账户 (seed 时使用)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="0919"

# AI 配置 (可选)
KIMI_API_KEY="your-kimi-api-key"
KIMI_BASE_URL="https://api.moonshot.cn/v1"
KIMI_MODEL="moonshot-v1-32k"

# Ollama 配置 (用于向量生成)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# ChromaDB 配置 (用于向量存储)
CHROMADB_HOST="localhost"
CHROMADB_PORT="8000"
```

### 数据库设置

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库架构
npm run db:push

# 填充初始数据
npm run db:seed
```

### 启动开发服务器

```bash
# 启动开发服务器 (端口 7777)
npm run dev

# 访问应用
# 前台: http://localhost:7777
# 登录: http://localhost:7777/login
# 后台: http://localhost:7777/admin
```

### 默认管理员账户

```
用户名: admin
密码: 0919
```

## 📝 开发指南

### 代码规范

项目使用严格的代码规范来保证代码质量：

```bash
# 代码检查
npm run lint

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 构建项目
npm run build
```

### Git Hooks

项目配置了自动化的代码质量检查：

- **pre-commit**: 自动格式化代码，运行 ESLint
- **commit-msg**: 检查提交信息格式

### 常用命令

```bash
# 开发
npm run dev                  # 启动开发服务器 (端口 7777)
npm run build                # 构建生产版本
npm run start                # 启动生产服务器 (端口 3000)

# 数据库
npm run db:generate          # 生成 Prisma 客户端
npm run db:push              # 推送 schema 到数据库
npm run db:migrate           # 创建迁移
npm run db:seed              # 填充种子数据
npm run db:studio            # 打开 Prisma Studio
npm run db:reset             # 重置数据库

# PM2 管理
npm run pm2:start            # 启动 PM2 进程
npm run pm2:restart          # 重启 PM2 进程
npm run pm2:stop             # 停止 PM2 进程
npm run pm2:delete           # 删除 PM2 进程
```

### AI 功能开发

#### 1. 使用 AI 客户端

```typescript
import { getAIClient } from "@/lib/ai/client";

// 获取客户端实例
const aiClient = getAIClient();

// 非流式对话
const response = await aiClient.chat([{ role: "user", content: "你好" }]);
console.log(response.content);

// 流式对话
await aiClient.chatStream(
  [{ role: "user", content: "写一篇文章" }],
  {},
  (chunk) => {
    console.log(chunk); // 实时输出
  }
);
```

#### 2. 文章向量索引

```typescript
import { indexPost, indexAllPosts } from "@/lib/vector/indexer";

// 索引单篇文章
await indexPost("post-id");

// 强制重新索引
await indexPost("post-id", { force: true });

// 批量索引所有文章
const result = await indexAllPosts({ force: true });
console.log(
  `成功: ${result.indexed}, 跳过: ${result.skipped}, 失败: ${result.failed}`
);
```

#### 3. RAG 聊天

```typescript
import { ragChat } from "@/lib/ai/rag";

// 使用 RAG 进行问答
const answer = await ragChat("如何使用 Next.js？");
```

### 组件开发

#### 创建 UI 组件

使用 shadcn/ui CLI 添加新组件：

```bash
# 添加预制组件
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add table

# 查看可用组件
npx shadcn@latest add --help
```

#### 自定义组件

```tsx
// 示例：创建自定义按钮组件
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomButtonProps extends React.ComponentProps<typeof Button> {
  variant?: "default" | "primary" | "danger";
}

export function CustomButton({
  variant = "default",
  className,
  ...props
}: CustomButtonProps) {
  return (
    <Button
      className={cn(
        variant === "primary" && "bg-blue-600 hover:bg-blue-700",
        variant === "danger" && "bg-red-600 hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
```

### 页面开发

#### 路由结构

```
app/
├── page.tsx                 # 首页 /
├── login/page.tsx          # 登录页 /login
├── admin/
│   ├── page.tsx           # 管理首页 /admin
│   ├── posts/
│   │   ├── page.tsx       # 文章列表 /admin/posts
│   │   ├── new/page.tsx   # 新建文章 /admin/posts/new
│   │   └── [id]/edit/     # 编辑文章 /admin/posts/123/edit
│   ├── categories/page.tsx # 分类管理 /admin/categories
│   ├── tags/page.tsx      # 标签管理 /admin/tags
│   ├── profile/page.tsx   # 个人资料 /admin/profile
│   └── layout.tsx         # 管理后台布局
├── posts/[slug]/page.tsx  # 文章详情 /posts/hello-world
├── category/[slug]/page.tsx # 分类页面 /category/frontend
└── api/
    ├── auth/[...nextauth]/ # 认证 API
    ├── admin/             # 管理后台 API
    └── ai/                # AI 功能 API
```

#### 页面模板

```tsx
// app/admin/example/page.tsx
import { Metadata } from "next";
import AdminLayout from "@/components/admin/clean-admin-layout";

export const metadata: Metadata = {
  title: "示例页面 - Spring Broken AI Blog",
  description: "这是一个示例页面",
};

export default function ExamplePage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">示例页面</h1>
          <p className="text-muted-foreground">页面描述信息</p>
        </div>
        {/* 页面内容 */}
      </div>
    </AdminLayout>
  );
}
```

### 数据库操作

#### 数据模型

项目包含以下核心数据模型：

```prisma
// 用户系统
User          - 用户账户
Profile       - 用户资料 (一对一)
Role          - 用户角色 (USER/ADMIN)

// 内容管理
Post          - 文章
PostVectorIndex - 文章向量索引 (AI 功能)
Category      - 分类
Tag           - 标签
PostTag       - 文章标签关联 (多对多)
```

#### 数据库查询

```typescript
import { prisma } from "@/lib/prisma";

// 获取文章列表 (包含关联数据)
export async function getPosts() {
  return await prisma.post.findMany({
    include: {
      author: { select: { username: true, avatar: true } },
      category: true,
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// 创建新文章
export async function createPost(data: CreatePostData) {
  return await prisma.post.create({
    data: {
      ...data,
      author: { connect: { id: data.authorId } },
    },
  });
}
```

### 认证和授权

#### 保护路由

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // 额外的中间件逻辑
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // 管理员路由保护
        if (pathname.startsWith("/admin")) {
          return token?.role === "ADMIN";
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

#### 获取会话信息

```tsx
"use client";
import { useSession } from "next-auth/react";

export function UserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>加载中...</div>;
  }

  if (!session) {
    return <div>请先登录</div>;
  }

  return (
    <div>
      <h2>欢迎，{session.user.username}!</h2>
      <p>角色: {session.user.role}</p>
    </div>
  );
}
```

## 🎨 设计系统

### 颜色系统

项目使用 CSS 变量构建灵活的颜色系统：

```css
:root {
  --background: 0 0% 100%; /* 背景色 */
  --foreground: 240 10% 3.9%; /* 文字色 */
  --primary: 221.2 83.2% 53.3%; /* 主色调 */
  --secondary: 210 40% 96%; /* 次要色 */
  --muted: 210 40% 96%; /* 静音色 */
  --accent: 210 40% 96%; /* 强调色 */
  --destructive: 0 84.2% 60.2%; /* 危险色 */
}

.dark {
  --background: 240 10% 3.9%; /* 暗色背景 */
  --foreground: 0 0% 98%; /* 暗色文字 */
  /* ... 其他暗色变量 */
}
```

### 组件样式

```tsx
// 使用设计令牌
<div className="bg-background text-foreground border border-border">
  <h1 className="text-primary">主标题</h1>
  <p className="text-muted-foreground">次要文字</p>
</div>
```

### 响应式设计

```tsx
// Tailwind 响应式类名
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card className="p-4 sm:p-6">
    <h3 className="text-lg sm:text-xl font-semibold">卡片标题</h3>
  </Card>
</div>
```

## 🧪 测试

### 运行测试

```bash
# 构建测试
npm run build

# 类型检查
npm run type-check

# 代码风格检查
npm run lint

# 启动开发服务器测试
npm run dev
```

## 🚀 部署

### 生产环境配置

#### 1. 环境变量配置

创建 `.env.production` 文件:

```bash
# 数据库配置 (生产环境)
DATABASE_URL="file:./prisma/prod.db"

# NextAuth 配置
NEXTAUTH_SECRET="your-production-secret-key-at-least-32-characters"
NEXTAUTH_URL="http://your-domain.com"

# AI 配置 (可选)
KIMI_API_KEY="your-kimi-api-key"
KIMI_BASE_URL="https://api.moonshot.cn/v1"
KIMI_MODEL="moonshot-v1-32k"

# Ollama 配置
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# ChromaDB 配置
CHROMADB_HOST="localhost"
CHROMADB_PORT="8000"
```

#### 2. 数据库初始化

```bash
# 生成 Prisma 客户端 (生产环境)
npm run db:generate:prod

# 推送 schema (生产环境)
npm run db:push:prod

# 填充种子数据 (生产环境)
npm run db:seed:prod
```

#### 3. 构建和启动

```bash
# 构建项目
npm run build

# 使用 PM2 启动
npm run pm2:start

# 或直接启动
npm start
```

### PM2 进程管理

项目包含 PM2 配置文件 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "spring-broken-ai-blog",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 部署脚本

项目提供了便捷的部署脚本:

```bash
# 完整部署流程 (构建 + 数据库设置)
npm run deploy:setup:prod

# 仅构建
npm run deploy:build
```

### Docker 部署 (可选)

```dockerfile
# Dockerfile (示例)
FROM node:18-alpine
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 🎯 AI 功能亮点

### 1. 智能写作助手

- **位置**: `src/components/admin/ai-assistant.tsx`
- **功能**: 基于 Kimi API 的 AI 辅助创作
- **特性**:
  - 多种写作模式: 续写、扩展、润色、总结
  - 流式输出，实时展示生成内容
  - 支持自定义提示词

### 2. RAG 聊天系统

- **位置**: `src/components/admin/rag-chat.tsx`
- **功能**: 基于文章内容的智能问答
- **技术**:
  - 向量检索: ChromaDB + Ollama Embedding
  - 语义分块: 智能文本分块算法
  - 上下文注入: 检索结果注入提示词

### 3. AI 补全扩展

- **位置**: `src/lib/editor/ai-completion-extension.ts`
- **功能**: 编辑器内的智能内容续写
- **实现**: 基于 ProseMirror 的编辑器扩展

### 4. 智能推荐

- **位置**: `src/components/admin/publish-dialog/`
- **功能**: AI 自动推荐分类和标签
- **实现**: 基于文章内容的 NLP 分析

### 5. 向量索引系统

- **位置**: `src/lib/vector/`
- **功能**: 文章内容的向量化存储
- **组件**:
  - `chunker.ts`: 智能文本分块
  - `indexer.ts`: 索引管理
  - `store.ts`: ChromaDB 存储

## 📚 项目文档

项目包含丰富的技术文档:

### 核心文档

- [README.md](./README.md) - 项目概览和快速开始
- [CLAUDE.md](./CLAUDE.md) - 开发指南 (本文档)

### AI 功能文档

- [AI集成实现指南](./docs/ai-ts/AI集成实现指南.md) - AI 功能完整实现
- [AI功能亮点总结](./docs/ai-features/AI功能亮点总结.md) - AI 技术亮点
- [向量索引系统技术文档](./docs/ai-features/向量索引系统技术文档.md) - RAG 实现
- [流式输出实现文档](./docs/ai-features/流式输出实现文档.md) - 流式输出
- [AI补全扩展技术文档](./docs/ai-features/AI补全扩展技术文档.md) - 编辑器扩展

### 开发指南

- [Next.js全栈开发完全指南](./docs/goodblog/frontend/react/Next.js全栈开发完全指南.md) - Next.js 教程
- [启动指南](./docs/启动指南.md) - AI 服务启动
- [部署指南](./docs/部署指南.md) - 生产环境部署

### 技术分享

- [浅谈Vibe Coding](./docs/resume/浅谈Vibe Coding.md) - Vibe Coding 理念
- [从零到一：在博客系统中实践AI Agent开发](./docs/goodblog/AI/从零到一：在博客系统中实践AI Agent开发.md) - AI Agent 实践

## 🤝 贡献指南

### 开发流程

1. Fork 项目仓库
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -m 'feat: add new feature'`
4. 推送到分支: `git push origin feature/new-feature`
5. 创建 Pull Request

### 代码风格

- 使用 TypeScript 进行开发
- 遵循 ESLint 和 Prettier 规则
- 为新功能添加适当的注释
- 保持组件的单一职责原则
- 提交信息遵循 Conventional Commits 规范

### 提交信息规范

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或工具变更
perf: 性能优化
ci: CI/CD 相关
```

## 🔍 常见问题

### Q: AI 功能无法使用?

**A**: 确保以下服务已启动:

- Ollama 服务: `ollama serve`
- ChromaDB 服务: `chroma run --host localhost --port 8000`
- 已配置环境变量: `.env.local` 中配置 `KIMI_API_KEY`

### Q: 向量索引失败?

**A**: 检查:

1. Ollama 服务是否运行
2. 是否已拉取模型: `ollama pull nomic-embed-text`
3. ChromaDB 服务是否启动
4. 查看控制台错误日志

### Q: 数据库迁移错误?

**A**: 尝试:

```bash
# 重置数据库
npm run db:reset

# 或手动删除后重新生成
rm prisma/dev.db
npm run db:generate
npm run db:push
npm run db:seed
```

### Q: PM2 启动失败?

**A**: 检查:

1. 是否已构建: `npm run build`
2. 端口 3000 是否被占用
3. 查看日志: `pm2 logs spring-broken-ai-blog`

## 📞 支持与反馈

如果你在使用过程中遇到问题或有建议，欢迎:

1. 查阅项目文档
2. 搜索已有的 Issues
3. 创建新的 Issue 描述问题
4. 参与项目讨论

## 📄 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](./LICENSE) 文件。

---

**Spring Broken AI Blog** - 集成 AI 功能的现代化博客系统

🔗 **技术栈**: Next.js 15 + TypeScript + shadcn/ui + NextAuth.js + Prisma + Tailwind CSS + Kimi AI + ChromaDB

🌟 **特色**: 智能写作助手 | RAG 聊天 | 向量检索 | 流式输出
