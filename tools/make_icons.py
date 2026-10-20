"""Erzeugt die App-Icons (PNG) mit Pillow: Monogramm 'DG' auf Terrakotta.
Aufruf: python3 tools/make_icons.py  (Monogramm in MONO ändern)"""
import os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
MONO = 'DG'
TERRA, TERRA_DARK, CREAM = (156, 74, 48), (110, 50, 32), (251, 244, 236)
FONT = os.path.join(ROOT, 'assets', 'fonts', 'fraunces-latin.woff2')

def font(size):
    f = ImageFont.truetype(FONT, size)
    try: f.set_variation_by_axes([500])
    except Exception: pass
    return f

def draw_icon(size, maskable=False, rounded=True):
    S = size * 4  # supersampling
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bg = Image.new('RGBA', (S, S), TERRA + (255,))
    # dezenter Verlauf
    grad = Image.new('L', (1, S))
    for y in range(S): grad.putpixel((0, y), int(90 * y / S))
    shade = Image.new('RGBA', (S, S), TERRA_DARK + (255,)); bg = Image.composite(shade, bg, grad.resize((S, S)))
    mask = Image.new('L', (S, S), 0); md = ImageDraw.Draw(mask)
    if maskable or not rounded: md.rectangle([0, 0, S, S], fill=255)
    else: md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
    img.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(img)
    scale = 0.56 if maskable else 0.70          # maskable: Inhalt in der 80-%-Sicherheitszone
    target_w = S * scale * 0.78
    fs = int(S * 0.5)
    f = font(fs); bb = d.textbbox((0, 0), MONO, font=f)
    fs = int(fs * target_w / (bb[2] - bb[0])); f = font(fs); bb = d.textbbox((0, 0), MONO, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    cy = S * 0.44
    d.text(((S - tw) / 2 - bb[0], cy - th / 2 - bb[1]), MONO, font=f, fill=CREAM)
    # feine Linie mit Schere-Symbol darunter
    ly = cy + th / 2 + S * (0.105 if not maskable else 0.085)
    lw = tw * 0.9; lx0 = (S - lw) / 2; lt = max(2, int(S * 0.008))
    r = S * (0.03 if not maskable else 0.024); cx = S / 2
    gap = r * 3.2
    d.line([lx0, ly, cx - gap, ly], fill=CREAM + (200,), width=lt)
    d.line([cx + gap, ly, lx0 + lw, ly], fill=CREAM + (200,), width=lt)
    # Mini-Schere: zwei Ringe + gekreuzte Klingen
    for sx in (-1, 1):
        rcx, rcy = cx + sx * r * 1.25, ly + r * 0.9
        d.ellipse([rcx - r, rcy - r, rcx + r, rcy + r], outline=CREAM, width=lt)
        d.line([rcx - sx * r * 0.5, rcy - r * 0.85, cx - sx * r * 1.7, ly - r * 2.6], fill=CREAM, width=lt)
    return img.resize((size, size), Image.LANCZOS)

out = os.path.join(ROOT, 'icons'); os.makedirs(out, exist_ok=True)
draw_icon(192).save(os.path.join(out, 'icon-192.png'))
draw_icon(512).save(os.path.join(out, 'icon-512.png'))
draw_icon(512, maskable=True).save(os.path.join(out, 'icon-512-maskable.png'))
draw_icon(180, rounded=False).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'))
draw_icon(48).save(os.path.join(out, 'favicon-48.png'))
print('Icons erzeugt in', out)
