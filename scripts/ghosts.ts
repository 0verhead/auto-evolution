import { existsSync, readFileSync } from "node:fs";
import type { Ghost } from "../simulation/league";
import { pick, type Rng } from "../simulation/rng";

export function ghostsFile(variant: string): string {
  return `out/ghosts-${variant}.json`;
}

/** Ghosts saved by `npm run hook` or `npm run advance`; a Round past the last saved one uses the last saved Round. */
export function loadGhosts(variant = "baseline", command = `npm run hook 1000 1 ${variant}`): Map<number, Ghost[]> {
  const file = ghostsFile(variant);
  if (!existsSync(file)) throw new Error(`Run \`${command}\` first to create ${file}`);
  const byRound = new Map<number, Ghost[]>();
  for (const g of JSON.parse(readFileSync(file, "utf8")) as Ghost[]) {
    byRound.set(g.round, [...(byRound.get(g.round) ?? []), g]);
  }
  return byRound;
}

export function ghostFor(byRound: Map<number, Ghost[]>, round: number, rng: Rng): Ghost {
  const last = Math.max(...byRound.keys());
  return pick(rng, byRound.get(Math.min(round, last))!)!;
}
