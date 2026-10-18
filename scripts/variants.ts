// Balance variants for experiments. Each one changes the rules in place and returns a function that restores them.
import { UNITS, unitDef } from "../simulation/roster";
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
];
