# Haardesign Da Giovanni – Demo-Web-App (PWA)

Mobile-first Website/App für **Haardesign Da Giovanni, Bahnstraße 63, 40699 Erkrath** (Tel. 0211 241886).
Reine statische Dateien – kein Server, keine Datenbank, keine externen CDNs (nur die OpenStreetMap-Karte wird eingebettet).

**Inhalt:** Start (Termin buchen / Anrufen), Leistungen & Preise (*Beispielpreise*), Öffnungszeiten (heute hervorgehoben,
„Jetzt geöffnet/geschlossen“), Anfahrt & Kontakt (Anrufen, Google Maps, Facebook, OSM-Karte), Online-Buchung (Demo),
Meine Termine, **Termin per WhatsApp / SMS an den Salon senden**, Impressum/Datenschutz (Platzhalter). Funktioniert nach dem ersten Aufruf auch **offline** und lässt sich als App installieren.

> **Demo:** Buchungen werden nur im Browser des jeweiligen Geräts gespeichert (localStorage) – der Salon bekommt sie nicht.
> Damit der Salon eine Buchung trotzdem erfährt, schickt die Kundin sie per **WhatsApp oder SMS** (vorausgefüllte Nachricht, siehe unten).
> Einige Zeiten sind mit Beispielterminen belegt, damit die Slot-Auswahl realistisch aussieht.

## Daten anpassen – alles in `js/config.js`
| Was | Feld |
|---|---|
| Name, Kurzname, Monogramm, Texte | `name`, `shortName`, `monogram`, `claim`, `heroTitle`, `heroText` |
| Adresse, Telefon | `address`, `phone` (Anzeige), `phoneTel` (tel:-Link, international) |
| WhatsApp / SMS (Termin senden) | `contact.whatsapp`, `contact.sms` – internationale Ziffern ohne `+`/`0` (z. B. `491712345678`); `''` blendet den jeweiligen Button aus. `contact.placeholder: true` = Nummer noch Platzhalter (siehe ⚠️ unten) |
| E-Mail / Facebook | `email`, `facebook` – leerer Wert `''` blendet den Link aus |
| Karte | `map.lat` / `map.lon` (aktuell OSM-Objekt „Da Giovanni“), `mapsQuery` (Google-Maps-Suche) |
| Öffnungszeiten | `hours` (0 = So … 6 = Sa, mehrere Zeitfenster möglich), `closedDates` (Urlaub/Feiertage) |
| Hinweis „Zeiten vorläufig – bitte prüfen“ | `hoursProvisional: false` setzen, sobald die Zeiten bestätigt sind |
| Team | `stylists` (Name, Arbeitstage `days`) – aktuell Platzhalter `[Friseur:in 1/2]` |
| Leistungen & Preise | `services` (Kategorie, Dauer in Min., Preis, `from: true` = „ab“) und `priceNote` |
| Impressum | `owner`, `taxId` (+ Texte in `js/app.js` → `rLegal`) |
| Buchung | `booking.daysAhead` (14), `leadMinutes` (60), `seedDemoBookings` |
| Startzeiten-Raster | pro Leistung `step` (optional). Standard: Dauer ≤ 15 Min. → alle 15 Min.; ≥ 30 Min. → nur :00/:30. Letzte Startzeit = Leistung endet spätestens bei Ladenschluss. Demo-Termine liegen im selben Raster. |

**Zusätzlich (statische Dateien, können config.js nicht lesen):**
- `manifest.webmanifest`: `name`, `short_name`
- `index.html`: `<title>`, `apple-mobile-web-app-title` (Rest wird zur Laufzeit aus config.js gesetzt)
- Icons neu erzeugen: Monogramm in `tools/make_icons.py` (`MONO = 'DG'`) ändern → `python3 tools/make_icons.py` (Pillow)
- **Nach jeder Änderung** in `sw.js` die `VERSION` erhöhen (z. B. `'v2'`), sonst zeigen installierte Apps die alte Fassung aus dem Cache.

## Termin per WhatsApp / SMS an den Salon (ab v4)
Die Demo hat keinen Server – eine Online-Buchung landet nur im Browser der Kundin. Deshalb gibt es auf der
**Bestätigungsseite** und in **„Meine Termine“** (für jeden kommenden Termin) zwei Buttons:
- **„Per WhatsApp an den Salon senden“** → `https://wa.me/<contact.whatsapp>?text=<Nachricht>` (öffnet WhatsApp bzw. WhatsApp Web)
- **„Per SMS senden“** → `sms:+<contact.sms>?&body=<Nachricht>` (die Variante `?&body=` funktioniert auf Android und iPhone)

Vorausgefüllte Nachricht (URL-kodiert mit `encodeURIComponent`):
```
Hallo Haardesign Da Giovanni, ich habe über die App einen Termin angefragt:
Leistung: Herrenschnitt inkl. Waschen
Bei: Giovanni            (bei „Egal – erste freie Zeit“: egal)
Datum: Mi, 21.10.2026
Uhrzeit: 14:00 Uhr
Name: Petra Schulz
Telefon: 0171 2345678
Hinweis: …               (nur wenn angegeben)
Bitte kurz bestätigen. Danke!
```
- Hinweis über den Buttons: *„Ihre Anfrage erreicht den Salon erst, wenn Sie die vorbereitete Nachricht abschicken – diese Demo hat keinen Server.“*
- Nach dem Antippen zeigt die App **„Anfrage gesendet“** (per WhatsApp/SMS, Uhrzeit) – gespeichert in localStorage am Termin (`sent.request`).
  Ob die Nachricht wirklich abgeschickt wurde, kann die App nicht wissen; die Buttons bleiben deshalb verfügbar.
