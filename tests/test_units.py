"""Stores, rate limiter, chat and the manifest check (no model needed)."""
import json
import shutil
import threading
import time
from pathlib import Path

import pytest

from backend import chat
from backend.config import load_settings
from backend.model_service import Knowledge, ModelIntegrityError, check_manifest
from backend.stores import BoundedStore, RateLimiter
from backend.uploads import cleanup_uploads

MODEL_DIR = load_settings().model_dir


# ---- stores ----------------------------------------------------------------------------------------------------
def test_bounded_store_evicts_oldest():
    s = BoundedStore(3)
    for i in range(5):
        s.put(str(i), i)
    assert len(s) == 3 and s.get("0") is None and s.get("4") == 4
    assert s.values() == [4, 3, 2]  # newest first


def test_bounded_store_is_thread_safe():
    s = BoundedStore(50)

    def work(n):
        for i in range(200):
            s.put(f"{n}-{i}", i)
            s.update(f"{n}-{i}", lambda v: v + 1)

    ts = [threading.Thread(target=work, args=(n,)) for n in range(8)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert len(s) == 50


def test_purge_older_than():
    s = BoundedStore(10)
    s.put("a", 1)
    assert s.purge_older_than(3600) == 0
    assert s.purge_older_than(3600, now=time.time() + 7200) == 1 and len(s) == 0


def test_rate_limiter_window():
    r = RateLimiter(2)
    assert r.check("ip", now=0) == 0 and r.check("ip", now=1) == 0
    assert r.check("ip", now=2) > 0
    assert r.check("other", now=2) == 0
    assert r.check("ip", now=61) == 0  # window moved on
    assert RateLimiter(0).check("x") == 0  # disabled


def test_ttl_cleanup_deletes_only_old_files(tmp_path):
    old, new = tmp_path / "old.jpg", tmp_path / "new.jpg"
    old.write_bytes(b"x")
    new.write_bytes(b"x")
    import os

    os.utime(old, (time.time() - 100 * 3600,) * 2)
    assert cleanup_uploads(tmp_path, 24 * 3600) == 1
    assert not old.exists() and new.exists()


# ---- chat ------------------------------------------------------------------------------------------------------
@pytest.fixture(scope="module")
def kb():
    return Knowledge(MODEL_DIR).kb


def test_chat_empty_and_whitespace(kb):
    for m in ("", "   ", "\n\t"):
        assert "type a question" in chat.reply(kb, m)["response"].lower()


def test_chat_long_message_is_truncated(kb):
    r = chat.reply(kb, "warli materials " + "x" * 50000)
    assert "Materials" in r["response"]


def test_chat_non_english_gets_polite_english(kb):
    r = chat.reply(kb, "वारली चित्रकला के बारे में बताइए")
    assert "English" in r["response"]


def test_chat_unknown_art_form(kb):
    assert "do not have notes on Tanjore" in chat.reply(kb, "tell me about tanjore painting")["response"]
    assert "Which art form" in chat.reply(kb, "how do I draw a tree?")["response"]


def test_chat_grounded_answers_per_art_form(kb):
    mats = chat.reply(kb, "What materials does madhubani use?")
    assert mats["art_form"] == "madhubani" and "Materials and techniques" in mats["response"]
    assert all(m in mats["response"] for m in kb["madhubani"]["materials_and_techniques"][:1])
    assert "Common mistakes" in chat.reply(kb, "common gond mistakes")["response"]
    assert "guidance pages only" in chat.reply(kb, "tell me about kalamkari")["response"]
    assert chat.reply(kb, "tell me more", art_form="warli")["art_form"] == "warli"  # hint from earlier turn
    assert chat.reply(kb, "Mithila art colours")["art_form"] == "madhubani"  # alias


def test_chat_never_claims_expert(kb):
    for m in ("tell me about warli", "warli figures", "gond colours", "madhubani border"):
        t = chat.reply(kb, m)["response"].lower()
        assert "master tip" not in t and "expert" not in t


# ---- manifest --------------------------------------------------------------------------------------------------
def test_manifest_ok_for_repo_files():
    meta = check_manifest(MODEL_DIR)
    assert sorted(meta["classes"]) == ["gond", "madhubani", "pattachitra", "warli"]


@pytest.fixture()
def model_copy(tmp_path):
    d = tmp_path / "model"
    shutil.copytree(MODEL_DIR, d, ignore=shutil.ignore_patterns("uploads", "__pycache__"))
    return d


def test_manifest_detects_missing_file(model_copy):
    (model_copy / "clf.joblib").unlink()
    with pytest.raises(ModelIntegrityError, match="missing"):
        check_manifest(model_copy)


def test_manifest_detects_changed_file(model_copy):
    with open(model_copy / "feature_stats.json", "a", encoding="utf-8") as f:
        f.write(" ")
    with pytest.raises(ModelIntegrityError, match="do not match"):
        check_manifest(model_copy)


def _retarget_manifest(d: Path, name: str):
    from backend.model_service import sha256

    m = json.loads((d / 'model_manifest.json').read_text(encoding='utf-8'))
    m['files'][name] = sha256(d / name)
    (d / 'model_manifest.json').write_text(json.dumps(m), encoding='utf-8')


def test_manifest_detects_wrong_class_list(model_copy):
    meta = json.loads((model_copy / 'model_meta.json').read_text(encoding='utf-8'))
    meta['classes'] = ['gond', 'madhubani', 'warli']
    (model_copy / 'model_meta.json').write_text(json.dumps(meta), encoding='utf-8')
    _retarget_manifest(model_copy, 'model_meta.json')
    with pytest.raises(ModelIntegrityError, match='class list'):
        check_manifest(model_copy)


def test_manifest_detects_sklearn_version_mismatch(model_copy, monkeypatch):
    import sklearn

    monkeypatch.setattr(sklearn, '__version__', '9.9.9')
    with pytest.raises(ModelIntegrityError, match='scikit-learn'):
        check_manifest(model_copy)


def test_quote_attributions_are_stripped(kb):
    from backend.content import clean_quote

    for slug, info in kb.items():
        q = clean_quote(info["quote"])
        assert q and "Master" not in q and "Traditional Artist" not in q, slug
    assert clean_quote("Gond is nice. — Gond Master Artist") == "Gond is nice."
    assert clean_quote("A line - with a dash inside the sentence continues here") == "A line - with a dash inside the sentence continues here"
