/* =====================================================================
   Buchungslogik (Demo, nur localStorage) – vereinfacht aus dem Prototyp
   (salon-app/js/buchen.js). Freie Startzeiten berücksichtigen
   Öffnungszeiten, Dauer der Leistung, Arbeitstage und bestehende Termine.
   ===================================================================== */
(function (root) {
  'use strict';
  var C = root.SALON_CONFIG;
  var WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayISO(now) { return toISO(now || new Date()); }
  function addDays(iso, n) { var d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function weekday(iso) { return fromISO(iso).getDay(); }
  function hm(s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; }
  function fmtTime(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function fmtTimeShort(m) { return Math.floor(m / 60) + (m % 60 ? ':' + pad(m % 60) : '') ; }
  function fmtDate(iso, long) {
    var d = fromISO(iso);
    return long ? WD[d.getDay()] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear()
                : WD_SHORT[d.getDay()] + ', ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.';
  }
  function dateTime(iso, min) { var d = fromISO(iso); d.setMinutes(min); return d; }
  function minutesNow(now) { now = now || new Date(); return now.getHours() * 60 + now.getMinutes(); }
  /* Dauer-Text: ca. 30 Min. · ca. 1 Std. · ca. 1,5 Std. · ca. 2 Std. 15 Min. */
  function durTxt(m) {
    if (m < 60) return 'ca. ' + m + ' Min.';
    if (m % 30 === 0) return 'ca. ' + String(m / 60).replace('.', ',') + ' Std.';
    return 'ca. ' + Math.floor(m / 60) + ' Std. ' + (m % 60) + ' Min.';
  }
  /* Startzeiten-Raster einer Leistung (für die jeweilige Dauer): services[].step, sonst <=15 Min. → 15, sonst 30 (:00/:30) */
  function stepFor(sv, dur) { return sv.step || ((dur || sv.duration) <= 15 ? 15 : 30); }
  /* ---------- Haarlänge → Dauer ---------- */
  var LENGTHS = ['kurz', 'mittel', 'lang'];
  function hasLengths(sv) { return !!(sv && sv.lengths && LENGTHS.every(function (k) { return sv.lengths[k] > 0; })); }
  /* Dauer einer Leistung für die gewählte Haarlänge (ohne Längen-Abhängigkeit bzw. ohne Wahl: duration) */
  function durFor(sv, len) { if (!sv) return 0; return hasLengths(sv) && sv.lengths[len] ? sv.lengths[len] : sv.duration; }
  function durRange(sv) { if (!hasLengths(sv)) return [sv.duration, sv.duration]; var v = LENGTHS.map(function (k) { return sv.lengths[k]; }); return [Math.min.apply(null, v), Math.max.apply(null, v)]; }
  function lengthLabel(len) { var x = (C.hairLengths || []).filter(function (l) { return l.id === len; })[0]; return x ? x.label : ''; }
  /* „ca. 30–45 Min.“ · „ca. 45 Min. – 1,5 Std.“ · bei gleicher Dauer wie durTxt */
  function durRangeTxt(sv) {
    var r = durRange(sv); if (r[0] === r[1]) return durTxt(r[0]);
    if (r[1] < 60) return 'ca. ' + r[0] + '–' + r[1] + ' Min.';
    var a = durTxt(r[0]), b = durTxt(r[1]).replace('ca. ', '');
    if (/ Std\.$/.test(a) && / Std\.$/.test(b) && a.indexOf('Min.') < 0 && b.indexOf('Min.') < 0) return a.replace(' Std.', '') + '–' + b; // „ca. 2,5–3,5 Std.“
    return a + ' – ' + b;
  }
  function firstOnGrid(t, step) { return Math.ceil(t / step) * step; }
  function euro(v) { return v.toLocaleString('de-DE', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; }
  function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function service(id) { return C.services.filter(function (s) { return s.id === id; })[0] || null; }
  function stylist(id) { return C.stylists.filter(function (s) { return s.id === id; })[0] || null; }

  /* Öffnungszeiten eines Tages als [[von, bis], …] in Minuten */
  function intervals(iso) {
    if ((C.closedDates || []).indexOf(iso) >= 0) return [];
    return (C.hours[weekday(iso)] || []).map(function (x) { return [hm(x[0]), hm(x[1])]; });
  }
  function isOpenDay(iso) { return intervals(iso).length > 0; }
  function worksOn(st, iso) { return isOpenDay(iso) && (!st.days || st.days.indexOf(weekday(iso)) >= 0); }
  /* Status jetzt: { open, text } */
  function openState(now) {
    now = now || new Date();
    var iso = todayISO(now), m = minutesNow(now), iv = intervals(iso);
    for (var i = 0; i < iv.length; i++) if (m >= iv[i][0] && m < iv[i][1]) return { open: true, text: 'Jetzt geöffnet', sub: 'bis ' + fmtTime(iv[i][1]) + ' Uhr' };
    for (i = 0; i < iv.length; i++) if (m < iv[i][0]) return { open: false, text: 'Jetzt geschlossen', sub: 'öffnet heute um ' + fmtTime(iv[i][0]) + ' Uhr' };
    for (var d = 1; d <= 14; d++) {
      var n = addDays(iso, d), ivn = intervals(n);
      if (ivn.length) return { open: false, text: 'Jetzt geschlossen', sub: 'öffnet ' + (d === 1 ? 'morgen' : WD[weekday(n)]) + ' um ' + fmtTime(ivn[0][0]) + ' Uhr' };
    }
    return { open: false, text: 'Jetzt geschlossen', sub: '' };
  }

  /* ---------- Gemeinsamer Speicher mit dem Team-Kalender („Brücke“) ----------
     Beide Demos liegen unter derselben Herkunft (thundertiger187.github.io) → gleicher localStorage, WENN sie im selben
     Browser auf demselben Gerät laufen. Dann landen Terminwünsche direkt im Team-Kalender und dessen Antwort (bestätigt /
     neuer Vorschlag), Buchungsmodus, Dauern je Haarlänge und freie Zeiten kommen hier an. Sonst arbeitet die App allein
     (Demo-Knöpfe simulieren den Salon). Ein echter Betrieb braucht dafür einen Server. */
  function bLoad() { try { var x = JSON.parse(localStorage.getItem(C.bridgeKey)); if (x && typeof x === 'object') { if (!Array.isArray(x.requests)) x.requests = []; return x; } } catch (e) { /* ignore */ } return { v: 1, requests: [] }; }
  function bSave(x) { try { localStorage.setItem(C.bridgeKey, JSON.stringify(x)); } catch (e) { /* ignore */ } }
  function bTx(fn) { var x = bLoad(), r = fn(x); bSave(x); return r; }
  function bReq(x, id) { return x.requests.filter(function (r) { return r.id === id; })[0] || null; }
  /* Buchungsmodus: Einstellung aus dem Team-Kalender (falls im selben Browser), sonst config.js, Standard „Anfrage“ */
  function mode() { var x = bLoad(); return x.mode === 'sofort' || x.mode === 'anfrage' ? x.mode : (C.booking.mode === 'sofort' ? 'sofort' : 'anfrage'); }
  function modeSource() { var x = bLoad(); return x.mode === 'sofort' || x.mode === 'anfrage' ? 'team' : 'config'; }
  /* Team-Kalender war in diesem Browser aktiv (hat freie Zeiten / Einstellungen hinterlegt) */
  function teamLinked() { var x = bLoad(); return !!(x.teamAt && x.avail && x.avail.days); }
  /* Vom Inhaber geänderte Dauern übernehmen (nur wenn der Team-Kalender im selben Browser läuft) */
  var BASE_SV = {}; C.services.forEach(function (sv) { BASE_SV[sv.id] = { duration: sv.duration, lengths: sv.lengths ? JSON.parse(JSON.stringify(sv.lengths)) : null }; });
  function applyDurations() {
    var d = bLoad().durations || {};
    C.services.forEach(function (sv) {
      var o = d[sv.id], base = BASE_SV[sv.id];
      var dur = o && o.duration > 0 && o.duration % 15 === 0 ? o.duration : base.duration;
      var len = o ? (o.lengths && LENGTHS.every(function (k) { return o.lengths[k] > 0 && o.lengths[k] % 15 === 0; }) ? o.lengths : null) : base.lengths;
      sv.duration = dur; if (len) sv.lengths = { kurz: len.kurz, mittel: len.mittel, lang: len.lang }; else delete sv.lengths;
    });
  }
  applyDurations();
  /* Freie Zeiten aus dem Team-Kalender (Arbeitszeiten, Pausen, Abwesenheiten, Termine) für einen Tag – oder null */
  function availDay(iso) {
    var x = bLoad(); if (!(x.teamAt && x.avail && x.avail.days)) return null;
    if (x.avail.days[iso]) return { staff: x.avail.days[iso], skills: x.avail.skills || {} };
    // Team-Kalender kennt diesen Tag (Zeitraum veröffentlicht), aber niemand arbeitet → nichts frei
    if (x.avail.from && iso >= x.avail.from && iso < addDays(x.avail.from, 21)) return { staff: {}, skills: x.avail.skills || {} };
    return null;
  }
  function canDo(av, stId, svId) { var k = av.skills[stId]; return !k || k === 'all' || k.indexOf(svId) >= 0; }
  function fitsTeam(e, t, dur) {
    if (!e) return false;
    var inWin = (e.win || []).some(function (w) { return t >= w[0] && t + dur <= w[1]; });
    return inWin && !(e.busy || []).some(function (b) { return b[0] < t + dur && t < b[1]; });
  }

  /* ---------- Speicher ---------- */
  function load() {
    try { var s = JSON.parse(localStorage.getItem(C.storageKey)); if (s && s.bookings) return s; } catch (e) { /* ignore */ }
    return { v: 1, bookings: [], seededDays: [] };
  }
  function save(s) { localStorage.setItem(C.storageKey, JSON.stringify(s)); }

  /* Demo-Termine: deterministisch pro Datum, damit einige Zeiten belegt sind */
  function rng(seed) { var x = 0; for (var i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0; return function () { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  function seed(s, now) {
    if (!C.booking.seedDemoBookings) return s;
    var today = todayISO(now), changed = false;
    var pool = C.services.filter(function (x) { return x.duration <= 90; });
    for (var i = 0; i <= C.booking.daysAhead; i++) {
      var iso = addDays(today, i);
      if (s.seededDays.indexOf(iso) >= 0) continue;
      s.seededDays.push(iso); changed = true;
      C.stylists.forEach(function (st) {
        if (!worksOn(st, iso)) return;
        var r = rng(iso + st.id);
        intervals(iso).forEach(function (iv) {
          var t = iv[0];
          while (t < iv[1]) {
            var sv = pool[Math.floor(r() * pool.length)], dur = sv.duration;
            // Demo-Termine liegen im selben Raster wie die Online-Startzeiten (>= 30 Min. nur :00/:30)
            if (r() < 0.5 && t % stepFor(sv) === 0 && t + dur <= iv[1]) {
              s.bookings.push({ id: 'demo-' + iso + '-' + st.id + '-' + t, demo: true, serviceId: sv.id, staffId: st.id, date: iso, start: t, duration: dur, status: 'ok' });
              t += dur;
            } else t += 15 * (1 + Math.floor(r() * 4));
          }
        });
      });
    }
    // alte Tage aufräumen
    s.seededDays = s.seededDays.filter(function (d) { return d >= addDays(today, -7); });
    s.bookings = s.bookings.filter(function (b) { return !b.demo || b.date >= addDays(today, -1); });
    if (changed) save(s);
    return s;
  }

  function busy(s, staffId, iso, start, dur, ignoreId, ownOnly) {
    return s.bookings.some(function (b) {
      return b.status !== 'cancelled' && (!ownOnly || b.mine) && b.staffId === staffId && b.date === iso && b.id !== ignoreId && b.start < start + dur && start < b.start + b.duration;
    });
  }
  /* Freie Startzeiten: [{ start, staffIds }] – nur dort, wo die GANZE Dauer (je nach Haarlänge) passt:
     innerhalb der Öffnungszeiten, und (falls der Team-Kalender im selben Browser lief) innerhalb der Arbeitszeit ohne Pause,
     Abwesenheit oder Termin; sonst gegen die Demo-Termine dieses Geräts. opts: { length, ignoreId } */
  function freeSlots(s, iso, serviceId, staffId, now, opts) {
    var sv = service(serviceId); if (!sv) return [];
    if (typeof opts === 'string') opts = { length: opts };
    opts = opts || {};
    now = now || new Date();
    var today = todayISO(now), out = [];
    if (iso < today || iso > addDays(today, C.booking.daysAhead - 1)) return [];
    var dur = durFor(sv, opts.length), step = stepFor(sv, dur);
    var earliest = iso === today ? minutesNow(now) + C.booking.leadMinutes : 0;
    var av = availDay(iso);
    var team = C.stylists.filter(function (st) { return (!staffId || st.id === staffId) && (av ? !!av.staff[st.id] && canDo(av, st.id, sv.id) : worksOn(st, iso)); });
    intervals(iso).forEach(function (iv) {
      for (var t = firstOnGrid(Math.max(iv[0], earliest), step); t + dur <= iv[1]; t += step) {
        var ids = team.filter(function (st) { return av ? fitsTeam(av.staff[st.id], t, dur) && !busy(s, st.id, iso, t, dur, opts.ignoreId, true) : !busy(s, st.id, iso, t, dur, opts.ignoreId); }).map(function (st) { return st.id; });
        if (ids.length) out.push({ start: t, staffIds: ids });
      }
    });
    return out;
  }
  function loadOf(s, staffId, iso) { return s.bookings.filter(function (b) { return b.status !== 'cancelled' && b.staffId === staffId && b.date === iso; }).reduce(function (a, b) { return a + b.duration; }, 0); }
  function nextFree(s, serviceId, now, len) {
    var today = todayISO(now);
    for (var i = 0; i < C.booking.daysAhead; i++) { var d = addDays(today, i), f = freeSlots(s, d, serviceId, null, now, len); if (f.length) return { date: d, start: f[0].start }; }
    return null;
  }

  /* Validierung */
  function validName(n) { n = (n || '').trim(); return n.length >= 2 && n.length <= 60 && /\p{L}/u.test(n) && !/[<>]/.test(n); }
  function phoneDigits(p) { return String(p || '').replace(/\D/g, ''); }
  function validPhone(p) { p = (p || '').trim(); var d = phoneDigits(p); return /^(\+|0)[0-9 ()\/\-]+$/.test(p) && d.length >= 7 && d.length <= 15; }

  /* Buchen / Stornieren */
  /* Buchen bzw. Terminwunsch senden. Modus „Anfrage“: req = 'angefragt' (erst fest, wenn der Salon bestätigt),
     Modus „Sofort“: req = 'bestaetigt'. In beiden Fällen geht der Termin über den gemeinsamen Speicher an den Team-Kalender –
     NICHT per WhatsApp/SMS. */
  function book(data, now) {
    var s = seed(load(), now), sv = service(data.serviceId);
    if (!sv) return { ok: false, error: 'Leistung unbekannt' };
    var len = hasLengths(sv) ? data.length : null;
    if (hasLengths(sv) && LENGTHS.indexOf(len) < 0) return { ok: false, error: 'Bitte Haarlänge wählen.' };
    if (!validName(data.name) || !validPhone(data.phone)) return { ok: false, error: 'Bitte Name und Telefonnummer prüfen.' };
    var slot = freeSlots(s, data.date, sv.id, data.staffId === 'any' ? null : data.staffId, now, { length: len }).filter(function (x) { return x.start === data.start; })[0];
    if (!slot) return { ok: false, error: 'Diese Zeit ist leider nicht mehr frei.' };
    var staffId = data.staffId !== 'any' && slot.staffIds.indexOf(data.staffId) >= 0 ? data.staffId
      : slot.staffIds.slice().sort(function (a, b) { return loadOf(s, a, data.date) - loadOf(s, b, data.date); })[0];
    var m = mode(), at = (now || new Date()).toISOString();
    var b = { id: uid(), mine: true, serviceId: sv.id, length: len, staffId: staffId, staffChoice: data.staffId, date: data.date, start: data.start, duration: durFor(sv, len), price: sv.price, priceFrom: !!sv.from,
      name: data.name.trim(), phone: data.phone.trim(), note: (data.note || '').trim().slice(0, 500), status: 'ok', createdAt: at,
      reminder: REM_CHANNELS.indexOf(data.reminder) >= 0 ? data.reminder : 'none',
      mode: m, req: m === 'sofort' ? 'bestaetigt' : 'angefragt', confirmedAt: m === 'sofort' ? at : null, confirmedBy: m === 'sofort' ? 'sofort' : null, proposal: null };
    s.bookings.push(b); save(s);
    bTx(function (x) { x.requests.push(toReq(b, sv)); });
    return { ok: true, booking: b };
  }
  function toReq(b, sv) {
    return { id: b.id, origin: 'kunden-app', createdAt: b.createdAt, updatedAt: b.createdAt, mode: b.mode, status: b.req, serviceId: b.serviceId, serviceName: sv ? sv.name : '',
      length: b.length || null, duration: b.duration, date: b.date, start: b.start, staffId: b.staffId, staffChoice: b.staffChoice, name: b.name, phone: b.phone, note: b.note,
      reminder: b.reminder, confirmedAt: b.confirmedAt, confirmedBy: b.confirmedBy, proposal: null };
  }
  /* Status einer eigenen Buchung: angefragt | bestaetigt | verschoben (neuer Vorschlag des Salons) – alte Buchungen ohne Angabe = bestätigt */
  function reqStatus(b) { return b && b.req ? b.req : 'bestaetigt'; }
  function isConfirmed(b) { return reqStatus(b) === 'bestaetigt'; }
  /* Antworten des Salons aus dem gemeinsamen Speicher übernehmen → true, wenn sich etwas geändert hat */
  function sync() {
    var x = bLoad(), s = load(), changed = false;
    s.bookings.forEach(function (b) {
      if (!b.mine || b.status === 'cancelled') return;
      var r = bReq(x, b.id); if (!r) return;
      if (r.status === 'storniert' && r.cancelledBy === 'salon') { b.status = 'cancelled'; b.cancelledAt = r.updatedAt; b.cancelledBy = 'salon'; changed = true; return; }
      if (r.status === 'bestaetigt' && b.req !== 'bestaetigt') { b.req = 'bestaetigt'; b.confirmedAt = r.confirmedAt || new Date().toISOString(); b.confirmedBy = r.confirmedBy || 'salon'; b.proposal = null; changed = true; }
      if (r.status === 'verschoben' && r.proposal && (b.req !== 'verschoben' || JSON.stringify(b.proposal) !== JSON.stringify(r.proposal))) { b.req = 'verschoben'; b.proposal = r.proposal; changed = true; }
      if (r.status === 'bestaetigt' && (r.date !== b.date || r.start !== b.start)) { b.date = r.date; b.start = r.start; changed = true; }
      if (r.staffId && r.staffId !== b.staffId && stylist(r.staffId)) { b.staffId = r.staffId; changed = true; }
    });
    if (changed) save(s);
    return changed;
  }
  function updBoth(id, fnB, fnR) {
    var s = load(), b = s.bookings.filter(function (x) { return x.id === id && x.mine; })[0]; if (!b) return null;
    fnB(b); save(s);
    bTx(function (x) { var r = bReq(x, id); if (!r) { r = toReq(b, service(b.serviceId)); x.requests.push(r); } fnR(r, b); r.updatedAt = new Date().toISOString(); });
    return b;
  }
  /* Demo ohne Team-Kalender im selben Browser: Salon bestätigt den Wunsch */
  function demoConfirm(id) {
    var at = new Date().toISOString();
    return updBoth(id, function (b) { b.req = 'bestaetigt'; b.confirmedAt = at; b.confirmedBy = 'demo'; b.proposal = null; },
      function (r) { r.status = 'bestaetigt'; r.confirmedAt = at; r.confirmedBy = 'demo'; r.proposal = null; });
  }
  /* Demo: Salon schlägt eine andere Zeit vor (nächste freie Zeit mit gleicher Dauer, mind. 1 Std. später) */
  function proposalFor(b, now) {
    var s = seed(load(), now), today = todayISO(now);
    for (var i = 0; i < C.booking.daysAhead; i++) {
      var d = addDays(b.date < today ? today : b.date, i);
      var f = freeSlots(s, d, b.serviceId, null, now, { length: b.length, ignoreId: b.id }).filter(function (x) { return i > 0 || x.start >= b.start + 60; });
      if (f.length) { var pick = f[0], st = pick.staffIds.indexOf(b.staffId) >= 0 ? b.staffId : pick.staffIds[0]; return { date: d, start: pick.start, staffId: st }; }
    }
    return null;
  }
  function demoPropose(id, now) {
    var b0 = get(id); if (!b0) return null;
    var p = proposalFor(b0, now); if (!p) return null;
    return updBoth(id, function (b) { b.req = 'verschoben'; b.proposal = p; }, function (r) { r.status = 'verschoben'; r.proposal = p; r.proposedBy = 'demo'; });
  }
  /* Kund:in nimmt den neuen Vorschlag an → Termin ist fest */
  function acceptProposal(id) {
    var at = new Date().toISOString();
    return updBoth(id, function (b) { var p = b.proposal; if (!p) return; b.date = p.date; b.start = p.start; if (p.staffId) b.staffId = p.staffId; b.req = 'bestaetigt'; b.confirmedAt = at; b.confirmedBy = 'kunde'; b.proposal = null; },
      function (r, b) { r.status = 'bestaetigt'; r.date = b.date; r.start = b.start; r.staffId = b.staffId; r.confirmedAt = at; r.confirmedBy = 'kunde'; r.acceptedAt = at; r.proposal = null; });
  }
  function cancel(id, why) {
    var at = new Date().toISOString();
    updBoth(id, function (b) { b.status = 'cancelled'; b.cancelledAt = at; if (why) b.cancelReason = why; },
      function (r) { r.status = 'storniert'; r.cancelledBy = 'kunde'; r.reason = why || ''; });
  }
  function get(id) { return load().bookings.filter(function (b) { return b.id === id; })[0] || null; }
  function mine(now) {
    now = now || new Date();
    return load().bookings.filter(function (b) { return b.mine && b.status !== 'cancelled' && dateTime(b.date, b.start + b.duration) > now; })
      .sort(function (a, b) { return (a.date + pad(a.start)) < (b.date + pad(b.start)) ? -1 : 1; });
  }

  /* ---------- Terminerinnerungen (Demo: nur Planung/Anzeige, der Versand wäre Aufgabe des Salon-Servers) ----------
     d2 = 2 Tage vorher zur selben Uhrzeit (Kalendertage, damit Sommer-/Winterzeit keine Rolle spielt), h2 = 2 Stunden vorher.
     Status: 'entfaellt' = Zeitpunkt lag bei der Buchung schon in der Vergangenheit (kurzfristig gebucht),
             'verschickt' = Zeitpunkt inzwischen erreicht, 'geplant' = liegt in der Zukunft. */
  var REM_CHANNELS = ['whatsapp', 'sms'];
  var REMINDERS = [{ id: 'd2', label: '2 Tage vorher' }, { id: 'h2', label: '2 Stunden vorher' }];
  function reminderAt(b, id) { return id === 'd2' ? dateTime(addDays(b.date, -2), b.start) : dateTime(b.date, b.start - 120); }
  /* Erinnerungen werden erst geplant, wenn der Termin fest ist (bestätigt) – Bezugszeitpunkt = Bestätigung */
  function reminders(b, now) {
    if (!b || REM_CHANNELS.indexOf(b.reminder) < 0 || !isConfirmed(b)) return [];
    now = now || new Date();
    var created = b.confirmedAt ? new Date(b.confirmedAt) : (b.createdAt ? new Date(b.createdAt) : now);
    return REMINDERS.map(function (r) {
      var at = reminderAt(b, r.id);
      return { id: r.id, label: r.label, at: at, date: toISO(at), min: at.getHours() * 60 + at.getMinutes(),
        status: at <= created ? 'entfaellt' : (at <= now ? 'verschickt' : 'geplant') };
    });
  }

  /* Vergangene eigene Termine (für die Bewertungs-Bitte), neueste zuerst */
  function pastMine(now, days) {
    now = now || new Date(); var limit = addDays(todayISO(now), -(days || 90));
    return load().bookings.filter(function (b) { return b.mine && b.status !== 'cancelled' && dateTime(b.date, b.start + b.duration) <= now && b.date >= limit; })
      .sort(function (a, b) { return (a.date + pad(a.start)) > (b.date + pad(b.start)) ? -1 : 1; });
  }

  /* Kalenderdatei (.ics) – Zeiten in UTC, damit jede Kalender-App korrekt umrechnet */
  function icsEsc(t) { return String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  function icsUtc(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function ics(b) {
    var sv = service(b.serviceId), st = stylist(b.staffId), a = C.address;
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + icsEsc(C.name) + '//Termin-Demo//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + b.id + '@salon-demo', 'DTSTAMP:' + icsUtc(new Date()),
      'DTSTART:' + icsUtc(dateTime(b.date, b.start)), 'DTEND:' + icsUtc(dateTime(b.date, b.start + b.duration)),
      'SUMMARY:' + icsEsc('Friseurtermin: ' + sv.name + ' – ' + C.name),
      'LOCATION:' + icsEsc(C.name + ', ' + a.street + ', ' + a.zip + ' ' + a.city),
      'DESCRIPTION:' + icsEsc('Bei: ' + (st ? st.name : 'Team') + '\nTelefon: ' + C.phone + (b.note ? '\nHinweis: ' + b.note : '') + '\n(Demo-Buchung)'),
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc('Friseurtermin bei ' + C.name), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'];
    return lines.join('\r\n') + '\r\n';
  }

  root.SB = { WD: WD, WD_SHORT: WD_SHORT, MONTHS: MONTHS, pad: pad, toISO: toISO, fromISO: fromISO, todayISO: todayISO, addDays: addDays, weekday: weekday, hm: hm,
    fmtTime: fmtTime, fmtTimeShort: fmtTimeShort, fmtDate: fmtDate, dateTime: dateTime, durTxt: durTxt, stepFor: stepFor, euro: euro, service: service, stylist: stylist, intervals: intervals, isOpenDay: isOpenDay,
    worksOn: worksOn, openState: openState, load: load, save: save, seed: seed, freeSlots: freeSlots, nextFree: nextFree, validName: validName, validPhone: validPhone,
    book: book, cancel: cancel, get: get, reminders: reminders, REM_CHANNELS: REM_CHANNELS, mine: mine, pastMine: pastMine, ics: ics,
    LENGTHS: LENGTHS, hasLengths: hasLengths, durFor: durFor, durRange: durRange, durRangeTxt: durRangeTxt, lengthLabel: lengthLabel,
    mode: mode, modeSource: modeSource, teamLinked: teamLinked, applyDurations: applyDurations, bridge: bLoad, sync: sync, reqStatus: reqStatus, isConfirmed: isConfirmed,
    demoConfirm: demoConfirm, demoPropose: demoPropose, acceptProposal: acceptProposal };
})(window);
