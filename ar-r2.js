/* v20261127t R2 QR hosting client.
   Off-switch: PF.noR2Upload (or ?r2=0). When the Worker origin is not configured,
   or the switch is on, nothing is uploaded and the studio keeps today's behaviour
   (local USDZ/GLB only, flyer without a QR for user projects). */
export const R2_V = '20261127t';

function qs(ctx) {
  try { return new URLSearchParams(((ctx && ctx.location) || globalThis.location || {}).search || ''); }
  catch { return new URLSearchParams(); }
}
function pf(ctx) {
  return (ctx && ctx.__PF) || (ctx && ctx.globalThis && ctx.globalThis.__PF) || globalThis.__PF || {};
}
function cfg(ctx) {
  return (ctx && ctx.__VK_R2) || (ctx && ctx.globalThis && ctx.globalThis.__VK_R2) || globalThis.__VK_R2 || {};
}

export function origin(ctx = globalThis) {
  const c = cfg(ctx);
  if (c.origin) return String(c.origin).replace(/\/$/, '');
  const q = qs(ctx).get('r2origin');
  if (q) return String(q).replace(/\/$/, '');
  try {
    const ls = (ctx && ctx.localStorage) || globalThis.localStorage;
    const v = ls && ls.getItem && ls.getItem('vkR2Origin');
    if (v) return String(v).replace(/\/$/, '');
  } catch (e) {}
  return '';
}

export function skipReason(ctx = globalThis) {
  if (pf(ctx).noR2Upload) return 'pf';
  if (qs(ctx).get('r2') === '0') return 'query';
  if (!origin(ctx)) return 'noconfig';
  return '';
}

export function enabled(ctx = globalThis) {
  return !skipReason(ctx);
}

function doFetch(ctx, url, opt) {
  const f = (ctx && ctx.fetch) || globalThis.fetch;
  return f(url, opt);
}

export async function upload({ glb, usdz, plan, meta } = {}, ctx = globalThis) {
  const reason = skipReason(ctx);
  if (reason) return { ok: false, skipped: true, reason };
  const base = origin(ctx);
  const maxFile = Number(cfg(ctx).maxFile) || 25 * 1024 * 1024;
  const maxTotal = Number(cfg(ctx).maxTotal) || 40 * 1024 * 1024;
  if (!glb || !usdz) return { ok: false, error: 'missing-models' };
  const sizes = [glb.size, usdz.size, plan && plan.size || 0];
  if (sizes.some(s => s > maxFile) || sizes.reduce((a, b) => a + b, 0) > maxTotal) return { ok: false, error: 'too-large' };
  const tRes = await doFetch(ctx, base + '/api/ticket', { method: 'POST' });
  if (!tRes.ok) return { ok: false, error: 'ticket', status: tRes.status };
  const { ticket } = await tRes.json();
  const hdrs = { authorization: 'Bearer ' + ticket };
  const sRes = await doFetch(ctx, base + '/api/start', {
    method: 'POST',
    headers: { ...hdrs, 'content-type': 'application/json' },
    body: JSON.stringify(meta || {})
  });
  if (!sRes.ok) return { ok: false, error: 'start', status: sRes.status };
  const { id } = await sRes.json();
  const put = async (name, blob, mime) => {
    const r = await doFetch(ctx, base + '/api/put/' + id + '/' + name, {
      method: 'PUT',
      headers: { ...hdrs, 'content-type': mime, 'content-length': String(blob.size) },
      body: blob
    });
    if (!r.ok) {
      const err = new Error('put ' + name);
      err.status = r.status;
      err.error = 'put';
      throw err;
    }
  };
  try {
    await put('model.glb', glb, 'model/gltf-binary');
    await put('model.usdz', usdz, 'model/vnd.usdz+zip');
    if (plan) await put('plan.png', plan, 'image/png');
  } catch (e) {
    return { ok: false, error: e.error || 'put', status: e.status };
  }
  const cRes = await doFetch(ctx, base + '/api/complete/' + id, {
    method: 'POST',
    headers: { ...hdrs, 'content-type': 'application/json' },
    body: JSON.stringify(meta || {})
  });
  if (!cRes.ok) return { ok: false, error: 'complete', status: cRes.status };
  return { ok: true, ...(await cRes.json()) };
}

export async function remove(id, deleteToken, ctx = globalThis) {
  const reason = skipReason(ctx);
  if (reason) return { ok: false, skipped: true, reason };
  if (!id || !deleteToken) return { ok: false, error: 'bad-request' };
  const r = await doFetch(ctx, origin(ctx) + '/api/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, token: deleteToken })
  });
  if (!r.ok) return { ok: false, error: 'delete', status: r.status };
  return { ok: true, ...(await r.json()) };
}

export function qrUrl(share, ctx = globalThis) {
  if (share && share.qr) return share.qr;
  if (share && share.id && origin(ctx)) return origin(ctx) + '/m/' + share.id + '/qr.svg';
  return '';
}
