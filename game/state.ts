// The player's Run, the Ghosts they fight and saving between visits.
import { MIXER, PURIST } from "../simulation/bot";
import { league } from "../simulation/league";
import { createRng, pick } from "../simulation/rng";
import { newRun, type Run } from "../simulation/run";
import type { Line } from "../simulation/types";

const SAVE_KEY = "auto-evolution.run";
/** Bot Runs played at start-up to fill the Ghost pool until real players' Ghosts exist (ADR 0003). */
const GHOST_RUNS = 200;

let ghosts: Map<number, Line[]> | null = null;

export function buildGhosts(seed: number): void {
  ghosts = new Map();
  for (const g of league([PURIST, MIXER], GHOST_RUNS, seed).ghosts) ghosts.set(g.round, [...(ghosts.get(g.round) ?? []), g.line]);
}

/** A Ghost from the same Round; past the last Round any bot reached, the last one. */
export function ghostFor(run: Run, seed: number): Line {
  if (!ghosts) throw new Error("Ghosts not built yet");
  const last = Math.max(...ghosts.keys());
  return pick(createRng(seed * 31 + run.round), ghosts.get(Math.min(run.round, last))!)!;
}

export interface Saved {
  run: Run;
  seed: number;
}

/** `?seed=123` starts a reproducible Run, for testers comparing notes. */
export function startRun(): Saved {
  const fromUrl = Number(new URLSearchParams(location.search).get("seed"));
  const seed = Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Math.floor(Math.random() * 0xffffffff);
  const saved = { run: newRun(seed), seed };
  save(saved);
  return saved;
}

export function load(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return saved.run.phase === "shop" ? saved : null;
  } catch {
    return null;
  }
}

export function save(saved: Saved): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    // Saving is a convenience; the Run continues without it.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
