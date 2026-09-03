#!/usr/bin/env python3
"""
Generate Rondo brand assets (app icon + splash screens) from the brand spec.

Produces:
  - assets/images/app_icon_1024.png          (master icon, 1024x1024)
  - assets/images/splash_full.png            (splash with logo + tagline, 1242x2688)
  - ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png
  - ios/Runner/Assets.xcassets/LaunchImage.imageset/*.png
  - android/app/src/main/res/mipmap-*/ic_launcher.png
  - android/app/src/main/res/drawable/launch_background.xml
  - android/app/src/main/res/drawable-v21/launch_background.xml
  - android/app/src/main/res/values/colors.xml  (brand colors)
  - android/app/src/main/res/values/styles.xml   (LaunchTheme)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --- Brand colors (sampled from the user-provided mockups) ---
BRAND_PRIMARY = (198, 110, 46)        # #C66E2E - copper/orange
BRAND_PRIMARY_DARK = (155, 78, 28)    # darker copper
BRAND_PRIMARY_LIGHT = (232, 152, 86)  # #E89856 lighter highlight
BRAND_WHITE = (255, 255, 255)
ICON_BG = (199, 110, 47)              # #C76E2F
SPLASH_BG_TOP = (175, 85, 30)         # gradient top
SPLASH_BG_BOTTOM = (210, 120, 60)     # gradient bottom
TAGLINE_COLOR = (245, 175, 110)       # soft orange for "La tontine réinventée"
APP_NAME_COLOR = (255, 255, 255)

# Paths
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets", "images")
IOS_ICON = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")
IOS_LAUNCH = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "LaunchImage.imageset")
ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
ANDROID_DRAWABLE = os.path.join(ANDROID_RES, "drawable")
ANDROID_DRAWABLE_V21 = os.path.join(ANDROID_RES, "drawable-v21")
ANDROID_VALUES = os.path.join(ANDROID_RES, "values")

os.makedirs(ASSETS, exist_ok=True)


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def rounded_rectangle_mask(size, radius_ratio=0.225):
    """Return an alpha mask with rounded corners."""
    w, h = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    radius = int(min(w, h) * radius_ratio)
    # Use rounded_rectangle (available in newer Pillow)
    draw.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    return mask


def copper_gradient(size, top=SPLASH_BG_TOP, bottom=SPLASH_BG_BOTTOM):
    """Vertical linear gradient between two colors."""
    w, h = size
    base = Image.new("RGB", size, top)
    top_r, top_g, top_b = top
    bot_r, bot_g, bot_b = bottom
    pixels = base.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top_r * (1 - t) + bot_r * t)
        g = int(top_g * (1 - t) + bot_g * t)
        b = int(top_b * (1 - t) + bot_b * t)
        for x in range(w):
            pixels[x, y] = (r, g, b)
    return base


def radial_glow(size, center_color, edge_color, center_offset=(0, 0)):
    """Radial gradient glow used for highlight on the icon."""
    w, h = size
    cx, cy = w // 2 + center_offset[0], h // 2 + center_offset[1]
    max_r = int(math.hypot(max(cx, w - cx), max(cy, h - cy)))
    img = Image.new("RGB", size, edge_color)
    pixels = img.load()
    er, eg, eb = edge_color
    cr, cg, cb = center_color
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max_r
            d = min(1.0, d)
            r = int(cr * (1 - d) + er * d)
            g = int(cg * (1 - d) + eg * d)
            b = int(cb * (1 - d) + eb * d)
            pixels[x, y] = (r, g, b)
    return img


# ---------------------------------------------------------------------------
# Logo emblem (the "people" symbol inside a circle)
# ---------------------------------------------------------------------------

def draw_emblem(size, color=BRAND_WHITE):
    """Draw the white circular emblem with 3 people grouped together."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    w, h = size
    cx, cy = w // 2, h // 2

    # Outer thin ring (the circle that wraps the people)
    ring_radius = int(min(w, h) * 0.42)
    ring_thickness = max(2, int(min(w, h) * 0.018))
    # Use a thin filled circle then a slightly smaller one to simulate a ring
    draw.ellipse(
        (cx - ring_radius, cy - ring_radius, cx + ring_radius, cy + ring_radius),
        outline=color,
        width=ring_thickness,
    )

    # Three people: 1 center (larger) + 2 sides (smaller, slightly lower)
    # People are head (circle) + shoulders (trapezoid)
    head_color = color

    def draw_person(center_x, center_y, head_r, body_w, body_h):
        # Head
        draw.ellipse(
            (center_x - head_r, center_y - head_r,
             center_x + head_r, center_y + head_r),
            fill=head_color,
        )
        # Body (rounded shoulders) - a wider, shorter half ellipse
        body_top = center_y + head_r - 1
        body_bottom = body_top + body_h
        draw.pieslice(
            (center_x - body_w // 2, body_top - body_h // 2,
             center_x + body_w // 2, body_top + body_h // 2),
            start=180, end=360, fill=head_color,
        )
        # Clamp body into the circle - draw a rectangle to clean up
        draw.rectangle(
            (center_x - body_w // 2, body_top + body_h // 2 - 2,
             center_x + body_w // 2, body_bottom),
            fill=head_color,
        )

    # Center person (largest)
    head_r = int(min(w, h) * 0.085)
    body_w = int(head_r * 2.6)
    body_h = int(head_r * 1.0)
    cy_offset = int(min(w, h) * 0.02)
    draw_person(cx, cy - cy_offset, head_r, body_w, body_h)

    # Left person (slightly smaller, lower)
    lx = cx - int(min(w, h) * 0.16)
    ly = cy + int(min(w, h) * 0.02)
    l_head = int(head_r * 0.85)
    draw_person(lx, ly, l_head, int(l_head * 2.4), int(l_head * 0.9))

    # Right person (slightly smaller, lower)
    rx = cx + int(min(w, h) * 0.16)
    ry = cy + int(min(w, h) * 0.02)
    r_head = int(head_r * 0.85)
    draw_person(rx, ry, r_head, int(r_head * 2.4), int(r_head * 0.9))

    # Make sure the bodies don't extend past the bottom of the ring
    return img


# ---------------------------------------------------------------------------
# App icon (1024x1024)
# ---------------------------------------------------------------------------

def build_app_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Copper background with subtle radial highlight
    bg = copper_gradient((size, size),
                         top=(175, 85, 30),
                         bottom=(215, 125, 65))
    highlight = radial_glow((size, size),
                            center_color=(235, 150, 90),
                            edge_color=(175, 85, 30),
                            center_offset=(0, -int(size * 0.05)))
    # Blend highlight softly
    bg = Image.blend(bg, highlight, 0.35)

    # Apply rounded-square mask
    mask = rounded_rectangle_mask((size, size), radius_ratio=0.225)
    bg_rgba = bg.convert("RGBA")
    bg_rgba.putalpha(mask)
    img.paste(bg_rgba, (0, 0), bg_rgba)

    # Emblem
    emblem = draw_emblem((size, size), color=BRAND_WHITE)
    img.alpha_composite(emblem)

    return img


# ---------------------------------------------------------------------------
# Splash (1242 x 2688 - iPhone X portrait base)
# ---------------------------------------------------------------------------

def build_splash(width=1242, height=2688):
    """Full splashscreen with logo + Rondo + tagline."""
    img = copper_gradient((width, height),
                          top=SPLASH_BG_TOP,
                          bottom=SPLASH_BG_BOTTOM)

    # Soft radial glow in the center to highlight the logo
    glow = radial_glow((width, height),
                       center_color=(240, 160, 100),
                       edge_color=(175, 85, 30))
    img = Image.blend(img, glow, 0.25)

    # Logo emblem (scaled up for visibility)
    emblem_size = int(min(width, height) * 0.32)
    emblem = draw_emblem((emblem_size, emblem_size), color=BRAND_WHITE)
    # Center the emblem in the upper-middle area
    ex = (width - emblem_size) // 2
    ey = int(height * 0.36) - emblem_size // 2
    img.paste(emblem, (ex, ey), emblem)

    # "Rondo" wordmark
    draw = ImageDraw.Draw(img)
    try:
        # Try to find a heavy system font
        font_path_candidates = [
            "/System/Library/Fonts/Supplemental/Arial Black.ttf",
            "/Library/Fonts/Arial Black.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/HelveticaNeue.ttc",
        ]
        font_path = None
        for p in font_path_candidates:
            if os.path.exists(p):
                font_path = p
                break
        if font_path:
            name_font = ImageFont.truetype(font_path, int(height * 0.085))
            tag_font = ImageFont.truetype(
                font_path.replace("Black", "").replace("Bold", ""),
                int(height * 0.026),
            ) if "Black" in font_path else ImageFont.truetype(font_path, int(height * 0.026))
        else:
            name_font = ImageFont.load_default()
            tag_font = ImageFont.load_default()
    except Exception:
        name_font = ImageFont.load_default()
        tag_font = ImageFont.load_default()

    name = "Rondo"
    nbb = draw.textbbox((0, 0), name, font=name_font)
    nw = nbb[2] - nbb[0]
    nh = nbb[3] - nbb[1]
    draw.text(((width - nw) // 2, int(height * 0.55)), name,
              font=name_font, fill=APP_NAME_COLOR)

    tag = "La tontine réinventée"
    tbb = draw.textbbox((0, 0), tag, font=tag_font)
    tw = tbb[2] - tbb[0]
    draw.text(((width - tw) // 2, int(height * 0.55) + nh + int(height * 0.01)),
              tag, font=tag_font, fill=TAGLINE_COLOR)

    return img


# ---------------------------------------------------------------------------
# iOS assets generation
# ---------------------------------------------------------------------------

IOS_ICON_SPECS = [
    # (filename, size)
    ("Icon-App-20x20@2x.png", 40),
    ("Icon-App-20x20@3x.png", 60),
    ("Icon-App-29x29@2x.png", 58),
    ("Icon-App-29x29@3x.png", 87),
    ("Icon-App-40x40@2x.png", 80),
    ("Icon-App-40x40@3x.png", 120),
    ("Icon-App-60x60@2x.png", 120),
    ("Icon-App-60x60@3x.png", 180),
    ("Icon-App-20x20@1x.png", 20),    # iPad
    ("Icon-App-29x29@1x.png", 29),    # iPad
    ("Icon-App-40x40@1x.png", 40),    # iPad
    ("Icon-App-76x76@1x.png", 76),    # iPad
    ("Icon-App-76x76@2x.png", 152),   # iPad
    ("Icon-App-83.5x83.5@2x.png", 167),  # iPad Pro
    ("Icon-App-1024x1024@1x.png", 1024),  # App Store marketing
]

# iOS launch image specs (portrait)
IOS_LAUNCH_SPECS = [
    # iPhone X / XS / 11 Pro / 12 mini / 13 mini etc.
    ("LaunchImage.png", 168, 185),       # default 1x
    ("LaunchImage@2x.png", 336, 370),    # 2x (we use 1242x2688 padded -> 336x370 concept)
    ("LaunchImage@3x.png", 504, 555),    # 3x
    # Modern iOS uses LaunchScreen.storyboard, but we still keep the static
    # images for the LaunchImage asset catalog fallback.
]

# Real iOS launch image recommended sizes
IOS_LAUNCH_REAL = [
    ("LaunchImage.png", 750, 1334),       # iPhone 8 / SE2
    ("LaunchImage@2x.png", 1242, 2208),   # iPhone 8 Plus
    ("LaunchImage@3x.png", 1242, 2688),   # iPhone X / XS / 11 Pro
]

# Android mipmap sizes
ANDROID_MIPMAP_SPECS = [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
]


def main():
    # 1) Master icon
    icon = build_app_icon(1024)
    icon.save(os.path.join(ASSETS, "app_icon_1024.png"), "PNG", optimize=True)
    print(f"  ✓ app_icon_1024.png")

    # 2) Master splash
    splash = build_splash(1242, 2688)
    splash.save(os.path.join(ASSETS, "splash_full.png"), "PNG", optimize=True)
    print(f"  ✓ splash_full.png")

    # 3) iOS icons
    print("  iOS icons:")
    for filename, size in IOS_ICON_SPECS:
        path = os.path.join(IOS_ICON, filename)
        icon.resize((size, size), Image.LANCZOS).save(path, "PNG", optimize=True)
        print(f"    ✓ {filename} ({size}x{size})")

    # 4) iOS launch images (use splash as the source for static images)
    print("  iOS launch images:")
    for filename, w, h in IOS_LAUNCH_REAL:
        path = os.path.join(IOS_LAUNCH, filename)
        splash.resize((w, h), Image.LANCZOS).save(path, "PNG", optimize=True)
        print(f"    ✓ {filename} ({w}x{h})")

    # 5) Android mipmaps
    print("  Android mipmaps:")
    for folder, size in ANDROID_MIPMAP_SPECS:
        target_dir = os.path.join(ANDROID_RES, folder)
        os.makedirs(target_dir, exist_ok=True)
        # Standard launcher icon
        icon.resize((size, size), Image.LANCZOS).save(
            os.path.join(target_dir, "ic_launcher.png"), "PNG", optimize=True)
        # Foreground (adaptive icon)
        fg_size = int(size * 0.7)
        fg_icon = icon.copy()
        # Resize emblem-only for adaptive icon foreground
        emblem = draw_emblem((fg_size, fg_size), color=BRAND_WHITE)
        # Use the icon background at the foreground size, masked to ~50% of icon
        fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        # Just put the full icon (Android will mask it as a circle)
        icon_small = icon.resize((size, size), Image.LANCZOS)
        fg.paste(icon_small, (0, 0), icon_small)
        fg.save(os.path.join(target_dir, "ic_launcher_foreground.png"),
                "PNG", optimize=True)
        print(f"    ✓ {folder}/ic_launcher.png ({size}x{size})")

    # 6) Android drawable resources
    os.makedirs(ANDROID_DRAWABLE, exist_ok=True)
    os.makedirs(ANDROID_DRAWABLE_V21, exist_ok=True)
    os.makedirs(ANDROID_VALUES, exist_ok=True)

    # launch_background.xml (used by the LaunchTheme)
    with open(os.path.join(ANDROID_DRAWABLE, "launch_background.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n')
        f.write('    <item android:drawable="@color/brand_copper" />\n')
        f.write('</layer-list>\n')

    # Same content in drawable-v21
    with open(os.path.join(ANDROID_DRAWABLE_V21, "launch_background.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n')
        f.write('    <item android:drawable="@color/brand_copper" />\n')
        f.write('</layer-list>\n')

    # colors.xml
    with open(os.path.join(ANDROID_VALUES, "colors.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <color name="brand_copper">#C66E2E</color>\n')
        f.write('    <color name="brand_copper_dark">#9B4E1C</color>\n')
        f.write('    <color name="brand_copper_light">#E89856</color>\n')
        f.write('    <color name="brand_white">#FFFFFF</color>\n')
        f.write('</resources>\n')

    # styles.xml - ensure LaunchTheme uses our background
    styles_path = os.path.join(ANDROID_VALUES, "styles.xml")
    if not os.path.exists(styles_path):
        with open(styles_path, "w") as f:
            f.write('<?xml version="1.0" encoding="utf-8"?>\n')
            f.write('<resources>\n')
            f.write('    <style name="LaunchTheme" parent="@android:style/Theme.Light.NoTitleBar">\n')
            f.write('        <item name="android:windowBackground">@drawable/launch_background</item>\n')
            f.write('        <item name="android:windowFullscreen">true</item>\n')
            f.write('        <item name="android:statusBarColor">@color/brand_copper</item>\n')
            f.write('    </style>\n')
            f.write('    <style name="NormalTheme" parent="@android:style/Theme.Light.NoTitleBar">\n')
            f.write('        <item name="android:windowBackground">?android:colorBackground</item>\n')
            f.write('    </style>\n')
            f.write('</resources>\n')
    else:
        print(f"  ! styles.xml already exists, leaving as-is ({styles_path})")

    print("\nAll assets generated.")


if __name__ == "__main__":
    main()
