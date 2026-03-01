# AI 集成实现指南

## 📋 目录

1. [快速开始](#快速开始)
2. [环境配置](#环境配置)
3. [依赖安装](#依赖安装)
4. [数据库迁移](#数据库迁移)
5. [核心模块实现](#核心模块实现)
6. [API 实现](#api-实现)
7. [前端集成](#前端集成)
8. [测试和调试](#测试和调试)

---

## 快速开始

### 1. 安装依赖

```bash
# Kimi 使用 OpenAI 兼容的 SDK
npm install openai chromadb
npm install -D @types/node

# 安装 Ollama (用于本地 embedding)
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# 拉取 embedding 模型
ollama pull nomic-embed-text
```

### 2. 配置环境变量

在 `.env.local` 中添加:

```bash
# AI 配置 (Kimi - 有免费额度)
AI_PROVIDER=kimi
KIMI_API_KEY=sk-your-kimi-key-here
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=moonshot-v1-32k

# 向量数据库 (Chroma - 免费开源)
VECTOR_DB_PROVIDER=chroma
CHROMA_PATH=./data/chroma

# 嵌入模型 (Ollama - 本地免费)
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### 3. 运行数据库迁移

```bash
npx prisma migrate dev --name add_ai_features
```

---

## 环境配置

### 完整环境变量列表

```bash
# ============================================
# AI 模型配置 (Kimi - 有免费额度)
# ============================================
AI_PROVIDER=kimi
KIMI_API_KEY=sk-xxx
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=moonshot-v1-32k  # moonshot-v1-8k | moonshot-v1-32k | moonshot-v1-128k

# ============================================
# 向量数据库配置 (Chroma - 免费开源)
# ============================================
VECTOR_DB_PROVIDER=chroma
CHROMA_PATH=./data/chroma

# ============================================
# 嵌入模型配置 (Ollama - 本地免费)
# ============================================
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768

# ============================================
# 功能开关
# ============================================
ENABLE_AI_WRITING=true
ENABLE_RAG=true
ENABLE_AI_QA=true

# ============================================
# 限制配置
# ============================================
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
RAG_MAX_RESULTS=5
```

---

## 依赖安装

### 必需依赖

```bash
# AI 客户端 (Kimi 使用 OpenAI SDK，因为 API 兼容)
npm install openai

# 向量数据库 (Chroma - 免费开源)
npm install chromadb

# 工具库
npm install zod  # 已有,用于类型验证
npm install dotenv  # 环境变量管理
```

### 可选依赖

```bash
# 本地模型支持
npm install ollama
```

### package.json 更新

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "chromadb": "^1.8.0",
    "dotenv": "^16.3.1"
  }
}
```

---

## 数据库迁移

### 1. 更新 Prisma Schema

在 `prisma/schema.prisma` 文件末尾添加:

```prisma
// ============================================================================
// AI 功能相关模型
// ============================================================================

model PromptTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  category    PromptCategory
  content     String
  variables   Json?
  isPublic    Boolean  @default(false)
  usageCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("prompt_templates")
  @@index([category])
  @@index([userId])
}

enum PromptCategory {
  WRITING
  OPTIMIZATION
  QNA
  ANALYSIS
  CUSTOM
}

model AIConversation {
  id          String   @id @default(cuid())
  title       String?
  type        ConversationType
  context     Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  messages    AIMessage[]

  @@map("ai_conversations")
  @@index([userId])
  @@index([type])
}

model AIMessage {
  id             String   @id @default(cuid())
  role           MessageRole
  content        String
  metadata       Json?
  tokenCount     Int?
  createdAt      DateTime @default(now())

  conversationId String
  conversation   AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@map("ai_messages")
  @@index([conversationId])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum ConversationType {
  WRITING_ASSISTANT
  RAG_QA
  CONTENT_OPTIMIZE
  GENERAL
}

model PostVectorIndex {
  id          String   @id @default(cuid())
  postId      String   @unique
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  vectorId    String?
  chunkCount  Int      @default(0)
  indexedAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("post_vector_indexes")
  @@index([postId])
}

// 扩展 User 模型
model User {
  // ... 现有字段保持不变 ...

  // 新增关系
  promptTemplates  PromptTemplate[]
  aiConversations  AIConversation[]
}

// 扩展 Post 模型
model Post {
  // ... 现有字段保持不变 ...

  // 新增关系
  vectorIndex      PostVectorIndex?
}
```

### 2. 运行迁移

```bash
# 生成迁移文件
npx prisma migrate dev --name add_ai_features

# 生成 Prisma Client
npx prisma generate
```

### 3. 初始化预设 Prompt 模板

创建 `prisma/seed-ai.ts`:

```typescript
import { PrismaClient, PromptCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAIPrompts() {
  const prompts = [
    {
      name: "标题生成",
      description: "根据文章内容生成SEO友好的标题",
      category: PromptCategory.WRITING,
      content: `根据以下文章内容,生成3个SEO友好且吸引人的标题:

内容:
{{content}}

要求:
- 长度控制在10-15字
- 包含核心关键词
- 风格: {{style}}
- 返回JSON格式: ["标题1", "标题2", "标题3"]`,
      variables: {
        content: { type: "string", required: true, description: "文章内容" },
        style: {
          type: "string",
          required: false,
          description: "标题风格",
          default: "专业",
        },
      },
      isPublic: true,
    },
    {
      name: "摘要生成",
      description: "自动生成文章摘要",
      category: PromptCategory.WRITING,
      content: `为以下文章生成一个简洁的摘要:

标题: {{title}}
内容: {{content}}

要求:
- 长度: 100-200字
- 突出核心观点
- 吸引读者点击`,
      variables: {
        title: { type: "string", required: true },
        content: { type: "string", required: true },
      },
      isPublic: true,
    },
    {
      name: "标签建议",
      description: "基于内容推荐标签",
      category: PromptCategory.WRITING,
      content: `根据以下文章内容,推荐5-8个相关标签:

标题: {{title}}
内容: {{content}}

要求:
- 标签简洁(2-4字)
- 覆盖主要主题
- 返回JSON数组格式`,
      variables: {
        title: { type: "string", required: true },
        content: { type: "string", required: true },
      },
      isPublic: true,
    },
  ];

  for (const prompt of prompts) {
    await prisma.promptTemplate.upsert({
      where: { name: prompt.name },
      update: prompt,
      create: prompt,
    });
  }

  console.log("AI Prompt 模板初始化完成");
}

seedAIPrompts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

运行:

```bash
tsx prisma/seed-ai.ts
```

---

## 核心模块实现

### 1. AI 客户端封装

创建 `src/lib/ai/client.ts`:

```typescript
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type AIProvider = "kimi" | "openai" | "claude" | "ollama";

export interface AIClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  embed(text: string | string[]): Promise<number[][]>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  tokensUsed?: number;
}

/**
 * Kimi 客户端 (Moonshot AI)
 * 使用 OpenAI SDK，因为 Kimi API 兼容 OpenAI 格式
 */
class KimiClient implements AIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.KIMI_API_KEY,
      baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
    });
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || process.env.KIMI_MODEL || "moonshot-v1-32k",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      tokensUsed: response.usage?.total_tokens,
    };
  }

  async embed(text: string | string[]): Promise<number[][]> {
    // Kimi 不支持 embedding，使用 Ollama
    return ollamaEmbed(text);
  }
}

/**
 * Ollama 本地 Embedding (免费)
 */
async function ollamaEmbed(text: string | string[]): Promise<number[][]> {
  const texts = Array.isArray(text) ? text : [text];
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

  const embeddings: number[][] = [];

  for (const t of texts) {
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: t }),
    });

    const data = await response.json();
    embeddings.push(data.embedding);
  }

  return embeddings;
}

