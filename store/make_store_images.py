"""Toutes les images du Chrome Web Store, en anglais et en français.

Usage : uv run --no-project --with pillow python store/make_store_images.py
Sortie : store/screenshots/<lang>/1 à 5 (1280x800), store/<lang>/banniere-1400x560.png et promo-440x280.png.
Les captures 1 et 2 partent de vraies captures d'écran (store/screenshots/raw-<site>-<lang>.png),
les chiffres de la capture 3 sont des exemples inventés.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from make_images import CREAM, LAGOON_DEEP, LAGOON_LIGHT, WHITE, draw_icon, font
from make_screenshot import with_shadow

HERE = Path(__file__).resolve().parent
RAW = HERE / "screenshots"
INK = (31, 30, 29)
MUTED = (95, 110, 115)
CARD = (255, 255, 255)
LINE = (226, 232, 234)

TEXT = {
    "en": {
        "claude": ("In Claude", "The Garmin button appears right in the chat"),
        "chatgpt": ("And in ChatGPT", "Same button, same file, one click"),
        "data_title": ("All your stats, neatly organized", "A clear file your AI reads in full (sample data)"),
        "fitness": "Current fitness status",
        "facts": [
            "Running VO2 max: 48.2",
            "Training status: PRODUCTIVE",
            "Acute load (7 d): 412, chronic (28 d): 380, ratio: 1.08",
            "Race predictions: 5 km 24:10, 10 km 50:45, half 1h53:20",
        ],
        "activities": "Activities",
        "cols": ["Date", "Type", "Distance", "Duration", "Pace", "Avg HR", "Elev.", "Load"],
        "steps_title": ("How it works", "No account, no password, no complicated setup"),
        "steps": [
            ("Sign in", ["to Garmin Connect", "in your browser,", "as usual."]),
            ("Click", ["the Garmin button", "in Claude or ChatGPT,", "pick period and sport."]),
            ("Ask away", ["The file is attached", "to your message.", "Your AI analyzes it all."]),
        ],
        "privacy_title": ("100% local, 0 servers", "Your data only goes through your browser"),
        "flow": [
            ("Garmin Connect", "your existing session"),
            ("Your browser", "builds the file"),
            ("Your chat", "when you decide"),
        ],
        "promises": ["No password requested", "No sports data stored", "No tracking, no ads", "Open source code"],
        "name": ("My Garmin Stats", "for Claude"),
        "tagline": "Your sports stats in Claude and ChatGPT, in one click. 100% local.",
        "promo": ("My Garmin", "Stats", ["Your sports stats in your AI,", "in one click. 100% local."]),
    },
    "fr": {
        "claude": ("Dans Claude", "Le bouton Garmin apparaît directement dans le chat"),
        "chatgpt": ("Et dans ChatGPT", "Même bouton, même fichier, en un clic"),
        "data_title": ("Toutes tes stats, bien rangées", "Un fichier clair que ton IA lit en entier (exemple de données)"),
        "fitness": "État de forme actuel",
        "facts": [
            "VO2 max course : 48.2",
            "Statut d'entraînement : PRODUCTIVE",
            "Charge aiguë (7 j) : 412, chronique (28 j) : 380, ratio : 1.08",
            "Prédictions : 5 km 24:10, 10 km 50:45, semi 1h53:20",
        ],
        "activities": "Activités",
        "cols": ["Date", "Type", "Distance", "Durée", "Allure", "FC moy", "D+", "Charge"],
        "steps_title": ("Comment ça marche", "Aucun compte, aucun mot de passe, aucune installation compliquée"),
        "steps": [
            ("Connecte-toi", ["à Garmin Connect", "dans ton navigateur,", "comme d'habitude."]),
            ("Clique", ["sur le bouton Garmin", "dans Claude ou ChatGPT,", "choisis période et sport."]),
            ("Pose ta question", ["Le fichier est joint", "à ton message.", "Ton IA analyse tout."]),
        ],
        "privacy_title": ("100 % local, 0 serveur", "Tes données ne passent que par ton navigateur"),
        "flow": [
            ("Garmin Connect", "ta session déjà ouverte"),
            ("Ton navigateur", "mise en forme du fichier"),
            ("Ta conversation", "quand tu le décides"),
        ],
        "promises": ["Aucun mot de passe demandé", "Aucune donnée sportive stockée", "Aucun suivi, aucune pub", "Code source ouvert"],
        "name": ("Mes Stats Garmin", "pour Claude"),
        "tagline": "Tes stats sportives dans Claude et ChatGPT, en un clic. 100 % local.",
        "promo": ("Mes Stats", "Garmin", ["Tes stats sportives dans ton IA,", "en un clic. 100 % local."]),
    },
}

# Captures réelles : zone à masquer (prénom affiché par le site) et couleur de fond du site.
SITES = {
    "claude-en": ((590, 340, 1150, 460), (21, 21, 21)),
    "claude-fr": ((590, 290, 1140, 400), (21, 21, 21)),
    "chatgpt-en": (None, (0, 0, 0)),
    "chatgpt-fr": (None, (0, 0, 0)),
}


def lagoon(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for i in range(w + h):
        t = i / (w + h - 1)
        d.line([(i, 0), (i - h, h)], fill=tuple(round(a + (b - a) * t) for a, b in zip(LAGOON_LIGHT, LAGOON_DEEP)), width=2)
    return img


def fit(d: ImageDraw.ImageDraw, text: str, size: int, max_width: int, bold=False):
    """Police la plus grande (jusqu'à size) pour que text tienne dans max_width."""
    while size > 10 and d.textlength(text, font=font(size, bold)) > max_width:
        size -= 1
    return font(size, bold)


def card(d: ImageDraw.ImageDraw, box, radius=24):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + 6, y0 + 10, x1 + 6, y1 + 10), radius=radius, fill=(6, 110, 135))  # ombre simple
    d.rounded_rectangle(box, radius=radius, fill=CARD)


