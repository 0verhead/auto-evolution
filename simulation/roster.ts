// The v1 roster from docs/roster.md.
import type { InventionDef, UnitDef } from "./types";

export const UNITS: UnitDef[] = [
  // Stone: Numbers
  {
    id: "caveman",
    age: "stone",
    slot: "front",
    names: ["Caveman", "Big Caveman", "Biggest Caveman"],
    attack: 1,
    health: 3,
    trigger: "faint",
    text: (n) => `Faint: summon a ${n}/${n} Cousin.`,
    battle: (b, self, n) => b.summon(self.side, self.faintedAt, n, n),
  },
  {
    id: "drummer",
    age: "stone",
    slot: "back",
    names: ["Log Drummer", "Bone Drummer", "Thunder Drummer"],
    attack: 2,
    health: 1,
    trigger: "friendSummoned",
    text: (n) => `Friend summoned: give it +${n} attack until end of battle.`,
    battle: (b, _self, n, summoned) => summoned && b.buff(summoned, n, 0),
  },
  {
    id: "gatherer",
    age: "stone",
    slot: "bridge",
    names: ["Gatherer", "Tribe Mother", "Great Mother"],
    attack: 2,
    health: 2,
    trigger: "friendFaints",
    usesPerBattle: 3,
    text: (n) => `Friend from a different Age faints: summon a ${2 * n}/${2 * n} Cousin. Works 3 times per battle.`,
    battle: (b, self, n, fainted) => {
      if (fainted && fainted.age !== self.age) b.summon(self.side, fainted.faintedAt, 2 * n, 2 * n);
    },
  },

  // Bronze: Patience
  {
    id: "builder",
    age: "bronze",
    slot: "front",
    names: ["Brick Carrier", "Pyramid Builder", "Grand Architect"],
    attack: 2,
    health: 3,
    trigger: "endOfRound",
    text: (n) => `End of round: gain +${n} health.`,
    shop: (s, self, n) => s.buff(self, 0, n),
  },
  {
    id: "scribe",
    age: "bronze",
    slot: "back",
    names: ["Clay Scribe", "Royal Scribe", "Chief Scribe"],
    attack: 2,
    health: 2,
    trigger: "endOfRound",
    text: (n) => `End of round: gain +${n} attack.`,
    shop: (s, self, n) => s.buff(self, n, 0),
  },
  {
    id: "pharaoh",
    age: "bronze",
    slot: "bridge",
    names: ["Chieftain", "Priest-King", "Pharaoh"],
    attack: 1,
    health: 2,
    trigger: "endOfRound",
    text: (n) => `End of round: give a random friend from a different Age +${n}/+${n}.`,
    shop: (s, self, n) => {
      const target = s.pick(s.friends(self).filter((f) => s.ageOf(f) !== s.ageOf(self)));
      if (target) s.buff(target, n, n);
    },
  },

  // Iron: Formation
  {
    id: "legionary",
    age: "iron",
    slot: "front",
    names: ["Legionary", "Veteran", "Praetorian"],
    attack: 1,
    health: 3,
    trigger: "startOfBattle",
    text: (n) => `Start of battle: gain ${3 * n} Armor.`,
    battle: (b, self, n) => b.giveArmor(self, 3 * n),
  },
  {
    id: "shieldbearer",
    age: "iron",
    slot: "back",
    names: ["Shield Bearer", "Centurion", "Legate"],
    attack: 4,
    health: 2,
    trigger: "startOfBattle",
    text: (n) => `Start of battle: give the friend ahead ${2 * n} Armor.`,
    battle: (b, self, n) => {
      const ahead = b.ahead(self);
      if (ahead) b.giveArmor(ahead, 2 * n);
    },
  },
  {
    id: "recruiter",
    age: "iron",
    slot: "bridge",
    names: ["Recruiter", "Drillmaster", "General"],
    attack: 1,
    health: 2,
    trigger: "startOfBattle",
    text: (n) => `Start of battle: give every friend from a different Age ${n} Armor.`,
    battle: (b, self, n) => {
      for (const friend of b.friends(self)) if (friend.age !== self.age) b.giveArmor(friend, n);
    },
  },

  // Modern: Industry
  {
    id: "worker",
    age: "modern",
    slot: "front",
    names: ["Factory Worker", "Foreman", "Industrialist"],
    attack: 2,
    health: 5,
    trigger: "startOfRound",
    text: (n) => `Start of round: stock the shop with a copy of the friend behind. It costs ${3 - n} gold.`,
    shop: (s, self, n) => {
      const behind = s.behind(self);
      if (behind) s.stock(behind.def, 3 - n);
    },
  },
  {
    id: "banker",
    age: "modern",
    slot: "back",
    names: ["Clerk", "Banker", "Tycoon"],
    attack: 2,
    health: 2,
    trigger: "startOfRound",
    text: (n) => `Start of round: gain ${n} gold.`,
    shop: (s, _self, n) => s.gainGold(n),
  },
  {
    id: "salesman",
    age: "modern",
    slot: "bridge",
    names: ["Salesman", "Merchant", "Magnate"],
    attack: 1,
    health: 3,
    trigger: "friendBought",
    text: (n) => `Buy a Unit from a different Age: give it +${n}/+${n}.`,
    shop: (s, self, n, bought) => {
      if (bought && s.ageOf(bought) !== s.ageOf(self)) s.buff(bought, n, n);
    },
  },

  // Sci-Fi: Rule-breaking
  {
    id: "cyborg",
    age: "scifi",
    slot: "front",
    names: ["Cyborg", "Battle Mech", "Titan Mech"],
    attack: 6,
    health: 9,
    trigger: "knockOut",
    text: (n) => `Knock out: deal ${4 * n} damage to the first enemy.`,
    battle: (b, self, n) => {
      const target = b.frontEnemy(self);
      if (target) b.damage(target, 4 * n, self);
    },
  },
  {
    id: "aicore",
    age: "scifi",
    slot: "back",
    names: ["AI Core", "Superintelligence", "Singularity"],
    attack: 1,
    health: 2,
    trigger: "startOfBattle",
    text: (n) => `Start of battle: copy the ability of the friend ahead, at Stage ${n}.`,
    battle: (b, self) => {
      const ahead = b.ahead(self);
      if (ahead) b.copyAbility(self, ahead);
    },
  },
  {
    id: "timetraveler",
    age: "scifi",
    slot: "bridge",
    names: ["Time Traveler", "Chrononaut", "Time Lord"],
    attack: 2,
    health: 2,
    trigger: "startOfBattle",
    text: (n) => `Start of battle: gain +${n}/+${n} for every friend from a different Age.`,
    battle: (b, self, n) => {
      const others = b.friends(self).filter((f) => f.age !== self.age).length;
      b.buff(self, others * n, others * n);
    },
  },

  // Tokens
  {
    id: "cousin",
    age: "stone",
    slot: "front",
    names: ["Cousin", "Cousin", "Cousin"],
    attack: 1,
    health: 1,
    trigger: "none",
    token: true,
    text: () => "",
  },
];

