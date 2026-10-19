// Hook test 1 from docs/hook-test.md: npm run hook [runs] [seed] [variant] [--scout]
// --scout measures the scouting bots, which preview their options in battle.
import { mkdirSync, writeFileSync } from "node:fs";
import { AGE_NAMES, AGES } from "../simulation/types";
import { ghostsFile } from "./ghosts";
import { MAX_UNIT_PRESENCE, MIN_AGE_PRESENCE, measure, mostKeptOldUnit, oldUnits, presencePasses, type PersonalityStats } from "./measure";
import { unitDef } from "../simulation/roster";
import { VARIANTS } from "./variants";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const scouting = process.argv.includes("--scout");
const runs = Number(args[0] ?? 1000);
const seed = Number(args[1] ?? 1);
const variant = VARIANTS.find((v) => v.name === (args[2] ?? "baseline"));
if (!variant) throw new Error(`Unknown variant. Choose one of: ${VARIANTS.map((v) => v.name).join(", ")}`);
variant.apply();

const started = Date.now();
const m = measure(runs, seed, scouting);
console.log(`${variant.name}: ${variant.description}${scouting ? " (scouting bots)" : ""}`);
console.log(`${runs} Runs played in ${((Date.now() - started) / 1000).toFixed(1)}s (${m.result.runawayBattles} battles hit the ability-loop safety stop)\n`);
const line = (name: string, s: PersonalityStats) =>
  `${name}: avg wins ${s.avgWins.toFixed(2)}, Runs won ${(s.runsWon * 100).toFixed(1)}%, late winning Lines (${s.lateWinners}): ${AGES.map((a) => `${AGE_NAMES[a]} ${s.lateWinnerAges[a].toFixed(2)}`).join(", ")}, ${s.lateWinnerDistinctAges.toFixed(2)} Ages`;
console.log(line("Purist", m.purist));
console.log(line("Mixer", m.mixer));
if (m.scout) console.log(line("Scout", m.scout));

const ages = AGES.map((a) => `${AGE_NAMES[a]} ${(m.latePresence[a] * 100).toFixed(0)}%`).join(", ");
const units = oldUnits().map((id) => `${unitDef(id).names[0]} ${((m.lateUnitPresence[id] ?? 0) * 100).toFixed(0)}%`).join(", ");
console.log(`\nTest 1 (keeping is a choice), ${m.lateWinners} winning Lines from Round 10+:`);
console.log(`  Ages: ${ages}`);
console.log(`  old Units: ${units}`);
console.log(`  Pass with every old Unit at most ${MAX_UNIT_PRESENCE * 100}% and every old Age at least ${MIN_AGE_PRESENCE * 100}%: ${presencePasses(m) ? "PASS" : "FAIL"} (most kept: ${unitDef(mostKeptOldUnit(m).id).names[0]})`);
console.log(`  For reference: Mixer wins ${(m.mixerHeadToHead * 100).toFixed(1)}% head to head against the Purist in Rounds 9–12; ${m.oldUnitsInLateWinners.toFixed(2)} old Units per late winning Line.\n`);

mkdirSync("out", { recursive: true });
const file = ghostsFile(scouting ? `${variant.name}-scouting` : variant.name);
writeFileSync(file, JSON.stringify(m.result.ghosts));
console.log(`\nSaved ${m.result.ghosts.length} Ghosts to ${file}`);
