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
  function durTxt(m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + ' Std.' + (r ? ' ' + r + ' Min.' : '') : m + ' Min.'; }
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
    var durs = C.services.map(function (x) { return x.duration; }).filter(function (d) { return d <= 90; });
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
            var dur = durs[Math.floor(r() * durs.length)];
            if (r() < 0.5 && t + dur <= iv[1]) {
              s.bookings.push({ id: 'demo-' + iso + '-' + st.id + '-' + t, demo: true, serviceId: null, staffId: st.id, date: iso, start: t, duration: dur, status: 'ok' });
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

  function busy(s, staffId, iso, start, dur, ignoreId) {
    return s.bookings.some(function (b) {
      return b.status !== 'cancelled' && b.staffId === staffId && b.date === iso && b.id !== ignoreId && b.start < start + dur && start < b.start + b.duration;
    });
  }
  /* Freie Startzeiten: [{ start, staffIds }] */
  function freeSlots(s, iso, serviceId, staffId, now) {
    var sv = service(serviceId); if (!sv) return [];
    now = now || new Date();
    var today = todayISO(now), out = [];
    if (iso < today || iso > addDays(today, C.booking.daysAhead - 1)) return [];
    var earliest = iso === today ? minutesNow(now) + C.booking.leadMinutes : 0;
    var team = C.stylists.filter(function (st) { return (!staffId || st.id === staffId) && worksOn(st, iso); });
    intervals(iso).forEach(function (iv) {
      for (var t = iv[0]; t + sv.duration <= iv[1]; t += C.booking.slotStep) {
        if (t < earliest) continue;
        var ids = team.filter(function (st) { return !busy(s, st.id, iso, t, sv.duration); }).map(function (st) { return st.id; });
        if (ids.length) out.push({ start: t, staffIds: ids });
      }
    });
    return out;
  }
  function loadOf(s, staffId, iso) { return s.bookings.filter(function (b) { return b.status !== 'cancelled' && b.staffId === staffId && b.date === iso; }).reduce(function (a, b) { return a + b.duration; }, 0); }
  function nextFree(s, serviceId, now) {
    var today = todayISO(now);
    for (var i = 0; i < C.booking.daysAhead; i++) { var d = addDays(today, i), f = freeSlots(s, d, serviceId, null, now); if (f.length) return { date: d, start: f[0].start }; }
    return null;
  }

  /* Validierung */
  function validName(n) { n = (n || '').trim(); return n.length >= 2 && n.length <= 60 && /\p{L}/u.test(n) && !/[<>]/.test(n); }
  function phoneDigits(p) { return String(p || '').replace(/\D/g, ''); }
  function validPhone(p) { p = (p || '').trim(); var d = phoneDigits(p); return /^(\+|0)[0-9 ()\/\-]+$/.test(p) && d.length >= 7 && d.length <= 15; }

  /* Buchen / Stornieren */
  function book(data, now) {
    var s = seed(load(), now), sv = service(data.serviceId);
    if (!sv) return { ok: false, error: 'Leistung unbekannt' };
    if (!validName(data.name) || !validPhone(data.phone)) return { ok: false, error: 'Bitte Name und Telefonnummer prüfen.' };
    var slot = freeSlots(s, data.date, sv.id, data.staffId === 'any' ? null : data.staffId, now).filter(function (x) { return x.start === data.start; })[0];
    if (!slot) return { ok: false, error: 'Diese Zeit ist leider nicht mehr frei.' };
    var staffId = data.staffId !== 'any' && slot.staffIds.indexOf(data.staffId) >= 0 ? data.staffId
      : slot.staffIds.slice().sort(function (a, b) { return loadOf(s, a, data.date) - loadOf(s, b, data.date); })[0];
    var b = { id: uid(), mine: true, serviceId: sv.id, staffId: staffId, staffChoice: data.staffId, date: data.date, start: data.start, duration: sv.duration, price: sv.price, priceFrom: !!sv.from,
      name: data.name.trim(), phone: data.phone.trim(), note: (data.note || '').trim().slice(0, 500), status: 'ok', createdAt: new Date().toISOString() };
    s.bookings.push(b); save(s);
    return { ok: true, booking: b };
  }
  function cancel(id) { var s = load(); s.bookings.forEach(function (b) { if (b.id === id && b.mine) { b.status = 'cancelled'; b.cancelledAt = new Date().toISOString(); } }); save(s); }
  function get(id) { return load().bookings.filter(function (b) { return b.id === id; })[0] || null; }
  function mine(now) {
    now = now || new Date();
    return load().bookings.filter(function (b) { return b.mine && b.status !== 'cancelled' && dateTime(b.date, b.start + b.duration) > now; })
      .sort(function (a, b) { return (a.date + pad(a.start)) < (b.date + pad(b.start)) ? -1 : 1; });
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
    fmtTime: fmtTime, fmtTimeShort: fmtTimeShort, fmtDate: fmtDate, dateTime: dateTime, durTxt: durTxt, euro: euro, service: service, stylist: stylist, intervals: intervals, isOpenDay: isOpenDay,
    worksOn: worksOn, openState: openState, load: load, save: save, seed: seed, freeSlots: freeSlots, nextFree: nextFree, validName: validName, validPhone: validPhone,
    book: book, cancel: cancel, get: get, mine: mine, pastMine: pastMine, ics: ics };
})(window);
