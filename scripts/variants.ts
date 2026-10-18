// Balance variants for experiments. Each one changes the rules in place and returns a function that restores them.
import { UNITS, UNIT_BY_ID, unitDef } from "../simulation/roster";
import type { UnitDef } from "../simulation/types";
import { shopRules } from "../simulation/run";

export interface Variant {
  name: string;
  description: string;
  apply(): () => void;
}

function rareOldAges(weight: number): Variant {
  return {
    name: `old-ages-${weight}`,
    description: `Units from an Age two or more behind the latest appear at ${weight}× the rate of newer ones`,
    apply: () => {
      const before = shopRules.oldAgeWeight;
      shopRules.oldAgeWeight = weight;
      return () => {
        shopRules.oldAgeWeight = before;
      };
    },
  };
}

const weakerStone: Variant = {
  name: "weaker-stone",
  description: "Each Stone Unit loses 1 from its higher stat (Caveman 1/2, Drummer 1/1, Gatherer 2/1)",
  apply: () => {
    const before = UNITS.filter((u) => u.age === "stone" && !u.token).map((u) => ({ u, attack: u.attack, health: u.health }));
    for (const { u } of before) {
      if (u.attack > u.health) u.attack--;
      else u.health--;
    }
    return () => {
      for (const b of before) {
        b.u.attack = b.attack;
        b.u.health = b.health;
      }
    };
  },
};

/** Replaces the End of round ability of the three Bronze Units, restoring the originals afterwards. */
function patience(name: string, description: string, wrap: (original: NonNullable<UnitDef["shop"]>, def: UnitDef) => UnitDef["shop"]): Variant {
  return {
    name,
    description,
    apply: () => {
      const defs = ["builder", "scribe", "pharaoh"].map(unitDef);
      const originals = defs.map((d) => d.shop!);
      defs.forEach((d, i) => (d.shop = wrap(originals[i]!, d)));
      return () => defs.forEach((d, i) => (d.shop = originals[i]));
    },
  };
}

const PATIENCE_CAP = 10;

const patienceEveryOther = patience("patience-every-2nd", "Bronze End of round abilities only trigger in even Rounds", (original) => (s, self, n, subject) => {
  if (s.round % 2 === 0) original(s, self, n, subject);
});

const patienceCapped = patience("patience-cap-10", `Each Bronze Unit gives at most +${PATIENCE_CAP} in total through its End of round ability`, (original) => (s, self, n, subject) => {
  const left = PATIENCE_CAP - (self.grown ?? 0);
  if (left <= 0) return;
  const amount = Math.min(n, left) as typeof n;
  self.grown = (self.grown ?? 0) + amount;
  original(s, self, amount, subject);
});

const patienceFlat = patience("patience-flat", "Bronze End of round abilities give +1 at every Stage instead of +1 / +2 / +3", (original) => (s, self, _n, subject) => original(s, self, 1, subject));

const BRIDGES = ["gatherer", "pharaoh", "recruiter", "salesman", "timetraveler"];

/** Multiplies a Bridge Unit's effect by running its ability as if its Stage were `factor` times higher. */
function strongerBridges(name: string, ids: string[], factor: number): Variant {
  return {
    name,
    description: `${ids.length === BRIDGES.length ? "Every Bridge Unit's" : ids.map((id) => unitDef(id).names[0]).join(", ") + "'s"} effect ×${factor}`,
    apply: () => {
      const defs = ids.map(unitDef);
      const originals = defs.map((d) => ({ battle: d.battle, shop: d.shop }));
      for (const d of defs) {
        const { battle, shop } = d;
        if (battle) d.battle = (b, self, n, subject) => battle(b, self, (n * factor) as typeof n, subject);
        if (shop) d.shop = (api, self, n, subject) => shop(api, self, (n * factor) as typeof n, subject);
      }
      return () => defs.forEach((d, i) => Object.assign(d, originals[i]));
    },
  };
}

/** Sets base stats for some Units, restoring them afterwards. */
function stats(name: string, description: string, changes: Record<string, [number, number]>): Variant {
  return {
    name,
    description,
    apply: () => {
      const before = Object.keys(changes).map((id) => ({ d: unitDef(id), attack: unitDef(id).attack, health: unitDef(id).health }));
      for (const { d } of before) [d.attack, d.health] = changes[d.id]!;
      return () => before.forEach((b) => ([b.d.attack, b.d.health] = [b.attack, b.health]));
    },
  };
}

function curve(name: string, extra: Record<string, number>): Variant {
  const text = Object.entries(extra).map(([age, n]) => `${age} +${n}/+${n}`).join(", ");
  return stats(
    name,
    `Later Ages gain more base stats: ${text}`,
    Object.fromEntries(UNITS.filter((u) => !u.token && extra[u.age]).map((u) => [u.id, [u.attack + extra[u.age]!, u.health + extra[u.age]!]])),
  );
}

const steeperCurve = curve("steeper-curve", { iron: 1, modern: 2, scifi: 3 });
const steepestCurve = curve("steepest-curve", { iron: 1, modern: 3, scifi: 5 });

type Ability = Pick<UnitDef, "names" | "trigger" | "text" | "battle" | "shop">;

