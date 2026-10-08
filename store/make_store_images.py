"""Toutes les images du Chrome Web Store, en anglais et en français.

Chaque image est une petite page HTML rendue par Chrome en mode headless, en double résolution puis réduite :
texte net, vraies polices. Les captures 1 et 2 sont de vraies captures de claude.ai et chatgpt.com
(store/sources/, prénom déjà masqué), les chiffres de la capture 3 sont des exemples inventés.

Usage : uv run --no-project --with pillow python store/make_store_images.py
Sortie : store/screenshots/<lang>/1 à 5 (1280x800), store/<lang>/banniere-1400x560.png et promo-440x280.png.
"""
import html
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from make_images import draw_icon

HERE = Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

TEXT = {
    "en": {
        "name": "My Garmin Stats for AI",
        "sites": {
            "claude": ("Right inside <em>Claude</em>", "The Garmin button appears in the corner of every chat."),
            "chatgpt": ("And inside <em>ChatGPT</em>", "Same button, same file, one click."),
        },
        "tagline": "Your Garmin stats in Claude and ChatGPT, in one click. 100% local.",
        "free": "Free Chrome extension",
        "hero_title": "Your Garmin stats, <em>right in your AI chat</em>",
        "hero_lead": "One click adds your activities, sleep, HRV and stress to the conversation.",
        "chips": ["Claude", "ChatGPT", "100% local"],
        "ask": "Ask anything",
        "file_eyebrow": "What your AI receives",
        "file_title": "A clean file, <em>pure Garmin data</em>",
        "file_lead": "No summaries, no guesses: the exact numbers from Garmin Connect, ready to analyze.",
        "question": "How did my training go this month? Am I recovering well?",
        "doc": {
            "acts": "Activities", "days": "Days",
            "act_cols": ["Date", "Type", "Distance", "Pace", "Avg HR", "Load"],
            "day_cols": ["Date", "Bedtime", "Wake-up", "Sleep", "HRV", "Stress"],
        },
        "all_title": "Everything Garmin knows, <em>in one file</em>",
        "features": [
            ("activity", "Activities", "Distance, pace, heart rate, training effect, load"),
            ("laps", "Session details", "Laps, HR zones, running dynamics, strength sets"),
            ("moon", "Sleep", "Bedtime, wake-up, deep and REM sleep, sleep score"),
            ("heart", "HRV and resting HR", "Overnight HRV, HRV status, resting heart rate"),
            ("zap", "Stress", "Daily breakdown and readings every 3 minutes"),
            ("battery", "Body Battery", "Daily high and low, training readiness"),
            ("trend", "Fitness", "VO2 max, training status, race predictions"),
            ("calendar", "Any period", "From today to a full year, filter by sport"),
        ],
        "steps_title": "Ready in <em>3 steps</em>",
        "steps": [
            ("Sign in", "to Garmin Connect in your browser, as usual."),
            ("Click", "the Garmin button in Claude or ChatGPT, pick a period."),
            ("Ask", "The file is attached to your message. Your AI analyzes it all."),
        ],
        "privacy_title": "100% local. <em>Nothing leaves your browser.</em>",
        "promises": ["No password requested", "No server, no account", "No sports data stored", "No tracking, no ads", "Open source on GitHub"],
        "flow": ["Garmin Connect", "Your browser", "Your AI chat"],
        "panel": {
            "title": "Add my Garmin data", "period": "Period", "period_value": "Last 4 weeks",
            "activities": "Activities", "all": "All",
            "checks": [("Details of each session (laps, zones, sets)", True), ("Detailed stress (breakdown, 3-min readings over 90 days, journal)", True), ("Menstrual cycle (if tracked in Garmin)", False)],
            "go": "Add to conversation",
        },
        "promo": ["Your Garmin stats", "in your AI chat."],
    },
    "fr": {
        "name": "Mes Stats Garmin pour l'IA",
        "sites": {
            "claude": ("Directement dans <em>Claude</em>", "Le bouton Garmin apparaît dans le coin de chaque conversation."),
            "chatgpt": ("Et dans <em>ChatGPT</em>", "Même bouton, même fichier, en un clic."),
        },
        "tagline": "Tes stats Garmin dans Claude et ChatGPT, en un clic. 100 % local.",
        "free": "Extension Chrome gratuite",
        "hero_title": "Tes stats Garmin, <em>directement dans ton chat IA</em>",
        "hero_lead": "Un clic ajoute tes activités, ton sommeil, ta HRV et ton stress à la conversation.",
        "chips": ["Claude", "ChatGPT", "100 % local"],
        "ask": "Pose ta question",
        "file_eyebrow": "Ce que reçoit ton IA",
        "file_title": "Un fichier clair, <em>que des données Garmin</em>",
        "file_lead": "Aucun résumé, aucune supposition : les chiffres exacts de Garmin Connect, prêts à être analysés.",
        "question": "Comment s'est passé mon entraînement ce mois-ci ? Je récupère bien ?",
        "doc": {
            "acts": "Activités", "days": "Journées",
            "act_cols": ["Date", "Type", "Distance", "Allure", "FC moy", "Charge"],
            "day_cols": ["Date", "Coucher", "Réveil", "Sommeil", "HRV", "Stress"],
        },
        "all_title": "Tout ce que Garmin sait, <em>dans un seul fichier</em>",
        "features": [
            ("activity", "Activités", "Distance, allure, fréquence cardiaque, effet, charge"),
            ("laps", "Détail des séances", "Tours, zones cardio, dynamique de course, séries"),
            ("moon", "Sommeil", "Coucher, réveil, sommeil profond et REM, score"),
            ("heart", "HRV et FC repos", "HRV de la nuit, statut HRV, FC au repos"),
            ("zap", "Stress", "Répartition par jour et mesures toutes les 3 minutes"),
            ("battery", "Body Battery", "Max et min du jour, disposition à l'entraînement"),
            ("trend", "Forme", "VO2 max, statut d'entraînement, prédictions de course"),
            ("calendar", "Toute période", "D'aujourd'hui à un an, filtre par sport"),
        ],
        "steps_title": "Prêt en <em>3 étapes</em>",
        "steps": [
            ("Connecte-toi", "à Garmin Connect dans ton navigateur, comme d'habitude."),
            ("Clique", "sur le bouton Garmin dans Claude ou ChatGPT, choisis la période."),
            ("Demande", "Le fichier est joint à ton message. Ton IA analyse tout."),
        ],
        "privacy_title": "100 % local. <em>Rien ne quitte ton navigateur.</em>",
        "promises": ["Aucun mot de passe demandé", "Aucun serveur, aucun compte", "Aucune donnée sportive stockée", "Aucun suivi, aucune pub", "Code source ouvert sur GitHub"],
        "flow": ["Garmin Connect", "Ton navigateur", "Ton chat IA"],
        "panel": {
            "title": "Ajouter mes données Garmin", "period": "Période", "period_value": "4 dernières semaines",
            "activities": "Activités", "all": "Toutes",
            "checks": [("Détail de chaque séance (tours, zones, séries)", True), ("Stress détaillé (répartition, mesures toutes les 3 min sur 90 jours, journal)", True), ("Cycle menstruel (si suivi dans Garmin)", False)],
            "go": "Ajouter à la conversation",
        },
        "promo": ["Tes stats Garmin", "dans ton chat IA."],
    },
}

