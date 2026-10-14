"""Generate high-resolution PNG and ICO icons for RIG."""
import os
from PIL import Image, ImageDraw, ImageFont

def create_rig_icon():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer rounded square with modern gradient / layered fill
    # Background rounded rect
    margin = 32
    r = 96
    
    # Base shadow
    draw.rounded_rectangle(
        [margin, margin + 12, size - margin, size - margin + 12],
        radius=r,
        fill=(10, 15, 30, 180)
    )

    # Main dark navy/indigo background
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=r,
        fill=(15, 23, 42, 255)  # slate-900
    )

    # Gradient-style inner accent border
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=r,
        outline=(56, 189, 248, 220),  # sky-400
        width=8
    )

    # Document sheet representation
    doc_left = 130
    doc_top = 110
    doc_right = 382
    doc_bottom = 410
    doc_r = 24

    # Document background (clean frosted card)
    draw.rounded_rectangle(
        [doc_left, doc_top, doc_right, doc_bottom],
        radius=doc_r,
        fill=(30, 41, 59, 255),  # slate-800
        outline=(99, 102, 241, 200),  # indigo-500
        width=4
    )

    # Document header bar
    draw.rounded_rectangle(
        [doc_left + 24, doc_top + 28, doc_left + 140, doc_top + 48],
        radius=10,
        fill=(56, 189, 248, 255)  # sky-400
    )

    # Document text lines
    draw.rounded_rectangle(
        [doc_left + 24, doc_top + 70, doc_right - 24, doc_top + 84],
        radius=7,
        fill=(148, 163, 184, 180)
    )
    draw.rounded_rectangle(
        [doc_left + 24, doc_top + 104, doc_right - 24, doc_top + 118],
        radius=7,
        fill=(148, 163, 184, 140)
    )
    draw.rounded_rectangle(
        [doc_left + 24, doc_top + 138, doc_left + 160, doc_top + 152],
        radius=7,
        fill=(148, 163, 184, 140)
    )

    # Center/Lower: Glowing AI intelligence sparkle / hexagon badge
    badge_cx = 256
    badge_cy = 280
    badge_r = 64

    # Outer glow
    draw.ellipse(
        [badge_cx - badge_r - 8, badge_cy - badge_r - 8, badge_cx + badge_r + 8, badge_cy + badge_r + 8],
        fill=(14, 165, 233, 40)
    )
    # Core badge
    draw.ellipse(
        [badge_cx - badge_r, badge_cy - badge_r, badge_cx + badge_r, badge_cy + badge_r],
        fill=(16, 185, 129, 230),  # emerald-500
        outline=(255, 255, 255, 240),
        width=6
    )

    # Letter "R" in center badge
    # Draw stylized R lines
    # Vertical line
    draw.line([badge_cx - 24, badge_cy - 36, badge_cx - 24, badge_cy + 36], fill=(255, 255, 255, 255), width=10)
    # Loop of R
    draw.arc([badge_cx - 24, badge_cy - 36, badge_cx + 18, badge_cy + 6], start=-90, end=90, fill=(255, 255, 255, 255), width=10)
    draw.line([badge_cx - 24, badge_cy - 36, badge_cx - 4, badge_cy - 36], fill=(255, 255, 255, 255), width=10)
    draw.line([badge_cx - 24, badge_cy + 4, badge_cx - 4, badge_cy + 4], fill=(255, 255, 255, 255), width=10)
    # Leg of R
    draw.line([badge_cx - 6, badge_cy + 4, badge_cx + 20, badge_cy + 36], fill=(255, 255, 255, 255), width=10)

    # 4-point AI sparkle stars in top-right
    sparkle_x = 340
    sparkle_y = 120
    draw.line([sparkle_x, sparkle_y - 22, sparkle_x, sparkle_y + 22], fill=(250, 204, 21, 255), width=6)
    draw.line([sparkle_x - 22, sparkle_y, sparkle_x + 22, sparkle_y], fill=(250, 204, 21, 255), width=6)

    # Output paths
    assets_dir = "/home/kushal_jain/PROJECTS/Report_Generator_Dashboard/assets"
    png_path = os.path.join(assets_dir, "icon.png")
    ico_path = os.path.join(assets_dir, "icon.ico")

    # Save PNG (512x512)
    img.save(png_path, format="PNG")
    print(f"Saved {png_path}")

    # Generate multi-size ICO: 256, 128, 64, 48, 32, 16
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Saved {ico_path}")

if __name__ == "__main__":
    create_rig_icon()
