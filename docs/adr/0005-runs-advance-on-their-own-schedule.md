# Runs Advance on their own schedule, and history doesn't wait

Ages used to arrive for every player at set Rounds (Stone 1–2, Bronze 3–4, Iron 5–6, Modern 7–8, Sci-Fi 9+), which made them Super Auto Pets' shop tiers under another name. To make the game its own, each Run now chooses when to Advance into the next Age: the price starts at 6 gold and drops by 2 every Round the Run stays, and once it would be free the Run Advances by itself at the start of that Round. Units cost more the later their Age (Stone 2, Bronze 3, Iron 3, Modern 4, Sci-Fi 4 gold) instead of SAP's flat 3. A Run therefore chooses how early it Advances (paying to Rush, or waiting to Boom), never whether, and Ghosts from the same Round can be from different Ages.

## Considered Options

Each was measured with bots that differ only in when they Advance (hook test 4 in docs/hook-test.md, 2026-10-19):

- An Advance price alone, at any level from 3 to 9 gold, falling or flat: rushing won about half of all Runs and every other timing 4–11%. A one-time price can't balance the permanent advantage of a later Age's stats.
- Extra gold for every Round a Run stays in its Age, and an earliest Round for each Age: both reduced rushing a little but left it dominant.
- Unit prices by Age without the automatic Advance: rushing came into line, but never Advancing past Iron became the strongest plan, so the twist was best ignored and the Sci-Fi Age was rarely seen.
- A free Advance: rushing dominated again.

## Consequences

The flat Unit price of SAP is gone; the price on each shop Unit now matters. Every Run reaches every Age, each at most three Rounds after the one before, which keeps Ghosts from the same Round comparable. Waiting costs nothing, so if players mostly ignore the Advance button the twist fails; the model player (test 2.5) checks that timings vary between Runs.
