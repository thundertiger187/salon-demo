/* =====================================================================
   SALON-KONFIGURATION – alle Salondaten & Platzhalter stehen NUR hier.
   Werte in eckigen Klammern / mit PLATZHALTER / VORLÄUFIG markiert ersetzen.
   Hinweis: Den App-Namen zusätzlich in manifest.webmanifest anpassen
   (statische Datei, kann diese Konfiguration nicht lesen) – siehe README.
   ===================================================================== */
window.SALON_CONFIG = {
  name: 'Haardesign Da Giovanni',
  shortName: 'Da Giovanni',          // Name unter dem App-Symbol
  monogram: 'DG',
  claim: 'Ihr Friseur in Erkrath',      // Unterzeile im Kopf
  heroTitle: 'Schöne Haare, <em>ganz entspannt.</em>',
  heroText: 'Schnitt, Farbe und Styling für Damen, Herren und Kinder – mitten in Erkrath. Termin jetzt auch online buchen, rund um die Uhr.',

  address: {
    street: 'Bahnstraße 63',
    zip: '40699',
    city: 'Erkrath'
  },
  phone: '0211 241886',                 // Anzeige
  phoneTel: '+49211241886',             // für tel:-Links
  whatsapp: '',                         // WhatsApp-Nummer unbekannt → Link ausgeblendet (z. B. '+49211241886' eintragen)
  facebook: 'https://www.facebook.com/HaardesignDaGiovanni/',
  email: '',                            // PLATZHALTER E-Mail (leer = ausgeblendet)
  owner: '[Inhaber:in Vor- und Nachname]', // PLATZHALTER für Impressum
  taxId: '[USt-IdNr.]',                 // PLATZHALTER für Impressum

  // Karte: Koordinaten per Nominatim (OSM-Objekt "Da Giovanni", shop=hairdresser, Bahnstraße 63).
  // Fallback Erkrath-Zentrum: 51.2224 / 6.9080
  map: { lat: 51.2219329, lon: 6.9126149, zoomDelta: 0.006 },
  // Suchbegriff für "In Google Maps öffnen" (wird automatisch aus Name + Adresse gebildet, wenn leer)
  mapsQuery: 'Haardesign Da Giovanni, Bahnstraße 63, 40699 Erkrath',
  mapsPlaceId: 'ChIJnxzAeNTNuEcRSB6MdPd67FY', // ergänzt den Google-Maps-Link um query_place_id

  // Google-Bewertungen. Place ID aus Google Maps ermittelt (ohne API-Schlüssel) und geprüft:
  // ChIJ… dekodiert zur Maps-Feature-ID 0x47b8cdd478c01c9f:0x56ec7af7748c1e48 = „Haardesign Da Giovanni“, Bahnstraße 63.
  // rating/count sind ein STAND (manuell pflegen) – keine Live-Daten.
  reviews: {
    placeId: 'ChIJnxzAeNTNuEcRSB6MdPd67FY',
    writeUrl: 'https://search.google.com/local/writereview?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY',
    readUrl: 'https://search.google.com/local/reviews?placeid=ChIJnxzAeNTNuEcRSB6MdPd67FY',
    rating: 4.9,
    count: 97,
    asOf: 'Oktober 2026'          // Stand der Angaben (Google Maps, 20.10.2026)
  },

  // Öffnungszeiten laut Google-/Branchenbucheinträgen (Stand 20.10.2026).
  // 0 = Sonntag … 6 = Samstag. [] = geschlossen. Mehrere Fenster möglich: [['09:00','12:30'],['14:00','18:00']]
  hours: {
    0: [],
    1: [],
    2: [['09:00', '18:00']],
    3: [['09:00', '18:00']],
    4: [['09:00', '18:00']],
    5: [['09:00', '20:00']],
    6: [['08:30', '13:00']]
  },
  hoursProvisional: false,               // zeigt „Zeiten vorläufig – bitte prüfen“ (auf false setzen, wenn bestätigt)
  closedDates: [],                      // z. B. ['2026-12-24','2026-12-31'] – Feiertage/Urlaub (JJJJ-MM-TT)

  // Team. role = optionale Unterzeile (leer = keine), days = Arbeitstage (0–6); fehlt = alle Öffnungstage.
  // Arbeitstage der einzelnen Mitarbeiter:innen sind noch unbekannt → alle arbeiten an allen Öffnungstagen.
  stylists: [
    { id: 'giovanni', name: 'Giovanni', role: '', color: '#9C4A30' },
    { id: 'marco', name: 'Marco', role: '', color: '#4D6385' },
    { id: 'jenny', name: 'Jenny', role: '', color: '#3F7A55' },
    { id: 'julia', name: 'Julia', role: '', color: '#A86A12' },
    { id: 'anny', name: 'Anny', role: '', color: '#7A5A8C' }
  ],

  // Leistungen & Preise (BEISPIELPREISE). duration in Minuten (Vielfache von 15), from: true = "ab"-Preis.
  // Startzeiten-Raster pro Leistung: optional step (Minuten). Ohne step gilt:
  //   Dauer <= 15 Min. → alle 15 Min. (:00/:15/:30/:45) · Dauer >= 30 Min. → alle 30 Min. (nur :00/:30)
  // Beispiel für Abweichung: { …, duration: 60, step: 60 } → nur volle Stunden.
  priceNote: 'Beispielpreise – die tatsächlichen Preise erfahren Sie im Salon.',
  services: [
    { id: 'd-schnitt', cat: 'Damen', name: 'Waschen, Schneiden, Föhnen', duration: 60, price: 49, from: true },
    { id: 'd-foehnen', cat: 'Damen', name: 'Waschen & Föhnen / Styling', duration: 30, price: 29, from: true },
    { id: 'd-spitzen', cat: 'Damen', name: 'Spitzen schneiden', duration: 30, price: 25 },
    { id: 'h-schnitt', cat: 'Herren', name: 'Herrenschnitt inkl. Waschen', duration: 30, price: 27 },
    { id: 'h-maschine', cat: 'Herren', name: 'Maschinenschnitt', duration: 15, price: 16 },
    { id: 'h-bart', cat: 'Herren', name: 'Bart trimmen & konturieren', duration: 15, price: 12 },
    { id: 'k-bis6', cat: 'Kinder', name: 'Kinderschnitt bis 6 Jahre', duration: 15, price: 14 },
    { id: 'k-bis12', cat: 'Kinder', name: 'Kinderschnitt 7–12 Jahre', duration: 30, price: 19 },
    { id: 'f-ansatz', cat: 'Farbe', name: 'Ansatzfarbe inkl. Föhnen', duration: 90, price: 59, from: true },
    { id: 'f-komplett', cat: 'Farbe', name: 'Färben komplett inkl. Schnitt', duration: 120, price: 89, from: true },
    { id: 'f-straehnen', cat: 'Farbe', name: 'Strähnen / Balayage', duration: 180, price: 109, from: true },
    { id: 's-hochsteck', cat: 'Styling', name: 'Hochsteckfrisur', duration: 60, price: 45, from: true },
    { id: 's-pflege', cat: 'Styling', name: 'Pflegekur / Haarbehandlung', duration: 15, price: 12 }
  ],

  booking: {
    daysAhead: 14,        // buchbar für die nächsten 14 Tage
    // Startzeiten-Raster: pro Leistung (services[].step bzw. Standardregel oben), letzte Startzeit so, dass die Leistung bis Ladenschluss fertig ist
    leadMinutes: 60,      // frühestens 60 Min. ab jetzt
    seedDemoBookings: true // belegt in der Demo einige Zeiten mit Beispielterminen
  },
  // Terminerinnerungen an die Kundin (2 Tage + 2 Stunden vorher). In der Demo nur Planung + Vorschau –
  // der echte Versand braucht einen Server mit WhatsApp Business API bzw. SMS-Anbieter (siehe README).
  reminders: {
    defaultChannel: 'whatsapp',   // 'whatsapp' | 'sms' | 'none' – Vorauswahl im Buchungsformular
    smsSender: 'Da Giovanni'      // Absendername der SMS (max. 11 Zeichen)
  },
  storageKey: 'salon-erkrath-demo-v2'   // v2: neues Startzeiten-Raster → Demo-Termine werden neu erzeugt
};
