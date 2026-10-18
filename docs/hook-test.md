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

**2026-10-18, Stone balance variants** (`npm run compare 1000 5`, 5 seeds each):

| Variant | Test 1 Mixer head to head (min–max) | Test 2 old Units | Purist Stone Units in late winners |
|---|---|---|---|
| baseline | 53.9% (51.7–55.5%) | 3.33 | 1.55 |
| Old Ages at 0.5× shop odds | 54.1% (51.2–58.1%) | 3.21 | 1.32 |
| Old Ages at 0.25× shop odds | 53.2% (51.9–54.6%) | 3.09 | 1.16 |
| Weaker Stone (−1 from each Stone Unit's higher stat) | 52.3% (49.2–54.1%) | 3.28 | 1.34 |
| Both | 51.6% (49.5–53.8%) | 3.19 | 1.15 |

Neither change moves test 1. Both reduce Stone in the Purist's winning Lines, but the Mixer relies on Stone too, so its head-to-head rate stays the same or drops. Stone was not the main lever.

**2026-10-18, model player with fuller context** (`npm run model-play 6 301`, with and without `--preview`):

- Fuller rules, the last 3 battles, the actions taken this Round and a scouting estimate barely helped: 1–4 wins per Run, no Run won.
- With `--preview` (every action shows the Line's estimated win rate against 30 of this Round's Ghosts), it won 3 of 6 Runs, against about 20% for the bots. Its winning Lines from Round 10+ held 5.00 Stone, Bronze or Iron Units and no Modern or Sci-Fi Unit. It never sold a Unit. It won by growing Bronze Units (a Chief Scribe at 31/11, a Pyramid Builder at 11/29) behind Stone ones.
- With previews the model plays close to a battle oracle, so this result is about the rules more than about the model. Bronze's Patience grows without limit and beats later Ages, the opposite of the hook's "old Units support new ones".

**2026-10-18, Bronze Patience variants and the model player** (`npm run compare 1000 5`, `npm run model-play 6 301 --preview [--variant=…]`):

- The bots barely react to the Patience variants. Test 1 stays at 50–54% (growth every second Round 50.4%, at most +10 per Unit 53.1%, +1 at every Stage 52.6%). The bot values current stats only, so it never builds around growth and can't measure this lever.
- The model player could, but at first it never sold a Unit. The preview made selling look bad because a sale leaves an empty slot for a moment. With "replace X with Y" offered as a single option with its own preview, it sells and mixes:

| Variant (model player with previews, 6 Runs) | Runs won | Old Units in winning Lines from Round 10+ | Distinct Ages per winning Line |
|---|---|---|---|
| baseline, before "replace" | 3 of 6 | 5.00 | 2.67 |
| baseline | 3 of 6 | 3.83 | 3.33 |
| at most +10 per Bronze Unit | 3 of 6 | 3.65 | 3.06 |

- Its winning Lines now look like the hook: a Sci-Fi Cyborg and Time Traveler at the front, with Stone (Tribe Mother, Caveman) and Bronze (Brick Carrier) Units supporting them. The +10 cap kept the win rate and reduced old Units a little. Six Runs per variant are too few to rank the variants; these results show behaviour, not a significant difference.