class OpenAIClient implements AIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      tokensUsed: response.usage?.total_tokens,
    };
  }

  async embed(text: string | string[]): Promise<number[][]> {
    const texts = Array.isArray(text) ? text : [text];
    const response = await this.client.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  }
}

class ClaudeClient implements AIClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY!,
    });
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    // Claude 需要 system 消息单独处理
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const response = await this.client.messages.create({
      model:
        options.model || process.env.CLAUDE_MODEL || "claude-3-opus-20240229",
      max_tokens: options.maxTokens ?? 2000,
      system: systemMessage?.content,
      messages: conversationMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    return {
      content: content.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  async embed(text: string | string[]): Promise<number[][]> {
    // Claude 不直接支持嵌入,需要使用其他服务
    throw new Error("Claude does not support embeddings directly");
  }
}

// 工厂函数
export function createAIClient(provider?: AIProvider): AIClient {
  const providerName =
    provider || (process.env.AI_PROVIDER as AIProvider) || "kimi";

  switch (providerName) {
    case "kimi":
      return new KimiClient();
    case "openai":
      return new OpenAIClient();
    case "claude":
      return new ClaudeClient();
    default:
      throw new Error(`Unsupported AI provider: ${providerName}`);
  }
}

// 单例
let aiClientInstance: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = createAIClient();
  }
  return aiClientInstance;
}
```

### 2. 向量存储封装

创建 `src/lib/vector/store.ts`:

```typescript
import { ChromaClient, Collection } from "chromadb";

