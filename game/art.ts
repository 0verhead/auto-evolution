// Art keys (ADR: the game never references emoji directly). Each key is `${unit}.${stage}`, falling back to `${unit}`,
// so generated sprites can replace these emoji per Stage later without touching rules or Unit data.
import type { Age } from "../simulation/types";

const ART: Record<string, string> = {
  caveman: "🧔",
  drummer: "🥁",
  gatherer: "👵",
  builder: "🧱",
  scribe: "📜",
  pharaoh: "👑",
  legionary: "🛡️",
  shieldbearer: "🪖",
  recruiter: "🎖️",
  worker: "👷",
  banker: "🎩",
  salesman: "🧳",
  cyborg: "🦾",
  aicore: "🧠",
  timetraveler: "🛸",
  cousin: "🧒",
  fire: "🔥",
  beer: "🍺",
  roads: "🛣️",
  canned: "🥫",
  gene: "🧬",
};

export function art(id: string, stage = 1): string {
  return ART[`${id}.${stage}`] ?? ART[id] ?? "❔";
}

export const AGE_COLORS: Record<Age, number> = {
  stone: 0x9ca3af,
  bronze: 0xd97706,
  iron: 0x3b5bdb,
  modern: 0xdc2626,
  scifi: 0x06b6d4,
};

export const COLORS = {
  background: 0x14110f,
  panel: 0x231e1a,
  panelLight: 0x2f2822,
  text: "#f5efe6",
  muted: "#a8a29e",
  gold: "#facc15",
  attack: "#fb923c",
  health: "#f87171",
  armor: "#93c5fd",
  good: "#4ade80",
  selected: 0xfacc15,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