export const INVENTIONS: InventionDef[] = [
  {
    id: "fire",
    age: "stone",
    name: "Fire",
    targeted: true,
    text: "Give a Unit +1/+1.",
    apply: (s, target) => target && s.buff(target, 1, 1),
  },
  {
    id: "beer",
    age: "bronze",
    name: "Beer",
    targeted: true,
    text: "Give a Unit +3/+3 until end of battle.",
    apply: (_s, target) => {
      if (!target) return;
      target.tempAttack += 3;
      target.tempHealth += 3;
    },
  },
  {
    id: "roads",
    age: "iron",
    name: "Roads",
    targeted: false,
    text: "Give 2 random Units +1/+1.",
    apply: (s) => {
      const first = s.pick(s.line);
      const second = s.pick(s.line.filter((u) => u !== first));
      for (const unit of [first, second]) if (unit) s.buff(unit, 1, 1);
    },
  },
  {
    id: "canned",
    age: "modern",
    name: "Canned Food",
    targeted: false,
    text: "Give all current and future shop Units +1/+1.",
    apply: (s) => s.addShopBuff(1, 1),
  },
  {
    id: "gene",
    age: "scifi",
    name: "Gene Editing",
    targeted: true,
    text: "Give a Unit +1 experience.",
    apply: (s, target) => target && s.addExp(target, 1),
  },
];

export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));
export const INVENTION_BY_ID = new Map(INVENTIONS.map((i) => [i.id, i]));

export function unitDef(id: string): UnitDef {
  const def = UNIT_BY_ID.get(id);
  if (!def) throw new Error(`Unknown Unit ${id}`);
  return def;
}

export function inventionDef(id: string): InventionDef {
  const def = INVENTION_BY_ID.get(id);
  if (!def) throw new Error(`Unknown Invention ${id}`);
  return def;
}