export interface VectorStore {
  upsert(vectors: Vector[]): Promise<string[]>;
  search(
    queryVector: number[],
    options: SearchOptions
  ): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
}

export interface Vector {
  id?: string;
  embedding: number[];
  metadata: Record<string, any>;
  document?: string;
}

export interface SearchOptions {
  limit?: number;
  filters?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  document?: string;
}

/**
 * Chroma 向量存储 (开源免费)
 */
class ChromaVectorStore implements VectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName = "blog_posts";

  constructor() {
    const path = process.env.CHROMA_PATH || "./data/chroma";
    this.client = new ChromaClient({ path });
    this.initialize();
  }

  private async initialize() {
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
      });
    } catch (error) {
      console.error("Failed to initialize Chroma collection:", error);
      throw error;
    }
  }

  async upsert(vectors: Vector[]): Promise<string[]> {
    if (!this.collection) {
      await this.initialize();
    }

    const ids = vectors.map((v, i) => v.id || `vec_${Date.now()}_${i}`);
    const embeddings = vectors.map((v) => v.embedding);
    const metadatas = vectors.map((v) => v.metadata);
    const documents = vectors.map((v) => v.document || "");

    await this.collection!.upsert({
      ids,
      embeddings,
      metadatas,
      documents,
    });

    return ids;
  }

  async search(
    queryVector: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.collection) {
      await this.initialize();
    }

    const results = await this.collection!.query({
      queryEmbeddings: [queryVector],
      nResults: options.limit || 5,
      where: options.filters,
    });

    return (results.ids[0] || []).map((id, i) => ({
      id: id as string,
      score: 1 - (results.distances?.[0]?.[i] || 0),
      metadata: (results.metadatas?.[0]?.[i] as Record<string, any>) || {},
      document: results.documents?.[0]?.[i] as string,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.collection) {
      await this.initialize();
    }

    await this.collection!.delete({ ids });
  }
}

// 工厂函数
export function createVectorStore(): VectorStore {
  const provider = process.env.VECTOR_DB_PROVIDER || "chroma";

  switch (provider) {
    case "chroma":
      return new ChromaVectorStore();
    default:
      throw new Error(`Unsupported vector store: ${provider}`);
  }
}

// 单例
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = createVectorStore();
  }
  return vectorStoreInstance;
}
```

### 3. 文章分块工具

创建 `src/lib/vector/chunker.ts`:

```typescript
export interface Chunk {
  content: string;
  index: number;
  metadata?: Record<string, any>;
}

/**
 * 估算文本的 token 数量(粗略估算)
 */
function estimateTokens(text: string): number {
  // 中文按字符数,英文按单词数估算
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text
    .split(/\s+/)
    .filter((w) => /[a-zA-Z]/.test(w)).length;
  // 1个中文字符 ≈ 1.5 tokens, 1个英文单词 ≈ 1.3 tokens
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3);
}

