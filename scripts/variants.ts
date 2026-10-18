// Balance variants for experiments. Each one changes the rules in place and returns a function that restores them.
import { UNITS } from "../simulation/roster";
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

export const VARIANTS: Variant[] = [
  { name: "baseline", description: "Rules as in docs/roster.md", apply: () => () => {} },
  rareOldAges(0.5),
  rareOldAges(0.25),
  weakerStone,
  both,
];
