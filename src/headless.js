import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Game, validateInputs, validateScenario } from './game.js';

let args, scenario, frames;
try {
  args = parseArgs({ options: Object.fromEntries(['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'].map(k => [k, { type: 'string' }])) }).values;
  for (const key of ['seed', 'night', 'ticks', 'out']) if (args[key] === undefined || args[key] === '') throw new Error(`Missing --${key}`);
  for (const key of ['seed', 'night', 'ticks', 'snapshot-every']) if (args[key] !== undefined && (!/^-?\d+$/.test(args[key]) || !Number.isSafeInteger(Number(args[key])))) throw new Error(`Invalid --${key}`);
  if (Number(args.night) !== 1 || Number(args.ticks) < 0 || Number(args['snapshot-every'] ?? 10) < 1) throw new Error('Only night 1; ticks >= 0; snapshot-every >= 1');
  scenario = args.scenario ? validateScenario(JSON.parse(readFileSync(args.scenario, 'utf8').replace(/^\uFEFF/, ''))) : {};
  frames = args.inputs ? validateInputs(JSON.parse(readFileSync(args.inputs, 'utf8').replace(/^\uFEFF/, ''))) : [];
} catch (error) { console.error(error.message); process.exit(2); }
try {
  const game = new Game(Number(args.seed), scenario), lines = [JSON.stringify(game.snapshot())];
  const interval = Number(args['snapshot-every'] ?? 10); let index = 0;
  while (game.tick < Number(args.ticks) && game.state === 'playing') {
    const input = frames[index]?.tick === game.tick ? frames[index++] : {};
    for (const e of game.step(input)) lines.push(JSON.stringify(e));
    if (game.tick % interval === 0) lines.push(JSON.stringify(game.snapshot()));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.state, score: game.score }));
  writeFileSync(args.out, lines.join('\n') + '\n');
} catch (error) { console.error(error.message); process.exit(1); }
