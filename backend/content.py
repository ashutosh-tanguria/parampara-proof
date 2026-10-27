"""Static catalogue, lesson outlines and sample community posts.

Everything here is curated by the team and has not been reviewed by practising artists.
Image values are keys of frontend/src/assets/imageManifest.ts (built by scripts/build_images.py).
"""
import csv
import html
import re
from pathlib import Path
from urllib.parse import quote

AUTOMATED = ("madhubani", "warli", "gond", "pattachitra")

# slug -> (subtitle, category, hero image key or None)
CATALOGUE: dict[str, tuple[str, str, str | None]] = {
    "madhubani": ("Vibrant stories from Bihar", "Painting", "madhubani"),
    "warli": ("Minimalist tribal art from Maharashtra", "Tribal Art", "warli"),
    "gond": ("Nature-inspired tribal art from Madhya Pradesh", "Tribal Art", "gond"),
    "pattachitra": ("Classical narrative scroll art from Odisha", "Painting", None),  # no image yet: see docs/ASSET_GAPS.md
    "kalamkari": ("Hand-painted textile art from Andhra Pradesh", "Textile", "kalamkari"),
    "pottery": ("Timeless clay craftsmanship across India", "Pottery", "pottery"),
}

GALLERY: dict[str, list[tuple[str, str]]] = {
    "madhubani": [("Madhubani-style peacock and fish (AI-generated illustration)", "madhubani"), ("Madhubani-style woman and peacock (AI-generated illustration)", "madhubani-woman-peacock")],
    "warli": [
        ("Warli-style village scene (AI-generated illustration)", "warli"),
        ("Warli-style row of dancers (AI-generated illustration)", "warli-brushes"),
        ("Warli-style village and dance circle (AI-generated illustration)", "warli-village"),
        ("Warli-style ring dance (AI-generated illustration)", "warli-dance"),
    ],
    "gond": [("Gond-style tree of life (AI-generated illustration)", "gond")],
    "pattachitra": [],
    "kalamkari": [("Kalamkari-style textile (AI-generated illustration)", "kalamkari")],
    "pottery": [("Painted terracotta pots (AI-generated illustration)", "pottery")],
}

LESSONS = [
    {"id": "l-1", "title": "Getting Started with Warli", "art_form": "warli", "summary": "Materials, the white-on-earth look and your first border."},
    {"id": "l-2", "title": "Basic Shapes and Motifs", "art_form": "warli", "summary": "Circles, triangles and lines that make up the visual vocabulary."},
    {"id": "l-3", "title": "Human Figures", "art_form": "warli", "summary": "Building people from a circle and two triangles."},
    {"id": "l-4", "title": "Nature and Daily Life Themes", "art_form": "warli", "summary": "Trees, huts, animals and village scenes."},
    {"id": "l-5", "title": "Putting a Composition Together", "art_form": "warli", "summary": "Arranging figures, borders and open space on one sheet."},
]

COMMON_MISTAKES = [
    {"art_form": "Warli", "mistake": "Adding multi-coloured pigments", "fix": "Keep to white on an earthy red-brown background."},
    {"art_form": "Madhubani", "mistake": "Leaving large empty background patches", "fix": "Fill spaces with flowers, leaves and fine line patterns."},
    {"art_form": "Gond", "mistake": "Using flat colour without dot and dash patterns", "fix": "Fill bodies with rows of dots and short dashes."},
    {"art_form": "Pattachitra", "mistake": "Shaky, broken outlines", "fix": "Practise smooth, continuous brush strokes."},
]

SAMPLE_POSTS = [
    {"id": "sample-1", "title": "Sample post: a Warli village scene", "art_form": "warli", "image_slug": "warli-village"},
    {"id": "sample-2", "title": "Sample post: painted terracotta pots", "art_form": "pottery", "image_slug": "pottery"},
    {"id": "sample-3", "title": "Sample post: a Madhubani peacock", "art_form": "madhubani", "image_slug": "madhubani"},
    {"id": "sample-4", "title": "Sample post: a Gond tree of life", "art_form": "gond", "image_slug": "gond"},
]


def clean_quote(quote: str | None) -> str:
    """Drop the invented attribution (for example "- Gond Master Artist"): the lines are unattributed notes, not citations."""
    q = (quote or "").strip()
    q = re.split(r"\s[—–-]\s(?=[A-Z][^\"]{0,60}$)", q)[0].strip()
    return q.strip("\"“” ")


def hero_image(slug: str) -> str | None:
    return CATALOGUE.get(slug, (None, None, None))[2]


_TAG = re.compile(r"<[^>]+>")


def load_credits(path: Path) -> list[dict]:
    """Read image_credits.csv. Author cells contain HTML; reduce them to plain text."""
    rows = []
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            title = (r.get("title") or "").strip()
            author = html.unescape(_TAG.sub("", r.get("author") or "")).strip()
            rows.append({
                "title": title.removeprefix("File:"),
                "source_url": "https://commons.wikimedia.org/wiki/" + quote(title.replace(" ", "_"), safe=":_()"),
                "license": (r.get("license") or "").strip(),
                "author": author,
                "art": (r.get("art") or "").strip(),
            })
    return rows
