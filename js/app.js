/* =====================================================================
   Salon-PWA – Ansichten, Navigation, Buchungsdialog, Installation, SW
   ===================================================================== */
(function () {
  'use strict';
  var C = window.SALON_CONFIG, S = window.SB;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(p, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>'; }
  var I = {
    chev: ic('<path d="M9 6l6 6-6 6"/>'), back: ic('<path d="M15 6l-6 6 6 6"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    phone: ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    pin: ic('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>'),
    cal: ic('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>'),
    fb: ic('<path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.5H8V14h2.5v6.5H14V14h2.5l.5-3.5h-3V8.5A.5.5 0 0 1 14 8z"/>'),
    mail: ic('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
    wa: ic('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 2.5 4.6 5.5 5.3l1.2-1.4-1.8-1-1 .8c-1-.5-1.9-1.4-2.4-2.4l.8-1-1-1.8z"/>'),
    ext: ic('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    team: ic('<circle cx="9" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 7 0"/>'),
    dl: ic('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    pen: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    install: ic('<path d="M12 3v12M7 10l5 5 5-5"/><rect x="4" y="17" width="16" height="4" rx="1.5"/>')
  };
  var A = C.address, fullAddr = A.street + ', ' + A.zip + ' ' + A.city;
  var telHref = 'tel:' + (C.phoneTel || C.phone.replace(/[^\d+]/g, ''));
  var mapsHref = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(C.mapsQuery || (C.name + ', ' + fullAddr)) + (C.mapsPlaceId ? '&query_place_id=' + encodeURIComponent(C.mapsPlaceId) : '');
  /* Google-Bewertungen: Links aus config.js; ohne Place ID → Google-Maps-Suche */
  var R = C.reviews || {};
  var reviewWrite = R.writeUrl || mapsHref, reviewRead = R.readUrl || mapsHref;
  var reviewWriteLabel = R.writeUrl ? 'Bewertung schreiben' : 'Auf Google bewerten';
  function stars(r, size) {
    var out = '', pct;
    for (var i = 0; i < 5; i++) {
      pct = Math.max(0, Math.min(1, r - i)) * 100;
      out += '<span class="star" style="width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="bg" d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>' +
        '<span class="fill" style="width:' + pct + '%"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:' + size + 'px;height:' + size + 'px"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z"/></svg></span></span>';
    }
    return '<span class="stars" role="img" aria-label="' + String(r).replace('.', ',') + ' von 5 Sternen">' + out + '</span>';
  }
  function reviewsCard(id) {
    var has = R.rating && R.count;
    return '<div class="rev-card" id="' + id + '"><div class="rev-head"><span class="rev-src">Google-Bewertungen</span>' + (R.asOf ? '<span class="rev-asof">Stand: ' + esc(R.asOf) + '</span>' : '') + '</div>' +
      (has ? '<div class="rev-score"><span class="rev-num">' + String(R.rating).replace('.', ',') + '</span><span class="rev-meta">' + stars(R.rating, 22) + '<span class="rev-count">' + R.count + ' Bewertungen auf Google</span></span></div>' : '') +
      '<a class="btn btn-primary btn-lg btn-block" href="' + esc(reviewWrite) + '" target="_blank" rel="noopener" data-review="write">' + I.pen + esc(reviewWriteLabel) + '</a>' +
      '<a class="btn btn-ghost btn-block" href="' + esc(reviewRead) + '" target="_blank" rel="noopener" data-review="read">Alle Bewertungen auf Google lesen' + I.ext + '</a></div>';
  }
  function reviewPrompt(id) {
    return '<div class="rev-prompt" id="' + id + '"><div class="rev-prompt-t">' + stars(5, 16) + '<b>Zufrieden? Bewerte uns auf Google</b></div><span class="small muted">Dauert nur eine Minute und hilft uns sehr.</span>' +
      '<a class="btn btn-primary btn-sm" href="' + esc(reviewWrite) + '" target="_blank" rel="noopener" data-review="write">' + I.pen + esc(reviewWriteLabel) + '</a></div>';
  }
  var CATS = []; C.services.forEach(function (s) { if (CATS.indexOf(s.cat) < 0) CATS.push(s.cat); });
  var DEMO_BANNER = '<div class="demo-banner" role="note">' + I.info + '<span><b>Demo</b> – Buchungen werden nur auf diesem Gerät gespeichert.</span></div>';
  var SAMPLE = '<span class="badge sample">Beispielpreise</span>';
  function price(s) { return (s.from ? 'ab ' : '') + S.euro(s.price); }
  function state() { return S.seed(S.load()); }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  function footLinks() {
    return '<div class="foot-links"><a href="#impressum">Impressum</a><a href="#datenschutz">Datenschutz</a>' + (C.facebook ? '<a href="' + esc(C.facebook) + '" target="_blank" rel="noopener">Facebook</a>' : '') + '</div>';
  }

  // Texte aus der Konfiguration
  document.title = C.name + ' – ' + C.claim;
  document.querySelectorAll('[data-c]').forEach(function (el) { var k = el.getAttribute('data-c'); if (C[k]) el.textContent = C[k]; });

  /* ---------------- Start ---------------- */
  function rStart() {
    var st = S.openState(), nf = S.nextFree(state(), shortestService()), mine = S.mine();
    $('#v-start').innerHTML =
      '<div class="hero"><span class="eyebrow">' + esc(C.claim) + '</span><h1>' + C.heroTitle + '</h1><p>' + esc(C.heroText) + '</p>' +
      '<div class="hero-btns"><a class="btn btn-light btn-lg" href="#buchen" id="cta-book">' + I.cal + 'Termin buchen</a><a class="btn btn-outline-light btn-lg" href="' + telHref + '" id="cta-call">' + I.phone + 'Anrufen</a></div></div>' +
      reviewsCard('rev-start') +
      '<div class="tiles">' +
        '<a class="tile" href="#zeiten"><span class="k">Heute</span><span class="v"><span class="status ' + (st.open ? 'open' : 'closed') + '">' + (st.open ? 'Geöffnet' : 'Geschlossen') + '</span></span><span class="s">' + esc(st.sub) + '</span></a>' +
        '<a class="tile" href="#buchen"><span class="k">Nächster freier Termin</span><span class="v">' + (nf ? esc(S.fmtDate(nf.date)) + ' ' + S.fmtTime(nf.start) : '–') + '</span><span class="s">online buchbar</span></a>' +
        '<a class="tile wide" href="#kontakt"><span class="k">Adresse</span><span class="v">' + esc(C.name) + '</span><span class="s">' + esc(fullAddr) + ' · ' + esc(C.phone) + '</span></a>' +
      '</div>' +
      (mine.length ? '<a class="c-item" href="#termine"><span class="ico">' + I.cal + '</span><span class="grow"><span class="t">Ihr nächster Termin</span><span class="s" style="display:block">' + esc(S.fmtDate(mine[0].date, true)) + ', ' + S.fmtTime(mine[0].start) + ' Uhr</span></span>' + I.chev + '</a>' : '') +
      '<div class="card" id="install-card" hidden style="padding:16px;display:flex;gap:14px;align-items:center"><img src="icons/icon-192.png" alt="" width="48" height="48" style="border-radius:12px"><div style="flex:1;min-width:0"><b>Als App aufs Handy</b><div class="small muted">Schneller Zugriff – auch offline.</div></div><button class="btn btn-primary btn-sm" type="button" data-install>' + 'App installieren</button></div>' +
      '<div class="sec-head"><h2>Leistungen</h2></div><div class="cat-chips">' + CATS.map(function (c) { return '<a class="chip" href="#leistungen" data-cat="' + esc(c) + '">' + esc(c) + '</a>'; }).join('') + '</div>' +
      footLinks();
    updateInstallUI();
  }
  function shortestService() { return C.services.slice().sort(function (a, b) { return a.duration - b.duration; })[0].id; }

  /* ---------------- Leistungen ---------------- */
  function rLeistungen() {
    $('#v-leistungen').innerHTML = '<div class="sec-head"><div class="row"><h1>Leistungen &amp; Preise</h1>' + SAMPLE + '</div><p class="muted small">' + esc(C.priceNote) + '</p></div>' +
      '<div class="cat-chips">' + CATS.map(function (c) { return '<a class="chip" href="#leistungen" data-cat="' + esc(c) + '">' + esc(c) + '</a>'; }).join('') + '</div>' +
      CATS.map(function (c) {
        return '<div class="price-cat" id="cat-' + esc(c) + '"><h2>' + esc(c) + '</h2>' + C.services.filter(function (s) { return s.cat === c; }).map(function (s) {
          return '<div class="price-row"><span class="n"><b>' + esc(s.name) + '</b><span>ca. ' + S.durTxt(s.duration) + '</span></span><span class="p">' + price(s) + '</span></div>';
        }).join('') + '</div>';
      }).join('') +
      '<p class="small muted center">Alle Preise sind Beispielpreise inkl. MwSt. und dienen nur der Demo.</p>' +
      '<a class="btn btn-primary btn-lg btn-block" href="#buchen">' + I.cal + 'Termin buchen</a>' + footLinks();
  }

  /* ---------------- Öffnungszeiten ---------------- */
  function hoursText(iso) { var iv = S.intervals(iso); return iv.length ? iv.map(function (x) { return S.fmtTime(x[0]) + '–' + S.fmtTime(x[1]); }).join(', ') + ' Uhr' : 'geschlossen'; }
  function rZeiten() {
    var st = S.openState(), today = S.todayISO(), wd = S.weekday(today), order = [1, 2, 3, 4, 5, 6, 0];
    $('#v-zeiten').innerHTML = '<div class="sec-head"><h1>Öffnungszeiten</h1></div>' +
      '<div class="status-card" id="open-status"><div><span class="status ' + (st.open ? 'open' : 'closed') + '">' + st.text + '</span><div class="small muted" style="margin-top:4px">' + esc(st.sub) + '</div></div><a class="btn btn-soft" href="' + telHref + '">' + I.phone + 'Anrufen</a></div>' +
      (C.hoursProvisional ? '<div class="notice warn">' + I.info + '<div><strong>Zeiten vorläufig – bitte prüfen.</strong> Laut Google Di–Fr ab 9:00 Uhr; Schlusszeiten und Samstag sind Platzhalter.</div></div>' : '') +
      '<div class="hours">' + order.map(function (d) {
        var iso = S.addDays(today, (d - wd + 7) % 7), isToday = d === wd, t = hoursText(iso);
        return '<div class="hours-row' + (isToday ? ' today' : '') + (S.intervals(iso).length ? '' : ' closed-day') + '"' + (isToday ? ' aria-current="date"' : '') + '><span class="d">' + S.WD[d] + (isToday ? '<small>Heute</small>' : '') + '</span><span class="t">' + t + '</span></div>';
      }).join('') + '</div>' +
      ((C.closedDates || []).filter(function (d) { return d >= today; }).length ? '<div class="notice">' + I.info + '<div>Zusätzlich geschlossen: ' + C.closedDates.filter(function (d) { return d >= today; }).map(function (d) { return S.fmtDate(d); }).join(', ') + '</div></div>' : '') +
      '<a class="btn btn-primary btn-lg btn-block" href="#buchen">' + I.cal + 'Online Termin buchen</a>' + footLinks();
  }

  /* ---------------- Kontakt ---------------- */
  function mapSrc() { var m = C.map, d = m.zoomDelta; return 'https://www.openstreetmap.org/export/embed.html?bbox=' + [m.lon - d, m.lat - d * 0.6, m.lon + d, m.lat + d * 0.6].map(function (x) { return x.toFixed(5); }).join('%2C') + '&layer=mapnik&marker=' + m.lat + '%2C' + m.lon; }
  function rKontakt() {
    $('#v-kontakt').innerHTML = '<div class="sec-head"><h1>Anfahrt &amp; Kontakt</h1></div>' +
      '<div class="contact-list">' +
        '<a class="c-item" href="' + telHref + '" id="k-call"><span class="ico">' + I.phone + '</span><span class="grow"><span class="t">' + esc(C.phone) + '</span><span class="s">Anrufen – Termine auch telefonisch</span></span>' + I.chev + '</a>' +
        (C.whatsapp ? '<a class="c-item" href="https://wa.me/' + C.whatsapp.replace(/\D/g, '') + '" target="_blank" rel="noopener"><span class="ico wa">' + I.wa + '</span><span class="grow"><span class="t">WhatsApp</span><span class="s">Nachricht schreiben</span></span>' + I.chev + '</a>' : '') +
        '<a class="c-item" href="' + mapsHref + '" target="_blank" rel="noopener" id="k-addr"><span class="ico">' + I.pin + '</span><span class="grow"><span class="t">' + esc(A.street) + '</span><span class="s">' + esc(A.zip + ' ' + A.city) + '</span></span>' + I.ext + '</a>' +
        (C.facebook ? '<a class="c-item" href="' + esc(C.facebook) + '" target="_blank" rel="noopener" id="k-fb"><span class="ico">' + I.fb + '</span><span class="grow"><span class="t">Facebook</span><span class="s">Neuigkeiten &amp; Bilder</span></span>' + I.ext + '</a>' : '') +
        (C.email ? '<a class="c-item" href="mailto:' + esc(C.email) + '"><span class="ico">' + I.mail + '</span><span class="grow"><span class="t">' + esc(C.email) + '</span><span class="s">E-Mail schreiben</span></span>' + I.chev + '</a>' : '') +
      '</div>' +
      '<div class="map-box" id="map-box"><div class="map-fallback" id="map-fallback">' + I.pin + '<b>' + esc(C.name) + '</b><span>' + esc(fullAddr) + '</span><span class="small" id="map-msg">Karte wird geladen …</span></div></div>' +
      '<a class="btn btn-ghost btn-lg btn-block" href="' + mapsHref + '" target="_blank" rel="noopener" id="gmaps">' + I.pin + 'In Google Maps öffnen</a>' +
      '<p class="small muted center">Karte: © OpenStreetMap-Mitwirkende</p>' +
      '<div class="sec-head"><h2>Bewertungen</h2></div>' + reviewsCard('rev-kontakt') + footLinks();
    loadMap();
  }
  function mapMsg(t) { var m = $('#map-msg'); if (m) m.textContent = t; }
  function loadMap() {
    var box = $('#map-box'); if (!box || box.querySelector('iframe')) return;
    var OFF = 'Karte offline nicht verfügbar – Adresse oben antippen oder später erneut öffnen.';
    if (!navigator.onLine) { mapMsg(OFF); return; }
    mapMsg('Karte wird geladen …');
    // Erreichbarkeit prüfen, bevor das iframe eingesetzt wird (sonst zeigt es offline eine Browser-Fehlerseite)
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    fetch(mapSrc(), { mode: 'no-cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function () {
      clearTimeout(to);
      var b = $('#map-box'); if (!b || b.querySelector('iframe')) return;
      var f = document.createElement('iframe');
      f.title = 'Karte: ' + C.name; f.src = mapSrc();
      f.addEventListener('load', function () { b.classList.add('loaded'); });
      b.appendChild(f);
    }).catch(function () { clearTimeout(to); mapMsg(OFF); });
  }

  /* ---------------- Rechtliches (Platzhalter) ---------------- */
  function rLegal() {
    $('#v-impressum').innerHTML = '<a class="b-back" href="#start">' + I.back + 'Zurück</a><h1>Impressum</h1><div class="legal"><div class="notice warn">' + I.info + '<div><strong>Platzhalter</strong> – vor Veröffentlichung durch echte Angaben ersetzen (§ 5 DDG).</div></div>' +
      '<p><b>' + esc(C.name) + '</b><br>' + esc(C.owner) + '<br>' + esc(A.street) + '<br>' + esc(A.zip + ' ' + A.city) + '</p><p>Telefon: ' + esc(C.phone) + (C.email ? '<br>E-Mail: ' + esc(C.email) : '<br>E-Mail: [E-Mail-Adresse]') + '</p><p>USt-IdNr.: ' + esc(C.taxId) + '</p>' +
      '<h3>Berufsbezeichnung</h3><p>[Friseurmeister:in, Handwerkskammer …]</p></div>';
    $('#v-datenschutz').innerHTML = '<a class="b-back" href="#start">' + I.back + 'Zurück</a><h1>Datenschutz</h1><div class="legal"><div class="notice warn">' + I.info + '<div><strong>Platzhalter</strong> – vor Veröffentlichung durch eine vollständige Datenschutzerklärung ersetzen.</div></div>' +
      '<p>Diese Demo speichert Buchungsdaten (Name, Telefonnummer, Hinweis) <b>ausschließlich lokal auf diesem Gerät</b> (localStorage). Es werden keine Daten an den Salon oder Dritte übertragen.</p>' +
      '<p>Auf der Kontaktseite wird eine Karte von OpenStreetMap eingebunden; dabei wird Ihre IP-Adresse an die OpenStreetMap Foundation übertragen. Links zu Google Maps, Google-Bewertungen und Facebook öffnen externe Dienste (Google bzw. Meta); die Bewertungsangaben (Sterne, Anzahl) sind ein fester Stand ohne Datenabruf bei Google.</p>' +
      '<p><button class="btn btn-danger btn-sm" type="button" id="wipe">Alle Demo-Daten auf diesem Gerät löschen</button></p></div>';
  }

  /* ---------------- Buchung ---------------- */
  var B = { step: 'service', serviceId: null, staffId: 'any', date: null, time: null, name: '', phone: '', note: '', lastId: null, tried: false };
  var foot = $('#b-foot'), footInner = $('#b-foot-inner');
  function setFoot(html) { if (!html) { foot.hidden = true; footInner.innerHTML = ''; } else { foot.hidden = false; footInner.innerHTML = html; } }
  function steps(n) { return '<div class="steps" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<span' + (i <= n ? ' class="on"' : '') + '></span>'; }).join('') + '</div>'; }
  function back(to) { return '<button class="b-back" type="button" data-bstep="' + to + '">' + I.back + 'Zurück</button>'; }
  function go(step) { B.step = step; rBuchen(); window.scrollTo(0, 0); }
  function rBuchen() {
    var v = $('#v-buchen');
    if (B.step === 'service') {
      setFoot('');
      v.innerHTML = DEMO_BANNER + steps(1) + '<div><span class="eyebrow">Online-Termin</span><h1 style="margin-top:8px">Was dürfen wir für Sie <em>tun?</em></h1><p class="muted" style="margin-top:8px">Es werden nur wirklich freie Zeiten angezeigt.</p></div>' +
        '<div style="display:flex;justify-content:flex-end;margin-bottom:-8px">' + SAMPLE + '</div>' +
        CATS.map(function (c) {
          return '<div class="b-cat">' + esc(c) + '</div>' + C.services.filter(function (s) { return s.cat === c; }).map(function (s) {
            return '<button class="opt" type="button" data-service="' + s.id + '"><span class="grow"><span class="t">' + esc(s.name) + '</span><span class="s">' + S.durTxt(s.duration) + '</span></span><span class="p">' + price(s) + '</span>' + I.chev + '</button>';
          }).join('');
        }).join('');
    } else if (B.step === 'staff') {
      setFoot('');
      var s = S.service(B.serviceId);
      v.innerHTML = DEMO_BANNER + steps(2) + back('service') + '<div><h1>Bei wem?</h1><p class="muted" style="margin-top:6px">' + esc(s.name) + ' · ' + S.durTxt(s.duration) + '</p></div>' +
        '<button class="opt" type="button" data-staff="any"><span class="av" style="background:#B9A898">' + I.team + '</span><span class="grow"><span class="t">Egal – erste freie Zeit</span><span class="s">Die meisten freien Termine</span></span>' + I.chev + '</button>' +
        C.stylists.map(function (m) {
          var sub = [m.role, m.days ? m.days.map(function (d) { return S.WD_SHORT[d]; }).join(', ') : ''].filter(Boolean).join(' · ');
          return '<button class="opt" type="button" data-staff="' + m.id + '"><span class="av" style="background:' + esc(m.color) + '">' + esc(m.name.replace(/[^\p{L}]/gu, '').charAt(0) || '?') + '</span><span class="grow"><span class="t">' + esc(m.name) + '</span>' + (sub ? '<span class="s">' + esc(sub) + '</span>' : '') + '</span>' + I.chev + '</button>';
        }).join('');
    } else if (B.step === 'time') rTime();
    else if (B.step === 'details') rDetails();
    else if (B.step === 'done') rDone();
  }
  function slots(iso) { return S.freeSlots(state(), iso, B.serviceId, B.staffId === 'any' ? null : B.staffId); }
  function rTime() {
    var s = S.service(B.serviceId), today = S.todayISO(), days = [], first = null;
    for (var i = 0; i < C.booking.daysAhead; i++) {
      var d = S.addDays(today, i), open = S.isOpenDay(d), n = open ? slots(d).length : 0;
      days.push({ date: d, n: n, open: open }); if (n && !first) first = d;
    }
    if (!B.date || !days.some(function (x) { return x.date === B.date && x.n; })) B.date = first;
    var sl = B.date ? slots(B.date) : [];
    if (B.time != null && !sl.some(function (x) { return x.start === B.time; })) B.time = null;
    var groups = [['Vormittag', 0, 720], ['Nachmittag', 720, 1440]].map(function (g) {
      var ts = sl.filter(function (x) { return x.start >= g[1] && x.start < g[2]; });
      return ts.length ? '<div class="times-group"><span class="label">' + g[0] + '</span><div class="times">' + ts.map(function (x) {
        return '<button class="time' + (B.time === x.start ? ' sel' : '') + '" type="button" data-time="' + x.start + '">' + S.fmtTime(x.start) + '</button>';
      }).join('') + '</div></div>' : '';
    }).join('');
    var who = B.staffId === 'any' ? 'egal wer' : 'bei ' + S.stylist(B.staffId).name;
    $('#v-buchen').innerHTML = DEMO_BANNER + steps(3) + back('staff') + '<div><h1>Wann passt es?</h1><p class="muted" style="margin-top:6px">' + esc(s.name) + ' · ' + S.durTxt(s.duration) + ' · ' + esc(who) + '</p></div>' +
      '<div class="days" id="days">' + days.map(function (x) {
        var dt = S.fromISO(x.date), wd = dt.getDay();
        return '<button class="day' + (x.date === B.date ? ' sel' : '') + '" type="button" data-day="' + x.date + '"' + (x.n ? '' : ' disabled') + ' aria-label="' + esc(S.fmtDate(x.date, true)) + (x.n ? ', ' + x.n + ' freie Zeiten' : (x.open ? ', ausgebucht' : ', geschlossen')) + '"><span>' + (x.date === today ? 'Heute' : S.WD_SHORT[wd]) + '</span><b>' + dt.getDate() + '</b><span>' + S.MONTHS[dt.getMonth()].slice(0, 3) + '</span><small>' + (!x.open ? 'zu' : (x.n ? x.n + ' frei' : 'voll')) + '</small></button>';
      }).join('') + '</div>' +
      (B.date ? '<div class="label" id="sel-day-label">' + esc(S.fmtDate(B.date, true)) + ' · ' + sl.length + ' freie Startzeiten</div>' + groups
              : '<div class="notice warn">' + I.info + '<div>In den nächsten ' + C.booking.daysAhead + ' Tagen ist leider nichts frei. Bitte rufen Sie uns an: <a href="' + telHref + '">' + esc(C.phone) + '</a></div></div>') +
      '<p class="small muted">Lieber telefonisch? <a href="' + telHref + '">' + esc(C.phone) + '</a></p>';
    footTime();
    var sel = $('.day.sel'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
  function footTime() {
    if (B.time == null) { setFoot(''); return; }
    var s = S.service(B.serviceId);
    setFoot('<div class="info"><b>' + esc(S.fmtDate(B.date)) + ', ' + S.fmtTime(B.time) + '–' + S.fmtTime(B.time + s.duration) + ' Uhr</b>' + esc(s.name) + '</div><button class="btn btn-primary btn-lg" type="button" id="time-next">Weiter</button>');
  }
  function rDetails() {
    var s = S.service(B.serviceId);
    $('#v-buchen').innerHTML = DEMO_BANNER + steps(4) + back('time') + '<div><h1>Ihre Angaben</h1><p class="muted" style="margin-top:6px">Keine Registrierung nötig.</p></div>' +
      '<div class="summary"><div class="row"><span>Leistung</span><span>' + esc(s.name) + '</span></div><div class="row"><span>Termin</span><span>' + esc(S.fmtDate(B.date, true)) + ', ' + S.fmtTime(B.time) + ' Uhr</span></div><div class="row"><span>Bei</span><span>' + (B.staffId === 'any' ? 'egal (wird zugeteilt)' : esc(S.stylist(B.staffId).name)) + '</span></div><div class="row"><span>Dauer · Preis</span><span>' + S.durTxt(s.duration) + ' · ' + price(s) + '*</span></div></div>' +
      '<form id="b-form" novalidate style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="field" id="f-name"><label for="b-name">Vor- und Nachname</label><input class="input" id="b-name" name="name" autocomplete="name" maxlength="60" required value="' + esc(B.name) + '" placeholder="z. B. Petra Schulz"><span class="errmsg">Bitte Ihren Namen angeben.</span></div>' +
      '<div class="field" id="f-phone"><label for="b-phone">Telefon / Handy</label><input class="input" id="b-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" required value="' + esc(B.phone) + '" placeholder="z. B. 0171 2345678"><span class="errmsg">Bitte eine gültige Telefonnummer angeben (z. B. 0171 2345678).</span><span class="hint">Für Rückfragen zum Termin.</span></div>' +
      '<div class="field"><label for="b-note">Hinweis (optional)</label><textarea class="input" id="b-note" name="note" rows="3" maxlength="500" placeholder="z. B. schulterlang, möchte gern Stufen">' + esc(B.note) + '</textarea></div>' +
      '</form><p class="small muted">* ' + esc(C.priceNote) + '</p>';
    setFoot('<div class="info"><b>Bezahlung im Salon</b>Kostenlos stornierbar</div><button class="btn btn-primary btn-lg" type="button" id="book-now">Verbindlich buchen</button>');
    $('#b-form').addEventListener('input', function () { readForm(); if (B.tried) validate(); });
    $('#b-form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  }
  function readForm() { B.name = $('#b-name').value; B.phone = $('#b-phone').value; B.note = $('#b-note').value; }
  function validate() {
    var okN = S.validName(B.name), okP = S.validPhone(B.phone);
    $('#f-name').classList.toggle('err', !okN); $('#f-phone').classList.toggle('err', !okP);
    $('#b-name').setAttribute('aria-invalid', !okN); $('#b-phone').setAttribute('aria-invalid', !okP);
    return okN && okP;
  }
  function submit() {
    readForm(); B.tried = true;
    if (!validate()) { (S.validName(B.name) ? $('#b-phone') : $('#b-name')).focus(); return; }
    var r = S.book({ serviceId: B.serviceId, staffId: B.staffId, date: B.date, start: B.time, name: B.name, phone: B.phone, note: B.note });
    if (!r.ok) { toast(r.error); B.time = null; go('time'); return; }
    B.lastId = r.booking.id; B.note = ''; B.tried = false; updateCount(); go('done');
  }
  function summaryHtml(b) {
    var s = S.service(b.serviceId), st = S.stylist(b.staffId);
    return '<div class="summary" id="confirm-summary"><div class="row"><span>Wann</span><span>' + esc(S.fmtDate(b.date, true)) + '<br>' + S.fmtTime(b.start) + '–' + S.fmtTime(b.start + b.duration) + ' Uhr</span></div>' +
      '<div class="row"><span>Was</span><span>' + esc(s.name) + '</span></div><div class="row"><span>Bei</span><span>' + esc(st ? st.name : 'Team') + '</span></div>' +
      '<div class="row"><span>Preis</span><span>' + price(s) + ' <span class="small muted">(Beispielpreis)</span></span></div>' +
      '<div class="row"><span>Name</span><span>' + esc(b.name) + '</span></div><div class="row"><span>Telefon</span><span>' + esc(b.phone) + '</span></div>' +
      (b.note ? '<div class="row"><span>Hinweis</span><span>' + esc(b.note) + '</span></div>' : '') +
      '<div class="row"><span>Wo</span><span>' + esc(C.name) + '<br><span class="small muted">' + esc(fullAddr) + '</span></span></div></div>';
  }
  function rDone() {
    setFoot('');
    var b = S.get(B.lastId);
    if (!b) { go('service'); return; }
    if (b.status === 'cancelled') {
      $('#v-buchen').innerHTML = DEMO_BANNER + '<div class="done-ico bad">' + I.x + '</div><div class="center"><h1>Termin storniert</h1><p class="muted" style="margin-top:8px">Der Termin am ' + esc(S.fmtDate(b.date, true)) + ' um ' + S.fmtTime(b.start) + ' Uhr wurde storniert. Die Zeit ist wieder frei.</p></div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="button" data-restart>Neuen Termin buchen</button>';
      return;
    }
    $('#v-buchen').innerHTML = DEMO_BANNER + '<div class="done-ico">' + I.check + '</div><div class="center"><h1>Termin gebucht!</h1><p class="muted" style="margin-top:8px">Wir freuen uns auf Sie, ' + esc(b.name.split(' ')[0]) + '.</p></div>' + summaryHtml(b) +
      '<button class="btn btn-primary btn-lg btn-block" type="button" data-ics="' + b.id + '">' + I.dl + 'In Kalender eintragen</button>' +
      '<div id="cancel-zone"><button class="btn btn-danger btn-lg btn-block" type="button" data-cancel="' + b.id + '">' + I.x + 'Termin stornieren</button></div>' +
      '<a class="btn btn-ghost btn-lg btn-block" href="#termine">Meine Termine</a>' +
      '<button class="btn btn-soft btn-lg btn-block" type="button" data-restart>Weiteren Termin buchen</button>' + reviewPrompt('rev-done');
  }

  /* ---------------- Meine Termine ---------------- */
  function rTermine() {
    var list = S.mine(), past = S.pastMine();
    $('#v-termine').innerHTML = DEMO_BANNER + '<div class="sec-head"><h1>Meine Termine</h1><p class="muted small">Ihre auf diesem Gerät gebuchten Termine.</p></div>' +
      (list.length ? list.map(function (b) {
        var s = S.service(b.serviceId), st = S.stylist(b.staffId);
        return '<div class="mine-item" data-mine="' + b.id + '"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>' + esc(S.fmtDate(b.date, true)) + '</b><span class="badge ok">' + S.fmtTime(b.start) + ' Uhr</span></div>' +
          '<div class="muted small">' + esc(s.name) + ' · ' + S.durTxt(b.duration) + ' · bei ' + esc(st ? st.name : 'Team') + '</div>' +
          '<div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-ics="' + b.id + '">' + I.dl + 'Kalender</button><span class="cz" style="display:contents"><button class="btn btn-danger btn-sm" type="button" data-cancel="' + b.id + '">Stornieren</button></span></div></div>';
      }).join('') : '<div class="empty"><span>Noch keine kommenden Termine auf diesem Gerät.</span><a class="btn btn-primary" href="#buchen">' + I.cal + 'Termin buchen</a></div>') +
      (past.length ? '<div class="sec-head" style="margin-top:6px"><h2>Vergangene Termine</h2></div>' + reviewPrompt('rev-past') + past.map(function (b) {
        var s = S.service(b.serviceId), st = S.stylist(b.staffId);
        return '<div class="mine-item past" data-past="' + b.id + '"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>' + esc(S.fmtDate(b.date, true)) + '</b><span class="badge">' + S.fmtTime(b.start) + ' Uhr</span></div>' +
          '<div class="muted small">' + esc(s ? s.name : 'Termin') + ' · bei ' + esc(st ? st.name : 'Team') + '</div></div>';
      }).join('') : '') +
      '<p class="small muted center">Fragen oder Änderungen? <a href="' + telHref + '">' + esc(C.phone) + '</a></p>';
  }
  function updateCount() { var n = S.mine().length; $('#mine-count').textContent = n ? n : ''; }

  /* ---------------- Router ---------------- */
  var RENDER = { start: rStart, leistungen: rLeistungen, buchen: rBuchen, zeiten: rZeiten, kontakt: rKontakt, termine: rTermine, impressum: rLegal, datenschutz: rLegal };
  var current = null;
  function route() {
    var name = (location.hash || '#start').slice(1).split('/')[0];
    if (!RENDER[name]) name = 'start';
    if (name === 'buchen' && current !== 'buchen' && B.step === 'done') { B.step = 'service'; }
    current = name;
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.getAttribute('data-view') === name); });
    document.querySelectorAll('[data-nav]').forEach(function (a) { var on = a.getAttribute('data-nav') === name; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (name !== 'buchen') setFoot('');
    RENDER[name]();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------------- Klicks ---------------- */
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-cat]'))) { var c = t.getAttribute('data-cat'); e.preventDefault(); if (current !== 'leistungen') location.hash = '#leistungen'; setTimeout(function () { var el = document.getElementById('cat-' + c); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); return; }
    if ((t = e.target.closest('[data-service]'))) { B.serviceId = t.getAttribute('data-service'); B.time = null; B.date = null; go('staff'); return; }
    if ((t = e.target.closest('[data-staff]'))) { B.staffId = t.getAttribute('data-staff'); B.time = null; B.date = null; go('time'); return; }
    if ((t = e.target.closest('[data-day]'))) { if (t.disabled) return; B.date = t.getAttribute('data-day'); B.time = null; rTime(); return; }
    if ((t = e.target.closest('[data-time]'))) { B.time = +t.getAttribute('data-time'); document.querySelectorAll('.time').forEach(function (x) { x.classList.toggle('sel', x === t); }); footTime(); return; }
    if ((t = e.target.closest('#time-next'))) { go('details'); return; }
    if ((t = e.target.closest('#book-now'))) { submit(); return; }
    if ((t = e.target.closest('[data-bstep]'))) { go(t.getAttribute('data-bstep')); return; }
    if ((t = e.target.closest('[data-restart]'))) { B.step = 'service'; B.serviceId = null; B.time = null; B.date = null; B.staffId = 'any'; if (current !== 'buchen') location.hash = '#buchen'; else go('service'); return; }
    if ((t = e.target.closest('[data-ics]'))) { downloadIcs(t.getAttribute('data-ics')); return; }
    if ((t = e.target.closest('[data-cancel]'))) {
      var id = t.getAttribute('data-cancel'), b = S.get(id), holder = t.parentNode;
      holder.innerHTML = '<div class="confirm-cancel" style="width:100%"><span>Termin am <b>' + esc(S.fmtDate(b.date)) + ' um ' + S.fmtTime(b.start) + ' Uhr</b> wirklich stornieren?</span><div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-keep>Behalten</button><button class="btn btn-bad btn-sm" type="button" data-cancel-yes="' + id + '">Ja, stornieren</button></div></div>';
      return;
    }
    if ((t = e.target.closest('[data-keep]'))) { RENDER[current](); return; }
    if ((t = e.target.closest('[data-cancel-yes]'))) { S.cancel(t.getAttribute('data-cancel-yes')); updateCount(); toast('Termin storniert'); RENDER[current](); return; }
    if ((t = e.target.closest('[data-install]')) || (t = e.target.closest('#install-btn'))) { doInstall(); return; }
    if ((t = e.target.closest('#wipe'))) { localStorage.removeItem(C.storageKey); B.lastId = null; B.step = 'service'; updateCount(); toast('Demo-Daten gelöscht'); return; }
  });
  function downloadIcs(id) {
    var b = S.get(id); if (!b) return;
    var blob = new Blob([S.ics(b)], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'friseurtermin-' + b.date + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('Kalenderdatei wird geladen – zum Eintragen antippen');
  }

  /* ---------------- Installation (beforeinstallprompt) ---------------- */
  var deferred = null;
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function canInstall() { return !standalone() && (!!deferred || isIOS); }
  function updateInstallUI() {
    var show = canInstall();
    var card = $('#install-card'); if (card) { card.hidden = !show; card.style.display = show ? 'flex' : 'none'; }
    var hb = $('#install-btn'); if (hb) hb.hidden = !show;
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; updateInstallUI(); });
  window.addEventListener('appinstalled', function () { deferred = null; updateInstallUI(); toast('App installiert'); });
  window.addEventListener('resize', updateInstallUI);
  function doInstall() {
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; updateInstallUI(); }); return; }
    if (isIOS) iosSheet();
  }
  /* iPhone/iPad: kein beforeinstallprompt → Anleitung „Zum Home-Bildschirm“ */
  var SHARE = ic('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>');
  var PLUS = ic('<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>');
  function iosSheet() {
    if ($('#ios-sheet')) return;
    var w = document.createElement('div'); w.className = 'sheet-backdrop'; w.id = 'ios-sheet';
    w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ios-sheet-t"><div class="sheet-grip"></div>' +
      '<div style="display:flex;gap:12px;align-items:center"><img src="icons/apple-touch-icon.png" alt="" width="48" height="48" style="border-radius:12px"><div><h2 id="ios-sheet-t" style="font-size:20px">App auf den Home-Bildschirm</h2><div class="small muted">' + esc(C.name) + '</div></div></div>' +
      '<ol class="ios-steps"><li><span class="n">1</span><span>In Safari auf <b>Teilen</b> tippen <span class="kbd">' + SHARE + '</span></span></li>' +
      '<li><span class="n">2</span><span>Nach unten scrollen und <b>„Zum Home-Bildschirm“</b> wählen <span class="kbd">' + PLUS + '</span></span></li>' +
      '<li><span class="n">3</span><span>Oben rechts auf <b>„Hinzufügen“</b> tippen – fertig.</span></li></ol>' +
      '<p class="small muted">Danach startet die Seite wie eine App – auch ohne Internet.</p>' +
      '<button class="btn btn-primary btn-lg btn-block" type="button" data-sheet-close>Verstanden</button></div>';
    document.body.appendChild(w);
    w.addEventListener('click', function (e) { if (e.target === w || e.target.closest('[data-sheet-close]')) w.remove(); });
  }

  /* ---------------- Online/Offline + Service Worker ---------------- */
  function net() { document.body.classList.toggle('is-offline', !navigator.onLine); if (current === 'kontakt' && navigator.onLine) loadMap(); }
  window.addEventListener('online', net); window.addEventListener('offline', net);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function (err) { console.warn('SW-Registrierung fehlgeschlagen', err); }); });
  }
  // Öffnungsstatus minütlich aktualisieren
  setInterval(function () { if (current === 'start' || current === 'zeiten') RENDER[current](); }, 60000);

  state(); updateCount(); net(); route();
  window.SalonApp = { B: B, go: go };
})();
