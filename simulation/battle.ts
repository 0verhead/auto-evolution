// A battle between two Lines, as in SAP: start-of-battle abilities by attack,
// then the two front Units hit each other at the same time until one side is empty.
import { createRng, next, pick, type Rng } from "./rng";
import { unitDef } from "./roster";
import { LINE_SIZE, type BattleApi, type BattleUnit, type Line, type Trigger } from "./types";
import { stageOf } from "./units";

export type Outcome = "win" | "loss" | "draw";

/** A Unit as the renderer needs it. */
export interface UnitSnapshot {
  id: number;
  def: string;
  stage: number;
  attack: number;
  health: number;
  armor: number;
}

export type BattleEvent =
  | { type: "start"; sides: [UnitSnapshot[], UnitSnapshot[]] }
  | { type: "ability"; unit: number; label: string; text: string }
  | { type: "attack"; attacker: number; target: number; label: string }
  | { type: "hurt"; unit: number; label: string; damage: number; absorbed: number; health: number; armor: number }
  | { type: "armor"; unit: number; label: string; amount: number; armor: number }
  | { type: "buff"; unit: number; label: string; attack: number; health: number; view: UnitSnapshot }
  | { type: "copy"; unit: number; label: string; copied: string }
  | { type: "faint"; unit: number; label: string }
  | { type: "summon"; unit: number; label: string; side: 0 | 1; at: number; view: UnitSnapshot }
  | { type: "end"; outcome: Outcome; runaway: boolean };

export interface BattleResult {
  /** From the point of view of the first Line. */
  outcome: Outcome;
  events: BattleEvent[];
}

const MAX_EXCHANGES = 200;
/** Safety stop for ability loops (e.g. an AI Core copying a Tribe Mother against a Cyborg). The battle ends as a draw. */
const MAX_ABILITY_USES = 500;

export function battle(mine: Line, ghost: Line, seed: number): BattleResult {
  const b = new Battle(createRng(seed), mine, ghost);
  return { outcome: b.run(), events: b.events };
}

class Battle implements BattleApi {
  readonly events: BattleEvent[] = [];
  private readonly sides: [BattleUnit[], BattleUnit[]];
  private nextId = 1;
  private abilityUses = 0;
  runaway = false;

  constructor(
    private readonly rng: Rng,
    mine: Line,
    ghost: Line,
  ) {
    this.sides = [this.enter(mine, 0), this.enter(ghost, 1)];
  }

  run(): Outcome {
    this.events.push({ type: "start", sides: [this.sides[0].map(view), this.sides[1].map(view)] });
    this.startOfBattle();
    for (let i = 0; i < MAX_EXCHANGES && !this.runaway && this.sides[0].length > 0 && this.sides[1].length > 0; i++) {
      const [a, d] = [this.sides[0][0]!, this.sides[1][0]!];
      const [aAttack, dAttack] = [a.attack, d.attack];
      this.events.push({ type: "attack", attacker: a.id, target: d.id, label: `${label(a)} ⚔ ${label(d)}` });
      this.damage(d, aAttack, a);
      this.damage(a, dAttack, d);
      this.resolveFaints();
    }
    const [mineLeft, ghostLeft] = [this.sides[0].length > 0, this.sides[1].length > 0];
    const outcome: Outcome = this.runaway || mineLeft === ghostLeft ? "draw" : mineLeft ? "win" : "loss";
    this.events.push({ type: "end", outcome, runaway: this.runaway });
    return outcome;
  }

  // BattleApi

  pick<T>(items: readonly T[]): T | undefined {
    return pick(this.rng, items);
  }

  friends(self: BattleUnit): BattleUnit[] {
    return this.sides[self.side].filter((u) => u !== self);
  }

  ahead(self: BattleUnit): BattleUnit | undefined {
    const side = this.sides[self.side];
    const index = side.indexOf(self);
    return index > 0 ? side[index - 1] : undefined;
  }

  frontEnemy(self: BattleUnit): BattleUnit | undefined {
    return this.sides[self.side === 0 ? 1 : 0][0];
  }

  summon(side: 0 | 1, at: number, attack: number, health: number): void {
    const units = this.sides[side];
    if (units.length >= LINE_SIZE) return;
    const cousin = this.create("cousin", side, attack, health, 0);
    cousin.ability = null;
    const index = Math.min(at, units.length);
    units.splice(index, 0, cousin);
    this.events.push({ type: "summon", unit: cousin.id, label: label(cousin), side, at: index, view: view(cousin) });
    for (const friend of this.friends(cousin)) {
      if (this.triggerOf(friend) === "friendSummoned") this.useAbility(friend, cousin);
    }
  }

