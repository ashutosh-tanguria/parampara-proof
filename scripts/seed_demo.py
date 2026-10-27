"""Create demo craftspeople, videos and listings for the local demo. Safe to run more than once.

    python scripts/seed_demo.py

Demo logins (LOCAL DEMO ONLY: these passwords are public, never reuse them anywhere):
    demo.madhubani@example.com   password: Demo-Pass-2026   (Craftsperson, Madhubani)
    demo.warli@example.com       password: Demo-Pass-2026   (Craftsperson, Warli)
    demo.gond@example.com        password: Demo-Pass-2026   (Craftsperson, Gond)
    demo.learner@example.com     password: Demo-Pass-2026   (Learner)

Everything created here is flagged is_demo and shown as "Demo data" in the app.
- The people are fictional. There are no real artists, reviews or sales.
- The videos are placeholders ("Demo video, no real video attached"): no freely licensed video was verified for this repository.
- The listing pictures are the team's AI-generated illustrations from frontend/public/assets (the Wikimedia training images are not
  stored in this repository). They are illustrations, not photographs of real products.
"""
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.auth import hash_password  # noqa: E402
from backend.config import load_settings  # noqa: E402
from backend.db import Database  # noqa: E402

PASSWORD = "Demo-Pass-2026"
CREDIT = "AI-generated illustration supplied by the team. Not a real product. See the Credits page."
NOTE = "Demo profile. Not a real person; not verified."

PEOPLE = [
    ("demo.madhubani@example.com", "Demo Madhubani Artisan", "craftsperson", "madhubani", "Mithila region (demo profile)", f"{NOTE} Shows how a craftsperson page looks."),
    ("demo.warli@example.com", "Demo Warli Artisan", "craftsperson", "warli", "Maharashtra region (demo profile)", f"{NOTE} Shows how a craftsperson page looks."),
    ("demo.gond@example.com", "Demo Gond Artisan", "craftsperson", "gond", "Madhya Pradesh region (demo profile)", f"{NOTE} Shows how a craftsperson page looks."),
    ("demo.learner@example.com", "Demo Learner", "learner", None, "", "Demo learner account."),
]

PLACEHOLDER = "Demo video, no real video attached. "
VIDEOS = [
    ("demo.madhubani@example.com", "Madhubani basics: double-line borders", "madhubani", "Beginner", "Outline of a lesson on drawing a double-line border and filling it with a vine pattern."),
    ("demo.madhubani@example.com", "Madhubani: filling a peacock with line patterns", "madhubani", "Intermediate", "Outline of a lesson on hatching and dot fills inside a bird motif."),
    ("demo.warli@example.com", "Warli basics: figures from two triangles", "warli", "Beginner", "Outline of a lesson on building people from a circle and two triangles."),
    ("demo.warli@example.com", "Warli: a circle dance composition", "warli", "Intermediate", "Outline of a lesson on arranging dancers, a drummer and a border on one sheet."),
    ("demo.gond@example.com", "Gond basics: dots and dashes", "gond", "Beginner", "Outline of a lesson on filling an animal outline with rows of dots and short dashes."),
    ("demo.gond@example.com", "Gond: a tree of life with birds", "gond", "Advanced", "Outline of a lesson on balancing branches, birds and fine texture."),
]

