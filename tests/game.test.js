import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, T, validateInputs, validateScenario } from '../src/game.js';
import { levelFor, groundAt } from '../src/levels.js';
const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const run = (g, n, input = {}) => { const events = []; for (let i = 0; i < n; i++) events.push(...g.step(input)); return events; };
const near = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('three maps have exact standard lamps, spawn slots, terrain and charm/pad locations', () => {
  const a = levelFor(1), b = levelFor(2), c = levelFor(3);
  assert.deepEqual(a.lamps[1], [23.8, 0, 7.7]); assert.equal(a.motePoints.length, 24); assert.equal(a.shadePoints.length, 12);
  assert.equal(b.lamps.length, 6); assert.equal(b.motePoints.length, 24); assert.equal(c.lamps.length, 7); assert.equal(c.motePoints.length, 30);
  assert.equal(groundAt(a, 40, 0), 0); assert.equal(groundAt(a, 40.01, 0), null);
  assert.equal(groundAt(b, 35, 2), 0); assert.equal(groundAt(b, 35, 2.01), null);
  assert.equal(groundAt(c, 0, 15), 3); assert.equal(groundAt(c, 0, -15), 0); assert.equal(groundAt(c, 5, 0), 6);
  near(groundAt(c, 27 * Math.cos(Math.PI / 6), 27 * Math.sin(Math.PI / 6)), 1.5);
});
test('tick zero has no gameplay events or points; snapshot includes 1.1 fields', () => {
  const g = new Game(1, { ...empty, motes: [[0, 0, 0]], lanterns: [{ id: 'L1', lit: true }] });
  assert.equal(g.tick, 0); assert.equal(g.player.carried, 0); assert.equal(g.score, 0); assert.deepEqual(g.events, []);
  const s = g.snapshot(); for (const key of ['night', 'wind', 'motes', 'drifters', 'charms', 'sim_tick']) assert.ok(key in s);
  for (const key of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(key in s.player);
  const events = g.step(); assert.equal(events[0].name, 'night_start'); assert.equal(g.player.carried, 1); assert.equal(g.score, 0);
});
test('movement uses camera rotation, input retention and diagonal normalization', () => {
  const g = new Game(1, empty); run(g, 60, { move: [0, 1], cam_yaw_deg: 90 }); near(g.player.pos[0], 6); near(g.player.pos[2], 0);
  g.step(); near(g.player.pos[0], 6.1);
  const d = new Game(1, empty); run(d, 60, { move: [1, 1] }); near(Math.hypot(d.player.pos[0], d.player.pos[2]), 6);
});
test('jump follows gravity -20, air control is full, holding jump never repeats', () => {
  const g = new Game(1, empty); g.step({ jump: true, move: [1, 0] }); near(g.player.vel[1], 7 - 20 / 60);
  run(g, 59, { jump: true, move: [1, 0] }); near(g.player.pos[0], 6); assert.equal(g.player.pos[1], 0); assert.equal(g.player.grounded, true);
  g.step({ jump: false }); g.step({ jump: true }); assert.ok(g.player.pos[1] > 0);
});
test('dash covers 2.8 m in 12 ticks, locks direction, and cooldown starts at activation', () => {
  const g = new Game(1, empty); g.step({ dash: true, move: [1, 0] }); run(g, 11, { move: [-1, 0] }); near(g.player.pos[0], 2.8);
  assert.equal(g.invuln, 0); assert.equal(g.dashTicks, 0); assert.equal(g.dashCd, 79);
  g.step({ dash: false, move: [0, 0] }); assert.ok(!g.step({ dash: true }).some(e => e.name === 'dash'));
  run(g, 76, { dash: false }); assert.ok(g.step({ dash: true }).some(e => e.name === 'dash'));
});
test('air dash holds Y for all 12 ticks and does not grant damage immunity', () => {
  const g = new Game(1, { ...empty, player: { pos: [0, 2, 0], vel: [0, 3, 0] } }); run(g, 12, { dash: true }); near(g.player.pos[1], 2); assert.equal(g.snapshot().player.vel[1], 0);
  g.step({ dash: false }); assert.ok(g.player.pos[1] > 2);
  const hit = new Game(1, { ...empty, shades: [{ pos: [0, .8, .2], state: 'chase' }] }); hit.step({ dash: true }); assert.equal(hit.player.flames, 2);
});
test('pickup checks inclusive horizontal and height bounds, caps at 10, awards no points', () => {
  const g = new Game(1, { ...empty, player: { pos: [0, 1.5, 0], carried: 9 }, motes: [[1, 0, 0], [0, 0, 0]] }); g.step({ dash: true });
  assert.equal(g.player.carried, 10); assert.equal(g.motes.length, 1); assert.equal(g.score, 0);
  const high = new Game(1, { ...empty, player: { pos: [0, 1.51, 0] }, motes: [[0, 0, 0]] }); high.step({ dash: true }); assert.equal(high.player.carried, 0);
});
test('deposits select nearest unlit then lower id; partial progress scores per deposited mote', () => {
  const g = new Game(1, { ...empty, player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [2, 0, 0] }, { id: 'L2', pos: [-2, 0, 0] }] });
  g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 5); assert.equal(g.lanterns[1].deposited, 0); assert.equal(g.score, 50);
  g.player.carried = 5; g.step({ interact: true }); assert.equal(g.lanterns[0].deposited, 5);
  g.step({ interact: false }); g.step({ interact: true }); assert.equal(g.lanterns[0].lit, true); assert.equal(g.score, 200);
});
test('last lamp wins at exact deadline; no flames takes precedence over victory', () => {
  const lanterns = Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: i > 0, pos: [0, 0, 0] }));
  const g = new Game(1, { ...empty, time_left_s: 1 / 60, player: { carried: 10 }, lanterns }); g.step({ interact: true }); assert.equal(g.state, 'won'); assert.equal(g.score, 350);
  const dead = new Game(1, { ...empty, player: { flames: 0 }, lanterns: lanterns.map(l => ({ ...l, lit: true })) }); dead.step(); assert.equal(dead.state, 'lost'); assert.equal(dead.events.at(-1).data.reason, 'no_flames');
});
test('pulse uses 3D target center, pushes 4 m over 15 ticks, stuns 120, cooldown 180', () => {
  const g = new Game(1, { ...empty, player: { carried: 6 }, shades: [{ id: 'in', pos: [5, .8, 0] }, { id: 'high', pos: [0, 6, 0] }] });
  const events = g.step({ pulse: true }); assert.deepEqual(events.find(e => e.name === 'pulse').data.stunned_ids, ['in']);
  near(g.shades[0].pos[0], 5 + 4 / 15); assert.equal(g.player.carried, 3); assert.equal(g.score, 5); assert.equal(g.pulseCd, 180);
  run(g, 14, { pulse: false }); near(g.shades[0].pos[0], 9); assert.equal(g.shades[0].state, 'stunned');
  run(g, 105); assert.equal(g.shades[0].state, 'stunned'); g.step(); assert.notEqual(g.shades[0].state, 'stunned');
});
test('pulse with insufficient motes or cooldown produces no pulse event', () => {
  for (const player of [{ carried: 2 }, { carried: 6, pulse_cd_ticks: 10 }]) {
    const g = new Game(1, { ...empty, player }); assert.ok(!g.step({ pulse: true }).some(e => e.name === 'pulse'));
  }
});
test('pulse push stops at the bell tower obstacle without sliding through it', () => {
  const g = new Game(1, { ...empty, player: { pos: [0, 6, -6], carried: 6 }, shades: [{ pos: [0, 6.8, -3] }] }, 3);
  g.step({ pulse: true }); run(g, 14, { pulse: false }); assert.ok(g.shades[0].pos[2] <= -2); assert.ok(g.shades[0].pos[2] > -3);
  const pos = [...g.shades[0].pos]; run(g, 20); assert.deepEqual(g.shades[0].pos, pos);
});
test('safe lights repel within 30 ticks and prevent hits immediately', () => {
  const g = new Game(1, { ...empty, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0] }], shades: [{ pos: [0, .8, 0], state: 'chase' }] });
  g.step({ interact: true }); assert.equal(g.player.flames, 3); assert.ok(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2]) >= 6 - 1e-8);
  run(g, 90); assert.equal(g.player.flames, 3);
});
test('shade detection at 12, release over 18, exactly one hit per tick ordered by id', () => {
  const g = new Game(1, { ...empty, shades: [{ pos: [12, .8, 0] }] }); g.step(); assert.equal(g.shades[0].state, 'chase'); near(g.shades[0].pos[0], 12 - 4 / 60);
  g.player.pos = [-10, 0, 0]; g.step(); assert.equal(g.shades[0].state, 'wander');
  const hit = new Game(1, { ...empty, player: { carried: 9 }, shades: [{ id: 'S2', pos: [0, .8, 0] }, { id: 'S1', pos: [0, .8, 0] }] });
  let events = hit.step(); assert.equal(events.filter(e => e.name === 'player_hit').length, 1); assert.equal(hit.shades[1].state, 'recoil'); assert.equal(hit.player.carried, 5); assert.equal(hit.invuln, 90);
  assert.equal(hit.motes.length, 4); for (const m of hit.motes) { const r = Math.hypot(m.pos[0], m.pos[2]); assert.ok(r >= 1.5 && r <= 2.5); assert.equal(m.ttl, 480); }
  run(hit, 89); assert.equal(hit.player.flames, 2);
});
test('height prevents shade contact, while dash does not', () => {
  const g = new Game(1, { ...empty, player: { pos: [0, 3, 0] }, shades: [{ pos: [0, .8, 0] }] }); g.step({ dash: true }); assert.equal(g.player.flames, 3);
});
test('fall ignores invulnerability, loses entire bag once, respawns after 60 ticks', () => {
  const g = new Game(1, { ...empty, player: { pos: [41, -10.1, 0], carried: 8, invuln_ticks: 90 } });
  const events = g.step(); assert.deepEqual(events.find(e => e.name === 'player_hit').data, { by: 'fall', flames: 2, dropped: 0, lost: 8 });
  run(g, 59); assert.equal(g.player.flames, 2); assert.ok(g.player.pos[1] < -10);
  g.step(); assert.deepEqual(g.player.pos, [0, 0, 0]); assert.deepEqual(g.player.vel, [0, 0, 0]); assert.equal(g.invuln, 90);
  const dead = new Game(1, { ...empty, player: { pos: [41, -11, 0], flames: 1 } }); dead.step(); assert.equal(dead.state, 'lost');
});
test('standard initial motes occupy 20 distinct points; fixed spawn schedules respect flags', () => {
  const g = new Game(5, { random_shades: false }); assert.equal(g.motes.length, 20); assert.equal(new Set(g.motes.map(m => m.pos.join(','))).size, 20);
  run(g, 239); assert.equal(g.motes.length, 20); g.step(); assert.equal(g.motes.length, 21);
  const shades = new Game(1, { ...empty, random_shades: true }); run(shades, 299); assert.equal(shades.shades.length, 0);
  let events = shades.step(); assert.equal(shades.shades.length, 2); assert.equal(events.filter(e => e.name === 'shade_spawned').length, 2); assert.equal(shades.shades[0].state, 'spawning');
  run(shades, 480); assert.equal(shades.shades.length, 3);
});
test('pause advances tick while freezing simulation, cooldowns, TTL, spawning and charm timers', () => {
  const g = new Game(1, { ...empty, player: { invuln_ticks: 50, dash_cd_ticks: 20, pulse_cd_ticks: 30, charm_ticks: 70 }, motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_ticks: 10 }] });
  g.step(); const before = g.snapshot(); g.step({ pause: true }); run(g, 500, { pause: true }); const after = g.snapshot();
  assert.equal(after.state, 'paused'); assert.equal(after.sim_tick, before.sim_tick); assert.equal(after.time_left_s, before.time_left_s); assert.deepEqual(after.player, before.player); assert.deepEqual(after.motes, before.motes);
  g.step({ pause: false }); const events = g.step({ pause: true }); assert.equal(events[0].name, 'resumed'); assert.equal(g.sim_tick, 2);
});
test('dropped mote TTL expires at 480 ticks and new drops cannot be picked in same tick', () => {
  const g = new Game(1, { ...empty, motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_ticks: 480 }] }); run(g, 479); assert.equal(g.motes.length, 1); g.step(); assert.equal(g.motes.length, 0);
});
test('night 2 bridge is walkable and jump pads preserve launch despite opposite movement input', () => {
  const bridge = new Game(1, { ...empty, charms: [], player: { pos: [26, 0, 0] } }, 2); run(bridge, 180, { move: [1, 0] }); near(bridge.player.pos[0], 44); assert.equal(bridge.player.grounded, true);
  const pad = new Game(1, { ...empty, player: { pos: [20, 0, 18] } }, 2); run(pad, 84, { move: [-1, 0] }); assert.ok(pad.player.pos[0] > 50); assert.equal(pad.player.grounded, true); near(pad.player.pos[1], 0);
});
test('night 3 cliffs block ascent, ramps reach tier 1, pad reaches tier 2 and tower blocks walking', () => {
  const cliff = new Game(1, { ...empty, player: { pos: [25, 0, 5] } }, 3); run(cliff, 30, { move: [-1, 0] }); assert.ok(Math.hypot(cliff.player.pos[0], cliff.player.pos[2]) >= 24); assert.equal(cliff.player.pos[1], 0);
  const a = Math.PI / 6, ramp = new Game(1, { ...empty, player: { pos: [30 * Math.cos(a), 0, 30 * Math.sin(a)] } }, 3); run(ramp, 60, { move: [-Math.cos(a), -Math.sin(a)] }); near(ramp.player.pos[1], 3);
  const pad = new Game(1, { ...empty, player: { pos: [0, 3, 13] } }, 3); run(pad, 52); assert.equal(pad.player.grounded, true); near(pad.player.pos[1], 6); assert.ok(pad.player.pos[2] < 8);
  const tower = new Game(1, { ...empty, player: { pos: [0, 6, 3] } }, 3); run(tower, 30, { move: [0, -1] }); assert.ok(tower.player.pos[2] >= 2);
});
test('charm applies 600 ticks, clears dash cooldown, cannot restart an active dash', () => {
  const g = new Game(1, { ...empty, player: { pos: [35, 0, 0], dash_cd_ticks: 50 } }, 2); let events = g.step(); assert.equal(g.charmTicks, 600); assert.equal(g.dashCd, 0); assert.equal(events.find(e => e.name === 'charm_picked').data.charm_id, 'C1');
  g.step({ move: [1, 0] }); near(g.player.vel[0], 7.2); g.step({ dash: true }); assert.equal(g.dashCd, 0); assert.equal(g.dashTicks, 11);
  g.step({ dash: false }); events = g.step({ dash: true }); assert.ok(!events.some(e => e.name === 'dash')); run(g, 9, { dash: false });
  assert.ok(g.step({ dash: true }).some(e => e.name === 'dash')); assert.equal(g.charms[0].available, false); assert.equal(g.charms[0].respawnTicks, 2686);
});
test('drifters steal before shades hit; invulnerability and lamp safety do not stop theft', () => {
  const g = new Game(1, { ...empty, player: { carried: 10 }, drifters: [{ pos: [0, .8, 0] }], shades: [{ pos: [0, .8, 0] }] }, 2);
  const events = g.step(); assert.ok(events.findIndex(e => e.name === 'drifter_steal') < events.findIndex(e => e.name === 'player_hit')); assert.equal(g.player.carried, 4); assert.equal(g.drifters[0].stolen, 3);
  const safe = new Game(1, { ...empty, player: { carried: 10, invuln_ticks: 90 }, drifters: [{ pos: [0, .8, 0] }], lanterns: [{ id: 'L1', lit: true, pos: [0, 0, 0] }] }, 2); safe.step(); assert.equal(safe.player.carried, 7); assert.equal(safe.player.flames, 3);
});
test('pulse makes chasing drifter flee; pulse on laden fleeing drifter drops loot with 120 tick exit', () => {
  const g = new Game(1, { ...empty, player: { carried: 6 }, drifters: [{ id: 'D1', pos: [2, .8, 0], state: 'chase' }, { id: 'D2', pos: [-2, .8, 0], state: 'flee', stolen: 3 }] }, 2);
  const events = g.step({ pulse: true }); assert.equal(g.player.carried, 3); assert.equal(g.drifters[0].state, 'flee'); assert.equal(g.drifters[1].stolen, 0); assert.equal(g.motes.length, 3);
  assert.deepEqual(events.find(e => e.name === 'drifter_drop').data, { drifter_id: 'D2', amount: 3 }); assert.equal(g.drifters[1].ticks, 120);
  run(g, 120, { pulse: false }); assert.equal(g.drifters[1].state, 'removed');
});
test('drifter spawn schedule is night 2/3 only and caps at two active entities', () => {
  const g = new Game(1, { ...empty, random_drifters: true }, 2); run(g, 1199); assert.equal(g.drifters.length, 0); g.step(); assert.equal(g.drifters.length, 1); run(g, 2400); assert.equal(g.drifters.length, 2);
  const one = new Game(1, { ...empty, random_drifters: true }); run(one, 1200); assert.equal(one.drifters.length, 0);
});
test('night 3 wind warns two seconds before 30s, then pushes at 2m/s for 5s', () => {
  const g = new Game(1, { ...empty, wind_enabled: true }, 3); run(g, 1679); assert.equal(g.wind.warning, false); g.step(); assert.equal(g.wind.warning, true);
  run(g, 120); assert.equal(g.wind.active, true); near(Math.hypot(g.player.vel[0], g.player.vel[2]), 2); run(g, 300); assert.equal(g.wind.active, false);
});
test('same seed/input/scenario reproduces all nights including random entities and wind', () => {
  for (const night of [1, 2, 3]) { const a = new Game(55, {}, night), b = new Game(55, {}, night); run(a, 1900); run(b, 1900); assert.deepEqual(a.snapshot(), b.snapshot()); }
});
test('scenario overrides preserve other lamps, replace entity lists, and honor timers/states', () => {
  const g = new Game(1, { ...empty, player: { charm_ticks: 100, invuln_ticks: 60 }, shades: [{ id: 'S1', pos: [4, .8, 0], state: 'stunned', state_ticks_left: 30 }], charms: [], lanterns: [{ id: 'L6', deposited: 5 }] }, 2);
  assert.equal(g.lanterns.length, 6); assert.equal(g.lanterns[5].deposited, 5); assert.equal(g.charms.length, 0); assert.equal(g.snapshot().player.charm_s, 100 / 60); g.step(); assert.equal(g.shades[0].state, 'stunned');
});
test('invalid schema, timers, ids, states, inputs and unsupported night are rejected', () => {
  for (const doc of [null, [], { player: null }, { player: { pos: [0, 0] } }, { player: { carried: 11 } }, { player: { flames: -1 } }, { player: { invuln_ticks: 1.1 } }, { motes: [null] }, { shades: [{ pos: [0, 0, 0], state: 'bad' }] }, { lanterns: [{ id: 'L6' }] }, { drifters: [{ pos: [0, 0, 0], stolen: 4 }] }, { charms: [{ id: 'C3' }] }, { time_left_s: -1 }, { wind_enabled: 0 }]) assert.throws(() => validateScenario(doc));
  for (const doc of [null, {}, { frames: [{ tick: 0 }, { tick: 0 }] }, { frames: [{ tick: -1 }] }, { frames: [{ tick: 0, move: [2, 0] }] }, { frames: [{ tick: 0, pause: 1 }] }]) assert.throws(() => validateInputs(doc)); assert.throws(() => new Game(1, {}, 4));
});