/**
 * 将文章内容分块
 */
export function chunkPost(
  content: string,
  options: {
    maxTokens?: number;
    overlap?: number;
  } = {}
): Chunk[] {
  const maxTokens = options.maxTokens || 500;
  const overlap = options.overlap || 50;
  const chunks: Chunk[] = [];

  // 按段落分割
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

  let currentChunk = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);

    if (paraTokens > maxTokens) {
      // 段落过长,先保存当前块
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
        });
        currentChunk = "";
      }

      // 按句子分割长段落
      const sentences = para.split(/[。！？\n]/).filter((s) => s.trim());
      let sentenceChunk = "";

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        const chunkTokens = estimateTokens(sentenceChunk + sentence);

        if (chunkTokens > maxTokens && sentenceChunk) {
          chunks.push({
            content: sentenceChunk.trim(),
            index: chunkIndex++,
          });
          // 保留重叠部分
          const overlapText = sentenceChunk.slice(-overlap);
          sentenceChunk = overlapText + sentence;
        } else {
          sentenceChunk += sentence;
        }
      }

      if (sentenceChunk.trim()) {
        chunks.push({
          content: sentenceChunk.trim(),
          index: chunkIndex++,
        });
      }
    } else {
      const chunkTokens = estimateTokens(currentChunk + para);

      if (chunkTokens > maxTokens && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
        });
        // 保留重叠部分
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + para;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
      }
    }
  }

  // 保存最后一个块
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
    });
  }

  return chunks;
}
```

### 4. RAG 检索实现

创建 `src/lib/ai/rag.ts`:

```typescript
import { getAIClient } from "./client";
import { getVectorStore } from "../vector/store";
import { prisma } from "../prisma";

export interface RAGOptions {
  limit?: number;
  filters?: {
    postId?: string;
    categoryId?: string;
    tags?: string[];
  };
  maxTokens?: number;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    postId: string;
    title: string;
    excerpt: string;
    score: number;
  }>;
  tokensUsed?: number;
}

/**
 * RAG 检索增强生成
 */
