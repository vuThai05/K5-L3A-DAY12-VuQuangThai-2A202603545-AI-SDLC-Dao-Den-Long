import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Game } from '../src/game.js';

let seed, nights, out;
try {
  const args = parseArgs({ options: { seed: { type: 'string' }, nights: { type: 'string' }, out: { type: 'string' } } }).values;
  seed = Number(args.seed); nights = Number(args.nights); out = args.out;
  if (!/^-?\d+$/.test(args.seed ?? '') || !Number.isSafeInteger(seed) || !Number.isSafeInteger(seed + nights) || !Number.isInteger(nights) || nights < 1 || nights > 10000 || !out) throw new Error('Use --seed <int> --nights <1..10000> --out <file.json>');
} catch (error) { console.error(error.message); process.exit(2); }
const rss = () => process.memoryUsage().rss / 1048576;
const gc = () => { globalThis.gc?.(); };
const start = performance.now(), results = []; let crashes = 0, memStart, game;
for (let i = 1; i <= nights; i++) {
  try {
    game = new Game(seed + i, {}, (i - 1) % 3 + 1);
    if (i === 1) { gc(); memStart = rss(); }
    let state = ((seed + i) >>> 0) || 0x9e3779b9, move = [0, 0];
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
    for (let tick = 0; tick < game.level.duration * 60 && game.state === 'playing'; tick++) {
      if (tick % 30 === 0) { const angle = random() * Math.PI * 2; move = [Math.cos(angle), Math.sin(angle)]; }
      game.step({ move, jump: random() < .05, dash: random() < .03, pulse: random() < .02, interact: random() < .1 });
    }
    results.push(game.state); game = null; gc();
  } catch (error) { crashes++; results.push('crashed'); console.error(`Night ${i}: ${error.message}`); game = null; gc(); }
}
// Reset to the last night's initial state, so both RSS samples include one loaded scene.
game = new Game(seed + nights, {}, (nights - 1) % 3 + 1); gc();
const report = { nights, crashes, results, mem_start_mb: memStart ?? rss(), mem_end_mb: rss(), duration_s: (performance.now() - start) / 1000 };
try { writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); }
catch (error) { console.error(error.message); process.exit(1); }
if (crashes || report.mem_end_mb > 1.2 * report.mem_start_mb) process.exitCode = 1;
