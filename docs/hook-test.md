# Hook test

The prototype exists to answer one question: do old Units stay relevant through their Age's Specialty? These thresholds are set in advance so a result can't be read as "kind of works".

| # | Test | Measure | Passes at |
|---|---|---|---|
| 1 | Mixing pays off | Mixer against Purist, Ghosts from the same Round (9–12), 1,000 seeded Runs | Mixer wins at least 55% (above about 65% means mixing is mandatory, which is also a failure) |
| 2 | Old Units stay | Lines of both Personalities that win in Round 10+ | On average at least 2 Units from Stone, Bronze or Iron |
| 2.5 | Model player (optional, after the prototype runs) | An offline bot backed by OpenAI's Decisions API, told only to win, with no hint about mixing | It keeps old Units and mixes Ages without being told to |
| 3 | Humans (after 1 and 2) | 3–5 testers, several Runs each | Testers keep or buy old Units on purpose in late Rounds and can say why |

Tests 1 and 2 use the utility-scored bot with its two Personalities and run in Node. Test 2.5 runs offline only and stores its Lines as Ghosts. Its API key comes from the environment at runtime and is never committed.

## Results

**2026-10-18, first simulation** (`npm run hook 1000 1`, `npm run model-play`):

- Test 1 fails narrowly. In Rounds 9–12 the Mixer wins 54.0% of 1,309 decided battles head to head. Across whole Runs it does a little better than the Purist: 5.44 wins on average against 4.77, and 20.8% of Runs won against 15.4%.
- Test 2 passes, but the signal is weak. Winning Lines from Round 10+ hold 3.36 Stone, Bronze or Iron Units, and even the Purist's winning Lines hold 1.55 Stone Units. Stone Units are easy to evolve, and a Stage-3 Stone Unit outgrows a fresh Sci-Fi Unit, so "later Ages are stronger" does not fully hold yet.
- Test 2.5 is inconclusive. In 5 Runs the model player (gpt-6-luna) won 0–5 battles and lost every Run. It never sold a Unit and often ended the shop with gold left, so it kept old Units by never replacing anything rather than by choice.
