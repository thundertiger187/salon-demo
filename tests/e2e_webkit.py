"""iPhone-Emulation mit Playwright WebKit (Safari-Engine): Layout, keine Fehler, iOS-Installationshinweis, Buchung.
Aufruf: python3 tests/e2e_webkit.py  (startet eigenen Server unter /salon-demo/)"""
import os, sys, shutil, subprocess, time, socket
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE, SUB, PORT = '/tmp/site-wk', 'salon-demo', 8766
BASE = f'http://localhost:{PORT}/{SUB}/'
results, errors = [], []
def check(n, c, d=''):
    results.append((n, bool(c), d)); print(('  ✓ ' if c else '  ✗ ') + n + (f' – {d}' if d != '' else ''), flush=True)
shutil.rmtree(SITE, ignore_errors=True)
shutil.copytree(ROOT, os.path.join(SITE, SUB), ignore=shutil.ignore_patterns('screens', 'tests', 'tools', '*.zip'))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', SITE, '-b', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try: socket.create_connection(('127.0.0.1', PORT), .2).close(); break
    except OSError: time.sleep(.1)
try:
    with sync_playwright() as p:
        b = p.webkit.launch()
        dev = dict(p.devices['iPhone 14'])
        ctx = b.new_context(**dev, locale='de-DE', timezone_id='Europe/Berlin')
        pg = ctx.new_page()
        pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.url.startswith(BASE) and r.status >= 400 else None)
        pg.goto(BASE); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_selector('.hero')
        check('WebKit/iPhone 14: Seite lädt', True, f"{dev['viewport']} UA iPhone")
        check('apple-touch-icon 180x180 lädt', pg.evaluate("""new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth === 180 && i.naturalHeight === 180); i.onerror = () => r(false); i.src = document.querySelector('link[rel=apple-touch-icon]').href; })"""))
        meta = pg.evaluate("""['apple-mobile-web-app-capable','mobile-web-app-capable','apple-mobile-web-app-status-bar-style','apple-mobile-web-app-title','theme-color'].map(n => { const m = document.querySelector('meta[name="'+n+'"]'); return m && m.content; })""")
        check('iOS-Meta-Tags vorhanden', all(meta), meta)
        check('viewport-fit=cover', 'viewport-fit=cover' in pg.get_attribute('meta[name=viewport]', 'content'))
        pg.wait_for_timeout(500)
        check('„App installieren“-Karte auf iOS sichtbar', pg.locator('#install-card').is_visible())
        pg.click('#install-card [data-install]'); pg.wait_for_selector('#ios-sheet .sheet'); pg.wait_for_timeout(600)
        txt = pg.inner_text('#ios-sheet')
        check('iOS-Hinweis: Teilen → Zum Home-Bildschirm → Hinzufügen', 'Teilen' in txt and 'Zum Home-Bildschirm' in txt and 'Hinzufügen' in txt)
        pg.screenshot(path=os.path.join(ROOT, 'screens', 'ios-installieren.png'))
        pg.click('[data-sheet-close]'); check('Hinweis schließt', pg.locator('#ios-sheet').count() == 0)
        for h in ['start', 'leistungen', 'buchen', 'zeiten', 'kontakt', 'termine']:
            pg.goto(BASE + '#' + h); pg.wait_for_selector(f'#v-{h}.active'); pg.wait_for_timeout(150)
            w = pg.evaluate('[document.documentElement.scrollWidth, innerWidth]'); check(f'kein Überlauf ({h})', w[0] <= w[1], w)
        pg.goto(BASE + '#start'); pg.wait_for_selector('.hero'); pg.screenshot(path=os.path.join(ROOT, 'screens', 'ios-start.png'))
        check('Bewertungs-Karte (iOS) mit Schreib-Link', pg.locator('#rev-start').is_visible() and 'writereview?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY' in pg.get_attribute('#rev-start [data-review=write]', 'href'))
        pg.evaluate("document.getElementById('rev-start').scrollIntoView()"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(ROOT, 'screens', 'ios-bewertungen.png'))
        pg.goto(BASE + '#buchen'); pg.click('[data-service="d-schnitt"]'); pg.click('[data-staff="any"]'); pg.wait_for_selector('.time')
        t = pg.locator('.time').first; tm = t.inner_text(); t.click(); pg.click('#time-next')
        pg.fill('#b-name', 'Iris Test'); pg.fill('#b-phone', '0151 1234567'); pg.click('#book-now'); pg.wait_for_selector('#confirm-summary')
        check('Buchung in WebKit', tm in pg.inner_text('#confirm-summary'), tm)
        check('Bewertungs-Bitte nach Buchung (iOS)', pg.locator('#rev-done').is_visible())
        pg.screenshot(path=os.path.join(ROOT, 'screens', 'ios-bestaetigung.png'))
        # Standalone (vom Home-Bildschirm gestartet): Install-Hinweis muss verschwinden
        ctx2 = b.new_context(**dev, locale='de-DE'); p2 = ctx2.new_page()
        p2.add_init_script("Object.defineProperty(navigator, 'standalone', { get: () => true });")
        p2.goto(BASE); p2.wait_for_selector('.hero'); p2.wait_for_timeout(300)
        check('Standalone (navigator.standalone): kein Install-Hinweis', not p2.locator('#install-card').is_visible())
        b.close()
finally:
    srv.terminate()
check('Keine Konsolen-/Seitenfehler (WebKit)', not errors, errors[:8])
ok = sum(r[1] for r in results)
open(os.path.join(ROOT, 'tests', 'e2e-webkit-ergebnis.txt'), 'w', encoding='utf-8').write(f'WebKit iPhone 14 – {ok}/{len(results)} bestanden\n' + '\n'.join(('OK   ' if r[1] else 'FAIL ') + r[0] + (f' – {r[2]}' if r[2] != '' else '') for r in results) + '\n')
print(f'{ok}/{len(results)} bestanden'); sys.exit(0 if ok == len(results) else 1)
