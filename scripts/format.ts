import type { BattleEvent } from "../simulation/battle";
import { inventionDef, unitDef } from "../simulation/roster";
import type { Run } from "../simulation/run";
import { AGE_NAMES, type Line } from "../simulation/types";
import { unitName } from "../simulation/units";

export function formatLine(line: Line): string {
  return line
    .map((u) => (u ? `${unitName(u)}[${AGE_NAMES[unitDef(u.def).age]}] ${u.attack + u.tempAttack}/${u.health + u.tempHealth}` : "·"))
    .join(" | ");
}

export function formatShop(run: Run): string {
  const units = run.shopUnits.map((s, i) => `u${i}:${unitDef(s.def).names[0]}[${AGE_NAMES[unitDef(s.def).age]}] ${s.attack}/${s.health} ${s.price}g${s.frozen ? "❄" : ""}`);
  const inventions = run.shopInventions.map((s, i) => `i${i}:${inventionDef(s.def).name} ${s.price}g${s.frozen ? "❄" : ""}`);
  return [...units, ...inventions].join("  ");
}

export function formatEvents(events: BattleEvent[]): string[] {
  return events.flatMap((e) => {
    switch (e.type) {
      case "start": return [];
      case "attack": return `  ${e.label}`;
      case "hurt": return `    ${e.label} takes ${e.damage}${e.absorbed ? ` (${e.absorbed} absorbed)` : ""}`;
      case "ability": return `    ✨ ${e.label}: ${e.text}`;
      case "armor": return `    🛡 ${e.label} +${e.amount} Armor`;
      case "buff": return `    ⬆ ${e.label} +${e.attack}/+${e.health}`;
      case "copy": return `    🧠 ${e.label} copies ${e.copied}`;
      case "faint": return `    💀 ${e.label} faints`;
      case "summon": return `    👶 ${e.label} summoned`;
      case "end": return `  → ${e.outcome.toUpperCase()}`;
    }
  });
}
