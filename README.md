# Auto Evolution

An auto-battler in the style of Super Auto Pets, themed on human history. Build a Line of five Units from the Stone Age to Sci-Fi, evolve them by merging copies, and decide how early your civilization Advances to the next Age.

**Play:** https://0verhead.github.io/auto-evolution/ (landscape; `?seed=123` for a reproducible Run)

## Develop

```sh
npm install
npm run dev        # the browser game
npm run play       # one bot Run, printed battle by battle
npm run hook       # hook test 1 (docs/hook-test.md)
npm run advance    # hook test 4: is Advancing a choice?
```

`CONTEXT.md` is the glossary, `docs/adr/` holds the decisions, `docs/roster.md` the Units and `docs/hook-test.md` the tests and their results. Sound effects are CC0 from Kenney (`game/public/sfx/CREDITS.md`).
