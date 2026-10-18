// One utility-scored bot; a Personality is only a set of weights (see docs/hook-test.md).
import { unitDef } from "./roster";
import { act, legalActions, type Action, type Run } from "./run";
import type { Slot, Unit } from "./types";
import { ageIndex, ageOfUnit, stageOf } from "./units";

export interface Personality {
  name: string;
  /** Value per Age step of each Unit (Stone 0 … Sci-Fi 4). */
  newest: number;
  /** Value per distinct Age in the Line. */
  mixing: number;
}

export const PURIST: Personality = { name: "Purist", newest: 3, mixing: 0 };
export const MIXER: Personality = { name: "Mixer", newest: 0, mixing: 6 };

const MAX_REROLLS = 3;
const REPLACE_MARGIN = 2;
const SLOT_ORDER: Record<Slot, number> = { front: 0, bridge: 1, back: 2 };

/** Picks the next shop action for this Run. */
export function decide(run: Run, p: Personality): Action {
  const now = value(run, p);
  let best: { action: Action; gain: number } | null = null;
  for (const action of legalActions(run)) {
    if (action.type !== "buy" && action.type !== "useInvention" && action.type !== "merge") continue;
    const gain = value(act(run, action), p) - now;
    if (gain > (best?.gain ?? 0)) best = { action, gain };
  }

  if (run.line.every((u) => u !== null)) {
    const replace = bestReplacement(run, p, now);
    if (replace && replace.gain > (best?.gain ?? 0) + REPLACE_MARGIN) return replace.action;
  }
  if (best) return best.action;

  if (run.gold >= 4 && run.rerolls < MAX_REROLLS) return { type: "reroll" };
  return arrange(run) ?? { type: "endShop" };
}

/** Plays the whole shop phase. */
export function playShop(run: Run, p: Personality): Run {
  for (let i = 0; i < 100 && run.phase === "shop"; i++) run = act(run, decide(run, p));
  if (run.phase === "shop") run = act(run, { type: "endShop" });
  return run;
}

export function value(run: Run, p: Personality): number {
  const units = run.line.filter((u): u is Unit => u !== null);
  let total = 0;
  for (const u of units) {
    const stage = stageOf(u.exp);
    total += (u.attack + u.health + 0.5 * (u.tempAttack + u.tempHealth)) * (1 + 0.25 * (stage - 1));
    total += 3 * stage + u.exp;
    total += p.newest * ageIndex(ageOfUnit(u));
  }
  total += p.mixing * new Set(units.map(ageOfUnit)).size;
  return total;
}

/** Selling a Unit to make room is only worth it if the best buy afterwards beats keeping it. */
function bestReplacement(run: Run, p: Personality, now: number): { action: Action; gain: number } | null {
  let best: { action: Action; gain: number } | null = null;
  run.line.forEach((_, slot) => {
    const sold = act(run, { type: "sell", slot });
    for (const action of legalActions(sold)) {
      if (action.type !== "buy" || sold.line[action.slot] !== null) continue;
      const gain = value(act(sold, action), p) - now;
      if (gain > (best?.gain ?? 0)) best = { action: { type: "sell", slot }, gain };
    }
  });
  return best;
}

/** Front Units first, then Bridges, then Back Units; sturdier first within a slot. Empty slots last. */
function arrange(run: Run): Action | null {
  const desired = run.line
    .map((u, i) => ({ u, i }))
    .sort((x, y) => rank(x.u) - rank(y.u) || (y.u?.health ?? 0) - (x.u?.health ?? 0) || x.i - y.i)
    .map((x) => x.i);
  const wrong = desired.findIndex((from, to) => from !== to);
  if (wrong < 0) return null;
  return { type: "swap", a: wrong, b: desired[wrong]! };
}

function rank(u: Unit | null): number {
  return u ? SLOT_ORDER[unitDef(u.def).slot] : 9;
}
