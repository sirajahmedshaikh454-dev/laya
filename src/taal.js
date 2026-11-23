// Taal data and the tihai solver. Pure functions, no audio, no DOM.
//
// Vocabulary: a taal is a rhythmic cycle of `matras` beats grouped into vibhags (sections). Beat 1 is the SAM, the "home" beat.
// A TALI is a clapped beat, a KHALI is an unclapped (wave) beat. The THEKA is the basic pattern of bols (syllables) of the taal.
// A TIHAI is a phrase played three times, with the last bol of the third phrase landing exactly on sam.
(function (root) {
  const TAALS = {
    teentaal: { name: 'Teentaal', vibhag: [4, 4, 4, 4], marks: ['x', '2', '0', '3'],
      bols: ['Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Tin', 'Tin', 'Ta', 'Ta', 'Dhin', 'Dhin', 'Dha'] },
    keherwa: { name: 'Keherwa', vibhag: [4, 4], marks: ['x', '0'],
      bols: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ke', 'Dhi', 'Na'] },
    dadra: { name: 'Dadra', vibhag: [3, 3], marks: ['x', '0'],
      bols: ['Dha', 'Dhi', 'Na', 'Dha', 'Tu', 'Na'] },
    rupak: { name: 'Rupak', vibhag: [3, 2, 2], marks: ['0', '2', '3'],            // sam falls on a khali beat
      bols: ['Tin', 'Tin', 'Na', 'Dhi', 'Na', 'Dhi', 'Na'] },
    jhaptaal: { name: 'Jhaptaal', vibhag: [2, 3, 2, 3], marks: ['x', '2', '0', '3'],
      bols: ['Dhi', 'Na', 'Dhi', 'Dhi', 'Na', 'Ti', 'Na', 'Dhi', 'Dhi', 'Na'] },
  };
  for (const t of Object.values(TAALS)) t.matras = t.vibhag.reduce((a, b) => a + b, 0);

  // Where does beat i (0-based) sit? { vibhag, first (starts a vibhag), mark ('x' sam, '2','3' tali, '0' khali), kind }
  function beatInfo(taal, i) {
    let acc = 0;
    for (let v = 0; v < taal.vibhag.length; v++) {
      if (i < acc + taal.vibhag[v]) {
        const first = i === acc, mark = first ? taal.marks[v] : '';
        return { vibhag: v, first, mark, khali: first && mark === '0', kind: !first ? 'beat' : i === 0 ? 'sam' : mark === '0' ? 'khali' : 'tali' };      // Rupak's sam is also a khali
      }
      acc += taal.vibhag[v];
    }
    throw new RangeError('beat out of range');
  }

  const mod = (a, n) => ((a % n) + n) % n;

  // A tihai starts S pulses after sam (0-based), has phrase length P pulses and a gap of G pulses between the repeats:
  //   phrase | gap | phrase | gap | phrase           total span = 3P + 2G
  // its last pulse is at S + 3P + 2G - 1, which must be a multiple of the cycle length (a sam).
  // Pulses are the finest unit used: with k = 2, a pulse is half a beat. `cycle` = beats * k.
  function solveTihai({ cycle, start, phrase, maxGap }) {
    const out = [];
    const limit = maxGap == null ? cycle : maxGap;
    for (let g = 0; g <= limit; g++) {
      if (mod(start + 3 * phrase + 2 * g - 1, cycle) === 0) out.push({ gap: g, span: 3 * phrase + 2 * g, cycles: Math.ceil((start + 3 * phrase + 2 * g) / cycle) });
    }
    return out;
  }

  // The three phrases and two gaps laid out on the pulse line, starting at `start`.
  function tihaiLayout({ start, phrase, gap }) {
    const parts = [];
    let at = start;
    for (let r = 0; r < 3; r++) {
      parts.push({ type: 'phrase', from: at, len: phrase, n: r + 1 });
      at += phrase;
      if (r < 2 && gap > 0) { parts.push({ type: 'gap', from: at, len: gap }); at += gap; }
    }
    return parts;
  }

  // For one phrase length: the smallest working gap from each possible start (null when no whole-pulse gap works).
  function tihaiMap({ cycle, phrase }) {
    const row = [];
    for (let s = 0; s < cycle; s++) { const r = solveTihai({ cycle, start: s, phrase }); row.push(r.length ? r[0].gap : null); }
    return row;
  }

  const api = { TAALS, beatInfo, solveTihai, tihaiLayout, tihaiMap, mod };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LayaTaal = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
