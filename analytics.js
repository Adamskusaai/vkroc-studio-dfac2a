// analytics.js — cookieless usage counters via GoatCounter (https://www.goatcounter.com).
// No plan content, no file names, no personal data: only event name + device class (+ room-count bucket).
// Disabled (no-op, nothing loaded) while GC_CODE is empty.
const GC_CODE = 'vkroc'; // e.g. 'vkroc' for https://vkroc.goatcounter.com
const dev = (() => { const w = Math.min(screen.width, screen.height), c = matchMedia('(pointer:coarse)').matches; return !c ? 'desktop' : w < 600 ? 'phone' : 'tablet'; })();
const q = []; let ready = false;
function send(name) { try { window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {} }
export function track(ev, n) {
  if (!GC_CODE) return;
  let name = ev + '-' + dev;
  if (typeof n === 'number') name += '-r' + (n >= 15 ? '15plus' : n);
  ready ? send(name) : q.push(name);
}
if (GC_CODE && !/^(localhost|127\.|192\.168\.)/.test(location.hostname)) {
  window.goatcounter = { no_onload: true };
  const s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = 'https://' + GC_CODE + '.goatcounter.com/count';
  s.onload = () => { ready = true; try { window.goatcounter.count({ path: location.pathname }); } catch (e) {} q.splice(0).forEach(send); };
  document.head.appendChild(s);
  track('open');
}
window.vkA = track;
