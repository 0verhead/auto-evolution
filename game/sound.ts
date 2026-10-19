// Sound effects (Kenney, CC0; see public/sfx/CREDITS.md). Music is not part of the game yet.
import * as Phaser from "phaser";

export type Sfx =
  | "select" | "buy" | "sell" | "merge" | "evolve" | "reroll" | "freeze" | "error" | "fight" | "eureka"
  | "attack" | "block" | "armor" | "faint" | "summon" | "buff" | "ability" | "victory" | "defeat" | "draw";

const FILES = ["select", "buy", "sell", "merge", "evolve", "reroll", "freeze", "error", "fight", "eureka", "attack-1", "attack-2", "attack-3", "block", "armor", "faint", "summon", "buff", "ability", "victory", "defeat", "draw"];
const VOLUME: Partial<Record<Sfx, number>> = { ability: 0.4, select: 0.5, attack: 0.7, eureka: 0.8 };
const MUTE_KEY = "auto-evolution.muted";

export function loadSounds(scene: Phaser.Scene): void {
  for (const f of FILES) scene.load.audio(f, [`sfx/${f}.ogg`, `sfx/${f}.m4a`]);
}

export function play(scene: Phaser.Scene, sfx: Sfx, rate = 1): void {
  if (muted()) return;
  // Hits vary between three recordings so a long battle doesn't sound mechanical.
  const key = sfx === "attack" ? `attack-${1 + Math.floor(Math.random() * 3)}` : sfx;
  scene.sound.play(key, { volume: VOLUME[sfx] ?? 0.8, rate });
}

export function muted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function toggleMuted(): boolean {
  const next = !muted();
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // The setting just won't be remembered.
  }
  return next;
}
