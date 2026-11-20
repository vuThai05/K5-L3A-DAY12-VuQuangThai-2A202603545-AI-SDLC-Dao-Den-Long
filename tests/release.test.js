import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { BenchmarkWorld, benchmarkCamera, frameMetrics } from '../src/benchmark.js';
import { DEFAULT_BINDINGS, validBindings, rebind } from '../src/controls.js';
import { topTen, validateEntry, saveScore, loadScores } from '../src/leaderboard.js';
import { leaderboardStore } from '../scripts/leaderboard-store.js';
const entry = (extra = {}) => ({ name: 'Player_1', score: 100, nights_won: 1, achieved_at: '2026-11-20T03:00:00Z', seed: 12, ...extra });
test('benchmark metrics use real frame times, slowest ceil(1%) mean and nearest-rank p95', () => {
  const samples = [10, 10, 20, 100], m = frameMetrics(samples); assert.equal(m.frames, 4); assert.equal(m.avg_fps, 4000 / 140); assert.equal(m.p1_low_fps, 10); assert.equal(m.frame_ms_p95, 100); assert.deepEqual(samples, [10, 10, 20, 100]);
  const many = Array.from({ length: 200 }, (_, i) => i + 1), r = frameMetrics(many); assert.equal(r.p1_low_fps, 1000 / 199.5); assert.equal(r.frame_ms_p95, 190); assert.throws(() => frameMetrics([])); assert.throws(() => frameMetrics([0]));
});
test('benchmark creates exactly 200 wander/100 motes, freezes gameplay and keeps normal wander movement', () => {
  const a = new BenchmarkWorld(42), b = new BenchmarkWorld(42); assert.deepEqual(a.snapshot(), b.snapshot());
  assert.equal(a.shades.length, 200); assert.equal(a.motes.length, 100); assert.equal(a.lanterns.filter(l => l.lit).length, 3);
  const original = a.shades[0].pos.join(','); for (let i = 0; i < 600; i++) { a.step(); b.step(); }
  assert.deepEqual(a.snapshot(), b.snapshot()); assert.equal(a.shades.length, 200); assert.equal(a.motes.length, 100); assert.ok(a.shades.every(s => s.state === 'wander'));
  assert.notEqual(a.shades[0].pos.join(','), original); assert.deepEqual(a.player.pos, [0, 0, 0]); assert.equal(a.player.flames, 3); assert.ok(a.lanterns.slice(0, 3).every(l => l.fuel === 100)); assert.equal(a.state, 'playing');
  assert.deepEqual(benchmarkCamera(0), [30, 15, 0]); assert.ok(Math.abs(benchmarkCamera(3.75)[2] - 30) < 1e-9); assert.ok(Math.abs(benchmarkCamera(15)[0] - 30) < 1e-9);
});
test('all nine controls remap, conflicts and unsupported keys reject, defaults remain intact', () => {
  assert.ok(validBindings(DEFAULT_BINDINGS)); for (const action of Object.keys(DEFAULT_BINDINGS)) assert.equal(rebind(DEFAULT_BINDINGS, action, 'KeyZ')[action], 'KeyZ');
  assert.throws(() => rebind(DEFAULT_BINDINGS, 'jump', 'KeyW'), /đã dùng/); assert.throws(() => rebind(DEFAULT_BINDINGS, 'jump', 'MetaLeft')); assert.equal(DEFAULT_BINDINGS.jump, 'Space'); assert.ok(!validBindings({}));
});
test('leaderboard keeps ten, sorts score descending and ties by earlier instant across timezones', () => {
  const list = Array.from({ length: 12 }, (_, i) => entry({ name: `Player_${i}`, score: i })); assert.equal(topTen(list).length, 10); assert.equal(topTen(list)[0].score, 11);
  const ordered = topTen([entry({ name: 'Later', achieved_at: '2026-11-20T04:00:00Z' }), entry({ name: 'Early', achieved_at: '2026-11-20T10:00:00+07:00' })]); assert.equal(ordered[0].name, 'Early');
  for (const extra of [{ name: '<script>' }, { name: 'ab' }, { name: '1234567890123' }, { score: -1 }, { score: 1.1 }, { nights_won: 4 }, { achieved_at: '2026-11-20' }, { seed: NaN }]) assert.throws(() => validateEntry(entry(extra)));
});
test('leaderboard writes atomically, survives a fresh store and serializes concurrent saves', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lantern-board-'));
  try { const path = join(dir, 'leaderboard.json'), store = leaderboardStore(path); await Promise.all(Array.from({ length: 15 }, (_, i) => store.add(entry({ name: `Player_${i}`, score: i }))));
    const board = await leaderboardStore(path).read(); assert.equal(board.entries.length, 10); assert.equal(board.entries[0].score, 14); assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), board);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('static-host leaderboard fallback persists validated entries in localStorage', async () => {
  const values = new Map(), storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) }, unavailable = async () => ({ ok: false, status: 404 });
  await saveScore(entry(), storage, unavailable); const board = await loadScores(storage, unavailable); assert.equal(board.entries[0].score, 100); assert.equal(board.disk, false);
});
test('bench/soak reject invalid CLI inputs without opening any window', () => {
  for (const args of [['scripts/bench.js', '--seed', '42', '--duration', '0', '--out', 'unused'], ['scripts/soak.js', '--seed', 'bad', '--nights', '10', '--out', 'unused']]) assert.equal(spawnSync(process.execPath, args, { encoding: 'utf8' }).status, 2);
});
