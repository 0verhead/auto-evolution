# Hook test

The prototype exists to answer one question: do old Units stay relevant through their Age's Specialty? These thresholds are set in advance so a result can't be read as "kind of works".

| # | Test | Measure | Passes at |
|---|---|---|---|
| 1 | Keeping an old Unit is a choice | Winning Lines from Round 10+, 1,000 seeded Runs, with simple and with scouting bots | Each old Age (Stone, Bronze, Iron) appears in 30–70% of them. Below 30% old Units are dead weight; above 70% keeping them is automatic. |
| 2.5 | Model player (optional) | An offline bot backed by OpenAI's Decisions API, told only to win, with no hint about mixing | It keeps some old Units and replaces others, and its winning Lines mix Ages |
| 3 | Humans (after 1) | 3–5 testers, several Runs each | Testers keep or buy old Units on purpose in late Rounds and can say why |

Test 1 runs in Node with the utility-scored bots (`npm run hook`, `npm run compare`). Test 2.5 runs offline only and stores its Lines as Ghosts. Its API key comes from the environment at runtime and is never committed.

Until 2026-10-19 test 1 was "the Mixer beats the Purist in 55–65% of Round 9–12 battles" and test 2 was "at least 2 old Units per late winning Line". They were replaced because nearly every Line is mixed whatever a player aims for, so the Mixer and the Purist barely differ, and because the new test 1's lower limit already covers old Units staying relevant. Results before that date refer to the old tests.

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

**2026-10-18, scouting bots** (`npm run compare 1000 3 --scout --only=…`): the bots now preview their 8 best options and any rearrangement in battles against 8 Ghosts from the same Round, taken from a league of the simple bots. A third Personality, the Scout, plays only to win, with no Age bias.

| Variant | Test 1 Mixer head to head (min–max) | Test 2 old Units | Runs won Purist / Mixer / Scout | Scout's late winning Lines: old Units, Ages |
|---|---|---|---|---|
| baseline | 52.1% (51.3–52.8%) | 3.46 | 18.5% / 18.8% / 14.6% | 3.69, 3.07 |
| at most +10 per Bronze Unit | 53.2% (52.1–54.0%) | 3.42 | 16.3% / 19.0% / 15.5% | 3.63, 3.05 |

- The Patience cap makes no measurable difference, so the cards stay uncapped.
- Test 1 still fails. Across the simple bots, the scouting bots and every variant, a bias towards mixing is worth only 2–4 points head to head (50–54%), never 55%.
- The Scout, which is never told about Ages, keeps 3.69 old Units and 3 different Ages in its winning Lines from Round 10+. Mixed Lines happen without anyone aiming for them; deliberately mixing more gains little on top.

**2026-10-19, stronger Bridges and a direct look at mixing** (`npm run compare 1000 5 --only=baseline,bridges-x2,bridges-x3,time-traveler-x2`, plus Round 9–12 Ghosts from 3 leagues of 1,000 simple-bot Runs per variant):

- Stronger Bridges don't move test 1: 53.9% (×2), 51.7% (×3), 53.0% (Time Traveler ×2), against 53.9% unchanged.
- Test 1 can't measure mixing, because the Purist isn't pure. In Rounds 9–12, 98% of all Lines hold 3 or more Ages and 67% hold 4 or 5. With 3 Units per Age and a shop that draws from every unlocked Age, a single-Age Line is almost impossible to build, so mixing happens whether a player aims for it or not.
- Measured directly, more mixing doesn't win more. The Line with one more Age wins 50.4% of decided battles, and with two or more extra Ages 51.7%. With Bridges ×2 the figures are 51.1% and 48.6%, and with ×3 they are 50.2% and 45.9%. A Bridge rewards having friends from other Ages, which nearly every Line already has.

**2026-10-19, story-based Bridge pairings** (`npm run pairings`, `npm run compare … --only=story-bridges`): Recruiter → Stone (barbarian auxiliaries), Tourist → Bronze (pyramid tourism), Pharaoh → Sci-Fi (aliens built the pyramids), Time Traveler → Stone (a laser for the caveman). The Tribe Mother keeps "from a different Age".

