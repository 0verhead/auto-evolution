import { unitDef } from "./roster";
import { AGES, type Age, type Line, type Stage, type Unit } from "./types";

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

/** A Line's Age as anyone can see it: the latest Age among its Units (Stone when empty). */
export function lineAgeIndex(line: Line): number {
  return Math.max(0, ...line.filter((u) => u !== null).map((u) => ageIndex(ageOfUnit(u))));
}

export function unitName(unit: Unit): string {
  return unitDef(unit.def).names[stageOf(unit.exp) - 1]!;
}

export function freshUnit(def: string): Unit {
  const d = unitDef(def);
  return { def, attack: d.attack, health: d.health, exp: 0, tempAttack: 0, tempHealth: 0 };
}
