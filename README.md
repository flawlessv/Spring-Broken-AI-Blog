# Spring Broken AI Blog 🚀

一个基于 **Next.js 15 + TypeScript + AI** 构建的现代化智能博客系统，集成了 AI 智能助手和 RAG (检索增强生成) 功能。

**首页**
![首页](/public/images/broken/shouye.png)

**文章详情**
![详情](/public/images/broken/详情.png)

**后台管理**
![详情](/public/images/broken/后台仪表盘.png)

## 🎯 核心特性

### 基础功能

- ✅ **现代化前端**: Next.js 15 + App Router + Turbopack
- ✅ **类型安全**: 全栈 TypeScript 支持
- ✅ **无头组件**: shadcn/ui + Radix UI + Tailwind CSS
- ✅ **身份认证**: NextAuth.js v4 + JWT 策略
- ✅ **数据库**: Prisma ORM + SQLite/PostgreSQL
- ✅ **代码质量**: ESLint + Prettier + Husky
- ✅ **响应式设计**: 移动端友好的界面

### AI 功能亮点

- 🤖 **智能写作助手**: 基于 Kimi API 的 AI 辅助创作
- 🧠 **向量索引系统**: ChromaDB + Ollama 实现本地向量存储
- 🔍 **RAG 聊天功能**: 基于文章内容的智能问答
- ✨ **AI 补全功能**: 编辑器内的智能内容续写
- 📝 **智能推荐**: AI 自动推荐分类和标签
- 💬 **流式输出**: 实时展示 AI 生成内容

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

### 部署工具

- **PM2**: Node.js 进程管理器
- **Nginx**: Web 服务器和反向代理

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
├── scripts/                        # 脚本工具
│   ├── ai/                         # AI 服务脚本
│   │   ├── start-ai.sh            # 启动 AI 服务 (开发)
│   │   └── stop-ai.sh             # 停止 AI 服务 (开发)
│   └── README.md                   # 脚本说明文档
├── docs/                           # 项目文档
├── public/                         # 静态资源
├── components.json                 # shadcn/ui 配置
├── tailwind.config.ts              # Tailwind CSS 配置
├── middleware.ts                   # Next.js 中间件 (路由保护)
└── ecosystem.config.js             # PM2 配置文件
```

## 🚀 快速开始

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

---

## 🚀 快速启动

### 方式一: 仅启动博客 (不含 AI 功能)

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，配置数据库和 NextAuth

# 3. 初始化数据库
npm run db:generate && npm run db:push && npm run db:seed

# 4. 启动开发服务器
npm run dev

# 访问 http://localhost:7777
```

### 方式二: 完整启动 (含 AI 功能)

```bash
# 1. 安装依赖
npm install

# 2. 安装 Ollama (macOS)
brew install ollama

# 3. 启动 AI 服务
./scripts/ai/start-ai.sh

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，添加 Kimi API Key:
# KIMI_API_KEY="sk-your-key-here"

# 5. 初始化数据库
npm run db:generate && npm run db:push && npm run db:seed

# 6. 启动开发服务器
npm run dev

# 访问 http://localhost:7777
```

**停止 AI 服务:**

```bash
./scripts/ai/stop-ai.sh
```

### AI 服务启动说明

项目提供了 `start-ai.sh` 和 `stop-ai.sh` 脚本来管理 AI 服务:

- **start-ai.sh**: 自动启动 Ollama (向量生成) 和 ChromaDB (向量存储)
- **stop-ai.sh**: 停止所有 AI 服务

**注意**:

- 首次运行 `start-ai.sh` 会自动下载 `nomic-embed-text` 模型 (约 274MB)
- 需要申请 [Kimi API Key](https://platform.moonshot.cn/) 才能使用 AI 对话功能
- 详细的启动指南和故障排查请查看 [启动指南.md](./docs/guides/启动指南.md)

---

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

---

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

#### 2. 构建和启动

```bash
# 构建项目
npm run build

# 使用 PM2 启动
npm run pm2:start

# 或直接启动
npm start
```

### 部署脚本

```bash
# 完整部署流程 (构建 + 数据库设置)
npm run deploy:setup:prod

# 仅构建
npm run deploy:build
```

---

## 🎯 AI 功能亮点

### 1. 智能写作助手

![AI 辅助写作](/public/images/broken/AI文章新建和编辑页.png)

- **位置**: `src/components/admin/ai-assistant.tsx`
- **功能**: 基于 Kimi API 的 AI 辅助创作
- **特性**:
  - 多种写作模式: 续写、扩展、润色、总结
  - 流式输出，实时展示生成内容
  - 支持自定义提示词

### 2. RAG 聊天系统

![RAG 知识库问答](/public/images/broken/cover.gif)

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

---

## 📚 项目文档

- [启动指南](./docs/guides/启动指南.md) - AI 服务启动
- [图片管理指南](./docs/guides/图片管理指南.md) - 图片资源管理
- [部署指南](./docs/operations/部署指南.md) - 生产环境部署
- [从零打造 AI 智能博客](./docs/templates/AI/从零打造AI智能博客.md) - 项目技术分享

## 🔗 获取 AI API Key

- **Kimi (推荐)**: https://platform.moonshot.cn/
- **DeepSeek**: https://platform.deepseek.com/
- **通义千问**: https://dashscope.aliyun.com/

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

---

**Spring Broken AI Blog** - 用 AI 赋能写作，让博客更智能 ✨
