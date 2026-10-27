"""One-to-one text conversations between logged-in users (plain polling, no WebSockets, no AI)."""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from .auth import CONTROL, require_user
from .errors import AppError
from .stores import RateLimiter

MAX_BODY = 1000
CONTEXTS = ("video", "listing", "teacher", "none")

router = APIRouter(prefix="/api/conversations")
send_limiter = RateLimiter(30)  # messages per minute per user


class StartRequest(BaseModel):
    to_user_id: int
    context_type: str = "none"
    context_id: int = 0


class SendRequest(BaseModel):
    body: str = ""


def clean_body(text: str) -> str:
    """Control characters are removed. HTML is not rewritten: the client renders messages as plain text only."""
    lines = text.replace("\r\n", "\n").split("\n")
    return "\n".join(CONTROL.sub("", ln) for ln in lines).strip()


def message_json(row) -> dict:
    return {"id": row["id"], "conversation_id": row["conversation_id"], "sender_id": row["sender_id"], "body": row["body"], "created_at": row["created_at"], "read": row["read_at"] is not None}


def _mine(db, conv_id: int, user):
    row = db.execute("SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)", (conv_id, user["id"], user["id"])).fetchone()
    if not row:
        raise AppError(404, "conversation_not_found", "We could not find that conversation.")
    return row


@router.get("")
def list_conversations(request: Request, user=Depends(require_user)):
    with request.app.state.db.connect() as db:
        rows = db.execute(
            """SELECT c.*, u.id AS other_id, u.display_name AS other_name, u.role AS other_role, u.is_demo AS other_demo,
                      (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body,
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read_at IS NULL) AS unread
               FROM conversations c JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
               WHERE c.user_a = ? OR c.user_b = ? ORDER BY c.last_message_at DESC, c.id DESC""",
            (user["id"], user["id"], user["id"], user["id"])).fetchall()
    return {"conversations": [{
        "id": r["id"], "other": {"id": r["other_id"], "display_name": r["other_name"], "role": r["other_role"], "is_demo": bool(r["other_demo"])},
        "context": {"type": r["context_type"], "id": r["context_id"], "title": r["context_title"]} if r["context_type"] != "none" else None,
        "last_message": r["last_body"], "last_message_at": r["last_message_at"], "unread": r["unread"]} for r in rows]}


@router.get("/unread-count")
def unread_count(request: Request, user=Depends(require_user)):
    with request.app.state.db.connect() as db:
        n = db.execute(
            """SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
               WHERE (c.user_a = ? OR c.user_b = ?) AND m.sender_id != ? AND m.read_at IS NULL""", (user["id"],) * 3).fetchone()[0]
    return {"unread": n}


@router.post("", status_code=201)
def start_conversation(req: StartRequest, request: Request, user=Depends(require_user)):
    if req.to_user_id == user["id"]:
        raise AppError(400, "message_self", "You cannot start a conversation with yourself.")
    ctype = req.context_type if req.context_type in CONTEXTS else "none"
    with request.app.state.db.connect() as db:
        other = db.execute("SELECT id FROM users WHERE id = ?", (req.to_user_id,)).fetchone()
        if not other:
            raise AppError(404, "user_not_found", "We could not find that person.")
        title, cid = "", 0
        if ctype == "video":
            r = db.execute("SELECT id, title, owner_id FROM videos WHERE id = ?", (req.context_id,)).fetchone()
        elif ctype == "listing":
            r = db.execute("SELECT id, title, owner_id FROM listings WHERE id = ?", (req.context_id,)).fetchone()
        else:
            r = None
        if ctype in ("video", "listing"):
            if not r or r["owner_id"] != req.to_user_id:
                raise AppError(400, "invalid_context", "That item does not belong to the person you are messaging.")
            title, cid = r["title"], r["id"]
        else:
            ctype = "teacher" if ctype == "teacher" else "none"
        a, b = sorted((user["id"], req.to_user_id))
        row = db.execute("SELECT * FROM conversations WHERE user_a=? AND user_b=? AND context_type=? AND context_id=?", (a, b, ctype, cid)).fetchone()
        if not row:
            cur = db.execute("INSERT INTO conversations (user_a,user_b,context_type,context_id,context_title) VALUES (?,?,?,?,?)", (a, b, ctype, cid, title))
            row = db.execute("SELECT * FROM conversations WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {"id": row["id"]}


@router.get("/{conv_id}/messages")
def get_messages(conv_id: int, request: Request, after: int = 0, user=Depends(require_user)):
    with request.app.state.db.connect() as db:
        conv = _mine(db, conv_id, user)
        rows = db.execute("SELECT * FROM messages WHERE conversation_id = ? AND id > ? ORDER BY id LIMIT 200", (conv_id, max(0, after))).fetchall()
        other_id = conv["user_b"] if conv["user_a"] == user["id"] else conv["user_a"]
        other = db.execute("SELECT id, display_name, role, is_demo FROM users WHERE id = ?", (other_id,)).fetchone()
    return {
        "messages": [message_json(r) for r in rows],
        "other": {"id": other["id"], "display_name": other["display_name"], "role": other["role"], "is_demo": bool(other["is_demo"])},
        "context": {"type": conv["context_type"], "id": conv["context_id"], "title": conv["context_title"]} if conv["context_type"] != "none" else None,
    }


@router.post("/{conv_id}/messages", status_code=201)
def send_message(conv_id: int, req: SendRequest, request: Request, user=Depends(require_user)):
    body = clean_body(req.body)
    if not body:
        raise AppError(400, "empty_message", "Please type a message.")
    if len(body) > MAX_BODY:
        raise AppError(400, "message_too_long", f"Messages can be at most {MAX_BODY} characters.")
    wait = send_limiter.check(str(user["id"]))
    if wait:
        raise AppError(429, "rate_limited", "You are sending messages too quickly. Please wait a moment.", {"Retry-After": str(int(wait))})
    with request.app.state.db.connect() as db:
        _mine(db, conv_id, user)
        cur = db.execute("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)", (conv_id, user["id"], body))
        db.execute("UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?", (conv_id,))
        row = db.execute("SELECT * FROM messages WHERE id = ?", (cur.lastrowid,)).fetchone()
    return message_json(row)


@router.post("/{conv_id}/read")
def mark_read(conv_id: int, request: Request, user=Depends(require_user)):
    with request.app.state.db.connect() as db:
        _mine(db, conv_id, user)
        cur = db.execute("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL", (conv_id, user["id"]))
    return {"marked": cur.rowcount}
