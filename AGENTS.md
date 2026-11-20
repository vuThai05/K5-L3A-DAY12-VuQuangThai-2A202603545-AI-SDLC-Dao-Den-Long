# Đảo Đèn Lồng — Phase 1

- Node.js 22+, ES modules; `npm ci`, `npm start`, `npm run verify`.
- Read `docs/phase-1.md` and `game.contract.json` before changes.
- Gameplay lives only in `src/game.js`; browser and headless use that same simulation.
- Fixed 60 Hz. No wall-clock, Math.random, browser or Three.js in simulation.
- Treat scenario/inputs as untrusted. Invalid documents must exit 2.
- Match tuning to actual gameplay; never edit generated evidence by hand.
- Run `npm run verify` before finishing. CI runs it on push and pull requests.
- Preserve lab instructions and user-provided HTML. Do not guess later phases.
- Record limitations honestly; visual verification is separate from simulation tests.
