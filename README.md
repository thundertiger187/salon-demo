# Haardesign Da Giovanni – Demo-Web-App (PWA)

Mobile-first Website/App für **Haardesign Da Giovanni, Bahnstraße 63, 40699 Erkrath** (Tel. 0211 241886).
Reine statische Dateien – kein Server, keine Datenbank, keine externen CDNs (nur die OpenStreetMap-Karte wird eingebettet).

**Inhalt:** Start (Termin buchen / Anrufen), Leistungen & Preise (*Beispielpreise*), Öffnungszeiten (heute hervorgehoben,
„Jetzt geöffnet/geschlossen“), Anfahrt & Kontakt (Anrufen, Google Maps, Facebook, OSM-Karte), Online-Buchung (Demo),
Meine Termine, **Terminerinnerungen per WhatsApp/SMS (Demo)**, Impressum/Datenschutz (Platzhalter). Funktioniert nach dem ersten Aufruf auch **offline** und lässt sich als App installieren.

> **Demo:** Buchungen werden im Browser gespeichert (localStorage). Mit dem Team-Kalender werden sie **nur im selben Browser auf demselben Gerät** abgeglichen (gleicher Ursprung `thundertiger187.github.io`, Schlüssel `dg-bridge-v1`) – kein Server. Auf einem anderen Handy kommt nichts im Salon an.

## Haarlänge & Terminwunsch (ab v8)

- **Dauer nach Haarlänge:** Nach der Leistung wählt die Kundin *Kurz / Mittel / Lang* (nicht bei Bart, Maschinenschnitt, Kinder bis 6).
  Hinweis: „Die Dauer wird je nach Haarlänge berechnet, damit wir genug Zeit für Sie einplanen.“ Es werden nur Startzeiten gezeigt,
  in die die **ganze** Dauer passt (Raster :00/:30 ab 30 Min., Viertelstunden bei 15-Min.-Leistungen). Preise bleiben pro Leistung („ab“).
- **Standard-Dauern** (Min., kurz/mittel/lang): Damenhaarschnitt 45/60/90 · Waschen & Föhnen 30/45/60 · Spitzen 30/30/45 · Herrenschnitt 30/30/45 ·
  Kinder bis 12 30/30/45 · Ansatzfarbe 90/105/120 · Komplettfarbe 120/135/150 · Strähnen 150/180/210 · Hochsteckfrisur 45/60/90 · Pflegekur 15/15/30.
  Ändert der Inhaber die Dauern im Team-Kalender, übernimmt die Kunden-App sie (gleicher Browser).
- **Anfrage-Modus (Standard):** „Terminwunsch senden“ → Status *angefragt*; der Salon bestätigt oder schlägt eine andere Zeit vor (*verschoben*, Kundin nimmt an oder lehnt ab).
  Erinnerungen + Kalender-Datei erst nach Bestätigung. Demo-Knöpfe „Demo: Salon bestätigt“ / „Demo: anderer Termin“. Keine Übermittlung per WhatsApp/SMS.
- **Sofortbuchung:** schaltet der Inhaber im Team-Kalender um; dann wie bisher „Termin gebucht!“. Ohne Team-Daten gilt `bookingMode` aus `js/config.js` (Standard `anfrage`).
- Tests: `PORT=8766 python3 tests/haarlaenge.py` (auch `THEME=glass`).
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
| Buchung | `booking.daysAhead` (14), `leadMinutes` (60), `seedDemoBookings` |
| Terminerinnerungen | `reminders.defaultChannel` (`'whatsapp'` \| `'sms'` \| `'none'`), `reminders.smsSender` (SMS-Absender, max. 11 Zeichen) |
| Startzeiten-Raster | pro Leistung `step` (optional). Standard: Dauer ≤ 15 Min. → alle 15 Min.; ≥ 30 Min. → nur :00/:30. Letzte Startzeit = Leistung endet spätestens bei Ladenschluss. Demo-Termine liegen im selben Raster. |

