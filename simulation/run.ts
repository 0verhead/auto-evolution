// One Run: shop phases and battles, with SAP's numbers (Q6 in the design grilling).
import { battle, type BattleResult } from "./battle";
import { createRng, pick, seedFrom, type Rng } from "./rng";
import { INVENTIONS, UNITS, inventionDef, unitDef } from "./roster";
import { LINE_SIZE, type Line, type ShopApi, type Unit } from "./types";
import { MAX_EXP, ageIndex, ageOfUnit, freshUnit, latestAgeIndex, stageOf } from "./units";

export const GOLD_PER_ROUND = 10;
export const UNIT_PRICE = 3;
export const INVENTION_PRICE = 3;
export const REROLL_PRICE = 1;
export const START_LIVES = 5;
export const WINS_TO_WIN = 10;

export interface ShopUnit {
  def: string;
  attack: number;
  health: number;
  price: number;
  frozen: boolean;
}

export interface ShopInvention {
  def: string;
  price: number;
  frozen: boolean;
}

export type Phase = "shop" | "battle" | "won" | "lost";

export interface Run {
  rng: Rng;
  round: number;
  phase: Phase;
  gold: number;
  lives: number;
  wins: number;
  line: Line;
  shopUnits: ShopUnit[];
  shopInventions: ShopInvention[];
  /** From Canned Food: added to every Unit the shop offers for the rest of the Run. */
  shopBuff: { attack: number; health: number };
  rerolls: number;
}

export type Action =
  | { type: "buy"; shop: number; slot: number }
  | { type: "useInvention"; shop: number; slot?: number }
  | { type: "sell"; slot: number }
  | { type: "merge"; from: number; to: number }
  | { type: "swap"; a: number; b: number }
  | { type: "reroll" }
  | { type: "freeze"; kind: "unit" | "invention"; shop: number }
  | { type: "endShop" };

export function newRun(seed: number): Run {
  const run: Run = {
    rng: createRng(seed),
    round: 0,
    phase: "shop",
    gold: 0,
    lives: START_LIVES,
    wins: 0,
    line: Array.from({ length: LINE_SIZE }, () => null),
    shopUnits: [],
    shopInventions: [],
    shopBuff: { attack: 0, health: 0 },
    rerolls: 0,
  };
  startRound(run);
  return run;
}

export function cloneRun(run: Run): Run {
  return {
    ...run,
    rng: { state: run.rng.state },
    line: run.line.map((u) => (u ? { ...u } : null)),
    shopUnits: run.shopUnits.map((s) => ({ ...s })),
    shopInventions: run.shopInventions.map((s) => ({ ...s })),
    shopBuff: { ...run.shopBuff },
  };
}

/** Applies a shop action to a copy of the Run. Throws on an illegal action. */
export function act(run: Run, action: Action): Run {
  const copy = cloneRun(run);
  apply(copy, action);
  return copy;
}

/** The Line as a Ghost: what another player fights. */
export function snapshot(run: Run): Line {
  return run.line.map((u) => (u ? { ...u } : null));
}

export function resolveBattle(run: Run, ghost: Line): { run: Run; result: BattleResult } {
  if (run.phase !== "battle") throw new Error("The shop phase has not ended");
  const copy = cloneRun(run);
  const result = battle(copy.line, ghost, seedFrom(copy.rng));
  if (result.outcome === "win") copy.wins++;
  if (result.outcome === "loss") copy.lives--;
  for (const unit of copy.line) {
    if (unit) unit.tempAttack = unit.tempHealth = 0;
  }
  if (copy.wins >= WINS_TO_WIN) copy.phase = "won";
  else if (copy.lives <= 0) copy.phase = "lost";
  else startRound(copy);
  return { run: copy, result };
}

export function unitSlots(round: number): number {
  return round >= 9 ? 5 : round >= 5 ? 4 : 3;
}

export function inventionSlots(round: number): number {
  return round >= 3 ? 2 : 1;
}

