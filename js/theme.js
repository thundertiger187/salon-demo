/* Design-Umschalter: „Klassisch“ (Standard, bisheriges Design) und „Glas“ (hell, ruhig, Milchglas-Effekt).
   Wird früh im <head> geladen (kein Aufblitzen des falschen Designs). Auswahl pro Gerät in localStorage.
   Aktiv:  <html data-theme="glass">  ·  Klassisch: kein Attribut.
   Bedienung: jedes Element mit [data-theme-set="klassisch|glass"] schaltet um; [data-theme-open] öffnet die Auswahl. */
(function () {
  var s = document.currentScript, KEY = (s && s.getAttribute('data-key')) || 'dg-design';
  var THEMES = {
    klassisch: { label: 'Klassisch', desc: 'Sand & Terrakotta – das bisherige Design', color: null },
    glass: { label: 'Glas', desc: 'Hell & ruhig, mit Milchglas-Effekt', color: '#F3F0EB' }
  };
  var root = document.documentElement, baseColor = null;
  function get() { var v = null; try { v = localStorage.getItem(KEY); } catch (e) { /* privat */ } return THEMES[v] ? v : 'klassisch'; }
  function meta() { return document.querySelector('meta[name="theme-color"]'); }
  function sync() {
    var t = get();
    document.querySelectorAll('[data-theme-set]').forEach(function (b) { var on = b.getAttribute('data-theme-set') === t; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('active', on); });
    document.querySelectorAll('[data-theme-label]').forEach(function (el) { el.textContent = THEMES[t].label; });
  }
  function apply(t) {
    if (t === 'glass') root.setAttribute('data-theme', 'glass'); else root.removeAttribute('data-theme');
    var m = meta(); if (m) { if (baseColor === null) baseColor = m.getAttribute('content'); m.setAttribute('content', THEMES[t].color || baseColor); }
    if (document.body) sync();
  }
  function set(t) {
    if (!THEMES[t]) t = 'klassisch';
    try { localStorage.setItem(KEY, t); } catch (e) { /* privat */ }
    apply(t);
    try { window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } })); } catch (e) { /* alt */ }
  }
  apply(get());

  /* Auswahl-Dialog (für Menüs ohne Platz für Inline-Knöpfe) */
  function open() {
    if (document.getElementById('theme-picker')) return;
    var w = document.createElement('div'); w.id = 'theme-picker'; w.className = 'tp-backdrop';
    w.innerHTML = '<div class="tp-panel" role="dialog" aria-modal="true" aria-labelledby="tp-title"><div class="tp-head"><h2 id="tp-title">Design</h2>' +
      '<button class="icon-btn tp-x" type="button" data-tp-close aria-label="Schließen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<p class="tp-sub">Gilt nur auf diesem Gerät.</p><div class="tp-opts">' +
      Object.keys(THEMES).map(function (k) {
        return '<button type="button" class="tp-opt" data-theme-set="' + k + '"><span class="tp-sw tp-sw-' + k + '" aria-hidden="true"><i></i><i></i><i></i></span><span class="tp-txt"><b>' + THEMES[k].label + '</b><small>' + THEMES[k].desc + '</small></span><span class="tp-check" aria-hidden="true"></span></button>';
      }).join('') + '</div></div>';
    document.body.appendChild(w); sync();
    var first = w.querySelector('.tp-opt.active') || w.querySelector('.tp-opt'); if (first) first.focus();
  }
  function close() { var w = document.getElementById('theme-picker'); if (w) w.remove(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set]');
    if (b) { e.preventDefault(); set(b.getAttribute('data-theme-set')); return; }
    if (e.target.closest && e.target.closest('[data-theme-open]')) { e.preventDefault(); open(); return; }
    if (e.target.id === 'theme-picker' || (e.target.closest && e.target.closest('[data-tp-close]'))) { close(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('theme-picker')) { e.stopPropagation(); close(); } }, true);
  document.addEventListener('DOMContentLoaded', sync);
  window.DGTheme = { get: get, set: set, open: open, close: close, sync: sync, themes: THEMES };
})();
