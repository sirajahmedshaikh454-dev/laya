(function () {
  const T = window.LayaTaal, S = window.LayaSynth, $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const LAY = [1, 2, 4], LAYNAME = { 1: 'ek-gun (as written)', 2: 'dugun (double speed)', 4: 'chaugun (four times)' };
  const PRESETS = ['Dha Dhin Dhin Dha', 'Dha Ge Na Ti', 'Dha - Dha Tin', 'Na Dhin Dhin Na Dha', 'Dhi Dhi Na'];
  const state = { taal: 'teentaal', bpm: 80, layak: 1, k: 1, start: 0, phrase: PRESETS[0], sel: 0, muted: false, volume: 0.8 };
  try { Object.assign(state, JSON.parse(localStorage.getItem('laya') || '{}')); } catch (e) { /* storage may be blocked */ }
  // Saved settings may be stale, hand-edited or corrupt: coerce every field to something safe before anything uses it.
  if (!T.TAALS[state.taal]) state.taal = 'teentaal';
  state.bpm = Math.min(240, Math.max(30, Math.round(+state.bpm) || 80));
  if (!LAY.includes(state.layak)) state.layak = 1;
  if (![1, 2].includes(state.k)) state.k = 1;
  if (typeof state.phrase !== 'string') state.phrase = PRESETS[0];
  state.volume = +state.volume >= 0 && +state.volume <= 1 ? +state.volume : 0.8;
  state.muted = state.muted === true;
  if (!Number.isInteger(state.start) || state.start < 0 || state.start >= T.TAALS[state.taal].matras * state.k) state.start = 0;
  if (!Number.isInteger(state.sel) || state.sel < 0) state.sel = 0;
  const save = () => { try { localStorage.setItem('laya', JSON.stringify(state)); } catch (e) { /* ignore */ } };
  const player = new S.Player();
  player.volume = state.volume;
  const taal = () => T.TAALS[state.taal];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const svg = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  // ---------- the dial ----------
  let nodes = [], activeBeat = -1;
  function drawDial() {
    const t = taal(), d = $('dial');
    d.textContent = '';
    const C = 200, n = t.matras, ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n, pt = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
    d.appendChild(svg('circle', { cx: C, cy: C, r: 196, fill: 'var(--skin)', stroke: 'var(--line)', 'stroke-width': 2 }));
    d.appendChild(svg('circle', { cx: C, cy: C, r: 92, fill: 'var(--syahi)' }));                 // the black ink circle (syahi) of the dayan
    d.appendChild(svg('circle', { cx: C, cy: C, r: 92, fill: 'none', stroke: 'var(--line)', 'stroke-width': 3 }));
    nodes = [];
    let acc = 0;
    t.vibhag.forEach((len, v) => {                                                               // vibhag dividers
      const a = ang(acc) - Math.PI / n, [x1, y1] = pt(100, a), [x2, y2] = pt(190, a);
      d.appendChild(svg('line', { x1, y1, x2, y2, stroke: 'var(--mute)', 'stroke-width': 1.5, 'stroke-dasharray': '3 4', opacity: 0.7 }));
      acc += len;
    });
    for (let i = 0; i < n; i++) {
      const info = T.beatInfo(t, i), a = ang(i), [x, y] = pt(158, a), [bx, by] = pt(118, a);
      const color = info.kind === 'sam' ? 'var(--sam)' : info.kind === 'tali' ? 'var(--tali)' : info.kind === 'khali' ? 'var(--khali)' : 'var(--mute)';
      const g = svg('g', {});
      const c = svg('circle', { cx: x, cy: y, r: info.first ? 19 : 15, fill: 'var(--card)', stroke: color, 'stroke-width': info.first ? 3.5 : 2, class: 'node' });
      g.appendChild(c);
      g.appendChild(svg('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)' }, String(i + 1)));
      if (info.first) { const [mx, my] = pt(190, a); g.appendChild(svg('text', { x: mx, y: my + 4, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: color }, info.mark === 'x' ? '×' : info.mark)); }
      const fs = n > 12 ? 12 : n > 8 ? 14 : 17;
      g.appendChild(svg('text', { x: bx, y: by + fs / 3, 'text-anchor': 'middle', 'font-size': fs, fill: 'var(--ink)', 'font-family': 'Georgia, serif' }, t.bols[i]));
      d.appendChild(g);
      nodes.push({ c, base: info.first ? 19 : 15, color });
    }
    d.appendChild(svg('text', { id: 'cbol', x: C, y: C + 4, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: '#efe2c0', 'font-family': 'Georgia, serif' }, t.name));
    d.appendChild(svg('text', { id: 'csub', x: C, y: C + 30, 'text-anchor': 'middle', 'font-size': 12, fill: '#a69885' }, `${t.matras} beats · ${t.vibhag.join('+')}`));
    activeBeat = -1;
  }

  function light(beat, tihai) {
    if (beat === activeBeat) return;
    if (activeBeat >= 0 && nodes[activeBeat]) { const o = nodes[activeBeat]; o.c.setAttribute('r', o.base); o.c.setAttribute('fill', 'var(--card)'); o.c.removeAttribute('filter'); }
    activeBeat = beat;
    if (beat >= 0 && nodes[beat]) {
      const o = nodes[beat]; o.c.setAttribute('r', o.base + 6); o.c.setAttribute('fill', o.color);
      const t = taal(), cb = $('cbol'), cs = $('csub');
      // during a tihai the sounding bols are the phrase, not the theka, so the centre shows the beat only
      if (cb) cb.textContent = tihai ? 'Tihai' : t.bols[beat];
      if (cs) cs.textContent = `beat ${beat + 1} of ${t.matras}`;
      $('live').textContent = tihai ? `tihai, beat ${beat + 1}` : `${t.bols[beat]}, beat ${beat + 1}`;
    }
  }
  function idleCenter() {
    const t = taal(), cb = $('cbol'), cs = $('csub');
    if (cb) cb.textContent = t.name;
    if (cs) cs.textContent = `${t.matras} beats · ${t.vibhag.join('+')}`;
  }

  // ---------- transport ----------
  function startLoop() {
    player.loop(() => ({ taal: taal(), bpm: state.bpm, layak: state.layak, info: T.beatInfo, muted: state.muted }));
    $('play').textContent = 'Stop (space)'; $('play').classList.add('on');
  }
  function stopAll() { player.stop(); $('play').textContent = 'Play (space)'; $('play').classList.remove('on'); light(-1); idleCenter(); }
  const toggle = () => (player.running ? stopAll() : startLoop());

  function frame() {
    if (player.running) {
      const c = player.current();
      if (c) light(c.beat, c.mode === 'tihai');
    } else if ($('play').classList.contains('on')) stopAll();
    requestAnimationFrame(frame);
  }

  // ---------- tihai lab ----------
  const tokens = () => state.phrase.split(/[\s,]+/).filter(Boolean).slice(0, 64);
  function renderPhraseUI() {
    $('phrase').value = state.phrase;
    const pre = $('presets'); pre.textContent = '';
    PRESETS.forEach((p) => { const b = el('button', '', p); b.type = 'button'; b.addEventListener('click', () => { state.phrase = p; state.sel = 0; save(); render(); }); pre.appendChild(b); });
    const ks = $('kseg'); ks.textContent = '';
    [1, 2].forEach((k) => { const b = el('button', '', k === 1 ? '1 (one bol per beat)' : '2 (half-beat bols)'); b.type = 'button'; b.setAttribute('aria-pressed', state.k === k); b.addEventListener('click', () => keepFocus(() => { state.k = k; state.start = 0; state.sel = 0; save(); render(); })); ks.appendChild(b); });
  }

  const cycleLen = () => taal().matras * state.k;
  const beatLabel = (pulse) => { const b = pulse / state.k + 1; return fmt(b); };

  function renderMap() {
    const P = tokens().length, cycle = cycleLen();
    const m = $('map'); m.textContent = '';
    const sel = $('start'); sel.textContent = '';
    if (!P) return;
    const row = T.tihaiMap({ cycle, phrase: P });
    for (let s = 0; s < cycle; s++) {
      const b = el('button', row[s] == null ? 'no' : '');
      b.type = 'button';
      b.appendChild(document.createTextNode(beatLabel(s)));
      b.appendChild(el('small', '', row[s] == null ? '–' : fmt(row[s] / state.k)));
      b.setAttribute('aria-pressed', s === state.start);
      b.setAttribute('aria-label', `start on beat ${beatLabel(s)}: ${row[s] == null ? 'no whole-pulse gap works' : 'shortest gap ' + fmt(row[s] / state.k) + ' beats'}`);
      b.addEventListener('click', () => keepFocus(() => { state.start = s; state.sel = 0; save(); renderResult(); renderMap(); }));
      m.appendChild(b);
      const o = el('option', '', 'beat ' + beatLabel(s)); o.value = s; if (s === state.start) o.selected = true; sel.appendChild(o);
    }
  }

  function layoutRows(sol) {
    const P = tokens(), cycle = cycleLen(), parts = T.tihaiLayout({ start: state.start, phrase: P.length, gap: sol.gap });
    const last = state.start + sol.span - 1, rowsN = Math.floor(last / cycle) + 1, box = el('div', 'lay');
    const cells = new Map();
    parts.forEach((part) => { for (let i = 0; i < part.len; i++) cells.set(part.from + i, part.type === 'phrase' ? { cls: 'p' + part.n, txt: P[i] } : { cls: 'gap', txt: '' }); });
    for (let r = 0; r < rowsN; r++) {
      const row = el('div', 'cyc'); row.appendChild(el('span', 'cl', 'cycle ' + (r + 1)));
      for (let i = 0; i < cycle; i++) {
        const p = r * cycle + i, c = cells.get(p), cell = el('div', 'cell' + (i === 0 ? ' beat0' : '') + (c ? ' ' + c.cls : '') + (p === last ? ' end' : ''), c ? (c.txt === '-' ? '·' : c.txt) : '');
        if (i % state.k === 0) cell.title = 'beat ' + (i / state.k + 1);
        row.appendChild(cell);
      }
      box.appendChild(row);
    }
    return box;
  }

  function playTihai(sol) {
    const P = tokens(), k = state.k, parts = T.tihaiLayout({ start: state.start, phrase: P.length, gap: sol.gap }), cycle = cycleLen(), ev = [];
    const last = state.start + sol.span - 1;
    for (let p = 0; p <= last; p++) if (p % k === 0) ev.push({ at: p, tick: true, vel: (p % cycle === 0) ? 0.45 : 0.2 });     // a soft count so you hear where the beats and sam are
    parts.forEach((part) => { if (part.type === 'phrase') for (let i = 0; i < part.len; i++) ev.push({ at: part.from + i, bol: P[i], vel: part.from + i === last ? 1.25 : 0.9 }); });
    const perPulse = 60 / (state.bpm * k);
    player.once(ev, perPulse, last);
    player.queue = player.queue.map((q) => Object.assign(q, { beat: Math.floor((q.pulse % cycle) / k), mode: 'tihai' }));
    $('play').textContent = 'Stop (space)'; $('play').classList.add('on');
  }

  function renderResult() {
    const P = tokens(), res = $('result'); res.textContent = '';
    if (!P.length) { res.appendChild(el('p', 'hint', 'Type a phrase above.')); return; }
    const cycle = cycleLen(), sols = T.solveTihai({ cycle, start: state.start, phrase: P.length, maxGap: cycle });
    res.appendChild(el('h2', '', `Phrase of ${P.length} pulse${P.length === 1 ? '' : 's'} (${fmt(P.length / state.k)} beats), starting on beat ${beatLabel(state.start)}`));
    if (!sols.length) {
      const ok = T.tihaiMap({ cycle, phrase: P.length }).map((g, s) => (g == null ? null : beatLabel(s))).filter(Boolean);
      res.appendChild(el('p', 'hint', 'No whole-pulse gap lands on sam from here. ' + (ok.length ? `Starting on beat ${ok.slice(0, 6).join(', ')} would work.` : 'Try a phrase with one more or one fewer pulse, or half-beat bols.')));
      return;
    }
    if (!(state.sel >= 0 && state.sel < Math.min(6, sols.length))) state.sel = 0;
    if (state.phrase.split(/[\s,]+/).filter(Boolean).length > 64) res.appendChild(el('p', 'hint', 'Only the first 64 bols are used.'));
    const ul = el('ul', 'sols');
    sols.slice(0, 6).forEach((s, i) => {
      const li = el('li', 'sol' + (i === state.sel ? ' sel' : ''));
      const txt = el('span'); txt.appendChild(el('b', '', s.gap === 0 ? 'No gap (bedam)' : `Gap of ${fmt(s.gap / state.k)} beat${s.gap / state.k === 1 ? '' : 's'}`));
      txt.appendChild(document.createTextNode(` · lasts ${fmt(s.span / state.k)} beats, ${s.cycles} cycle${s.cycles === 1 ? '' : 's'}`));
      const show = el('button', '', 'Show'); show.type = 'button'; show.addEventListener('click', () => { state.sel = i; renderResult(); });
      const hear = el('button', '', 'Hear it'); hear.type = 'button'; hear.addEventListener('click', () => { state.sel = i; renderResult(); playTihai(s); });
      const btns = el('span'); btns.style.display = 'flex'; btns.style.gap = '8px'; btns.append(show, hear);
      li.append(txt, btns); ul.appendChild(li);
    });
    res.appendChild(ul);
    res.appendChild(layoutRows(sols[state.sel]));
    res.appendChild(el('p', 'hint', 'Orange blocks are the three phrases (light to dark), hatched cells are the gaps, and the outlined cell is the last bol, on sam.'));
  }

  // Rebuilding a control drops keyboard focus; put it back on the same-labelled button inside the same group.
  function keepFocus(fn) {
    const a = document.activeElement, box = a && a.closest && a.closest('[id]'), id = box && box.id, txt = a && a.textContent;
    fn();
    if (id) { const nb = [...document.querySelectorAll('#' + id + ' button')].find((x) => x.textContent === txt); if (nb) nb.focus(); }
  }

  // ---------- chrome ----------
  function renderTaals() {
    const box = $('taals'); box.textContent = '';
    Object.entries(T.TAALS).forEach(([key, t]) => {
      const b = el('button', '', t.name); b.type = 'button'; b.setAttribute('aria-pressed', key === state.taal);
      b.addEventListener('click', () => keepFocus(() => { state.taal = key; state.start = 0; state.sel = 0; save(); stopAll(); render(); }));
      box.appendChild(b);
    });
  }
  function renderLay() {
    const box = $('lay'); box.textContent = '';
    LAY.forEach((l) => { const b = el('button', '', '×' + l); b.type = 'button'; b.setAttribute('aria-pressed', l === state.layak); b.addEventListener('click', () => keepFocus(() => { state.layak = l; save(); renderLay(); })); box.appendChild(b); });
    $('layname').textContent = LAYNAME[state.layak];
  }
  function render() { renderTaals(); drawDial(); renderLay(); renderPhraseUI(); renderMap(); renderResult(); $('bpm').value = state.bpm; $('bpmv').textContent = state.bpm; $('vol').value = state.volume; $('mute').checked = state.muted; }

  $('play').addEventListener('click', toggle);
  $('bpm').addEventListener('input', (e) => { state.bpm = +e.target.value; $('bpmv').textContent = state.bpm; save(); });
  $('vol').addEventListener('input', (e) => { state.volume = +e.target.value; player.setVolume(state.volume); save(); });
  $('mute').addEventListener('change', (e) => { state.muted = e.target.checked; save(); });
  $('phrase').addEventListener('input', (e) => { state.phrase = e.target.value; state.sel = 0; save(); renderMap(); renderResult(); });
  $('start').addEventListener('change', (e) => { state.start = +e.target.value; state.sel = 0; save(); renderMap(); renderResult(); });
  let taps = [];
  $('tap').addEventListener('click', () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now); taps = taps.slice(-6);
    if (taps.length >= 2) { const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); state.bpm = Math.max(30, Math.min(240, Math.round(60000 / avg))); $('bpm').value = state.bpm; $('bpmv').textContent = state.bpm; save(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.target.matches('input,select,textarea,button')) return;        // Space belongs to the focused control
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
  });

  render();
  requestAnimationFrame(frame);
  window.Laya = { state, player };
})();