/** Legal actions, with purchases offered into the first empty slot only (placement is done by swapping). */
export function legalActions(run: Run): Action[] {
  if (run.phase !== "shop") return [];
  const actions: Action[] = [];
  const firstEmpty = run.line.indexOf(null);
  run.shopUnits.forEach((offer, shop) => {
    if (offer.price > run.gold) return;
    if (firstEmpty >= 0) actions.push({ type: "buy", shop, slot: firstEmpty });
    run.line.forEach((unit, slot) => {
      if (unit && unit.def === offer.def && unit.exp < MAX_EXP) actions.push({ type: "buy", shop, slot });
    });
  });
  run.shopInventions.forEach((offer, shop) => {
    if (offer.price > run.gold) return;
    if (!inventionDef(offer.def).targeted) actions.push({ type: "useInvention", shop });
    else run.line.forEach((unit, slot) => unit && actions.push({ type: "useInvention", shop, slot }));
  });
  run.line.forEach((unit, slot) => {
    if (!unit) return;
    actions.push({ type: "sell", slot });
    run.line.forEach((other, to) => {
      if (other && to !== slot && other.def === unit.def && other.exp < MAX_EXP) actions.push({ type: "merge", from: slot, to });
    });
  });
  for (let a = 0; a < LINE_SIZE; a++) {
    for (let b = a + 1; b < LINE_SIZE; b++) {
      if (run.line[a] || run.line[b]) actions.push({ type: "swap", a, b });
    }
  }
  if (run.gold >= REROLL_PRICE) actions.push({ type: "reroll" });
  run.shopUnits.forEach((_, shop) => actions.push({ type: "freeze", kind: "unit", shop }));
  run.shopInventions.forEach((_, shop) => actions.push({ type: "freeze", kind: "invention", shop }));
  actions.push({ type: "endShop" });
  return actions;
}

function apply(run: Run, action: Action): void {
  if (run.phase !== "shop") throw new Error(`Cannot act during ${run.phase}`);
  switch (action.type) {
    case "buy": {
      const offer = run.shopUnits[action.shop];
      if (!offer || offer.price > run.gold) throw new Error("Cannot afford that Unit");
      const target = run.line[action.slot];
      let bought: Unit;
      if (target === null) {
        bought = { def: offer.def, attack: offer.attack, health: offer.health, exp: 0, tempAttack: 0, tempHealth: 0 };
        run.line[action.slot] = bought;
      } else if (target && target.def === offer.def && target.exp < MAX_EXP) {
        target.attack = Math.max(target.attack, offer.attack) + 1;
        target.health = Math.max(target.health, offer.health) + 1;
        addExp(run, target, 1);
        bought = target;
      } else {
        throw new Error("That slot holds a different Unit");
      }
      run.gold -= offer.price;
      run.shopUnits.splice(action.shop, 1);
      for (const friend of units(run)) {
        if (friend !== bought && unitDef(friend.def).trigger === "friendBought") useShopAbility(run, friend, bought);
      }
      return;
    }
    case "useInvention": {
      const offer = run.shopInventions[action.shop];
      if (!offer || offer.price > run.gold) throw new Error("Cannot afford that Invention");
      const def = inventionDef(offer.def);
      const target = action.slot === undefined ? undefined : run.line[action.slot];
      if (def.targeted && !target) throw new Error(`${def.name} needs a Unit`);
      run.gold -= offer.price;
      run.shopInventions.splice(action.shop, 1);
      def.apply(
        {
          ...shopApi(run),
          line: units(run),
          addShopBuff: (attack, health) => {
            run.shopBuff.attack += attack;
            run.shopBuff.health += health;
            for (const s of run.shopUnits) {
              s.attack += attack;
              s.health += health;
            }
          },
          addExp: (unit, exp) => addExp(run, unit, exp),
        },
        target ?? undefined,
      );
      return;
    }
    case "sell": {
      const unit = run.line[action.slot];
      if (!unit) throw new Error("Nothing to sell");
      run.gold += stageOf(unit.exp);
      run.line[action.slot] = null;
      return;
    }
    case "merge": {
      const [from, to] = [run.line[action.from], run.line[action.to]];
      if (!from || !to || from === to || from.def !== to.def || to.exp >= MAX_EXP) throw new Error("Cannot merge those");
      to.attack = Math.max(to.attack, from.attack) + 1;
      to.health = Math.max(to.health, from.health) + 1;
      to.tempAttack = Math.max(to.tempAttack, from.tempAttack);
      to.tempHealth = Math.max(to.tempHealth, from.tempHealth);
      run.line[action.from] = null;
      addExp(run, to, from.exp + 1);
      return;
    }
    case "swap": {
      const { a, b } = action;
      if (a < 0 || b < 0 || a >= LINE_SIZE || b >= LINE_SIZE) throw new Error("No such slot");
      [run.line[a], run.line[b]] = [run.line[b]!, run.line[a]!];
      return;
    }
    case "reroll": {
      if (run.gold < REROLL_PRICE) throw new Error("Cannot afford a reroll");
      run.gold -= REROLL_PRICE;
      run.rerolls++;
      rollShop(run);
      return;
    }
    case "freeze": {
      const offer = action.kind === "unit" ? run.shopUnits[action.shop] : run.shopInventions[action.shop];
      if (!offer) throw new Error("Nothing to freeze");
      offer.frozen = !offer.frozen;
      return;
    }
    case "endShop": {
      for (const unit of units(run)) {
        if (unitDef(unit.def).trigger === "endOfRound") useShopAbility(run, unit);
      }
      run.phase = "battle";
      return;
    }
  }
}

