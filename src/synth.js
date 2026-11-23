// Synthesised tabla voices (Web Audio) and a look-ahead player. Browser only.
// bayan = the bass drum: a sine whose pitch sweeps down after the strike (the "wah" of Ge/Dha).
// dayan = the treble drum: a fundamental with a 2nd and 3rd harmonic (tabla is tuned, so the overtones are harmonic) plus a short noise click.
// These are cartoons of the real drums, good for keeping time and hearing a phrase, not a sample-accurate tabla.
(function (root) {
  const P = {
    Dha:  { b: { f0: 175, f1: 80, decay: 0.42, amp: 0.85 }, d: { f: 312, decay: 0.22, amp: 0.55 } },
    Dhin: { b: { f0: 170, f1: 78, decay: 0.55, amp: 0.8 },  d: { f: 305, decay: 0.5, amp: 0.5 } },
    Dhi:  { b: { f0: 165, f1: 78, decay: 0.3, amp: 0.7 },   d: { f: 305, decay: 0.25, amp: 0.45 } },
    Na:   { d: { f: 312, decay: 0.3, amp: 0.8 } },
    Tin:  { d: { f: 410, decay: 0.38, amp: 0.75 } },
    Ta:   { d: { f: 330, decay: 0.09, amp: 0.9 }, click: 0.5 },
    Ti:   { d: { f: 365, decay: 0.07, amp: 0.7 }, click: 0.4 },
    Tu:   { d: { f: 300, decay: 0.11, amp: 0.7 } },
    Ge:   { b: { f0: 190, f1: 70, decay: 0.65, amp: 1 } },
    Ke:   { b: { f0: 150, f1: 112, decay: 0.07, amp: 0.7 }, click: 0.3 },
    tick: { click: 0.5, d: { f: 1200, decay: 0.03, amp: 0.25 } },
  };
  const ALIAS = { dhe: 'Dhi', dhir: 'Dhi', dhage: 'Dha', gha: 'Ge', ghe: 'Ge', ga: 'Ge', ka: 'Ke', kat: 'Ke', ki: 'Ke', te: 'Ti', tete: 'Ti', tira: 'Ti', kita: 'Ti', tirakita: 'Ti', tun: 'Tin', ne: 'Na', ni: 'Na', nu: 'Na', din: 'Dhin' };

  // Any bol the user types gets the nearest voice, so custom phrases always sound.
  function profileFor(bol) {
    const k = String(bol || '').trim().toLowerCase();
    if (!k || /^[-–—_]+$/.test(k)) return null;              // a rest: ASCII hyphen, en dash, em dash or underscore
    for (const name of Object.keys(P)) if (name.toLowerCase() === k) return P[name];
    if (ALIAS[k]) return P[ALIAS[k]];
    if (k.startsWith('dh')) return P.Dha;
    if (/^(g|k)/.test(k)) return P.Ke;
    if (/^t/.test(k)) return P.Ti;
    return P.Na;
  }

  const noiseCache = new WeakMap();
  function noise(ctx) {
    if (!noiseCache.has(ctx)) {
      const n = Math.floor(ctx.sampleRate * 0.02), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; }    // fixed seed: renders are repeatable
      noiseCache.set(ctx, buf);
    }
    return noiseCache.get(ctx);
  }

  function env(g, t, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.003 + decay);
  }

  // Play one bol at time t (seconds on ctx's clock) into `dest`. vel 0..1.3. Returns the time the sound has died away.
  function strike(ctx, dest, t, bol, vel) {
    const p = typeof bol === 'object' ? bol : profileFor(bol);
    if (!p) return t;
    let end = t;
    if (p.b) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(p.b.f0, t);
      o.frequency.exponentialRampToValueAtTime(p.b.f1, t + 0.09);
      env(g, t, p.b.amp * vel, p.b.decay);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + p.b.decay + 0.06);
      end = Math.max(end, t + p.b.decay + 0.06);
    }
    if (p.d) {
      [[1, 1], [2, 0.45], [3, 0.2]].forEach(([mult, amp]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(p.d.f * mult * 1.03, t);                    // a tiny pitch bend after the strike
        o.frequency.exponentialRampToValueAtTime(p.d.f * mult, t + 0.02);
        env(g, t, p.d.amp * amp * vel * 0.8, p.d.decay / (1 + (mult - 1) * 0.5));
        o.connect(g).connect(dest);
        o.start(t); o.stop(t + p.d.decay + 0.05);
      });
      end = Math.max(end, t + p.d.decay + 0.05);
    }
    if (p.click) {
      const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise(ctx);
      hp.type = 'highpass'; hp.frequency.value = 2200;
      g.gain.setValueAtTime(p.click * vel * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.02);
      s.connect(hp).connect(g).connect(dest);
      s.start(t);
    }
    return end;
  }

  function master(ctx, volume) {
    const comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
    out.gain.value = volume == null ? 0.8 : volume;
    comp.connect(out).connect(ctx.destination);
    return { input: comp, out };
  }

  const KIND_VEL = { sam: 1, tali: 0.9, khali: 0.7, beat: 0.78 };

  // The theka as events: [{ t, bol, vel, beat }] for `cycles` cycles at `bpm` beats per minute. Used by the offline check and by the player.
  function thekaEvents(taal, info, bpm, cycles) {
    const out = [], dur = 60 / bpm;
    for (let c = 0; c < cycles; c++) for (let i = 0; i < taal.matras; i++) out.push({ t: (c * taal.matras + i) * dur, bol: taal.bols[i], vel: KIND_VEL[info(taal, i).kind], beat: i });
    return out;
  }

  // A look-ahead player: schedules a little ahead of the audio clock so timing is sample-accurate and tempo changes apply at the next beat.
  class Player {
    constructor() { this.ctx = null; this.timer = 0; this.queue = []; this.running = false; this.volume = 0.8; }
    _ensure() {
      if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.m = master(this.ctx, this.volume); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    setVolume(v) { this.volume = v; if (this.m) this.m.out.gain.value = v; }

    // Loop a theka. `get()` is read every beat, so tempo, layakari and taal can change while playing.
    loop(get) {
      this.stop(); this._ensure();
      this.running = true;
      let idx = 0, next = this.ctx.currentTime + 0.08;
      const tick = () => {
        while (next < this.ctx.currentTime + 0.12) {
          const s = get(), kind = s.info(s.taal, idx % s.taal.matras).kind;
          if (!s.muted) strike(this.ctx, this.m.input, next, s.taal.bols[idx % s.taal.matras], KIND_VEL[kind]);
          this.queue.push({ t: next, beat: idx % s.taal.matras, pulse: idx % s.taal.matras });
          next += 60 / (s.bpm * s.layak);
          idx++;
        }
      };
      tick();
      this.timer = setInterval(tick, 25);
    }

    // One-shot: events [{ at (pulse offset), bol, vel, tick }] at `pulseDur` seconds per pulse.
    once(events, pulseDur, lastPulse) {
      this.stop(); this._ensure();
      const t0 = this.ctx.currentTime + 0.12;
      for (const e of events) {
        strike(this.ctx, this.m.input, t0 + e.at * pulseDur, e.tick ? P.tick : e.bol, e.vel);
        this.queue.push({ t: t0 + e.at * pulseDur, pulse: e.at });
      }
      this.endAt = t0 + (lastPulse + 1.5) * pulseDur;
      this.running = true;
      this.timer = setInterval(() => { if (this.ctx.currentTime > this.endAt) this.stop(); }, 100);
    }

    // The beat that is sounding now (for drawing the playhead). Returns the newest queued beat whose time has passed.
    current() {
      if (!this.ctx) return null;
      const now = this.ctx.currentTime;
      let cur = null;
      while (this.queue.length && this.queue[0].t <= now) cur = this.queue.shift();
      return cur;
    }
    stop() {
      clearInterval(this.timer); this.timer = 0; this.queue = []; this.running = false;
      // notes are scheduled ahead of time; cutting the old output bus silences them at once, and a fresh bus serves the next start
      if (this.m) { try { this.m.out.disconnect(); } catch (e) { /* already disconnected */ } this.m = master(this.ctx, this.volume); }
    }
  }

  // Offline render of the theka, for checking timing without speakers.
  async function renderTheka(taal, info, bpm, cycles, sr) {
    sr = sr || 22050;
    const seconds = (cycles * taal.matras * 60) / bpm + 1.5;
    const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
    const m = master(ctx, 0.8);
    const ev = thekaEvents(taal, info, bpm, cycles).map((e) => Object.assign({}, e, { t: e.t + 0.1 }));
    for (const e of ev) strike(ctx, m.input, e.t, e.bol, e.vel);
    const buf = await ctx.startRendering();
    return { samples: buf.getChannelData(0), sr, events: ev };
  }

  const api = { strike, profileFor, thekaEvents, Player, renderTheka, PROFILES: P, KIND_VEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LayaSynth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
