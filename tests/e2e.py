"""E2E-Test (Playwright, headless Chromium, 390x844 mobil) unter einem UNTERPFAD.
Kopiert die App nach /tmp/site/salon-demo/ und startet python http.server auf /tmp/site.
Aufruf: python3 tests/e2e.py   → Screenshots in screens/, Ergebnis in tests/e2e-ergebnis.txt"""
import os, sys, json, shutil, subprocess, time, socket, re, datetime as dt
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = '/tmp/site'; SUB = 'salon-demo'; PORT = 8765
BASE = f'http://localhost:{PORT}/{SUB}/'
SHOTS = os.path.join(ROOT, 'screens'); os.makedirs(SHOTS, exist_ok=True)
results, errors = [], []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('  ✓ ' if cond else '  ✗ ') + name + ((' – ' + str(detail)) if detail != '' else ''), flush=True)

def serve():
    shutil.rmtree(SITE, ignore_errors=True)
    shutil.copytree(ROOT, os.path.join(SITE, SUB), ignore=shutil.ignore_patterns('screens', 'tests', 'tools', '*.zip', '__pycache__'))
    p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', SITE, '-b', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: socket.create_connection(('127.0.0.1', PORT), 0.2).close(); break
        except OSError: time.sleep(0.1)
    return p