function startRound(run: Run): void {
  run.round++;
  // As in SAP, Rounds 1–2 are random enough that one lost life comes back at the start of Round 3.
  if (run.round === 3 && run.lives < START_LIVES) run.lives++;
  run.gold = GOLD_PER_ROUND;
  run.rerolls = 0;
  run.phase = "shop";
  rollShop(run);
  for (const unit of units(run)) {
    if (unitDef(unit.def).trigger === "startOfRound") useShopAbility(run, unit);
  }
}

/** Keeps frozen offers and refills the rest from every unlocked Age. */
function rollShop(run: Run): void {
  const latest = latestAgeIndex(run.round);
  const unitPool = UNITS.filter((u) => !u.token && ageIndex(u.age) <= latest);
  const inventionPool = INVENTIONS.filter((i) => ageIndex(i.age) <= latest);
  run.shopUnits = run.shopUnits.filter((s) => s.frozen);
  while (run.shopUnits.length < unitSlots(run.round)) run.shopUnits.push(offerUnit(run, pick(run.rng, unitPool)!.id, UNIT_PRICE));
  run.shopInventions = run.shopInventions.filter((s) => s.frozen);
  while (run.shopInventions.length < inventionSlots(run.round)) {
    run.shopInventions.push({ def: pick(run.rng, inventionPool)!.id, price: INVENTION_PRICE, frozen: false });
  }
}

function offerUnit(run: Run, def: string, price: number): ShopUnit {
  const fresh = freshUnit(def);
  return { def, attack: fresh.attack + run.shopBuff.attack, health: fresh.health + run.shopBuff.health, price, frozen: false };
}

/** Each Stage-up adds a Unit from the next Age to the shop, as in SAP. */
function addExp(run: Run, unit: Unit, exp: number): void {
  const before = stageOf(unit.exp);
  unit.exp = Math.min(MAX_EXP, unit.exp + exp);
  if (stageOf(unit.exp) > before) {
    const age = Math.min(4, latestAgeIndex(run.round) + 1);
    const def = pick(run.rng, UNITS.filter((u) => !u.token && ageIndex(u.age) === age))!;
    run.shopUnits.push(offerUnit(run, def.id, UNIT_PRICE));
  }
}

function useShopAbility(run: Run, unit: Unit, subject?: Unit): void {
  unitDef(unit.def).shop?.(shopApi(run), unit, stageOf(unit.exp), subject);
}

function shopApi(run: Run): ShopApi {
  return {
    friends: (self) => units(run).filter((u) => u !== self),
    behind: (self) => run.line.slice(run.line.indexOf(self) + 1).find((u) => u !== null) ?? undefined,
    ageOf: ageOfUnit,
    pick: (items) => pick(run.rng, items),
    buff: (target, attack, health) => {
      target.attack += attack;
      target.health += health;
    },
    gainGold: (amount) => {
      run.gold += amount;
    },
    stock: (def, price) => {
      run.shopUnits.push(offerUnit(run, def, price));
    },
  };
}

function units(run: Run): Unit[] {
  return run.line.filter((u) => u !== null);
}