# Icônes au trait (24x24), dessinées à la main dans l'esprit de Lucide.
ICONS = {
    "activity": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    "laps": '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "heart": '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
    "zap": '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    "battery": '<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2M6 11v2M10 11v2"/>',
    "trend": '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
}


def icon(name: str, size=24, stroke="currentColor", width=2) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" '
            f'stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>')


BASE_CSS = """
* { box-sizing: border-box; }
html, body { margin: 0; width: %(w)dpx; height: %(h)dpx; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  color: #0b1f26; -webkit-font-smoothing: antialiased;
  background:
    radial-gradient(900px 620px at 88%% 12%%, rgba(94,224,216,.42), transparent 62%%),
    radial-gradient(760px 520px at 0%% 100%%, rgba(8,145,178,.20), transparent 60%%),
    #f3f8f9;
}
em { font-style: normal; color: #0891b2; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px;
  background: rgba(8,145,178,.10); color: #0e7490; font-size: 15px; font-weight: 650; letter-spacing: .01em; }
h1 { margin: 20px 0 18px; font-size: 54px; line-height: 1.06; letter-spacing: -.025em; font-weight: 800; }
.lead { margin: 0; font-size: 21px; line-height: 1.5; color: #46616a; }
.card { background: #fff; border-radius: 22px; box-shadow: 0 1px 2px rgba(11,31,38,.06), 0 24px 60px -18px rgba(11,31,38,.22); }
.chips { display: flex; gap: 10px; margin-top: 30px; }
.chip { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px; background: #fff;
  font-size: 16px; font-weight: 600; box-shadow: 0 1px 2px rgba(11,31,38,.08), 0 8px 20px -10px rgba(11,31,38,.25); }
.chip svg { color: #0891b2; }

/* Panneau de l'extension, mêmes règles que claude-button.js */
.panel { width: 280px; padding: 14px; border-radius: 12px; background: #fff; color: #1a1a1a;
  box-shadow: 0 8px 32px rgba(0,0,0,.25); font: 13px/1.4 system-ui, -apple-system, sans-serif; }
.panel .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.panel h2 { margin: 0; font-size: 14px; font-weight: 600; }
.panel .lang { display: flex; border: 1px solid #ddd; border-radius: 999px; overflow: hidden; }
.panel .lang span { padding: 2px 8px; font-size: 11px; font-weight: 600; color: #555; }
.panel .lang .on { background: #0891b2; color: #fff; }
.panel .field { margin-bottom: 8px; color: #555; }
.panel .select { margin-top: 3px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 8px; color: #1a1a1a;
  display: flex; justify-content: space-between; }
.panel .check { display: flex; gap: 7px; align-items: flex-start; margin: 4px 0 10px; }
.panel .box { flex: none; width: 14px; height: 14px; margin-top: 2px; border-radius: 3px; border: 1.5px solid #888; }
.panel .box.on { background: #0891b2; border-color: #0891b2; position: relative; }
.panel .box.on::after { content: ""; position: absolute; left: 3.5px; top: 0.5px; width: 4px; height: 8px;
  border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.panel .go { padding: 9px; border-radius: 8px; background: #0891b2; color: #fff; font-weight: 600; text-align: center; }
.fab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: #0891b2;
  color: #fff; font: 600 13px system-ui, -apple-system, sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,.2); }
"""


