"""Tests: Dauer nach Haarlänge + Terminwunsch (Modus „Anfrage“) in der Kunden-App (Playwright, 390x844).
Aufruf: PORT=8766 python3 tests/haarlaenge.py   ·   THEME=glass … (Design „Glas“)   ·   SHOTS=/pfad → Screenshots"""
import os, sys, json, shutil, subprocess, time, socket, datetime as dt
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8766')); SITE = os.environ.get('SITE', '/tmp/site-hl'); SUB = 'salon-demo'
BASE = f'http://127.0.0.1:{PORT}/{SUB}/'
GLASS = os.environ.get('THEME') == 'glass'; THEME = 'glass' if GLASS else 'klassisch'
SHOTS = os.environ.get('SHOTS')
HINT = 'Die Dauer wird je nach Haarlänge berechnet, damit wir genug Zeit für Sie einplanen.'
results, errors = [], []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('  ✓ ' if cond else '  ✗ ') + name + ((' – ' + str(detail)) if detail != '' else ''), flush=True)

def attach(page, label):
    page.on('console', lambda m: errors.append(f'[{label}] console.{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'[{label}] pageerror: {e}'))
    page.on('response', lambda r: errors.append(f'[{label}] HTTP {r.status}: {r.url}') if r.url.startswith(BASE) and r.status >= 400 else None)

def shot(page, name, full=False):
    if not SHOTS: return
    page.evaluate("document.querySelectorAll('.toast').forEach(t => t.remove())"); page.wait_for_timeout(250)
    page.screenshot(path=os.path.join(SHOTS, name), full_page=full)

def no_overflow(page, label):
    w = page.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
    check(f'kein horizontales Überlaufen ({label})', w[0] <= w[1], w)

def serve():
    shutil.rmtree(SITE, ignore_errors=True)
    shutil.copytree(ROOT, os.path.join(SITE, SUB), ignore=shutil.ignore_patterns('screens', 'tests', 'tools', '*.zip', '__pycache__'))
    p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', SITE, '-b', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: socket.create_connection(('127.0.0.1', PORT), 0.2).close(); break
        except OSError: time.sleep(0.1)
    return p

def go_book(page):
    page.goto(BASE + '#buchen'); page.wait_for_selector('#v-buchen.active')
    for _ in range(6):
        if page.locator('#v-buchen [data-service]').count(): return
        if page.locator('#v-buchen [data-restart]').count(): page.click('#v-buchen [data-restart]')
        else: page.click('#v-buchen .b-back')
        page.wait_for_timeout(60)

def bridge(page): return page.evaluate("JSON.parse(localStorage.getItem('dg-bridge-v1') || 'null')")

def book_flow(page, sid, length, staff='giovanni', name='Petra Schulz', phone='0171 2345678', far=3):
    go_book(page); page.click(f'[data-service="{sid}"]')
    if length: page.wait_for_selector('[data-length]'); page.click(f'[data-length="{length}"]')
    page.wait_for_selector(f'[data-staff="{staff}"]'); page.click(f'[data-staff="{staff}"]'); page.wait_for_selector('.days')
    days = page.evaluate("[...document.querySelectorAll('.day:not([disabled])')].map(b => b.dataset.day)")
    day = ([d for d in days if d >= (dt.date.today() + dt.timedelta(days=far)).isoformat()] or days)[0]
    page.click(f'[data-day="{day}"]'); page.wait_for_selector('#v-buchen .time')
    page.locator('#v-buchen .time').first.click(); page.click('#time-next')
    page.fill('#b-name', name); page.fill('#b-phone', phone)
    return day

def main():
    srv = serve()
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(args=['--lang=de-DE'])
            ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='de-DE', timezone_id='Europe/Berlin', accept_downloads=True)
            if GLASS: ctx.add_init_script("try { localStorage.setItem('dg-kunden-design', 'glass'); } catch (e) {}")
            page = ctx.new_page(); attach(page, 'main')
            page.goto(BASE); page.evaluate('localStorage.clear()'); page.reload(); page.wait_for_selector('.hero')
            print(f'\n== Kunden-App: Haarlänge & Terminwunsch ({THEME}) ==')
            check('Design ' + THEME, page.evaluate("document.documentElement.getAttribute('data-theme')") == ('glass' if GLASS else None))
            sw = page.evaluate("fetch('sw.js').then(r => r.text()).then(t => /VERSION = 'v8'/.test(t))")
            check('Service Worker VERSION v8', sw)

            # Leistungen: Spannen
            page.goto(BASE + '#leistungen'); page.wait_for_selector('#v-leistungen.active .price-row')
            lt = page.inner_text('#v-leistungen')
            check('Leistungen: Dauer je Haarlänge als Spanne + Hinweis', 'ca. 30–45 Min.' in lt and 'ca. 45 Min. – 1,5 Std.' in lt and 'ca. 15 Min.' in lt and page.locator('#v-leistungen .len-note').count() >= 1)
            check('Herrenschnitt bleibt 27 €', '27' in page.inner_text('#v-leistungen'))

            # Leistung + Hinweis
            go_book(page)
            check('Hinweis an der Leistungsauswahl (exakter Text)', page.inner_text('#len-hint').strip() == HINT, page.inner_text('#len-hint'))
            check('Modus-Hinweis „Anfrage“ (Standard aus Konfiguration)', page.get_attribute('#v-buchen .mode-note', 'data-mode') == 'anfrage' and page.evaluate("[SB.mode(), SB.modeSource()]")[0] == 'anfrage')
            check('Keine Haarlänge bei Bart / Maschine / Kinder bis 6', page.evaluate("['h-bart', 'h-maschine', 'k-bis6'].every(id => !SB.hasLengths(SB.service(id))) && ['d-schnitt', 'h-schnitt', 'f-straehnen'].every(id => SB.hasLengths(SB.service(id)))"))
            shot(page, f'kunde-leistung-hinweis-{THEME}.png')
            page.click('[data-service="h-bart"]'); page.wait_for_selector('[data-staff]')
            check('Bart → direkt Mitarbeiter-Auswahl (kein Haarlängen-Schritt)', page.locator('[data-length]').count() == 0)
            go_book(page); page.click('[data-service="d-schnitt"]'); page.wait_for_selector('[data-length]')
            durs = page.eval_on_selector_all('[data-length] .len-dur', 'els => els.map(e => +e.dataset.dur)')
            check('Damen: Haarlänge kurz/mittel/lang = 45/60/90 Min. + Hinweis', durs == [45, 60, 90] and HINT in page.inner_text('#v-buchen'), durs)
            no_overflow(page, 'haarlaenge'); shot(page, f'kunde-haarlaenge-{THEME}.png')

            # Slot-Raster lang vs. kurz (gleicher Tag, gleiche Mitarbeiterin)
            def times_for(length, day=None):
                go_book(page); page.click('[data-service="d-schnitt"]'); page.click(f'[data-length="{length}"]'); page.click('[data-staff="giovanni"]'); page.wait_for_selector('.days')
                if day: page.click(f'[data-day="{day}"]')
                page.wait_for_selector('#v-buchen .time')
                return page.evaluate("SalonApp.B ? SalonApp.B.date : document.querySelector('.day.sel').dataset.day"), page.eval_on_selector_all('#v-buchen .time', 'els => els.map(e => +e.dataset.time)')
            day, tk = times_for('kurz')
            for i in range(6):
                if page.evaluate(f"(() => {{ const s = SB.seed(SB.load()), l = SB.freeSlots(s, '{day}', 'd-schnitt', 'giovanni', null, {{length: 'lang'}}).length; return l > 0 && l < SB.freeSlots(s, '{day}', 'd-schnitt', 'giovanni', null, {{length: 'kurz'}}).length; }})()"): break
                day = page.evaluate(f"[...document.querySelectorAll('.day:not([disabled])')].map(b => b.dataset.day).filter(d => d > '{day}')[0]")
                page.click(f'[data-day="{day}"]'); page.wait_for_selector('#v-buchen .time')
                tk = page.eval_on_selector_all('#v-buchen .time', 'els => els.map(e => +e.dataset.time)')
            shot(page, f'kunde-slots-kurz-{THEME}.png', True)
            _, tl = times_for('lang', day)
            check('Hinweis „nur Zeiten, in die der ganze Termin passt“', '1,5 Std.' in page.inner_text('#fit-note') or '90' in page.inner_text('#fit-note'), page.inner_text('#fit-note'))
            shot(page, f'kunde-slots-lang-{THEME}.png', True)
            v = page.evaluate("""([day, tl, tk]) => { const st = SB.seed(SB.load()), iv = SB.intervals(day);
                const bk = st.bookings.filter(b => b.staffId === 'giovanni' && b.date === day && b.status !== 'cancelled');
                const fits = (t, d) => iv.some(i => t >= i[0] && t + d <= i[1]) && !bk.some(b => b.start < t + d && t < b.start + b.duration);
                return {langOk: tl.every(t => fits(t, 90)), kurzOk: tk.every(t => fits(t, 45)), subset: tl.every(t => tk.indexOf(t) >= 0), grid: tk.concat(tl).every(t => t % 30 === 0),
                  missing: tk.filter(t => tl.indexOf(t) < 0 && fits(t, 90)) }; }""", [day, tl, tk])
            check('Lang: weniger Startzeiten als kurz, alle Teil von kurz', len(tl) < len(tk) and v['subset'], {'Tag': day, 'kurz': len(tk), 'lang': len(tl)})
            check('Jede angezeigte Zeit: ganze Dauer frei (Öffnungszeit + Termine), keine passende fehlt', v['langOk'] and v['kurzOk'] and not v['missing'], v)
            check('Raster :00/:30 für ≥ 30 Min.', v['grid'])

            # Terminwunsch senden
            day1 = book_flow(page, 'd-schnitt', 'lang')
            check('Angaben: Haarlänge + „Wunschtermin“ + Erklärung, Knopf „Terminwunsch senden“', 'Lang' in page.inner_text('#v-buchen') and page.locator('#req-explain').count() == 1 and page.inner_text('#book-now').strip() == 'Terminwunsch senden')
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            check('Bestätigungsseite: „Terminwunsch gesendet“ + Status „Angefragt“', 'Terminwunsch gesendet' in page.inner_text('#v-buchen h1') and page.locator('#v-buchen .req-badge[data-req="angefragt"]').count() >= 1)
            check('Erinnerungen erst nach Bestätigung (keine geplanten Zeiten, kein .ics)', page.locator('#v-buchen [data-rem-wait]').count() == 1 and page.locator('#v-buchen .rem-item').count() == 0 and page.locator('#v-buchen [data-ics]').count() == 0)
            check('Keine WhatsApp/SMS-Links an den Salon', page.locator('a[href^="https://wa.me"], a[href^="sms:"], a[href*="whatsapp"]').count() == 0)
            b = bridge(page); r = [x for x in b['requests'] if x['origin'] == 'kunden-app'][-1]
            check('Anfrage im gemeinsamen Speicher: angefragt, d-schnitt, lang, 90 Min.', r['status'] == 'angefragt' and r['serviceId'] == 'd-schnitt' and r['length'] == 'lang' and r['duration'] == 90 and r['date'] == day1, {k: r[k] for k in ('status', 'length', 'duration', 'date', 'start', 'staffId')})
            check('Demo-Knopf „Demo: Salon bestätigt“ sichtbar', 'Demo: Salon bestätigt' in page.inner_text('#v-buchen [data-demo-confirm]'))
            no_overflow(page, 'angefragt'); page.evaluate("window.scrollTo(0, 0)"); shot(page, f'kunde-anfrage-angefragt-{THEME}.png')
            page.goto(BASE + '#termine'); page.wait_for_selector('.mine-item')
            check('Meine Termine: Status „angefragt“', page.get_attribute('.mine-item', 'data-status') == 'angefragt' and 'angefragt' in page.inner_text('.mine-item').lower())
            page.goto(BASE + '#buchen'); page.wait_for_selector('#v-buchen.active')
            if page.locator('#v-buchen [data-demo-confirm]').count() == 0:
                page.goto(BASE + '#termine'); page.wait_for_selector('.mine-item [data-demo-confirm]')
            page.click('[data-demo-confirm]'); page.wait_for_timeout(300)
            bid = r['id']
            st = page.evaluate(f"[SB.reqStatus(SB.get('{bid}')), SB.reminders(SB.get('{bid}')).length, JSON.parse(localStorage.getItem('dg-bridge-v1')).requests.find(x => x.id === '{bid}').status]")
            check('Demo bestätigt → Status bestätigt (Buchung + Speicher), Erinnerungen jetzt geplant', st[0] == 'bestaetigt' and st[1] == 2 and st[2] == 'bestaetigt', st)
            page.goto(BASE + '#termine'); page.wait_for_selector('.mine-item')
            check('Meine Termine: „bestätigt“, Kalender-Knopf, Erinnerungen', page.get_attribute('.mine-item', 'data-status') == 'bestaetigt' and page.locator('.mine-item [data-ics]').count() == 1 and page.locator('.mine-item .rem-item').count() == 2)
            page.evaluate("document.querySelector('.mine-item').scrollIntoView({block: 'start'}); window.scrollBy(0, -70)")
            shot(page, f'kunde-status-bestaetigt-{THEME}.png')

            # Verschieben (Vorschlag) → annehmen
            book_flow(page, 'h-schnitt', 'kurz', staff='marco', name='Max Muster', phone='0151 1234567', far=4)
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            b2 = [x for x in bridge(page)['requests'] if x['name'] == 'Max Muster'][-1]
            page.click('[data-demo-propose]'); page.wait_for_timeout(300)
            pr = page.evaluate(f"SB.get('{b2['id']}')")
            check('Demo: Salon schlägt andere Zeit vor → „verschoben“ + Vorschlag mit Annehmen/Ablehnen', pr['req'] == 'verschoben' and pr['proposal'] and page.locator('[data-accept]').count() >= 1 and 'Neuer Terminvorschlag' in page.inner_text('#v-buchen'))
            shot(page, f'kunde-status-verschoben-{THEME}.png', True)
            page.click(f'[data-accept="{b2["id"]}"]'); page.wait_for_timeout(300)
            ac = page.evaluate(f"(() => {{ const b = SB.get('{b2['id']}'), r = JSON.parse(localStorage.getItem('dg-bridge-v1')).requests.find(x => x.id === '{b2['id']}'); return {{req: b.req, date: b.date, start: b.start, rs: r.status, rd: r.date, rst: r.start, by: r.confirmedBy}}; }})()")
            check('Vorschlag angenommen → bestätigt mit neuer Zeit (auch im Speicher, „kunde“)', ac['req'] == 'bestaetigt' and ac['date'] == pr['proposal']['date'] and ac['start'] == pr['proposal']['start'] and ac['rs'] == 'bestaetigt' and ac['rd'] == ac['date'] and ac['by'] == 'kunde', ac)
            # Zurückziehen
            book_flow(page, 'h-bart', None, staff='marco', name='Rolf Rück', phone='0160 7654321', far=5)
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            b3 = [x for x in bridge(page)['requests'] if x['name'] == 'Rolf Rück'][-1]
            check('Leistung ohne Haarlänge: Dauer 15 Min., length leer', b3['length'] is None and b3['duration'] == 15)
            page.click('#v-buchen [data-cancel]'); page.click('[data-cancel-yes]'); page.wait_for_timeout(300)
            check('Terminwunsch zurückziehen → Speicher „storniert“ (kunde)', [x for x in bridge(page)['requests'] if x['id'] == b3['id']][0]['status'] == 'storniert')

            # Salon bestätigt (Team-Kalender im selben Browser, anderer Tab) → Live-Update
            book_flow(page, 'd-foehnen', 'mittel', staff='jenny', name='Tina Tab', phone='0170 1112233', far=6)
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            b4 = [x for x in bridge(page)['requests'] if x['name'] == 'Tina Tab'][-1]
            t2 = ctx.new_page(); t2.goto(BASE + 'manifest.webmanifest')
            t2.evaluate(f"() => {{ const k = 'dg-bridge-v1', b = JSON.parse(localStorage.getItem(k)), r = b.requests.find(x => x.id === '{b4['id']}'); r.status = 'bestaetigt'; r.confirmedBy = 'salon'; r.confirmedAt = new Date().toISOString(); localStorage.setItem(k, JSON.stringify(b)); }}")
            page.bring_to_front(); page.wait_for_timeout(700)
            check('Bestätigung aus anderem Tab (storage-Event): „Termin bestätigt!“ + Hinweis', 'Termin bestätigt' in page.inner_text('#v-buchen h1') and page.locator('.toast:has-text("bestätigt")').count() >= 1, page.inner_text('#v-buchen h1'))
            t2.evaluate(f"() => {{ const k = 'dg-bridge-v1', b = JSON.parse(localStorage.getItem(k)), r = b.requests.find(x => x.id === '{b4['id']}'); r.status = 'storniert'; r.cancelledBy = 'salon'; localStorage.setItem(k, JSON.stringify(b)); }}")
            page.bring_to_front(); page.wait_for_timeout(700)
            check('Salon storniert → Buchung storniert', page.evaluate(f"SB.get('{b4['id']}') ? SB.get('{b4['id']}').status : 'weg'") in ('cancelled', 'weg'))
            t2.close()

            # Modus & Dauern aus dem Team-Kalender (gemeinsamer Speicher)
            # (Schreiben in einem zweiten Tab wie der Team-Kalender → storage-Event in der Kunden-App)
            t3 = ctx.new_page(); t3.goto(BASE + 'manifest.webmanifest')
            t3.evaluate("() => { const k = 'dg-bridge-v1', b = JSON.parse(localStorage.getItem(k)); b.mode = 'sofort'; b.durations = {'h-schnitt': {duration: 30, lengths: {kurz: 30, mittel: 45, lang: 60}}}; localStorage.setItem(k, JSON.stringify(b)); }")
            t3.close(); page.bring_to_front(); page.wait_for_timeout(400)
            go_book(page)
            check('Modus „Sofortbuchung“ aus Team-Einstellung', page.get_attribute('#v-buchen .mode-note', 'data-mode') == 'sofort' and page.evaluate("SB.modeSource()") != 'config', page.evaluate("SB.modeSource()"))
            page.click('[data-service="h-schnitt"]'); page.wait_for_selector('[data-length]')
            durs2 = page.eval_on_selector_all('[data-length] .len-dur', 'els => els.map(e => +e.dataset.dur)')
            check('Dauer-Änderung des Inhabers übernommen (Herren 30/45/60)', durs2 == [30, 45, 60], durs2)
            book_flow(page, 'h-schnitt', 'lang', staff='marco', name='Sven Sofort', phone='0171 9998887', far=3)
            check('Sofortbuchung: Knopf „Verbindlich buchen“', page.inner_text('#book-now').strip() == 'Verbindlich buchen')
            page.click('#book-now'); page.wait_for_selector('#confirm-summary')
            b5 = [x for x in bridge(page)['requests'] if x['name'] == 'Sven Sofort'][-1]
            check('Sofortbuchung: „Termin gebucht!“, sofort bestätigt, Erinnerungen geplant, Dauer 60', 'Termin gebucht' in page.inner_text('#v-buchen h1') and b5['status'] == 'bestaetigt' and b5['confirmedBy'] == 'sofort' and b5['duration'] == 60 and page.locator('#v-buchen .rem-item').count() == 2)
            page.evaluate("() => { const k = 'dg-bridge-v1', b = JSON.parse(localStorage.getItem(k)); delete b.mode; delete b.durations; localStorage.setItem(k, JSON.stringify(b)); }")

            # Freie Zeiten aus dem Team-Kalender: nur innerhalb der Arbeitszeit ohne belegte Zeiten
            tav = page.evaluate("""() => { const k = 'dg-bridge-v1', b = JSON.parse(localStorage.getItem(k)), d = SB.addDays(SB.todayISO(), 7);
                const day = [0,1,2,3,4,5,6].map(i => SB.addDays(d, i)).find(x => SB.isOpenDay(x));
                b.teamAt = new Date().toISOString(); b.avail = {from: SB.todayISO(), days: {[day]: {giovanni: {win: [[600, 780]], busy: [[660, 720]]}}}, skills: {giovanni: 'all'}};
                localStorage.setItem(k, JSON.stringify(b));
                const s = SB.seed(SB.load()), f = l => SB.freeSlots(s, day, 'd-schnitt', null, null, {length: l}).map(x => x.start + ':' + x.staffIds.join('+'));
                const res = {kurz: f('kurz'), lang: f('lang'), other: SB.freeSlots(s, SB.addDays(day, 1), 'd-schnitt', null, null, {length: 'kurz'}).length, linked: SB.teamLinked()};
                delete b.teamAt; delete b.avail; localStorage.setItem(k, JSON.stringify(b));
                return res; }""")
            check('Team-Verfügbarkeit: kurz nur 10:00 + 12:00 (Termin 11–12 belegt, Ende 13:00), lang nichts', tav['kurz'] == ['600:giovanni', '720:giovanni'] and tav['lang'] == [] and tav['other'] == 0, tav)

            # Klassisch/Glas: Layout der neuen Elemente
            page.goto(BASE + '#termine'); page.wait_for_selector('#v-termine.active'); no_overflow(page, 'termine')
            ctx.close()
            p2 = br.new_page(viewport={'width': 360, 'height': 740}, is_mobile=True, has_touch=True, locale='de-DE'); attach(p2, '360')
            if GLASS: p2.add_init_script("try { localStorage.setItem('dg-kunden-design', 'glass'); } catch (e) {}")
            p2.goto(BASE + '#buchen'); p2.wait_for_selector('[data-service]'); p2.click('[data-service="f-straehnen"]'); p2.wait_for_selector('[data-length]'); no_overflow(p2, '360 haarlaenge')
            p2.close(); br.close()
    finally:
        srv.terminate()
    check('Keine Konsolenfehler / Seitenfehler / 404', not [e for e in errors if 'openstreetmap' not in e.lower()], errors[:6])
    ok = sum(1 for r in results if r[1])
    out = [f'Haarlänge/Anfrage{" (Glas)" if GLASS else ""} {time.strftime("%Y-%m-%d %H:%M")} – {ok}/{len(results)} bestanden'] + [('OK   ' if r[1] else 'FAIL ') + r[0] + (f' – {r[2]}' if r[2] != '' else '') for r in results]
    open(os.path.join(ROOT, 'tests', 'haarlaenge-ergebnis-glas.txt' if GLASS else 'haarlaenge-ergebnis.txt'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'\n{ok}/{len(results)} bestanden')
    sys.exit(0 if ok == len(results) else 1)

main()