def attach(page, label):
    page.on('console', lambda m: errors.append(f'[{label}] console.{m.type}: {m.text} @ {m.location.get("url","")}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'[{label}] pageerror: {e}'))
    page.on('requestfailed', lambda r: errors.append(f'[{label}] requestfailed: {r.url} {r.failure}') if r.url.startswith(BASE) else None)
    page.on('response', lambda r: errors.append(f'[{label}] HTTP {r.status}: {r.url}') if r.url.startswith(BASE) and r.status >= 400 else None)

def no_overflow(page, label):
    w = page.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
    check(f'kein horizontales Überlaufen ({label})', w[0] <= w[1], w)

def to_services(page):
    page.click('a[data-nav=buchen]'); page.wait_for_selector('#v-buchen.active')
    for _ in range(5):
        if page.locator('[data-service]').count(): return
        page.click('#v-buchen .b-back'); page.wait_for_timeout(50)

WD_S = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
WD_L = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
def rem_expect(iso, start, created):
    """Erwartete Erinnerungen: (Text wie in der App, Status) – 2 Kalendertage vorher gleiche Uhrzeit, 2 Std. vorher"""
    d = dt.date.fromisoformat(iso); t0 = dt.datetime.combine(d, dt.time(start // 60, start % 60))
    out = []
    for at, label in ((t0 - dt.timedelta(days=2), '2 Tage vorher'), (t0 - dt.timedelta(hours=2), '2 Stunden vorher')):
        now = dt.datetime.now()
        st = 'entfällt' if at <= created else ('verschickt' if at <= now else 'geplant')
        out.append((f"{WD_S[at.weekday()]}, {at:%d.%m.} um {at:%H:%M} Uhr – {label}", st))
    return out
def rem_texts(first, iso, start, leistung, bei, link):
    d = dt.date.fromisoformat(iso); hhmm = f'{start // 60:02d}:{start % 60:02d}'
    return (f'Hallo {first}, kleine Erinnerung: Ihr Termin bei Haardesign Da Giovanni ist am {WD_L[d.weekday()]}, {d:%d.%m.} um {hhmm} Uhr ({leistung} bei {bei}). Absagen oder verschieben bis 24 Std. vorher: {link}. Bis bald!',
            f'Hallo {first}, in 2 Stunden um {hhmm} Uhr sehen wir uns bei Haardesign Da Giovanni, Bahnstraße 63, Erkrath. Bis gleich!')
def rem_items(page, scope):
    return page.eval_on_selector_all(scope + ' .rem-item', "els => els.map(e => [e.querySelector('.rem-line').textContent, e.querySelector('.rem-st').textContent.split(' – ')[0], !!e.querySelector('s')])")

def shot(page, name, full=False):
    page.evaluate("document.querySelectorAll('.toast').forEach(t => t.remove())")
    page.wait_for_timeout(250)
    page.screenshot(path=os.path.join(SHOTS, name), full_page=full)

def main():
    srv = serve()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=['--lang=de-DE'])
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True,
                                      locale='de-DE', timezone_id='Europe/Berlin', accept_downloads=True,
                                      user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')
            ctx.add_init_script("window.__bip = false; addEventListener('beforeinstallprompt', () => { window.__bip = true; });")
            page = ctx.new_page(); attach(page, 'main')
            print('\n== Laden & Service Worker ==')
            page.goto(BASE); page.evaluate('localStorage.clear()'); page.reload()
            page.wait_for_selector('#v-start.active .hero')
            check('Startseite lädt unter Unterpfad', page.url.startswith(BASE))
            reg = page.evaluate("navigator.serviceWorker.ready.then(r => r.scope)")
            check('Service Worker registriert, Scope = Unterpfad', reg == BASE, reg)
            page.reload(); page.wait_for_selector('.hero')
            ctrl = page.evaluate("navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL")
            check('Service Worker kontrolliert die Seite', ctrl == BASE + 'sw.js', ctrl)
            cache = page.evaluate("caches.keys().then(async ks => { const c = await caches.open(ks.find(k=>k.startsWith('salon-pwa-'))); return {keys: ks, n: (await c.keys()).length}; })")
            check('Versionierter Cache mit allen Assets', cache['n'] >= 19 and any(re.match(r'salon-pwa-v\d+', k) for k in cache['keys']), cache)

            print('\n== Manifest & Icons ==')
            man = page.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(async r => ({ct: r.headers.get('content-type'), j: await r.json()}))")
            m = man['j']
            check('Manifest Content-Type', 'manifest+json' in (man['ct'] or '') or 'json' in (man['ct'] or ''), man['ct'])
            check('Manifest Felder (name/short_name/display/start_url/scope/Farben)', m['name'] == 'Haardesign Da Giovanni' and m['short_name'] == 'Da Giovanni' and m['display'] == 'standalone' and m['start_url'] == './' and m['scope'] == './' and m.get('theme_color') and m.get('background_color'), {k: m[k] for k in ('name','short_name','start_url','scope','display')})
            icons = page.evaluate("""async () => { const mu = new URL(document.querySelector('link[rel=manifest]').href); const m = await (await fetch(mu)).json();
              return Promise.all(m.icons.map(ic => new Promise(res => { const i = new Image(); const u = new URL(ic.src, mu).href; i.onload = () => res({src: u, sizes: ic.sizes, purpose: ic.purpose, w: i.naturalWidth, h: i.naturalHeight}); i.onerror = () => res({src: u, err: true}); i.src = u; }))); }""")
            for ic in icons:
                exp = int(ic.get('sizes', '0x0').split('x')[0]) if not ic.get('err') else -1
                check(f"Icon lädt {ic['src'].replace(BASE,'')} ({ic.get('purpose')})", not ic.get('err') and ic['w'] == exp and ic['h'] == exp, f"{ic.get('w')}x{ic.get('h')}")
            check('192er + 512er + maskable vorhanden', {'192x192', '512x512'} <= {i['sizes'] for i in icons} and any(i.get('purpose') == 'maskable' for i in icons))
            ati = page.evaluate("fetch(document.querySelector('link[rel=apple-touch-icon]').href).then(r=>r.status)")
            check('apple-touch-icon lädt', ati == 200, ati)
            check('meta theme-color gesetzt', page.evaluate("!!document.querySelector('meta[name=theme-color]').content"))
            cdp = ctx.new_cdp_session(page)
            try:
                inst = cdp.send('Page.getInstallabilityErrors')
                check('Chrome-Installierbarkeit (Page.getInstallabilityErrors leer)', inst.get('installabilityErrors') == [], inst)
            except Exception as ex:
                check('Chrome-Installierbarkeit (CDP)', False, str(ex))
            try:
                mf = cdp.send('Page.getAppManifest')
                check('Chrome parst Manifest ohne Fehler', not mf.get('errors'), mf.get('errors'))
            except Exception as ex:
                check('Page.getAppManifest', False, str(ex))
            page.reload(); page.wait_for_selector('.hero'); page.wait_for_timeout(1500)
            bip = page.evaluate('window.__bip'); vis = page.locator('#install-card').is_visible()
            check('„App installieren“ nur bei beforeinstallprompt sichtbar', vis == bip, f'beforeinstallprompt={bip}, Karte sichtbar={vis}')

            print('\n== Start / Leistungen / Zeiten ==')
            check('Hero-Buttons Termin buchen + Anrufen', page.locator('#cta-book').is_visible() and page.get_attribute('#cta-call', 'href') == 'tel:+49211241886')
            check('Name im Kopf aus Konfiguration', page.inner_text('.brand-name') == 'Haardesign Da Giovanni')
            no_overflow(page, 'start'); shot(page, 'start.png')
            print('\n== Google-Bewertungen ==')
            rv = page.locator('#rev-start')
            check('Bewertungs-Karte unter dem Hero', rv.is_visible() and page.evaluate("document.querySelector('.hero').nextElementSibling.id") == 'rev-start')
            rt = rv.inner_text()
            check('Sterne + 4,9 + 97 Bewertungen + Stand', '4,9' in rt and '97 Bewertungen auf Google' in rt and 'Stand: Oktober 2026' in rt and page.locator('#rev-start .stars[aria-label="4,9 von 5 Sternen"]').count() == 1, rt.replace('\n', ' | '))
            check('„Bewertung schreiben“ → writereview?placeid', page.get_attribute('#rev-start [data-review=write]', 'href') == 'https://search.google.com/local/writereview?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY' and page.get_attribute('#rev-start [data-review=write]', 'target') == '_blank' and 'Bewertung schreiben' in page.inner_text('#rev-start [data-review=write]'))
            check('„Alle Bewertungen auf Google lesen“ → reviews?placeid', page.get_attribute('#rev-start [data-review=read]', 'href') == 'https://search.google.com/local/reviews?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY')
            check('Keine erfundenen Rezensionstexte', page.locator('blockquote, .review-text').count() == 0)
            page.evaluate("document.getElementById('rev-start').scrollIntoView({block: 'start'}); window.scrollBy(0, -80)")
            shot(page, 'bewertungen.png'); page.evaluate('window.scrollTo(0,0)')
            page.click('a[data-nav=leistungen]'); page.wait_for_selector('#v-leistungen.active .price-row')
            check('„Beispielpreise“ sichtbar in Leistungen', page.locator('#v-leistungen .badge.sample').is_visible())
            lt = page.inner_text('#v-leistungen')
            check('Dauer-Anzeige „ca. …“ (30 Min., 1 Std., 1,5 Std., 3 Std.)', all(x in lt for x in ['ca. 30 Min.', 'ca. 1 Std.', 'ca. 1,5 Std.', 'ca. 3 Std.']) and 'ca. ca.' not in lt)
            check('Kategorien Damen/Herren/Kinder/Farbe', all(page.locator(f'#v-leistungen h2:text-is("{c}")').count() == 1 for c in ['Damen', 'Herren', 'Kinder', 'Farbe']))
            no_overflow(page, 'leistungen'); shot(page, 'leistungen.png')
            page.click('a[data-nav=zeiten]'); page.wait_for_selector('#v-zeiten.active .hours-row')
            check('Heute hervorgehoben', page.locator('.hours-row.today').count() == 1, page.inner_text('.hours-row.today'))
            st = page.inner_text('#open-status .status')
            check('Status „Jetzt geöffnet/geschlossen“', st in ('Jetzt geöffnet', 'Jetzt geschlossen'), st)
            prov = page.evaluate('!!SALON_CONFIG.hoursProvisional')
            check('Hinweis „Zeiten vorläufig“ genau dann, wenn hoursProvisional', ('Zeiten vorläufig – bitte prüfen' in page.inner_text('#v-zeiten')) == prov, f'hoursProvisional={prov}')
            ht = page.inner_text('#v-zeiten .hours')
            check('Echte Zeiten: Di–Do 9–18, Fr 9–20, Sa 8:30–13', ht.count('09:00–18:00 Uhr') == 3 and 'Freitag\t09:00–20:00' in ht.replace('\n', '\t').replace('Heute', '').replace('\t\t', '\t') or ('09:00–20:00 Uhr' in ht and '08:30–13:00 Uhr' in ht and ht.count('09:00–18:00 Uhr') == 3), ht.replace('\n', ' | '))
            check('Mo + So geschlossen', page.locator('.hours-row.closed-day').count() == 2)
            no_overflow(page, 'zeiten'); shot(page, 'zeiten.png')

            print('\n== Buchung ==')
            page.click('a[data-nav=buchen]'); page.wait_for_selector('#v-buchen.active [data-service]')
            check('Demo-Banner sichtbar', 'Buchungen werden nur auf diesem Gerät gespeichert' in page.inner_text('#v-buchen .demo-banner'))
            page.click('[data-service="h-schnitt"]'); page.wait_for_selector('[data-staff="giovanni"]')
            names = page.eval_on_selector_all('#v-buchen [data-staff] .t', 'els => els.map(e => e.textContent)')
            check('Team-Auswahl: egal + 5 Namen', names == ['Egal – erste freie Zeit', 'Giovanni', 'Marco', 'Jenny', 'Julia', 'Anny'], names)
            shot(page, 'buchung-team.png')
            page.click('[data-staff="giovanni"]'); page.wait_for_selector('.days')
            info = page.evaluate("""() => [...document.querySelectorAll('.day')].map(b => ({d: b.dataset.day, dis: b.disabled, wd: new Date(b.dataset.day+'T12:00').getDay(), n: b.querySelector('small').textContent}))""")
            check('14 Tage angezeigt', len(info) == 14, len(info))
            check('Mo/So (geschlossen) deaktiviert', all(x['dis'] for x in info if x['wd'] in (0, 1)) and any(x['wd'] in (0, 1) for x in info))
            first = [x for x in info if not x['dis']]
            check('freie Tage vorhanden', len(first) > 0)
            # einen Tag ≠ heute wählen (stabil)
            # möglichst ≥ 3 Tage voraus, damit beide Erinnerungen „geplant“ sind
            far = [x for x in first if x['d'] >= (dt.date.today() + dt.timedelta(days=3)).isoformat()]
            day = (far or [x for x in first if x['d'] != info[0]['d']])[0]['d']
            page.click(f'[data-day="{day}"]'); page.wait_for_selector('.day.sel')
            times = page.eval_on_selector_all('#v-buchen .time', 'els => els.map(e => +e.dataset.time)')
            v = page.evaluate("""([day, times]) => { const st = JSON.parse(localStorage.getItem(SALON_CONFIG.storageKey));
                const bk = st.bookings.filter(b => b.staffId==='giovanni' && b.date===day && b.status!=='cancelled');
                const iv = SB.intervals(day); const dur = SB.service('h-schnitt').duration; const step = SB.stepFor(SB.service('h-schnitt'));
                let possible = 0; iv.forEach(i => { for (let t=Math.ceil(i[0]/step)*step; t+dur<=i[1]; t+=step) possible++; });
                const clash = times.filter(t => bk.some(b => b.start < t+dur && t < b.start+b.duration));
                const outside = times.filter(t => !iv.some(i => t>=i[0] && t+dur<=i[1]));
                return {demo: bk.length, possible, clash, outside}; }""", [day, times])
            check('Demo-Termine belegen Zeiten (weniger Slots als theoretisch)', v['demo'] > 0 and len(times) < v['possible'], f"{len(times)} frei von {v['possible']}, {v['demo']} Demo-Termine")
            check('Keine Slot-Überschneidung mit Terminen', v['clash'] == [], v['clash'])
            check('Alle Slots innerhalb der Öffnungszeiten (inkl. Dauer)', v['outside'] == [], v['outside'])
            check('Herrenschnitt (UI): alle Startzeiten auf :00/:30', times and all(t % 30 == 0 for t in times), [f'{t//60:02d}:{t%60:02d}' for t in times])
            g = page.evaluate("""() => { const st = SB.seed(SB.load()), today = SB.todayISO(), out = {hs: [], q: 0, demoOff: 0, sat: [], satEmpty: null, dur: {}};
                for (let i = 0; i < SALON_CONFIG.booking.daysAhead; i++) { const d = SB.addDays(today, i);
                  SB.freeSlots(st, d, 'h-schnitt', null).forEach(x => { if (x.start % 30) out.hs.push(d + ' ' + SB.fmtTime(x.start)); });
                  ['h-maschine','h-bart','k-bis6','s-pflege'].forEach(id => SB.freeSlots(st, d, id, null).forEach(x => { if (x.start % 30 === 15) out.q++; }));
                  if (SB.weekday(d) === 6) { const f = SB.freeSlots(st, d, 'f-straehnen', null); out.sat.push(f.length ? f[f.length-1].start : null);
                    if (out.satEmpty === null) { const e = SB.freeSlots({bookings: []}, d, 'f-straehnen', null); out.satEmpty = e.map(x => SB.fmtTime(x.start)); } } }
                out.demoOff = st.bookings.filter(b => b.demo && b.duration >= 30 && b.start % 30).length;
                SALON_CONFIG.services.forEach(s => out.dur[s.name] = [s.duration, SB.durTxt(s.duration), SB.stepFor(s)]);
                // Ende jeder Startzeit vor Ladenschluss (alle Leistungen, alle Tage)
                out.late = []; for (let i = 0; i < 14; i++) { const d = SB.addDays(today, i), iv = SB.intervals(d);
                  SALON_CONFIG.services.forEach(s => SB.freeSlots(st, d, s.id, null).forEach(x => { if (!iv.some(v => x.start >= v[0] && x.start + s.duration <= v[1])) out.late.push(s.id + ' ' + d + ' ' + SB.fmtTime(x.start)); })); }
                return out; }""")
            check('Herrenschnitt (14 Tage): nie :15/:45', g['hs'] == [], g['hs'][:5])
            check('15-Min.-Leistungen: :15/:45 werden angeboten', g['q'] > 0, f"{g['q']} Startzeiten auf :15/:45")
            check('Demo-Termine ≥ 30 Min. liegen auf :00/:30', g['demoOff'] == 0, g['demoOff'])
            check('Balayage Samstag: letzte Startzeit ≤ 10:00 (Schluss 13:00)', all(x is None or x <= 600 for x in g['sat']) and g['satEmpty'] and g['satEmpty'][-1] == '10:00', f"leerer Sa: {g['satEmpty']}; mit Demo-Terminen letzte: {[None if x is None else f'{x//60:02d}:{x%60:02d}' for x in g['sat']]}")
            check('Alle Startzeiten enden vor Ladenschluss', g['late'] == [], g['late'][:5])
            print('     Dauer-Tabelle:', '; '.join(f"{k}: {v[1]} (Raster {v[2]})" for k, v in g['dur'].items()))
            pick = times[len(times) // 2]
            page.click(f'#v-buchen .time[data-time="{pick}"]'); page.wait_for_selector('#time-next')
            no_overflow(page, 'slots'); shot(page, 'buchung-slots.png')
            page.click('#time-next'); page.wait_for_selector('#b-name')
            page.click('#book-now')
            check('Validierung: leere Felder → Fehlermeldung', page.locator('#f-name.err').count() == 1 and page.locator('#f-phone.err').count() == 1)
            page.fill('#b-name', 'Petra Schulz'); page.fill('#b-phone', 'abc123'); page.click('#book-now')
            check('Validierung: ungültige Telefonnummer abgelehnt', page.locator('#f-phone.err').count() == 1 and page.locator('#f-name.err').count() == 0)
            page.fill('#b-phone', '0171 2345678'); page.fill('#b-note', 'Bitte etwas kürzer an den Seiten')
            print('\n== Terminerinnerung: Auswahl ==')
            check('Erinnerung: WhatsApp vorausgewählt (WhatsApp / SMS / Keine)', page.eval_on_selector_all('#f-rem input[name=reminder]', 'els => els.map(e => e.value + (e.checked ? "*" : ""))') == ['whatsapp*', 'sms', 'none'])
            check('Einwilligungs-Zeile „Ich möchte Terminerinnerungen per WhatsApp erhalten …“', page.inner_text('#rem-consent').startswith('Ich möchte Terminerinnerungen per WhatsApp erhalten') and page.get_attribute('#f-rem input[value=whatsapp]', 'aria-describedby') == 'rem-consent', page.inner_text('#rem-consent'))
            check('Kein Handy-Hinweis bei Handynummer', page.locator('#rem-mobile').is_hidden())
            page.fill('#b-phone', '0211 241886'); check('Hinweis „nur auf Handynummer“ bei Festnetz', page.locator('#rem-mobile').is_visible())
            page.fill('#b-phone', '0171 2345678')
            page.check('#f-rem input[value=sms]'); c1 = page.inner_text('#rem-consent')
            page.check('#f-rem input[value=none]'); c2 = page.inner_text('#rem-consent')
            check('Einwilligung folgt der Auswahl (SMS / Keine)', 'per SMS erhalten' in c1 and c2 == 'Sie erhalten keine Terminerinnerungen.', [c1, c2])
            page.check('#f-rem input[value=whatsapp]')
            page.evaluate("document.getElementById('f-rem').scrollIntoView({block: 'center'})")
            shot(page, 'buchung-angaben.png')
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            summ = page.inner_text('#confirm-summary')
            hh = f'{pick // 60:02d}:{pick % 60:02d}'
            check('Bewertungs-Bitte auf Bestätigungsseite', page.locator('#rev-done').is_visible() and 'Zufrieden? Bewerte uns auf Google' in page.inner_text('#rev-done') and page.get_attribute('#rev-done a', 'href') == 'https://search.google.com/local/writereview?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY')
            check('Bestätigung mit Zusammenfassung', 'Herrenschnitt' in summ and hh in summ and 'Petra Schulz' in summ and 'Bahnstraße 63' in summ, summ.replace('\n', ' | ')[:160])
            no_overflow(page, 'bestaetigung'); shot(page, 'bestaetigung.png')
            print('\n== Terminerinnerung: Bestätigung + Vorschau ==')
            bk = page.evaluate(f"JSON.parse(localStorage.getItem(SALON_CONFIG.storageKey)).bookings.find(b => b.mine && b.date === '{day}' && b.start === {pick})")
            created = dt.datetime.fromisoformat(bk['createdAt'].replace('Z', '+00:00')).astimezone().replace(tzinfo=None)
            exp = rem_expect(day, pick, created)
            check('Buchung speichert Kanal reminder = whatsapp', bk.get('reminder') == 'whatsapp')
            got = rem_items(page, '#v-buchen [data-rembox=whatsapp]')
            check('„Erinnerungen geplant“ per WhatsApp an Telefonnummer', page.inner_text('#v-buchen .rem-t') == 'Erinnerungen geplant' and 'per WhatsApp an 0171 2345678' in page.inner_text('#v-buchen .rem-sub'))
            check('Exakte Erinnerungszeiten (2 Tage / 2 Stunden vorher) + Status', [[g[0], g[1]] for g in got] == [list(e) for e in exp], got)
            check('Kanal-Symbol WhatsApp', page.locator('#v-buchen .rem-ico.whatsapp svg').count() == 1)
            check('Demo-Hinweis „im echten Betrieb verschickt der Salon-Server …“', 'Demo – im echten Betrieb verschickt der Salon-Server die Nachrichten automatisch' in page.inner_text('#v-buchen [data-rembox] .rem-demo'))
            check('Keine „an den Salon senden“-Buttons mehr', page.locator('a[href^="https://wa.me"], a[href^="sms:"], [data-send]').count() == 0)
            page.evaluate("document.querySelector('#v-buchen [data-rembox]').scrollIntoView({block: 'center'})")
            no_overflow(page, 'bestaetigung erinnerung'); shot(page, 'bestaetigung-erinnerung.png')
            first_name, bei_name = 'Petra', 'Giovanni'
            t_d2, t_h2 = rem_texts(first_name, day, pick, 'Herrenschnitt inkl. Waschen', bei_name, BASE + '#termine')
            page.click('#v-buchen [data-rem-preview]'); page.wait_for_selector('#rem-preview .phone.chat')
            check('Vorschau: Dialog (aria-modal) im WhatsApp-Stil', page.get_attribute('#rem-preview [role=dialog]', 'aria-modal') == 'true' and page.locator('#rem-preview .phone.whatsapp .ph-head.wa').is_visible() and page.inner_text('#rem-preview .ph-who b') == 'Haardesign Da Giovanni')
            b1, b2 = page.inner_text('#rem-preview .ph-bubble[data-rem=d2] .ph-txt'), page.inner_text('#rem-preview .ph-bubble[data-rem=h2] .ph-txt')
            check('Vorschau-Text 2 Tage vorher (Name, Wochentag, Datum, Uhrzeit, Leistung, Mitarbeiter, Link)', b1 == t_d2, b1)
            check('Vorschau-Text 2 Stunden vorher', b2 == t_h2, b2)
            check('Link zu „Meine Termine“ in der Nachricht', page.get_attribute('#rem-preview .ph-link', 'href') == '#termine')
            metas = page.eval_on_selector_all('#rem-preview .ph-meta', 'els => els.map(e => e.textContent)')
            check('Blasen mit Uhrzeit (= Versandzeit) + Häkchen', metas == [exp[0][0].split(' um ')[1][:5], exp[1][0].split(' um ')[1][:5]] and page.locator('#rem-preview .ph-checks').count() == 2, metas)
            no_overflow(page, 'vorschau whatsapp'); shot(page, 'erinnerung-whatsapp-vorschau.png')
            page.keyboard.press('Escape')
            check('Vorschau schließt mit Esc, Fokus zurück auf Button', page.locator('#rem-preview').count() == 0 and page.evaluate("document.activeElement.hasAttribute('data-rem-preview')"))
            page.click('#v-buchen [data-rem-demo]'); page.wait_for_selector('#rem-preview .phone.lock .ph-notif'); page.wait_for_timeout(1100)
            nt = page.inner_text('#rem-preview .ph-notif')
            nxt = [e for e in exp if e[1] == 'geplant']
            lt = page.inner_text('#rem-preview .ph-lock-time')
            check('„Demo: Erinnerung jetzt zeigen“: Sperrbildschirm mit WhatsApp-Mitteilung', 'WhatsApp' in nt and 'Haardesign Da Giovanni' in nt and page.locator('#rem-preview .ph-notif .ph-app.whatsapp').count() == 1, nt.replace('\n', ' | ')[:90])
            check('Sperrbildschirm-Uhrzeit = nächste geplante Erinnerung', not nxt or lt == nxt[0][0].split(' um ')[1][:5].lstrip('0'), lt)
            shot(page, 'erinnerung-sperrbildschirm.png')
            page.click('#rem-preview .ph-notif'); page.wait_for_selector('#rem-preview .phone.chat')
            check('Mitteilung antippen → Chat-Vorschau', page.locator('#rem-preview .ph-bubble').count() == 2)
            page.click('[data-rem-close]')
            with page.expect_download() as dl:
                page.click('#v-buchen [data-ics]')
            d = dl.value; path = d.path(); ics = open(path, encoding='utf-8').read()
            check('.ics-Download (In Kalender eintragen)', d.suggested_filename.endswith('.ics') and 'BEGIN:VCALENDAR' in ics and 'DTSTART:' in ics and 'Bahnstraße 63' in ics, d.suggested_filename)
            check('Meine-Termine-Zähler = 1', page.inner_text('#mine-count') == '1')
            # Slot ist danach weg
            page.click('[data-restart]'); page.wait_for_selector('[data-service="h-schnitt"]')
            page.click('[data-service="h-schnitt"]'); page.click('[data-staff="giovanni"]'); page.click(f'[data-day="{day}"]'); page.wait_for_selector('.day.sel')
            times2 = page.eval_on_selector_all('#v-buchen .time', 'els => els.map(e => +e.dataset.time)')
            check('Gebuchter Slot verschwindet (und überlappende)', pick not in times2 and all(not (t < pick + 30 and pick < t + 30) for t in times2), f'{len(times)} → {len(times2)}')
            # Meine Termine + Stornieren
            page.goto(BASE + '#termine'); page.wait_for_selector('#v-termine.active')
            check('Meine Termine listet die Buchung', page.locator('.mine-item').count() == 1)
            no_overflow(page, 'termine'); shot(page, 'meine-termine.png')
            got2 = rem_items(page, '.mine-item [data-rembox=whatsapp]')
            check('Meine Termine: Erinnerungen mit Zeiten + Vorschau-Button', [[g[0], g[1]] for g in got2] == [list(e) for e in exp] and page.locator('.mine-item [data-rem-preview]').is_visible(), got2)
            check('Meine Termine: Demo-Hinweis einmal oben', page.locator('#v-termine > .rem-demo').count() == 1)
            page.evaluate("document.querySelector('.mine-item').scrollIntoView({block: 'center'})"); shot(page, 'meine-termine-erinnerung.png')
            page.click('.mine-item [data-rem-preview]'); page.wait_for_selector('#rem-preview .ph-link')
            page.click('#rem-preview .ph-link'); page.wait_for_timeout(200)
            check('Link in der Vorschau führt zu Meine Termine (Dialog zu)', page.locator('#rem-preview').count() == 0 and page.url.endswith('#termine'))
            page.click('.mine-item [data-cancel]'); page.click('[data-cancel-yes]')
            page.wait_for_selector('#v-termine .empty')
            check('Stornieren in Meine Termine', page.locator('.mine-item').count() == 0)
            to_services(page); page.click('[data-service="h-schnitt"]'); page.click('[data-staff="giovanni"]'); page.click(f'[data-day="{day}"]'); page.wait_for_selector('.day.sel')
            times3 = page.eval_on_selector_all('#v-buchen .time', 'els => els.map(e => +e.dataset.time)')
            check('Nach Storno ist der Slot wieder frei', pick in times3)
            # Zweite Buchung mit „egal“ + Storno auf Bestätigungsseite
            page.click('[data-bstep=staff]'); page.click('[data-staff="any"]'); page.wait_for_selector('#v-buchen .time')
            page.locator('#v-buchen .time').first.click(); page.click('#time-next')
            page.fill('#b-name', 'Max Muster'); page.fill('#b-phone', '+49 211 123456'); page.check('#f-rem input[value=sms]')
            check('Festnetz +49 211 … mit SMS → Handy-Hinweis', page.locator('#rem-mobile').is_visible())
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            bk2 = page.evaluate("JSON.parse(localStorage.getItem(SALON_CONFIG.storageKey)).bookings.filter(b => b.mine && b.name === 'Max Muster').pop()")
            check('Kanal SMS gespeichert + angezeigt', bk2['reminder'] == 'sms' and page.locator('#v-buchen [data-rembox=sms] .rem-ico.sms').count() == 1 and 'per SMS an +49 211 123456' in page.inner_text('#v-buchen .rem-sub'))
            c2 = dt.datetime.fromisoformat(bk2['createdAt'].replace('Z', '+00:00')).astimezone().replace(tzinfo=None)
            e2 = rem_expect(bk2['date'], bk2['start'], c2); g2 = rem_items(page, '#v-buchen [data-rembox=sms]')
            check('SMS-Buchung: Zeiten/Status (kurzfristig → „entfällt“ möglich)', [[g[0], g[1]] for g in g2] == [list(e) for e in e2] and all(g[2] == (g[1] == 'entfällt') for g in g2), g2)
            page.click('#v-buchen [data-rem-preview]'); page.wait_for_selector('#rem-preview .phone.sms')
            st_name = page.evaluate("SB.stylist(" + json.dumps(bk2['staffId']) + ").name")
            s_d2, s_h2 = rem_texts('Max', bk2['date'], bk2['start'], 'Waschen, Schneiden, Föhnen' if bk2['serviceId'] == 'd-schnitt' else page.evaluate("SB.service(" + json.dumps(bk2['serviceId']) + ").name"), st_name, BASE + '#termine')
            check('SMS-Vorschau: Absender „Da Giovanni“, graue Blasen, keine Häkchen', page.inner_text('#rem-preview .ph-who b') == 'Da Giovanni' and 'SMS' in page.inner_text('#rem-preview .ph-who small') and page.locator('#rem-preview .ph-checks').count() == 0)
            check('SMS-Vorschau: beide Texte korrekt', page.inner_text('#rem-preview .ph-bubble[data-rem=d2] .ph-txt') == s_d2 and page.inner_text('#rem-preview .ph-bubble[data-rem=h2] .ph-txt') == s_h2, page.inner_text('#rem-preview .ph-bubble[data-rem=h2] .ph-txt'))
            check('Vorschau: „entfällt“-Hinweis genau bei entfallenden Erinnerungen', page.locator('#rem-preview .ph-note').count() == sum(1 for e in e2 if e[1] == 'entfällt'))
            no_overflow(page, 'vorschau sms'); shot(page, 'erinnerung-sms-vorschau.png')
            page.click('[data-rem-close]')
            bei = page.inner_text('#confirm-summary .row:nth-child(3) span:last-child')
            check('Buchung „egal“ teilt Friseur:in zu', bei in ['Giovanni', 'Marco', 'Jenny', 'Julia', 'Anny'], bei)
            page.click('#cancel-zone [data-cancel]'); page.click('[data-cancel-yes]'); page.wait_for_selector('.done-ico.bad')
            check('„Termin stornieren“ auf Bestätigungsseite', 'Termin storniert' in page.inner_text('#v-buchen'))

            print('\n== Terminerinnerung: Zeitlogik ==')
            u = page.evaluate("""() => { const f = (b, now) => SB.reminders(b, new Date(now)).map(r => SB.fmtDate(r.date) + ' ' + SB.fmtTime(r.min) + ' ' + r.status);
                const b = { reminder: 'whatsapp', date: '2026-10-21', start: 630, createdAt: '2026-10-10T12:00:00' };
                return { normal: f(b, '2026-10-10T12:00:00'),
                  sent1: f(b, '2026-10-20T09:00:00'),
                  short1: f({ ...b, createdAt: '2026-10-20T12:00:00' }, '2026-10-20T12:00:00'),
                  short2: f({ ...b, createdAt: '2026-10-21T09:00:00' }, '2026-10-21T09:00:00'),
                  dst: f({ ...b, date: '2026-10-27', start: 630 }, '2026-10-10T12:00:00'),
                  none: SB.reminders({ ...b, reminder: 'none' }).length }; }""")
            check('Mi 21.10. 10:30 → Mo 19.10. 10:30 + Mi 21.10. 08:30, beide geplant', u['normal'] == ['Mo, 19.10. 10:30 geplant', 'Mi, 21.10. 08:30 geplant'], u['normal'])
            check('Nach Erreichen: „verschickt“', u['sent1'] == ['Mo, 19.10. 10:30 verschickt', 'Mi, 21.10. 08:30 geplant'], u['sent1'])
            check('Kurzfristig (am Vortag gebucht): 2-Tage-Erinnerung entfällt', u['short1'] == ['Mo, 19.10. 10:30 entfaellt', 'Mi, 21.10. 08:30 geplant'], u['short1'])
            check('Sehr kurzfristig (< 2 Std.): beide entfallen', u['short2'] == ['Mo, 19.10. 10:30 entfaellt', 'Mi, 21.10. 08:30 entfaellt'], u['short2'])
            check('Zeitumstellung 25.10.: 2 Tage vorher = gleiche Uhrzeit', u['dst'] == ['So, 25.10. 10:30 geplant', 'Di, 27.10. 08:30 geplant'], u['dst'])
            check('Kanal „Keine“ → keine Erinnerungen', u['none'] == 0)
            page.evaluate("""() => { const k = SALON_CONFIG.storageKey, st = JSON.parse(localStorage.getItem(k));
                st.bookings.push({ id: 'short-test', mine: true, serviceId: 'h-schnitt', staffId: 'marco', date: SB.addDays(SB.todayISO(), 1), start: 23 * 60, duration: 30, price: 26,
                  name: 'Kurz Fristig', phone: '0171 1111111', status: 'ok', reminder: 'whatsapp', createdAt: new Date().toISOString() });
                localStorage.setItem(k, JSON.stringify(st)); }""")
            page.goto(BASE + '#start'); page.goto(BASE + '#termine'); page.wait_for_selector('[data-mine="short-test"]')
            gs = rem_items(page, '[data-mine="short-test"]')
            check('UI: morgen gebucht → „2 Tage vorher … entfällt“ (durchgestrichen), 2 Std. geplant', gs[0][1] == 'entfällt' and gs[0][2] and gs[1][1] == 'geplant' and not gs[1][2] and 'entfällt – Termin kurzfristig gebucht' in page.text_content('[data-mine="short-test"] .st-entfaellt .rem-st'), [gs, page.text_content('[data-mine="short-test"] .st-entfaellt .rem-st')])
            page.evaluate("""() => { const k = SALON_CONFIG.storageKey, st = JSON.parse(localStorage.getItem(k)); st.bookings = st.bookings.filter(b => b.id !== 'short-test'); localStorage.setItem(k, JSON.stringify(st)); }""")

            print('\n== Kontakt ==')
            page.click('a[data-nav=kontakt]'); page.wait_for_selector('#v-kontakt.active #map-box')
            check('Click-to-call tel:+49211241886', page.get_attribute('#k-call', 'href') == 'tel:+49211241886')
            g = page.get_attribute('#gmaps', 'href')
            check('Google-Maps-Link mit Salon-Query', g.startswith('https://www.google.com/maps/search/?api=1&query=Haardesign%20Da%20Giovanni%2C%20Bahnstra%C3%9Fe%2063%2C%2040699%20Erkrath'), g)
            check('Bewertungs-Karte in Kontakt', page.get_attribute('#rev-kontakt [data-review=write]', 'href') == 'https://search.google.com/local/writereview?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY')
            mh = page.get_attribute('#gmaps', 'href')
            check('Google-Maps-Link mit query_place_id', mh.endswith('&query_place_id=ChIJnxzAeNTNuEcRSB6MdPd67FY'), mh)
            check('Facebook-Link', page.get_attribute('#k-fb', 'href') == 'https://www.facebook.com/HaardesignDaGiovanni/')
            check('Kein WhatsApp-Link', page.locator('a[href*="wa.me"]').count() == 0)
            src = page.get_attribute('#map-box iframe', 'src')
            check('OSM-iframe mit Marker 51.2219/6.9126', src and 'openstreetmap.org/export/embed.html' in src and 'marker=51.2219329%2C6.9126149' in src, src)
            try:
                page.wait_for_selector('#map-box.loaded', timeout=15000); page.wait_for_timeout(2500); check('OSM-Karte geladen', True)
            except Exception: check('OSM-Karte geladen (Netz)', False, 'Timeout – evtl. kein Internet')
            no_overflow(page, 'kontakt'); shot(page, 'kontakt.png')
            page.click('#v-kontakt .foot-links a[href="#impressum"]'); page.wait_for_selector('#v-impressum.active h1')
            check('Impressum-Platzhalter', 'Platzhalter' in page.inner_text('#v-impressum'))
            page.goto(BASE + '#datenschutz'); page.wait_for_selector('#v-datenschutz.active h1')
            check('Datenschutz-Platzhalter', 'Platzhalter' in page.inner_text('#v-datenschutz'))
            # Vergangener Termin → Bewertungs-Bitte in „Meine Termine“
            page.evaluate("""() => { const k = SALON_CONFIG.storageKey, st = JSON.parse(localStorage.getItem(k));
                st.bookings.push({ id: 'past-test', mine: true, serviceId: 'h-schnitt', staffId: 'marco', date: SB.addDays(SB.todayISO(), -3), start: 600, duration: 30, price: 26, name: 'Petra Schulz', phone: '0171 2345678', status: 'ok' });
                localStorage.setItem(k, JSON.stringify(st)); }""")
            page.goto(BASE + '#start'); page.goto(BASE + '#termine'); page.wait_for_selector('#v-termine.active')
            check('Vergangene Termine + Bewertungs-Bitte', page.locator('[data-past="past-test"]').count() == 1 and page.locator('#rev-past').is_visible() and page.get_attribute('#rev-past a', 'href') == 'https://search.google.com/local/writereview?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY')
            no_overflow(page, 'termine vergangen'); shot(page, 'meine-termine-vergangen.png')

            print('\n== Offline ==')
            ctx.set_offline(True)
            page.goto(BASE); page.wait_for_selector('.hero')
            check('App startet offline (aus SW-Cache)', page.locator('.hero h1').is_visible())
            check('Schriften offline geladen', page.evaluate("document.fonts.ready.then(() => document.fonts.check('500 20px Fraunces'))"))
            page.click('a[data-nav=kontakt]'); page.wait_for_selector('#map-msg')
            page.wait_for_timeout(500); check('Karte offline: verständlicher Hinweis, kein iframe', 'offline' in page.inner_text('#map-msg') and page.locator('#map-box iframe').count() == 0, [page.inner_text('#map-msg'), page.evaluate('navigator.onLine')])
            shot(page, 'kontakt-offline.png')
            to_services(page); page.click('[data-service="d-foehnen"]'); page.click('[data-staff="any"]'); page.wait_for_selector('#v-buchen .time')
            page.locator('#v-buchen .time').first.click(); page.click('#time-next'); page.fill('#b-name', 'Offline Test'); page.fill('#b-phone', '0211 99999'); page.check('#f-rem input[value=none]'); page.click('#book-now')
            page.wait_for_selector('#confirm-summary'); check('Buchung funktioniert offline', True)
            check('Kanal „Keine“: „Keine Erinnerungen gewünscht“, keine Vorschau', 'Keine Erinnerungen gewünscht' in page.inner_text('#v-buchen [data-rembox=none]') and page.locator('#v-buchen [data-rem-preview]').count() == 0)
            ctx.set_offline(False)

            print('\n== 360 px / Desktop ==')
            p2 = browser.new_page(viewport={'width': 360, 'height': 740}, is_mobile=True, has_touch=True, locale='de-DE', timezone_id='Europe/Berlin'); attach(p2, '360')
            for h in ['start', 'leistungen', 'buchen', 'zeiten', 'kontakt', 'termine']:
                p2.goto(BASE + '#' + h); p2.wait_for_selector(f'#v-{h}.active'); p2.wait_for_timeout(150); no_overflow(p2, f'360px {h}')
            p2.goto(BASE + '#buchen'); p2.click('[data-service="d-schnitt"]'); p2.click('[data-staff="any"]'); p2.wait_for_selector('.time'); no_overflow(p2, '360px slots')
            p2.close()
            p3 = browser.new_page(viewport={'width': 1280, 'height': 860}); attach(p3, 'desktop')
            p3.goto(BASE); p3.wait_for_selector('.hero'); p3.wait_for_timeout(600); p3.screenshot(path=os.path.join(SHOTS, 'desktop.png')); no_overflow(p3, 'desktop'); p3.close()
            browser.close()
    finally:
        srv.terminate()

    # OSM-Iframe-interne Meldungen gehören nicht zur App
    app_errors = [e for e in errors if 'openstreetmap' not in e.lower()]
    other = [e for e in errors if e not in app_errors]
    check('Keine Konsolenfehler / Seitenfehler / 404 der App', not app_errors, app_errors[:10])
    ok = sum(1 for r in results if r[1])
    out = [f'E2E {time.strftime("%Y-%m-%d %H:%M")} – {ok}/{len(results)} bestanden – {BASE}'] + [('OK   ' if r[1] else 'FAIL ') + r[0] + (f' – {r[2]}' if r[2] != '' else '') for r in results]
    if other: out += ['', 'Hinweis (fremde Inhalte, OSM-iframe):'] + other[:5]
    open(os.path.join(ROOT, 'tests', 'e2e-ergebnis.txt'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'\n{ok}/{len(results)} bestanden')
    sys.exit(0 if ok == len(results) else 1)

main()
