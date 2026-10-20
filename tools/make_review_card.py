"""Erzeugt QR-Code + Druckkarte für Google-Bewertungen.
  qr-bewertung.png      – QR auf den Link „Bewertung schreiben“ (Thekenaufsteller / Spiegel-Sticker)
  bewertung-karte.pdf   – A6-Karte (105 × 148 mm) im App-Stil
Link kommt aus js/config.js (reviews.writeUrl). Aufruf: python3 tools/make_review_card.py
Benötigt: segno (pip install segno), Playwright + Chromium für das PDF."""
import os, re, io, base64
import segno
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = open(os.path.join(ROOT, 'js', 'config.js'), encoding='utf-8').read()
URL = re.search(r"writeUrl:\s*'([^']+)'", cfg).group(1)
NAME = re.search(r"\bname:\s*'([^']+)'", cfg).group(1)
STREET = re.search(r"street:\s*'([^']+)'", cfg).group(1)
ZIP = re.search(r"zip:\s*'([^']+)'", cfg).group(1)
CITY = re.search(r"city:\s*'([^']+)'", cfg).group(1)
INK = '#241F1C'

qr = segno.make(URL, error='m')
buf = io.BytesIO(); qr.save(buf, kind='png', scale=24, border=4, dark=INK, light='#FFFFFF')
img = Image.open(io.BytesIO(buf.getvalue())).convert('RGB')
img.save(os.path.join(ROOT, 'qr-bewertung.png'))
print('qr-bewertung.png', img.size, '→', URL)
buf2 = io.BytesIO(); qr.save(buf2, kind='png', scale=20, border=0, dark=INK, light='#FFFFFF'); qr_b64 = base64.b64encode(buf2.getvalue()).decode()

STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>'
fonts = os.path.join(ROOT, 'assets', 'fonts')
def font_b64(n): return base64.b64encode(open(os.path.join(fonts, n), 'rb').read()).decode()
icon = base64.b64encode(open(os.path.join(ROOT, 'icons', 'icon-192.png'), 'rb').read()).decode()
html = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@font-face {{ font-family: Fraunces; font-weight: 400 600; src: url(data:font/woff2;base64,{font_b64('fraunces-latin.woff2')}) format('woff2'); }}
@font-face {{ font-family: Inter; font-weight: 400 600; src: url(data:font/woff2;base64,{font_b64('inter-latin.woff2')}) format('woff2'); }}
@page {{ size: 105mm 148mm; margin: 0; }}
* {{ box-sizing: border-box; }} html, body {{ margin: 0; height: 147mm; overflow: hidden; }}
body {{ width: 105mm; height: 148mm; overflow: hidden; font-family: Inter, sans-serif; color: {INK}; background: #F6F1EA; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.card {{ height: 147mm; display: flex; flex-direction: column; overflow: hidden; }}
.top {{ background: linear-gradient(160deg, #8E4229 0%, #6E3220 60%, #3A2A22 100%); color: #FBF4EC; padding: 8mm 7mm 6mm; text-align: center; }}
.mono {{ width: 13mm; height: 13mm; border-radius: 3.2mm; display: block; margin: 0 auto 3.5mm; }}
h1 {{ font-family: Fraunces, serif; font-weight: 500; font-size: 18pt; line-height: 1.1; margin: 0; letter-spacing: -.01em; }}
h1 em {{ font-style: normal; color: #F4C9B3; }}
.stars {{ display: flex; gap: 1.6mm; justify-content: center; margin-top: 4mm; }}
.stars svg {{ width: 7mm; height: 7mm; fill: #E8A33D; }}
.mid {{ flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.5mm; padding: 4mm 8mm 2mm; min-height: 0; }}
.qr {{ background: #fff; padding: 3.5mm; border-radius: 4mm; border: .3mm solid #DDD3C6; }}
.qr img {{ width: 40mm; height: 40mm; display: block; image-rendering: pixelated; }}
.how {{ font-size: 9.5pt; text-align: center; line-height: 1.35; color: #5C534B; }}
.how b {{ color: {INK}; }}
.foot {{ text-align: center; padding: 0 8mm 6mm; }}
.name {{ font-family: Fraunces, serif; font-size: 13pt; font-weight: 500; }}
.addr {{ font-size: 8pt; color: #6F655C; margin-top: .8mm; }}
.line {{ width: 18mm; height: .4mm; background: #9C4A30; margin: 0 auto 3mm; }}
</style></head><body><div class="card">
<div class="top"><img class="mono" src="data:image/png;base64,{icon}" alt="">
<h1>Hat es Ihnen gefallen?<br><em>Bewerten Sie uns<br>auf Google</em></h1>
<div class="stars">{STAR * 5}</div></div>
<div class="mid"><div class="qr"><img src="data:image/png;base64,{qr_b64}" alt="QR-Code: Google-Bewertung schreiben"></div>
<div class="how"><b>Handy-Kamera auf den Code richten</b><br>und Ihre Bewertung schreiben – dauert nur eine Minute.</div></div>
<div class="foot"><div class="line"></div><div class="name">{NAME}</div><div class="addr">{STREET} · {ZIP} {CITY} · Vielen Dank!</div></div>
</div></body></html>'''
hp = '/tmp/bewertung-karte.html'; open(hp, 'w', encoding='utf-8').write(html)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto('file://' + hp); pg.evaluate('document.fonts.ready')
    pg.pdf(path=os.path.join(ROOT, 'bewertung-karte.pdf'), width='105mm', height='148mm', print_background=True, prefer_css_page_size=True)
    pg.set_viewport_size({'width': 397, 'height': 559}); pg.screenshot(path='/tmp/bewertung-karte-preview.png', scale='device')
    b.close()
print('bewertung-karte.pdf (A6)')
