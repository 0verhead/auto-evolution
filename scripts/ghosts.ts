import { existsSync, readFileSync } from "node:fs";
import type { Ghost } from "../simulation/league";
import { pick, type Rng } from "../simulation/rng";

/** Ghosts saved by `npm run hook`; a Round past the last saved one uses the last saved Round. */
export function loadGhosts(): Map<number, Ghost[]> {
  if (!existsSync("out/ghosts.json")) throw new Error("Run `npm run hook` first to create out/ghosts.json");
  const byRound = new Map<number, Ghost[]>();
  for (const g of JSON.parse(readFileSync("out/ghosts.json", "utf8")) as Ghost[]) {
    byRound.set(g.round, [...(byRound.get(g.round) ?? []), g]);
  }
  return byRound;
}

export function ghostFor(byRound: Map<number, Ghost[]>, round: number, rng: Rng): Ghost {
  const last = Math.max(...byRound.keys());
  return pick(rng, byRound.get(Math.min(round, last))!)!;
}
