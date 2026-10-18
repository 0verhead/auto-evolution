export const AGES = ["stone", "bronze", "iron", "modern", "scifi"] as const;
export type Age = (typeof AGES)[number];

export const AGE_NAMES: Record<Age, string> = {
  stone: "Stone",
  bronze: "Bronze",
  iron: "Iron",
  modern: "Modern",
  scifi: "Sci-Fi",
};

export type Stage = 1 | 2 | 3;
export type Slot = "front" | "back" | "bridge";

export type Trigger =
  | "none"
  | "startOfBattle"
  | "faint"
  | "friendSummoned"
  | "friendFaints"
  | "knockOut"
  | "endOfRound"
  | "startOfRound"
  | "friendBought";

export const LINE_SIZE = 5;

/** A Unit the player owns. Stats are permanent; temp stats last until the end of the next battle. */
export interface Unit {
  def: string;
  attack: number;
  health: number;
  exp: number;
  tempAttack: number;
  tempHealth: number;
}

/** Five slots, front (index 0) to back. */
export type Line = (Unit | null)[];

export interface BattleUnit {
  id: number;
  side: 0 | 1;
  def: string;
  age: Age;
  stage: Stage;
  attack: number;
  health: number;
  armor: number;
  /** Whose ability this Unit uses this battle; the AI Core replaces it with a copy. */
  ability: { def: string; stage: Stage } | null;
  /** Times its ability has taken effect this battle. */
  uses: number;
  /** Position in its side when it fainted, for summons that take its place. */
  faintedAt: number;
  killedBy: BattleUnit | null;
}

export interface BattleApi {
  friends(self: BattleUnit): BattleUnit[];
  ahead(self: BattleUnit): BattleUnit | undefined;
  frontEnemy(self: BattleUnit): BattleUnit | undefined;
  summon(side: 0 | 1, at: number, attack: number, health: number): void;
  damage(target: BattleUnit, amount: number, source: BattleUnit): void;
  giveArmor(target: BattleUnit, amount: number): void;
  buff(target: BattleUnit, attack: number, health: number): void;
  copyAbility(self: BattleUnit, from: BattleUnit): void;
}

export interface ShopApi {
  friends(self: Unit): Unit[];
  behind(self: Unit): Unit | undefined;
  ageOf(unit: Unit): Age;
  pick<T>(items: readonly T[]): T | undefined;
  buff(target: Unit, attack: number, health: number): void;
  gainGold(amount: number): void;
  stock(def: string, price: number): void;
}

export interface UnitDef {
  id: string;
  age: Age;
  slot: Slot;
  names: [string, string, string];
  attack: number;
  health: number;
  trigger: Trigger;
  /** Summoned only, never sold in the shop. */
  token?: boolean;
  /** "Works N times per battle", as on some SAP pets. */
  usesPerBattle?: number;
  text(stage: Stage): string;
  battle?(api: BattleApi, self: BattleUnit, stage: Stage, subject?: BattleUnit): void;
  shop?(api: ShopApi, self: Unit, stage: Stage, subject?: Unit): void;
}

export interface InventionDef {
  id: string;
  age: Age;
  name: string;
  /** Applied to one chosen Unit; otherwise it affects random Units or the shop. */
  targeted: boolean;
  text: string;
  apply(api: ShopApi & { line: Unit[]; addShopBuff(attack: number, health: number): void; addExp(target: Unit, exp: number): void }, target?: Unit): void;
}
