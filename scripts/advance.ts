// Hook test 4 from docs/hook-test.md: is Advancing a choice? npm run advance [runs] [seeds] [--scout] [--only=a,b]
// Bots that differ only in when they Advance play one league; with --scout they preview options in battle.
import { ADVANCERS, SCOUT_WEIGHT } from "../simulation/bot";
import { league, scoutPool, type LeagueResult } from "../simulation/league";
import { AGES } from "../simulation/types";
import { lineAgeIndex } from "../simulation/units";
import { mkdirSync, writeFileSync } from "node:fs";
import { ghostsFile } from "./ghosts";
import { VARIANTS } from "./variants";

/** Test 4: no timing wins more than twice as many Runs as the next best. */
const MAX_RATIO = 2;
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const scouting = process.argv.includes("--scout");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",");
const variants = VARIANTS.filter((v) => (only ? only.includes(v.name) : v.name.startsWith("advance-")));
const runs = Number(args[0] ?? 1000);
const seeds = Number(args[1] ?? 3);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

function play(seed: number): LeagueResult {
  if (!scouting) return league(ADVANCERS, runs, seed);
  const pool = scoutPool(league(ADVANCERS, runs, seed + 10_000).ghosts);
  return league(ADVANCERS.map((p) => ({ ...p, scout: SCOUT_WEIGHT })), runs, seed, pool);
}

console.log(`${runs} Runs × ${seeds} seeds per variant${scouting ? ", scouting bots" : ""}\n`);
console.log("variant        | Runs won Rush / Steady / Boom (avg wins)        | best / next best | Round the median Ghost reaches Bronze/Iron/Modern/Sci-Fi | cross-Age battles R5–12");
for (const variant of variants) {
  const restore = variant.apply();
  const results = Array.from({ length: seeds }, (_, i) => play(i + 1));
  restore();
  // The first seed's Ghosts, for the model player (test 2.5) to fight.
  mkdirSync("out", { recursive: true });
  writeFileSync(ghostsFile(`${variant.name}-advancers`), JSON.stringify(results[0]!.ghosts));
  const won = (name: string) => mean(results.map((r) => r.runs.filter((x) => x.personality === name && x.won).length / r.runs.filter((x) => x.personality === name).length));
  const wins = (name: string) => mean(results.map((r) => mean(r.runs.filter((x) => x.personality === name).map((x) => x.wins))));
  const rates = ADVANCERS.map((p) => won(p.name)).sort((a, b) => b - a);
  const ratio = rates[0]! / Math.max(0.001, rates[1]!);
  // The first Round at which the median Ghost's latest Unit is from each Age.
  const reach = AGES.slice(1).map((_, k) => {
    for (let round = 1; round <= 20; round++) {
      const ages = results.flatMap((r) => r.ghosts.filter((g) => g.round === round).map((g) => lineAgeIndex(g.line))).sort((a, b) => a - b);
      if ((ages[Math.floor(ages.length / 2)] ?? 0) >= k + 1) return String(round);
    }
    return "–";
  });
  // How often the two Lines in a random same-Round pairing are from different Ages.
  const cross = mean(
    results.flatMap((r) =>
      Array.from({ length: 8 }, (_, i) => i + 5).map((round) => {
        const ages = r.ghosts.filter((g) => g.round === round).map((g) => lineAgeIndex(g.line));
        let differ = 0;
        for (let i = 0; i + 1 < ages.length; i += 2) differ += ages[i] !== ages[i + 1] ? 1 : 0;
        return differ / Math.max(1, Math.floor(ages.length / 2));
      }),
    ),
  );
  console.log(
    [
      variant.name.padEnd(14),
      ADVANCERS.map((p) => `${pct(won(p.name))} (${wins(p.name).toFixed(2)})`).join(" / ").padEnd(47),
      `${ratio.toFixed(2)} ${ratio <= MAX_RATIO ? "PASS" : "FAIL"}`.padEnd(16),
      reach.join(" / ").padEnd(55),
      pct(cross),
    ].join(" | "),
  );
}
console.log("");
for (const v of variants) console.log(`${v.name}: ${v.description}`);
