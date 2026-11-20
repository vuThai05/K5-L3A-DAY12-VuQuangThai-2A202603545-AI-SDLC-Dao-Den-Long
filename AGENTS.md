# Đảo Đèn Lồng — Phase 2

- Node.js 22+, ES modules; `npm ci`, `npm start`, `npm run verify`.
- Read `docs/phase-2.md` and `game.contract.json` before changes. Contract is 1.1.
- Gameplay lives only in `src/game.js`; browser and headless use that same simulation.
- Fixed 60 Hz. No wall-clock, Math.random, browser or Three.js in simulation.
- Follow Ticket-02 tick order; pause advances tick but freezes sim_tick and all gameplay timers.
- Maps/collision are in src/levels.js. Renderer must use those same coordinates and palette.
- Treat scenario/inputs as untrusted. Invalid documents must exit 2.
- Match tuning to actual gameplay; never edit generated evidence by hand.
- Run `npm run verify` before finishing. CI runs it on push and pull requests.
- Preserve lab instructions and user-provided HTML. Do not guess later phases.
- Record limitations honestly; visual verification is separate from simulation tests.
- Preserve Phase 1 evidence. Generate new evidence only under docs/proof/phase-2/.
