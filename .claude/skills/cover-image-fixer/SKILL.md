---
name: cover-image-fixer
description: 自动检索 docs/templates 目录中没有 coverImage 的 Markdown 文章，并添加封面图链接。当用户需要批量添加封面图、检查缺失封面图时自动使用此 Skill。
---

# 封面图修复器

自动检索并添加文章封面图。

## 功能

- **扫描检测** - 扫描 docs/templates 目录下所有 Markdown 文件
- **识别缺失** - 找出 frontmatter 中没有 coverImage 的文章
- **批量添加** - 为缺失封面图的文章添加链接
- **备份保护** - 修改前自动备份原文件

## 使用方法

```bash
python3 .claude/skills/cover-image-fixer/fix-covers.py "https://your-cover-image-url.com"
```

## 工作流程

```
1. 扫描 docs/templates/**/*.md
2. 解析每个文件的 frontmatter
3. 检查是否包含 coverImage 字段
4. 为缺失的文章添加封面图链接
5. 保存并报告修改结果
```

## Frontmatter 格式

```yaml
---
title: 文章标题
slug: article-slug
date: 2025-01-15
category: 分类
coverImage: https://example.com/cover.jpg  ← 需要添加这个
---
```

## 依赖

```bash
pip3 install pyyaml
```

## 示例

```bash
# 添加封面图
python3 .claude/skills/cover-image-fixer/fix-covers.py "https://s41.ax1x.com/2026/01/17/pZyCDTH.jpg"

# 输出示例：
# 📋 扫描 docs/templates 目录...
# 📊 发现 3 篇文章缺少封面图
#
# [1/3] docs/templates/essay/article1.md
#   ✅ 已添加封面图
#
# [2/3] docs/templates/js/article2.md
#   ✅ 已添加封面图
#
# ✅ 完成! 成功为 3 篇文章添加封面图
```
