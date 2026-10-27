"""Build optimised web images from the originals in design-source/pictures/.

    python scripts/build_images.py

Writes frontend/public/assets/<group>/<slug>-<width>.{webp,jpg} (widths 480/960/1600, never upscaled),
frontend/src/assets/imageManifest.ts, and the sample images in sample_data/ (plus junk examples).
Cropping is done in CSS only (object-position from the focal point), never here.
"""
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design-source" / "pictures"
OUT = ROOT / "frontend" / "public" / "assets"
MANIFEST = ROOT / "frontend" / "src" / "assets" / "imageManifest.ts"
SAMPLES = ROOT / "sample_data"
WIDTHS = (480, 960, 1600)
AI_CREDIT = "AI-generated illustration (team-supplied)"


def wa(suffix: str) -> str:
    return "WhatsApp Image 2026-10-26 at 10.23.%s.jpeg" % suffix


# slug -> (group, source file, alt text, focal point "x% y%")
IMAGES = {
    "home-hero": ("hero", wa("15 AM3"), "A hand painting a blue and orange bird in the Madhubani style on cream paper, with bowls of pigment beside it.", "62% 55%"),
    "madhubani": ("art-forms", wa("10 AM"), "A Madhubani-style painting of a peacock, fish and lotus flowers inside a patterned border.", "55% 45%"),
    "warli": ("art-forms", wa("10 AM (1)"), "A Warli-style painting in white on red-brown earth: dancers in a line, a hut, a sun, trees and a deer.", "55% 50%"),
    "gond": ("art-forms", "gond-tree-of-life.jpg", "A Gond-style painting of a tree of life with birds and deer filled with dots and dashes.", "45% 50%"),
    "kalamkari": ("art-forms", wa("11 AM"), "A cream textile with a peacock, an elephant and floral borders in the Kalamkari style, beside bowls of dye.", "50% 50%"),
    "pottery": ("art-forms", wa("11 AM1"), "Hands decorating a terracotta pot with painted leaf and triangle patterns, surrounded by other pots.", "68% 45%"),
    "warli-brushes": ("gallery", wa("14 AM11"), "A Warli-style painting with a row of dancers, a hut, a horse and a palm tree, with two brushes resting on it.", "45% 50%"),
    "warli-village": ("gallery", wa("18 AM7"), "A wide Warli-style village scene with a dance circle, a tree, a hut and a cow.", "50% 50%"),
    "warli-dance": ("gallery", wa("19 AM8"), "A wide Warli-style scene of dancers in a ring around a drummer.", "50% 50%"),
    "madhubani-woman-peacock": ("gallery", wa("18 AM555"), "A Madhubani-style painting of a woman holding a lotus beside a peacock, inside a red patterned border.", "45% 50%"),
    "painting-together": ("community", wa("15 AM1111111111"), "Two women painting a Warli-style artwork together at a table.", "58% 42%"),
}

# slug -> (source file, art form) used as sample images for the Analyse flow and for tests
SAMPLE_SOURCES = {
    "warli": wa("14 AM11"),
    "madhubani": wa("10 AM"),
    "gond": "gond-tree-of-life.jpg",
    "kalamkari": wa("11 AM"),
    "pottery": wa("11 AM1"),
}


def load(name: str) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(SRC / name))
    return im.convert("RGB")


def save_variants(im: Image.Image, group: str, slug: str) -> list[int]:
    out_dir = OUT / group
    out_dir.mkdir(parents=True, exist_ok=True)
    widths = [w for w in WIDTHS if w < im.width] + [im.width if im.width <= WIDTHS[-1] else WIDTHS[-1]]
    widths = sorted(set(widths))
    for w in widths:
        h = round(im.height * w / im.width)
        r = im if w == im.width else im.resize((w, h), Image.LANCZOS)
        r.save(out_dir / ("%s-%d.webp" % (slug, w)), "WEBP", quality=80, method=6)  # no metadata is written
        r.save(out_dir / ("%s-%d.jpg" % (slug, w)), "JPEG", quality=80, optimize=True, progressive=True)
    return widths


def average_colour(im: Image.Image) -> str:
    r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))
    return "#%02x%02x%02x" % (r, g, b)


def make_junk() -> None:
    blank = Image.new("RGB", (960, 640), (255, 255, 255))
    blank.save(SAMPLES / "junk-blank.jpg", quality=90)
    doc = Image.new("RGB", (960, 640), (255, 255, 255))
    d = ImageDraw.Draw(doc)
    font = ImageFont.load_default()
    for i in range(28):
        d.text((40, 30 + i * 20), "Invoice 2026-%03d    item description    qty 1    amount 1,250.00" % i, fill=(20, 20, 20), font=font)
    doc.save(SAMPLES / "junk-text-document.png")


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    SAMPLES.mkdir(exist_ok=True)
    entries, total = [], 0
    for slug, (group, src, alt, focal) in IMAGES.items():
        im = load(src)
        widths = save_variants(im, group, slug)
        entries.append({
            "slug": slug, "group": group, "widths": widths, "width": im.width, "height": im.height,
            "alt": alt, "focal": focal, "color": average_colour(im), "credit": AI_CREDIT, "aiGenerated": True,
        })
    for art, src in SAMPLE_SOURCES.items():
        im = load(src)
        small = im.resize((960, round(im.height * 960 / im.width)), Image.LANCZOS)
        small.save(SAMPLES / ("sample-%s.jpg" % art), quality=88, optimize=True)
    make_junk()
    # copy samples to the frontend so the "Try with a sample" buttons work offline
    pub = OUT / "samples"
    pub.mkdir(parents=True, exist_ok=True)
    for f in SAMPLES.glob("sample-*.jpg"):
        shutil.copy(f, pub / f.name)
    for f in OUT.rglob("*"):
        if f.is_file():
            total += f.stat().st_size

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps({e["slug"]: {k: v for k, v in e.items() if k != "slug"} for e in entries}, indent=2)
    MANIFEST.write_text(
        "// Generated by scripts/build_images.py. Do not edit by hand.\n"
        "export interface ImageMeta {\n"
        "  group: string;\n  widths: number[];\n  width: number;\n  height: number;\n  alt: string;\n"
        "  focal: string;\n  color: string;\n  credit: string;\n  aiGenerated: boolean;\n}\n\n"
        "export const imageManifest = %s as const satisfies Record<string, ImageMeta>;\n\n"
        "export type ImageSlug = keyof typeof imageManifest;\n" % body,
        encoding="utf-8", newline="\n",
    )
    print("built %d images, %.1f MB total in %s" % (len(entries), total / 1e6, OUT))


if __name__ == "__main__":
    main()
