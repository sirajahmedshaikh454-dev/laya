# Laya

**A tabla and rhythm studio in your browser.** Pick a taal, keep time with a synthesized theka, watch the cycle turn on a dial that looks like a tabla skin, and use the **tihai lab** to find every way a phrase can be played three times so that it lands exactly on sam.

*Laya* (लय) is the Hindustani word for tempo and rhythmic flow. This is a single static page: no samples, no network, no accounts, no dependencies. Double-click `index.html`.

## What you can do

- **Five taals**: Teentaal (16), Keherwa (8), Dadra (6), Rupak (7), Jhaptaal (10), each with its theka, vibhag dividers and the markings **x** (sam), **2 / 3** (tali, clap) and **0** (khali, wave).
- **A live dial**: the playhead moves on the exact audio clock, so what you see is what you hear. The centre shows the bol being played.
- **Tempo** 30 to 240 beats per minute, **tap tempo**, **layakari** (x1, x2, x4 speed), volume, and a **silent** mode (dial only) for clapping along.
- **Tihai lab**: type a phrase of bols (`-` is a rest), choose one or two pulses per beat, and Laya shows
  - a **map** of every starting beat with the shortest gap that works (or a dash if none does),
  - **every valid gap** from the chosen start, with how long it lasts,
  - a **layout** of the three phrases, the gaps and the final bol on sam,
  - **Hear it**: plays a soft count and then your tihai, ending on sam.
- Keyboard: **Space** starts and stops.

## The tihai maths

A tihai is a phrase played three times with the last bol of the third phrase on sam. With phrase length `P` pulses, a gap of `G` pulses between repeats, starting `S` pulses after sam, in a cycle of `C` pulses, the last bol is at pulse `S + 3P + 2G - 1`, which must be a multiple of `C`.

So `2G ≡ -(S + 3P - 1) (mod C)`. That is why some starts have no answer: when `C` is even and `S + 3P - 1` is odd, no whole-pulse gap exists. Laya says so and shows which starts do work, and half-beat bols (two pulses per beat) open up the odd cases. Example: a 4-beat phrase starting on beat 14 of Teentaal works with a gap of 4 beats (20 beats in all, ending on sam of the third cycle).

`tests/taal.test.js` checks the solver by **brute force over every taal, every start, every phrase length up to two cycles, and both pulse sizes**, comparing the solver with an independent check of the same congruence.

## How do I know it plays in time? (measured)

`audio-check.html` renders every taal offline (no speakers needed) and measures the waveform. At 60 beats per minute, for all five taals: exact silence before the first bol, a strong attack at every expected beat, silence immediately before each attack, and zero clipped samples. In the live page, the dial's playhead was sampled against the audio clock: it advanced every 0.75 s at 80 beats per minute, and a tihai preview ended on beat 0 (sam) exactly one pulse after the previous bol.

## Honest limits

- **The sound is synthesized**, a cartoon of tabla: a bass drum (bayan) as a sine whose pitch sweeps down, a treble drum (dayan) with harmonics, and a click. It is good for keeping time and hearing a phrase. It is not a recording of a real drum and I have not listened to it through speakers on every device, so judge the timbre with your own ears.
- **Thekas follow the common forms**; gharanas and teachers vary. Verify against your teacher.
- **Tihai convention**: here the last bol of the third phrase falls on sam. Some teachers end the third phrase one beat before sam and then play sam alone; shift your phrase by one pulse to hear that version.
- Only five taals so far, no ektaal, dhamar, or chautaal.

## Layout

```
index.html       the page
src/taal.js      taal data, beat marks, tihai solver (pure functions)
src/synth.js     tabla voices (Web Audio), look-ahead player, offline render
src/app.js       dial, controls, tihai lab (everything from the user is inserted as text, never as HTML)
tests/           node:test, standard library only
audio-check.html offline audio measurement (open it in a browser)
tools/serve.js   tiny static server (npm run serve)
```

`npm test` runs the logic tests (Node 18 or newer).

## Skills & methodology

**Method.** Domain first: I checked the talas, tali and khali positions, and the tihai convention against music sources before writing code, and kept the convention explicit in the UI. Build bottom-up: pure rhythm logic with exhaustive tests, then the sound with a measurement that needs no speakers (offline rendering), then the interface, each step committed and pushed after the tests passed. In the browser I verified the real thing end to end: a genuine click starts audio, the audio clock advances, the playhead tracks it, the tihai ends on sam, and the layout works at phone width in light and dark. That caught a real defect (bol names invisible on the light-mode dial) and a layout overflow that unit tests could not.

**Skills and tools.** Claude Code with web search for the theory checks; Web Audio and `OfflineAudioContext` for measurable sound; the built-in browser for interactive verification and phone/light/dark checks; an independent read-only review subagent that audited the music theory (all five thekas and the tihai arithmetic came back correct, with one note that some purists play "Na Tin Tin Na" on Teentaal's khali), the solver, and the UI code. It confirmed 8 problems, all fixed: Stop did not silence already-scheduled notes, corrupt saved settings could freeze or crash the page, Space hijacked checkboxes and sliders, en and em dashes were not rests, "Ghe" played as the wrong stroke, the dial showed theka bols during a tihai, keyboard focus was lost after each click, and over-long phrases were cut silently; the `ponytail` style (no dependencies, no build, smallest working design).

**Choices worth defending.** The playhead reads the audio clock rather than a timer, so it cannot drift from the sound. Scheduling uses a look-ahead window, so tempo changes apply on the next beat without glitches. The solver reports "no whole-pulse gap" honestly and shows what would work instead of forcing an answer.

## License

MIT.
