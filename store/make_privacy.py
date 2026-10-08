"""Génère docs/privacy.html (publié par GitHub Pages) à partir de PRIVACY.md.

Usage : uv run --no-project --with markdown python store/make_privacy.py
"""
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
body = markdown.markdown((ROOT / "PRIVACY.md").read_text(), extensions=["tables", "toc"])
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy · My Garmin Stats for AI</title>
<link rel="icon" href="icon128.png">
<style>
  body {{ max-width: 720px; margin: 0 auto; padding: 32px 20px; font: 16px/1.6 system-ui, sans-serif; color: #1f1e1d; background: #faf9f5; }}
  h1 {{ font-size: 1.6em; line-height: 1.25; }}
  h2 {{ margin-top: 2em; font-size: 1.2em; }}
  hr {{ margin: 3em 0; border: 0; border-top: 1px solid #e5e2da; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ text-align: left; padding: 8px; border-bottom: 1px solid #e5e2da; vertical-align: top; }}
  code {{ background: #eee; padding: 1px 4px; border-radius: 4px; }}
  a {{ color: #0e7490; overflow-wrap: anywhere; }}
</style>
</head>
<body>
{body}
</body>
</html>
"""
(ROOT / "docs" / "privacy.html").write_text(html)
print("ok")
