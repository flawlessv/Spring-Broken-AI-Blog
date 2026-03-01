---
title: Claude Code Skills实践
slug: claude-code-skills-guide
published: true
category: ai
publishedAt: 2026-01-05
readingTime: 10
coverImage: https://pic1.imgdb.cn/item/696c6c3dcc965d6157f6ba56.jpg
---

> Skills最近特别火，但是因为目前的Ai能力已经能很满足我的日常开发/其他需求，所以一直没深入了解过，今天抽空研究下写个博客

## 什么是 Skills？

Claude Code 虽然名字里带个 Code，但它绝不仅仅是写代码的工具。它是一个真正的通用 Agent，能帮你处理电脑上各种繁琐的工作。而 **Skill，就是它能力无限扩展的"插件包"**。

简单来说，**Skill 是一个"能力单元"**，它把专业知识、工作流程和最佳实践打包起来，让 Claude Code 能够自动调用。

最关键的区别在于：你不需要像用斜杠命令（/command）那样手动触发它。**CC 会根据对话上下文，自己判断什么时候该用哪个 Skill**。

它就像一个有经验的同事，看到你在处理某个特定任务，会主动过来说："这个我熟，我来帮你。"

### Skills 的作用范围

Skills 可以根据你的需要，存储在不同位置，作用范围也不同：

- **对于个人**：你可以把你最常用的代码片段、写作风格、数据分析流程，封装成个人 Skill。从此，Claude Code 就是最懂你的那个助手。

- **对于团队**：团队的设计规范、API 使用指南、项目提交流程……这些都可以做成项目 Skill，放在代码仓库里共享。新成员加入，CC 自动就能带他上路，再也不需要一遍遍地人肉培训。

> 💡 **团队协作首选项目 Skills**，因为它们可以被检入 git，团队成员拉下代码就能自动获得新能力。

## 30 秒上手 Skill 创建

### 第一步：创建你的 Skill 目录

```bash
# 创建个人 Skill，只有你能用
mkdir -p ~/.claude/skills/my-skill

# 或者，创建项目 Skill，团队可以共享
mkdir -p .claude/skills/my-company-skill
```

### 第二步：编写 SKILL.md 文件

Skill 的核心，由两部分组成：**YAML frontmatter（元数据）** 和 **Markdown（指令）**。

```yaml
---
name: your-skill-name
description: 简要描述这个 Skill 做什么以及何时使用它
---

# 你的 Skill 名称

## 指令
为 Claude 提供清晰的分步指导。

## 示例
展示使用这个 Skill 的具体示例。
```

### 命名规范

- `name` 字段推荐使用**英文**，且**动名词形式**（动词 + -ing），让能力一目了然。

  ✅ 推荐：`processing-pdfs`, `analyzing-spreadsheets`, `writing-documentation`

  ❌ 避免：`helper`, `utils`, `documents`（过于模糊）

- `description` 字段是 Claude Code 能否"智能"激活你的 Skill 的关键。它必须用**第三人称**清晰地描述"它能做什么"以及"什么时候用它"。

#### 好的描述示例

```yaml
---
name: Feynman-Simplifier-Skill
description: 将任何复杂的科学、技术或哲学概念，转化为 5 岁孩童都能听懂的类比，并精准定位用户的知识盲区。
---
```

#### 不好的描述示例

```yaml
---
name: 解释器
description: 这是一个用来解释东西的工具，可以把难懂的变简单。
---
```

**描述越精确，包含的触发关键词越多**（如 git diff, commit message），Claude Code 就越"懂你"。

### 第三步：目录架构（⚠️ 最容易出错的地方）

```
~/.claude/
└── skills/
    └── my-skill/           ← 所有 SKILL.md 都需要放在文件夹中
        └── SKILL.md        ← 这就是你的 skill 文档
```

这时候，当你再去 Claude Code 里面输入 `/skills` 指令，就能够清晰地看到你的目录中有哪些 skill 是存在的。对，就这么简单！

### 让 Claude Code 自己写 Skill

你甚至可以让 Claude Code 自己给你写一个 skill：

```markdown
请给我生成一个优秀且完整的 SKILL.md，功能是：

- 【描述你要的功能】

要求：

1. 需要含有规范的 YAML frontmatter
2. name 使用动名词形式
3. description 使用第三人称，包含触发术语
4. 添加 Instructions 和 Examples 章节
```

