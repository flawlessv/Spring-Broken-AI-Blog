#!/usr/bin/env python3
"""
批量壁纸获取器 - 每次获取10张风景壁纸
保存到桌面 skills-img 文件夹
"""

import os
import sys
from pathlib import Path
import time
import random

# Configuration - 保存到桌面
BASE_DIR = Path.home() / "Desktop" / "skills-img"
BATCH_SIZE = 20  # 获取20张


def fetch_scenic_wallpaper():
    """从好壁纸网获取随机风景壁纸"""
    page_num = random.randint(1, 2500)
    url = f"https://haowallpaper.com/homeView?page={page_num}"

    try:
        import requests
        from bs4 import BeautifulSoup

        time.sleep(random.uniform(0.3, 1.0))

        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        })
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        wallpapers = []

        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src') or img.get('data-original')
            if src and 'getCroppingImg' in src:
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    src = 'https://haowallpaper.com' + src

                alt_text = img.get('alt', '')
                title_text = img.get('title', '')
                description = f"{alt_text} {title_text}".strip()

                wallpapers.append({'url': src, 'description': description})

        if not wallpapers:
            return None

        # 去重
        seen_urls = set()
        unique_wallpapers = []
        for wp in wallpapers:
            if wp['url'] not in seen_urls:
                seen_urls.add(wp['url'])
                unique_wallpapers.append(wp)

        # 风景关键词
        scenic_keywords = [
            '风景', '山', '水', '海', '湖', '河', '自然', '天空', '云', '雾',
            'mountain', 'water', 'sea', 'lake', 'river', 'nature', 'sky', 'cloud',
            '日出', '日落', '森林', '树', '花', '草地', 'sunset', 'sunrise',
            'forest', 'tree', 'flower', 'grass', 'landscape', 'scenery'
        ]

        # 过滤风景类壁纸
        scenic_wallpapers = []
        for wp in unique_wallpapers:
            desc_lower = wp['description'].lower()
            if any(kw.lower() in desc_lower for kw in scenic_keywords):
                scenic_wallpapers.append(wp)

        return random.choice(scenic_wallpapers) if scenic_wallpapers else random.choice(unique_wallpapers)

    except Exception:
        return None


def download_image(url, output_path):
    """下载图片"""
    try:
        import requests
        response = requests.get(url, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        with open(output_path, 'wb') as f:
            f.write(response.content)
        return True
    except Exception:
        return False


def compress_image(input_path, output_path, quality=75, max_dimension=1920):
    """使用 PIL 压缩图片"""
    try:
        from PIL import Image
        img = Image.open(input_path)

        # 缩放过大的图片
        if max(img.size) > max_dimension:
            ratio = max_dimension / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # 转换为 RGB
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        img.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
        return True
    except Exception:
        return False


def main():
    """批量获取10张壁纸"""
    from datetime import datetime

    now = datetime.now()
    datetime_str = now.strftime("%Y%m%d_%H%M%S")
    OUTPUT_DIR = BASE_DIR / datetime_str
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"🖼️  批量获取器 - {BATCH_SIZE}张风景壁纸")
    print(f"📁 {OUTPUT_DIR}")
    print()

    downloaded = []

    for i in range(BATCH_SIZE):
        print(f"[{i+1}/{BATCH_SIZE}]", end=" ")

        wallpaper = fetch_scenic_wallpaper()
        if not wallpaper:
            print("❌")
            continue

        filename = f"wallpaper_{i+1:02d}.jpg"
        temp_path = OUTPUT_DIR / f"temp_{filename}"
        final_path = OUTPUT_DIR / filename

        if download_image(wallpaper['url'], temp_path) and compress_image(temp_path, final_path):
            temp_path.unlink(missing_ok=True)
            size_kb = final_path.stat().st_size / 1024
            print(f"✅ {filename} ({size_kb:.1f} KB)")
            downloaded.append(final_path)
        else:
            print("❌")

        time.sleep(random.uniform(0.2, 0.5))

    print()
    print(f"✅ 完成! 成功下载 {len(downloaded)} 张壁纸到 {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
