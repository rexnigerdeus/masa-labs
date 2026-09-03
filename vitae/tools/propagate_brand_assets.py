#!/usr/bin/env python3
"""
Propagate the *real* Vitae brand image (provided by user) to every
asset location on iOS and Android.

Source (already in repo):
  - assets/images/icon.png   (1254x1254, steel-blue rounded square)

Outputs:
  - ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png   (15 sizes)
  - android/app/src/main/res/mipmap-*/ic_launcher.png     (5 sizes)
  - android/app/src/main/res/mipmap-*/ic_launcher_foreground.png (5 sizes)
  - web/icons/Icon-*.png + favicon.png (Flutter web)
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ASSETS = os.path.join(ROOT, "assets", "images")
ICON_SRC = os.path.join(ASSETS, "icon.png")

IOS_ICON = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")

ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# ---------------------------------------------------------------------------
# iOS icon sizes  (filename, pixel size — square)
# ---------------------------------------------------------------------------
IOS_ICON_SPECS = [
    # iPhone
    ("Icon-App-20x20@2x.png", 40),
    ("Icon-App-20x20@3x.png", 60),
    ("Icon-App-29x29@1x.png", 29),
    ("Icon-App-29x29@2x.png", 58),
    ("Icon-App-29x29@3x.png", 87),
    ("Icon-App-40x40@1x.png", 40),
    ("Icon-App-40x40@2x.png", 80),
    ("Icon-App-40x40@3x.png", 120),
    ("Icon-App-60x60@2x.png", 120),
    ("Icon-App-60x60@3x.png", 180),
    # iPad
    ("Icon-App-76x76@1x.png", 76),
    ("Icon-App-76x76@2x.png", 152),
    ("Icon-App-83.5x83.5@2x.png", 167),
    # App Store marketing
    ("Icon-App-1024x1024@1x.png", 1024),
]

# Android mipmap sizes (folder, pixel size — square)
ANDROID_MIPMAP_SPECS = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
]

# Android adaptive-icon foreground sizes (108dp base, 72dp safe zone)
ANDROID_FOREGROUND_SPECS = [
    ("mipmap-mdpi", 108),
    ("mipmap-hdpi", 162),
    ("mipmap-xhdpi", 216),
    ("mipmap-xxhdpi", 324),
    ("mipmap-xxxhdpi", 432),
]


def save_resized(src_img, dest_path, size, mode="cover"):
    """Resize src_img to (w, h) and save to dest_path.

    mode='cover' fills the entire target by cropping (preserves aspect, no bars).
    mode='stretch' naive resize.
    """
    src = src_img.convert("RGBA")
    if mode == "cover":
        sw, sh = src.size
        tw, th = size
        scale = max(tw / sw, th / sh)
        new_w, new_h = int(sw * scale), int(sh * scale)
        resized = src.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - tw) // 2
        top = (new_h - th) // 2
        out = resized.crop((left, top, left + tw, top + th))
    else:  # stretch
        out = src.resize(size, Image.LANCZOS)
    out.save(dest_path, "PNG", optimize=True)


def main():
    print("Loading source icon...")
    icon_img = Image.open(ICON_SRC)
    print(f"  icon: {icon_img.size}  ({icon_img.mode})")

    # ----- iOS icons -----
    print("\niOS icons:")
    for fname, px in IOS_ICON_SPECS:
        dest = os.path.join(IOS_ICON, fname)
        save_resized(icon_img, dest, (px, px))
        print(f"  {fname:32s}  {px}x{px}")

    # ----- Android icons -----
    print("\nAndroid mipmap icons:")
    for folder, px in ANDROID_MIPMAP_SPECS:
        dest_dir = os.path.join(ANDROID_RES, folder)
        os.makedirs(dest_dir, exist_ok=True)
        dest = os.path.join(dest_dir, "ic_launcher.png")
        save_resized(icon_img, dest, (px, px))
        print(f"  {folder}/ic_launcher.png  {px}x{px}")

    print("\nAndroid adaptive foregrounds:")
    for folder, px in ANDROID_FOREGROUND_SPECS:
        dest_dir = os.path.join(ANDROID_RES, folder)
        os.makedirs(dest_dir, exist_ok=True)
        dest = os.path.join(dest_dir, "ic_launcher_foreground.png")
        save_resized(icon_img, dest, (px, px))
        print(f"  {folder}/ic_launcher_foreground.png  {px}x{px}")

    print("\nDone! ✅")


if __name__ == "__main__":
    main()