import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

// 在创建 PrismaClient 之前加载环境变量
const envFile = join(process.cwd(), ".env.production");
try {
  const envContent = readFileSync(envFile, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.log("✅ 已加载 .env.production 文件");
} catch (error) {
  // 如果文件不存在，尝试读取 .env
  try {
    const envFile2 = join(process.cwd(), ".env");
    const envContent = readFileSync(envFile2, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value.trim();
        }
      }
    });
    console.log("✅ 已加载 .env 文件");
  } catch (error2) {
    console.log("⚠️  未找到 .env.production 或 .env 文件，使用系统环境变量");
  }
}

// 验证 DATABASE_URL 是否存在
if (!process.env.DATABASE_URL) {
  console.error("❌ 错误: DATABASE_URL 环境变量未设置");
  console.error("请确保 .env.production 文件存在且包含 DATABASE_URL");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始数据库种子...");

  // 创建默认管理员用户
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "0919",
    12
  );

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "zhaoshiwei1@xiaomi.com",
      password: adminPassword,
      role: "ADMIN",
      profile: {
        create: {
          displayName: "春光摧折",
          bio: "永言配命｜莫向外求",
          avatar: "/images/avatar.jpg",
          website: "http://powder.icu/",
          github: "https://github.com/flawlessv",
          wechat: "spring_broken_0707",
          phone: "19838558988",
        },
      },
    },
  });

  console.log("✅ 创建管理员用户:", adminUser.username);

  // 创建默认分类
  const categories = [
    {
      name: "AI",
      slug: "ai",
      description: "人工智能、大模型、机器学习相关内容",
      color: "#8B5CF6",
      icon: "🧑🏻‍🎤",
      sortOrder: 2,
    },
    {
      name: "前端",
      slug: "frontend",
      description: "前端开发技术、框架、工具分享",
      color: "#3B82F6",
      icon: "🪷",
      sortOrder: 1,
    },
    {
      name: "源码",
      slug: "source-code",
      description: "开源项目源码分析与解读",
      color: "#10B981",
      icon: "🔍",
      sortOrder: 3,
    },
    {
      name: "编程",
      slug: "programming",
      description: "编程基础知识、算法、数据结构",
      color: "#F59E0B",
      icon: "🧮",
      sortOrder: 4,
    },
    {
      name: "软技能",
      slug: "soft-skills",
      description: "沟通技巧、思维方法、职场经验",
      color: "#EF4444",
      icon: "🍋‍🟩",
      sortOrder: 5,
    },
    {
      name: "随笔",
      slug: "essays",
      description: "生活感悟、思考随笔、日常记录",
      color: "#14B8A6",
      icon: "📝",
      sortOrder: 6,
    },
  ];

  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: {
        name: categoryData.name,
        description: categoryData.description,
        color: categoryData.color,
        icon: categoryData.icon,
        sortOrder: categoryData.sortOrder,
      },
      create: categoryData,
    });
    console.log("✅ 创建分类:", category.name);
  }

  // 创建一些示例标签
  const tags = [
    { name: "HTML", slug: "html", color: "#E34F26" },
    { name: "CSS", slug: "css", color: "#1572B6" },
    { name: "JavaScript", slug: "js", color: "#F7DF1E" },
    { name: "TypeScript", slug: "ts", color: "#3178C6" },
    { name: "Node.js", slug: "node", color: "#339933" },
    { name: "React", slug: "react", color: "#61DAFB" },
    { name: "Prompt", slug: "prompt", color: "#FF6B6B" },
    { name: "MCP", slug: "mcp", color: "#4ECDC4" },
    { name: "RAG", slug: "rag", color: "#9B59B6" },
    { name: "Agent", slug: "agent", color: "#E74C3C" },
    { name: "Git", slug: "git", color: "#F05032" },
    // 保留一些常用的技术标签
    { name: "Next.js", slug: "nextjs", color: "#000000" },
    { name: "Prisma", slug: "prisma", color: "#2D3748" },
    { name: "算法", slug: "algorithm", color: "#95A5A6" },
    { name: "生活", slug: "life", color: "#F39C12" },
  ];

  for (const tagData of tags) {
    const tag = await prisma.tag.upsert({
      where: { slug: tagData.slug },
      update: {
        name: tagData.name,
        color: tagData.color,
      },
      create: tagData,
    });
    console.log("✅ 创建标签:", tag.name);
  }

  // 创建初始化文章
  const aiCategory = await prisma.category.findUnique({
    where: { slug: "ai" },
  });
  const frontendCategory = await prisma.category.findUnique({
    where: { slug: "frontend" },
  });

  // 获取常用标签（提前查询，避免重复）
  const nextjsTag = await prisma.tag.findUnique({ where: { slug: "nextjs" } });
  const prismaTag = await prisma.tag.findUnique({ where: { slug: "prisma" } });
  const reactTag = await prisma.tag.findUnique({ where: { slug: "react" } });
  const tsTag = await prisma.tag.findUnique({ where: { slug: "ts" } });

  if (aiCategory) {
    const aiPost = await prisma.post.upsert({
      where: { slug: "welcome-to-my-blog" },
      update: {},
      create: {
        title: "欢迎来到我的博客",
        slug: "welcome-to-my-blog",
        content: `# 欢迎来到我的博客 👋

大家好！欢迎来到我的技术博客。这里将记录我在技术学习和工作中的思考与实践。

## 关于这个博客

这是一个基于 **Next.js 14** 和 **Prisma** 构建的全栈博客系统，具有以下特性：

- 📝 **Markdown 编辑器**：支持富文本编辑和 Markdown 语法
- 🎨 **现代化 UI**：使用 Tailwind CSS 打造美观界面
- 🤖 **AI 助手**：集成 AI 功能辅助写作
- 🖼️ **图片管理**：完善的图片上传和管理系统
- 🔍 **全文搜索**：支持文章内容搜索
- 🏷️ **标签分类**：灵活的内容组织方式

## 博客内容方向

这个博客主要分享以下内容：

### 🧑🏻‍🎤 AI 技术
- 大模型应用开发
- Prompt Engineering
- RAG 系统实践
- AI Agent 开发

### 🪷 前端开发
- React / Next.js 实践
- TypeScript 开发技巧
- 前端工程化
- 性能优化

### 🔍 源码解析
- 开源项目源码分析
- 框架设计思想
- 最佳实践总结

## 联系方式

如果你对文章内容有任何疑问或建议，欢迎通过以下方式联系我：

- GitHub: [flawlessv](https://github.com/flawlessv)
- 网站: [powder.icu](http://powder.icu/)
- Bilibili: INFJ_LIB_0919

期待与你交流！✨`,
        excerpt:
          "欢迎来到我的技术博客！这里分享 AI、前端开发、源码解析等技术内容。",
        published: true,
        featured: true,
        categoryId: aiCategory.id,
        authorId: adminUser.id,
      },
    });
    console.log("✅ 创建文章:", aiPost.title);

    // 关联标签
    if (nextjsTag) {
      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: aiPost.id, tagId: nextjsTag.id },
        },
        update: {},
        create: { postId: aiPost.id, tagId: nextjsTag.id },
      });
    }
    if (prismaTag) {
      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: aiPost.id, tagId: prismaTag.id },
        },
        update: {},
        create: { postId: aiPost.id, tagId: prismaTag.id },
      });
    }
    if (reactTag) {
      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: aiPost.id, tagId: reactTag.id },
        },
        update: {},
        create: { postId: aiPost.id, tagId: reactTag.id },
      });
    }
  }

  if (frontendCategory) {
    const frontendPost = await prisma.post.upsert({
      where: { slug: "next-js-getting-started" },
      update: {},
      create: {
        title: "Next.js 入门指南",
        slug: "next-js-getting-started",
        content: `# Next.js 入门指南

Next.js 是一个强大的 React 框架，提供了服务端渲染、静态生成、API 路由等功能。

## 为什么选择 Next.js？

### 1. 开箱即用的功能
- **服务端渲染 (SSR)**：提升 SEO 和首屏加载速度
- **静态生成 (SSG)**：构建时生成静态页面
- **API 路由**：轻松创建后端 API
- **文件系统路由**：基于文件的路由系统

### 2. 优秀的开发体验
- 快速刷新（Fast Refresh）
- TypeScript 支持
- 内置 CSS 支持
- 图片优化

### 3. 生产级性能
- 自动代码分割
- 图片优化
- 字体优化
- 性能监控

## 快速开始

\`\`\`bash
# 创建新项目
npx create-next-app@latest my-app

# 进入项目目录
cd my-app

# 启动开发服务器
npm run dev
\`\`\`

## 基础概念

### 页面路由
\`\`\`typescript
// app/page.tsx
export default function Home() {
  return <h1>Hello Next.js!</h1>
}
\`\`\`

### 数据获取
\`\`\`typescript
async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <main>{/* 渲染数据 */}</main>
}
\`\`\`

## 总结

Next.js 是现代 Web 开发的优秀选择，无论是个人博客还是大型应用都能胜任。

Happy coding! 🚀`,
        excerpt:
          "Next.js 是一个强大的 React 框架，本文介绍了 Next.js 的核心特性和快速入门方法。",
        published: true,
        featured: false,
        categoryId: frontendCategory.id,
        authorId: adminUser.id,
      },
    });
    console.log("✅ 创建文章:", frontendPost.title);

    // 关联标签
    if (nextjsTag) {
      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: frontendPost.id, tagId: nextjsTag.id },
        },
        update: {},
        create: { postId: frontendPost.id, tagId: nextjsTag.id },
      });
    }
    if (reactTag) {
      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: frontendPost.id, tagId: reactTag.id },
        },
        update: {},
        create: { postId: frontendPost.id, tagId: reactTag.id },
      });
    }
    if (tsTag) {
      await prisma.postTag.upsert({
        where: {
          postId_tagId: { postId: frontendPost.id, tagId: tsTag.id },
        },
        update: {},
        create: { postId: frontendPost.id, tagId: tsTag.id },
      });
    }
  }

  console.log("🎉 数据库种子完成!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
