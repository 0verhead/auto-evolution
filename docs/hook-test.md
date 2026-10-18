# Hook test

The prototype exists to answer one question: do old Units stay relevant through their Age's Specialty? These thresholds are set in advance so a result can't be read as "kind of works".

| # | Test | Measure | Passes at |
|---|---|---|---|
| 1 | Mixing pays off | Mixer against Purist, Ghosts from the same Round (9–12), 1,000 seeded Runs | Mixer wins at least 55% (above about 65% means mixing is mandatory, which is also a failure) |
| 2 | Old Units stay | Lines of both Personalities that win in Round 10+ | On average at least 2 Units from Stone, Bronze or Iron |
| 2.5 | Model player (optional, after the prototype runs) | An offline bot backed by OpenAI's Decisions API, told only to win, with no hint about mixing | It keeps old Units and mixes Ages without being told to |
| 3 | Humans (after 1 and 2) | 3–5 testers, several Runs each | Testers keep or buy old Units on purpose in late Rounds and can say why |

Tests 1 and 2 use the utility-scored bot with its two Personalities and run in Node. Test 2.5 runs offline only and stores its Lines as Ghosts. Its API key comes from the environment at runtime and is never committed.
