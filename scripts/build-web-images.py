"""Build the shipped stage logo and app icons from committed artwork.

Usage: python3 scripts/build-web-images.py   (needs Pillow with WebP)
Outputs go to public/ and are committed; the site build does not run this.
The link-preview image public/og-image.jpg is a capture of tests/og-image.html.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
LOGO = Image.open(ROOT / "art/branding/nanglung-logo-transparent.png").convert("RGBA")
# Rest-pose paint order of the rig: far arm, body, head, jaw, near arm.


def stage_logo():
    """The stage draws the logo 190px wide; 760px covers 4x displays."""
    logo = LOGO.resize((760, round(760 * LOGO.height / LOGO.width)), Image.LANCZOS)
    logo.save(PUBLIC / "branding/nanglung-logo.webp", "WEBP", quality=88, alpha_quality=95, method=6)


def mark(size):
    """Raster copy of public/mark.svg for touch icons and the web manifest."""
    s = size / 64
    icon = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(icon)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=16 * s, fill="#a53f2c")
    d.polygon([(x * s, y * s) for x, y in [(19, 47), (19, 17), (26, 17), (39, 37), (39, 17), (45, 17), (45, 47), (38, 47), (25, 27), (25, 47)]], fill="#fff3d7")
    d.ellipse(((48 - 3) * s, (14 - 3) * s, (48 + 3) * s, (14 + 3) * s), fill="#eebf69")
    return icon


if __name__ == "__main__":
    stage_logo()
    for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        big = mark(size * 4).resize((size, size), Image.LANCZOS)
        big.save(PUBLIC / name, optimize=True)
    print("built logo and icons")