- **Absage:** Nach dem Stornieren (in „Meine Termine“ oder auf der Bestätigungsseite) wird eine vorausgefüllte **Absage per WhatsApp/SMS**
  angeboten („… leider muss ich meinen Termin absagen: …“), Status „Absage gesendet“ (`sent.cancel`).
- Solange `contact.placeholder: true`, steht bei den Buttons „(Demo: Zielnummer ist noch ein Platzhalter.)“ und die Kontaktseite zeigt
  **keinen** WhatsApp-Eintrag. Mit echter Nummer `placeholder: false` setzen → Hinweis weg, WhatsApp erscheint auch unter „Kontakt“.

> ⚠️ **Platzhalter-Nummer:** `contact.whatsapp` und `contact.sms` enthalten aktuell `49211241886` – das ist die **Festnetznummer**
> des Salons (0211 241886). Festnetzanschlüsse können in der Regel **kein WhatsApp** und meist **keine SMS** empfangen.
> Vor dem Einsatz die echte WhatsApp-(Business-)/Handynummer des Salons eintragen (nur Ziffern, mit 49, ohne führende 0),
> `placeholder: false` setzen und in `sw.js` die `VERSION` erhöhen.

## Dauern & Raster (Stand v3)
| Leistung | Dauer | Startzeiten |
|---|---|---|
| Damen: Waschen, Schneiden, Föhnen | ca. 1 Std. | :00/:30 |
| Damen: Waschen & Föhnen / Styling · Spitzen schneiden | ca. 30 Min. | :00/:30 |
| Herren: Herrenschnitt inkl. Waschen | ca. 30 Min. | :00/:30 |
| Herren: Maschinenschnitt · Bart | ca. 15 Min. | alle 15 Min. |
| Kinder bis 6 J. / 7–12 J. | ca. 15 Min. / ca. 30 Min. | alle 15 Min. / :00/:30 |
| Ansatzfarbe inkl. Föhnen | ca. 1,5 Std. | :00/:30 |
| Färben komplett inkl. Schnitt | ca. 2 Std. | :00/:30 |
| Strähnen / Balayage | ca. 3 Std. | :00/:30 (Sa letzte Startzeit 10:00) |
| Hochsteckfrisur | ca. 1 Std. | :00/:30 |
| Pflegekur | ca. 15 Min. | alle 15 Min. |

## Google-Bewertungen
- Links in `js/config.js` → `reviews`: Place ID `ChIJnxzAeNTNuEcRSB6MdPd67FY` (aus Google Maps ermittelt, ohne API-Schlüssel;
  dekodiert zur Maps-ID `0x47b8cdd478c01c9f:0x56ec7af7748c1e48` des Eintrags „Haardesign Da Giovanni, Bahnstraße 63“).
  - Bewertung schreiben: `https://search.google.com/local/writereview?placeid=<ID>` (fragt ggf. nach Google-Anmeldung)
  - Alle Bewertungen: `https://search.google.com/local/reviews?placeid=<ID>`
  - Fehlt `writeUrl`, fällt die App auf die Google-Maps-Suche zurück (Button „Auf Google bewerten“).
- Sterne/Anzahl (`rating`, `count`, `asOf`) sind ein **fester Stand** (Google Maps am 20.10.2026: 4,9 ★, 97 Bewertungen) – gelegentlich von Hand aktualisieren.
- Es werden **keine Rezensionstexte** angezeigt. Echte Texte live einzubinden geht nur über die **Google Places API** (API-Schlüssel,
  Abrechnungskonto, max. 5 Rezensionen, Attributionspflicht; Schlüssel nicht im Frontend offenlegen → kleiner Server/Proxy nötig)
  oder über einen Widget-Dienst (z. B. Elfsight, Trustindex – externe Skripte/Cookies → Datenschutzerklärung anpassen). Nicht umgesetzt.
- Bewertungs-Bitte erscheint nach jeder Buchung und in „Meine Termine“ bei vergangenen Terminen – **für alle gleich** (kein Vorfiltern unzufriedener Kund:innen; das verstößt gegen Googles Richtlinien).
- Druckvorlagen: `qr-bewertung.png` (QR für Theke/Spiegel) und `bewertung-karte.pdf` (A6). Neu erzeugen: `python3 tools/make_review_card.py` (segno + Playwright).

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
  Prüft u. a. die WhatsApp-/SMS-Links: exakte `href` = Nummer + `encodeURIComponent(Text)`, dekodierter Text, „Anfrage/Absage gesendet“, Absage nach Storno.
  Screenshots: `screens/bestaetigung-whatsapp.png`, `bestaetigung-gesendet.png`, `meine-termine-whatsapp.png`, `meine-termine-absage.png`, `ios-bestaetigung-whatsapp.png`.
`python3 tests/e2e_webkit.py` – iPhone-14-Emulation mit WebKit (Ergebnis: `tests/e2e-webkit-ergebnis.txt`).
Lighthouse (mobil): Performance 98, Barrierefreiheit 100, Best Practices 100, SEO 100 – `tests/lighthouse-report.html`.
(Lighthouse 12 hat keine PWA-Kategorie mehr; Installierbarkeit wird im E2E-Test über Chrome `Page.getInstallabilityErrors` geprüft → keine Fehler.)

## Grenzen der Demo
- Buchungen sind nur lokal (Übermittlung an den Salon nur per WhatsApp/SMS durch die Kundin); für echten Betrieb ist ein Buchungs-Backend nötig (Salon-Kalender, Bestätigung per SMS/E-Mail).
- Öffnungs-Schlusszeiten und Samstag sind Platzhalter; Preise sind Beispielpreise; Teamnamen sind Platzhalter.
- Die OSM-Karte braucht Internet (offline erscheint ein Hinweis). Impressum/Datenschutz müssen vor Livegang ausgefüllt werden.
