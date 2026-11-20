import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const cli = (...args) => spawnSync(process.execPath, ['src/headless.js', ...args], { encoding: 'utf8' });

test('Contract 1.1 CLI accepts all nights and keeps executing input ticks during pause', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-v11-'));
  try {
    const scenario = join(dir, 'scenario.json'), inputs = join(dir, 'inputs.json'), out = join(dir, 'out.jsonl');
    writeFileSync(scenario, JSON.stringify({ random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false }));
    writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 20, pause: true }, { tick: 21, pause: false }] }));
    for (const night of [1, 2, 3]) {
      const result = cli('--seed', '5', '--night', String(night), '--ticks', '30', '--snapshot-every', '1', '--scenario', scenario, '--inputs', inputs, '--out', out);
      assert.equal(result.status, 0, result.stderr);
      const lines = readFileSync(out, 'utf8').trim().split('\n').map(JSON.parse), snapshots = lines.filter(l => l.type === 'snapshot');
      assert.equal(snapshots[11].state, 'paused'); assert.equal(snapshots[20].sim_tick, 10); assert.equal(snapshots[30].sim_tick, 20);
      assert.equal(snapshots[30].night, night); assert.equal(lines.at(-1).ticks, 30); assert.ok(lines.some(e => e.name === 'resumed'));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI tick model, snapshot schedule, input retention and byte determinism', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-test-'));
  try {
    const scenario = join(dir, 'scenario.json'), inputs = join(dir, 'inputs.json'), out = join(dir, 'out.jsonl');
    writeFileSync(scenario, JSON.stringify({ random_motes: false, random_shades: false, motes: [[0, 0, 0]], time_left_s: 10 }));
    writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 60, move: [0, 0] }] }));
    const args = ['--seed', '12', '--night', '1', '--ticks', '61', '--scenario', scenario, '--inputs', inputs, '--out', out];
    let result = cli(...args); assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, '');
    const text = readFileSync(out, 'utf8'), lines = text.trim().split('\n').map(JSON.parse);
    const shots = lines.filter(l => l.type === 'snapshot');
    assert.deepEqual(shots.map(s => s.tick), [0, 10, 20, 30, 40, 50, 60]);
    assert.equal(shots[0].player.carried, 0); assert.equal(lines.find(l => l.name === 'mote_picked').tick, 1);
    assert.deepEqual(shots.at(-1).player.pos, [0, 0, 6]); assert.equal(shots.at(-1).time_left_s, 9);
    assert.deepEqual(lines.at(-1), { type: 'end', ticks: 61, state: 'playing', score: 0 });
    result = cli(...args); assert.equal(result.status, 0); assert.equal(readFileSync(out, 'utf8'), text);
    result = cli('--seed', '0', '--night', '1', '--ticks', '0', '--out', out); assert.equal(result.status, 0);
    assert.equal(readFileSync(out, 'utf8').trim().split('\n').length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('CLI reports document errors on stderr and exits 2, output failure exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-test-'));
  try {
    const bad = join(dir, 'bad.json'); writeFileSync(bad, '{');
    const base = ['--seed', '1', '--night', '1', '--ticks', '1', '--out', join(dir, 'out.jsonl')];
    for (const flag of ['--scenario', '--inputs']) {
      const result = cli(...base, flag, bad); assert.equal(result.status, 2); assert.ok(result.stderr); assert.equal(result.stdout, '');
    }
    writeFileSync(bad, JSON.stringify({ frames: [{ tick: 1 }, { tick: 0 }] })); assert.equal(cli(...base, '--inputs', bad).status, 2);
    assert.equal(cli('--seed', '1', '--night', '1', '--ticks', '-1', '--out', 'unused').status, 2);
    assert.equal(cli('--seed', '1', '--night', '1', '--ticks', '1', '--out', join(dir, 'missing', 'out')).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
