import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, validateScenario } from '../src/game.js';
const empty = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const run = (g, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(...g.step(input)); return out; };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const lamp = (extra = {}) => ({ id: 'L1', pos: [0, 0, 0], lit: true, ...extra });
const drain = (extra = {}) => ({ id: 'S1', pos: [0, .8, 0], state: 'drain', target_lantern_id: 'L1', ...extra });

test('fuel expires at exactly 6000 simulation ticks, resets progress, emits out once and remembers history', () => {
  const g = new Game(1, { ...empty, lanterns: [lamp()] });
  assert.equal(g.lanterns[0].fuel, 100); assert.equal(g.lanterns[0].ever_lit, true); assert.equal(g.player.capacity, 10); assert.equal(g.score, 0);
  run(g, 5999); assert.equal(g.lanterns[0].lit, true); assert.equal(g.lanterns[0].fuelUnits, 1);
  const events = g.step(); assert.equal(g.lanterns[0].lit, false); assert.equal(g.lanterns[0].deposited, 0); assert.equal(g.lanterns[0].ever_lit, true);
  assert.equal(events.filter(e => e.name === 'lantern_out').length, 1); assert.equal(g.snapshot().lanterns[0].fuel, 0); assert.ok(!g.step().some(e => e.name === 'lantern_out'));
});
test('lit lamps do not win early; durations are 240/270/300', () => {
  for (const [night, duration] of [[1, 240], [2, 270], [3, 300]]) {
    const g = new Game(1, empty, night); assert.equal(g.time_left_s, duration);
    for (const l of g.lanterns) { l.lit = true; l.ever_lit = true; l.fuelUnits = 6000; }
    run(g, 60); assert.equal(g.state, 'playing');
  }
});
test('fuel rounds only in output: displayed 30.0 can already have lost its safe zone', () => {
  const g = new Game(1, { ...empty, lanterns: [lamp({ fuel: 30 })] }); assert.equal(g.safe([0, 0, 0]), true);
  g.step(); assert.equal(g.snapshot().lanterns[0].fuel, 30); assert.equal(g.safe([0, 0, 0]), false); assert.equal(g.lanterns[0].fuelUnits, 1799);
  const exact = new Game(1, { ...empty, lanterns: [lamp({ fuel: 30 + 1 / 60 })], shades: [{ pos: [0, .8, 0], state: 'chase' }] });
  exact.step(); assert.equal(exact.lanterns[0].fuelUnits, 1800); assert.equal(exact.safe([0, 0, 0]), true); assert.equal(exact.player.flames, 3);
});
test('refuel uses integer ceil/cap, scores 5 per used mote, and does not grow capacity', () => {
  const g = new Game(1, { ...empty, player: { carried: 5 }, lanterns: [lamp({ fuel: 80 })] });
  g.interact(); assert.equal(g.player.carried, 3); assert.equal(g.lanterns[0].fuel, 100); assert.equal(g.score, 10); assert.equal(g.player.capacity, 10);
  assert.deepEqual(g.events, [{ type: 'event', tick: 0, name: 'refuel', data: { lantern_id: 'L1', amount: 2, fuel: 100 } }]);
  g.events = []; g.interact(); assert.deepEqual(g.events, []); assert.equal(g.score, 10);
  const stepped = new Game(1, { ...empty, player: { carried: 5 }, lanterns: [lamp({ fuel: 80 })] }); stepped.step({ interact: true });
  assert.equal(stepped.events.find(e => e.name === 'refuel').data.amount, 3); assert.equal(stepped.player.carried, 2);
});
test('full lamp is excluded; equal-distance receivers select lower id including refuel', () => {
  const g = new Game(1, { ...empty, player: { carried: 5 }, lanterns: [lamp(), { id: 'L2', pos: [1, 0, 0] }] });
  g.interact(); assert.equal(g.lanterns[1].deposited, 5); assert.ok(!g.events.some(e => e.name === 'refuel'));
  const tie = new Game(1, { ...empty, player: { carried: 1 }, lanterns: [lamp({ pos: [1, 0, 0], fuel: 90 }), { id: 'L2', pos: [-1, 0, 0] }] });
  tie.interact(); assert.equal(tie.events[0].name, 'refuel'); assert.equal(tie.events[0].data.lantern_id, 'L1');
});
test('extinction occurs before same-tick interaction, allowing a five-mote relight at dawn', () => {
  const g = new Game(1, { ...empty, time_left_s: 1 / 60, player: { carried: 5 }, lanterns: [lamp({ fuel: 1 / 60 }), { id: 'L2', lit: true }, { id: 'L3', lit: true }] });
  const events = g.step({ interact: true }); assert.ok(events.findIndex(e => e.name === 'lantern_out') < events.findIndex(e => e.name === 'deposit'));
  assert.deepEqual(events.find(e => e.name === 'lantern_lit').data, { lantern_id: 'L1', relight: true }); assert.equal(g.state, 'won');
  assert.equal(g.lanterns[0].fuel, 100); assert.equal(g.lanterns[0].relit_count, 1); assert.equal(g.player.capacity, 12);
  assert.equal(g.score, 25 + 40 + 150 + 149 * 2 + 150);
});
test('first light and repeated relights grow capacity by two, cap at 20 and award distinct scores', () => {
  const g = new Game(1, { ...empty, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 0] }] });
  g.step({ interact: true }); assert.equal(g.score, 150); assert.equal(g.player.capacity, 12); assert.equal(g.events.find(e => e.name === 'lantern_lit').data.relight, false);
  for (let i = 0; i < 5; i++) {
    g.lanterns[0].fuelUnits = 1; g.step({ interact: false }); g.player.carried = 5; g.step({ interact: true });
    assert.equal(g.player.capacity, Math.min(20, 14 + i * 2));
  }
  assert.equal(g.lanterns[0].relit_count, 5); assert.equal(g.score, 150 + 5 * 65);
  const seeded = new Game(1, { ...empty, player: { successful_lights: 4, carried: 18 }, lanterns: [lamp()] }); assert.equal(seeded.snapshot().player.capacity, 18); assert.equal(seeded.score, 0);
  assert.equal(new Game(1, empty).player.capacity, 10);
});
test('pickup respects increased capacity without exceeding the cap', () => {
  const g = new Game(1, { ...empty, player: { successful_lights: 1, carried: 10 }, motes: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }); g.step();
  assert.equal(g.player.carried, 12); assert.equal(g.motes.length, 1); assert.equal(g.score, 0);
});
test('two draining shades stack with decay and emit one event each per 60 actual drain ticks', () => {
  const g = new Game(1, { ...empty, player: { pos: [20, 0, 0] }, lanterns: [lamp({ fuel: 29 })], shades: [drain({ pos: [1, .8, 0] }), drain({ id: 'S2', pos: [-1, .8, 0] })] });
  const events = run(g, 60); near(g.lanterns[0].fuel, 18); assert.equal(g.shades[0].state, 'drain');
  assert.deepEqual(events.filter(e => e.name === 'fuel_drain').map(e => e.data), [{ lantern_id: 'L1', shade_id: 'S1', fuel: 18 }, { lantern_id: 'L1', shade_id: 'S2', fuel: 18 }]);
});
test('wander chooses weak lamp by nearest then id; entering drain begins fuel removal next tick', () => {
  const choose = new Game(1, { ...empty, player: { pos: [0, 0, -30] }, lanterns: [lamp({ pos: [20, 0, 0], fuel: 29 }), { id: 'L2', lit: true, pos: [-20, 0, 0], fuel: 29 }], shades: [{ pos: [0, .8, 0] }] });
  choose.step(); assert.equal(choose.shades[0].target_lantern_id, 'L1'); assert.ok(choose.shades[0].pos[0] > 0);
  const enter = new Game(1, { ...empty, player: { pos: [20, 0, 0] }, lanterns: [lamp({ fuel: 29 })], shades: [{ pos: [1.9, .8, 0] }] });
  enter.step(); assert.equal(enter.shades[0].state, 'drain'); assert.equal(enter.lanterns[0].fuelUnits, 1740 - 1); enter.step(); assert.equal(enter.lanterns[0].fuelUnits, 1740 - 7);
});
test('chasing shade keeps player target instead of diverting to weak lamp', () => {
  const g = new Game(1, { ...empty, player: { pos: [-10, 0, 0] }, lanterns: [lamp({ pos: [10, 0, 0], fuel: 20 })], shades: [{ pos: [0, .8, 0], state: 'chase' }] });
  g.step(); assert.equal(g.shades[0].state, 'chase'); assert.equal(g.shades[0].target_lantern_id, null); assert.ok(g.shades[0].pos[0] < 0);
});
test('drain exits to chase at 6m, wander on extinction, invalid target distance or replenished safety', () => {
  const chase = new Game(1, { ...empty, player: { pos: [6, 0, 0] }, lanterns: [lamp({ fuel: 20 })], shades: [drain()] }); chase.step(); assert.equal(chase.shades[0].state, 'chase');
  for (const [fuel, pos] of [[.1, [0, .8, 0]], [20, [3, .8, 0]]]) {
    const g = new Game(1, { ...empty, player: { pos: [20, 0, 0] }, lanterns: [lamp({ fuel })], shades: [drain({ pos })] }); g.step(); assert.equal(g.shades[0].state, 'wander');
  }
  const refill = new Game(1, { ...empty, player: { carried: 1 }, lanterns: [lamp({ fuel: 29 })], shades: [drain()] });
  refill.step({ interact: true }); assert.equal(refill.safe([0, 0, 0]), true); assert.equal(refill.player.flames, 3); assert.equal(refill.shades[0].state, 'wander'); assert.ok(Math.hypot(refill.shades[0].pos[0], refill.shades[0].pos[2]) >= 6 - 1e-8);
});
test('pulse awards total 15 for drain and 5 otherwise, stops draining next tick, ends stun in wander', () => {
  const g = new Game(1, { ...empty, player: { pos: [3, 0, 0], carried: 6 }, lanterns: [lamp({ fuel: 20 })], shades: [drain(), { id: 'S2', pos: [3, .8, 2], state: 'chase' }] });
  g.step({ pulse: true }); assert.equal(g.score, 20); assert.equal(g.shades[0].state, 'stunned'); const fuel = g.lanterns[0].fuelUnits;
  g.step({ pulse: false }); assert.equal(g.lanterns[0].fuelUnits, fuel - 1); run(g, 119); assert.equal(g.shades[0].state, 'wander');
});
test('a shade being expelled cannot damage a player just outside the safe edge in that tick', () => {
  const g = new Game(1, { ...empty, player: { pos: [6.1, 0, 0] }, lanterns: [lamp({ fuel: 31 })], shades: [{ pos: [5.9, .8, 0], state: 'chase' }] });
  g.step(); assert.equal(g.player.flames, 3); assert.equal(g.shades[0].repelledTick, 1);
  g.step(); assert.equal(g.player.flames, 2);
});
test('pause freezes fuel and per-shade drain event counters', () => {
  const g = new Game(1, { ...empty, player: { pos: [20, 0, 0] }, lanterns: [lamp({ fuel: 20 })], shades: [drain()] }); run(g, 20);
  const before = g.lanterns[0].fuelUnits; g.step({ pause: true }); run(g, 500, { pause: false }); assert.equal(g.lanterns[0].fuelUnits, before); assert.equal(g.shades[0].drainTicks, 20);
  const events = g.step({ pause: true }); assert.equal(g.shades[0].drainTicks, 21); assert.equal(events[0].name, 'resumed');
});
test('dawn requires 3/5, 4/6 or 5/7 lights and scores only lit fuel floor plus flames', () => {
  for (const [night, count] of [[1, 3], [2, 4], [3, 5]]) for (const litCount of [count - 1, count]) {
    const lanterns = Array.from({ length: litCount }, (_, i) => ({ id: `L${i + 1}`, lit: true, fuel: 50 }));
    const g = new Game(1, { ...empty, time_left_s: 1 / 60, lanterns }, night); g.step();
    assert.equal(g.state, litCount === count ? 'won' : 'lost'); assert.equal(g.events.at(-1).data.reason, litCount === count ? 'dawn_survived' : 'dawn');
    assert.equal(g.score, litCount === count ? litCount * 99 + 150 : 0);
  }
});
test('final-tick extinction can lose dawn, final-tick death always wins precedence', () => {
  const lanterns = [{ id: 'L1', lit: true, fuel: 1 / 60 }, { id: 'L2', lit: true }, { id: 'L3', lit: true }];
  const g = new Game(1, { ...empty, time_left_s: 1 / 60, lanterns }); g.step(); assert.equal(g.state, 'lost'); assert.equal(g.events.at(-1).data.reason, 'dawn');
  const dead = new Game(1, { ...empty, time_left_s: 1 / 60, player: { flames: 1, pos: [41, -11, 0] }, lanterns: lanterns.map(l => ({ ...l, fuel: 100 })) }); dead.step(); assert.equal(dead.events.at(-1).data.reason, 'no_flames');
});
test('new scenario fields are validated without awarding scenario points or relights', () => {
  for (const scenario of [{ player: { successful_lights: -1 } }, { player: { successful_lights: .5 } }, { player: { carried: 13, successful_lights: 1 } }, { lanterns: [lamp({ fuel: 101 })] }, { lanterns: [lamp({ fuel: -1 })] }, { lanterns: [lamp({ ever_lit: 'yes' })] }, { shades: [drain({ target_lantern_id: 'L9' })] }]) assert.throws(() => validateScenario(scenario));
  const g = new Game(1, { ...empty, lanterns: [lamp()], player: { successful_lights: 0 } }); assert.equal(g.score, 0); assert.equal(g.lanterns[0].relit_count, 0); assert.equal(g.successfulLights, 0);
});
