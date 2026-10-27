"""Rule-based coach. Answers come only from knowledge_base.json; there is no language model."""
import re

from .content import AUTOMATED, CATALOGUE, hero_image

MAX_MESSAGE_CHARS = 500
ALIASES = {"mithila": "madhubani", "patachitra": "pattachitra", "patta chitra": "pattachitra", "terracotta": "pottery", "clay": "pottery", "tarpa": "warli"}
OTHER_ARTS = ("tanjore", "phad", "pichwai", "kantha", "ikat", "bidri", "chikankari", "kathak", "bharatanatyam", "sanjhi", "miniature")

INTENTS = [
    ("mistakes", re.compile(r"\b(mistake|mistakes|wrong|error|errors|avoid|common problem)\b")),
    ("materials", re.compile(r"\b(material|materials|colou?rs?|pigment|paint|paints|brush|brushes|paper|tool|tools|technique|techniques|dye|dyes)\b")),
    ("history", re.compile(r"\b(history|origin|origins|region|where|tradition|traditional|heritage|from)\b")),
    ("exercise", re.compile(r"\b(exercise|practice|practise|improve|next|learn|start|begin|beginner)\b")),
    ("features", re.compile(r"\b(figure|figures|human|people|body|face|faces|eye|eyes|border|borders|frame|line|lines|outline|pattern|patterns|motif|motifs|dot|dots|fill|tree|peacock|fish|symbol|draw|drawing|style|feature|features)\b")),
]
STOP = {"draw", "drawing", "style", "feature", "features", "what", "about", "with", "that", "this", "how", "does", "make", "show", "tell", "have", "from", "your"}


def short_name(name: str) -> str:
    return re.split(r"[ /]", name)[0] if name else "this art form"


def detect_art_form(message: str, hint: str | None, kb: dict) -> str | None:
    msg = message.lower()
    for alias, slug in ALIASES.items():
        if alias in msg and slug in kb:
            return slug
    for slug in kb:
        if re.search(rf"\b{re.escape(slug)}\b", msg):
            return slug
    hint = (hint or "").lower().strip()
    return hint if hint in kb else None


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {i}" for i in items)


def reply(kb: dict, message: str, art_form: str | None = None) -> dict:
    msg = " ".join((message or "").split())[:MAX_MESSAGE_CHARS]

    def out(text: str, slug: str | None = None, suggestions: list[str] | None = None) -> dict:
        ref = hero_image(slug) if slug else None
        return {
            "response": text, "art_form": slug or "", "art_name": kb.get(slug, {}).get("name", "") if slug else "",
            "suggestions": suggestions or [], "references": [ref] if ref else [],
        }

    default_suggestions = ["Tell me about Warli", "What materials does Madhubani use?", "Common Gond mistakes"]
    if not msg:
        return out("Please type a question, for example about the materials, features or common mistakes of an art form.", suggestions=default_suggestions)

    letters = [c for c in msg if c.isalpha()]
    if letters and sum(ord(c) > 127 for c in letters) / len(letters) > 0.5:
        return out("Sorry, I can only answer in English for now. Please try your question in English.", suggestions=default_suggestions)

    lower = msg.lower()
    slug = detect_art_form(msg, art_form, kb)
    if slug is None:
        other = next((o for o in OTHER_ARTS if o in lower), None)
        names = ", ".join(short_name(kb[s]["name"]) for s in CATALOGUE if s in kb)
        lead = f"I do not have notes on {other.capitalize()} yet. " if other else "Which art form do you mean? "
        return out(f"{lead}I can answer questions about: {names}.", suggestions=default_suggestions)

    info = kb[slug]
    name = info.get("name", slug.capitalize())
    short = short_name(name)
    chars = info.get("key_characteristics", [])
    suggestions = [f"What are common {short} mistakes?", f"What materials are used in {short}?", f"Give me a {short} practice exercise"]

    intent = next((i for i, rx in INTENTS if rx.search(lower)), None)
    if intent == "mistakes" and info.get("common_mistakes"):
        text = f"Common mistakes in {name}:\n\n{_bullets(info['common_mistakes'])}"
    elif intent == "materials" and info.get("materials_and_techniques"):
        text = f"Materials and techniques for {name}:\n\n{_bullets(info['materials_and_techniques'])}"
    elif intent == "history" and info.get("origin"):
        text = f"About the origin of {name}:\n\n{info['origin']}"
    elif intent == "exercise" and info.get("next_exercise"):
        text = f"A practice exercise for {name}:\n\n{info['next_exercise']}"
    elif intent == "features" and chars:
        words = {w for w in re.findall(r"[a-z]+", lower) if len(w) > 3 and w not in STOP}
        picked = [c for c in chars if any(w.rstrip("s") in (c.get("id", "") + " " + c.get("title", "") + " " + c.get("description", "")).lower() for w in words)] or chars
        text = f"Key features of {name}:\n\n" + "\n".join(f"- **{c['title']}**: {c['description']} Tip: {c['tip']}" for c in picked[:4])
    else:
        parts = [info.get("overview", "")]
        if info.get("quote"):
            parts.append(f"> {info['quote']}")
        if info.get("next_exercise"):
            parts.append(f"**Suggested practice:** {info['next_exercise']}")
        text = "\n\n".join(p for p in parts if p) or f"I have limited notes on {name} so far."
    if slug not in AUTOMATED:
        text += f"\n\nNote: {short} has guidance pages only; there is no automated image analysis for it."
    return out(text, slug, suggestions)
