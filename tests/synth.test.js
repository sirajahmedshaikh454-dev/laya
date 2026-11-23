const test = require('node:test');
const assert = require('node:assert');
const { profileFor, PROFILES } = require('../src/synth.js');

test('rests: hyphen, en dash, em dash, underscore, empty', () => {
  for (const r of ['-', '–', '—', '_', '--', '', '  ', null, undefined]) assert.strictEqual(profileFor(r), null, JSON.stringify(r));
});
test('known bols and spellings map to the right voice', () => {
  assert.strictEqual(profileFor('Dha'), PROFILES.Dha);
  assert.strictEqual(profileFor('dha'), PROFILES.Dha);
  assert.strictEqual(profileFor('Ghe'), PROFILES.Ge);          // a common spelling of Ge: the long bayan stroke
  assert.strictEqual(profileFor('Ge'), PROFILES.Ge);
  assert.strictEqual(profileFor('Tirakita'), PROFILES.Ti);
});
test('any other bol still sounds', () => {
  for (const b of ['Dhere', 'Kat', 'Xyz', 'Nana', 'धा']) assert.ok(profileFor(b), b);
});