def title(d, text, sub=None):
    d.text((80, 60), text, font=fit(d, text, 46, 1120, bold=True), fill=WHITE)
    if sub:
        d.text((80, 120), sub, font=fit(d, sub, 24, 1120), fill=WHITE)


def screenshot_site(site: str, lang: str) -> Image.Image:
    """Vraie capture du site, recadrée sur la zone de message et le panneau pour rester nette."""
    heading, sub = TEXT[lang][site]
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    d.text((640, 52), heading, font=fit(d, heading, 42, 1180, bold=True), fill=WHITE, anchor="mm")
    d.text((640, 96), sub, font=fit(d, sub, 24, 1180), fill=WHITE, anchor="mm")

    hide, bg = SITES[f"{site}-{lang}"]
    shot = Image.open(RAW / f"raw-{site}-{lang}.png").convert("RGB")
    if hide:
        ImageDraw.Draw(shot).rectangle(hide, fill=bg)
    # Haut du panneau : première ligne blanche près du bord droit.
    W, H = shot.size
    top = next(y for y in range(H) if sum(shot.getpixel((W - 250, y))) > 720)
    box_w, box_h = 1200, 640
    crop_h = min(880, H)
    crop_w = round(crop_h * box_w / box_h)
    y0 = max(0, min(top - 40, H - crop_h))
    shot = shot.crop((max(0, W - crop_w), y0, W, y0 + crop_h))
    scale = min(box_w / shot.width, box_h / shot.height)
    shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS)
    shot = shot.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))
    # Le bord gauche coupe la page du site : on le fond dans la couleur du site pour que ça ne fasse pas « coupé ».
    fade = 220
    ramp = Image.linear_gradient("L").rotate(-90).resize((fade, shot.height))  # 255 à gauche, 0 à droite
    shot.paste(Image.new("RGB", (fade, shot.height), bg), (0, 0), ramp)
    shot = shot.convert("RGBA")
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, shot.width - 1, shot.height - 1), radius=20, fill=255)
    shot.putalpha(mask)
    with_shadow(shot, img, ((1280 - shot.width) // 2, 130 + (box_h - shot.height) // 2))
    return img


def screenshot_data(lang: str) -> Image.Image:
    """Aperçu du fichier envoyé à l'IA."""
    T = TEXT[lang]
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    title(d, *T["data_title"])
    card(d, (80, 190, 1200, 740))
    x, y = 120, 220
    d.text((x, y), T["fitness"], font=font(26, bold=True), fill=INK)
    for i, f in enumerate(T["facts"]):
        d.text((x + 10, y + 44 + i * 32), f"•  {f}", font=font(20), fill=INK)

    y = 430
    d.text((x, y), T["activities"], font=font(26, bold=True), fill=INK)
    xs = [120, 290, 450, 580, 700, 830, 950, 1050]
    rows = [
        ["2026-09-28", "running", "10.02", "52:31", "5:14 /km", "148", "84", "121"],
        ["2026-09-30", "strength", "-", "45:10", "-", "96", "-", "12"],
        ["2026-10-02", "running", "6.40", "31:05", "4:51 /km", "162", "22", "143"],
        ["2026-10-04", "cycling", "42.5", "1h28:40", "28.8 km/h", "131", "410", "98"],
    ]
    d.rectangle((110, y + 46, 1170, y + 84), fill=(236, 248, 250))
    for cx, c in zip(xs, T["cols"]):
        d.text((cx, y + 54), c, font=font(19, bold=True), fill=LAGOON_DEEP)
    for r, row in enumerate(rows):
        ry = y + 96 + r * 44
        d.line((110, ry - 6, 1170, ry - 6), fill=LINE, width=1)
        for cx, v in zip(xs, row):
            d.text((cx, ry + 4), v, font=font(19), fill=INK)
    return img


def screenshot_steps(lang: str) -> Image.Image:
    """Comment ça marche, en 3 étapes."""
    T = TEXT[lang]
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    title(d, *T["steps_title"])
    w, gap = 340, 30
    for i, (head, lines) in enumerate(T["steps"]):
        x0 = 80 + i * (w + gap)
        card(d, (x0, 230, x0 + w, 690))
        d.ellipse((x0 + 40, 270, x0 + 130, 360), fill=LAGOON_DEEP)
        d.text((x0 + 85, 315), str(i + 1), font=font(48, bold=True), fill=WHITE, anchor="mm")
        d.text((x0 + 40, 400), head, font=fit(d, head, 32, w - 60, bold=True), fill=INK)
        for j, line in enumerate(lines):
            d.text((x0 + 40, 460 + j * 40), line, font=fit(d, line, 24, w - 60), fill=MUTED)
    return img


def screenshot_privacy(lang: str) -> Image.Image:
    """100 % local : le trajet des données."""
    T = TEXT[lang]
    img = lagoon(1280, 800)
    d = ImageDraw.Draw(img)
    title(d, *T["privacy_title"])
    w = 300
    for i, (head, sub) in enumerate(T["flow"]):
        x0 = 80 + i * (w + 90)
        card(d, (x0, 280, x0 + w, 480))
        d.text((x0 + w // 2, 355), head, font=fit(d, head, 30, w - 30, bold=True), fill=INK, anchor="mm")
        d.text((x0 + w // 2, 410), sub, font=fit(d, sub, 20, w - 30), fill=MUTED, anchor="mm")
        if i < 2:
            ax = x0 + w + 15
            d.line((ax, 380, ax + 55, 380), fill=WHITE, width=8)
            d.polygon([(ax + 60, 380), (ax + 42, 366), (ax + 42, 394)], fill=WHITE)
    for i, p in enumerate(T["promises"]):
        x = 80 + (i % 2) * 560
        y = 560 + (i // 2) * 60
        d.ellipse((x, y + 6, x + 24, y + 30), fill=WHITE)
        d.text((x + 40, y), p, font=fit(d, p, 28, 500), fill=WHITE)
    return img


def marquee(lang: str) -> Image.Image:
    """Bannière 1400x560 en haut de la fiche."""
    T = TEXT[lang]
    img = lagoon(1400, 560)
    d = ImageDraw.Draw(img)
    # Pastille blanche derrière l'icône pour qu'elle ne se fonde pas dans le dégradé.
    d.rounded_rectangle((128, 184, 372, 428), radius=58, fill=(6, 110, 135))
    d.rounded_rectangle((110, 160, 354, 404), radius=58, fill=WHITE)
    icon = draw_icon(220)
    img.paste(icon, (122, 172), icon)
    for k, line in enumerate(T["name"]):
        d.text((400, 180 + k * 85), line, font=fit(d, line, 72, 940, bold=True), fill=WHITE)
    d.text((404, 365), T["tagline"], font=fit(d, T["tagline"], 30, 940), fill=WHITE)
    return img


def promo_tile(lang: str) -> Image.Image:
    """Vignette 440x280 demandée par le Chrome Web Store."""
    first, second, lines = TEXT[lang]["promo"]
    img = Image.new("RGB", (440, 280), CREAM)
    d = ImageDraw.Draw(img)
    icon = draw_icon(120)
    img.paste(icon, (32, 80), icon)
    d.text((172, 92), first, font=fit(d, first, 32, 250, bold=True), fill=INK)
    d.text((172, 128), second, font=fit(d, second, 32, 250, bold=True), fill=LAGOON_DEEP)
    for k, line in enumerate(lines):
        d.text((172, 174 + k * 20), line, font=fit(d, line, 15, 255), fill=INK)
    return img


if __name__ == "__main__":
    for lang in TEXT:
        shots = HERE / "screenshots" / lang
        shots.mkdir(parents=True, exist_ok=True)
        screenshot_site("claude", lang).save(shots / "1-claude-1280x800.png")
        screenshot_site("chatgpt", lang).save(shots / "2-chatgpt-1280x800.png")
        screenshot_data(lang).save(shots / "3-data-1280x800.png")
        screenshot_steps(lang).save(shots / "4-steps-1280x800.png")
        screenshot_privacy(lang).save(shots / "5-privacy-1280x800.png")
        (HERE / lang).mkdir(exist_ok=True)
        marquee(lang).save(HERE / lang / "banniere-1400x560.png")
        promo_tile(lang).save(HERE / lang / "promo-440x280.png")
    print("ok")
