"""Construit la capture 1280x800 du Chrome Web Store à partir d'une capture du panneau.

Usage : uv run --no-project --with pillow python store/make_screenshot.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from make_images import LAGOON_DEEP, LAGOON_LIGHT, WHITE, font

HERE = Path(__file__).resolve().parent
W, H = 1280, 800


def background() -> Image.Image:
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for i in range(W + H):  # dégradé diagonal lagon
        t = i / (W + H - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(LAGOON_LIGHT, LAGOON_DEEP))
        d.line([(i, 0), (i - H, H)], fill=color, width=2)
    return img


def with_shadow(img: Image.Image, base: Image.Image, pos: tuple[int, int]) -> None:
    shadow = Image.new("RGBA", (img.width + 80, img.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((40, 50, img.width + 40, img.height + 50), radius=28, fill=(0, 40, 60, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.paste(shadow, (pos[0] - 40, pos[1] - 40), shadow)
    base.paste(img, pos, img if img.mode == "RGBA" else None)


def panel_screenshot() -> Image.Image:
    img = background()
    d = ImageDraw.Draw(img)
    d.text((80, 210), "Tes stats Garmin", font=font(50, bold=True), fill=WHITE)
    d.text((80, 272), "dans Claude, en un clic", font=font(50, bold=True), fill=WHITE)
    bullets = [
        "Activités, sommeil, HRV, VO2 max, charge",
        "Détail de chaque séance : tours, zones, séries",
        "De 7 jours à 1 an, filtrable par sport",
        "100 % local : rien ne quitte ton navigateur",
    ]
    for i, b in enumerate(bullets):
        y = 380 + i * 46
        d.ellipse((82, y + 9, 96, y + 23), fill=WHITE)
        d.text((112, y), b, font=font(24), fill=WHITE)

    panel = Image.open(HERE / "screenshots" / "raw-panel.png").convert("RGBA")
    scale = 520 / panel.height
    panel = panel.resize((round(panel.width * scale), 520), Image.LANCZOS)
    mask = Image.new("L", panel.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, panel.width - 1, panel.height - 1), radius=28, fill=255)
    panel.putalpha(mask)
    with_shadow(panel, img, (W - panel.width - 80, (H - panel.height) // 2))
    return img


if __name__ == "__main__":
    panel_screenshot().save(HERE / "screenshots" / "1-panneau-1280x800.png")
    print("ok")
