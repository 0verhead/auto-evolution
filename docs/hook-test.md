# Hook test

The prototype exists to answer one question: do old Units stay relevant through their Age's Specialty? These thresholds are set in advance so a result can't be read as "kind of works".

| # | Test | Measure | Passes at |
|---|---|---|---|
| 1 | Keeping an old Unit is a choice | Winning Lines from Round 10+, 1,000 seeded Runs, with simple and with scouting bots | Each old Age (Stone, Bronze, Iron) appears in 30–70% of them. Below 30% old Units are dead weight; above 70% keeping them is automatic. |
| 2.5 | Model player (optional) | An offline bot backed by OpenAI's Decisions API, told only to win, with no hint about mixing | It keeps some old Units and replaces others, and its winning Lines mix Ages |
| 4 | Advancing is a choice | Runs won in a league of bots that differ only in when they Advance: Rush (as soon as possible), Steady (every 2 Rounds), Boom (never pays, waits for history to move it on); 1,000 seeded Runs, with simple and with scouting bots. The model player (2.5) is checked too. | No timing wins more than 2× as many Runs as the next best. A weak timing is allowed: strategies don't need to be equal, only free of a dominant one. The model player reaches the Iron Age at Rounds at least 3 apart across its Runs, so the right timing depends on the Run. |
| 3 | Humans (after 1) | 3–5 testers, several Runs each | Testers keep or buy old Units on purpose in late Rounds and can say why |

Test 4 was added on 2026-10-19, when Advancing replaced the shared timeline (ADR 0005); test 1 is now measured with bots that Advance every 2 Rounds, like the old timeline. Test 4 was first "the best timing wins at most 1.5× the worst"; it was relaxed the same day, because some strategies may be weaker than others as long as none dominates. Test 1 and test 4 run in Node with the utility-scored bots (`npm run hook`, `npm run compare`, `npm run advance`). Test 2.5 runs offline only and stores its Lines as Ghosts. Its API key comes from the environment at runtime and is never committed.

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

**2026-10-19, SAP late-game effects** (Factory Worker with SAP's Monkey: "End of round: give the front friend +2/+3"; Time Traveler with SAP's Mammoth plus the Bridge filter: "Faint: give every friend from a different Age +2/+2"):

| Variant | Simple bots: Stone / Bronze / Iron | Scouting bots: Stone / Bronze / Iron |
|---|---|---|
| Late-game effects only | 98% / 84% / 58% | 99% / 82% / 35% |
| … with tiers 1, 2, 4, 5, 6 and old Ages 0.5× | 89% / 74% / 72% | 88% / 58% / 64% |
| … and the Ant Tribe Mother | 88% / 72% / 75% | 85% / 56% / 62% |
| … and old Ages 0.25× | 81% / 69% / 78% | 83% / 53% / 65% |

No SAP-sourced version brings Stone below about 80%. The Monkey-style Factory Worker often buffs a Stone Unit at the front, which makes old Units stronger still. Only a stat curve beyond SAP's numbers (Iron +1, Modern +3, Sci-Fi +5, old Ages 0.25×) passes.

Measured per Unit instead of per Age, the picture differs. With the Ant Tribe Mother, tiers 1, 2, 4, 5, 6 and old Ages 0.25× (scouting bots, seed 1), no old Unit is in more than 60% of late winning Lines (Caveman 45%, Tribe Mother 49%, Brick Carrier 34%, Legionary 60%). Stone reaches 81% only because it has three Units that each appear about half the time.

