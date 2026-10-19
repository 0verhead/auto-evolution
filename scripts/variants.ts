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
    description: `Units from an Age two or more behind the latest appear at ${weight}× the usual rate`,
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

const both: Variant = {
  name: "both",
  description: "old-ages-0.5 and weaker-stone together",
  apply: () => {
    const undo = [rareOldAges(0.5).apply(), weakerStone.apply()];
    return () => undo.forEach((f) => f());
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

/** Sci-Fi is the last Age, as tier 6 is SAP's, so it takes tier-6 Counterparts: Gorilla, Tiger (also copies the friend ahead) and Fly. */
const scifiTier6 = stats("scifi-tier6", "Sci-Fi takes SAP tier-6 Counterparts: Cyborg 7/10, AI Core 6/4, Time Traveler 4/4", {
  cyborg: [7, 10],
  aicore: [6, 4],
  timetraveler: [4, 4],
});

// Later Ages take Counterparts from higher SAP tiers; stats still come from SAP pets (docs/roster.md lists the originals).
const MODERN_TIER5: Record<string, [number, number]> = { worker: [4, 6], banker: [3, 4], salesman: [3, 8] }; // Cow, Turkey, Seal
const SCIFI_TIER6: Record<string, [number, number]> = { cyborg: [7, 10], aicore: [6, 4], timetraveler: [4, 4] }; // Gorilla, Tiger, Fly
const IRON_TIER4: Record<string, [number, number]> = { legionary: [3, 6], shieldbearer: [2, 5], recruiter: [1, 3] }; // Blowfish, Turtle, Penguin
const sapShift = stats("sap-shift", "Modern takes SAP tier-5 and Sci-Fi tier-6 Counterparts", { ...MODERN_TIER5, ...SCIFI_TIER6 });
const sapShiftFull = stats("sap-shift-full", "Iron takes SAP tier-4, Modern tier-5 and Sci-Fi tier-6 Counterparts (tiers 1, 2, 4, 5, 6)", {
  ...IRON_TIER4,
  ...MODERN_TIER5,
  ...SCIFI_TIER6,
});

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

function combined(name: string, parts: Variant[]): Variant {
  return {
    name,
    description: parts.map((p) => p.name).join(" + "),
    apply: () => {
      const undo = parts.map((p) => p.apply());
      return () => undo.reverse().forEach((f) => f());
    },
  };
}

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

/** The Tribe Mother takes her Counterpart's effect (SAP's Ant), keeping the Bridge filter: her last gift goes to the stranger. */
const antGatherer: Variant = {
  name: "ant-gatherer",
  description: "Tribe Mother: Faint: give a random friend from a different Age +2/+1 (+4/+2, +6/+3), as SAP's Ant",
  apply: () => {
    const d = unitDef("gatherer");
    const saved = { trigger: d.trigger, text: d.text, battle: d.battle, usesPerBattle: d.usesPerBattle };
    Object.assign(d, {
      trigger: "faint",
      usesPerBattle: undefined,
      text: (n: number) => `Faint: give a random friend from a different Age +${2 * n}/+${n}.`,
      battle: ((b, self, n) => {
        const target = b.pick(b.friends(self).filter((f) => f.age !== self.age));
        if (target) b.buff(target, 2 * n, n);
      }) satisfies UnitDef["battle"],
    });
    return () => Object.assign(d, saved);
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
  both,
  patienceEveryOther,
  patienceCapped,
  patienceFlat,
  strongerBridges("bridges-x2", BRIDGES, 2),
  strongerBridges("bridges-x3", BRIDGES, 3),
  strongerBridges("time-traveler-x2", ["timetraveler"], 2),
  storyBridges,
  scifiTier6,
  steeperCurve,
  combined("scifi-tier6+old-0.25", [scifiTier6, rareOldAges(0.25)]),
  combined("steeper+old-0.25", [steeperCurve, rareOldAges(0.25)]),
  combined("steeper+old-0.25+weak-stone", [steeperCurve, rareOldAges(0.25), weakerStone]),
  combined("steepest+old-0.25", [steepestCurve, rareOldAges(0.25)]),
  combined("sap-shift+old-0.5", [sapShift, rareOldAges(0.5)]),
  combined("sap-shift+old-0.25", [sapShift, rareOldAges(0.25)]),
  combined("sap-shift-full+old-0.5", [sapShiftFull, rareOldAges(0.5)]),
  combined("sap-shift-full+old-0.25", [sapShiftFull, rareOldAges(0.25)]),
  antGatherer,
  combined("ant+sap-shift+old-0.5", [antGatherer, sapShift, rareOldAges(0.5)]),
  combined("ant+sap-shift-full+old-0.5", [antGatherer, sapShiftFull, rareOldAges(0.5)]),
  combined("ant+sap-shift-full+old-0.25", [antGatherer, sapShiftFull, rareOldAges(0.25)]),
  biggerRoster(3),
  combined("roster-x3+sap-shift-full", [biggerRoster(3), sapShiftFull]),
  combined("roster-x3+ant+sap-shift-full", [biggerRoster(3), antGatherer, sapShiftFull]),
];
