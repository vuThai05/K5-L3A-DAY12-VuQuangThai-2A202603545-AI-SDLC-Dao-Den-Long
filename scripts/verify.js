import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';

const dir = 'docs/proof/phase-1'; mkdirSync(dir, { recursive: true });
const results = [];
function command(args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  results.push({ command: ['node', ...args].join(' '), status: result.status });
  assert.equal(result.status, 0, `Failed: node ${args.join(' ')}`); return result;
}
function json(name, data) { const path = `${dir}/${name}.json`; writeFileSync(path, JSON.stringify(data, null, 2) + '\n'); return path; }
const tests = command(['--test']); writeFileSync(`${dir}/tests.tap`, tests.stdout);
command(['--check', 'src/main.js']); command(['scripts/build.js']);
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
const sha = createHash('sha256').update(first).digest('hex');
const report = { verified_at: new Date().toISOString(), node: process.version, platform: process.platform, results, deterministic_win_sha256: sha, win: JSON.parse(first.toString().trim().split('\n').at(-1)), visual_verification: 'Not yet performed. CLI tests do not verify WebGL or visual playability.' };
writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Verification passed; evidence saved to ${dir}`);
