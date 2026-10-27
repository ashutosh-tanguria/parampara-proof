"""Upload validation edge cases (no model needed)."""
import io

import pytest
from PIL import Image

from backend.errors import AppError
from backend.uploads import MESSAGES, decode_image

MAX = 10 * 1024 * 1024
MAXPX = 40_000_000


def jpeg(size=(256, 256), **kw):
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 100, 50)).save(buf, "JPEG", **kw)
    return buf.getvalue()


def code_of(data, max_bytes=MAX):
    with pytest.raises(AppError) as e:
        decode_image(data, max_bytes, MAXPX)
    assert e.value.status == 400
    return e.value.code


def test_valid_formats():
    for fmt in ("JPEG", "PNG", "WEBP"):
        buf = io.BytesIO()
        Image.new("RGB", (100, 80), (1, 2, 3)).save(buf, fmt)
        im = decode_image(buf.getvalue(), MAX, MAXPX)
        assert im.mode == "RGB" and im.size == (100, 80)


def test_min_dimension_boundary():
    assert code_of(jpeg((29, 200))) == "image_too_small"
    assert decode_image(jpeg((30, 200)), MAX, MAXPX).size == (30, 200)


def test_zero_byte():
    assert code_of(b"") == "empty_file"


def test_too_large():
    assert code_of(jpeg((600, 600)), max_bytes=1000) == "file_too_large"


def test_text_renamed_as_image_is_unsupported():
    assert code_of(b"hello, this is not an image at all") == "unsupported_type"


def test_pdf_and_svg_are_unsupported():
    assert code_of(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n") == "unsupported_type"
    assert code_of(b'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>') == "unsupported_type"


def test_gif_is_unsupported():
    buf = io.BytesIO()
    Image.new("P", (64, 64)).save(buf, "GIF")
    assert code_of(buf.getvalue()) == "unsupported_type"


def test_corrupt_and_truncated_are_unreadable():
    good = jpeg((400, 400), quality=95)
    assert code_of(good[: len(good) // 2]) == "unreadable_image"  # truncated
    assert code_of(b"\xff\xd8\xff\xe0" + b"garbage" * 50) == "unreadable_image"  # corrupt


def test_decompression_bomb_is_rejected_before_decoding():
    buf = io.BytesIO()
    Image.new("1", (20000, 20000)).save(buf, "PNG")  # 400 megapixels, tiny file
    assert code_of(buf.getvalue()) == "too_many_pixels"


def test_modes_are_converted_to_rgb():
    for mode in ("L", "P", "CMYK", "RGBA", "LA"):
        buf = io.BytesIO()
        fmt = "JPEG" if mode in ("L", "CMYK") else "PNG"
        Image.new(mode, (64, 64)).save(buf, fmt)
        assert decode_image(buf.getvalue(), MAX, MAXPX).mode == "RGB"


def test_alpha_is_flattened_on_white():
    buf = io.BytesIO()
    Image.new("RGBA", (64, 64), (0, 0, 0, 0)).save(buf, "PNG")
    assert decode_image(buf.getvalue(), MAX, MAXPX).getpixel((5, 5)) == (255, 255, 255)


def test_exif_orientation_is_applied():
    im = Image.new("RGB", (100, 50), (10, 20, 30))
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90 degrees
    buf = io.BytesIO()
    im.save(buf, "JPEG", exif=exif)
    assert decode_image(buf.getvalue(), MAX, MAXPX).size == (50, 100)


def test_animated_webp_uses_first_frame():
    frames = [Image.new("RGB", (64, 64), c) for c in ((255, 0, 0), (0, 255, 0), (0, 0, 255))]
    buf = io.BytesIO()
    frames[0].save(buf, "WEBP", save_all=True, append_images=frames[1:], duration=100, lossless=True)
    im = decode_image(buf.getvalue(), MAX, MAXPX)
    assert im.getpixel((10, 10))[0] > 200  # first frame is red


def test_messages_match_frontend():
    """The client shows the same text; keep frontend/src/lib/validate.ts in sync."""
    import re
    from pathlib import Path

    ts = (Path(__file__).resolve().parent.parent / "frontend" / "src" / "lib" / "validate.ts").read_text(encoding="utf-8")
    consts = {k: int(v.replace("_", "")) for k, v in re.findall(r"export const (\w+) = ([\d_]+)", ts)}
    assert consts["MIN_DIMENSION"] == 30 and consts["MAX_UPLOAD_MB"] == 10 and consts["MAX_PIXELS"] == 40_000_000

    def render(template: str) -> str:  # evaluate the simple ${NAME} placeholders
        template = template.replace("${MAX_PIXELS / 1_000_000}", str(consts["MAX_PIXELS"] // 1_000_000))
        return re.sub(r"\$\{(\w+)\}", lambda m: str(consts[m.group(1)]), template)

    messages = dict(re.findall(r"^\s+(\w+): [`'](.*)[`'],\s*$", ts, re.M))
    expected = {
        "type": MESSAGES["type"], "empty": MESSAGES["empty"], "unreadable": MESSAGES["unreadable"],
        "tooLarge": MESSAGES["too_large"].format(mb=10), "tooSmall": MESSAGES["too_small"],
        "tooManyPixels": MESSAGES["too_many_pixels"].format(mp=40),
    }
    for key, text in expected.items():
        assert render(messages[key]) == text, key
