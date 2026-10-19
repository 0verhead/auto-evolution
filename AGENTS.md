# AGENTS.md

This repository is Auto Evolution, an auto-battler in the style of Super Auto Pets themed on human history. Agents must preserve the domain language and decisions captured in the project docs.

## Agent skills

### Issue tracker

Issues and specifications are tracked in GitHub Issues for `0verhead/auto-evolution`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: use the root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Source of truth

- `CONTEXT.md` is the glossary; use its terms and avoid the words it lists under _Avoid_.
- `docs/adr/` records the decisions that are hard to reverse.
- `docs/roster.md` holds the v1 Units and Inventions, and `docs/hook-test.md` the thresholds the prototype must pass.

## Verification

There is no automated test suite. Verify changes by playing the game: open the browser game (`npm run dev`, then `?seed=123` for a reproducible Run), and run the simulation (`npm run play`, `npm run hook`, `npm run compare`) and read the battles and Runs it prints.

## Layout

- `simulation/` holds every rule (shop, battle, bot) and never imports Phaser (ADR 0004).
- `game/` is the Phaser 4 browser game; it only plays back battle events and forwards input.
- `scripts/` holds the hook test, balance variants, the model player and the asset pipelines.

## Assets

- Art (style A: clean cartoon like SAP, serious in tone) is generated with Gemini by `npm run art` (needs `GEMINI_API_KEY`). Characters and items are drawn on magenta and keyed out to transparent WebP; originals stay in `out/art-source` and are not committed. Art is referenced only through art keys (`game/art.ts`), never directly.
- Sound effects come from Kenney's CC0 packs via `npm run sfx -- <unzipped packs>`; `game/public/sfx/CREDITS.md` lists the sources.
- API keys come from the environment and are never committed, nor are references to where they are stored.
