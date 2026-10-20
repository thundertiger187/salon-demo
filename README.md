# Haardesign Da Giovanni – Demo-Web-App (PWA)

Mobile-first Website/App für **Haardesign Da Giovanni, Bahnstraße 63, 40699 Erkrath** (Tel. 0211 241886).
Reine statische Dateien – kein Server, keine Datenbank, keine externen CDNs (nur die OpenStreetMap-Karte wird eingebettet).

**Inhalt:** Start (Termin buchen / Anrufen), Leistungen & Preise (*Beispielpreise*), Öffnungszeiten (heute hervorgehoben,
„Jetzt geöffnet/geschlossen“), Anfahrt & Kontakt (Anrufen, Google Maps, Facebook, OSM-Karte), Online-Buchung (Demo),
Meine Termine, Impressum/Datenschutz (Platzhalter). Funktioniert nach dem ersten Aufruf auch **offline** und lässt sich als App installieren.

> **Demo:** Buchungen werden nur im Browser des jeweiligen Geräts gespeichert (localStorage) – der Salon bekommt sie nicht.
> Einige Zeiten sind mit Beispielterminen belegt, damit die Slot-Auswahl realistisch aussieht.

## Daten anpassen – alles in `js/config.js`
| Was | Feld |
|---|---|
| Name, Kurzname, Monogramm, Texte | `name`, `shortName`, `monogram`, `claim`, `heroTitle`, `heroText` |
| Adresse, Telefon | `address`, `phone` (Anzeige), `phoneTel` (tel:-Link, international) |
| WhatsApp / E-Mail / Facebook | `whatsapp`, `email`, `facebook` – leerer Wert `''` blendet den Link aus |
| Karte | `map.lat` / `map.lon` (aktuell OSM-Objekt „Da Giovanni“), `mapsQuery` (Google-Maps-Suche) |
| Öffnungszeiten | `hours` (0 = So … 6 = Sa, mehrere Zeitfenster möglich), `closedDates` (Urlaub/Feiertage) |
| Hinweis „Zeiten vorläufig – bitte prüfen“ | `hoursProvisional: false` setzen, sobald die Zeiten bestätigt sind |
| Team | `stylists` (Name, Arbeitstage `days`) – aktuell Platzhalter `[Friseur:in 1/2]` |
| Leistungen & Preise | `services` (Kategorie, Dauer in Min., Preis, `from: true` = „ab“) und `priceNote` |
| Impressum | `owner`, `taxId` (+ Texte in `js/app.js` → `rLegal`) |
| Buchung | `booking.daysAhead` (14), `slotStep` (15 Min.), `leadMinutes` (60), `seedDemoBookings` |

**Zusätzlich (statische Dateien, können config.js nicht lesen):**
- `manifest.webmanifest`: `name`, `short_name`
- `index.html`: `<title>`, `apple-mobile-web-app-title` (Rest wird zur Laufzeit aus config.js gesetzt)
- Icons neu erzeugen: Monogramm in `tools/make_icons.py` (`MONO = 'DG'`) ändern → `python3 tools/make_icons.py` (Pillow)
- **Nach jeder Änderung** in `sw.js` die `VERSION` erhöhen (z. B. `'v2'`), sonst zeigen installierte Apps die alte Fassung aus dem Cache.

## Veröffentlichen (beliebiger statischer HTTPS-Host)
Alle Pfade sind relativ – läuft auch in einem Unterordner (z. B. `https://name.github.io/salon-demo/`).
- **GitHub Pages:** Repository anlegen, Inhalt dieses Ordners hochladen, *Settings → Pages → Branch main / root*.
- **Netlify / Cloudflare Pages:** Ordner per Drag & Drop hochladen (kein Build-Befehl).
- HTTPS ist Pflicht für Service Worker und Installation (lokal geht `http://localhost`).
- Lokal testen: `python3 -m http.server 8000` → http://localhost:8000/

## App installieren
**Android (Chrome):** Seite öffnen → in der App auf **„App installieren“** tippen *oder* Menü **⋮** → **„App installieren“**
bzw. **„Zum Startbildschirm hinzufügen“** → **Installieren**. Die App erscheint mit „DG“-Symbol auf dem Startbildschirm.

**iPhone/iPad (Safari):** Seite in **Safari** öffnen → unten **Teilen** (Quadrat mit Pfeil) → nach unten scrollen →
**„Zum Home-Bildschirm“** → oben rechts **„Hinzufügen“**. (Der Button „App installieren“ in der App zeigt diese Anleitung an.)

## Tests
`python3 tests/e2e.py` – Playwright/Chromium, 390×844 mobil, unter Unterpfad `/salon-demo/` (Ergebnis: `tests/e2e-ergebnis.txt`, Screenshots in `screens/`).
`python3 tests/e2e_webkit.py` – iPhone-14-Emulation mit WebKit (Ergebnis: `tests/e2e-webkit-ergebnis.txt`).
Lighthouse (mobil): Performance 98, Barrierefreiheit 100, Best Practices 100, SEO 100 – `tests/lighthouse-report.html`.
(Lighthouse 12 hat keine PWA-Kategorie mehr; Installierbarkeit wird im E2E-Test über Chrome `Page.getInstallabilityErrors` geprüft → keine Fehler.)

## Grenzen der Demo
- Buchungen sind nur lokal; für echten Betrieb ist ein Buchungs-Backend nötig (Salon-Kalender, Bestätigung per SMS/E-Mail).
- Öffnungs-Schlusszeiten und Samstag sind Platzhalter; Preise sind Beispielpreise; Teamnamen sind Platzhalter.
- Die OSM-Karte braucht Internet (offline erscheint ein Hinweis). Impressum/Datenschutz müssen vor Livegang ausgefüllt werden.
