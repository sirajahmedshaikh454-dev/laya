const test = require('node:test');
const assert = require('node:assert');
const { TAALS, beatInfo, solveTihai, tihaiLayout, tihaiMap } = require('../src/taal.js');

test('every taal is internally consistent', () => {
  for (const [key, t] of Object.entries(TAALS)) {
    assert.strictEqual(t.bols.length, t.matras, key);
    assert.strictEqual(t.marks.length, t.vibhag.length, key);
  }
  assert.deepStrictEqual(Object.values(TAALS).map((t) => t.matras), [16, 8, 6, 7, 10]);
});

test('claps and waves fall where the tradition puts them', () => {
  const marks = (t) => Array.from({ length: t.matras }, (_, i) => beatInfo(t, i)).map((b, i) => (b.first ? `${i + 1}${b.kind}` : null)).filter(Boolean);
  assert.deepStrictEqual(marks(TAALS.teentaal), ['1sam', '5tali', '9khali', '13tali']);
  assert.deepStrictEqual(marks(TAALS.jhaptaal), ['1sam', '3tali', '6khali', '8tali']);
  assert.deepStrictEqual(marks(TAALS.rupak), ['1sam', '4tali', '6tali']);
  assert.strictEqual(beatInfo(TAALS.rupak, 0).khali, true);                       // Rupak: sam is a khali beat
  assert.strictEqual(beatInfo(TAALS.teentaal, 0).khali, false);
  assert.deepStrictEqual(marks(TAALS.keherwa), ['1sam', '5khali']);
  assert.deepStrictEqual(marks(TAALS.dadra), ['1sam', '4khali']);
});

test('beatInfo rejects beats outside the cycle', () => {
  assert.throws(() => beatInfo(TAALS.dadra, 6), RangeError);
});

test('a worked example: a 4-beat phrase in Teentaal starting on beat 14 lands on sam with a gap of 4 beats', () => {
  // start 13 (beat 14), P = 4: need 13 + 12 + 2g - 1 = 24 + 2g to be a multiple of 16 -> g = 4
  const r = solveTihai({ cycle: 16, start: 13, phrase: 4 });
  assert.deepStrictEqual(r.map((x) => x.gap), [4, 12]);
});

test('Jhaptaal: a 5-beat phrase from sam needs a gap of 3 (or 8) beats to land on the next sam', () => {
  assert.deepStrictEqual(solveTihai({ cycle: 10, start: 0, phrase: 5 }).map((x) => x.gap), [3, 8]);
  assert.deepStrictEqual(solveTihai({ cycle: 10, start: 0, phrase: 6 }), []);      // 17 + 2g is odd: no whole-beat gap works
});

test('property: every reported gap lands on sam, and no valid gap is missed (all taals, k = 1 and 2)', () => {
  for (const t of Object.values(TAALS)) {
    for (const k of [1, 2]) {
      const cycle = t.matras * k;
      for (let start = 0; start < cycle; start++) {
        for (let phrase = 1; phrase <= 2 * cycle; phrase++) {
          const found = new Set(solveTihai({ cycle, start, phrase }).map((x) => x.gap));
          for (let g = 0; g <= cycle; g++) {
            const lands = (start + 3 * phrase + 2 * g - 1) % cycle === 0;       // brute force, independent of mod()
            assert.strictEqual(found.has(g), lands, `${t.name} k=${k} start=${start} P=${phrase} g=${g}`);
          }
        }
      }
    }
  }
});

test('layout: three phrases and two gaps, ending on the last pulse before the next sam', () => {
  const L = tihaiLayout({ start: 13, phrase: 4, gap: 4 });
  assert.deepStrictEqual(L.map((p) => [p.type, p.from, p.len]), [['phrase', 13, 4], ['gap', 17, 4], ['phrase', 21, 4], ['gap', 25, 4], ['phrase', 29, 4]]);
  const last = L[L.length - 1];
  assert.strictEqual((last.from + last.len - 1) % 16, 0);
});

test('a bedam tihai (no gap) has no gap parts', () => {
  const L = tihaiLayout({ start: 5, phrase: 4, gap: 0 });
  assert.deepStrictEqual(L.map((p) => p.type), ['phrase', 'phrase', 'phrase']);
});

test('map: smallest gap per start, null when impossible in whole pulses', () => {
  const row = tihaiMap({ cycle: 16, phrase: 4 });
  assert.strictEqual(row.length, 16);
  assert.strictEqual(row[13], 4);
  assert.strictEqual(row[0], null);                 // 0 + 12 + 2g - 1 = 11 + 2g is odd, never a multiple of 16
});

test('Rupak: a gapless phrase of 2 beats must begin on beat 3 to end on sam', () => {
  const r = solveTihai({ cycle: 7, start: 2, phrase: 2, maxGap: 0 });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(solveTihai({ cycle: 7, start: 3, phrase: 2, maxGap: 0 }).length, 0);
});