  damage(target: BattleUnit, amount: number, source: BattleUnit): void {
    if (amount <= 0 || !this.alive(target)) return;
    const absorbed = Math.min(target.armor, amount);
    target.armor -= absorbed;
    target.health -= amount - absorbed;
    this.events.push({ type: "hurt", unit: target.id, label: label(target), damage: amount, absorbed, health: target.health, armor: target.armor });
    if (target.health <= 0 && !target.killedBy) target.killedBy = source;
  }

  giveArmor(target: BattleUnit, amount: number): void {
    target.armor += amount;
    this.events.push({ type: "armor", unit: target.id, label: label(target), amount, armor: target.armor });
  }

  buff(target: BattleUnit, attack: number, health: number): void {
    target.attack += attack;
    target.health += health;
    this.events.push({ type: "buff", unit: target.id, label: label(target), attack, health, view: view(target) });
  }

  copyAbility(self: BattleUnit, from: BattleUnit): void {
    const source = from.ability;
    if (!source || unitDef(source.def).copiesAbilities) return;
    self.ability = { def: source.def, stage: self.stage };
    this.events.push({ type: "copy", unit: self.id, label: label(self), copied: unitDef(source.def).names[0] });
    if (unitDef(source.def).trigger === "startOfBattle") this.useAbility(self);
  }

  // Internals

  private enter(line: Line, side: 0 | 1): BattleUnit[] {
    return line
      .filter((u) => u !== null)
      .map((u) => this.create(u.def, side, u.attack + u.tempAttack, u.health + u.tempHealth, u.exp));
  }

  private create(def: string, side: 0 | 1, attack: number, health: number, exp: number): BattleUnit {
    const stage = stageOf(exp);
    return {
      id: this.nextId++,
      side,
      def,
      age: unitDef(def).age,
      stage,
      attack,
      health,
      armor: 0,
      uses: 0,
      ability: { def, stage },
      faintedAt: 0,
      killedBy: null,
    };
  }

  private startOfBattle(): void {
    const order = [...this.sides[0], ...this.sides[1]]
      .filter((u) => this.triggerOf(u) === "startOfBattle")
      .map((u) => ({ u, tie: next(this.rng) }))
      .sort((x, y) => y.u.attack - x.u.attack || x.tie - y.tie)
      .map((x) => x.u);
    for (const unit of order) if (this.alive(unit)) this.useAbility(unit);
    this.resolveFaints();
  }

  private resolveFaints(): void {
    for (;;) {
      const firstSide = next(this.rng) < 0.5 ? 0 : 1;
      const order = [this.sides[firstSide], this.sides[1 - firstSide]!];
      const fainted = order.flatMap((side) => side.filter((u) => u.health <= 0));
      if (fainted.length === 0) return;
      for (const unit of fainted) {
        const side = this.sides[unit.side];
        unit.faintedAt = side.indexOf(unit);
        side.splice(unit.faintedAt, 1);
        this.events.push({ type: "faint", unit: unit.id, label: label(unit) });
      }
      for (const unit of fainted) {
        if (this.triggerOf(unit) === "faint") this.useAbility(unit);
        for (const friend of this.sides[unit.side]) {
          if (this.triggerOf(friend) === "friendFaints") this.useAbility(friend, unit);
        }
        const killer = unit.killedBy;
        if (killer && killer.side !== unit.side && this.alive(killer) && this.triggerOf(killer) === "knockOut") {
          this.useAbility(killer);
        }
      }
    }
  }

  private useAbility(unit: BattleUnit, subject?: BattleUnit): void {
    const ability = unit.ability;
    if (!ability || this.runaway) return;
    if (++this.abilityUses > MAX_ABILITY_USES) {
      this.runaway = true;
      return;
    }
    const def = unitDef(ability.def);
    if (def.usesPerBattle !== undefined && unit.uses >= def.usesPerBattle) return;
    const at = this.events.length;
    this.events.push({ type: "ability", unit: unit.id, label: label(unit), text: def.text(ability.stage) });
    def.battle?.(this, unit, ability.stage, subject);
    // A conditional ability whose condition failed did nothing; don't show it firing.
    if (this.events.length === at + 1) this.events.pop();
    else unit.uses++;
  }

  private triggerOf(unit: BattleUnit): Trigger {
    return unit.ability ? unitDef(unit.ability.def).trigger : "none";
  }

  private alive(unit: BattleUnit): boolean {
    return this.sides[unit.side].includes(unit);
  }
}

function view(unit: BattleUnit): UnitSnapshot {
  return { id: unit.id, def: unit.def, stage: unit.stage, attack: unit.attack, health: unit.health, armor: unit.armor };
}

function label(unit: BattleUnit): string {
  const name = unitDef(unit.def).names[unit.stage - 1];
  return `${unit.side === 0 ? "▶" : "◀"}${name}(${unit.attack}/${Math.max(unit.health, 0)}${unit.armor ? `+${unit.armor}🛡` : ""})`;
}
