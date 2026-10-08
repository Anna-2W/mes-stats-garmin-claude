"""Génère les icônes de l'extension (la vignette promo est faite par make_store_images.py, en anglais et en français).

Usage : uv run --with pillow python store/make_images.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
# Eau des Maldives : lagon clair en haut à gauche, bleu plus profond en bas à droite.
LAGOON_LIGHT = (94, 224, 216)
LAGOON_DEEP = (8, 145, 178)
WHITE = (255, 255, 255)
CREAM = (250, 249, 245)
INK = (31, 30, 29)


def draw_icon(size: int) -> Image.Image:
    """Carré arrondi turquoise en dégradé avec une courbe de progression blanche, dessiné en grand puis réduit."""
    big = 512
    gradient = Image.new("RGBA", (big, big))
    gd = ImageDraw.Draw(gradient)
    for i in range(2 * big):  # diagonales successives, du coin haut-gauche au coin bas-droit
        t = i / (2 * big - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(LAGOON_LIGHT, LAGOON_DEEP))
        gd.line([(i, 0), (0, i)], fill=color, width=2)
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle((16, 16, big - 16, big - 16), radius=112, fill=255)
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    img.paste(gradient, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # Courbe de progression qui monte, terminée par une flèche.
    trend = [(100, 380), (200, 290), (260, 330), (390, 170)]
    d.line(trend, fill=WHITE, width=48, joint="curve")
    d.ellipse((76, 356, 124, 404), fill=WHITE)
    d.polygon([(420, 120), (420, 250), (300, 140)], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def promo_tile() -> Image.Image:
    """Vignette 440x280 demandée par le Chrome Web Store."""
    img = Image.new("RGB", (440, 280), CREAM)
    d = ImageDraw.Draw(img)
    icon = draw_icon(120)
    img.paste(icon, (32, 80), icon)
    d.text((172, 92), "Mes Stats", font=font(32, bold=True), fill=INK)
    d.text((172, 128), "Garmin", font=font(32, bold=True), fill=LAGOON_DEEP)
    d.text((172, 174), "Tes stats sportives dans Claude,", font=font(15), fill=INK)
    d.text((172, 194), "en un clic. 100 % local.", font=font(15), fill=INK)
    return img


if __name__ == "__main__":
    icons = ROOT / "icons"
    icons.mkdir(exist_ok=True)
    for s in (16, 32, 48, 128):
        draw_icon(s).save(icons / f"icon{s}.png")
    print("ok")
