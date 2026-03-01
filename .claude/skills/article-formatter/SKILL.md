---
name: article-formatter
description: 为指定的 Markdown 文章添加完整的 frontmatter 头信息，包括 title、slug、category、readingTime 等字段。当用户需要格式化文章、添加文章头信息时使用此 Skill。
---

# Markdown 文章格式化器

为 Markdown 文章添加标准的 frontmatter 头信息。

## 功能

- **自动生成标题** - 从内容提取或使用文件名
- **生成 slug** - 自动转换为 URL 友好格式
- **识别分类** - 根据文件所在目录
- **计算阅读时间** - 根据字数自动计算
- **添加封面图** - 可选参数

## 使用方法

```bash
# 格式化文章（不含封面图）
python3 .claude/skills/article-formatter/format.py "docs/templates/essay/article.md"

# 格式化文章（含封面图）
python3 .claude/skills/article-formatter/format.py "docs/templates/essay/article.md" "https://example.com/cover.jpg"
```

## 生成的 Frontmatter

```yaml
---
title: 文章标题
slug: article-slug
published: true
featured: false
category: 分类
publishedAt: 2026-01-18
readingTime: 10
coverImage: https://example.com/cover.jpg # 可选
---
```

## 分类映射

| 目录   | 分类       |
| ------ | ---------- |
| AI/    | ai         |
| js/    | javascript |
| React/ | react      |
| essay/ | essay      |
| 其他   | 目录名小写 |
