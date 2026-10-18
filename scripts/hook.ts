// Hook tests 1 and 2 from docs/hook-test.md: npm run hook [runs] [seed] [variant]
import { mkdirSync, writeFileSync } from "node:fs";
import { AGE_NAMES, AGES } from "../simulation/types";
import { ghostsFile } from "./ghosts";
import { measure, type PersonalityStats } from "./measure";
import { VARIANTS } from "./variants";

const runs = Number(process.argv[2] ?? 1000);
const seed = Number(process.argv[3] ?? 1);
const variant = VARIANTS.find((v) => v.name === (process.argv[4] ?? "baseline"));
if (!variant) throw new Error(`Unknown variant. Choose one of: ${VARIANTS.map((v) => v.name).join(", ")}`);
variant.apply();

const started = Date.now();
const m = measure(runs, seed);
console.log(`${variant.name}: ${variant.description}`);
console.log(`${runs} Runs played in ${((Date.now() - started) / 1000).toFixed(1)}s (${m.result.runawayBattles} battles hit the ability-loop safety stop)\n`);
const line = (name: string, s: PersonalityStats) =>
  `${name}: avg wins ${s.avgWins.toFixed(2)}, Runs won ${(s.runsWon * 100).toFixed(1)}%, late winning Lines (${s.lateWinners}): ${AGES.map((a) => `${AGE_NAMES[a]} ${s.lateWinnerAges[a].toFixed(2)}`).join(", ")}`;
console.log(line("Purist", m.purist));
console.log(line("Mixer", m.mixer));

const pass1 = m.mixerHeadToHead >= 0.55 && m.mixerHeadToHead <= 0.65;
console.log(`\nTest 1 (mixing pays off): Mixer wins ${(m.mixerHeadToHead * 100).toFixed(1)}% of ${m.decided} decided battles (${m.draws} draws). Pass at 55–65%: ${pass1 ? "PASS" : "FAIL"}`);
console.log(`Test 2 (old Units stay): ${m.oldUnitsInLateWinners.toFixed(2)} Stone/Bronze/Iron Units on average in ${m.lateWinners} winning Lines from Round 10+. Pass at ≥ 2: ${m.oldUnitsInLateWinners >= 2 ? "PASS" : "FAIL"}`);

mkdirSync("out", { recursive: true });
writeFileSync(ghostsFile(variant.name), JSON.stringify(m.result.ghosts));
console.log(`\nSaved ${m.result.ghosts.length} Ghosts to ${ghostsFile(variant.name)}`);
