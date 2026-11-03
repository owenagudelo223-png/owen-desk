(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
// token: from #t= once, then localStorage. Never sent anywhere but our own /api.
(function () { const m = location.hash.match(/[#&]t=([^&]+)/); if (m) { localStorage.setItem('desk_t', decodeURIComponent(m[1])); const g = location.hash.match(/[#&]go=([^&]+)/); history.replaceState(null, '', location.pathname + '#/' + (g ? decodeURIComponent(g[1]) : 'home')); } })();
(function () { const m = location.hash.match(/[#&]d=([^&]+)/); if (m) { localStorage.setItem('desk_d', decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname + '#/home'); } })();
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
function errView(e) { V.innerHTML = e.message === 'unauthorized' ? '<div class="err">Not signed in. Open the app once with its #t= link.</div>' : `<div class="err">Can't reach the desk · ${esc(e.message)}</div>`; }
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
function actRow(r) {
  const href = r.kind === 'rejected' ? `#/audit/${r.mint}` : `#/coin/${r.mint}`;
  const col = r.kind === 'sold' ? 'up' : r.kind === 'stopped' ? 'down' : '';
  return `<a href="${href}"><div class="ic ${r.kind}">${esc((r.title.split(' ')[1] || '?')[0])}</div><div class="m"><div>${esc(r.title)}</div><div>${esc(r.subtitle)}</div></div><div class="v ${col}">${esc(r.value)}</div></a>`;
}
async function home() {
  const [st, ch, ac] = await Promise.all([api('state'), api('chart?range=' + S.range), api('activity')]); S.state = st;
  V.innerHTML = `<div class="top">${paperBadge(st.mode)}<input class="search" id="q" placeholder="Name, symbol or mint"><a class="bell" href="#/activity">🔔${st.unread ? '<i></i>' : ''}</a></div>
   <div class="balance big" id="bal"></div><div class="sub"><span class="${st.today_pct >= 0 ? 'up' : 'down'}">${st.today_pct >= 0 ? '+' : ''}${st.today_pct.toFixed(2)}%</span> today <span class="pill mult">${st.multiplier.toFixed(2)}×</span></div>
   <canvas id="line"></canvas><div class="ranges">${['LIVE', '1H', '4H', '1D', '1W', 'ALL'].map(r => `<button data-r="${r}" class="${r === S.range ? 'on' : ''}">${r}</button>`).join('')}</div>
   <h2>Agents <small>${st.agents.filter(a => a.status === 'running').length} running</small></h2><div class="carousel">${st.agents.map(a => card(a, st)).join('')}</div>
   <h2>Activity <a href="#/activity">See all</a></h2><div class="list">${ac.rows.length ? ac.rows.slice(0, 5).map(actRow).join('') : '<div class="empty">No activity yet. Scanner is watching new pump.fun migrations.</div>'}</div>`;
  odometer($('#bal'), st.balance); Charts.line($('#line'), ch.points, ch.start, ch.marks);
  const an = st.agents.find(a => a.name === 'analyst'); Charts.ring($('#ring'), an.score, an.min_score);
  V.querySelectorAll('.ranges button').forEach(b => b.onclick = () => { S.range = b.dataset.r; render(); });
  $('#q').onkeydown = e => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) location.hash = '#/coin/' + encodeURIComponent(v); } };
}
async function agents() {
  const st = await api('state'); const ds = await Promise.all(st.agents.map(a => api(`agents/${a.name}/decisions`)));
  V.innerHTML = `<div class="top"><b style="font-size:28px">Agents</b>${paperBadge(st.mode)}</div>` + st.agents.map((a, i) => `<div class="full">
   <div class="row" style="border:0"><span style="font-weight:700;font-size:17px"><span class="dot ${a.status}"></span>${a.name[0].toUpperCase() + a.name.slice(1)}</span>
   <button class="switch ${a.status !== 'paused' ? 'on' : ''}" data-a="${a.name}" ${a.name === 'risk' && a.open ? 'disabled title="locked while a position is open"' : ''}></button></div>
   <div class="lbl" style="color:var(--t2)">${a.status} · today ${a.count != null ? a.count : a.open + ' open'}</div>
   <table>${ds[i].rows.length ? ds[i].rows.map(r => `<tr><td>${tm(r.ts)}</td><td><a href="${esc(r.coin_url)}" style="color:#fff">${esc(r.coin || r.mint.slice(0, 6))}</a></td><td>${esc(r.verdict)}</td><td>${esc(r.reason || '')}</td></tr>`).join('') : '<tr><td colspan=4 style="color:var(--t3)">No decisions yet</td></tr>'}</table>
   <a class="back" href="#/account?s=${a.name}" style="display:block;margin-top:10px">Settings</a></div>`).join('');
  V.querySelectorAll('.switch').forEach(b => b.onclick = async () => { if (b.disabled) return; await api(`agents/${b.dataset.a}/${b.classList.contains('on') ? 'pause' : 'resume'}`, { method: 'POST' }); render(); });
}
async function activity() {
  const ac = await api('activity'); api('pushes/read', { method: 'POST' }).catch(() => {});
  V.innerHTML = `<div class="top"><b style="font-size:28px">Activity</b></div><div class="list">${ac.rows.length ? ac.rows.map(actRow).join('') : '<div class="empty">No activity yet</div>'}</div>`;
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
  const c = await api('coin/' + mint).catch(e => { if (String(e.message) === '404' || /unknown/.test(e.message)) return null; throw e; });
  if (!c) { V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Back</a></div><div class="empty">Unknown coin. Search by name, symbol or mint of a coin the desk has seen.</div>`; return; }
  const p = c.position, open = p && (p.status === 'open' || p.status === 'exiting');
  V.innerHTML = `<div class="top"><a class="back" href="#/home">‹ Back</a>${c.shield ? `<span class="pill" style="background:rgba(0,211,90,.16);color:#00d35a">🛡 ${c.shield}</span>` : ''}</div>
   <div style="font-size:22px;font-weight:700">${esc(c.name || mint.slice(0, 8))}</div><div class="lbl" style="color:var(--t2)">${esc(c.symbol || '')} · Solana · ${c.age_h}h old</div>
   <div class="balance big" style="font-size:44px">${c.price != null ? '$' + Number(c.price).toPrecision(4) : 'n/a'}</div>
   ${p ? `<div class="sub"><span class="${p.since_entry_pct >= 0 ? 'up' : 'down'}">${p.since_entry_pct >= 0 ? '▲' : '▼'} ${Math.abs(p.since_entry_pct).toFixed(2)}%</span> since entry</div>` : '<div class="sub">No position</div>'}
   <canvas id="cd"></canvas>
   <div class="stats"><div class="lbl">Market cap<b>${kusd(c.mcap)}</b></div><div class="lbl">Liquidity<b>${kusd(c.liq)}</b></div><div class="lbl">24h volume<b>${kusd(c.v24)}</b></div><div class="lbl">Holders<b>${c.holders != null ? c.holders.toLocaleString() : 'n/a'}</b></div></div>
   ${p ? `<div class="full"><div style="font-weight:700">Your position · ${usd(p.size_usd)} in · Executor</div>
     <div class="row"><span>Stop line</span><span>$${Number(p.stop_price).toPrecision(4)} · -${p.stop_pct}%</span></div>
     <div class="row"><span>Trail line</span><span>${p.trail_line ? '$' + Number(p.trail_line).toPrecision(4) : 'not active'}</span></div>
     <div class="row" style="border:0"><span>Timeout in</span><span>${open ? Math.floor(p.timeout_left_s / 3600) + 'h ' + Math.floor(p.timeout_left_s % 3600 / 60) + 'm' : 'closed · ' + esc(p.exit_reason)}</span></div></div>` : ''}
   <a class="btn" href="${esc(c.coin_url)}" ${open ? 'style="background:#ff453a;color:#fff"' : ''}>${open ? 'Sell on FOMO' : 'Buy on FOMO'}</a>`;
  Charts.candles($('#cd'), c.candles, open ? p.exit_line : null);
}
async function account() {
  const [ac, st] = await Promise.all([api('account'), api('settings')]);
  const groups = {}; Object.keys(st.settings).forEach(k => { const g = k.split('.')[0]; (groups[g] = groups[g] || []).push(k); });
  const input = k => { const m = st.meta[k], v = st.settings[k];
    if (m.type === 'bool') return `<div class="set"><label>${k.split('.').slice(1).join(' ')}</label><button class="switch ${v ? 'on' : ''}" data-k="${k}" data-bool></button></div>`;
    if (m.type === 'choice') return `<div class="set"><label>${k.split('.').slice(1).join(' ')}</label><select data-k="${k}">${m.choices.map(c => `<option ${c === v ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`;
    if (m.type === 'text') return `<div class="set"><label>${k.split('.').slice(1).join(' ')}</label><input type="text" data-k="${k}" value="${esc(v)}"></div>`;
    const step = (m.max - m.min) <= 1 ? 0.01 : (m.max - m.min) <= 100 ? 0.5 : 1;
    return `<div class="set"><label>${k.split('.').slice(1).join(' ')}</label><input type="number" class="mono" data-k="${k}" value="${v}" min="${m.min}" max="${m.max}" step="any"><input type="range" data-r="${k}" min="${m.min}" max="${Math.min(m.max, Math.max(v * 4, m.min + 1))}" step="${step}" value="${v}"></div>`; };
  V.innerHTML = `<div class="top"><b style="font-size:28px">Account</b>${paperBadge(ac.mode)}</div>
   <div class="full"><div class="seg"><button class="${ac.mode === 'PAPER' ? 'on' : ''}" data-m="PAPER">PAPER</button><button class="${ac.mode === 'LIVE' ? 'on' : ''}" data-m="LIVE">LIVE</button></div>
   <div class="set"><label>LIVE stack ($)</label><input type="number" data-k="desk.stack" value="${ac.stack}"></div>
   <a class="row" href="${esc(ac.profile_url)}"><span>Your FOMO profile</span><span>@${esc(ac.fomo_handle)} ›</span></a>
   <div class="row"><span>Telegram</span><span>${ac.telegram ? 'connected' : 'not connected · send /start to the bot'}</span></div>
   <div class="row" style="border:0"><span>Notifications</span><span>Telegram only (no web push on this host)</span></div></div>
   <div id="msg" class="lbl" style="color:var(--o);min-height:20px"></div>
   ${Object.entries(groups).map(([g, ks]) => `<h2 id="s-${g}">${g[0].toUpperCase() + g.slice(1)}</h2><div class="full">${ks.map(input).join('')}</div>`).join('')}`;
  const save = async (k, v) => { try { await api('settings', { method: 'POST', body: JSON.stringify({ [k]: v }) }); $('#msg').textContent = `${k} saved`; } catch (e) { $('#msg').textContent = e.message; } };
  V.querySelectorAll('input[data-k],select[data-k]').forEach(i => i.onchange = () => { const r = V.querySelector(`[data-r="${i.dataset.k}"]`); if (r) r.value = i.value; save(i.dataset.k, i.value); });
  V.querySelectorAll('[data-r]').forEach(r => r.onchange = () => { V.querySelector(`input[data-k="${r.dataset.r}"]`).value = r.value; save(r.dataset.r, r.value); });
  V.querySelectorAll('[data-bool]').forEach(b => b.onclick = () => { b.classList.toggle('on'); save(b.dataset.k, b.classList.contains('on')); });
  V.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => { const m = b.dataset.m; let body = { mode: m };
    if (m === 'LIVE') { const t = prompt('Type LIVE to confirm'); if (t !== 'LIVE') return; body.confirm = 'LIVE'; }
    const r = await api('mode', { method: 'POST', body: JSON.stringify(body) }); $('#msg').textContent = r.result; render(); });
  const s = new URLSearchParams(location.hash.split('?')[1] || '').get('s'); if (s) { const map = { scanner: 'scanner', auditor: 'auditor', analyst: 'analyst', executor: 'executor', risk: 'risk' }; const el = $('#s-' + map[s]); if (el) el.scrollIntoView(); }
}
async function render() {
  const h = location.hash.replace(/^#\/?/, '') || 'home', [path] = h.split('?'), [tab, arg] = path.split('/');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  try { if (tab === 'coin') await coin(decodeURIComponent(arg)); else if (tab === 'audit') await audit(arg); else await ({ home, agents, activity, account }[tab] || home)(); }
  catch (e) { errView(e); }
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => location.hash = '#/' + b.dataset.tab);
addEventListener('hashchange', render); render();
if (DP()) setInterval(() => { if (/home|agents|activity|^#?$/.test(location.hash)) render(); }, 30000);
else if (TOK() && window.EventSource) { const es = new EventSource('/api/stream?t=' + encodeURIComponent(TOK()));
  let tmr; const soon = () => { clearTimeout(tmr); tmr = setTimeout(() => { if (/home|agents|^#?$/.test(location.hash) || location.hash === '#/home') render(); }, 800); };
  ['scan', 'verdict', 'signal', 'fill', 'exit', 'balance'].forEach(ev => es.addEventListener(ev, soon)); }
})();