**2026-10-19, adopted rules** (Tribe Mother with SAP's Ant effect, Counterparts from SAP tiers 1, 2, 4, 5, 6, old Ages at 0.25× in the shop; test 1 per Unit as above):

| Rules | Simple bots (5 seeds): most kept old Unit; Stone / Bronze / Iron; seeds passing | Scouting bots (3 seeds): same |
|---|---|---|
| adopted | Legionary 50%; 77% / 66% / 79%; 5/5 | Legionary 58%; 81% / 57% / 76%; 3/3 |
| adopted but with SAP's shop odds | Brick Carrier 47%; 93% / 70% / 68%; 5/5 | Tribe Mother 61%; 93% / 64% / 67%; 3/3 |

- Test 1 passes with both bot types in every seed. No old Unit is kept automatically, and every old Age stays in at least half of the late winning Lines.
- With SAP's shop odds (every unlocked Unit equally likely) test 1 passes too, so making old Ages rarer in the shop isn't needed for it.
- Test 2.5 (model player with previews, 6 Runs, seeds 301–306): 1 Run won, 4–10 wins in the others. It sold 4–9 Units per Run, and its winning Lines from Round 10+ held 2.60 old Units from 3.67 different Ages. It keeps some old Units and replaces others, and its winning Lines mix Ages.

After this, the shop went back to SAP's odds (every unlocked Unit equally likely), since test 1 passes without making old Ages rarer. The rules are now the "adopted but with SAP's shop odds" row above.

**2026-10-19, Advancing replaces the shared timeline** (`npm run advance`, test 4; bots Rush, Steady and Boom differ only in when they Advance, and judge Units by stats alone; 1,000 Runs × 3 seeds for simple bots, 400 × 2 for scouting bots). The first runs still included Hold (Advance every 2 Rounds, never past Iron), and Boom Advanced after 3 Rounds whatever the price.

| Rules | Simple bots: Rush / Steady / Boom / Hold | Scouting bots: same |
|---|---|---|
| Advance at 6 gold, 2 less per Round; flat Unit price 3 | 53% / 9% / 4% / 9% | 37% / 10% / 7% / 12% |
| … at 3–9 gold, flat or falling | Rush 43–62%, all others 2–14% | |
| … plus 1–2 gold per Round stayed, and/or earliest Rounds 2/4/6/8 | Rush 26–49%, all others 5–25% | |
| Unit price by Age 2/3/4/5/6 | 18% / 10% / 21% / 25% | 7% / 11% / 25% / 20% |
| Unit price by Age 2/3/3/4/5 | 24% / 10% / 17% / 20% | 14% / 12% / 23% / 23% |
| … with a free Advance | Rush 36–40%, all others 7–20% | |

- A one-time price can't balance a permanent advantage: the Age's higher stats stay for the rest of the Run, so rushing won at every price.
- Pricing Units by Age stopped rushing but made holding back the strongest plan, so the best strategy was to barely use the twist, and the median Ghost never reached Sci-Fi.
- With the automatic Advance (once Advancing would be free, history moves the Run on), holding back is impossible. Hold was dropped from the test and Boom became "never pays".

| Adopted rules (ADR 0005): Advance 6 → 4 → 2 → by itself, Units 2/3/3/4/4 | Rush / Steady / Boom | best / next best | median Ghost reaches Bronze / Iron / Modern / Sci-Fi |
|---|---|---|---|
| Simple bots | 30.0% / 11.0% / 14.6% | 2.06, fails narrowly | Round 4 / 5 / 7 / 10 |
| Scouting bots | 18.7% / 12.0% / 18.4% | 1.01, passes | Round 3 / 5 / 8 / 9 |

- Which timing is best depends on skill: simple bots do best by rushing, scouting bots are even between rushing and waiting. Steady is the weakest timing for both, which is allowed.
- Test 1 on the adopted rules (simple bots, 3 seeds): Caveman 65%; Stone / Bronze / Iron 98% / 69% / 66%; 3/3 seeds pass. Old Units stay a choice.
- Model player (6 Runs, seeds 401–406, with previews, against Ghosts of the Advance bots): told only "Advance for X gold", it paid once in 6 Runs and otherwise waited for history; it won 1 Run. Told which Units the next Age brings (as the game's hover preview now shows), it paid in 2 of 6 Runs (one Rushed to Sci-Fi by Round 9) and reached Iron between Rounds 4 and 7, which meets test 4's spread of 3 Rounds, but it won no Run. Twelve Runs are too few to rank, and the previews only score the current Line, which undervalues an Advance. Whether players use the button is a question for test 3.

**2026-10-19, cheap Stone Units are kept automatically** (test 1 with scouting bots on the adopted rules, 1,000 Runs × 3 seeds, then 600 × 2 per variant):

| Rules | Test 1: most kept old Unit; Stone / Bronze / Iron; seeds passing | Test 4 simple / scouting: best / next best |
|---|---|---|
| adopted (Stone Units at 2 gold) | Gatherer 85%; 99% / 55% / 63%; 0/3 | 2.06 / 1.01 |
| Gatherer's gift +1/+1 / +2/+2 / +3/+3 | Gatherer 81%; 0/2 | 2.29 / – |
| Gatherer never in the shop | Caveman 91%; 0/2 | – |
| Stone Units at 3 gold (3/3/4/4/5 … 3/4/4/5/5) | – | Rush 34–44% of Runs, 4.05–5.88 |
| shop offers only the Run's Age and 1 / 2 before it | Legionary 63%, 2/2 / Gatherer 76%, 0/2 | 5.74 / 2.75 |
| **Stone Units 1 lower in their higher stat (Caveman 1/2, Drummer 1/1, Gatherer 2/1)** | Gatherer 72%; 98% / 57% / 68%; 1/2 | 1.91 / 1.99 |

- It isn't the Gatherer: without her the Caveman takes her place. A 2-gold Unit is cheap to collect and evolve early, so good players keep one in almost every late Line.
- Stone at 3 gold brings rushing back; the cheap Stone Age is what makes waiting worth it. Narrowing the shop to recent Ages fixes test 1 but also brings rushing back.
- Weaker Stone stats are adopted. Everything now passes or sits at the limit: test 1 at 72% in one seed of two, test 4 at 1.91 and 1.99. With them, rushing wins about twice as often as waiting for both bot types (simple 29% / 15%, scouting 28% / 14%), which also gives players more reason to press the Advance button. Whether testers keep a Stone Unit by reflex is a question for test 3.
