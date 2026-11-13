// analytics.js — cookieless usage counters via GoatCounter (https://www.goatcounter.com).
// No plan content, no file names, no personal data: only event name + device class (+ room-count bucket).
// Disabled (no-op, nothing loaded) while GC_CODE is empty.
const GC_CODE = 'vkroc'; // e.g. 'vkroc' for https://vkroc.goatcounter.com
const dev = (() => { const w = Math.min(screen.width, screen.height), c = matchMedia('(pointer:coarse)').matches; return !c ? 'desktop' : w < 600 ? 'phone' : 'tablet'; })();
// Opt-out: ?nocount=1 marks this device as not counted (owner/test devices), ?count=1 undoes it. Automated browsers are never counted.
let OFF = false;
try {
  const sp = new URLSearchParams(location.search);
  if (sp.get('nocount') === '1') { localStorage.setItem('vkroc_nocount', '1'); note('Toto zariadenie sa už nepočíta'); }
  else if (sp.get('count') === '1') { localStorage.removeItem('vkroc_nocount'); note('Toto zariadenie sa opäť počíta'); }
  OFF = localStorage.getItem('vkroc_nocount') === '1' || navigator.webdriver === true;
} catch (e) { OFF = navigator.webdriver === true; }
function note(t) { const show = () => { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0B0B0B;color:#fff;padding:10px 16px;border-radius:12px;font:500 14px Inter,system-ui,sans-serif;z-index:99999;box-shadow:0 8px 24px #0004'; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }; document.body ? show() : addEventListener('DOMContentLoaded', show); }
const q = []; let ready = false;
function send(name) { try { window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {} }
export function track(ev, n) {
  if (!GC_CODE || OFF) return;
  let name = ev + '-' + dev;
  if (typeof n === 'number') name += '-r' + (n >= 15 ? '15plus' : n);
  ready ? send(name) : q.push(name);
}
if (GC_CODE && !OFF && !/^(localhost|127\.|192\.168\.)/.test(location.hostname)) {
  window.goatcounter = { no_onload: true };
  const s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = 'https://' + GC_CODE + '.goatcounter.com/count';
  s.onload = () => { ready = true; try { window.goatcounter.count({ path: location.pathname }); } catch (e) {} q.splice(0).forEach(send); };
  document.head.appendChild(s);
  track('open');
}
window.vkA = track;
