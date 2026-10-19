// Do Bridge pairings create decisions? npm run pairings [variant] [runs] [seed]
// For each Bridge, Round 9–12 Lines holding it are split by whether the partner Age is there too,
// and each Line fights random Lines from its Round. Uses the scouting bots.
import { battle } from "../simulation/battle";
import { createRng, int, seedFrom } from "../simulation/rng";
import { unitDef } from "../simulation/roster";
import type { Age, Line } from "../simulation/types";
import { measure } from "./measure";
import { VARIANTS } from "./variants";

const PAIRS: { bridge: string; partner: Age }[] = [
  { bridge: "recruiter", partner: "stone" },
  { bridge: "salesman", partner: "bronze" },
  { bridge: "pharaoh", partner: "scifi" },
  { bridge: "timetraveler", partner: "stone" },
];
const OPPONENTS = 5;

const variant = VARIANTS.find((v) => v.name === (process.argv[2] ?? "baseline"))!;
const runs = Number(process.argv[3] ?? 1000);
const seed = Number(process.argv[4] ?? 1);
variant.apply();
const ghosts = measure(runs, seed, true).result.ghosts.filter((g) => g.round >= 9 && g.round <= 12);
const rng = createRng(seed);
const has = (line: Line, pred: (def: string) => boolean, except?: number) => line.some((u, i) => u !== null && i !== except && pred(u.def));

function winRate(lines: { round: number; line: Line }[]): string {
  let wins = 0, decided = 0;
  for (const { round, line } of lines) {
    const pool = ghosts.filter((g) => g.round === round);
    for (let i = 0; i < OPPONENTS; i++) {
      const outcome = battle(line, pool[int(rng, pool.length)]!.line, seedFrom(rng)).outcome;
      if (outcome !== "draw") decided++;
      if (outcome === "win") wins++;
    }
  }
  return decided ? `${((wins / decided) * 100).toFixed(1)}% (${lines.length} Lines)` : "–";
}

console.log(`${variant.name}: ${ghosts.length} Lines from Rounds 9–12, scouting bots`);
for (const { bridge, partner } of PAIRS) {
  const withBridge = ghosts.filter((g) => has(g.line, (d) => d === bridge));
  const paired = withBridge.filter((g) => has(g.line, (d) => unitDef(d).age === partner, g.line.findIndex((u) => u?.def === bridge)));
  const unpaired = withBridge.filter((g) => !paired.includes(g));
  const partnerAnywhere = ghosts.filter((g) => has(g.line, (d) => unitDef(d).age === partner && d !== bridge)).length / ghosts.length;
  console.log(
    `  ${unitDef(bridge).names[0].padEnd(13)} + ${partner.padEnd(6)}: in ${((withBridge.length / ghosts.length) * 100).toFixed(0)}% of Lines; ` +
      `partner present ${((paired.length / Math.max(1, withBridge.length)) * 100).toFixed(0)}% (vs ${(partnerAnywhere * 100).toFixed(0)}% of all Lines); ` +
      `wins with partner ${winRate(paired)}, without ${winRate(unpaired)}`,
  );
}
