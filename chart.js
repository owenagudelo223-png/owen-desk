// Hand-drawn canvas charts. No chart library.
const Charts = (() => {
  function setup(cv, h) {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || cv.parentElement.clientWidth;
    cv.style.height = h + 'px'; cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); return [c, w, h];
  }
  function line(cv, pts, start, marks) {
    const [c, w, h] = setup(cv, matchMedia('(min-width:900px)').matches ? 190 : 220); const top = 20, bot = h - 8;
    if (!pts.length) { c.fillStyle = 'rgba(235,235,245,0.3)'; c.font = '13px -apple-system'; c.textAlign = 'center'; c.fillText('No balance points yet', w / 2, h / 2); return; }
    const t0 = pts[0][0], t1 = Math.max(pts[pts.length - 1][0], t0 + 1);
    let lo = Math.min(start, ...pts.map(p => p[1])), hi = Math.max(start, ...pts.map(p => p[1])); if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const X = t => (t - t0) / (t1 - t0) * w, Y = v => bot - (v - lo) / (hi - lo) * (bot - top);
    c.setLineDash([4, 4]); c.strokeStyle = 'rgba(235,235,245,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(start)); c.lineTo(w, Y(start)); c.stroke(); c.setLineDash([]);
    const draw = k => { c.clearRect(0, 0, w, h);
      c.setLineDash([4, 4]); c.strokeStyle = 'rgba(235,235,245,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(start)); c.lineTo(w, Y(start)); c.stroke(); c.setLineDash([]);
      const n = Math.max(1, Math.ceil(pts.length * k)), P = pts.slice(0, n);
      const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(0,230,118,0.32)'); g.addColorStop(1, 'rgba(0,230,118,0)');
      c.beginPath(); P.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])));
      if (P.length === 1) c.lineTo(w * k, Y(P[0][1]));
      c.save(); c.shadowColor = 'rgba(0,230,118,0.75)'; c.shadowBlur = 12; c.strokeStyle = '#00E676'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke(); c.restore();
      const xe = P.length === 1 ? w * k : X(P[P.length - 1][0]); c.lineTo(xe, bot); c.lineTo(X(P[0][0]), bot); c.closePath(); c.fillStyle = g; c.fill();
      if (k >= 1) { c.fillStyle = '#00E676'; c.beginPath(); c.arc(Math.min(xe, w - 4), Y(P[P.length - 1][1]), 4, 0, 7); c.fill(); } };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, key = cv.id + pts.length;
    if (reduce || cv.dataset.k === key) draw(1); else { cv.dataset.k = key; const t0a = performance.now(); (function f(t) { const k = Math.min(1, (t - t0a) / 900); draw(1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(f); })(t0a); }
    const rows = []; c.font = '600 12px -apple-system';
    (marks || []).forEach(m => {
      if (m.ts < t0) return; const x = X(m.ts), tw = c.measureText(m.text).width + 14; let r = 0;
      while ((rows[r] || []).some(([a, b]) => x < b && x + tw > a)) r++;
      (rows[r] = rows[r] || []).push([x, x + tw]); const y = 4 + r * 24, col = { bought: '#0a84ff', sold: '#00d35a', stopped: '#ff453a' }[m.kind];
      c.fillStyle = col; c.beginPath(); c.roundRect(Math.min(x, w - tw), y, tw, 20, 10); c.fill(); c.fillStyle = m.kind === 'bought' ? '#fff' : '#000'; c.fillText(m.text, Math.min(x, w - tw) + 7, y + 14);
    });
  }
  function candles(cv, cs, exitLine) {
    const [c, w, h] = setup(cv, 240), vh = 40, ph = h - vh - 8;
    if (!cs.length) { c.fillStyle = 'rgba(235,235,245,0.3)'; c.font = '13px -apple-system'; c.textAlign = 'center'; c.fillText('No candles yet', w / 2, h / 2); return; }
    let lo = Math.min(...cs.map(k => k.l)), hi = Math.max(...cs.map(k => k.h)); if (exitLine) { lo = Math.min(lo, exitLine); hi = Math.max(hi, exitLine); } if (hi === lo) { hi *= 1.01; lo *= 0.99; }
    const n = Math.min(cs.length, 60), sl = cs.slice(-n), bw = w / n, Y = v => 6 + (hi - v) / (hi - lo) * (ph - 12), vmax = Math.max(1, ...sl.map(k => k.v));
    sl.forEach((k, i) => { const x = i * bw + bw / 2, col = k.c >= k.o ? '#00E676' : '#FF3B30'; c.strokeStyle = col; c.fillStyle = col;
      c.beginPath(); c.moveTo(x, Y(k.h)); c.lineTo(x, Y(k.l)); c.stroke(); const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c)); c.fillRect(x - bw * 0.35, y1, bw * 0.7, Math.max(1, y2 - y1));
      c.globalAlpha = .5; c.fillRect(x - bw * 0.35, h - k.v / vmax * vh, bw * 0.7, k.v / vmax * vh); c.globalAlpha = 1; });
    if (exitLine) { c.setLineDash([6, 4]); c.strokeStyle = '#ff9f0a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, Y(exitLine)); c.lineTo(w, Y(exitLine)); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#ff9f0a'; c.font = '600 11px -apple-system'; c.fillText('Risk trailing stop', 4, Y(exitLine) - 4); }
  }
  function ring(cv, score, min) {
    const [c, w, h] = setup(cv, 120), r = 48, x = w / 2, y = 60; c.lineWidth = 10; c.lineCap = 'round';
    c.strokeStyle = '#2c2c2e'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    if (score != null) { c.strokeStyle = score >= min ? '#00d35a' : '#ffd60a'; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * score / 100); c.stroke(); }
    c.fillStyle = '#fff'; c.font = '600 30px -apple-system'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(score == null ? '–' : score, x, y);
  }
  return { line, candles, ring };
})();