export async function ragQuery(
  question: string,
  options: RAGOptions = {}
): Promise<RAGResponse> {
  const aiClient = getAIClient();
  const vectorStore = getVectorStore();

  // 1. 将问题向量化
  const [queryVector] = await aiClient.embed(question);

  // 2. 构建过滤条件
  const filters: Record<string, any> = {};
  if (options.filters?.categoryId) {
    filters.categoryId = options.filters.categoryId;
  }
  if (options.filters?.tags && options.filters.tags.length > 0) {
    filters.tags = { $in: options.filters.tags };
  }

  // 3. 向量相似度搜索
  const searchResults = await vectorStore.search(queryVector, {
    limit: options.limit || 5,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // 4. 获取文章详细信息
  const postIds = [...new Set(searchResults.map((r) => r.metadata.postId))];
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
    },
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));

  // 5. 构建上下文
  const context = searchResults
    .map((result) => {
      const post = postMap.get(result.metadata.postId);
      if (!post) return null;
      return `[${post.title}]\n${result.document}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  // 6. 构建 Prompt
  const prompt = `基于以下知识库内容回答问题。如果知识库中没有相关信息,请说明无法回答。

知识库内容:
${context}

问题: ${question}

请提供准确、详细的回答,并在回答中引用相关来源。`;

  // 7. 调用 LLM
  const response = await aiClient.chat(
    [
      {
        role: "system",
        content:
          "你是一个基于知识库的问答助手。请根据提供的知识库内容回答问题,如果知识库中没有相关信息,请明确说明。",
      },
      { role: "user", content: prompt },
    ],
    {
      maxTokens: options.maxTokens || 1000,
    }
  );

  // 8. 构建来源信息
  const sources = searchResults.map((result) => {
    const post = postMap.get(result.metadata.postId);
    return {
      postId: result.metadata.postId,
      title: post?.title || "未知",
      excerpt: result.document?.slice(0, 200) || "",
      score: result.score,
    };
  });

  return {
    answer: response.content,
    sources,
    tokensUsed: response.tokensUsed,
  };
}
```

---

## API 实现

### 1. 内容补全 API

创建 `src/app/api/ai/write/complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAIClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { content, cursorPosition, context, style } = body;

    if (!content) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    // 获取光标前后的上下文
    const beforeCursor = content.slice(0, cursorPosition);
    const afterCursor = content.slice(cursorPosition);
    const lastParagraph = beforeCursor.split("\n\n").pop() || "";

    // 构建 Prompt
    const prompt = `请根据以下上下文,补全内容。只返回补全的部分,不要重复已有内容。

已有内容:
${lastParagraph}

后续内容:
${afterCursor.slice(0, 100)}

风格要求: ${style || "自然流畅"}

请补全内容:`;

    const aiClient = getAIClient();
    const response = await aiClient.chat([{ role: "user", content: prompt }], {
      maxTokens: 200,
      temperature: 0.7,
    });

    return NextResponse.json({
      suggestions: [
        {
          text: response.content.trim(),
          confidence: 0.9,
        },
      ],
      tokensUsed: response.tokensUsed,
    });
  } catch (error) {
    console.error("AI 补全错误:", error);
    return NextResponse.json({ error: "AI 补全失败" }, { status: 500 });
  }
}
```

### 2. 内容生成 API

创建 `src/app/api/ai/write/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAIClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { type, content, options } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: "类型和内容不能为空" },
        { status: 400 }
      );
    }

    const aiClient = getAIClient();
    let prompt = "";

    switch (type) {
      case "title":
        prompt = `根据以下文章内容,生成${options?.count || 3}个SEO友好且吸引人的标题:

内容:
${content.slice(0, 2000)}

要求:
- 长度控制在10-15字
- 包含核心关键词
- 风格: ${options?.style || "专业"}

请返回JSON数组格式,例如: ["标题1", "标题2", "标题3"]`;
        break;

      case "excerpt":
        prompt = `为以下文章生成一个简洁的摘要:

内容:
${content}

要求:
- 长度: 100-200字
- 突出核心观点
- 吸引读者点击`;
        break;

      case "tags":
        prompt = `根据以下文章内容,推荐5-8个相关标签:

内容:
${content.slice(0, 2000)}

要求:
- 标签简洁(2-4字)
- 覆盖主要主题
- 返回JSON数组格式`;
        break;

      default:
        return NextResponse.json({ error: "不支持的类型" }, { status: 400 });
    }

    const response = await aiClient.chat([{ role: "user", content: prompt }], {
      maxTokens: 500,
      temperature: 0.7,
    });

    // 尝试解析 JSON 结果
    let results: string[];
    try {
      results = JSON.parse(response.content);
    } catch {
      // 如果不是 JSON,按行分割
      results = response.content
        .split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);
    }

    return NextResponse.json({
      results,
      tokensUsed: response.tokensUsed,
    });
  } catch (error) {
    console.error("AI 生成错误:", error);
    return NextResponse.json({ error: "AI 生成失败" }, { status: 500 });
  }
}
```

### 3. RAG 问答 API

创建 `src/app/api/ai/rag/query/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ragQuery } from "@/lib/ai/rag";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { question, context, options } = body;

    if (!question) {
      return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    }

    // 执行 RAG 查询
    const response = await ragQuery(question, {
      limit: options?.limit || 5,
      filters: context?.postId
        ? { postId: context.postId }
        : context?.categoryId
          ? { categoryId: context.categoryId }
          : undefined,
      maxTokens: options?.maxTokens || 1000,
    });

    // 保存对话记录(可选)
    let conversationId = context?.conversationId;
    if (!conversationId) {
      const conversation = await prisma.aIConversation.create({
        data: {
          userId: session.user.id,
          type: "RAG_QA",
          title: question.slice(0, 50),
        },
      });
      conversationId = conversation.id;
    }

    // 保存消息
    await prisma.aIMessage.createMany({
      data: [
        {
          conversationId,
          role: "USER",
          content: question,
        },
        {
          conversationId,
          role: "ASSISTANT",
          content: response.answer,
          metadata: { sources: response.sources },
          tokenCount: response.tokensUsed,
        },
      ],
    });

    return NextResponse.json({
      answer: response.answer,
      sources: response.sources,
      tokensUsed: response.tokensUsed,
      conversationId,
    });
  } catch (error) {
    console.error("RAG 查询错误:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
```

### 4. 索引管理 API

创建 `src/app/api/ai/rag/index/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { indexPost } from "@/lib/vector/indexer";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { postId, force } = body;

    if (postId) {
      // 索引单篇文章
      await indexPost(postId, { force: force || false });
      return NextResponse.json({
        success: true,
        indexed: 1,
        message: "索引构建完成",
      });
    } else {
      // 批量重建索引
      // 实现批量索引逻辑
      return NextResponse.json({
        success: true,
        message: "批量索引功能开发中",
      });
    }
  } catch (error) {
    console.error("索引构建错误:", error);
    return NextResponse.json({ error: "索引构建失败" }, { status: 500 });
  }
}
```

创建 `src/lib/vector/indexer.ts`:

```typescript
import { prisma } from "../prisma";
import { getAIClient } from "../ai/client";
import { getVectorStore } from "./store";
import { chunkPost } from "./chunker";

export async function indexPost(
  postId: string,
  options: { force?: boolean } = {}
) {
  // 1. 获取文章
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  if (!post) {
    throw new Error("文章不存在");
  }

  // 2. 检查是否已索引
  const existingIndex = await prisma.postVectorIndex.findUnique({
    where: { postId },
  });

  if (existingIndex && !options.force) {
    console.log(`文章 ${postId} 已索引,跳过`);
    return;
  }

  // 3. 分块
  const chunks = chunkPost(post.content);

  // 4. 生成向量
  const aiClient = getAIClient();
  const texts = chunks.map((chunk) => chunk.content);
  const embeddings = await aiClient.embed(texts);

  // 5. 构建向量数据
  const vectors = chunks.map((chunk, i) => ({
    embedding: embeddings[i],
    metadata: {
      postId: post.id,
      chunkIndex: chunk.index,
      title: post.title,
      category: post.category?.name,
      tags: post.tags.map((pt) => pt.tag.name),
    },
    document: chunk.content,
  }));

  // 6. 存储到向量数据库
  const vectorStore = getVectorStore();
  const vectorIds = await vectorStore.upsert(vectors);

  // 7. 更新索引记录
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

  console.log(`文章 ${postId} 索引完成,共 ${chunks.length} 个块`);
}
```

---

## 前端集成

### 1. AI 助手面板组件

创建 `src/components/admin/ai-assistant-panel.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantPanelProps {
  content: string;
  onInsert: (text: string) => void;
}

export default function AIAssistantPanel({
  content,
  onInsert,
}: AIAssistantPanelProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateTitle = async () => {
    if (!content.trim()) {
      toast({
        title: "提示",
        description: "请先输入文章内容",
        variant: "default",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/write/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "title",
          content,
          options: { count: 3 },
        }),
      });

      if (!response.ok) throw new Error("生成失败");

      const data = await response.json();
      toast({
        title: "标题生成成功",
        description: data.results.join(", "),
      });
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 p-2 border-t">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerateTitle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        生成标题
      </Button>
      <Button size="sm" variant="outline" disabled>
        <Wand2 className="h-4 w-4 mr-2" />
        优化内容
      </Button>
    </div>
  );
}
```

### 2. 在编辑器中集成

修改 `src/components/admin/fullscreen-editor.tsx`,添加 AI 助手:

```typescript
// 在组件顶部导入
import AIAssistantPanel from "./ai-assistant-panel";

// 在编辑器底部添加
<div className="border-t">
  <AIAssistantPanel
    content={content}
    onInsert={(text) => {
      // 在光标位置插入文本
      const newContent = content + "\n\n" + text;
      onContentChange(newContent);
    }}
  />
</div>
```

---

## 测试和调试

### 1. 测试 AI 客户端 (Kimi + Ollama)

创建 `scripts/test-ai.ts`:

```typescript
import { getAIClient } from "../src/lib/ai/client";

async function test() {
  const client = getAIClient(); // 默认使用 Kimi

  // 测试 Kimi 聊天
  const response = await client.chat([
    { role: "system", content: "你是一个专业的技术博客助手" },
    { role: "user", content: "你好,请介绍一下自己" },
  ]);

  console.log("Kimi 回复:", response.content);
  console.log("Token 使用:", response.tokensUsed);

  // 测试 Ollama embedding
  const embeddings = await client.embed("测试文本");
  console.log("Embedding 维度:", embeddings[0].length); // 应该是 768
}

test().catch(console.error);
```

运行前确保 Ollama 服务已启动:

```bash
# 启动 Ollama 服务
ollama serve

# 另一个终端运行测试
tsx scripts/test-ai.ts
```

### 2. 测试向量存储

创建 `scripts/test-vector.ts`:

```typescript
import { getVectorStore } from "../src/lib/vector/store";
import { getAIClient } from "../src/lib/ai/client";

async function test() {
  const vectorStore = getVectorStore();
  const aiClient = getAIClient();

  // 生成测试向量
  const [embedding] = await aiClient.embed("这是一篇关于 Next.js 的文章");

  // 存储
  const ids = await vectorStore.upsert([
    {
      embedding,
      metadata: { postId: "test-1", title: "测试文章" },
      document: "这是一篇关于 Next.js 的文章",
    },
  ]);

  console.log("存储成功,ID:", ids[0]);

  // 搜索
  const [queryVector] = await aiClient.embed("Next.js 框架");
  const results = await vectorStore.search(queryVector, { limit: 5 });

  console.log("搜索结果:", results);
}

test().catch(console.error);
```

### 3. 测试 RAG

创建 `scripts/test-rag.ts`:

```typescript
import { ragQuery } from "../src/lib/ai/rag";

async function test() {
  const response = await ragQuery("Next.js 是什么?", {
    limit: 3,
  });

  console.log("回答:", response.answer);
  console.log("来源:", response.sources);
}

test().catch(console.error);
```

---

## 下一步

1. ✅ 完成基础 AI 功能集成
2. ✅ 实现 RAG 知识库
3. ⏳ 完善前端 UI
4. ⏳ 添加更多 Prompt 模板
5. ⏳ 性能优化和缓存
6. ⏳ 添加使用统计和监控

---

## 常见问题

### Q: 如何切换 AI 模型?

A: 修改 `.env.local` 中的 `AI_PROVIDER`:

- `kimi`: 使用 Moonshot AI (推荐，中文效果好，有免费额度)
- `openai`: 使用 OpenAI GPT (收费)
- `ollama`: 使用本地模型 (免费)

### Q: 如何获取 Kimi API Key?

A: 访问 [Moonshot AI 开放平台](https://platform.moonshot.cn/) 注册并创建 API Key。新用户有免费额度。

### Q: 如何启动 Ollama embedding 服务?

A:

```bash
# 1. 确保 Ollama 已安装
ollama --version

# 2. 拉取 embedding 模型 (首次需要)
ollama pull nomic-embed-text

# 3. 启动 Ollama 服务 (如果没有自动启动)
ollama serve
```

### Q: 向量数据库数据存储在哪里?

A: Chroma 数据存储在 `./data/chroma` 目录，完全本地化，无需网络。

### Q: 如何批量索引已有文章?

A: 创建脚本遍历所有文章并调用 `indexPost` 函数。

### Q: 成本如何控制?

A: 本方案**完全免费**:

- **Kimi**: 有免费额度，个人博客基本够用
- **Chroma**: 开源免费
- **Ollama embedding**: 本地运行，完全免费

---

## 参考资源

- [Kimi API 文档 (Moonshot AI)](https://platform.moonshot.cn/docs)
- [Chroma 文档](https://docs.trychroma.com/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [RAG 最佳实践](https://www.pinecone.io/learn/retrieval-augmented-generation/)