**Zusätzlich (statische Dateien, können config.js nicht lesen):**
- `manifest.webmanifest`: `name`, `short_name`
- `index.html`: `<title>`, `apple-mobile-web-app-title` (Rest wird zur Laufzeit aus config.js gesetzt)
- Icons neu erzeugen: Monogramm in `tools/make_icons.py` (`MONO = 'DG'`) ändern → `python3 tools/make_icons.py` (Pillow)
- **Nach jeder Änderung** in `sw.js` die `VERSION` erhöhen (z. B. `'v2'`), sonst zeigen installierte Apps die alte Fassung aus dem Cache.

## Terminerinnerungen per WhatsApp / SMS (Demo, ab v5)
Die Kundin bekommt vom Salon **automatisch zwei Erinnerungen**: **2 Tage vorher** (gleiche Uhrzeit) und **2 Stunden vorher**.
Die Kundin selbst schickt nichts an den Salon.
- **Buchungsformular:** Auswahl *WhatsApp* (vorausgewählt), *SMS* oder *Keine* + Einwilligungszeile
  („Ich möchte Terminerinnerungen per WhatsApp erhalten – 2 Tage und 2 Stunden vorher, an die oben angegebene Nummer. Jederzeit abbestellbar.“).
  Bei einer deutschen Festnetznummer erscheint der Hinweis, dass WhatsApp/SMS nur auf Handynummern ankommen (blockiert nicht).
- **Bestätigung & „Meine Termine“:** „Erinnerungen geplant“ mit Kanal-Symbol und den exakten Zeitpunkten,
  z. B. „Mo, 19.10. um 10:30 Uhr – 2 Tage vorher“ / „Mi, 21.10. um 08:30 Uhr – 2 Stunden vorher“.
  Status je Erinnerung: **geplant**, **verschickt** (Zeitpunkt erreicht) oder **entfällt** (lag bei der Buchung schon in der
  Vergangenheit, z. B. Termin für morgen → 2-Tage-Erinnerung entfällt; durchgestrichen + „Termin kurzfristig gebucht“).
  „2 Tage vorher“ rechnet in Kalendertagen (Zeitumstellung ändert die Uhrzeit nicht).
- **„Vorschau ansehen“:** Handy-Ansicht mit beiden Nachrichten – WhatsApp-Chat (grüner Kopf „Haardesign Da Giovanni“, Blasen mit Uhrzeit
  und Häkchen) bzw. SMS-Verlauf (Absender „Da Giovanni“, graue Blasen). Der Link in der Nachricht führt zu „Meine Termine“.
- **„Demo: Erinnerung jetzt zeigen“:** Sperrbildschirm mit eingleitender Mitteilung (nächste geplante Erinnerung); Antippen öffnet den Chat.
- Texte: *„Hallo {Vorname}, kleine Erinnerung: Ihr Termin bei Haardesign Da Giovanni ist am {Wochentag, TT.MM.} um {HH:MM} Uhr
  ({Leistung} bei {Mitarbeiter}). Absagen oder verschieben bis 24 Std. vorher: {Link zu Meine Termine}. Bis bald!“* und
  *„Hallo {Vorname}, in 2 Stunden um {HH:MM} Uhr sehen wir uns bei Haardesign Da Giovanni, Bahnstraße 63, Erkrath. Bis gleich!“*
  (in `js/app.js` → `remTexts`). Kanal + Zeitpunkte: `js/booking.js` → `reminders()`; gespeichert wird `reminder` am Termin.
- In der App steht dezent: *„Demo – im echten Betrieb verschickt der Salon-Server die Nachrichten automatisch“*.