def panel(lang: str) -> str:
    P = TEXT[lang]["panel"]
    e = html.escape
    checks = "".join(f'<div class="check"><span class="box{" on" if on else ""}"></span>{e(t)}</div>' for t, on in P["checks"])
    en, fr = ("on", "") if lang == "en" else ("", "on")
    return f"""
<div class="panel">
  <div class="head"><h2>{e(P["title"])}</h2><div class="lang"><span class="{en}">EN</span><span class="{fr}">FR</span></div></div>
  <div class="field">{e(P["period"])}<div class="select"><span>{e(P["period_value"])}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top:3px"><path d="m6 9 6 6 6-6"/></svg></div></div>
  <div class="field">{e(P["activities"])}<div class="select"><span>{e(P["all"])}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top:3px"><path d="m6 9 6 6 6-6"/></svg></div></div>
  {checks}
  <div class="go">{e(P["go"])}</div>
</div>"""



def page(w: int, h: int, body: str) -> str:
    return f"<!doctype html><meta charset='utf-8'><style>{BASE_CSS % {'w': w, 'h': h}}</style><body>{body}</body>"



# Bouton Garmin dans chaque capture source (pixels de l'image d'origine).
FAB = {
    "claude-en": (1830, 1050, 2008, 1117),
    "claude-fr": (1828, 996, 2006, 1063),
    "chatgpt-en": (2043, 1120, 2221, 1187),
    "chatgpt-fr": (1987, 1242, 2165, 1309),
}


