import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, T, validateInputs, validateScenario } from '../src/game.js';
const empty = { random_motes: false, random_shades: false };
const run = (g, n, input = {}) => { const events = []; for (let i = 0; i < n; i++) events.push(...g.step(input)); return events; };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('tick zero is scenario only: no input, points or events', () => {
  const g = new Game(1, { ...empty, motes: [[0, 0, 0]], lanterns: [{ id: 'L1', lit: true }] });
  assert.equal(g.tick, 0); assert.equal(g.player.carried, 0); assert.equal(g.score, 0); assert.deepEqual(g.events, []);
  assert.equal(g.snapshot().lanterns.length, 5); assert.equal(g.snapshot().sim_tick, 0);
  g.step(); assert.equal(g.player.carried, 1); assert.equal(g.score, T.score.per_mote);
});
test('camera movement formula, diagonal normalization, input retention, jump edge and landing', () => {
  const g = new Game(1, empty); run(g, 60, { move: [0, 1], cam_yaw_deg: 90 });
  near(g.player.pos[0], T.player_speed); near(g.player.pos[2], 0); g.step(); near(g.player.pos[0], 6.1);
  const d = new Game(1, empty); run(d, 60, { move: [1, 1] }); near(Math.hypot(d.player.pos[0], d.player.pos[2]), T.player_speed);
  const j = new Game(1, empty); j.step({ jump: true }); assert.ok(j.player.pos[1] > 0); run(j, 100, { jump: true });
  assert.equal(j.player.pos[1], 0); j.step({ jump: false }); j.step({ jump: true }); assert.ok(j.player.pos[1] > 0);
});
test('island boundary clamps horizontal movement without fall damage', () => {
  const g = new Game(1, empty); run(g, 1000, { move: [1, 1] }); near(Math.hypot(g.player.pos[0], g.player.pos[2]), 30); assert.equal(g.player.flames, 3);
});
test('pickup radius is inclusive in XZ, and capacity limits pickups', () => {
  const g = new Game(1, { ...empty, player: { pos: [0, 9, 0], carried: 19 }, motes: [[T.pickup_radius, 0, 0], [0, 0, 0], [1.501, 0, 0]] });
  g.step(); assert.equal(g.player.carried, 20); assert.equal(g.motes.length, 2);
});
test('partial deposit requires rising edge and last lamp wins once with correct score', () => {
  const g = new Game(1, { ...empty, player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [3, 0, 0] }, ...[2, 3, 4, 5].map(i => ({ id: `L${i}`, lit: true }))] });
  let events = g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 5); assert.equal(g.player.carried, 0);
  g.player.carried = 5; assert.equal(g.step({ interact: true }).length, 0); assert.equal(g.lanterns[0].deposited, 5);
  g.step({ interact: false }); events = g.step({ interact: true });
  assert.equal(g.state, 'won'); assert.equal(events.filter(e => e.name === 'lantern_lit').length, 1);
  assert.equal(events.at(-1).data.reason, 'all_lit'); assert.equal(g.score, 100 + 299 * 2 + 150);
  const score = g.score; g.step(); assert.equal(g.score, score);
});
test('out of range deposit and pulse with insufficient motes do nothing', () => {
  const g = new Game(1, { ...empty, player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [3.001, 0, 0] }], shades: [{ pos: [7.001, 0, 0] }] });
  assert.deepEqual(g.step({ interact: true, pulse: true }), []); assert.equal(g.player.carried, 2);
});
test('pulse costs motes, includes radius boundary, pushes, stuns and respects cooldown', () => {
  const g = new Game(1, { ...empty, player: { carried: 15 }, lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0] }], shades: [{ id: 'inside', pos: [7, 0, 0] }, { id: 'outside', pos: [7.001, 0, 0] }] });
  let events = g.step({ pulse: true }); assert.deepEqual(events[0].data.stunned_ids, ['inside']); assert.equal(g.player.carried, 12);
  assert.equal(g.shades[0].state, 'stunned'); near(g.shades[0].pos[0], 10); assert.equal(g.score, T.score.per_stun);
  g.step({ pulse: false }); assert.equal(g.step({ pulse: true }).filter(e => e.name === 'pulse').length, 0);
  run(g, 178, { pulse: false }); assert.equal(g.shades[0].state, 'chase');
  events = g.step({ pulse: true }); assert.equal(events[0].name, 'pulse'); assert.equal(g.player.carried, 9);
});
test('shades chase, hit, drop correct quantity and honor invulnerability', () => {
  const g = new Game(1, { ...empty, player: { carried: 8 }, shades: [{ pos: [1, 0, 0] }, { pos: [0, 0, 1] }] });
  let events = g.step(); assert.equal(g.player.flames, 2); assert.equal(g.player.carried, 6); assert.equal(g.motes.length, 2);
  assert.deepEqual(events.find(e => e.name === 'player_hit').data, { by: 'shade', flames: 2, dropped: 2 });
  run(g, 119); assert.equal(g.player.flames, 2); events = g.step(); assert.equal(g.player.flames, 1);
  assert.ok(events.some(e => e.name === 'player_hit')); run(g, 120); assert.equal(g.state, 'lost'); assert.equal(g.events.at(-1).data.reason, 'no_flames');
});
test('lit lamps repel shades and protect player', () => {
  const g = new Game(1, { ...empty, lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0] }], shades: [{ pos: [0, 0, 0] }, { pos: [8, 0, 0] }] });
  run(g, 300); assert.equal(g.player.flames, T.flames);
  assert.ok(g.shades.every(s => Math.hypot(s.pos[0], s.pos[2]) > T.safe_radius));
});
test('dawn, zero health and exact fixed time bookkeeping', () => {
  const g = new Game(1, { ...empty, time_left_s: 1 }); run(g, 59); near(g.time_left_s, 1 / 60); assert.equal(g.state, 'playing');
  g.step(); assert.equal(g.tick, 60); assert.equal(g.state, 'lost'); assert.equal(g.events.at(-1).data.reason, 'dawn');
  const dead = new Game(1, { ...empty, player: { flames: 0 } }); dead.step(); assert.equal(dead.state, 'lost');
});
test('spawn flags disable random spawns; seeded game is reproducible with unique ids', () => {
  const g = new Game(7, empty); run(g, 721); assert.equal(g.motes.length, 0); assert.equal(g.shades.length, 0);
  const a = new Game(44), b = new Game(44); assert.deepEqual(a.snapshot(), b.snapshot()); run(a, 721); run(b, 721); assert.deepEqual(a.snapshot(), b.snapshot());
  const custom = new Game(1, { ...empty, random_shades: true, shades: [{ id: 'S1', pos: [25, 0, 0] }, { pos: [-25, 0, 0] }] }); run(custom, 721);
  assert.equal(new Set(custom.shades.map(s => s.id)).size, custom.shades.length); assert.ok(custom.events.some(e => e.name === 'shade_spawned') || custom.shades.length === 3);
});
test('scenario uses defaults, preserves other lamps and replaces entity lists', () => {
  const g = new Game(1, { motes: [], shades: [], lanterns: [{ id: 'L2', pos: [2, 0, 3], deposited: 5 }] });
  assert.equal(g.motes.length, 0); assert.equal(g.shades.length, 0); assert.equal(g.lanterns.length, 5); assert.equal(g.lanterns[1].deposited, 5);
});
test('trust boundaries reject malformed documents', () => {
  for (const doc of [null, [], { player: null }, { player: { pos: [0, 0] } }, { player: { carried: 21 } }, { player: { flames: -1 } }, { motes: [null] }, { shades: [{ pos: [0, 0, 0], id: 2 }] }, { lanterns: [{ id: 'L6' }] }, { lanterns: [{ id: 'L1', lit: 'true' }] }, { time_left_s: -1 }, { random_motes: 0 }]) assert.throws(() => validateScenario(doc));
  for (const doc of [null, {}, { frames: [{ tick: 0 }, { tick: 0 }] }, { frames: [{ tick: -1 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, pulse: 1 }] }]) assert.throws(() => validateInputs(doc));
});
