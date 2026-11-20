import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';

const dir = 'docs/proof/phase-2'; mkdirSync(dir, { recursive: true });
const results = [];
function command(args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  results.push({ command: ['node', ...args].join(' '), status: result.status });
  assert.equal(result.status, 0, `Failed: node ${args.join(' ')}`); return result;
}
function json(name, data) { const path = `${dir}/${name}.json`; writeFileSync(path, JSON.stringify(data, null, 2) + '\n'); return path; }
const tests = command(['--test']); writeFileSync(`${dir}/tests.tap`, tests.stdout);
for (const file of ['src/main.js', 'src/scene.js', 'src/audio.js', 'src/game.js']) command(['--check', file]);
command(['scripts/build.js']);
const base = new Game(12, { random_motes: false, random_shades: false });
const scenario = { random_motes: false, random_shades: false, motes: base.lanterns.flatMap(l => Array.from({ length: 10 }, () => l.pos)) };
const frames = [];
for (const l of base.lanterns) {
  const dx = l.pos[0] - base.player.pos[0], dz = l.pos[2] - base.player.pos[2], d = Math.hypot(dx, dz);
  const move = [dx / d, dz / d], n = Math.ceil(d / .1);
  frames.push({ tick: base.tick, move, interact: false });
  for (let i = 0; i < n; i++) base.step({ move, interact: false });
  frames.push({ tick: base.tick, move: [0, 0], interact: true }); base.step({ move: [0, 0], interact: true });
}
const winScenario = json('win-scenario', scenario), winInputs = json('win-inputs', { frames });
const winArgs = ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', '3000', '--snapshot-every', '60', '--scenario', winScenario, '--inputs', winInputs, '--out', `${dir}/win.jsonl`];
command(winArgs);
const first = readFileSync(`${dir}/win.jsonl`);
assert.equal(JSON.parse(first.toString().trim().split('\n').at(-1)).state, 'won');
command(winArgs); assert.deepEqual(readFileSync(`${dir}/win.jsonl`), first);
for (const [name, s, input, ticks] of [
  ['loss', { random_motes: false, random_shades: false, shades: [{ pos: [0, 0, 0] }] }, { frames: [] }, 600],
  ['pulse', { random_motes: false, random_shades: false, player: { carried: 6 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] }, { frames: [{ tick: 0, pulse: true }] }, 120],
  ['dawn', { random_motes: false, random_shades: false, time_left_s: 1 }, { frames: [] }, 120]
]) {
  command(['src/headless.js', '--seed', '12', '--night', '1', '--ticks', String(ticks), '--scenario', json(`${name}-scenario`, s), '--inputs', json(`${name}-inputs`, input), '--out', `${dir}/${name}.jsonl`]);
  const rows = readFileSync(`${dir}/${name}.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  if (name === 'pulse') assert.deepEqual(rows.find(r => r.name === 'pulse').data.stunned_ids, ['S1']);
  else assert.equal(rows.find(r => r.name === 'game_over').data.reason, name === 'dawn' ? 'dawn' : 'no_flames');
}
const seededArgs = ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', '900', '--snapshot-every', '120', '--out', `${dir}/seeded.jsonl`];
command(seededArgs); const seeded = readFileSync(`${dir}/seeded.jsonl`);
command(seededArgs); assert.deepEqual(readFileSync(`${dir}/seeded.jsonl`), seeded);
const nightHashes = [];
for (const night of [1, 2, 3]) {
  const args = ['src/headless.js', '--seed', '123', '--night', String(night), '--ticks', '1900', '--snapshot-every', '120', '--out', `${dir}/night-${night}.jsonl`];
  command(args); const output = readFileSync(`${dir}/night-${night}.jsonl`); command(args); assert.deepEqual(readFileSync(`${dir}/night-${night}.jsonl`), output);
  const rows = output.toString().trim().split('\n').map(JSON.parse); assert.equal(rows[0].night, night);
  for (const s of rows.filter(r => r.type === 'snapshot')) for (const key of ['wind', 'motes', 'drifters', 'charms']) assert.ok(key in s);
  nightHashes.push({ night, sha256: createHash('sha256').update(output).digest('hex') });
}
const benchmarkScenario = json('benchmark-scenario', { wind_enabled: false, player: { pos: [0, 6, 6] }, lanterns: [{ id: 'L1', lit: true }] });
const started = performance.now();
command(['src/headless.js', '--seed', '12', '--night', '3', '--ticks', '21600', '--snapshot-every', '600', '--scenario', benchmarkScenario, '--out', `${dir}/benchmark.jsonl`]);
const elapsed = performance.now() - started, end = JSON.parse(readFileSync(`${dir}/benchmark.jsonl`, 'utf8').trim().split('\n').at(-1));
assert.equal(end.ticks, 21600); assert.ok(elapsed <= 30000, `Headless exceeded 30s: ${elapsed}ms`);
const sha = createHash('sha256').update(first).digest('hex');
const report = { verified_at: new Date().toISOString(), contract_version: '1.1', node: process.version, platform: process.platform, results, deterministic_nights: nightHashes,
  benchmark: { ticks: end.ticks, elapsed_ms: Math.round(elapsed), budget_ms: 30000, wind_disabled: true, note: 'Night 3, player in L1 safe area, other lamps unlit, standard random spawns enabled. Includes CLI and JSONL I/O.' },
  deterministic_win_sha256: sha, win: JSON.parse(first.toString().trim().split('\n').at(-1)), visual_verification: 'No WebGL/browser verification. HTTP/module checks and a DOM stub exercise flow handlers; they do not verify rendered graphics, audio quality, FPS or human playability.' };
writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Verification passed; evidence saved to ${dir}`);
