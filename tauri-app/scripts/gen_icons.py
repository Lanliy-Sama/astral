#!/usr/bin/env python3
"""从 logo.png 生成 Tauri 所需的各尺寸图标"""
from PIL import Image
import os

SRC = '/home/z/my-project/astral-tauri/src/assets/logo.png'
OUT = '/home/z/my-project/astral-tauri/src-tauri/icons'

os.makedirs(OUT, exist_ok=True)
img = Image.open(SRC).convert('RGBA')

# 常规 PNG 尺寸
for size, name in [(32, '32x32.png'), (128, '128x128.png'), (256, '128x128@2x.png'), (256, 'icon.png')]:
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))

# 生成多尺寸 icon.ico (含 16/24/32/48/64/128/256)
img.resize((256, 256), Image.LANCZOS).save(
    os.path.join(OUT, 'icon.ico'),
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print('icons generated:', sorted(os.listdir(OUT)))
