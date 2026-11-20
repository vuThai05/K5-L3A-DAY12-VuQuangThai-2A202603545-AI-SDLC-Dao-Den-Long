import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';

const dir = 'docs/proof/phase-4'; mkdirSync(dir, { recursive: true });
const results = [];
function command(args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  results.push({ command: ['node', ...args].join(' '), status: result.status });
  assert.equal(result.status, 0, `Failed: node ${args.join(' ')}`); return result;
}
function json(name, data) { const path = `${dir}/${name}.json`; writeFileSync(path, JSON.stringify(data, null, 2) + '\n'); return path; }
const tests = command(['--test']); writeFileSync(`${dir}/tests.tap`, tests.stdout);
for (const file of ['src/main.js', 'src/scene.js', 'src/audio.js', 'src/game.js', 'src/benchmark-client.js', 'scripts/bench.js', 'scripts/soak.js', 'scripts/publish-release.js']) command(['--check', file]);
command(['scripts/build.js']);
const base = new Game(12, { random_motes: false, random_shades: false });
const scenario = { random_motes: false, random_shades: false, time_left_s: 40, motes: base.lanterns.flatMap(l => Array.from({ length: 10 }, () => l.pos)) };
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
assert.deepEqual(first, readFileSync('docs/proof/phase-3/win.jsonl'), 'Phase 4 changed the established Phase 3 gameplay output');
assert.equal(JSON.parse(first.toString().trim().split('\n').at(-1)).state, 'won');
assert.equal(JSON.parse(first.toString().trim().split('\n').at(-1)).ticks, 2400);
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
  for (const s of rows.filter(r => r.type === 'snapshot')) {
    for (const key of ['wind', 'motes', 'drifters', 'charms']) assert.ok(key in s);
    assert.ok(s.player.capacity >= 10 && s.player.capacity <= 20);
    for (const l of s.lanterns) { assert.equal(typeof l.ever_lit, 'boolean'); assert.ok(Number.isInteger(l.relit_count)); assert.ok(l.fuel >= 0 && l.fuel <= 100); }
  }
  nightHashes.push({ night, sha256: createHash('sha256').update(output).digest('hex') });
}
const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
for (const [name, scenario, inputs, ticks] of [
  ['fuel-cycle', { ...empty, time_left_s: 2, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: .1 }, { id: 'L2', lit: true }, { id: 'L3', lit: true }], shades: [{ id: 'S1', pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }, { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 2, interact: true }] }, 120],
  ['drain', { ...empty, player: { pos: [20, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 29 }], shades: [{ id: 'S1', pos: [1, .8, 0], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [-1, .8, 0], state: 'drain', target_lantern_id: 'L1' }] }, { frames: [] }, 180]
]) {
  const args = ['src/headless.js', '--seed', '12', '--night', '1', '--ticks', String(ticks), '--scenario', json(`${name}-scenario`, scenario), '--inputs', json(`${name}-inputs`, inputs), '--out', `${dir}/${name}.jsonl`];
  command(args); const bytes = readFileSync(`${dir}/${name}.jsonl`); command(args); assert.deepEqual(readFileSync(`${dir}/${name}.jsonl`), bytes);
  const rows = bytes.toString().trim().split('\n').map(JSON.parse);
  assert.ok(rows.some(e => e.name === 'lantern_out'));
  if (name === 'fuel-cycle') { assert.ok(rows.some(e => e.name === 'refuel')); assert.ok(rows.some(e => e.name === 'lantern_lit' && e.data.relight)); assert.equal(rows.find(e => e.name === 'game_over').data.reason, 'dawn_survived'); }
  else assert.ok(rows.some(e => e.name === 'fuel_drain'));
}
const benchmarkScenario = json('benchmark-scenario', { wind_enabled: false, player: { pos: [0, 6, 6] }, lanterns: [{ id: 'L1', lit: true }] });
const started = performance.now();
command(['src/headless.js', '--seed', '12', '--night', '3', '--ticks', '18000', '--snapshot-every', '600', '--scenario', benchmarkScenario, '--out', `${dir}/benchmark.jsonl`]);
const elapsed = performance.now() - started, end = JSON.parse(readFileSync(`${dir}/benchmark.jsonl`, 'utf8').trim().split('\n').at(-1));
assert.equal(end.ticks, 18000); assert.ok(elapsed <= 30000, `Headless exceeded 30s: ${elapsed}ms`);
const sha = createHash('sha256').update(first).digest('hex');
command(['--jitless', '--expose-gc', '--max-old-space-size=32', '--max-semi-space-size=1', 'scripts/soak.js', '--seed', '7', '--nights', '10', '--out', `${dir}/soak.json`]);
const soak = JSON.parse(readFileSync(`${dir}/soak.json`, 'utf8')); assert.equal(soak.crashes, 0); assert.equal(soak.results.length, 10); assert.ok(soak.mem_end_mb <= 1.2 * soak.mem_start_mb);
const gpuBenchmark = { status: 'awaiting_user_run', reason: 'User explicitly requested no preview; a real GPU window is required for frame metrics.', command: 'npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json' };
writeFileSync(`${dir}/bench-status.json`, JSON.stringify(gpuBenchmark, null, 2) + '\n');
const report = { verified_at: new Date().toISOString(), contract_version: '1.3', node: process.version, platform: process.platform, results, deterministic_nights: nightHashes, phase3_win_identical: true, soak, gpu_benchmark: gpuBenchmark,
  headless_benchmark: { ticks: end.ticks, elapsed_ms: Math.round(elapsed), budget_ms: 30000, wind_disabled: true, note: 'Full 300s Night 3. Player on tier 2, L1 initially lit and allowed to expire, other lamps unlit; standard random spawns enabled. Includes CLI and JSONL I/O; not GPU FPS or worst-case measurement.' },
  deterministic_win_sha256: sha, win: JSON.parse(first.toString().trim().split('\n').at(-1)), win_fixture: '40s scenario at standard Night 1 lamp positions, ten motes per lamp, random spawns off; verifies movement/deposit and waiting for dawn, not full-night human balance.', visual_verification: 'Not run per user instruction. HTTP/module checks and a DOM stub exercise flow/settings handlers; they do not verify rendered graphics, audio quality, FPS or human playability.' };
writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Verification passed; evidence saved to ${dir}`);
