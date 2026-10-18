// Plays one bot Run against saved Ghosts and prints every shop phase and battle: npm run play [purist|mixer] [seed]
import { playShop, MIXER, PURIST } from "../simulation/bot";
import { createRng } from "../simulation/rng";
import { newRun, resolveBattle } from "../simulation/run";
import { formatEvents, formatLine, formatShop } from "./format";
import { ghostFor, loadGhosts } from "./ghosts";

const personality = process.argv[2] === "purist" ? PURIST : MIXER;
const seed = Number(process.argv[3] ?? 7);
const ghosts = loadGhosts();
const rng = createRng(seed);
let run = newRun(seed);
console.log(`${personality.name} Run, seed ${seed}\n`);
while (run.phase === "shop") {
  console.log(`— Round ${run.round} · ${run.gold} gold · ${run.lives} lives · ${run.wins} wins`);
  console.log(`  shop: ${formatShop(run)}`);
  run = playShop(run, personality);
  console.log(`  line: ${formatLine(run.line)}`);
  const ghost = ghostFor(ghosts, run.round, rng);
  console.log(`  vs ${ghost.personality} Ghost: ${formatLine(ghost.line)}`);
  const fought = resolveBattle(run, ghost.line);
  for (const line of formatEvents(fought.result.events)) console.log(line);
  run = fought.run;
}
console.log(`\nRun ${run.phase} with ${run.wins} wins and ${run.lives} lives after ${run.round} Rounds`);
