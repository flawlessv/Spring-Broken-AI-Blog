#!/usr/bin/env python3
"""
Markdown 文章格式化器 - 为单篇文章添加 frontmatter
"""

import sys
from pathlib import Path
import re
from datetime import datetime

def generate_slug(text):
    """生成 slug"""
    # 移除中文字符，只保留英文、数字
    text = re.sub(r'[\u4e00-\u9fff]+', '-', text)
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'-+', '-', text)
    text = text.strip('-')
    return text if text else 'article'

def extract_title(content):
    """提取标题"""
    # 尝试从第一个 # 标题提取
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    # 使用第一行
    first_line = content.split('\n')[0].strip()
    return first_line[:50] if first_line else "未命名文章"

def calculate_reading_time(content):
    """计算阅读时间"""
    # 移除 frontmatter
    if content.startswith('---'):
        end = content.find('---', 3)
        if end != -1:
            content = content[end+3:]

    chinese = len(re.findall(r'[\u4e00-\u9fff]', content))
    english = len(re.findall(r'[a-zA-Z]+', content))
    return max(1, round((chinese + english) / 400))

def get_category(file_path):
    """从路径获取分类"""
    parent = file_path.parent.name
    mapping = {'AI': 'ai', 'js': 'javascript', 'React': 'react', 'essay': 'essay'}
    return mapping.get(parent, parent.lower())

def add_frontmatter(file_path, cover_image=None):
    """添加 frontmatter"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查是否已有
    if content.startswith('---'):
        print("  ⚠️  已有 frontmatter，跳过")
        return False

    title = extract_title(content)
    slug = generate_slug(title)
    category = get_category(file_path)
    reading_time = calculate_reading_time(content)
    published_at = datetime.fromtimestamp(file_path.stat().st_mtime).strftime('%Y-%m-%d')

    # 构建 frontmatter
    fm = f"""---
title: {title}
slug: {slug}
published: true
featured: false
category: {category}
publishedAt: {published_at}
readingTime: {reading_time}"""

    if cover_image:
        fm += f"\ncoverImage: {cover_image}"

    fm += "\n---\n\n"

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fm + content)

    return True

def main():
    if len(sys.argv) < 2:
        print("用法: python3 format.py <文章路径> [封面图链接]")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    cover_image = sys.argv[2] if len(sys.argv) > 2 else None

    if not file_path.exists():
        print(f"❌ 文件不存在: {file_path}")
        sys.exit(1)

    print(f"📝 {file_path}")

    if add_frontmatter(file_path, cover_image):
        print("  ✅ 格式化完成")

if __name__ == "__main__":
    main()