def site_shot(site: str, lang: str) -> str:
    """Vraie capture du site, entière, avec le bouton Garmin entouré."""
    T = TEXT[lang]
    heading, sub = T["sites"][site]
    src = HERE / "sources" / f"{site}-{lang}.png"
    w0, h0 = Image.open(src).size
    scale = min(1100 / w0, 556 / h0)
    w, h = round(w0 * scale), round(h0 * scale)
    x0, y0, x1, y1 = (round(v * scale) for v in FAB[f"{site}-{lang}"])
    pad = 10
    ring = f"left:{x0 - pad}px;top:{y0 - pad}px;width:{x1 - x0 + 2 * pad}px;height:{y1 - y0 + 2 * pad}px"
    return page(1280, 800, f"""
<div style="display:flex;flex-direction:column;align-items:center;height:100%;padding-top:46px">
  <h1 style="margin:0 0 10px;font-size:46px;text-align:center">{heading}</h1>
  <p class="lead" style="margin:0 0 30px;text-align:center">{html.escape(sub)}</p>
  <div style="position:relative;width:{w}px;height:{h}px;border-radius:16px;overflow:visible;
    box-shadow:0 1px 2px rgba(11,31,38,.1),0 30px 70px -20px rgba(11,31,38,.45)">
    <img src="{src.as_uri()}" style="display:block;width:{w}px;height:{h}px;border-radius:16px">
    <div style="position:absolute;{ring};border-radius:999px;border:4px solid #5ee0d8;
      box-shadow:0 0 0 7px rgba(94,224,216,.35),0 0 30px rgba(94,224,216,.8)"></div>
  </div>
</div>""")


def file_shot(lang: str) -> str:
    T = TEXT[lang]
    D = T["doc"]
    acts = [["09-28", "running", "10.02", "5:14 /km", "148", "121"], ["09-30", "strength", "-", "-", "96", "12"],
            ["10-02", "running", "6.40", "4:51 /km", "162", "143"], ["10-04", "cycling", "42.5", "28.8 km/h", "131", "98"]]
    days = [["10-02", "23:12", "06:58", "7h46", "62", "21"], ["10-03", "00:41", "06:20", "5h39", "48", "34"],
            ["10-04", "22:55", "07:10", "8h15", "66", "19"]]

    def table(cols, rows):
        head = "".join(f"<th>{html.escape(c)}</th>" for c in cols)
        body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
        return f"<table><tr>{head}</tr>{body}</table>"

    return page(1280, 800, f"""
<style>
  table {{ width: 100%; border-collapse: collapse; font: 15px/1 ui-monospace, "SF Mono", Menlo, monospace; }}
  th {{ text-align: left; padding: 9px 8px; background: #ecf7f9; color: #0e7490; font: 600 13px -apple-system, sans-serif; }}
  td {{ padding: 9px 8px; border-top: 1px solid #e6eef0; color: #22383f; }}
  .md-h {{ margin: 18px 0 10px; font: 700 15px ui-monospace, "SF Mono", Menlo, monospace; color: #0b1f26; }}
</style>
<div style="display:flex;align-items:center;gap:56px;height:100%;padding:0 80px">
  <div style="width:430px;flex:none">
    <span class="eyebrow">{html.escape(T["file_eyebrow"])}</span>
    <h1>{T["file_title"]}</h1>
    <p class="lead">{html.escape(T["file_lead"])}</p>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;gap:18px">
    <div class="card" style="align-self:flex-end;max-width:560px;padding:16px 18px;border-radius:20px 20px 6px 20px">
      <div style="display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#f1f6f7;margin-bottom:12px">
        <span style="display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#0891b2;color:#fff">{icon("file", 20)}</span>
        <span><b style="font-size:15px">garmin-2026-10-08.md</b><br><span style="font-size:13px;color:#6b8790">Markdown · 42 KB</span></span>
      </div>
      <div style="font-size:18px;line-height:1.45">{html.escape(T["question"])}</div>
    </div>
    <div class="card" style="padding:8px 24px 18px">
      <div class="md-h">## {html.escape(D["acts"])}</div>{table(D["act_cols"], acts)}
      <div class="md-h">## {html.escape(D["days"])}</div>{table(D["day_cols"], days)}
    </div>
  </div>
</div>""")


def features(lang: str) -> str:
    T = TEXT[lang]
    cards = "".join(f"""
    <div class="card" style="padding:24px 22px;border-radius:18px">
      <div style="display:grid;place-items:center;width:46px;height:46px;border-radius:13px;background:#e3f5f8;color:#0891b2">{icon(k, 24)}</div>
      <div style="margin:16px 0 6px;font-size:19px;font-weight:700">{html.escape(t)}</div>
      <div style="font-size:15px;line-height:1.45;color:#56717a">{html.escape(d)}</div>
    </div>""" for k, t, d in T["features"])
    return page(1280, 800, f"""
<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 80px">
  <h1 style="margin:0 0 48px;text-align:center">{T["all_title"]}</h1>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px">{cards}</div>
</div>""")



