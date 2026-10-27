import os, json, uuid, time
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from backend.model_service import ModelService

app = FastAPI(
    title="Parampara Proof API",
    description="Zero-Paid-AI Folk Art Learning and Preservation Platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Mount uploads static directory
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Mount assets directory if available
PUBLIC_ASSETS = os.path.join(os.path.dirname(BASE_DIR), "frontend", "public", "assets")
if os.path.exists(PUBLIC_ASSETS):
    app.mount("/assets", StaticFiles(directory=PUBLIC_ASSETS), name="assets")

# Local in-memory persistent stores
ANALYSIS_RECORDS = {}
COMMUNITY_ARTWORKS = [
    {
        "id": "comm-1",
        "title": "My first Warli painting! Would love your feedback.",
        "art_form": "warli",
        "artist": "Ananya S.",
        "avatar": "/assets/ui/avatar.jpg",
        "image_url": "/assets/analysis/warli-sample.jpg",
        "created_at": "2 days ago",
        "likes": 24,
        "comments": 8,
        "is_curated": True
    },
    {
        "id": "comm-2",
        "title": "Traditional terracotta earthen pots with relief carving",
        "art_form": "pottery",
        "artist": "Rohan K.",
        "avatar": "/assets/ui/avatar.jpg",
        "image_url": "/assets/art-forms/pottery.jpg",
        "created_at": "4 days ago",
        "likes": 42,
        "comments": 15,
        "is_curated": True
    },
    {
        "id": "comm-3",
        "title": "Mithila Kohbar Peacock on handmade cow-dung paper",
        "art_form": "madhubani",
        "artist": "Priya M.",
        "avatar": "/assets/ui/avatar.jpg",
        "image_url": "/assets/art-forms/madhubani-detail.jpg",
        "created_at": "1 week ago",
        "likes": 56,
        "comments": 19,
        "is_curated": True
    },
    {
        "id": "comm-4",
        "title": "Gond Sacred Tree of Life with flying cranes",
        "art_form": "gond",
        "artist": "Vikram R.",
        "avatar": "/assets/ui/avatar.jpg",
        "image_url": "/assets/art-forms/gond.jpg",
        "created_at": "1 week ago",
        "likes": 38,
        "comments": 11,
        "is_curated": True
    }
]

PORTFOLIO_USER = {
    "name": "Ananya S.",
    "handle": "@ananya_art",
    "avatar": "/assets/ui/avatar.jpg",
    "uploads_count": 12,
    "analysed_count": 8,
    "followers_count": 4,
    "bio": "Enthusiastic beginner exploring Maharashtra Warli and Mithila folk art traditions."
}

# Pre-populate sample analysis for instant review
SAMPLE_ANALYSIS_ID = "warli-demo-001"
ANALYSIS_RECORDS[SAMPLE_ANALYSIS_ID] = {
    "id": SAMPLE_ANALYSIS_ID,
    "image_url": "/assets/analysis/warli-sample.jpg",
    "target_art_form": "warli",
    "target_name": "Warli Painting",
    "automated_supported": True,
    "model_version": "Parampara-FolkArt-Vision-v1.2 (scikit-learn + calibrated CV)",
    "probabilities": {
        "warli": 0.88,
        "madhubani": 0.05,
        "gond": 0.04,
        "pattachitra": 0.03
    },
    "predicted_art_form": "warli",
    "style_match_score": 0.88,
    "overall_score": None,
    "overall_assessment": "Good attempt! Your artwork follows many traditional elements but needs some improvements in line thickness and figure proportions.",
    "style_match_comment": "Style match with Warli Painting is calibrated at 88%. Strong adherence to monochromatic rice paste on mud ochre background.",
    "strengths": [
        "Follows geometric style with elemental inverted triangles",
        "Good use of traditional motifs and Tarpa dance movement"
    ],
    "areas_for_improvement": [
        {
            "feature": "Figure Proportions",
            "issue": "Human figures can be more proportional",
            "why_it_matters": "In Warli, the upper torso and lower torso maintain an equal triangular equilibrium",
            "fix": "Ensure upper and lower triangles touch precisely at vertices without disjointed gaps"
        },
        {
            "feature": "Line Consistency",
            "issue": "Line thickness is inconsistent across dancing circle",
            "why_it_matters": "Continuous rhythmic stroke weight gives the communal dance its hypnotic unity",
            "fix": "Maintain steady brush pressure when painting arms and linked hands"
        },
        {
            "feature": "Compositional Balance",
            "issue": "Add more nature elements for balance",
            "why_it_matters": "Warli cosmology represents total integration of human celebration with surrounding flora and fauna",
            "fix": "Scatter small stylized deer, birds, and palm trees in surrounding open spaces"
        }
    ],
    "feature_checks": [
        {
            "id": "white_on_earth",
            "title": "White on Earthy Mud Base",
            "status": "present",
            "description": "Monochromatic white pigment applied against a rich red-ochre background.",
            "tip": "Maintain strict white-on-terracotta purity."
        },
        {
            "id": "geometric_figures",
            "title": "Elemental Geometric Anatomy",
            "status": "present",
            "description": "Human figures constructed from two inverted triangles and a circular head.",
            "tip": "Keep limbs as single unshaded strokes."
        },
        {
            "id": "circle_dance",
            "title": "Tarpa Circle Dance Movement",
            "status": "present",
            "description": "Dancers holding hands in a spiral or circular formation around a musician.",
            "tip": "Arrange dancers in rhythmic spiral arcs."
        },
        {
            "id": "village_scenes",
            "title": "Cyclical Village & Nature Themes",
            "status": "weak",
            "description": "Scenes depict everyday village activities, trees, and domestic animals.",
            "tip": "Add small agrarian motifs like cattle, huts, and the Tree of Life."
        },
        {
            "id": "geometric_frame",
            "title": "Geometric Triangle Border",
            "status": "weak",
            "description": "Borders feature repetitive linear motifs and chevron triangles.",
            "tip": "Frame the canvas with an inward-pointing triangular border."
        }
    ],
    "next_exercise": "Create a 5-figure Tarpa circle dance: begin with a central musician, draw 5 figures using connected inverted triangles with linked arms, framed by a chevron border.",
    "reference_artwork": "/assets/analysis/warli-reference.jpg",
    "user_note": "I tried to draw a village harvest dance, wondering about proportions",
    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
}

# --- Pydantic Schemas ---
class ChatRequest(BaseModel):
    message: str
    art_form: Optional[str] = "warli"
    history: Optional[List[dict]] = None

class CommunitySubmitRequest(BaseModel):
    title: str
    art_form: str
    image_url: str
    artist: Optional[str] = "Ananya S."

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    svc = ModelService.get_instance()
    return {
        "status": "ok",
        "version": "1.0.0",
        "model_service": "online",
        "model_version": svc.model_version,
        "classes_supported": ["madhubani", "warli", "gond", "pattachitra"],
        "exploratory_classes": ["kalamkari", "pottery"],
        "zero_paid_ai_policy": "Strictly verified: zero paid AI APIs used"
    }

@app.get("/api/art-forms")
def get_art_forms():
    svc = ModelService.get_instance()
    forms = []
    
    catalogue_order = [
        ("madhubani", "Madhubani", "Vibrant stories from Bihar", "Painting", "/assets/art-forms/madhubani.jpg"),
        ("warli", "Warli", "Minimalist tribal art from Maharashtra", "Tribal Art", "/assets/art-forms/warli.jpg"),
        ("gond", "Gond", "Nature-inspired tribal art from Madhya Pradesh", "Tribal Art", "/assets/art-forms/gond.jpg"),
        ("kalamkari", "Kalamkari", "Hand-painted textile art from Andhra Pradesh", "Textile", "/assets/art-forms/kalamkari.jpg"),
        ("pottery", "Traditional Pottery", "Timeless clay craftsmanship across India", "Pottery", "/assets/art-forms/pottery.jpg"),
        ("pattachitra", "Pattachitra", "Classical narrative scroll art from Odisha", "Painting", "/assets/art-forms/pattachitra.jpg")
    ]
    
    for slug, title, subtitle, category, img in catalogue_order:
        kb_info = svc.kb.get(slug, {})
        forms.append({
            "slug": slug,
            "name": kb_info.get("name", title),
            "subtitle": subtitle,
            "category": category,
            "image": img,
            "automated_supported": kb_info.get("automated_supported", False),
            "origin": kb_info.get("origin", ""),
            "quote": kb_info.get("quote", ""),
            "overview": kb_info.get("overview", "")
        })
        
    return {"art_forms": forms}

@app.get("/api/art-forms/{slug}")
def get_art_form_detail(slug: str):
    svc = ModelService.get_instance()
    slug_lower = slug.lower().strip()
    kb_info = svc.kb.get(slug_lower)
    
    if not kb_info:
        raise HTTPException(status_code=404, detail=f"Art form '{slug}' not found.")
        
    img_map = {
        "madhubani": "/assets/art-forms/madhubani-detail.jpg",
        "warli": "/assets/art-forms/warli.jpg",
        "gond": "/assets/art-forms/gond.jpg",
        "kalamkari": "/assets/art-forms/kalamkari.jpg",
        "pottery": "/assets/art-forms/pottery.jpg",
        "pattachitra": "/assets/art-forms/pattachitra.jpg"
    }
    
    return {
        "slug": slug_lower,
        "name": kb_info.get("name"),
        "hero_image": img_map.get(slug_lower, f"/assets/art-forms/{slug_lower}.jpg"),
        "automated_supported": kb_info.get("automated_supported", False),
        "origin": kb_info.get("origin"),
        "quote": kb_info.get("quote"),
        "overview": kb_info.get("overview"),
        "key_characteristics": kb_info.get("key_characteristics", []),
        "materials_and_techniques": kb_info.get("materials_and_techniques", []),
        "common_mistakes": kb_info.get("common_mistakes", []),
        "next_exercise": kb_info.get("next_exercise", ""),
        "reference_gallery": [
            {"title": "Traditional Masterwork", "image": img_map.get(slug_lower, f"/assets/art-forms/{slug_lower}.jpg")},
            {"title": "Authentic Motif Specimen", "image": f"/assets/art-forms/{slug_lower}.jpg"}
        ]
    }

@app.get("/api/lessons")
def get_lessons():
    return {
        "featured": {
            "title": "Getting Started with Warli Painting",
            "duration": "8:24",
            "instructor": "Master Ramesh Hengadi, Warli Artisan",
            "art_form": "warli",
            "video_image": "/assets/learning/video-warli-main.jpg",
            "description": "Learn the elemental geometric shapes, sacred Tarpa dance spiral, and traditional rice-paste formulation on mud canvas."
        },
        "playlist": [
            {"id": "l-1", "title": "Getting Started with Warli", "duration": "8:24", "thumbnail": "/assets/learning/thumb-getting-started.jpg", "category": "Video Lessons"},
            {"id": "l-2", "title": "Basic Shapes and Motifs", "duration": "6:12", "thumbnail": "/assets/learning/thumb-basic-shapes.jpg", "category": "Video Lessons"},
            {"id": "l-3", "title": "Human Figures & Anatomy", "duration": "10:15", "thumbnail": "/assets/learning/thumb-human-figures.jpg", "category": "Video Lessons"},
            {"id": "l-4", "title": "Nature and Daily Life Themes", "duration": "7:30", "thumbnail": "/assets/learning/thumb-nature-themes.jpg", "category": "Video Lessons"},
            {"id": "l-5", "title": "Complete Artwork Demo", "duration": "12:40", "thumbnail": "/assets/learning/thumb-complete-demo.jpg", "category": "Video Lessons"}
        ],
        "common_mistakes": [
            {"art_form": "Warli", "mistake": "Adding multi-colored pigments", "fix": "Maintain strict white-on-mud monochromatic contrast."},
            {"art_form": "Madhubani", "mistake": "Leaving large empty background patches", "fix": "Fill intermediate spaces with flora, peacock feathers, and Kachni lines."},
            {"art_form": "Gond", "mistake": "Using flat color without signature patterns", "fix": "Fill animal bodies with uniform rows of dots and short dashes."},
            {"art_form": "Pattachitra", "mistake": "Shaky broken contours", "fix": "Practice fluid continuous brush strokes using firm finger control."}
        ],
        "practice_exercises": [
            {"id": "ex-1", "title": "5-Figure Tarpa Dance Spiral", "art_form": "Warli", "difficulty": "Beginner"},
            {"id": "ex-2", "title": "Double-Line Floral Border", "art_form": "Madhubani", "difficulty": "Beginner"},
            {"id": "ex-3", "title": "Gond Deer with Dharmis Texture", "art_form": "Gond", "difficulty": "Intermediate"},
            {"id": "ex-4", "title": "Pattachitra Lotus Corner Motif", "art_form": "Pattachitra", "difficulty": "Advanced"}
        ]
    }

@app.post("/api/analyze")
async def analyze_artwork(
    image: UploadFile = File(...),
    art_form: str = Form("warli"),
    user_note: Optional[str] = Form(None),
    language: Optional[str] = Form("English")
):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type not in allowed_types and not image.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP.")
        
    contents = await image.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file exceeds 10MB limit.")
        
    analysis_id = str(uuid.uuid4())
    filename = f"{analysis_id}_{image.filename}"
    file_path = os.path.join(UPLOADS_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(contents)
        
    image_url = f"/uploads/{filename}"
    
    svc = ModelService.get_instance()
    try:
        result = svc.analyze(contents, target_art_form=art_form, language=language, user_note=user_note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
        
    result["id"] = analysis_id
    result["image_url"] = image_url
    result["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    ANALYSIS_RECORDS[analysis_id] = result
    return result

@app.get("/api/analysis/{analysis_id}")
def get_analysis_result(analysis_id: str):
    record = ANALYSIS_RECORDS.get(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis report not found.")
    return record

@app.post("/api/chat")
def chat_with_coach(req: ChatRequest):
    svc = ModelService.get_instance()
    return svc.chat(req.message, art_form=req.art_form, conversation_history=req.history)

@app.get("/api/community")
def get_community_artworks():
    return {"artworks": COMMUNITY_ARTWORKS}

@app.post("/api/community/{artwork_id}/like")
def toggle_like(artwork_id: str):
    for art in COMMUNITY_ARTWORKS:
        if art["id"] == artwork_id:
            art["likes"] += 1
            return {"id": artwork_id, "likes": art["likes"]}
    raise HTTPException(status_code=404, detail="Artwork not found.")

@app.post("/api/artworks")
def submit_to_community(req: CommunitySubmitRequest):
    new_art = {
        "id": f"user-{uuid.uuid4().hex[:6]}",
        "title": req.title,
        "art_form": req.art_form,
        "artist": req.artist or "Ananya S.",
        "avatar": "/assets/ui/avatar.jpg",
        "image_url": req.image_url,
        "created_at": "Just now",
        "likes": 1,
        "comments": 0,
        "is_curated": False
    }
    COMMUNITY_ARTWORKS.insert(0, new_art)
    return new_art

@app.get("/api/portfolio")
def get_user_portfolio():
    user_artworks = [art for art in COMMUNITY_ARTWORKS if art["artist"] == PORTFOLIO_USER["name"]]
    analysed_artworks = list(ANALYSIS_RECORDS.values())
    return {
        "user": PORTFOLIO_USER,
        "artworks": user_artworks,
        "analysed": analysed_artworks,
        "saved_references": [
            {"title": "Madhubani Traditional Masterwork", "art_form": "madhubani", "image": "/assets/art-forms/madhubani-detail.jpg"},
            {"title": "Warli Tarpa Dance Specimen", "art_form": "warli", "image": "/assets/art-forms/warli.jpg"},
            {"title": "Terracotta Earthen Vessels", "art_form": "pottery", "image": "/assets/art-forms/pottery.jpg"}
        ]
    }

# --- Single Page Application (SPA) Static Serving ---
DIST_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

if os.path.exists(DIST_DIR):
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
