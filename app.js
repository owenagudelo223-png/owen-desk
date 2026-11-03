(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
// token: from #t= once, then localStorage. Never sent anywhere but our own /api.
(function () { const m = location.hash.match(/[#&]t=([^&]+)/); if (m) { localStorage.setItem('desk_t', decodeURIComponent(m[1])); const g = location.hash.match(/[#&]go=([^&]+)/); history.replaceState(null, '', location.pathname + '#/' + (g ? decodeURIComponent(g[1]) : 'home')); } })();
(function () { const m = location.hash.match(/[#&]d=([^&]+)/); if (m) { localStorage.setItem('desk_d', decodeURIComponent(m[1])); const g = location.hash.match(/[#&]go=([^&]+)/); history.replaceState(null, '', location.pathname + '#/' + (g ? decodeURIComponent(g[1]) : 'home')); } })();
const DP = () => location.protocol === 'https:' && location.hostname.endsWith('github.io') ? (localStorage.getItem('desk_d') || '') : '';
const TOK = () => localStorage.getItem('desk_t') || '';
const $ = s => document.querySelector(s), V = $('#view');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const usd = (v, d = 2) => v == null ? 'n/a' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const kusd = v => v == null ? 'n/a' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : usd(v);
const tm = ts => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
async function api(p, opt = {}) {
  if (DP()) { if (opt.method && opt.method !== 'GET') throw new Error('read-only view (use Telegram to control the desk)');
    const r = await fetch('d/' + DP() + '/' + p.replace(/[?=\/]/g, '_') + '.json?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 404 ? '404' : r.status); return r.json(); }
  const r = await fetch('/api/' + p, { ...opt, headers: { 'Authorization': 'Bearer ' + TOK(), 'Content-Type': 'application/json' } });
  if (r.status === 401) throw new Error('unauthorized'); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status); return r.json();
}
let S = { range: 'LIVE', state: null, lastBal: null };
function paperBadge(mode) { return mode === 'PAPER' ? '<span class="pill paper">PAPER</span>' : '<span class="pill" style="background:#2c2c2e">LIVE</span>'; }
function errView(e) { V.innerHTML = e.message === 'unauthorized' ? '<div class="err">Sin sesión. Abre la app una vez con su enlace #t=.</div>' : `<div class="err">No se pudo conectar con el desk · ${esc(e.message)}</div>`; }
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
  return `<a class="arow${isNew ? ' slide' : ''}" href="${href}">${tokImg(r.mint, sym)}<div class="am"><div><b>${esc(lab)} ${esc(sym)}</b></div><div>${esc(AGL[r.agent] || r.agent || '')} · ${r.ts ? tmB(r.ts) : ''}</div></div><div class="av"><div style="color:${col}">${esc(r.value)}</div><div class="avs">${pct}</div></div></a>`;
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
function agMini(a) { const [n, ic] = AG[a.name] || [a.name, '•']; const [sl, sc] = STX[a.status] || [a.status, '#8E8E93'];
  let body = '';
  if (a.name === 'analyst') { const sc2 = a.score == null ? 0 : a.score, R = 26, C = 2 * Math.PI * R;
    body = `<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" stroke="#2C2C2E"/><circle cx="32" cy="32" r="${R}" stroke="${a.score != null && a.score >= a.min_score ? '#00E676' : '#FFD60A'}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - sc2 / 100)}" transform="rotate(-90 32 32)"/><text x="32" y="37">${a.score == null ? '–' : a.score}</text></svg><div class="ms">${a.count} puntuadas · mín ${a.min_score}</div>`; }
  else { const [big, lab, pct] = a.name === 'scanner' ? [a.count, `${a.waiting} en espera`, Math.min(100, a.waiting * 20)] : a.name === 'auditor' ? [a.count, `${a.rejected} rechazadas`, a.count ? 100 * (a.count - a.rejected) / a.count : 0]
      : a.name === 'executor' ? [a.count, `${a.stack_pct}% del stack por operación`, a.progress != null ? a.progress : a.last ? 100 : 0] : [a.open, `stop -${a.stop_pct}% · trail ${a.trail_pct}%`, a.open ? 100 : 0];
    body = `<div class="mb">${big}</div><div class="ms">${esc(lab)}</div><div class="pbar"><i style="width:${pct}%"></i></div>`; }
  return `<div class="mini"><div class="mh"><span class="mic">${ic}</span><b>${n}</b><span class="sd" style="background:${sc}" title="${sl}"></span></div>${body}</div>`; }
async function home() {
  const [st, ch, ac, acct] = await Promise.all([api('state'), api('chart?range=' + RANGES[S.range]), api('activity'), WALLET ? Promise.resolve(null) : api('account').catch(() => null)]); S.state = st;
  if (acct && acct.wallet) WALLET = acct.wallet.address;
  const A = n => st.agents.find(a => a.name === n) || {};
  const rows = ac.rows, closed = rows.filter(r => r.kind === 'sold' || r.kind === 'stopped');
  const wins = rows.filter(r => r.kind === 'sold').length;
  const pcts = closed.map(r => num(r.value)).filter(x => !isNaN(x)).sort((a, b) => a - b);
  const med = pcts.length ? pcts[Math.floor(pcts.length / 2)] : null;
  const rej = A('auditor').rejected || 0, scanned = A('scanner').count || 0, buys = A('executor').count || 0;
  const fees = rows.filter(r => r.kind === 'fee');
  const sv = st.start_value || st.balance, pnl = st.balance - sv, up = pnl >= 0, mult = sv ? st.balance / sv : 1;
  const act = st.agents.filter(a => a.status === 'running').length;
  events(rows);
  V.innerHTML = `<div class="hero"><div class="hl"><span>Desk • <span class="mono">${short(WALLET)}</span></span><span id="clock" class="mono">${BOG(Date.now())}</span></div>
   <div class="bal big" id="bal"></div><div class="pnl" style="color:${up ? '#00E676' : '#FF3B30'}">${up ? '+' : '−'}${usd(Math.abs(pnl))} (${up ? '+' : ''}${st.today_pct.toFixed(2)}%) <span>hoy</span> <i class="mult ${up ? '' : 'dn'}"><svg viewBox="0 0 12 12"><path d="${up ? 'M1 9l3.5-3.5 2 2L11 3M8 3h3v3' : 'M1 3l3.5 3.5 2-2L11 9M8 9h3V6'}"/></svg>${mult.toFixed(2)}x</i></div>${st.real && st.sol != null ? `<div class="solln mono">${Number(st.sol).toFixed(4)} SOL · 1 SOL = ${usd(st.sol_price)} · dinero real</div>` : ''}</div>
   <div class="chartw"><canvas id="line"></canvas><div id="pills"></div></div><div class="rg">${Object.keys(RANGES).map(r => `<button data-r="${r}" class="${r === S.range ? 'on' : ''}">${r === 'LIVE' ? '<i class="pulse"></i>' : ''}${r}</button>`).join('')}</div>
   <div class="mobonly"><h3>Agentes <span class="apill">${act} activos</span></h3><div class="carousel2">${st.agents.map(agMini).join('')}</div></div>
   <h3>El desk hoy</h3><div class="grid">
    <div class="st"><div class="si" style="color:#00E676">◎</div><div class="sl">Escaneadas</div><div class="sv">${scanned}</div><div class="ss">${A('scanner').waiting || 0} en espera</div></div>
    <div class="st"><div class="si" style="color:#00E676">↓</div><div class="sl">Compras</div><div class="sv">${buys}</div><div class="ss">${closed.length ? `${wins} ganadoras · mediana ${med > 0 ? '+' : ''}${med != null ? med.toFixed(1) + '%' : '—'}` : 'sin cierres aún'}</div></div>
    <div class="st"><div class="si" style="color:#FF3B30">✕</div><div class="sl">Rechazadas / perdidas</div><div class="sv" style="color:#FF3B30">${rej + rows.filter(r => r.kind === 'stopped').length}</div><div class="ss">${A('auditor').count ? Math.round(rej / A('auditor').count * 100) + '% de auditadas' : '—'}</div></div>
    <div class="st"><div class="si" style="color:#F6851B">⇡</div><div class="sl">Comisiones</div><div class="sv" style="color:#F6851B">${fees.length ? esc(fees.map(f => f.value).join(' ')) : '$0.00'}</div><div class="ss">${st.mode === 'PAPER' ? 'modo práctica' : 'swaps reales'}</div></div>
   </div>
   <div class="two"><section><h3>Actividad <a href="#/activity">Ver todo</a></h3><div class="feedl">${rows.length ? rows.slice(0, 8).map(actRow).join('') : '<div class="empty">Sin actividad todavía. El scanner vigila las graduaciones de pump.fun.</div>'}</div></section>
   <aside class="deskonly"><h3>Agentes <span class="apill">${act} de ${st.agents.length} activos</span></h3>${st.agents.map(a => agCard(a, null)).join('')}</aside></div>`;
  saveSeen(); setStatus(st.mode);
  odometer($('#bal'), st.balance); Charts.line($('#line'), ch.points, ch.start, []);
  const pts = ch.points; if (pts.length > 1) { const t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1;
    $('#pills').innerHTML = (ch.marks || []).filter(m => m.kind !== 'bought' && m.ts >= t0).map((m, i) => { const p = ((m.ts - t0) / Math.max(1, t1 - t0) * 100).toFixed(1);
      return `<span class="cpill ${m.kind === 'sold' ? 'g' : 'r'}" style="left:min(${p}%,calc(100% - 70px));top:${8 + (i % 3) * 26}px;animation-delay:${600 + i * 120}ms">${esc(m.text)}</span>`; }).join(''); }
  V.querySelectorAll('.rg button').forEach(b => b.onclick = () => { S.range = b.dataset.r; render(); });
}
const AG = { scanner: ['Scanner', '◎', 'Vigila graduaciones'], auditor: ['Auditor', '⛨', 'Revisa 8 capas'], analyst: ['Analyst', '◔', 'Puntúa (reglas)'], executor: ['Executor', '⚡', 'Compra y vende'], risk: ['Risk', '⛉', 'Stop y trailing'] };
const STX = { running: ['activo', '#34C759'], paused: ['pausado', '#8E8E93'], error: ['error', '#FF4500'] };
function agInfo(a) { return a.name === 'scanner' ? `${a.count} pools · ${a.waiting} en espera` : a.name === 'auditor' ? `${a.count} auditadas · ${a.rejected} rechazadas` : a.name === 'analyst' ? `${a.count} puntuadas · mínimo ${a.min_score}` : a.name === 'executor' ? `${a.count} operaciones · ${a.stack_pct}% por operación` : `${a.open} abiertas · stop -${a.stop_pct}% · trail ${a.trail_pct}%`; }
function agCard(a, rows) { const [n, ic, d] = AG[a.name] || [a.name, '•', '']; const [sl, sc] = STX[a.status] || [a.status, '#8E8E93'];
  return `<div class="sheet"><div class="arow" style="border:0;padding:0"><div class="aic" style="background:${sc}22;color:${sc}">${ic}</div><div class="am"><div>${n}</div><div>${d} · ${esc(agInfo(a))}</div></div><div class="av" style="color:${sc}">${sl}</div></div>
   ${DP() || !rows ? '' : `<button class="switch ${a.status !== 'paused' ? 'on' : ''}" data-a="${a.name}" ${a.name === 'risk' && a.open ? 'disabled' : ''}></button>`}
   ${rows ? `<div class="dec">${rows.length ? rows.slice(0, 6).map(r => `<div><span class="mono">${tmB(r.ts)}</span><span>${esc(r.coin || r.mint.slice(0, 6))}</span><span style="color:${/kill|reject|fail|stop|^red$/i.test(r.verdict) ? '#FF4500' : '#34C759'}">${esc(r.verdict)}</span><span>${esc(r.reason || '')}</span></div>`).join('') : '<div style="color:#8E8E93;display:block">Sin decisiones todavía</div>'}</div>` : ''}</div>`; }
async function agents() {
  const st = await api('state'); S.state = st; const ds = await Promise.all(st.agents.map(a => api(`agents/${a.name}/decisions`).catch(() => ({ rows: [] }))));
  setStatus(st.mode);
  V.innerHTML = `<h3 style="margin-top:8px">Agentes <span class="ss">${st.agents.filter(a => a.status === 'running').length} de ${st.agents.length} activos</span></h3>` + st.agents.map((a, i) => agCard(a, ds[i].rows)).join('');
  V.querySelectorAll('.switch').forEach(b => b.onclick = async () => { if (b.disabled) return; await api(`agents/${b.dataset.a}/${b.classList.contains('on') ? 'pause' : 'resume'}`, { method: 'POST' }); render(); });
}
async function activity() {
  const ac = await api('activity'); if (!DP()) api('pushes/read', { method: 'POST' }).catch(() => {});
  V.innerHTML = `<h3 style="margin-top:8px">Actividad</h3><div class="feedl">${ac.rows.length ? ac.rows.map(actRow).join('') : '<div class="empty">Sin actividad todavía</div>'}</div>`; saveSeen();
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
     <div class="row"><span>Trailing</span><span>${p.trail_line ? '$' + Number(p.trail_line).toPrecision(4) : 'no activo'}</span></div>
     <div class="row" style="border:0"><span>${open ? 'Cierra en' : 'Cerrada'}</span><span>${open ? Math.floor(p.timeout_left_s / 3600) + 'h ' + Math.floor(p.timeout_left_s % 3600 / 60) + 'm' : esc(p.exit_reason)}</span></div></div>` : ''}
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
async function render() { setStatus(S.state && S.state.mode, true);
  const h = location.hash.replace(/^#\/?/, '') || 'home', [path] = h.split('?'), [tab, arg] = path.split('/');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  try { if (tab === 'coin') await coin(decodeURIComponent(arg)); else if (tab === 'audit') await audit(arg); else await ({ home, agents, activity, account }[tab] || home)(); }
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
addEventListener('hashchange', render); render();
if (DP()) setInterval(() => { if (/home|agents|activity|^#?$/.test(location.hash)) render(); }, 30000);
else if (TOK() && window.EventSource) { const es = new EventSource('/api/stream?t=' + encodeURIComponent(TOK()));
  let tmr; const soon = () => { clearTimeout(tmr); tmr = setTimeout(() => { if (/home|agents|^#?$/.test(location.hash) || location.hash === '#/home') render(); }, 800); };
  ['scan', 'verdict', 'signal', 'fill', 'exit', 'balance'].forEach(ev => es.addEventListener(ev, soon)); }
})();
