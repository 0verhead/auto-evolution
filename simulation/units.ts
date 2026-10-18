import { unitDef } from "./roster";
import { AGES, type Age, type Stage, type Unit } from "./types";

/** Stage 2 at 3 copies (2 exp), Stage 3 at 6 copies (5 exp), as in SAP. */
export const MAX_EXP = 5;

export function stageOf(exp: number): Stage {
  return exp >= 5 ? 3 : exp >= 2 ? 2 : 1;
}

export function ageIndex(age: Age): number {
  return AGES.indexOf(age);
}

export function ageOfUnit(unit: Unit): Age {
  return unitDef(unit.def).age;
}

/** Ages arrive every 2 Rounds: Stone 1–2, Bronze 3–4, Iron 5–6, Modern 7–8, Sci-Fi from 9. */
export function latestAgeIndex(round: number): number {
  return Math.min(AGES.length - 1, Math.floor((round - 1) / 2));
}

export function unitName(unit: Unit): string {
  return unitDef(unit.def).names[stageOf(unit.exp) - 1]!;
}

export function freshUnit(def: string): Unit {
  const d = unitDef(def);
  return { def, attack: d.attack, health: d.health, exp: 0, tempAttack: 0, tempHealth: 0 };
}
