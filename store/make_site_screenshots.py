"""Captures 1280x800 du Chrome Web Store montrant le bouton dans claude.ai et dans chatgpt.com.

Usage : uv run --no-project --with pillow python store/make_site_screenshots.py
Sources : store/screenshots/raw-claude.png et raw-chatgpt.png (captures d'écran réelles).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from make_images import WHITE, font
from make_screenshot import background, with_shadow

HERE = Path(__file__).resolve().parent
SHOTS = HERE / "screenshots"
W, H = 1280, 800


def site_screenshot(raw: str, heading: str, sub: str, hide=None) -> Image.Image:
    img = background()
    d = ImageDraw.Draw(img)
    d.text((W // 2, 62), heading, font=font(44, bold=True), fill=WHITE, anchor="mm")
    d.text((W // 2, 112), sub, font=font(24), fill=WHITE, anchor="mm")

    shot = Image.open(SHOTS / raw).convert("RGB")
    if hide:  # masque le prénom affiché par le site
        box, color = hide
        ImageDraw.Draw(shot).rectangle(box, fill=color)
    scale = min(1140 / shot.width, 630 / shot.height)
    shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, shot.width - 1, shot.height - 1), radius=20, fill=255)
    shot.putalpha(mask)
    with_shadow(shot, img, ((W - shot.width) // 2, 150 + (630 - shot.height) // 2))
    return img


if __name__ == "__main__":
    site_screenshot(
        "raw-claude.png", "Dans Claude", "Le bouton Garmin apparaît directement dans le chat",
        hide=((590, 290, 1140, 400), (21, 21, 21)),
    ).save(SHOTS / "5-claude-1280x800.png")
    site_screenshot(
        "raw-chatgpt.png", "Et dans ChatGPT", "Même bouton, même fichier, en un clic",
    ).save(SHOTS / "6-chatgpt-1280x800.png")
    print("ok")
