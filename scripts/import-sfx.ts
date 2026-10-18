// Copies the game's sound effects from Kenney's CC0 packs (Interface Sounds, Impact Sounds, RPG Audio) into
// game/public/sfx as Ogg and m4a (iOS Safari can't play Ogg). Download and unzip the packs first.
//   npm run sfx -- <folder holding the unzipped kenney_* packs>
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Game sound → Kenney file. */
const SOUNDS: Record<string, string> = {
  select: "select_001",
  buy: "handleCoins2",
  sell: "handleCoins",
  merge: "pluck_001",
  evolve: "impactBell_heavy_002",
  reroll: "bookFlip1",
  freeze: "glass_002",
  error: "error_004",
  fight: "drawKnife1",
  eureka: "impactBell_heavy_000",
  "attack-1": "impactPunch_medium_000",
  "attack-2": "impactPunch_medium_001",
  "attack-3": "impactPunch_medium_002",
  block: "impactMetal_light_000",
  armor: "metalLatch",
  faint: "impactWood_heavy_000",
  summon: "open_002",
  buff: "maximize_003",
  ability: "tick_002",
  victory: "confirmation_004",
  defeat: "minimize_008",
  draw: "back_004",
};

const source = process.argv[2];
if (!source) throw new Error("Pass the folder holding the unzipped kenney_* packs");
const files = new Map<string, string>();
(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".ogg")) files.set(name.slice(0, -4), path);
  }
})(source);

const out = "game/public/sfx";
mkdirSync(out, { recursive: true });
for (const [sound, kenney] of Object.entries(SOUNDS)) {
  const from = files.get(kenney);
  if (!from) throw new Error(`${kenney}.ogg not found in ${source}`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", from, "-c:a", "libvorbis", "-q:a", "4", join(out, `${sound}.ogg`)]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", from, "-c:a", "aac", "-b:a", "96k", join(out, `${sound}.m4a`)]);
  console.log(`  ✓ ${sound} ← ${kenney}`);
}
writeFileSync(
  join(out, "CREDITS.md"),
  `# Sound credits\n\nAll sound effects are by Kenney (www.kenney.nl), from Interface Sounds, Impact Sounds and RPG Audio, licensed CC0 (public domain). Credit is not required.\n\n${Object.entries(SOUNDS).map(([s, k]) => `- ${s}: ${k}`).join("\n")}\n`,
);
