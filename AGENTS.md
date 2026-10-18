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

There is no automated test suite. Verify changes by playing the game: run the simulation (`npm run play`, `npm run hook`) and read the battles and Runs it prints.
