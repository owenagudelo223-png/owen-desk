(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
// token: from #t= once, then localStorage. Never sent anywhere but our own /api.
(function () { const m = location.hash.match(/[#&]t=([^&]+)/); if (m) { localStorage.setItem('desk_t', decodeURIComponent(m[1])); const g = location.hash.match(/[#&]go=([^&]+)/); history.replaceState(null, '', location.pathname + '#/' + (g ? decodeURIComponent(g[1]) : 'home')); } })();
const GH = location.protocol === 'https:' && location.hostname.endsWith('github.io');
(function () { const m = location.hash.match(/[#&?]d=([^&]+)/); if (m) { try { localStorage.setItem('desk_d', decodeURIComponent(m[1])); } catch (e) {} } })();
function hashD() { const m = location.hash.match(/[#&?]d=([^&]+)/); return m ? decodeURIComponent(m[1]) : ''; }
function keepD() { if (!GH) return; const d = DP(); if (!d || hashD()) return; let h = location.hash || '#/home'; if (h === '#') h = '#/home'; h += (h.includes('?') ? '&' : '?') + 'd=' + encodeURIComponent(d); history.replaceState(null, '', location.pathname + location.search + h); }
const DP = () => { if (!GH) return ''; let v = ''; try { v = localStorage.getItem('desk_d') || ''; } catch (e) {} return v || hashD(); };
const TOK = () => localStorage.getItem('desk_t') || '';
const $ = s => document.querySelector(s), V = $('#view');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const usd = (v, d = 2) => v == null ? 'n/a' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const kusd = v => v == null ? 'n/a' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : usd(v);
const tm = ts => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
async function api(p, opt = {}) {
  if (GH && !DP()) throw new Error('nopath');
  if (DP()) { if (opt.method && opt.method !== 'GET') throw new Error('read-only view (use Telegram to control the desk)');
    const r = await fetch('d/' + DP() + '/' + p.replace(/[?=\/]/g, '_') + '.json?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 404 ? '404' : r.status); return r.json(); }
  const r = await fetch('/api/' + p, { ...opt, headers: { 'Authorization': 'Bearer ' + TOK(), 'Content-Type': 'application/json' } });
  if (r.status === 401) throw new Error('unauthorized'); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status); return r.json();
}
let S = { range: 'LIVE', state: null, lastBal: null };
function paperBadge(mode) { return mode === 'PAPER' ? '<span class="pill paper">PAPER</span>' : '<span class="pill" style="background:#2c2c2e">LIVE</span>'; }
function errView(e) { V.innerHTML = e.message === 'nopath' ? '<div class="err">Abre tu enlace secreto una vez en Safari y vuelve a agregar la app</div>' : e.message === 'unauthorized' ? '<div class="err">Sin sesión. Abre la app una vez con su enlace #t=.</div>' : `<div class="err">No se pudo conectar con el desk · ${esc(e.message)}</div>`; }
function odometer(el, val) {
  const s = usd(val), old = el.dataset.v || ''; el.dataset.v = s;
  el.innerHTML = [...s].map(ch => `<span>${esc(ch)}</span>`).join('');
  if (RM || !old) return; const spans = [...el.children], n = spans.length;
  spans.forEach((sp, i) => { const j = n - 1 - i; if (old[old.length - 1 - j] !== s[i]) sp.animate([{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'ease-out', delay: 30 * j, fill: 'backwards' }); });
}
function card(a, st) {
  const dot = `<span class="dot ${a.status}"></span>`;
  if (a.name === 'scanner') return `<div class="card"><div class="hd"><span>${dot}Scanner</span><span style="color:#64d2ff">${a.waiting} waiting</span></div>
    <div class="k" style="color:#64d2ff">${a.count} pools</div><div class="feed">${a.feed.length ? a.feed.map(f => f.verdict === 'kill' ? `<div class="kill"><span>${esc(f.name)}</span><b>${esc(f.reason)}</b></div>` : `<div><span>${esc(f.name)} · liq ${kusd(f.liq)}</span><span style="color:#64d2ff">→ auditor</span></div>`).join('') : '<div style="color:var(--t3)">Waiting for the first migration</div>'}</div></div>`;
  if (a.name === 'auditor') { const L = a.last ? a.last.layers : [];
    return `<div class="card"><div class="hd"><span>${dot}Auditor</span><span class="lbl">${a.rejected} rejected</span></div><div class="k">${a.count} <span class="lbl" style="font-size:17px">taken apart</span></div>
    <div class="strips">${[0,1,2,3,4,5,6,7].map(i => `<i class="${L[i] ? (L[i].pass ? 'ok' : L[i].pass === false ? 'bad' : '') : ''}"></i>`).join('')}</div>
    <div class="lbl" style="font-size:15px">${a.current ? 'taking apart...' : a.last ? (a.last.passed ? '8/8 → Executor' : esc(a.last.reason)) : 'Nothing audited yet'}</div></div>`; }
  if (a.name === 'analyst') return `<div class="card"><div class="hd"><span>${dot}Analyst${a.mode === 'rules' ? ' (rules)' : ''}</span><span style="color:#ffd60a">Scoring</span></div><canvas id="ring" style="margin-top:14px"></canvas><div class="lbl" style="text-align:center;margin-top:8px">${a.count} scored · green from ${a.min_score}</div></div>`;
  if (a.name === 'executor') return `<div class="card"><div class="hd"><span>${dot}Executor</span><span class="lbl">${paperBadge(st.mode)}</span></div><div class="k" style="color:#00d35a">${a.count} <span class="lbl" style="font-size:17px">trades</span></div>
    <div class="lbl" style="font-size:15px">${a.last ? `${usd(a.last.size)} · ${a.stack_pct}% of stack` : `${a.stack_pct}% of stack per trade`}</div>
    <div class="bar"><i style="width:${a.progress != null ? a.progress : a.last ? 100 : 0}%"></i></div><div class="lbl">${a.progress != null ? `Executing... ${a.progress}%` : a.last ? '✓ Filled' : 'No signal yet'}</div></div>`;
  return `<div class="card"><div class="hd"><span>${dot}Risk</span><span style="color:#ff6b9a">${a.open ? 'Guarding' : 'Idle'}</span></div><div class="k" style="color:#ff6b9a">${a.open} <span class="lbl" style="font-size:17px">open</span></div>
    <div class="lbl" style="font-size:15px">${a.last_exit === 'trail' ? 'Trailed out' : a.last_exit === 'stop' ? 'Stopped' : a.last_exit ? esc(a.last_exit) : 'No exits yet'}</div>
    <div class="pills"><span class="tp r">stop -${a.stop_pct}%</span><span class="tp g">trail ${a.trail_pct}%</span></div></div>`;
}
const BOG = ts => new Date(ts).toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tmB = ts => new Date(ts * 1000).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '—';
const KIND = { bought: ['#00E676', '↓', 'Compró'], sold: ['#00E676', '↑', 'Vendió'], stopped: ['#FF3B30', '✕', 'Stop en'], rejected: ['#FF3B30', '✕', 'Rechazó'], fee: ['#F6851B', '⇡', 'Comisión'], withdraw: ['#F6851B', '⇡', 'Retiro'] };
const AGL = { auditor: 'Auditor', executor: 'Executor', risk: 'Risk', scanner: 'Scanner', analyst: 'Analyst' };
const seen = new Set(JSON.parse(sessionStorage.getItem('seen_rows') || '[]'));
const hue = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
function tokImg(mint, sym, size = 40) { const h = hue(mint || sym), ini = esc((sym || '?')[0].toUpperCase());
  return `<div class="tok" style="width:${size}px;height:${size}px;background:hsl(${h} 60% 28%);color:hsl(${h} 90% 75%)">${ini}${mint ? `<img src="https://dd.dexscreener.com/ds-data/tokens/solana/${esc(mint)}.png" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`; }
const num = v => parseFloat(String(v).replace(/[^\d.+-]/g, ''));
function actRow(r) {
  const href = r.kind === 'rejected' ? `#/audit/${r.mint}` : `#/coin/${r.mint}`;
  const [col, , lab] = KIND[r.kind] || ['#8E8E93', '•', r.kind];
  const isNew = seen.size && !seen.has(r.id); seen.add(r.id);
  const sym = (r.title || '').split(' ').slice(1).join(' ') || (r.mint || '').slice(0, 6);
  const sub = (r.subtitle || '').replace(/^[^·]*·\s*/, '');
  const m = String(r.value).match(/\$\s?([\d.,]+)/), bal = S.state && S.state.balance;
  const pct = m && bal && (r.kind === 'bought' || r.kind === 'sold' || r.kind === 'stopped') ? `${(parseFloat(m[1].replace(/,/g, '')) / bal * 100).toFixed(1)}% del stack` : esc(sub);
  return `<a class="arow${isNew ? ' slide' : ''}" href="${href}">${tokImg(r.mint, sym)}<div class="am"><div><b>${esc(lab)} ${esc(sym)}</b></div><div>${esc(AGL[r.agent] || r.agent || '')} · ${r.ts ? tmB(r.ts) : ''}</div></div><div class="av"><div style="color:${col}">${esc(r.value === 'Skipped' ? 'Descartada' : r.value)}</div><div class="avs">${pct}</div></div></a>`;
}
function saveSeen() { sessionStorage.setItem('seen_rows', JSON.stringify([...seen].slice(-300))); }
function setStatus(mode, busy) { const p = $('#stat'); if (!p) return; const auto = mode && mode !== 'PAPER';
  p.innerHTML = busy ? '<i class="spin"></i>Actualizando' : `<i class="sd" style="background:${auto ? '#00E676' : '#8E8E93'}"></i>${auto ? 'AUTO' : 'PAPER'}`; }
const RANGES = { LIVE: 'LIVE', '1H': '1H', '4H': '4H', '1D': '1D', '1W': '1W', ALL: 'ALL' };
let WALLET = null;
function toast(title, body, col) { const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<div class="tic" style="background:${col}">◆</div><div><b>${esc(title)}</b><div>${esc(body)}</div></div><span>ahora</span>`;
  document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('in')); setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 500); }, 4200); }
function confetti() { if (RM) return; const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  const w = c.width = innerWidth, h = c.height = innerHeight, x = c.getContext('2d'), cols = ['#00E676', '#FFD60A', '#64D2FF', '#FF2D55', '#fff'];
  const P = Array.from({ length: 160 }, () => ({ x: w / 2, y: h / 3, vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 4, r: Math.random() * 6 + 3, c: cols[Math.random() * 5 | 0], a: Math.random() * 6 }));
  let f = 0; (function tick() { x.clearRect(0, 0, w, h); P.forEach(p => { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (++f < 150) requestAnimationFrame(tick); else c.remove(); })(); }
function events(rows) {
  const fresh = seen.size ? rows.filter(r => !seen.has(r.id)) : [];
  fresh.filter(r => r.kind === 'bought' || r.kind === 'sold' || r.kind === 'stopped').slice(0, 2).forEach(r => {
    const sym = (r.title || '').split(' ').slice(1).join(' ');
    toast(r.kind === 'bought' ? `Compró ${sym}` : r.kind === 'sold' ? `Vendió ${sym}` : `Stop en ${sym}`, `${r.value} · ${r.subtitle || ''}`, r.kind === 'stopped' ? '#FF3B30' : '#00E676'); });
  const done = new Set(JSON.parse(localStorage.getItem('confetti_ids') || '[]'));
  rows.filter(r => r.kind === 'sold' && !done.has(r.id)).forEach(r => { const p = String(r.value).match(/([+-]?\d+(?:\.\d+)?)\s*%/);
    if (p && parseFloat(p[1]) >= 10 && seen.size && !seen.has(r.id)) confetti(); done.add(r.id); });
  localStorage.setItem('confetti_ids', JSON.stringify([...done].slice(-500)));
}
const TIC = { abuelo: '👴', grokcito: '🔎', yila: '🛡', elon: '𝕏', rainer: '👁', radar: '📡' };
function tmMini(t) { const on = t.status === 'activo';
  return `<div class="mini team"><div class="mh"><span class="mic">${TIC[t.id] || '•'}</span><b>${esc(t.name)}</b><span class="sd" style="background:${on ? '#34C759' : '#8E8E93'}" title="${on ? 'activo' : 'en espera'}"></span></div>
   <div class="ms trole">${esc(t.role || '')}${on ? '' : ' · en espera'}</div><div class="mb">${esc(t.big == null ? '–' : t.big)}</div><div class="ms">${esc(t.label || '')}</div><div class="ms tdet">${esc(t.detail || '')}</div></div>`; }
function agMini(a) { const [n, ic] = AG[a.name] || [a.name, '•']; const [sl, sc] = STX[a.status] || [a.status, '#8E8E93'];
  let body = '';
  if (a.name === 'analyst') { const sc2 = a.score == null ? 0 : a.score, R = 26, C = 2 * Math.PI * R;
    body = `<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" stroke="#2C2C2E"/><circle cx="32" cy="32" r="${R}" stroke="${a.score != null && a.score >= a.min_score ? '#00E676' : '#FFD60A'}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - sc2 / 100)}" transform="rotate(-90 32 32)"/><text x="32" y="37">${a.score == null ? '–' : a.score}</text></svg><div class="ms">${a.count} puntuadas · mín ${a.min_score}</div>`; }
  else { const [big, lab, pct] = a.name === 'scanner' ? [a.count, `${a.waiting} en espera`, Math.min(100, a.waiting * 20)] : a.name === 'auditor' ? [a.count, `${a.rejected} rechazadas`, a.count ? 100 * (a.count - a.rejected) / a.count : 0]
      : a.name === 'executor' ? [a.count, `${a.stack_pct}% del stack por operación`, a.progress != null ? a.progress : a.last ? 100 : 0] : [a.open, `stop -${a.stop_pct}% · trail ${a.trail_pct}%`, a.open ? 100 : 0];
    body = `<div class="mb">${big}</div><div class="ms">${esc(lab)}</div><div class="pbar"><i style="width:${pct}%"></i></div>`; }
  return `<div class="mini"><div class="mh"><span class="mic">${ic}</span><b>${n}</b><span class="sd" style="background:${sc}" title="${sl}"></span></div>${body}</div>`; }
function tradeMarks(ch) {
  // Real trade markers on the line (ts in visible range only). Same scales as Charts.line.
  const el = $('#pills'), pts = ch.points || [], tr = Array.isArray(ch.trades) ? ch.trades : []; if (!el) return; el.innerHTML = '';
  if (pts.length < 1 || !tr.length) return;
  const cv = $('#line'), h = cv.clientHeight || 220, w = cv.clientWidth || 1, top = 20, bot = h - 8;
  const t0 = pts[0][0], t1 = Math.max(pts[pts.length - 1][0], t0 + 1);
  let lo = Math.min(ch.start, ...pts.map(p => p[1])), hi = Math.max(ch.start, ...pts.map(p => p[1])); if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const valAt = t => { let i = pts.findIndex(p => p[0] >= t); if (i <= 0) return pts[i < 0 ? pts.length - 1 : 0][1]; const [a, b] = [pts[i - 1], pts[i]]; return a[1] + (b[1] - a[1]) * (t - a[0]) / Math.max(1e-9, b[0] - a[0]); };
  const f2 = v => (v < 0 ? '-' : '+') + '$' + Math.abs(v).toFixed(2);
  el.innerHTML = tr.filter(t => t.ts >= t0 && t.ts <= t1 + 120).map((t, i) => {
    const fx = (Math.min(t.ts, t1) - t0) / (t1 - t0), x = fx * w, L = (fx * 100).toFixed(2) + '%', y = bot - (valAt(t.ts) - lo) / (hi - lo) * (bot - top);
    const tip = esc((t.symbol || '') + ' ' + t.side + ' ' + tm(t.ts));
    if (t.side === 'buy') return `<span class="tmk buy" title="${tip}" style="left:${L};top:${y.toFixed(1)}px;animation-delay:${600 + i * 80}ms"></span>`;
    const p = Number(t.pnl_usd) || 0, win = p >= 0, txt = win ? f2(p) : (t.pnl_pct != null ? Math.round(t.pnl_pct) + '% · ' : '') + f2(p);
    return `<span class="tmk dot ${win ? 'g' : 'r'}" style="left:${L};top:${y.toFixed(1)}px;animation-delay:${600 + i * 80}ms"></span><span class="tbadge ${win ? 'g' : 'r'}" title="${tip}" style="left:${L};top:${(y - 22).toFixed(1)}px;--ax:${fx < .12 ? '0%' : fx > .88 ? '-100%' : '-50%'};animation-delay:${600 + i * 80}ms">${esc(txt)}</span>`;
  }).join('');
}
const FIC = {
  buy: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  sell: '<svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 3 7-9M15 6h5v5"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7c0 2.6 1.4 4.3 3 5.3V19h8v-3.7c1.6-1 3-2.7 3-5.3a7 7 0 0 0-7-7z"/><circle cx="9.3" cy="10.5" r="1.3"/><circle cx="14.7" cy="10.5" r="1.3"/><path d="M10.5 19v2M13.5 19v2"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/></svg>' };
function feedSec(fd) {
  const rows = fd && Array.isArray(fd.rows) ? fd.rows : [];
  const row = r => { const c = r.tone === 'g' ? '#00E676' : r.tone === 'r' ? '#FF3B30' : '#8E8E93';
    const tag = r.mint ? 'a' : 'div', href = r.mint ? ` href="#/coin/${esc(r.mint)}"` : '';
    return `<${tag} class="arow frow"${href}><div class="aic fic" style="background:${c}22;color:${c}">${FIC[r.kind] || FIC.info}</div><div class="am"><div>${esc(r.title)}</div><div>${esc(r.agent)} · ${r.ts ? tmB(r.ts) : ''}</div></div><div class="av"><div style="color:${c}">${esc(r.value || '')}</div></div></${tag}>`; };
  return `<section class="feedsec"><h3>Actividad <a href="#/activity" class="vt">Ver todo</a></h3>${fd && !fd.real && rows.length ? '<div class="fnote">Aún no hay operaciones con dinero real · actividad reciente de los agentes</div>' : ''}<div class="feedl">${rows.length ? rows.map(row).join('') : '<div class="empty">Sin actividad todavía</div>'}</div></section>`;
}
let COINS = null;
async function search() {
  V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Inicio</a><span class="lbl">Buscar</span></div>
   <div class="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="q" type="search" placeholder="Símbolo o mint" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
   <div class="feedl" id="sres"><div class="empty">Cargando monedas…</div></div>`;
  const q = $('#q'); q.focus();
  if (!COINS) COINS = (await api('coins').catch(() => ({ rows: [] }))).rows || [];
  const draw = () => { const t = q.value.trim().toLowerCase();
    const L = (t ? COINS.filter(c => c.s.toLowerCase().includes(t) || c.n.toLowerCase().includes(t) || c.m.toLowerCase().startsWith(t) || (t.length > 8 && c.m.toLowerCase().includes(t))) : COINS).slice(0, 30);
    $('#sres').innerHTML = L.length ? L.map(c => `<a class="arow" href="${c.p || !DP() ? '#/coin/' + esc(c.m) : esc(c.u)}">${tokImg(c.m, c.s || c.n)}<div class="am"><div>${esc(c.s || c.n || c.m.slice(0, 6))}</div><div class="mono">${c.n ? esc(c.n) + " · " : ""}${short(c.m)}</div></div><div class="av"><div class="avs">${c.p || !DP() ? 'ver ›' : 'FOMO ›'}</div></div></a>`).join('')
      : `<div class="empty">${COINS.length ? 'Sin resultados' : 'Sin monedas todavía'}</div>`; };
  q.oninput = draw; draw();
}
async function home() {
  const [st, ch, ac, acct, tm8, fd] = await Promise.all([api('state'), api('chart?range=' + RANGES[S.range]), api('activity'), WALLET ? Promise.resolve(null) : api('account').catch(() => null), api('team').catch(() => null), api('feed').catch(() => null)]); S.state = st;
  const team = (tm8 && Array.isArray(tm8.team)) ? tm8.team : [];
  if (acct && acct.wallet) WALLET = acct.wallet.address;
  const A = n => st.agents.find(a => a.name === n) || {};
  const rows = ac.rows, closed = rows.filter(r => r.kind === 'sold' || r.kind === 'stopped');
  const wins = rows.filter(r => r.kind === 'sold').length;
  const pcts = closed.map(r => num(r.value)).filter(x => !isNaN(x)).sort((a, b) => a - b);
  const med = pcts.length ? pcts[Math.floor(pcts.length / 2)] : null;
  const rej = A('auditor').rejected || 0, scanned = A('scanner').count || 0, buys = A('executor').count || 0;
  const fees = rows.filter(r => r.kind === 'fee');
  const sv = st.start_value || st.balance, pnl = st.balance - sv, up = pnl >= 0, mult = sv ? st.balance / sv : 1;
  const act = st.agents.filter(a => a.status === 'running').length + team.filter(t => t.status === 'activo').length;
  events(rows);
  V.innerHTML = `<div class="hero"><div class="hl"><span>Desk • <span class="mono">${short(WALLET)}</span></span><span id="clock" class="mono">${BOG(Date.now())}</span></div>
   <div class="bal big" id="bal"></div><div class="pnl" style="color:${up ? '#00E676' : '#FF3B30'}">${up ? '+' : '−'}${usd(Math.abs(pnl))} (${up ? '+' : ''}${st.today_pct.toFixed(2)}%) <span>hoy</span> <i class="mult ${up ? '' : 'dn'}"><svg viewBox="0 0 12 12"><path d="${up ? 'M1 9l3.5-3.5 2 2L11 3M8 3h3v3' : 'M1 3l3.5 3.5 2-2L11 9M8 9h3V6'}"/></svg>${mult.toFixed(2)}x</i></div>${st.real && st.sol != null ? `<div class="solln mono">${Number(st.sol).toFixed(4)} SOL · 1 SOL = ${usd(st.sol_price)} · dinero real</div>` : ''}</div>
   <div class="chartw"><canvas id="line"></canvas><div id="pills"></div></div><div class="rg">${Object.keys(RANGES).map(r => `<button data-r="${r}" class="${r === S.range ? 'on' : ''}">${r === 'LIVE' ? '<i class="pulse"></i>' : ''}${r}</button>`).join('')}</div>
   <div class="mobonly"><h3>Agentes <span class="apill">${act} activos</span></h3><div class="carousel2">${st.agents.map(agMini).join('')}${team.map(tmMini).join('')}</div></div>
   ${feedSec(fd)}
   <h3>El desk hoy</h3><div class="grid">
    <div class="st"><div class="si" style="color:#00E676">◎</div><div class="sl">Escaneadas</div><div class="sv">${scanned}</div><div class="ss">${A('scanner').waiting || 0} en espera</div></div>
    <div class="st"><div class="si" style="color:#00E676">↓</div><div class="sl">Compras</div><div class="sv">${buys}</div><div class="ss">${closed.length ? `${wins} ganadoras · mediana ${med > 0 ? '+' : ''}${med != null ? med.toFixed(1) + '%' : '—'}` : 'sin cierres aún'}</div></div>
    <div class="st"><div class="si" style="color:#FF3B30">✕</div><div class="sl">Rechazadas / perdidas</div><div class="sv" style="color:#FF3B30">${rej + rows.filter(r => r.kind === 'stopped').length}</div><div class="ss">${A('auditor').count ? Math.round(rej / A('auditor').count * 100) + '% de auditadas' : '—'}</div></div>
    <div class="st"><div class="si" style="color:#F6851B">⇡</div><div class="sl">Comisiones</div><div class="sv" style="color:#F6851B">${fees.length ? esc(fees.map(f => f.value).join(' ')) : '$0.00'}</div><div class="ss">${st.mode === 'PAPER' ? 'modo práctica' : 'swaps reales'}</div></div>
   </div>
   <div class="two"><section></section>
   <aside class="deskonly"><h3>Agentes <span class="apill">${act} de ${st.agents.length} activos</span></h3>${st.agents.map(a => agCard(a, null)).join('')}</aside></div>`;
  saveSeen(); setStatus(st.mode);
  odometer($('#bal'), st.balance); Charts.line($('#line'), ch.points, ch.start, []);
  tradeMarks(ch);
  V.querySelectorAll('.rg button').forEach(b => b.onclick = () => { S.range = b.dataset.r; render(); });
}
const AG = { scanner: ['Scanner', '◎', 'Vigila graduaciones'], auditor: ['Auditor', '⛨', 'Revisa 8 capas'], analyst: ['Analyst', '◔', 'Puntúa (reglas)'], executor: ['Executor', '⚡', 'Compra y vende'], risk: ['Risk', '⛉', 'Stop y trailing'] };
const STX = { running: ['activo', '#34C759'], paused: ['pausado', '#8E8E93'], error: ['error', '#FF4500'] };
function agInfo(a) { return a.name === 'scanner' ? `${a.count} pools · ${a.waiting} en espera` : a.name === 'auditor' ? `${a.count} auditadas · ${a.rejected} rechazadas` : a.name === 'analyst' ? `${a.count} puntuadas · mínimo ${a.min_score}` : a.name === 'executor' ? `${a.count} operaciones · ${a.stack_pct}% por operación` : `${a.open} abiertas · stop -${a.stop_pct}% · trail ${a.trail_pct}%`; }
function agCard(a, rows) { const [n, ic, d] = AG[a.name] || [a.name, '•', '']; const [sl, sc] = STX[a.status] || [a.status, '#8E8E93'];
  return `<div class="sheet"><div class="arow" style="border:0;padding:0"><div class="aic" style="background:${sc}22;color:${sc}">${ic}</div><div class="am"><div>${n}</div><div>${d} · ${esc(agInfo(a))}</div></div><div class="av" style="color:${sc}">${sl}</div></div>
   ${DP() || !rows ? '' : `<button class="switch ${a.status !== 'paused' ? 'on' : ''}" data-a="${a.name}" ${a.name === 'risk' && a.open ? 'disabled' : ''}></button>`}
   ${rows ? `<div class="dec">${rows.length ? rows.slice(0, 6).map(r => `<div><span class="mono">${tmB(r.ts)}</span><span>${esc(r.coin || r.mint.slice(0, 6))}</span><span style="color:${/kill|reject|fail|stop|^red$/i.test(r.verdict) ? '#FF4500' : '#34C759'}">${esc(r.verdict)}</span><span>${esc(r.reason || '')}</span></div>`).join('') : '<div style="color:#8E8E93;display:block">Sin decisiones todavía</div>'}</div>` : ''}</div>`; }
async function activity() {
  const ac = await api('activity'); if (!DP()) api('pushes/read', { method: 'POST' }).catch(() => {});
  V.innerHTML = `<h3 style="margin-top:8px">Actividad</h3>${pushBox()}<div class="feedl">${ac.rows.length ? ac.rows.map(actRow).join('') : '<div class="empty">Sin actividad todavía</div>'}</div>`; saveSeen(); const pb = document.getElementById('pushon'); if (pb) pb.onclick = enablePush;
}
async function audit(mint) {
  const a = await api('audit/' + mint); const L = a.layers;
  if (!L.length) { V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Back</a></div><div class="empty">${esc(a.name || mint.slice(0, 8))} hasn't been taken apart yet.</div><a class="btn" href="${esc(a.coin_url)}">Open on FOMO</a>`; return; }
  V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Back</a><span class="lbl">${esc(a.name || '')}</span></div>
   <div class="discs">${L.map(l => `<div class="disc" data-n="${l.n}"></div>`).join('')}</div>
   <div class="rows">${L.map(l => `<div data-row="${l.n}"><span>${l.n} · ${esc(l.name)}</span><span>…</span></div>`).join('')}</div>
   <div id="vd"></div><div class="row"><span>Take apart before buying</span><button class="switch ${a.enabled ? 'on' : ''}" id="aud"></button></div>
   <a class="btn" href="${esc(a.coin_url)}">Open on FOMO</a>`;
  const finish = () => { $('#vd').innerHTML = a.passed ? `<div class="verdict ok">Cleared · 8/8 parts</div><div class="lbl">Sent to Executor${a.size ? ' · ' + usd(a.size) : ''}</div>` : `<div class="verdict bad">Rejected · ${esc(a.reason)}</div><div class="lbl" style="color:var(--t2)">Grok Bot won't buy ${esc(a.name || '')}</div>`; };
  const show = l => { const d = V.querySelector(`.disc[data-n="${l.n}"]`), r = V.querySelector(`[data-row="${l.n}"]`); if (!d) return;
    d.className = 'disc ' + (l.pass ? 'ok' : l.pass === false ? 'bad' : ''); r.className = l.pass ? 'ok' : l.pass === false ? 'bad' : 'nc'; r.lastChild.textContent = l.value; };
  if (RM) { L.forEach(show); finish(); }
  else { for (const l of L) { const d = V.querySelector(`.disc[data-n="${l.n}"]`); if (!d) return; d.className = 'disc beam'; await new Promise(r => setTimeout(r, 350)); await new Promise(r => setTimeout(r, 150)); show(l); } finish(); }
  $('#aud').onclick = async () => { const on = $('#aud').classList.contains('on'); if (on && !(confirm('Turn off the Auditor?') && confirm('Really buy coins without taking them apart?'))) return;
    await api('settings', { method: 'POST', body: JSON.stringify({ 'auditor.enabled': !on }) }); $('#aud').classList.toggle('on'); };
}
async function coin(mint) {
  if (!S.state) S.state = await api('state').catch(() => null);
  const c = await api('coin/' + mint).catch(e => { if (String(e.message) === '404' || /unknown/.test(e.message)) return null; throw e; });
  if (!c) { V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Inicio</a></div><div class="empty">Moneda desconocida. El desk solo tiene datos de monedas que ha visto.</div>`; return; }
  const p = c.position, open = p && (p.status === 'open' || p.status === 'exiting');
  const ch = c.candles && c.candles.length > 1 ? (c.candles[c.candles.length - 1].c / c.candles[0].o - 1) * 100 : null;
  const pc = p ? p.since_entry_pct : ch, upc = pc == null || pc >= 0;
  V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Inicio</a>${c.shield ? `<span class="spill" style="color:#00E676">🛡 ${esc(c.shield)}</span>` : ''}</div>
   <div class="ch">${tokImg(mint, c.symbol || c.name, 48)}<div><div style="font-size:22px;font-weight:700">${esc(c.name || mint.slice(0, 8))}</div><div class="ss">${esc(c.symbol || '')} · Solana · ${esc(c.age_h)}h</div></div></div>
   <div class="bal big" style="font-size:44px">${c.price != null ? '$' + Number(c.price).toPrecision(4) : 'n/a'}</div>
   <div class="pnl" style="color:${upc ? '#00E676' : '#FF3B30'}">${pc != null ? `${upc ? '▲' : '▼'} ${Math.abs(pc).toFixed(2)}%` : ''} <span>${p ? 'desde la compra' : 'en el gráfico'}</span></div>
   <div class="chartw"><canvas id="cd"></canvas><div id="lvls"></div></div>
   <div class="grid" style="margin-top:14px"><div class="st"><div class="sl">Market cap</div><div class="sv">${kusd(c.mcap)}</div></div><div class="st"><div class="sl">Liquidez</div><div class="sv">${kusd(c.liq)}</div></div>
    <div class="st"><div class="sl">Holders</div><div class="sv">${c.holders != null ? Number(c.holders).toLocaleString() : 'n/a'}</div></div><div class="st"><div class="sl">Vol 24h</div><div class="sv">${kusd(c.v24)}</div></div></div>
   ${p ? `<h3>Tu posición</h3><div class="feedl" style="padding:6px 16px"><div class="row"><span>Invertido</span><span>${usd(p.size_usd)}</span></div><div class="row"><span>Precio de compra</span><span class="mono">$${Number(p.entry_price).toPrecision(4)}</span></div>
     <div class="row"><span>Stop</span><span class="mono" style="color:#FF3B30">$${Number(p.stop_price).toPrecision(4)} · -${p.stop_pct}%</span></div>
${p.mode_label ? `<div class="row"><span>Modo</span><span style="color:#00E676">${esc(p.mode_label)}</span></div>` : `
     <div class="row"><span>Trailing</span><span>${p.trail_line ? '$' + Number(p.trail_line).toPrecision(4) : 'no activo'}</span></div>`}
     ${p.compare ? `<div class="row"><span>Comparación</span><span class="mono" style="font-size:12px">${esc(p.compare)}</span></div>` : ''}
     ${p.compare_total ? `<div class="row"><span>Total</span><span style="font-size:12px">${esc(p.compare_total)}</span></div>` : ''}
     <div class="row" style="border:0"><span>${open ? 'Cierra en' : 'Cerrada'}</span><span>${open ? (p.timeout_left_s == null ? 'sin límite' : Math.floor(p.timeout_left_s / 3600) + 'h ' + Math.floor(p.timeout_left_s % 3600 / 60) + 'm') : esc(p.exit_reason)}</span></div></div>` : ''}
   <h3>Info</h3><div class="feedl" style="padding:6px 16px"><div class="row"><span>Mint</span><span class="mono">${short(mint)}</span></div><div class="row" style="border:0"><span>Auditoría</span><a href="#/audit/${esc(mint)}" style="color:#00E676">${esc(c.shield || 'ver')} ›</a></div></div>
   <a class="btn" href="${esc(c.coin_url)}">Ver en FOMO</a>`;
  Charts.candles($('#cd'), c.candles, null);
  if (p && c.candles && c.candles.length) { let lo = Math.min(...c.candles.map(k => k.l)), hi = Math.max(...c.candles.map(k => k.h)); const L = [['Compra', p.entry_price, 'cy'], ['Stop', p.stop_price, 'r']];
    L.forEach(([, v]) => { lo = Math.min(lo, v); hi = Math.max(hi, v); }); const H = 240 - 48;
    $('#lvls').innerHTML = L.map(([t, v, k]) => `<div class="lvl ${k}" style="top:${6 + (hi - v) / ((hi - lo) || 1) * (H - 12)}px"><span>${t} $${Number(v).toPrecision(3)}</span></div>`).join(''); }
}
const SL = {
 'scanner.min_liquidity_usd': ['Liquidez mínima ($)', 'Ignora monedas con menos dinero en el pool'], 'scanner.max_top10_pct': ['Máx. en manos del top 10 (%)', 'Descarta si 10 billeteras tienen demasiado'],
 'scanner.max_h1_change_pct': ['Subida máx. en 1h (%)', 'No persigue monedas que ya subieron mucho'], 'scanner.poll_s': ['Revisar cada (s)', 'Cada cuánto vuelve a mirar'],
 'scanner.min_pool_age_min': ['Edad mínima del pool (min)', 'Espera a que el pool tenga esta edad'], 'scanner.max_wait_min': ['Espera máxima (min)', 'Tiempo máximo vigilando una moneda'],
 'scanner.runner_h24_pct': ['Ya disparada en 24h (%)', 'Marca monedas que ya subieron demasiado'], 'scanner.ws_silent_s': ['Alerta sin datos (s)', 'Reconecta si la fuente calla'],
 'auditor.enabled': ['Auditor activo', 'Revisa cada moneda antes de comprar'], 'auditor.max_dev_pct': ['Máx. del creador (%)', 'Tokens que puede tener el creador'],
 'auditor.max_top10_pct': ['Máx. top 10 (%)', 'Concentración máxima permitida'], 'auditor.min_lp_locked_pct': ['Liquidez bloqueada mín. (%)', 'Que no puedan retirar el pool'],
 'auditor.min_pool_age_min': ['Edad mínima del pool (min)', ''], 'auditor.max_bundled': ['Máx. billeteras agrupadas', 'Compras coordinadas al lanzar'],
 'auditor.max_delegated_accounts': ['Máx. cuentas delegadas', 'Permisos sospechosos'], 'auditor.retries': ['Reintentos', 'Si una fuente falla'],
 'analyst.mode': ['Modo', 'rules = reglas fijas'], 'analyst.min_alive_6h': ['Vida mínima 6h', 'Probabilidad de seguir activa'], 'analyst.min_organic': ['Compras orgánicas mín.', 'Gente real vs bots'],
 'analyst.max_chase': ['Persecución máx.', 'Evita comprar tarde'], 'analyst.min_score': ['Puntaje mínimo', 'Desde aquí manda a comprar'], 'analyst.timeout_s': ['Tiempo máx. (s)', ''],
 'analyst.rules.alive_volume_h1': ['Volumen 1h para "viva" ($)', ''], 'analyst.rules.organic_buys_h1': ['Compras/h orgánicas', ''], 'analyst.rules.bundled_penalty': ['Castigo por agrupadas', ''],
 'analyst.rules.bundled_from': ['Agrupadas desde', ''], 'analyst.rules.flush_drop_m5_pct': ['Caída en 5 min (%)', 'Señal de venta masiva'], 'analyst.rules.chase_h1_pct': ['Subida 1h = tarde (%)', ''],
 'executor.stack_pct': ['% del stack (práctica)', 'Tamaño de cada compra en PAPER'], 'executor.max_pool_pct': ['Máx. del pool (%)', 'No mover demasiado el precio'],
 'executor.min_ticket_usd': ['Compra mínima práctica ($)', ''], 'executor.below_min': ['Si es menor al mínimo', 'bump = subir, skip = saltar'],
 'executor.recheck_liq_drop_pct': ['Cancelar si liquidez cae (%)', 'Revisión justo antes de comprar'], 'executor.recheck_price_up_pct': ['Cancelar si precio sube (%)', ''], 'executor.confirm_window_min': ['Ventana de confirmación (min)', ''],
 'risk.poll_s': ['Revisar posición cada (s)', ''], 'risk.stop_pct': ['Stop (%)', 'Vende si cae esto desde la compra'], 'risk.trail_start_pct': ['Trailing empieza en (+%)', 'Desde esta ganancia persigue el pico'],
 'risk.trail_pct': ['Trailing desde el pico (%)', 'Vende si baja esto desde el máximo'], 'risk.timeout_h': ['Salida por tiempo (h)', 'Vende si no despega'], 'risk.timeout_min_gain_pct': ['Ganancia mín. para quedarse (%)', ''], 'risk.confirm_window_min': ['Ventana de confirmación (min)', ''],
 'desk.paper_start_stack': ['Saldo de práctica ($)', ''], 'desk.report_time': ['Hora del reporte', 'Hora Bogotá'], 'desk.notifier': ['Avisos por', ''], 'desk.rpc_url': ['Nodo Solana', ''],
 'desk.push_rejects': ['Avisar rechazos', ''], 'desk.fomo_handle': ['Usuario FOMO', ''],
 'auto.ticket_usd': ['Compra por operación ($)', 'Dinero real por compra'], 'auto.max_open': ['Posiciones abiertas máx.', ''], 'auto.min_reserve_sol': ['Reserva para comisiones (SOL)', ''],
 'auto.slippage_bps': ['Slippage (bps)', '100 bps = 1%'], 'auto.priority_max_lamports': ['Prioridad máx. (lamports)', ''], 'auto.max_day_loss_pct': ['Pérdida máx. del día (%)', 'Se apaga solo si pierde esto']
};
const SG = { scanner: 'Scanner · busca monedas', auditor: 'Auditor · revisa seguridad', analyst: 'Analyst · puntúa', executor: 'Executor · compra', risk: 'Risk · protege', auto: 'AUTO · dinero real', desk: 'Desk · general' };
const HIDE = new Set(['desk.mode', 'desk.stack', 'desk.fees_ref_discount']);
async function account() {
  const [ac, st, ss] = await Promise.all([api('account'), api('settings'), S.state ? Promise.resolve(S.state) : api('state').catch(() => null)]); if (ss) S.state = ss;
  const v = st.settings, auto = ac.mode !== 'PAPER', ro = !!DP(), w = ac.wallet || {};
  const fmt = (k, x) => typeof x === 'boolean' ? (x ? 'Sí' : 'No') : esc(x);
  const row = k => { const [l, d] = SL[k] || [k.split('.').slice(1).join(' '), ''], m = st.meta[k], x = v[k];
    let ctl = `<span class="sv2 mono">${fmt(k, x)}</span>`;
    if (!ro) ctl = m.type === 'bool' ? `<button class="switch ${x ? 'on' : ''}" data-k="${k}" data-bool></button>` : m.type === 'choice' ? `<select data-k="${k}">${m.choices.map(c => `<option ${c === x ? 'selected' : ''}>${c}</option>`).join('')}</select>` : `<input class="mono" data-k="${k}" value="${esc(x)}" style="width:110px">`;
    return `<div class="row"><span><b class="rl">${l}</b>${d ? `<small>${d}</small>` : ''}</span>${ctl}</div>`; };
  const groups = {}; Object.keys(v).filter(k => !HIDE.has(k) && SL[k] !== undefined || (!HIDE.has(k) && !SL[k])).filter(k => !HIDE.has(k)).forEach(k => { const g = k.split('.')[0]; (groups[g] = groups[g] || []).push(k); });
  const order = ['auto', 'risk', 'scanner', 'auditor', 'analyst', 'executor', 'desk'].filter(g => groups[g]);
  V.innerHTML = `<h3 style="margin-top:8px">Cuenta</h3>
   <div class="feedl" style="padding:6px 16px">
    <div class="row"><span><b class="rl">Modo</b><small>${auto ? 'Opera con la billetera real del bot' : 'Práctica, sin dinero real'}</small></span><span class="spill"><i class="sd" style="background:${auto ? '#00E676' : '#8E8E93'}"></i>${auto ? 'AUTO · dinero real' : 'PAPER · práctica'}</span></div>
    ${auto ? `<div class="row"><span><b class="rl">Billetera del bot</b><small>Toca para verla en Solscan</small></span><a class="mono" style="color:#00E676" href="https://solscan.io/account/${esc(w.address)}" target="_blank" rel="noopener">${short(w.address)} ↗</a></div>
    <div class="row"><span><b class="rl">Saldo</b><small>${w.sol != null ? Number(w.sol).toFixed(4) + ' SOL' : ''}</small></span><span class="sv2">${ss && ss.real ? usd(ss.balance) : 'n/a'}</span></div>
    <div class="row"><span><b class="rl">Compra por operación</b></span><span class="sv2">${usd(v['auto.ticket_usd'])}</span></div>
    <div class="row"><span><b class="rl">Stop</b><small>Vende si cae esto desde la compra</small></span><span class="sv2" style="color:#FF3B30">-${v['risk.stop_pct']}%</span></div>
    <div class="row"><span><b class="rl">Trailing</b><small>Empieza en +${v['risk.trail_start_pct']}% y vende si baja ${v['risk.trail_pct']}% desde el pico</small></span><span class="sv2" style="color:#00E676">+${v['risk.trail_start_pct']}% / ${v['risk.trail_pct']}%</span></div>
    <div class="row"><span><b class="rl">Salida por tiempo</b><small>Vende si no despega</small></span><span class="sv2">${v['risk.timeout_h']}h</span></div>
    <div class="row"><span><b class="rl">Apagado por pérdida diaria</b><small>Vuelve a práctica si pierde esto en el día</small></span><span class="sv2" style="color:#FF3B30">${v['auto.max_day_loss_pct']}%</span></div>` : `<div class="row"><span><b class="rl">Saldo de práctica</b></span><span class="sv2">${ss ? usd(ss.balance) : 'n/a'}</span></div>`}
    <a class="row" href="${esc(ac.profile_url)}"><span><b class="rl">Tu perfil FOMO</b></span><span>@${esc(ac.fomo_handle)} ›</span></a>
    <div class="row" style="border:0"><span><b class="rl">Telegram</b></span><span>${ac.telegram ? 'conectado' : 'no conectado · envía /start al bot'}</span></div></div>
   ${ro ? '<div class="note">Para cambiar ajustes, usa Telegram</div>' : '<div id="msg" class="note"></div>'}
   ${order.map(g => `<h3 id="s-${g}">${SG[g] || g}</h3><div class="feedl" style="padding:2px 16px">${groups[g].map(row).join('')}</div>`).join('')}`;
  if (ro) return;
  const save = async (k, x) => { try { await api('settings', { method: 'POST', body: JSON.stringify({ [k]: x }) }); $('#msg').textContent = 'Guardado'; } catch (e) { $('#msg').textContent = e.message; } };
  V.querySelectorAll('input[data-k],select[data-k]').forEach(i => i.onchange = () => save(i.dataset.k, i.value));
  V.querySelectorAll('[data-bool]').forEach(b => b.onclick = () => { b.classList.toggle('on'); save(b.dataset.k, b.classList.contains('on')); });
}
// ---- v14 redesign: robots, chat feed, Trades, Billetera ----
const BOTS = { scanner: ['#00E676', 'happy', 'Busca monedas nuevas'], auditor: ['#FF5A5F', 'focus', 'Revisa seguridad (8 capas)'], analyst: ['#FFD60A', 'think', 'Puntúa cada moneda'], executor: ['#64D2FF', 'happy', 'Compra y vende'], risk: ['#FF6B9A', 'focus', 'Protege con stop'],
  abuelo: ['#B388FF', 'sleepy', ''], grokcito: ['#40C4FF', 'happy', ''], yila: ['#69F0AE', 'focus', ''], elon: ['#E0E0E0', 'wink', ''], rainer: ['#FFAB40', 'wide', ''], radar: ['#18FFFF', 'wide', ''] };
const NAME2ID = { 'GROK ABUELO': 'abuelo', 'GROKCITO': 'grokcito', 'Yila': 'yila', 'Elon Musk': 'elon', 'RAINER': 'rainer', 'GROK RADAR': 'radar', Scanner: 'scanner', Auditor: 'auditor', Analyst: 'analyst', Executor: 'executor', Risk: 'risk' };
function botSvg(id, size = 64, cls = '') { const [c, ex] = BOTS[id] || ['#9ecbff', 'happy'];
  const eye = (x) => ex === 'sleepy' ? `<path d="M${x - 6} 52q6 4 12 0" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : ex === 'wink' && x > 50 ? `<path d="M${x - 6} 51h12" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`
    : `<g class="eye"><ellipse cx="${x}" cy="50" rx="${ex === 'wide' ? 7 : 6}" ry="${ex === 'focus' ? 5 : ex === 'wide' ? 9 : 8}" fill="${c}"/><circle cx="${x + 2}" cy="47" r="2" fill="#fff" opacity=".9"/></g>`;
  return `<svg class="bot ${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="bg${id}" cx="40%" cy="30%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd8ec"/></radialGradient></defs>
   <line x1="50" y1="10" x2="50" y2="22" stroke="#dfe7f7" stroke-width="3"/><circle cx="50" cy="9" r="4.5" fill="${c}"/>
   <rect x="12" y="22" width="76" height="60" rx="30" fill="url(#bg${id})"/><rect x="21" y="34" width="58" height="34" rx="17" fill="#0b1430"/>
   ${eye(39)}${eye(61)}${ex === 'think' ? '' : `<path d="M44 74q6 3 12 0" stroke="#9aa7c4" stroke-width="2.5" fill="none" stroke-linecap="round"/>`}</svg>`; }
function chatRows(fd, ac, tr) { const out = [];
  (tr || []).forEach(t => out.push({ ts: t.ts, id: t.side === 'buy' ? 'executor' : 'risk', who: t.side === 'buy' ? 'Executor' : 'Risk', tag: t.side === 'buy' ? 'COMPRA' : 'VENTA',
    text: t.side === 'buy' ? `Compré ${t.symbol || ''}` : `Vendí ${t.symbol || ''} · ${t.pnl_usd >= 0 ? '+' : '−'}$${Math.abs(t.pnl_usd || 0).toFixed(2)}${t.pnl_pct != null ? ` (${t.pnl_pct}%)` : ''}`, mint: t.mint }));
  ((fd && fd.rows) || []).forEach(r => { if (r.kind === 'buy' || r.kind === 'sell') return; out.push({ ts: r.ts, id: NAME2ID[r.agent] || 'scanner', who: r.agent, text: r.title + (r.value ? ' · ' + r.value : ''), mint: r.mint, tone: r.tone }); });
  ((ac && ac.rows) || []).filter(r => r.kind === 'bought' || r.kind === 'sold' || r.kind === 'stopped').forEach(r => { if (out.some(o => o.mint === r.mint && o.tag && Math.abs(o.ts - r.ts) < 120)) return;
    out.push({ ts: r.ts, id: AGL[r.agent] ? r.agent : 'executor', who: AGL[r.agent] || r.agent, tag: r.kind === 'bought' ? 'COMPRA' : 'VENTA', text: `${KIND[r.kind][2]} ${(r.title || '').split(' ').slice(1).join(' ')} · ${r.value}`, mint: r.mint }); });
  return out.sort((a, b) => b.ts - a.ts); }
function chatHtml(rows, n) { if (!rows.length) return '<div class="empty">Los agentes todavía no han hablado</div>';
  return rows.slice(0, n).map((r, i) => `<${r.mint ? `a href="#/coin/${esc(r.mint)}"` : 'div'} class="msg" style="animation-delay:${Math.min(i, 12) * 70}ms">${botSvg(r.id, 34)}<div class="mb2"><div class="mh2"><b>${esc(r.who)}</b><span>${r.ts ? tmB(r.ts) : ''}</span></div>
   <div class="bub">${r.tag ? `<i class="tag ${r.tag === 'COMPRA' ? 'g' : 'r'}">${r.tag}</i>` : ''}${esc(r.text)}</div></div></${r.mint ? 'a' : 'div'}>`).join(''); }
async function agents() {
  const [st, tm8, fd, ac, ch] = await Promise.all([api('state'), api('team').catch(() => null), api('feed').catch(() => null), api('activity').catch(() => ({ rows: [] })), api('chart?range=ALL').catch(() => ({}))]); S.state = st; setStatus(st.mode);
  const team = (tm8 && tm8.team) || [];
  const cards = st.agents.map(a => ({ id: a.name, name: (AG[a.name] || [a.name])[0], role: (AG[a.name] || [, , ''])[2], on: a.status === 'running', info: agInfo(a) }))
    .concat(team.map(t => ({ id: t.id, name: t.name, role: t.role, on: t.status === 'activo', info: `${t.big == null ? '–' : t.big} ${t.label || ''}${t.detail ? ' · ' + t.detail : ''}` })));
  const on = cards.filter(c => c.on).length;
  V.innerHTML = `<h3 class="ttl">Agentes <span class="apill">${on} de ${cards.length} activos</span></h3>
   <div class="botcar">${cards.map(c => `<div class="botc ${c.on ? '' : 'off'}">${botSvg(c.id, 86, 'float')}<b>${esc(c.name)}</b><small>${esc(c.role)}</small><span class="bst"><i class="sd" style="background:${c.on ? '#00E676' : '#8E8E93'}"></i>${c.on ? 'activo' : 'en espera'}</span><div class="binfo">${esc(c.info)}</div></div>`).join('')}</div>
   <h3>Conversación en vivo <span class="live"><i class="pulse"></i>LIVE</span></h3><div class="chat">${chatHtml(chatRows(fd, ac, ch.trades), 40)}</div>
   <div class="deskonly"><h3>Decisiones</h3>${st.agents.map(a => agCard(a, null)).join('')}</div>`; }
function eyesLoop() { if (RM) return; const big = document.querySelector('.bigbot'); if (!big || big.dataset.on) return; big.dataset.on = 1;
  const eyes = big.querySelectorAll('.eye'); let i = 0;
  const P = [[0, 0], [5, -2], [5, 2], [0, 0], [-5, -1], [-5, 3], [0, -3], [2, 1]];
  (function step() { if (!document.body.contains(big)) return; const [x, y] = P[i++ % P.length]; eyes.forEach(e => e.style.transform = `translate(${x}px,${y}px)`);
    if (Math.random() < .25) eyes.forEach(e => { e.animate([{ transform: `translate(${x}px,${y}px) scaleY(1)` }, { transform: `translate(${x}px,${y}px) scaleY(.1)` }, { transform: `translate(${x}px,${y}px) scaleY(1)` }], { duration: 220 }); });
    setTimeout(step, 1300 + Math.random() * 900); })(); }
function tradeStats(st, trs) { const sells = trs.filter(t => t.side === 'sell'), wins = sells.filter(t => (t.pnl_usd || 0) > 0).length, buys = trs.filter(t => t.side === 'buy');
  const sold = new Set(sells.map(t => t.mint + ':' + t.ts)); const openB = buys.filter(b => !sells.some(s => s.mint === b.mint && s.ts >= b.ts));
  const base = 50, mult = st.balance / base;
  return { sells, wins, buys, openB, mult, wr: sells.length ? Math.round(wins / sells.length * 100) : null }; }
async function trades() {
  const [st, ch, fd, ac] = await Promise.all([api('state'), api('chart?range=ALL'), api('feed').catch(() => null), api('activity').catch(() => ({ rows: [] }))]); S.state = st; const dp = st.dip, ls = st.loose; setStatus(st.mode);
  const trs = ch.trades || [], T = tradeStats(st, trs), up = T.mult >= 1;
  const tr = (t, sell) => `<a class="arow" href="#/coin/${esc(t.mint)}">${tokImg(t.mint, t.symbol)}<div class="am"><div><i class="tag ${sell ? ((t.pnl_usd || 0) >= 0 ? 'g' : 'r') : 'g'}">${sell ? 'VENTA' : 'COMPRA'}</i> ${esc(t.symbol || short(t.mint))}</div><div>${tmB(t.ts)}${t.reason ? ' · ' + esc(t.reason) : ''}</div></div><div class="av"><div style="color:${!sell ? '#fff' : (t.pnl_usd || 0) >= 0 ? '#00E676' : '#FF3B30'}">${sell ? `${t.pnl_usd >= 0 ? '+' : '−'}$${Math.abs(t.pnl_usd).toFixed(2)}` : 'abierta'}</div><div class="avs">${sell && t.pnl_pct != null ? t.pnl_pct + '%' : ''}</div></div></a>`;
  V.innerHTML = `<div class="thero">${botSvg('executor', 150, 'bigbot')}<div class="tst"><div class="lbl2">Saldo real</div><div class="bal big tb" id="bal"></div>
    <div class="tmul ${up ? '' : 'dn'}">${T.mult.toFixed(2)}x <small>vs $50 inicial</small></div>
    <div class="tkv"><span><b>${T.buys.length}</b> trades</span><span><b>${T.wr == null ? '—' : T.wr + '%'}</b> acierto</span></div></div></div>
   <div class="chartw"><canvas id="line"></canvas><div id="pills"></div></div>
   <h3>Posiciones abiertas <span class="apill">${T.openB.length}</span></h3><div class="feedl">${T.openB.length ? T.openB.map(t => tr(t, false)).join('') : '<div class="empty">Sin posiciones abiertas · el desk está buscando</div>'}</div>
   <h3>Trades cerrados</h3><div class="feedl">${T.sells.length ? T.sells.slice().reverse().map(t => tr(t, true)).join('') : '<div class="empty">Aún no hay trades cerrados con dinero real</div>'}</div>
   ${dp && !dp.error ? `<h3>Prueba: compra en caídas (simulación)</h3><div class="card"><div class="lbl">Solo simulación · no usa dinero real</div>
     <div class="tkv"><span><b>${dp.trades}</b> trades</span><span><b>${dp.win_rate == null ? '—' : dp.win_rate + '%'}</b> acierto</span><span><b style="color:${dp.pnl >= 0 ? '#00E676' : '#FF3B30'}">${dp.pnl >= 0 ? '+' : '−'}$${Math.abs(dp.pnl).toFixed(2)}</b> P&amp;L</span><span><b>${dp.open}</b> abiertas</span></div>
     <div class="lbl" style="margin-top:6px">Real mismo periodo: ${dp.live_trades} trades · ${dp.live_pnl >= 0 ? '+' : '−'}$${Math.abs(dp.live_pnl).toFixed(2)} · vigilando ${dp.watching}</div></div>` : ''}
   ${ls && !ls.error ? `<h3>Prueba: reglas más sueltas (simulación)</h3><div class="card"><div class="lbl">Solo simulación · bundles hasta 7 y liquidez desde $10K · no usa dinero real</div>
     <div class="tkv"><span><b>${ls.trades}</b> trades</span><span><b>${ls.win_rate == null ? '—' : ls.win_rate + '%'}</b> acierto</span><span><b style="color:${ls.pnl >= 0 ? '#00E676' : '#FF3B30'}">${ls.pnl >= 0 ? '+' : '−'}$${Math.abs(ls.pnl).toFixed(2)}</b> P&amp;L</span><span><b>${ls.open}</b> abiertas</span></div>
     <div class="lbl" style="margin-top:6px">Real mismo periodo: ${ls.live_trades} trades · ${ls.live_pnl >= 0 ? '+' : '−'}$${Math.abs(ls.live_pnl).toFixed(2)} · candidatas ${ls.candidates}</div>${ls.backtest ? `<div class="lbl" style="margin-top:6px">Estimación 24 h: ${esc(ls.backtest)}</div>` : ''}</div>` : ''}
   <h3>Agentes <a href="#/agents" class="vt">Ver todo</a></h3><div class="chat mini2">${chatHtml(chatRows(fd, ac, trs), 5)}</div>`;
  odometer($('#bal'), st.balance); Charts.line($('#line'), ch.points || [], ch.start, []); tradeMarks(ch); eyesLoop(); }
async function wallet() {
  const [st, acct, ac, ch] = await Promise.all([api('state'), api('account'), api('activity').catch(() => ({ rows: [] })), api('chart?range=ALL').catch(() => ({ trades: [] }))]); S.state = st; setStatus(st.mode);
  const w = acct.wallet || {}, sol = w.sol != null ? w.sol : st.sol, T = tradeStats(st, ch.trades || []);
  const solUsd = sol != null && st.sol_price ? sol * st.sol_price : null;
  V.innerHTML = `<div class="whero"><div class="lbl2">Billetera del bot · solo lectura</div><div class="bal big" id="bal"></div>
    <a class="mono waddr" href="https://solscan.io/account/${esc(w.address)}" target="_blank" rel="noopener">${short(w.address)} ↗</a></div>
   <div class="wdraw"><div><div class="lbl2">Disponible para retirar</div><div class="wdv">${st.withdrawable_usd != null ? usd(st.withdrawable_usd) : 'n/a'}${st.withdrawable_sol != null ? ` <small>${Number(st.withdrawable_sol).toFixed(4)} SOL</small>` : ''}</div><small>Se confirma en Telegram · siempre a tu Phantom …QWy</small></div><a class="wbtn" href="https://t.me/OwenTradingDeskBot" target="_blank" rel="noopener">Retirar</a></div>
   <h3>Activos</h3><div class="feedl">
    <div class="arow"><div class="tok solt">◎</div><div class="am"><div>Solana</div><div>${sol != null ? Number(sol).toFixed(4) + ' SOL' : 'n/a'} · 1 SOL = ${usd(st.sol_price)}</div></div><div class="av"><div>${usd(solUsd)}</div></div></div>
    ${T.openB.map(t => `<a class="arow" href="#/coin/${esc(t.mint)}">${tokImg(t.mint, t.symbol)}<div class="am"><div>${esc(t.symbol || short(t.mint))}</div><div>posición abierta</div></div><div class="av"><div class="avs">ver ›</div></div></a>`).join('')}</div>
   <h3>Actividad <a href="#/activity" class="vt">Ver todo</a></h3><div class="feedl">${ac.rows.length ? ac.rows.slice(0, 12).map(actRow).join('') : '<div class="empty">Sin actividad todavía</div>'}</div>
   <div class="note">La app no mueve fondos: los retiros se piden con /retirar en Telegram y se confirman allí. <a href="#/account" style="color:#7fb2ff">Ajustes y reglas ›</a></div>`;
  odometer($('#bal'), st.balance); saveSeen(); }
(function stars() { const s = document.getElementById('stars'); if (!s) return; let h = '';
  for (let i = 0; i < 90; i++) h += `<i style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${Math.random() < .15 ? 2.5 : 1.5}px;height:${Math.random() < .15 ? 2.5 : 1.5}px;opacity:${(.25 + Math.random() * .6).toFixed(2)};animation-delay:${(Math.random() * 4).toFixed(1)}s"></i>`; s.innerHTML = h; })();
async function render() { setStatus(S.state && S.state.mode, true);
  const h = location.hash.replace(/^#\/?/, '') || 'home', [path] = h.split('?'), [tab, arg] = path.split('/');
  // ---- Web Push (receive-only: the phone gets buy/sell notices; nothing here can move funds) ----
const VAPID = 'BJxYL-BtV7LJS32Rvkun1PWEs0VYDutL1dkkkM7s0qRbHlOlDXWaC09d48R5K2FM9piMCM0ymXsKM2ZWWTjVk5g';
const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const pushOn = () => pushOK() && Notification.permission === 'granted' && localStorage.getItem('push_on') === '1';
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=20').catch(() => {});
function pushBox() { if (!GH) return ''; return pushOn() ? '<div class="note" style="margin:6px 0 12px">🔔 Avisos activados: te llega una notificación con cada compra y cada venta.</div>'
  : '<button class="btn" id="pushon" style="margin:6px 0 12px;width:100%">🔔 Activar avisos de compras y ventas</button>'; }
function b64u(s) { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...b].map(c => c.charCodeAt(0))); }
async function pushTopic() { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('owen-desk-push:' + DP())); return 'gbd-' + [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32); }
async function enablePush(ev) {
  if (ev) ev.preventDefault();
  if (!pushOK() || !standalone()) { alert('Para recibir avisos abre GrokBot desde el ícono de tu pantalla de inicio (iPhone con iOS 16.4 o más nuevo) y toca la campana otra vez.'); return; }
  if (!DP()) { alert('Abre primero tu enlace secreto una vez.'); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { alert('No diste permiso. Ve a Ajustes › Notificaciones › GrokBot y actívalas, luego toca la campana otra vez.'); return; }
    const reg = await navigator.serviceWorker.register('sw.js?v=20'); await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) });
    const r = await fetch('https://ntfy.sh/' + await pushTopic(), { method: 'POST', body: JSON.stringify(sub.toJSON()) });
    if (!r.ok) throw new Error('relay ' + r.status);
    localStorage.setItem('push_on', '1');
    alert('¡Listo! En menos de un minuto te llega una notificación de prueba. Desde ahora te aviso cada compra y cada venta.');
    if (/activity/.test(location.hash)) render();
  } catch (e) { alert('No se pudieron activar los avisos: ' + e.message); }
}
(function () { const bell = document.querySelector('#hdr a[href="#/activity"]'); if (bell && GH) bell.addEventListener('click', e => { if (!pushOn()) enablePush(e); }); })();
document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab || (tab === 'account' && b.dataset.tab === 'wallet') || (tab === 'activity' && b.dataset.tab === 'wallet')));
  try { if (tab === 'coin') await coin(decodeURIComponent(arg)); else if (tab === 'audit') await audit(arg); else await ({ home, trades, agents, wallet, activity, account, search }[tab] || home)(); }
  catch (e) { errView(e); }
  setStatus(S.state && S.state.mode); splashDone();
}
setInterval(() => { const c = document.getElementById('clock'); if (c) c.textContent = BOG(Date.now()); }, 1000);
function splashDone() { const sp = document.getElementById('splash'); if (!sp || sp.dataset.done) return; sp.dataset.done = 1;
  const st = S.state || {}, ls = [...sp.querySelectorAll('.ln')];
  const m = ls.find(l => l.dataset.k === 'mode'); if (m) m.querySelector('b').textContent = st.mode === 'PAPER' || !st.mode ? 'PAPER' : 'AUTO';
  ls.forEach((l, i) => setTimeout(() => l.classList.add('ok'), RM ? 0 : 250 + i * 280));
  setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 500); }, RM ? 100 : 250 + ls.length * 280 + 500); }
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => location.hash = '#/' + b.dataset.tab);
keepD(); addEventListener('hashchange', () => { keepD(); render(); }); render();
if (DP()) setInterval(() => { if (/home|trades|agents|wallet|activity|^#?$/.test(location.hash)) render(); }, 30000);
else if (TOK()) setInterval(() => { if (/home|trades|agents|^#?$/.test(location.hash) || location.hash === '#/home') render(); }, 10000);  // header auth only; token never in a URL
})();