## 一个真实的用法：自动化博客图片处理，从手动到智能的飞跃

写博客最烦的是什么？不是写不出内容，而是——**图片处理**。

每次写完文章，都要经历这样一个痛苦流程：

1. 从网上找合适的配图
2. 手动下载到本地
3. 用工具压缩（不压缩加载慢，压缩太多质量差）
4. 手动上传到图床
5. 复制图片链接，替换文章里的本地路径

一篇技术文章十几张图片，光处理图片就要花半小时。而且每次都要重复这些操作，枯燥又容易出错。

于是，我们创建了一个叫 `processing-blog-images` 的项目 Skill：

```yaml
---
name: processing-blog-images
description: 自动下载博客文章中的图片，进行智能压缩优化，上传到图床，并自动替换文章中的图片链接。当用户需要处理博客文章的图片时使用，支持批量处理、格式转换和质量优化。
---

# 指令

当用户需要处理博客文章中的图片时，按以下步骤执行：

1. **扫描文章**：从 Markdown 文件中提取所有图片链接
2. **下载图片**：将图片下载到临时目录
3. **智能压缩**：
   - JPEG 图片：质量降至 80%，使用 progressive 编码
   - PNG 图片：使用 pngquant 压缩，转为 8 位
   - WebP 格式：优先转换为 WebP（更小的体积）
4. **上传图床**：将压缩后的图片上传到配置的图床服务
5. **替换链接**：自动更新 Markdown 文件中的图片链接为图床链接
6. **生成报告**：显示压缩前后的大小对比，节省的流量

## 工具要求

- `curl` 或 `wget`：下载图片
- `imagemagick` 或 `sharp`：图片压缩
- 图床 API：上传图片（如 imgbb、cloudinary 等）

## 示例

**输入**：
```

请处理我的博客文章 docs/example.md 中的所有图片

```

**输出**：
```

✓ 找到 12 张图片
✓ 下载完成：12/12
✓ 压缩优化完成：

- 原始大小：4.2 MB
- 优化后：892 KB
- 节省：78%
  ✓ 上传图床完成：12/12
  ✓ 链接替换完成

优化详情：

- header.png 1.2 MB → 245 KB (WebP)
- screenshot1.jpg 856 KB → 168 KB (质量 80%)
- diagram.png 234 KB → 89 KB (pngquant)
  ...

```

```

现在，每当我写完一篇博客文章，只需要对 Claude Code 说一句："帮我处理这篇文章的所有图片"，CC 就会自动激活这个 Skill：

- 下载所有网络图片
- 智能选择最佳压缩方案
- 批量上传到图床
- 一键替换所有链接

**整个过程从原来的 30 分钟缩短到 2 分钟**。而且压缩质量比我自己手动调的还好——AI 会根据图片类型自动选择最优方案：照片用 JPEG 80%，截图用 WebP，图标用 pngquant。

这只是冰山一角，你可以用它来：

- 批量处理历史文章的图片（节省流量成本）
- 自动生成不同尺寸的响应式图片
- 检测损坏的图片链接并自动修复
- 为图片添加自动生成的 Alt 文本（提升 SEO）

最重要的是，**Skill 能把每个人的能力给抽象化成为一种模块组件**；让这个组件可以在团队内部，甚至于外部进行流通。

## 结语：巨鲸潜行，万物生长

如果说之前的 AI 是一个无所不知的"巨鲸"，那 Skill 机制则让整个生态"万物生长"。

它把定义"能力"的权力，从 AI 公司交还给了每一位用户、每一个团队。我们不再只是被动的使用者，而是主动的"训练师"和"赋能者"。

我们正在见证一个新时代的开启：AI 将不再是一个个孤立的"大脑"，而是能够深度融入我们工作流、理解我们独特上下文的"超级伙伴"。

如果你也想体验电脑上最智能的 AI，感受这种"人机合一"的默契，一定要试试 Claude Code 和它的 Skill 功能。

万事开头难，但这篇文章已经为你铺平了最开始的道路。当你遇到任何重复性的、繁琐的工作时，不妨打开 Claude Code，跟它聊聊，或者干脆为它创建一个 Skill。

相信我，你很快会找到属于自己的"Aha Moment"！
