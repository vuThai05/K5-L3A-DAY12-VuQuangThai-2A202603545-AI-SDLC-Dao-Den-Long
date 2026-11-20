# Đảo Đèn Lồng — Phase 3

- Node.js 22+, ES modules; `npm ci`, `npm start`, `npm run verify`.
- Read `docs/phase-3.md`, `docs/adr-003-fuel-and-dawn.md`, CHANGELOG.md and game.contract.json. Contract is 1.2.
- Gameplay lives only in `src/game.js`; browser and headless use that same simulation.
- Fixed 60 Hz. No wall-clock, Math.random, browser or Three.js in simulation.
- Follow Ticket-02 tick order; pause advances tick but freezes sim_tick and all gameplay timers.
- Maps/collision are in src/levels.js. Renderer must use those same coordinates and palette.
- Treat scenario/inputs as untrusted. Invalid documents must exit 2.
- Match tuning to actual gameplay; never edit generated evidence by hand.
- Run `npm run verify` before finishing. CI runs it on push and pull requests.
- Preserve lab instructions and user-provided HTML. Do not guess later phases.
- Record limitations honestly; visual verification is separate from simulation tests.
- Preserve Phase 1/2 evidence. Generate new evidence only under docs/proof/phase-3/.
- Fuel uses integer 1/60 units. Drain/decay happen at step 2; use raw fuel for safe-zone threshold and dawn score.
- No early all_lit win: only check dawn threshold at end of tick, with no_flames first.
- User tests the game themselves: do not start preview or browser automation.
