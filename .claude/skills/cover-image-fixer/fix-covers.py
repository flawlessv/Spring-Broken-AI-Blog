#!/usr/bin/env python3
"""
封面图修复器 - 自动为缺少 coverImage 的文章添加封面图
"""

import sys
from pathlib import Path
import re

def find_articles_without_cover():
    """查找所有没有 coverImage 的文章"""
    templates_dir = Path("docs/templates")
    articles = []

    for md_file in templates_dir.rglob("*.md"):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 检查是否有 frontmatter
        if not content.startswith('---'):
            continue

        # 提取 frontmatter
        frontmatter_end = content.find('---', 3)
        if frontmatter_end == -1:
            continue

        frontmatter = content[3:frontmatter_end]

        # 检查是否已有 coverImage
        if 'coverImage:' not in frontmatter:
            articles.append(md_file)

    return articles


def add_cover_image(file_path, cover_url):
    """为文章添加封面图"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 找到 frontmatter 的结束位置
    frontmatter_end = content.find('---', 3)
    if frontmatter_end == -1:
        return False, "无法找到 frontmatter 结束标记"

    # 在 frontmatter 结束前插入 coverImage
    before = content[:frontmatter_end]
    after = content[frontmatter_end:]

    # 检查 frontmatter 中是否有其他字段，决定换行
    if before.strip() and not before.rstrip().endswith('\n'):
        new_content = before + f"\ncoverImage: {cover_url}\n" + after
    else:
        new_content = before + f"coverImage: {cover_url}\n" + after

    # 写入文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True, "成功添加封面图"


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("❌ 请提供封面图链接")
        print("用法: python3 fix-covers.py \"https://your-cover-image-url.com\"")
        sys.exit(1)

    cover_url = sys.argv[1].strip()

    print("📋 扫描 docs/templates 目录...")

    articles = find_articles_without_cover()

    if not articles:
        print("✅ 所有文章都已有封面图!")
        return

    print(f"📊 发现 {len(articles)} 篇文章缺少封面图")
    print()

    success_count = 0
    failed_count = 0

    for i, article in enumerate(articles, 1):
        rel_path = article.relative_to(Path.cwd())
        print(f"[{i}/{len(articles)}] {rel_path}")

        success, msg = add_cover_image(article, cover_url)

        if success:
            print(f"   ✅ {msg}")
            success_count += 1
        else:
            print(f"   ❌ {msg}")
            failed_count += 1
        print()

    print("=" * 50)
    print(f"✅ 完成! 成功: {success_count}, 失败: {failed_count}")
    print("=" * 50)


if __name__ == "__main__":
    main()
