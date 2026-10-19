// One utility-scored bot; a Personality is only a set of weights (see docs/hook-test.md).
// With scouting, the bot also previews its options in battles against a sample of this Round's Ghosts.
import { battle } from "./battle";
import { unitDef } from "./roster";
import { UNIT_PRICE, act, advancePrice, canAdvance, legalActions, type Action, type Run } from "./run";
import type { Line, Slot, Unit } from "./types";
import { ageIndex, ageOfUnit, stageOf } from "./units";

/** When a bot Advances: after `wait` Rounds in its Age, never past `maxAge`. */
export interface AdvancePolicy {
  wait: number;
  maxAge: number;
}

export interface Personality {
  name: string;
  advance: AdvancePolicy;
  /** Value per Age step of each Unit (Stone 0 … Sci-Fi 4). */
  newest: number;
  /** Value per distinct Age in the Line. */
  mixing: number;
  /** Value of beating every scouted Ghost; 0 means the bot doesn't scout. */
  scout: number;
}

/** Every 2 Rounds, as the shared timeline before Advancing was. */
const STEADY_ADVANCE: AdvancePolicy = { wait: 2, maxAge: 4 };

export const PURIST: Personality = { name: "Purist", advance: STEADY_ADVANCE, newest: 3, mixing: 0, scout: 0 };
export const MIXER: Personality = { name: "Mixer", advance: STEADY_ADVANCE, newest: 0, mixing: 6, scout: 0 };

/** Scouting versions: the same biases, but options are judged mainly by previewed battles. */
export const SCOUT_WEIGHT = 100;
export const SCOUTING_PURIST: Personality = { ...PURIST, scout: SCOUT_WEIGHT };
export const SCOUTING_MIXER: Personality = { ...MIXER, scout: SCOUT_WEIGHT };
/** Plays only to win: no Age bias at all. */
export const SCOUT: Personality = { name: "Scout", advance: STEADY_ADVANCE, newest: 0, mixing: 0, scout: SCOUT_WEIGHT };

/** Personalities that differ only in when they Advance, judging Units by stats alone (hook test 4). Boom never pays: it waits for history to move it on. */
const advancer = (name: string, advance: AdvancePolicy): Personality => ({ name, advance, newest: 0, mixing: 0, scout: 0 });
export const RUSH = advancer("Rush", { wait: 1, maxAge: 4 });
export const STEADY = advancer("Steady", STEADY_ADVANCE);
export const BOOM = advancer("Boom", { wait: Infinity, maxAge: 4 });
export const ADVANCERS = [RUSH, STEADY, BOOM];

/** How many of the best options (by value) a scouting bot previews in battle, plus its best replacements. */
const PREVIEWED_OPTIONS = 8;
const PREVIEWED_REPLACEMENTS = 4;

const MAX_REROLLS = 3;
const REPLACE_MARGIN = 2;
const SLOT_ORDER: Record<Slot, number> = { front: 0, bridge: 1, back: 2 };

/** Picks the next shop action for this Run. Scouting Personalities need Ghost Lines to preview against. */
export function decide(run: Run, p: Personality, scouts: Line[] = []): Action {
  if (wantsToAdvance(run, p.advance)) return { type: "advance" };
  if (p.scout > 0 && scouts.length > 0) return decideByScouting(run, p, scouts);
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

/** Advancing comes first in the shop, so the new Age's Units can be bought this Round; the bot keeps gold for one Unit. */
function wantsToAdvance(run: Run, policy: AdvancePolicy): boolean {
  if (!canAdvance(run) || run.age >= policy.maxAge || run.gold - advancePrice(run) < UNIT_PRICE) return false;
  return run.round - run.ageSince >= policy.wait;
}

/** Plays the whole shop phase. */
export function playShop(run: Run, p: Personality, scouts: Line[] = []): Run {
  for (let i = 0; i < 100 && run.phase === "shop"; i++) run = act(run, decide(run, p, scouts));
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

function decideByScouting(run: Run, p: Personality, scouts: Line[]): Action {
  const score = (r: Run) => value(r, p) + p.scout * winRate(r, scouts);
  const now = score(run);
  const nowValue = value(run, p);

  // Plans are one action, or a sale followed by a purchase into the freed slot.
  const plans: Action[][] = [];
  for (const action of legalActions(run)) {
    if (action.type === "buy" || action.type === "useInvention" || action.type === "merge") plans.push([action]);
  }
  if (run.line.every((u) => u !== null)) {
    run.line.forEach((_, slot) => {
      const sold = act(run, { type: "sell", slot });
      for (const action of legalActions(sold)) {
        if (action.type === "buy" && action.slot === slot) plans.push([{ type: "sell", slot }, action]);
      }
    });
  }
  // Value alone undervalues replacing an evolved Unit, so the best replacements are always previewed too.
  const byValue = plans
    .map((plan) => ({ plan, after: plan.reduce(act, run) }))
    .map((x) => ({ ...x, gain: value(x.after, p) - nowValue }))
    .sort((a, b) => b.gain - a.gain);
  const previewed = [
    ...byValue.filter((x) => x.plan.length === 1).slice(0, PREVIEWED_OPTIONS),
    ...byValue.filter((x) => x.plan.length === 2).slice(0, PREVIEWED_REPLACEMENTS),
  ];
  let best: { action: Action; gain: number } | null = null;
  for (const { plan, after } of previewed) {
    const gain = score(after) - now;
    if (gain > (best?.gain ?? 0)) best = { action: plan[0]!, gain };
  }
  if (best) return best.action;

  if (run.gold >= 4 && run.rerolls < MAX_REROLLS) return { type: "reroll" };

  // Rearranging only counts if the previewed battles improve.
  const currentRate = winRate(run, scouts);
  let bestSwap: { action: Action; rate: number } | null = null;
  for (const action of legalActions(run)) {
    if (action.type !== "swap") continue;
    const rate = winRate(act(run, action), scouts);
    if (rate > (bestSwap?.rate ?? currentRate)) bestSwap = { action, rate };
  }
  return bestSwap?.action ?? { type: "endShop" };
}

/** Share of the scouted Ghosts this Line beats (draws count half), after its End of round abilities. */
export function winRate(run: Run, scouts: Line[]): number {
  const ready = run.phase === "shop" ? act(run, { type: "endShop" }) : run;
  let score = 0;
  scouts.forEach((ghost, i) => {
    // The same seed per Ghost for every option, so options are compared on equal terms.
    const outcome = battle(ready.line, ghost, i + 1).outcome;
    score += outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  });
  return score / scouts.length;
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