def privacy(lang: str) -> str:
    T = TEXT[lang]
    items = "".join(f"""<div style="display:flex;align-items:center;gap:14px;font-size:22px;font-weight:600">
      <span style="display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#0891b2;color:#fff">{icon("check", 18, width=3)}</span>
      {html.escape(p)}</div>""" for p in T["promises"])
    flow = f'<span style="color:#0891b2">{icon("arrow", 26)}</span>'.join(
        f'<span class="chip" style="font-size:17px;padding:12px 20px">{html.escape(s)}</span>' for s in T["flow"])
    return page(1280, 800, f"""
<div style="display:flex;align-items:center;gap:70px;height:100%;padding:0 90px">
  <div style="flex:none;display:grid;place-items:center;width:300px;height:300px;border-radius:72px;
    background:linear-gradient(135deg,#5ee0d8,#0891b2);color:#fff;box-shadow:0 40px 80px -30px rgba(8,145,178,.7)">{icon("lock", 140, width=1.6)}</div>
  <div>
    <h1 style="margin:0 0 34px;font-size:48px">{T["privacy_title"]}</h1>
    <div style="display:flex;flex-direction:column;gap:16px">{items}</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:40px">{flow}</div>
  </div>
</div>""")


def marquee(lang: str, icon_uri: str) -> str:
    T = TEXT[lang]
    chips = "".join(f'<span class="chip">{icon("check", 18, width=3)}{html.escape(c)}</span>' for c in T["chips"])
    return page(1400, 560, f"""
<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 90px">
  <div style="width:760px">
    <img src="{icon_uri}" width="96" height="96" style="display:block;filter:drop-shadow(0 16px 24px rgba(8,145,178,.35))">
    <h1 style="font-size:60px;margin:26px 0 16px">{html.escape(T["name"])}</h1>
    <p class="lead" style="font-size:23px">{html.escape(T["tagline"])}</p>
    <div class="chips" style="margin-top:26px">{chips}</div>
  </div>
  <div style="position:relative;zoom:1.25">{panel(lang)}<div style="text-align:right;margin-top:12px"><span class="fab">⌚ Garmin</span></div></div>
</div>""")


def promo(lang: str, icon_uri: str) -> str:
    l1, l2 = TEXT[lang]["promo"]
    return page(440, 280, f"""
<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 34px">
  <img src="{icon_uri}" width="64" height="64" style="filter:drop-shadow(0 10px 16px rgba(8,145,178,.35))">
  <div style="margin-top:18px;font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.02em">{html.escape(l1)}<br><em>{html.escape(l2)}</em></div>
</div>""")


def render(html_text: str, out: Path, size: tuple[int, int], work: Path) -> None:
    src = work / f"{out.parent.name}-{out.stem}.html"
    src.write_text(html_text)
    shot = work / "shot.png"
    # Rendu en double résolution puis réduction : contours et textes plus fins qu'un rendu direct.
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    "--allow-file-access-from-files", f"--window-size={size[0]},{size[1]}", "--virtual-time-budget=1500",
                    f"--screenshot={shot}", src.as_uri()], check=True, capture_output=True)
    img = Image.open(shot).convert("RGB")  # le Store veut du PNG 24 bits, sans transparence
    img = img.crop((0, 0, size[0] * 2, size[1] * 2)).resize(size, Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


if __name__ == "__main__":
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        icon_png = work / "icon.png"
        draw_icon(256).save(icon_png)
        uri = icon_png.as_uri()
        for lang in TEXT:
            shots = HERE / "screenshots" / lang
            for old in shots.glob("*.png"):
                old.unlink()
            render(site_shot("claude", lang), shots / "1-claude-1280x800.png", (1280, 800), work)
            render(site_shot("chatgpt", lang), shots / "2-chatgpt-1280x800.png", (1280, 800), work)
            render(file_shot(lang), shots / "3-file-1280x800.png", (1280, 800), work)
            render(features(lang), shots / "4-features-1280x800.png", (1280, 800), work)
            render(privacy(lang), shots / "5-privacy-1280x800.png", (1280, 800), work)
            render(marquee(lang, uri), HERE / lang / "banniere-1400x560.png", (1400, 560), work)
            render(promo(lang, uri), HERE / lang / "promo-440x280.png", (440, 280), work)
    print("ok")
