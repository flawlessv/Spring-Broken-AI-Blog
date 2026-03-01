# AI 大模型集成技术方案

## 📋 目录

1. [方案概述](#方案概述)
2. [功能设计](#功能设计)
3. [技术架构](#技术架构)
4. [数据库设计](#数据库设计)
5. [API 设计](#api-设计)
6. [前端集成](#前端集成)
7. [RAG 知识库实现](#rag-知识库实现)
8. [Prompt 模板系统](#prompt-模板系统)
9. [实施计划](#实施计划)
10. [技术选型](#技术选型)

---

## 方案概述

### 目标

将 AI 大模型能力深度集成到博客系统中,提供智能写作辅助、内容生成、知识检索等功能,提升内容创作效率和质量。

### 核心能力

1. **AI 辅助写作**: 在编辑器中提供实时 AI 建议和内容补全
2. **RAG 知识库**: 基于现有文章构建知识库,提供智能问答和内容检索
3. **Prompt 模板管理**: 提供可复用的 Prompt 模板,支持自定义 AI 行为
4. **内容生成**: 自动生成文章摘要、标签、标题优化建议
5. **智能问答**: 基于博客内容的智能问答系统

### 技术栈

- **AI 模型**: Kimi (Moonshot AI) - 有免费额度
- **向量数据库**: Chroma (开源免费)
- **嵌入模型**: Ollama nomic-embed-text (本地免费)
- **后端框架**: Next.js API Routes
- **前端**: React + TypeScript

---

## 功能设计

### 1. AI 辅助写作功能

#### 1.1 实时内容建议

在 Markdown 编辑器中提供以下 AI 功能:

- **内容补全**: 根据当前上下文自动补全内容
- **语法优化**: 优化 Markdown 语法和格式
- **风格调整**: 调整文章语气和风格(正式/轻松/技术)
- **段落扩展**: 扩展简短段落为详细内容

#### 1.2 智能内容生成

- **标题生成**: 根据内容自动生成多个标题选项
- **摘要生成**: 自动生成文章摘要
- **标签建议**: 基于内容自动推荐标签
- **分类建议**: 智能推荐文章分类
- **封面图描述**: 生成封面图描述用于 AI 绘图

#### 1.3 内容优化

- **SEO 优化**: 优化标题和内容以提高 SEO
- **可读性分析**: 分析文章可读性并提供改进建议
- **关键词提取**: 自动提取文章关键词
- **阅读时间估算**: 更准确的阅读时间计算

### 2. RAG 知识库功能

#### 2.1 知识库构建

- **自动索引**: 发布文章时自动构建向量索引
- **增量更新**: 支持文章更新后增量更新索引
- **批量重建**: 支持批量重建知识库索引

#### 2.2 智能检索

- **语义搜索**: 基于向量相似度的语义搜索
- **关键词搜索**: 传统关键词搜索
- **混合搜索**: 结合语义和关键词的混合搜索
- **相关文章推荐**: 基于当前文章推荐相关文章

#### 2.3 智能问答

- **文章问答**: 针对单篇文章的问答
- **全局问答**: 基于整个知识库的问答
- **上下文理解**: 理解对话上下文,支持多轮对话
- **引用来源**: 回答时提供引用来源和文章链接

### 3. Prompt 模板系统

#### 3.1 模板管理

- **预设模板**: 提供常用 Prompt 模板
- **自定义模板**: 用户可创建和管理自定义模板
- **模板分类**: 按用途分类(写作/优化/问答等)
- **模板分享**: 支持模板导入导出

#### 3.2 模板类型

- **内容生成类**: 标题生成、摘要生成、段落扩展等
- **内容优化类**: SEO 优化、可读性优化、风格调整等
- **问答类**: 文章问答、知识检索等
- **分析类**: 关键词提取、主题分析、情感分析等

---

## 技术架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     前端层 (React)                       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 编辑器组件    │  │ AI助手面板    │  │ 问答界面      │  │
│  │ (集成AI功能)  │  │ (实时建议)    │  │ (RAG问答)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 API 层 (Next.js Routes)                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/ai/write│  │ /api/ai/rag  │  │ /api/ai/prompt│ │
│  │ (写作辅助)    │  │ (知识检索)    │  │ (模板管理)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  AI服务层     │  │ 向量数据库    │  │ 数据库(Prisma)│
│ (Kimi API)    │  │ (Chroma)      │  │ (SQLite/Postgres)│
└──────────────┘  └──────────────┘  └──────────────┘
```

### 核心模块

#### 1. AI 服务模块 (`lib/ai/`)

```typescript
lib/ai/
├── client.ts          # AI 客户端封装(支持多模型)
├── embeddings.ts      # 嵌入向量生成
├── rag.ts            # RAG 检索增强生成
├── prompts.ts        # Prompt 管理
└── utils.ts          # AI 工具函数
```

#### 2. 向量存储模块 (`lib/vector/`)

```typescript
lib/vector/
├── store.ts          # 向量存储接口
├── chroma.ts         # Chroma 实现
└── indexer.ts        # 索引构建器
```

#### 3. API 路由 (`app/api/ai/`)

```typescript
app/api/ai/
├── write/
│   ├── complete/     # 内容补全
│   ├── optimize/     # 内容优化
│   └── generate/     # 内容生成
├── rag/
│   ├── search/       # 语义搜索
│   ├── query/        # 智能问答
│   └── index/        # 索引管理
└── prompts/
    └── route.ts      # Prompt 模板管理
```

---

## 数据库设计

### 扩展 Schema

在现有 Prisma Schema 基础上添加以下模型:

```prisma
// ============================================================================
// AI 功能相关模型
// ============================================================================

/**
 * Prompt 模板模型
 *
 * 存储可复用的 Prompt 模板
 */
model PromptTemplate {
  id          String   @id @default(cuid())
  name        String                              // 模板名称
  description String?                             // 模板描述
  category    PromptCategory                      // 模板分类
  content     String                              // Prompt 内容(支持变量)
  variables   Json?                               // 变量定义(JSON格式)
  isPublic    Boolean  @default(false)            // 是否公开
  usageCount  Int      @default(0)                // 使用次数
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String?                             // 创建者ID(可选,系统模板为null)
  user        User?    @relation(fields: [userId], references: [id])

  @@map("prompt_templates")
  @@index([category])
  @@index([userId])
}

/**
 * Prompt 模板分类枚举
 */
enum PromptCategory {
  WRITING      // 写作辅助
  OPTIMIZATION // 内容优化
  QNA          // 问答
  ANALYSIS     // 分析
  CUSTOM       // 自定义
}

/**
 * AI 对话记录模型
 *
 * 存储用户与 AI 的对话历史
 */
model AIConversation {
  id          String   @id @default(cuid())
  title       String?                             // 对话标题
  type        ConversationType                    // 对话类型
  context     Json?                               // 上下文信息(JSON)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String                              // 用户ID
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  messages    AIMessage[]                         // 对话消息

  @@map("ai_conversations")
  @@index([userId])
  @@index([type])
}

/**
 * AI 消息模型
 *
 * 存储对话中的单条消息
 */
model AIMessage {
  id             String   @id @default(cuid())
  role           MessageRole                       // 消息角色
  content        String                            // 消息内容
  metadata       Json?                             // 元数据(引用来源等)
  tokenCount     Int?                              // Token 数量
  createdAt      DateTime @default(now())

  conversationId String                            // 所属对话
  conversation   AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@map("ai_messages")
  @@index([conversationId])
}

/**
 * 消息角色枚举
 */
enum MessageRole {
  USER      // 用户消息
  ASSISTANT // AI 回复
  SYSTEM    // 系统消息
}

/**
 * 对话类型枚举
 */
enum ConversationType {
  WRITING_ASSISTANT  // 写作助手
  RAG_QA            // RAG 问答
  CONTENT_OPTIMIZE  // 内容优化
  GENERAL           // 通用对话
}

/**
 * 文章向量索引模型
 *
 * 存储文章的向量索引信息
 */
model PostVectorIndex {
  id          String   @id @default(cuid())
  postId      String   @unique                    // 文章ID
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  vectorId    String?                             // 向量数据库中的ID
  chunkCount  Int      @default(0)                // 分块数量
  indexedAt   DateTime @default(now())            // 索引时间
  updatedAt   DateTime @updatedAt                 // 更新时间

  @@map("post_vector_indexes")
  @@index([postId])
}

/**
 * 扩展 User 模型
 */
model User {
  // ... 现有字段 ...

  // 新增关系
  promptTemplates  PromptTemplate[]
  aiConversations  AIConversation[]
}

/**
 * 扩展 Post 模型
 */
model Post {
  // ... 现有字段 ...

  // 新增关系
  vectorIndex      PostVectorIndex?
}
```

### 数据库迁移

```bash
# 生成迁移文件
npx prisma migrate dev --name add_ai_features

# 应用迁移
npx prisma migrate deploy
```

---

## API 设计

### 1. AI 写作辅助 API

#### 1.1 内容补全

```typescript
POST /api/ai/write/complete

Request:
{
  "content": "当前内容",
  "cursorPosition": 100,        // 光标位置
  "context": "文章上下文",       // 可选
  "style": "formal" | "casual" | "technical"  // 可选
}

Response:
{
  "suggestions": [
    {
      "text": "补全的文本",
      "confidence": 0.95
    }
  ],
  "tokensUsed": 150
}
```

#### 1.2 内容优化

```typescript
POST /api/ai/write/optimize

Request:
{
  "content": "要优化的内容",
  "type": "seo" | "readability" | "style",
  "options": {
    "targetAudience": "technical",
    "tone": "professional"
  }
}

Response:
{
  "optimized": "优化后的内容",
  "suggestions": [
    {
      "type": "improvement",
      "text": "建议内容",
      "reason": "原因说明"
    }
  ],
  "tokensUsed": 200
}
```

#### 1.3 内容生成

```typescript
POST /api/ai/write/generate

Request:
{
  "type": "title" | "excerpt" | "tags" | "summary",
  "content": "文章内容",
  "options": {
    "count": 3,  // 生成数量(用于标题/标签)
    "style": "seo-friendly"
  }
}

Response:
{
  "results": [
    "生成的标题1",
    "生成的标题2",
    "生成的标题3"
  ],
  "tokensUsed": 180
}
```

### 2. RAG 知识库 API

#### 2.1 语义搜索

```typescript
POST /api/ai/rag/search

Request:
{
  "query": "搜索查询",
  "limit": 10,
  "filters": {
    "categoryId": "xxx",  // 可选
    "tags": ["tag1", "tag2"]  // 可选
  }
}

Response:
{
  "results": [
    {
      "postId": "xxx",
      "title": "文章标题",
      "excerpt": "相关片段",
      "score": 0.92,
      "chunkIndex": 0
    }
  ],
  "total": 25
}
```

#### 2.2 智能问答

```typescript
POST /api/ai/rag/query

Request:
{
  "question": "问题内容",
  "context": {
    "postId": "xxx",  // 可选,指定文章范围
    "conversationId": "xxx"  // 可选,对话上下文
  },
  "options": {
    "includeSources": true,
    "maxTokens": 1000
  }
}

Response:
{
  "answer": "AI 回答",
  "sources": [
    {
      "postId": "xxx",
      "title": "文章标题",
      "excerpt": "引用片段",
      "url": "/posts/xxx"
    }
  ],
  "tokensUsed": 850,
  "conversationId": "xxx"  // 新建或返回的对话ID
}
```

#### 2.3 索引管理

```typescript
// 构建索引
POST /api/ai/rag/index

Request:
{
  "postId": "xxx",  // 可选,指定文章;不指定则重建全部
  "force": false    // 是否强制重建
}

Response:
{
  "success": true,
  "indexed": 1,
  "message": "索引构建完成"
}

// 删除索引
DELETE /api/ai/rag/index/:postId

Response:
{
  "success": true,
  "message": "索引已删除"
}
```

### 3. Prompt 模板 API

#### 3.1 获取模板列表

```typescript
GET /api/ai/prompts?category=WRITING&public=true

Response:
{
  "templates": [
    {
      "id": "xxx",
      "name": "标题生成",
      "description": "根据内容生成标题",
      "category": "WRITING",
      "content": "你是一个专业的标题生成助手...",
      "variables": ["content", "style"],
      "isPublic": true,
      "usageCount": 150
    }
  ],
  "total": 20
}
```

#### 3.2 创建/更新模板

```typescript
POST /api/ai/prompts
PUT /api/ai/prompts/:id

Request:
{
  "name": "模板名称",
  "description": "模板描述",
  "category": "WRITING",
  "content": "Prompt 内容,支持 {{variable}} 变量",
  "variables": [
    {
      "name": "content",
      "description": "文章内容",
      "required": true
    }
  ],
  "isPublic": false
}

Response:
{
  "id": "xxx",
  "message": "模板创建成功"
}
```

#### 3.3 使用模板

```typescript
POST /api/ai/prompts/:id/execute

Request:
{
  "variables": {
    "content": "文章内容",
    "style": "formal"
  },
  "options": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}

Response:
{
  "result": "AI 生成的结果",
  "tokensUsed": 250
}
```

---

## 前端集成

### 1. 编辑器 AI 功能集成

#### 1.1 AI 助手面板组件

```typescript
// components/admin/ai-assistant-panel.tsx
"use client";

interface AIAssistantPanelProps {
  content: string;
  cursorPosition: number;
  onInsert: (text: string) => void;
}

export default function AIAssistantPanel({
  content,
  cursorPosition,
  onInsert,
}: AIAssistantPanelProps) {
  // AI 建议、内容生成等功能
}
```

#### 1.2 编辑器工具栏扩展

在现有 `FullscreenEditor` 组件中添加 AI 功能按钮:

```typescript
// 在编辑器工具栏添加
<Button onClick={handleAIComplete}>
  <Sparkles className="h-4 w-4" />
  AI 补全
</Button>
<Button onClick={handleAIOptimize}>
  <Wand2 className="h-4 w-4" />
  优化内容
</Button>
```

### 2. RAG 问答界面

```typescript
// components/admin/rag-qa-panel.tsx
"use client";

export default function RAGQAPanel() {
  // 问答界面,支持多轮对话
  // 显示引用来源
  // 支持选择文章范围
}
```

### 3. Prompt 模板管理界面

```typescript
// app/admin/ai/prompts/page.tsx
// Prompt 模板列表、创建、编辑界面
```

---

## RAG 知识库实现

### 1. 向量化流程

```typescript
// lib/vector/indexer.ts

/**
 * 文章向量化流程:
 * 1. 文章分块(按段落/句子)
 * 2. 生成嵌入向量
 * 3. 存储到向量数据库
 * 4. 记录索引信息到数据库
 */
export async function indexPost(postId: string) {
  // 1. 获取文章内容
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { category: true, tags: true },
  });

  // 2. 分块处理
  const chunks = chunkPost(post);

  // 3. 生成向量
  const embeddings = await generateEmbeddings(chunks);

  // 4. 存储到向量数据库
  const vectorIds = await vectorStore.upsert({
    vectors: embeddings,
    metadatas: chunks.map((chunk, i) => ({
      postId,
      chunkIndex: i,
      title: post.title,
      category: post.category?.name,
      tags: post.tags.map((t) => t.tag.name),
    })),
  });

  // 5. 更新索引记录
  await prisma.postVectorIndex.upsert({
    where: { postId },
    create: {
      postId,
      vectorId: vectorIds[0],
      chunkCount: chunks.length,
    },
    update: {
      chunkCount: chunks.length,
      updatedAt: new Date(),
    },
  });
}
```

### 2. 检索增强生成

```typescript
// lib/ai/rag.ts

export async function ragQuery(question: string, options: RAGOptions = {}) {
  // 1. 将问题向量化
  const queryVector = await generateEmbedding(question);

  // 2. 向量相似度搜索
  const results = await vectorStore.similaritySearch({
    queryVector,
    limit: options.limit || 5,
    filters: options.filters,
  });

  // 3. 构建上下文
  const context = results
    .map((r) => `[${r.metadata.title}]\n${r.content}`)
    .join("\n\n");

  // 4. 构建 Prompt
  const prompt = buildRAGPrompt(question, context);

  // 5. 调用 LLM
  const answer = await aiClient.chat({
    messages: [
      {
        role: "system",
        content: "你是一个基于知识库的问答助手...",
      },
      { role: "user", content: prompt },
    ],
  });

  return {
    answer: answer.content,
    sources: results.map((r) => ({
      postId: r.metadata.postId,
      title: r.metadata.title,
      excerpt: r.content,
    })),
  };
}
```

### 3. 文章分块策略

```typescript
// lib/vector/chunker.ts

/**
 * 文章分块策略:
 * - 按段落分块(优先)
 * - 段落过长则按句子分割
 * - 保留 Markdown 结构
 * - 每块 200-500 tokens
 */
export function chunkPost(post: Post): Chunk[] {
  const chunks: Chunk[] = [];

  // 按段落分割
  const paragraphs = post.content.split(/\n\n+/);

  for (const para of paragraphs) {
    if (estimateTokens(para) > 500) {
      // 段落过长,按句子分割
      const sentences = para.split(/[。！？\n]/);
      let currentChunk = "";

      for (const sentence of sentences) {
        if (estimateTokens(currentChunk + sentence) > 500) {
          chunks.push({ content: currentChunk, index: chunks.length });
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }

      if (currentChunk) {
        chunks.push({ content: currentChunk, index: chunks.length });
      }
    } else {
      chunks.push({ content: para, index: chunks.length });
    }
  }

  return chunks;
}
```

---

## Prompt 模板系统

### 1. 模板格式

```typescript
// Prompt 模板支持变量替换
const template = `
你是一个专业的{{role}}。

请根据以下内容:
{{content}}

生成{{type}}。

要求:
- 风格: {{style}}
- 长度: {{length}}
`;

// 使用
const prompt = renderTemplate(template, {
  role: "标题生成助手",
  content: "文章内容...",
  type: "3个SEO友好的标题",
  style: "专业且吸引人",
  length: "10-15字",
});
```

### 2. 预设模板

```typescript
// lib/ai/prompts/presets.ts

export const PRESET_PROMPTS = {
  TITLE_GENERATION: {
    name: "标题生成",
    category: "WRITING",
    content: `
根据以下文章内容,生成3个SEO友好且吸引人的标题:

内容:
{{content}}

要求:
- 长度控制在10-15字
- 包含核心关键词
- 风格: {{style}}
`,
    variables: ["content", "style"],
  },

  EXCERPT_GENERATION: {
    name: "摘要生成",
    category: "WRITING",
    content: `
为以下文章生成一个简洁的摘要:

文章标题: {{title}}
文章内容: {{content}}

要求:
- 长度: 100-200字
- 突出核心观点
- 吸引读者点击
`,
    variables: ["title", "content"],
  },

  // ... 更多预设模板
};
```

### 3. 模板执行

```typescript
// lib/ai/prompts/executor.ts

export async function executePrompt(
  templateId: string,
  variables: Record<string, any>,
  options: AIOptions = {}
) {
  // 1. 获取模板
  const template = await prisma.promptTemplate.findUnique({
    where: { id: templateId },
  });

  // 2. 渲染 Prompt
  const prompt = renderTemplate(template.content, variables);

  // 3. 调用 AI
  const result = await aiClient.chat({
    messages: [{ role: "user", content: prompt }],
    ...options,
  });

  // 4. 更新使用次数
  await prisma.promptTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: 1 } },
  });

  return result;
}
```

---

## 实施计划

### 阶段一: 基础 AI 功能 (2-3周)

1. **AI 客户端封装**
   - 支持多模型切换(OpenAI/Claude/本地模型)
   - 统一接口设计
   - 错误处理和重试机制

2. **基础写作辅助**
   - 内容补全 API
   - 内容优化 API
   - 编辑器集成

3. **Prompt 模板系统**
   - 数据库模型
   - 模板 CRUD API
   - 预设模板导入

### 阶段二: RAG 知识库 (3-4周)

1. **向量存储**
   - 选择向量数据库(推荐 Chroma 或 Qdrant)
   - 集成嵌入模型
   - 索引构建流程

2. **检索功能**
   - 语义搜索 API
   - 智能问答 API
   - 引用来源追踪

3. **自动索引**
   - 文章发布时自动索引
   - 批量重建索引
   - 索引状态管理

### 阶段三: 高级功能 (2-3周)

1. **对话系统**
   - 多轮对话支持
   - 对话历史管理
   - 上下文理解

2. **内容生成**
   - 标题/摘要/标签自动生成
   - SEO 优化建议
   - 可读性分析

3. **管理界面**
   - Prompt 模板管理界面
   - RAG 问答界面
   - AI 使用统计

### 阶段四: 优化和测试 (1-2周)

1. **性能优化**
   - 缓存策略
   - 批量处理优化
   - 响应时间优化

2. **用户体验**
   - UI/UX 优化
   - 错误提示优化
   - 加载状态优化

3. **测试和文档**
   - 单元测试
   - 集成测试
   - API 文档完善

---

## 技术选型

### AI 模型选择

| 模型         | 优势                        | 劣势             | 适用场景         |
| ------------ | --------------------------- | ---------------- | ---------------- |
| **Kimi**     | 中文能力强,超长上下文(200k) | 生态较新         | **中文内容首选** |
| OpenAI GPT-4 | 能力强,API稳定              | 成本高,需要代理  | 通用场景         |
| Claude 3     | 长文本处理强                | 成本较高         | 长文章处理       |
| Ollama(本地) | 免费,隐私好                 | 需要GPU,性能一般 | 开发/内网环境    |

**推荐方案**:

- 开发环境: Kimi (免费额度充足,中文优化好)
- 生产环境: Kimi (moonshot-v1-128k / moonshot-v1-32k)

### 向量数据库选择

| 数据库       | 优势                 | 劣势           | 适用场景       |
| ------------ | -------------------- | -------------- | -------------- |
| **Chroma**   | 开源免费,轻量,易部署 | 大规模性能一般 | **推荐，免费** |
| Qdrant       | 性能好,功能全        | 需要独立部署   | 中大型项目     |
| Pinecone     | 托管服务,稳定        | 💰 收费        | 企业级应用     |
| 本地向量存储 | 免费,简单            | 性能一般       | 开发/小项目    |

**推荐方案**:

- 开发环境: Chroma (本地)
- 生产环境: Chroma (免费，足够博客使用)

### 嵌入模型选择

| 模型                        | 优势                | 劣势              | 适用场景          |
| --------------------------- | ------------------- | ----------------- | ----------------- |
| **Ollama nomic-embed-text** | 本地免费,部署简单   | 中文效果一般      | **推荐,完全免费** |
| text-embedding-3-small      | 质量好,多语言       | 💰 需要OpenAI API | 追求效果          |
| BGE-large-zh                | 中文优化好,开源免费 | 需要Python环境    | 中文效果最好      |

**推荐方案**:

- 追求免费简单: Ollama nomic-embed-text (一行命令安装)
- 追求中文效果: BGE-large-zh (需要Python)

---

## 环境变量配置

```bash
# .env.local

# AI 模型配置 (Kimi - 有免费额度)
AI_PROVIDER=kimi
KIMI_API_KEY=sk-xxx                           # Moonshot API Key
KIMI_BASE_URL=https://api.moonshot.cn/v1      # Kimi API 地址
KIMI_MODEL=moonshot-v1-32k                    # 可选: moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k

# 向量数据库配置 (Chroma - 免费开源)
VECTOR_DB_PROVIDER=chroma
CHROMA_PATH=./data/chroma                     # Chroma 数据存储路径

# 嵌入模型配置 (Ollama - 本地免费)
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434        # Ollama 服务地址
OLLAMA_EMBEDDING_MODEL=nomic-embed-text       # 嵌入模型名称
EMBEDDING_DIMENSION=768                       # nomic-embed-text 维度

# AI 功能开关
ENABLE_AI_WRITING=true
ENABLE_RAG=true
ENABLE_AI_QA=true
```

---

## 注意事项

### 1. 成本控制

- 实现 Token 使用统计和限制
- 提供缓存机制减少 API 调用
- 支持本地模型降低成本

### 2. 隐私保护

- 敏感内容可选择本地模型
- 向量数据加密存储
- 用户数据访问控制

### 3. 性能优化

- 异步处理长时间任务
- 实现请求队列和限流
- 使用流式响应提升体验

### 4. 错误处理

- 完善的错误提示
- 降级方案(API失败时的处理)
- 日志记录和监控

---

## 总结

本方案提供了完整的 AI 集成技术方案,包括:

1. ✅ **功能设计**: 覆盖写作辅助、RAG、Prompt 管理等核心功能
2. ✅ **技术架构**: 清晰的模块划分和接口设计
3. ✅ **数据库设计**: 扩展 Schema 支持 AI 功能
4. ✅ **API 设计**: RESTful API 设计规范
5. ✅ **实施计划**: 分阶段实施,降低风险
6. ✅ **技术选型**: 提供多种方案选择

通过本方案的实施,博客系统将具备强大的 AI 能力,显著提升内容创作效率和质量。