- Test 1 stays at 53.3% (simple bots) and 52.3% (scouting bots), and test 2 at 3.3–3.4.
- The pairings don't create decisions because their partners are almost always there. Among Round 9–12 Lines of the scouting bots, 99% hold a Stone Unit, 81% a Bronze Unit and 80% a Sci-Fi Unit, so a Bridge's condition is met almost regardless of what the player does.
- A narrower condition can't fix this while every Line holds nearly every Age. With 3 Units per Age, the shop keeps offering the same 15 Units and every Age ends up in every Line. Ages have to become scarce in a Line before pairing with one is a choice.

**2026-10-19, proposed test 1: is keeping an old Unit a choice?** The proposed test 1 asks that each old Age (Stone, Bronze, Iron) appears in 30–70% of winning Lines from Round 10+. Below 30% old Units are dead weight; above 70% keeping them is automatic. The scouting bot now always previews its 4 best replacements as well as its 8 best options, because value alone undervalues replacing an evolved Unit.

| Variant | Simple bots (5 seeds): Stone / Bronze / Iron, seeds passing, test 2 | Scouting bots (3 seeds): Stone / Bronze / Iron, seeds passing, test 2 |
|---|---|---|
| baseline | 98% / 86% / 62%, 0/5, 3.33 | 99% / 85% / 42%, 0/3, 3.46 |
| Sci-Fi with SAP tier-6 Counterparts, old Ages 0.25× | 90% / 79% / 69%, 0/5, 2.86 | 94% / 79% / 42%, 0/3, 2.82 |
| Iron +1, Modern +2, Sci-Fi +3 | 93% / 70% / 57%, 0/5, 2.68 | 93% / 62% / 44%, 0/3, 2.52 |
| … and old Ages 0.25× | 80% / 66% / 67%, 0/5, 2.38 | 78% / 58% / 51%, 0/3, 2.14 |
| … and weaker Stone | 73% / 69% / 69%, 0/5, 2.32 | 72% / 63% / 53%, 0/3, 2.16 |
| Iron +1, Modern +3, Sci-Fi +5, old Ages 0.25× | 68% / 57% / 55%, 4/5, 1.92 | 64% / 50% / 37%, 3/3, 1.63 |

- Keeping old Units only becomes a choice once later Ages are clearly stronger and old Ages show up less in the shop. Only the steepest curve with rarer old Ages passes, with both bot types.
- It then fails test 2 narrowly (1.63–1.92 old Units per winning Line instead of at least 2). The two tests pull against each other; the thresholds need a decision.

**2026-10-19, versions closer to SAP** (test 1 = each old Age in 30–70% of late winning Lines; simple bots 5 seeds, scouting bots 3 seeds). None passes; Stone stays far above 70%.

| Variant | Simple bots: Stone / Bronze / Iron | Scouting bots: Stone / Bronze / Iron |
|---|---|---|
| Modern from SAP tier 5, Sci-Fi from tier 6, old Ages 0.5× | 88% / 73% / 53% | 93% / 70% / 29% |
| … old Ages 0.25× | 83% / 70% / 58% | 88% / 68% / 35% |
| Iron from tier 4 as well (tiers 1, 2, 4, 5, 6), old Ages 0.5× | 87% / 69% / 74% | 90% / 62% / 67% |
| … old Ages 0.25× | 81% / 68% / 78% | 82% / 62% / 72% |
| Tribe Mother with her Counterpart's effect (SAP's Ant: "Faint: give a random friend from a different Age +2/+1") | 98% / 87% / 68% | 99% / 85% / 44% |
| … with tiers 1, 2, 4, 5, 6 and old Ages 0.25× | 77% / 66% / 79% | 81% / 57% / 76% |
| Every Unit three times (duplicates as rare as with 9 Units per Age), tiers 1, 2, 4, 5, 6 | 90% / 76% / 62% | 93% / 75% / 47% |

- The Tribe Mother was in 91% of late winning Lines and her effect is far above tier-1 strength, but giving her the Ant's effect only lets other Stone Units take her place. A bigger roster doesn't help either, so duplicates being easy isn't the cause.
- The cause is where stats pile up. Stone Units in late winning Lines have 20.3 attack plus health on average (70% at Stage 2, 21% at Stage 3) from merges, Inventions and other Units' buffs. A fresh Sci-Fi Unit has 12–17 even with SAP tier-6 stats.
- The later Ages lack SAP's late-game effects. SAP's tier-5 and tier-6 pets scale or affect the whole team (Leopard, Mammoth, Shark, Turkey). Modern's Industry abilities work only in the shop (the Clerk is in 1% of late winning Lines), and in Sci-Fi only the Cyborg matters (86%; AI Core 18%, Time Traveler 29%).