> **Für den echten Versand** braucht es einen **Server** (Buchungen zentral speichern, Zeitplan/Cron für die Versandzeitpunkte)
> plus einen Versanddienst: **WhatsApp Business Platform (Cloud API)** – Business-Konto, verifizierte Nummer, von Meta freigegebene
> *Nachrichtenvorlagen* (Kategorie „Utility“), kostenpflichtig pro Nachricht, ggf. über einen Anbieter wie Twilio/360dialog –
> bzw. ein **SMS-Gateway** (z. B. Twilio, sipgate, LINK Mobility, seven.io). Zugangsschlüssel gehören auf den Server, nie ins Frontend.
> Rechtlich: ausdrückliche Einwilligung (Opt-in) dokumentieren, Abmeldung ermöglichen, Datenschutzerklärung + AV-Vertrag mit dem Anbieter.
> Für ein sauberes Opt-in sollte die Kundin den Kanal aktiv wählen; die WhatsApp-Vorauswahl ist eine Demo-Vorgabe (`reminders.defaultChannel`).

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

## Design „Klassisch“ / „Glas“ (ab v7)
Zwei umschaltbare Designs, eine Codebasis. **Klassisch** (Standard) = bisheriges Design (Sand/Terrakotta).
**Glas** = hell & ruhig im Stil moderner Salon-Websites (warmes Off-White, Greige, Tinte, große leichte Fraunces-Serife mit kursiver Betonung,
feine Linien, viel Weißraum) plus „Liquid Glass“ wie iOS 26: Kopfzeile, schwebende Navigation, Buchungsleiste und Dialoge aus Milchglas
(`backdrop-filter: blur() saturate()` inkl. `-webkit-`), Karten halbtransparent mit heller Innenkante (ohne Blur – schont Handys).
- Umschalter: Fußzeile jeder Seite → **„Design: Klassisch | Glas“**. Gespeichert pro Gerät (`localStorage` `dg-kunden-design`).
- Dateien: `js/theme.js` (lädt im `<head>`, setzt `<html data-theme="glass">`, kein Aufblitzen), `css/theme-glass.css` (alle Regeln unter `html[data-theme="glass"]`),
  `assets/fonts/fraunces-italic-latin.woff2` (Kursiv-Schnitt, Teilmenge, OFL).
- Ohne `backdrop-filter` (sehr alte Browser) bzw. bei „Transparenz reduzieren“: fast deckende Flächen, gleiches Layout.
- Tests im Glas-Design: `THEME=glass python3 tests/e2e.py` · `THEME=glass python3 tests/e2e_webkit.py`

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
  Erinnerungen: Kanalwahl + Einwilligung, exakte Zeitpunkte/Status (inkl. „entfällt“ bei kurzfristiger Buchung, „verschickt“, Zeitumstellung),
  Vorschau-Texte WhatsApp/SMS, Sperrbildschirm-Demo, Esc/Fokus. Screenshots: `screens/bestaetigung-erinnerung.png`,
  `erinnerung-whatsapp-vorschau.png`, `erinnerung-sms-vorschau.png`, `erinnerung-sperrbildschirm.png`, `meine-termine-erinnerung.png`, `ios-erinnerung-vorschau.png`.
`python3 tests/e2e_webkit.py` – iPhone-14-Emulation mit WebKit (Ergebnis: `tests/e2e-webkit-ergebnis.txt`).
Lighthouse (mobil): Performance 98, Barrierefreiheit 100, Best Practices 100, SEO 100 – `tests/lighthouse-report.html`.
(Lighthouse 12 hat keine PWA-Kategorie mehr; Installierbarkeit wird im E2E-Test über Chrome `Page.getInstallabilityErrors` geprüft → keine Fehler.)

## Grenzen der Demo
- Buchungen/Anfragen sind nur lokal (Abgleich mit dem Team-Kalender nur im selben Browser); für echten Betrieb ist ein Buchungs-Backend nötig.
- Terminerinnerungen werden nur geplant und als Vorschau gezeigt – **nicht verschickt** (siehe oben: Server + WhatsApp Business API / SMS-Anbieter).
- Öffnungs-Schlusszeiten und Samstag sind Platzhalter; Preise sind Beispielpreise; Teamnamen sind Platzhalter.
- Die OSM-Karte braucht Internet (offline erscheint ein Hinweis). Impressum/Datenschutz müssen vor Livegang ausgefüllt werden.