/** Bridges that pair with one specific Age through a story, with the effect following from the story. */
const STORY_BRIDGES: Record<string, Ability> = {
  // Rome took "barbarian" tribes into its army as auxiliaries.
  recruiter: {
    names: ["Recruiter", "Drillmaster", "General"],
    trigger: "startOfBattle",
    text: (n) => `Start of battle: give every Stone friend ${2 * n} Armor.`,
    battle: (b, self, n) => {
      for (const friend of b.friends(self)) if (friend.age === "stone") b.giveArmor(friend, 2 * n);
    },
  },
  // Tourists pay to see the pyramids.
  salesman: {
    names: ["Tourist", "Tour Guide", "Tour Operator"],
    trigger: "startOfRound",
    text: (n) => `Start of round: gain ${n} gold for every Bronze friend.`,
    shop: (s, self, n) => s.gainGold(n * s.friends(self).filter((f) => s.ageOf(f) === "bronze").length),
  },
  // "Aliens built the pyramids": the pharaoh honours the visitors from the stars.
  pharaoh: {
    names: ["Chieftain", "Priest-King", "Pharaoh"],
    trigger: "endOfRound",
    text: (n) => `End of round: give every Sci-Fi friend +${n}/+${n}.`,
    shop: (s, self, n) => {
      for (const friend of s.friends(self)) if (s.ageOf(friend) === "scifi") s.buff(friend, n, n);
    },
  },
  // The time traveler hands a caveman a laser gun.
  timetraveler: {
    names: ["Time Traveler", "Chrononaut", "Time Lord"],
    trigger: "startOfBattle",
    text: (n) => `Start of battle: give the front Stone friend +${4 * n} attack.`,
    battle: (b, self, n) => {
      const caveman = b.friends(self).find((f) => f.age === "stone");
      if (caveman) b.buff(caveman, 4 * n, 0);
    },
  },
};

/**
 * Simulates a bigger roster without new content: every shop Unit exists `copies` times under different ids.
 * They are identical, but only the same copy merges, so duplicates become as rare as in a roster that many times larger
 * (SAP's Turtle Pack has 10 pets per tier; v1 has 3 Units per Age).
 */
function biggerRoster(copies: number): Variant {
  return {
    name: `roster-x${copies}`,
    description: `Every Unit exists ${copies} times, so duplicates are as rare as with ${3 * copies} Units per Age`,
    apply: () => {
      const clones = UNITS.filter((u) => !u.token).flatMap((u) => Array.from({ length: copies - 1 }, (_, i) => ({ ...u, id: `${u.id}#${i + 2}` })));
      UNITS.push(...clones);
      for (const c of clones) UNIT_BY_ID.set(c.id, c);
      return () => {
        UNITS.splice(UNITS.length - clones.length, clones.length);
        for (const c of clones) UNIT_BY_ID.delete(c.id);
      };
    },
  };
}

/** Later Ages take SAP's late-game effects, which scale or affect the whole team. */
const SAP_LATE_EFFECTS: Record<string, Ability> = {
  // SAP's Monkey (tier 5): the factory supplies the front line.
  worker: {
    names: ["Factory Worker", "Foreman", "Industrialist"],
    trigger: "endOfRound",
    text: (n) => `End of round: give the front friend +${2 * n}/+${3 * n}.`,
    shop: (s, self, n) => {
      const front = s.friends(self)[0];
      if (front) s.buff(front, 2 * n, 3 * n);
    },
  },
  // SAP's Mammoth (tier 6), with the Bridge filter: his last act brings future technology to everyone from the past.
  timetraveler: {
    names: ["Time Traveler", "Chrononaut", "Time Lord"],
    trigger: "faint",
    text: (n) => `Faint: give every friend from a different Age +${2 * n}/+${2 * n}.`,
    battle: (b, self, n) => {
      for (const friend of b.friends(self)) if (friend.age !== self.age) b.buff(friend, 2 * n, 2 * n);
    },
  },
};

const sapLateEffects: Variant = {
  name: "sap-late-effects",
  description: "Factory Worker takes SAP's Monkey (End of round: front friend +2/+3), Time Traveler SAP's Mammoth (Faint: every friend from a different Age +2/+2)",
  apply: () => {
    const before = Object.keys(SAP_LATE_EFFECTS).map((id) => {
      const d = unitDef(id);
      return { d, saved: { names: d.names, trigger: d.trigger, text: d.text, battle: d.battle, shop: d.shop } };
    });
    for (const { d } of before) Object.assign(d, { battle: undefined, shop: undefined }, SAP_LATE_EFFECTS[d.id]);
    return () => before.forEach(({ d, saved }) => Object.assign(d, saved));
  },
};

const storyBridges: Variant = {
  name: "story-bridges",
  description: "Recruiter → Stone (barbarian auxiliaries), Tourist → Bronze (pyramid tourism), Pharaoh → Sci-Fi (aliens built the pyramids), Time Traveler → Stone (a laser for the caveman)",
  apply: () => {
    const before = Object.keys(STORY_BRIDGES).map((id) => {
      const d = unitDef(id);
      return { d, saved: { names: d.names, trigger: d.trigger, text: d.text, battle: d.battle, shop: d.shop } };
    });
    for (const { d } of before) Object.assign(d, { battle: undefined, shop: undefined }, STORY_BRIDGES[d.id]);
    return () => before.forEach(({ d, saved }) => Object.assign(d, saved));
  },
};

export const VARIANTS: Variant[] = [
  { name: "baseline", description: "Rules as in docs/roster.md", apply: () => () => {} },
  rareOldAges(0.5),
  rareOldAges(0.25),
  weakerStone,
  patienceEveryOther,
  patienceCapped,
  patienceFlat,
  strongerBridges("bridges-x2", BRIDGES, 2),
  strongerBridges("bridges-x3", BRIDGES, 3),
  storyBridges,
  steeperCurve,
  steepestCurve,
  biggerRoster(3),
  sapLateEffects,
];
