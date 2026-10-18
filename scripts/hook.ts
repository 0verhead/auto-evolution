// Hook tests 1 and 2 from docs/hook-test.md: npm run hook [runs] [seed]
import { mkdirSync, writeFileSync } from "node:fs";
import { battle } from "../simulation/battle";
import { MIXER, PURIST } from "../simulation/bot";
import { league } from "../simulation/league";
import { createRng, pick, seedFrom } from "../simulation/rng";
import { unitDef } from "../simulation/roster";
import { AGE_NAMES, AGES, type Line } from "../simulation/types";

const runs = Number(process.argv[2] ?? 1000);
const seed = Number(process.argv[3] ?? 1);
const started = Date.now();
const result = league([PURIST, MIXER], runs, seed);
console.log(`${runs} Runs played in ${((Date.now() - started) / 1000).toFixed(1)}s (${result.runawayBattles} battles hit the ability-loop safety stop)\n`);

for (const name of [PURIST.name, MIXER.name]) {
  const mine = result.runs.filter((r) => r.personality === name);
  const avg = (f: (r: (typeof mine)[number]) => number) => (mine.reduce((s, r) => s + f(r), 0) / mine.length).toFixed(2);
  console.log(`${name}: avg wins ${avg((r) => r.wins)}, Runs won ${((mine.filter((r) => r.won).length / mine.length) * 100).toFixed(1)}%, avg Rounds ${avg((r) => r.rounds)}`);
}

// Test 1: Mixer Ghosts against Purist Ghosts from the same Round (9–12).
const rng = createRng(seed);
let wins = 0, losses = 0, draws = 0;
for (let round = 9; round <= 12; round++) {
  const purists = result.ghosts.filter((g) => g.round === round && g.personality === PURIST.name);
  for (const mixer of result.ghosts.filter((g) => g.round === round && g.personality === MIXER.name)) {
    const purist = pick(rng, purists);
    if (!purist) continue;
    const outcome = battle(mixer.line, purist.line, seedFrom(rng)).outcome;
    if (outcome === "win") wins++; else if (outcome === "loss") losses++; else draws++;
  }
}
const rate = wins / Math.max(1, wins + losses);
const pass1 = rate >= 0.55 && rate <= 0.65;
console.log(`\nTest 1 (mixing pays off): Mixer wins ${(rate * 100).toFixed(1)}% of ${wins + losses} decided battles (${draws} draws). Pass at 55–65%: ${pass1 ? "PASS" : "FAIL"}`);

// Test 2: old Units in Lines that won in Round 10+.
const old = new Set(["stone", "bronze", "iron"]);
const late = result.winningLines.filter((g) => g.round >= 10);
const oldCount = (line: Line) => line.filter((u) => u && old.has(unitDef(u.def).age)).length;
const avgOld = late.reduce((s, g) => s + oldCount(g.line), 0) / Math.max(1, late.length);
console.log(`Test 2 (old Units stay): ${avgOld.toFixed(2)} Stone/Bronze/Iron Units on average in ${late.length} winning Lines from Round 10+. Pass at ≥ 2: ${avgOld >= 2 ? "PASS" : "FAIL"}`);
for (const name of [PURIST.name, MIXER.name]) {
  const mine = late.filter((g) => g.personality === name);
  const byAge = AGES.map((age) => `${AGE_NAMES[age]} ${(mine.reduce((s, g) => s + g.line.filter((u) => u && unitDef(u.def).age === age).length, 0) / Math.max(1, mine.length)).toFixed(2)}`);
  console.log(`  ${name} (${mine.length} Lines): ${byAge.join(", ")}`);
}

mkdirSync("out", { recursive: true });
writeFileSync("out/ghosts.json", JSON.stringify(result.ghosts));
console.log(`\nSaved ${result.ghosts.length} Ghosts to out/ghosts.json`);
