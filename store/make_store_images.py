"""Captures 2 à 4 (1280x800) et bannière (1400x560) du Chrome Web Store.

Usage : uv run --no-project --with pillow python store/make_store_images.py
Les chiffres affichés sont des exemples inventés, pas de vraies données.
"""
from pathlib import Path

from PIL import Image, ImageDraw

from make_images import LAGOON_DEEP, LAGOON_LIGHT, WHITE, draw_icon, font

HERE = Path(__file__).resolve().parent
OUT = HERE / "screenshots"
INK = (31, 30, 29)
MUTED = (95, 110, 115)
CARD = (255, 255, 255)
LINE = (226, 232, 234)


def lagoon(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for i in range(w + h):
        t = i / (w + h - 1)
        d.line([(i, 0), (i - h, h)], fill=tuple(round(a + (b - a) * t) for a, b in zip(LAGOON_LIGHT, LAGOON_DEEP)), width=2)
    return img


def card(d: ImageDraw.ImageDraw, box, radius=24):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + 6, y0 + 10, x1 + 6, y1 + 10), radius=radius, fill=(6, 110, 135))  # ombre simple
    d.rounded_rectangle(box, radius=radius, fill=CARD)


def title(d, text, sub=None):
    d.text((80, 60), text, font=font(46, bold=True), fill=WHITE)
    if sub:
        d.text((80, 120), sub, font=font(24), fill=WHITE)


def screenshot_data() -> Image.Image:
    """Aperçu du fichier envoyé à Claude."""
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    title(d, "Toutes tes stats, bien rangées", "Un fichier clair que Claude lit en entier (exemple de données)")
    card(d, (80, 190, 1200, 740))
    x, y = 120, 220
    d.text((x, y), "État de forme actuel", font=font(26, bold=True), fill=INK)
    facts = [
        "VO2 max course : 48.2",
        "Statut d'entraînement : PRODUCTIVE",
        "Charge aiguë (7 j) : 412, chronique (28 j) : 380, ratio : 1.08",
        "Prédictions : 5 km 24:10, 10 km 50:45, semi 1h53:20",
    ]
    for i, f in enumerate(facts):
        d.text((x + 10, y + 44 + i * 32), f"•  {f}", font=font(20), fill=INK)

    y = 430
    d.text((x, y), "Activités", font=font(26, bold=True), fill=INK)
    cols = ["Date", "Type", "Distance", "Durée", "Allure", "FC moy", "D+", "Charge"]
    xs = [120, 290, 450, 580, 700, 830, 950, 1050]
    rows = [
        ["2026-09-28", "running", "10.02", "52:31", "5:14 /km", "148", "84", "121"],
        ["2026-09-30", "strength", "-", "45:10", "-", "96", "-", "12"],
        ["2026-10-02", "running", "6.40", "31:05", "4:51 /km", "162", "22", "143"],
        ["2026-10-04", "cycling", "42.5", "1h28:40", "28.8 km/h", "131", "410", "98"],
    ]
    d.rectangle((110, y + 46, 1170, y + 84), fill=(236, 248, 250))
    for cx, c in zip(xs, cols):
        d.text((cx, y + 54), c, font=font(19, bold=True), fill=LAGOON_DEEP)
    for r, row in enumerate(rows):
        ry = y + 96 + r * 44
        d.line((110, ry - 6, 1170, ry - 6), fill=LINE, width=1)
        for cx, v in zip(xs, row):
            d.text((cx, ry + 4), v, font=font(19), fill=INK)
    return img


def screenshot_steps() -> Image.Image:
    """Comment ça marche, en 3 étapes."""
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    title(d, "Comment ça marche", "Aucun compte, aucun mot de passe, aucune installation compliquée")
    steps = [
        ("1", "Connecte-toi", ["à Garmin Connect", "dans ton navigateur,", "comme d'habitude."]),
        ("2", "Clique", ["sur le bouton Garmin", "dans claude.ai et choisis", "la période et le sport."]),
        ("3", "Pose ta question", ["Le fichier est joint", "à ton message.", "Claude analyse tout."]),
    ]
    w, gap = 340, 30
    for i, (n, head, lines) in enumerate(steps):
        x0 = 80 + i * (w + gap)
        card(d, (x0, 230, x0 + w, 690))
        d.ellipse((x0 + 40, 270, x0 + 130, 360), fill=LAGOON_DEEP)
        d.text((x0 + 85, 315), n, font=font(48, bold=True), fill=WHITE, anchor="mm")
        d.text((x0 + 40, 400), head, font=font(32, bold=True), fill=INK)
        for j, line in enumerate(lines):
            d.text((x0 + 40, 460 + j * 40), line, font=font(24), fill=MUTED)
    return img


def screenshot_privacy() -> Image.Image:
    """100 % local : le trajet des données."""
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    title(d, "100 % local, 0 serveur", "Tes données ne passent que par ton navigateur")
    boxes = [
        ("Garmin Connect", "ta session déjà ouverte"),
        ("Ton navigateur", "mise en forme du fichier"),
        ("Ta conversation", "Claude, quand tu le décides"),
    ]
    w = 300
    for i, (head, sub) in enumerate(boxes):
        x0 = 80 + i * (w + 90)
        card(d, (x0, 280, x0 + w, 480))
        d.text((x0 + w // 2, 355), head, font=font(30, bold=True), fill=INK, anchor="mm")
        d.text((x0 + w // 2, 410), sub, font=font(20), fill=MUTED, anchor="mm")
        if i < 2:
            ax = x0 + w + 15
            d.line((ax, 380, ax + 55, 380), fill=WHITE, width=8)
            d.polygon([(ax + 60, 380), (ax + 42, 366), (ax + 42, 394)], fill=WHITE)
    promises = ["Aucun mot de passe demandé", "Aucune donnée sportive stockée", "Aucun suivi, aucune pub", "Code source ouvert"]
    for i, p in enumerate(promises):
        x = 80 + (i % 2) * 560
        y = 560 + (i // 2) * 60
        d.ellipse((x, y + 6, x + 24, y + 30), fill=WHITE)
        d.text((x + 40, y), p, font=font(28), fill=WHITE)
    return img


def marquee() -> Image.Image:
    """Bannière 1400x560 en haut de la fiche."""
    img = lagoon(1400, 560)
    d = ImageDraw.Draw(img)
    # Pastille blanche derrière l'icône pour qu'elle ne se fonde pas dans le dégradé.
    d.rounded_rectangle((128, 184, 372, 428), radius=58, fill=(6, 110, 135))
    d.rounded_rectangle((110, 160, 354, 404), radius=58, fill=WHITE)
    icon = draw_icon(220)
    img.paste(icon, (122, 172), icon)
    d.text((400, 180), "Mes Stats Garmin", font=font(72, bold=True), fill=WHITE)
    d.text((400, 265), "pour Claude", font=font(72, bold=True), fill=WHITE)
    d.text((404, 365), "Tes stats sportives dans Claude, en un clic. 100 % local.", font=font(30), fill=WHITE)
    return img


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    screenshot_data().save(OUT / "2-donnees-1280x800.png")
    screenshot_steps().save(OUT / "3-etapes-1280x800.png")
    screenshot_privacy().save(OUT / "4-confidentialite-1280x800.png")
    marquee().save(HERE / "banniere-1400x560.png")
    print("ok")
