# Đảo Đèn Lồng — Phase 4

- Node.js 22+, ES modules; `npm ci`, `npm start`, `npm run verify`.
- Read docs/phase-4.md, docs/release-notes.md and game.contract.json. Contract is 1.3; preserve gameplay from 1.2.
- Gameplay lives only in `src/game.js`; browser and headless use that same simulation.
- Fixed 60 Hz. No wall-clock, Math.random, browser or Three.js in simulation.
- Follow Ticket-02 tick order; pause advances tick but freezes sim_tick and all gameplay timers.
- Maps/collision are in src/levels.js. Renderer must use those same coordinates and palette.
- Treat scenario/inputs as untrusted. Invalid documents must exit 2.
- Match tuning to actual gameplay; never edit generated evidence by hand.
- Run `npm run verify` before finishing. CI runs it on push and pull requests.
- Preserve lab instructions and user-provided HTML. Do not guess later phases.
- Record limitations honestly; visual verification is separate from simulation tests.
- Preserve Phase 1/2/3 evidence. Generate new evidence only under docs/proof/phase-4/.
- Fuel uses integer 1/60 units. Drain/decay happen at step 2; use raw fuel for safe-zone threshold and dawn score.
- No early all_lit win: only check dawn threshold at end of tick, with no_flames first.
- User tests the game themselves: do not start preview or browser automation.
- Never substitute headless timing for GPU FPS or invent bench.json/screenshot/video. Keep explicit pending status.
- Leaderboard disk state is data/ (ignored); validate names/scores and serialize writes. Do not commit player data.
- npm run package + npm run check-package create and verify the offline release; publication is a separate reviewed step.