# (owner, title, art form, price INR, size, materials, description, [image slugs (group/slug)])
LISTINGS = [
    ("demo.madhubani@example.com", "Peacock and fish panel", "madhubani", 4200, "A3 (about 30 x 42 cm)", "Paper, natural-style pigments (demo)", "Demo listing. A peacock, fish and lotus panel in a Madhubani style with a patterned border.", ["art-forms/madhubani"]),
    ("demo.madhubani@example.com", "Woman and peacock, red border", "madhubani", 5600, "A3 (about 30 x 42 cm)", "Paper, ink and colour (demo)", "Demo listing. A figure holding a lotus beside a peacock, framed by a red border.", ["gallery/madhubani-woman-peacock"]),
    ("demo.madhubani@example.com", "Madhubani pair, small sheets", "madhubani", 7800, "Two sheets, A4", "Paper, ink and colour (demo)", "Demo listing. Two small sheets sold together.", ["art-forms/madhubani", "gallery/madhubani-woman-peacock"]),
    ("demo.warli@example.com", "Village scene, white on red earth", "warli", 3100, "A3 (about 30 x 42 cm)", "Cloth board, red earth base, white paint (demo)", "Demo listing. A village scene with a hut, trees and a row of figures.", ["gallery/warli-village"]),
    ("demo.warli@example.com", "Circle dance with drummer", "warli", 3900, "A2 (about 42 x 60 cm)", "Cloth board, red earth base, white paint (demo)", "Demo listing. Dancers in a ring around a drummer.", ["gallery/warli-dance"]),
    ("demo.warli@example.com", "Dancers panel", "warli", 2600, "A3 (about 30 x 42 cm)", "Paper, red earth base, white paint (demo)", "Demo listing. A row of dancers with a hut and a palm.", ["gallery/warli-brushes", "art-forms/warli"]),
    ("demo.gond@example.com", "Tree of life with birds and deer", "gond", 6400, "A3 (about 30 x 42 cm)", "Paper, acrylic-style colour (demo)", "Demo listing. A tree with birds and deer, filled with dots and dashes.", ["art-forms/gond"]),
    ("demo.gond@example.com", "Tree of life, small sheet", "gond", 2900, "A4", "Paper, acrylic-style colour (demo)", "Demo listing. A smaller version of the tree of life.", ["art-forms/gond"]),
]


def main() -> None:
    s = load_settings()
    db = Database(s.data_dir / "app.db")
    folder = s.data_dir / "uploads" / "listings"
    folder.mkdir(parents=True, exist_ok=True)
    created = {"users": 0, "videos": 0, "listings": 0}
    with db.connect() as conn:
        ids = {}
        for username, name, role, art, region, bio in PEOPLE:
            row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if row:
                ids[username] = row["id"]
                continue
            cur = conn.execute("INSERT INTO users (username, display_name, role, password_hash, bio, art_form, region, is_demo) VALUES (?,?,?,?,?,?,?,1)",
                               (username, name, role, hash_password(PASSWORD), bio, art, region))
            ids[username] = cur.lastrowid
            created["users"] += 1
        for owner, title, art, level, desc in VIDEOS:
            if conn.execute("SELECT 1 FROM videos WHERE owner_id = ? AND title = ?", (ids[owner], title)).fetchone():
                continue
            conn.execute("INSERT INTO videos (owner_id, title, description, art_form, level, kind, is_demo) VALUES (?,?,?,?,?,'placeholder',1)",
                         (ids[owner], title, PLACEHOLDER + desc, art, level))
            created["videos"] += 1
        for owner, title, art, price, size, materials, desc, images in LISTINGS:
            for ref in images:  # make sure the picture files exist (also repairs a deleted file on a re-run)
                group, slug = ref.split("/")
                target = folder / f"demo-{slug}.jpg"
                if not target.exists():
                    shutil.copyfile(ROOT / "frontend" / "public" / "assets" / group / f"{slug}-960.jpg", target)
            if conn.execute("SELECT 1 FROM listings WHERE owner_id = ? AND title = ?", (ids[owner], title)).fetchone():
                continue
            cur = conn.execute("INSERT INTO listings (owner_id, title, description, art_form, price_inr, size, materials, credit, is_demo) VALUES (?,?,?,?,?,?,?,?,1)",
                               (ids[owner], title, desc, art, price, size, materials, CREDIT))
            for pos, ref in enumerate(images):
                group, slug = ref.split("/")
                src = ROOT / "frontend" / "public" / "assets" / group / f"{slug}-960.jpg"
                name = f"demo-{slug}.jpg"
                if not (folder / name).exists():
                    shutil.copyfile(src, folder / name)
                conn.execute("INSERT INTO listing_images (listing_id, file_name, position) VALUES (?,?,?)", (cur.lastrowid, name, pos))
            created["listings"] += 1
    print(f"Demo data ready in {s.data_dir}: created {created} (existing items were left as they are).")
    print("Log in with demo.madhubani@example.com / demo.warli@example.com / demo.gond@example.com / demo.learner@example.com, password: " + PASSWORD)


if __name__ == "__main__":
    main()
