#!/usr/bin/env python3
"""
Propagate the *real* Rondo brand images (provided by user) to every
asset location on iOS and Android.

Sources (already in repo):
  - assets/images/app_icon_1024.png    (1254x1254, copper rounded square)
  - assets/images/splash_full.png      (941x1672, full splashscreen)

Outputs:
  - ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png   (15 sizes)
  - ios/Runner/Assets.xcassets/LaunchImage.imageset/*.png (3 sizes)
  - ios/Runner/Assets.xcassets/RondoLogo.imageset/rondo_logo.png (240x240)
  - android/app/src/main/res/mipmap-*/ic_launcher.png     (5 sizes)
  - android/app/src/main/res/mipmap-*/ic_launcher_foreground.png (5 sizes)
  - android/app/src/main/res/drawable*/launch_background.png  (full screen)
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ASSETS = os.path.join(ROOT, "assets", "images")
ICON_SRC = os.path.join(ASSETS, "app_icon_1024.png")
SPLASH_SRC = os.path.join(ASSETS, "splash_full.png")

IOS_ICON = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")
IOS_LAUNCH = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "LaunchImage.imageset")
IOS_LOGO_SET = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "RondoLogo.imageset")

ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
ANDROID_DRAWABLE = os.path.join(ANDROID_RES, "drawable")
ANDROID_DRAWABLE_V21 = os.path.join(ANDROID_RES, "drawable-v21")

# ---------------------------------------------------------------------------
# iOS icon sizes
# ---------------------------------------------------------------------------
IOS_ICON_SPECS = [
    # iPhone
    ("Icon-App-20x20@2x.png", 40),
    ("Icon-App-20x20@3x.png", 60),
    ("Icon-App-29x29@2x.png", 58),
    ("Icon-App-29x29@3x.png", 87),
    ("Icon-App-40x40@2x.png", 80),
    ("Icon-App-40x40@3x.png", 120),
    ("Icon-App-60x60@2x.png", 120),
    ("Icon-App-60x60@3x.png", 180),
    # iPad
    ("Icon-App-20x20@1x.png", 20),
    ("Icon-App-29x29@1x.png", 29),
    ("Icon-App-40x40@1x.png", 40),
    ("Icon-App-76x76@1x.png", 76),
    ("Icon-App-76x76@2x.png", 152),
    ("Icon-App-83.5x83.5@2x.png", 167),
    # App Store marketing
    ("Icon-App-1024x1024@1x.png", 1024),
]

# iOS launch image sizes (real device resolutions, no upscaling distortion)
IOS_LAUNCH_SPECS = [
    # iPhone 8 / SE2
    ("LaunchImage.png", 750, 1334),
    # iPhone 8 Plus
    ("LaunchImage@2x.png", 1242, 2208),
    # iPhone X / XS / 11 Pro
    ("LaunchImage@3x.png", 1242, 2688),
]

# Android mipmap sizes
ANDROID_MIPMAP_SPECS = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
]


def save_resized(src_img, dest_path, size, mode="cover"):
    """Resize src_img to (w, h) and save to dest_path.

    mode='cover' fills the entire target by cropping (preserves aspect, no bars).
    mode='contain' fits inside the target on a copper background.
    mode='stretch' naive resize.
    """
    src = src_img.convert("RGB") if mode == "cover" else src_img
    if mode == "cover":
        # Resize so the source fully covers the target, then center-crop
        sw, sh = src.size
        tw, th = size
        scale = max(tw / sw, th / sh)
        new_w, new_h = int(sw * scale), int(sh * scale)
        resized = src.resize((new_w, new_h), Image.LANCZOS)
        # Center-crop
        left = (new_w - tw) // 2
        top = (new_h - th) // 2
        out = resized.crop((left, top, left + tw, top + th))
    elif mode == "contain":
        out = Image.new("RGB", size, (199, 110, 47))
        sw, sh = src.size
        tw, th = size
        scale = min(tw / sw, th / sh)
        new_w, new_h = int(sw * scale), int(sh * scale)
        resized = src.resize((new_w, new_h), Image.LANCZOS)
        out.paste(resized, ((tw - new_w) // 2, (th - new_h) // 2))
    else:  # stretch
        out = src.resize(size, Image.LANCZOS)
    out.save(dest_path, "PNG", optimize=True)


def main():
    print("Loading source images...")
    icon_img = Image.open(ICON_SRC)
    splash_img = Image.open(SPLASH_SRC)
    print(f"  icon: {icon_img.size}")
    print(f"  splash: {splash_img.size}")

    # ----- iOS icons -----
    print("\niOS icons:")
    for filename, size in IOS_ICON_SPECS:
        path = os.path.join(IOS_ICON, filename)
        save_resized(icon_img, path, (size, size), mode="cover")
        print(f"  ✓ {filename} ({size}x{size})")

    # ----- iOS launch images (use the full splash as source) -----
    print("\niOS launch images:")
    for filename, w, h in IOS_LAUNCH_SPECS:
        path = os.path.join(IOS_LAUNCH, filename)
        save_resized(splash_img, path, (w, h), mode="cover")
        print(f"  ✓ {filename} ({w}x{h})")

    # ----- iOS RondoLogo (used by LaunchScreen.storyboard) -----
    print("\niOS RondoLogo:")
    os.makedirs(IOS_LOGO_SET, exist_ok=True)
    logo_path = os.path.join(IOS_LOGO_SET, "rondo_logo.png")
    # Extract just the white emblem on a transparent background:
    # use the splash image, crop the emblem region, then make white pixels transparent
    # so the storyboard copper background shows through.
    splash_w, splash_h = splash_img.size
    # The emblem is roughly the upper-center square of the splash
    # Empirically from the 941x1672 mockup, emblem is ~340x340 starting at
    # x≈300, y≈140 (center of the rounded square area)
    crop_box = (
        int(splash_w * 0.30),
        int(splash_h * 0.07),
        int(splash_w * 0.70),
        int(splash_h * 0.30),
    )
    emblem_crop = splash_img.crop(crop_box).convert("RGBA")
    # Make white pixels transparent
    pixels = emblem_crop.load()
    w, h = emblem_crop.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            # White-ish: very high R, G, B
            if r > 200 and g > 200 and b > 200:
                pixels[x, y] = (255, 255, 255, 0)
            else:
                pixels[x, y] = (r, g, b, 0)
    # Resize to 240x240
    logo_final = emblem_crop.resize((240, 240), Image.LANCZOS)
    logo_final.save(logo_path, "PNG", optimize=True)
    print(f"  ✓ rondo_logo.png (240x240)")

    # ----- Android mipmaps -----
    print("\nAndroid mipmaps:")
    for folder, size in ANDROID_MIPMAP_SPECS:
        target_dir = os.path.join(ANDROID_RES, folder)
        os.makedirs(target_dir, exist_ok=True)
        ic_path = os.path.join(target_dir, "ic_launcher.png")
        fg_path = os.path.join(target_dir, "ic_launcher_foreground.png")
        save_resized(icon_img, ic_path, (size, size), mode="cover")
        # Foreground: same icon, used by Android adaptive icon system
        save_resized(icon_img, fg_path, (size, size), mode="cover")
        print(f"  ✓ {folder}/ic_launcher.png + ic_launcher_foreground.png ({size}x{size})")

    # ----- Android launch_background drawable -----
    # Use the full splash as the launch background image, padded to fit any
    # screen aspect ratio (centered, copper background).
    print("\nAndroid launch_background:")
    os.makedirs(ANDROID_DRAWABLE, exist_ok=True)
    os.makedirs(ANDROID_DRAWABLE_V21, exist_ok=True)
    # Save a generic launch background at 1080x1920 (most common Android size)
    for d in [ANDROID_DRAWABLE, ANDROID_DRAWABLE_V21]:
        path = os.path.join(d, "launch_background.png")
        save_resized(splash_img, path, (1080, 1920), mode="contain")
        print(f"  ✓ {path}")

    # Update the XML drawable to point at the PNG instead of the color
    # (The XML previously used a solid color; now it layers the splash PNG)
    for d in [ANDROID_DRAWABLE, ANDROID_DRAWABLE_V21]:
        xml_path = os.path.join(d, "launch_background.xml")
        with open(xml_path, "w") as f:
            f.write('<?xml version="1.0" encoding="utf-8"?>\n')
            f.write('<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n')
            f.write('    <item android:drawable="@color/brand_copper" />\n')
            f.write('    <item>\n')
            f.write('        <bitmap android:src="@drawable/launch_background" '
                    'android:gravity="center" />\n')
            f.write('    </item>\n')
            f.write('</layer-list>\n')
        print(f"  ✓ {xml_path}")

    print("\n✅ All assets propagated from the real source images.")


if __name__ == "__main__":
    main()
