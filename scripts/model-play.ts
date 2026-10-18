// Test 2.5 from docs/hook-test.md: a model player (OpenAI Decisions API) plays Runs against saved Ghosts.
// It is told only to win, never about mixing Ages. Needs OPENAI_API_KEY in the environment.
//   npm run model-play [runs] [seed]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRng } from "../simulation/rng";
import { inventionDef, unitDef } from "../simulation/roster";
import { act, legalActions, newRun, resolveBattle, type Action, type Run } from "../simulation/run";
import { AGE_NAMES, AGES } from "../simulation/types";
import { latestAgeIndex, stageOf, unitName } from "../simulation/units";
import { formatEvents, formatLine } from "./format";
import { ghostFor, loadGhosts } from "./ghosts";

const MODEL = "gpt-6-luna";
const MAX_ACTIONS_PER_ROUND = 25;

const RULES = `You are playing Auto Evolution, an auto-battler like Super Auto Pets. Win 10 battles before you lose 5 lives.
Each Round you get 10 gold to spend in the shop, then your Line of up to 5 Units fights another player's saved Line automatically.
Units cost 3 gold, Inventions 3 gold, a reroll 1 gold. Unspent gold is lost when the shop phase ends.
Buying a copy of a Unit you own merges it: +1/+1 and experience. 3 copies make Stage 2, 6 copies Stage 3; abilities get stronger by Stage.
Selling refunds 1 gold per Stage. Slot 1 is the front of the Line; the two front Units hit each other at the same time until one side is empty.
Battle damage and Armor reset after each battle; bought stats are permanent. A new historical Age unlocks every 2 Rounds: Stone, Bronze, Iron, Modern, Sci-Fi.`;

const runs = Number(process.argv[2] ?? 3);
const seed = Number(process.argv[3] ?? 1);
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
const ghosts = loadGhosts();
mkdirSync("out/model", { recursive: true });

const results = await Promise.all(Array.from({ length: runs }, (_, i) => playRun(seed + i)));
console.log("\nSummary");
for (const r of results) console.log(`  seed ${r.seed}: ${r.phase} with ${r.wins} wins, ${r.lives} lives after ${r.rounds} Rounds, ${r.calls} decisions`);

async function playRun(runSeed: number) {
  const rng = createRng(runSeed);
  const log: string[] = [];
  let run = newRun(runSeed);
  let calls = 0;
  while (run.phase === "shop") {
    log.push(`— Round ${run.round} · ${run.lives} lives · ${run.wins} wins`);
    for (let i = 0; i < MAX_ACTIONS_PER_ROUND && run.phase === "shop"; i++) {
      const actions = legalActions(run);
      const choice = await decide(run, actions);
      calls++;
      const action = actions[choice.index]!;
      log.push(`  ${describe(run, action)}  (confidence ${choice.confidence.toFixed(2)})`);
      run = act(run, action);
    }
    if (run.phase === "shop") run = act(run, { type: "endShop" });
    const ghost = ghostFor(ghosts, run.round, rng);
    log.push(`  line: ${formatLine(run.line)}`, `  vs ${ghost.personality} Ghost: ${formatLine(ghost.line)}`);
    const fought = resolveBattle(run, ghost.line);
    log.push(...formatEvents(fought.result.events).filter((l) => l.startsWith("  →")));
    run = fought.run;
    console.log(`seed ${runSeed} Round ${run.round - (run.phase === "shop" ? 1 : 0)}: ${fought.result.outcome} (${run.wins} wins, ${run.lives} lives)`);
  }
  log.push(`Run ${run.phase} with ${run.wins} wins and ${run.lives} lives after ${run.round} Rounds`);
  writeFileSync(`out/model/run-${runSeed}.log`, log.join("\n"));
  return { seed: runSeed, phase: run.phase, wins: run.wins, lives: run.lives, rounds: run.round, calls };
}

async function decide(run: Run, actions: Action[]): Promise<{ index: number; confidence: number }> {
  const body = {
    model: MODEL,
    input: `${RULES}\n\n${describeState(run)}`,
    questions: [
      {
        type: "choice",
        name: "action",
        instructions: "Which shop action gives you the best chance of winning this Run? Choose end_shop when you are done for this Round.",
        choices: actions.map((a, i) => ({ value: a.type === "endShop" ? "end_shop" : `a${i}`, description: describe(run, a) })),
      },
    ],
  };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/decisions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = (await res.json()) as { answers: { type: string; choice?: string; confidence?: number }[] };
      const answer = json.answers[0];
      if (answer?.type !== "choice" || !answer.choice) return { index: actions.length - 1, confidence: 0 };
      const index = answer.choice === "end_shop" ? actions.findIndex((a) => a.type === "endShop") : Number(answer.choice.slice(1));
      return { index, confidence: answer.confidence ?? 0 };
    }
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`Decisions API ${res.status}: ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}

function describeState(run: Run): string {
  const lines = [
    `Round ${run.round}. Latest Age: ${AGE_NAMES[AGES[latestAgeIndex(run.round)]!]}. Gold ${run.gold}. Lives ${run.lives}. Wins ${run.wins}/10. Rerolls this Round ${run.rerolls}.`,
    "Your Line (slot 1 is the front):",
    ...run.line.map((u, i) => {
      if (!u) return `  slot ${i + 1}: empty`;
      const def = unitDef(u.def);
      const stage = stageOf(u.exp);
      return `  slot ${i + 1}: ${unitName(u)} (${AGE_NAMES[def.age]} Age, Stage ${stage}, exp ${u.exp}/5) ${u.attack + u.tempAttack}/${u.health + u.tempHealth}. ${def.text(stage)}`;
    }),
    "Shop Units:",
    ...run.shopUnits.map((s, i) => {
      const def = unitDef(s.def);
      return `  unit ${i + 1}: ${def.names[0]} (${AGE_NAMES[def.age]} Age) ${s.attack}/${s.health}, ${s.price} gold${s.frozen ? ", frozen" : ""}. ${def.text(1)}`;
    }),
    "Shop Inventions:",
    ...run.shopInventions.map((s, i) => `  invention ${i + 1}: ${inventionDef(s.def).name}, ${s.price} gold${s.frozen ? ", frozen" : ""}. ${inventionDef(s.def).text}`),
  ];
  return lines.join("\n");
}

function describe(run: Run, a: Action): string {
  const unitAt = (slot: number) => {
    const u = run.line[slot];
    return u ? `${unitName(u)} in slot ${slot + 1}` : `empty slot ${slot + 1}`;
  };
  switch (a.type) {
    case "buy": {
      const offer = run.shopUnits[a.shop]!;
      const name = unitDef(offer.def).names[0];
      return run.line[a.slot] ? `Buy ${name} (unit ${a.shop + 1}, ${offer.price} gold) and merge it into ${unitAt(a.slot)}` : `Buy ${name} (unit ${a.shop + 1}, ${offer.price} gold) into ${unitAt(a.slot)}`;
    }
    case "useInvention": {
      const inv = inventionDef(run.shopInventions[a.shop]!.def);
      return a.slot === undefined ? `Use ${inv.name} (invention ${a.shop + 1})` : `Use ${inv.name} (invention ${a.shop + 1}) on ${unitAt(a.slot)}`;
    }
    case "sell": return `Sell ${unitAt(a.slot)} for ${stageOf(run.line[a.slot]!.exp)} gold`;
    case "merge": return `Merge ${unitAt(a.from)} into ${unitAt(a.to)}`;
    case "swap": return `Swap ${unitAt(a.a)} and ${unitAt(a.b)}`;
    case "reroll": return "Reroll the shop for 1 gold";
    case "freeze": {
      const offer = a.kind === "unit" ? run.shopUnits[a.shop] : run.shopInventions[a.shop];
      const name = a.kind === "unit" ? unitDef(offer!.def).names[0] : inventionDef(offer!.def).name;
      return `${offer!.frozen ? "Unfreeze" : "Freeze"} ${name} in the shop`;
    }
    case "endShop": return run.gold > 0 ? `End the shop phase and fight (your remaining ${run.gold} gold is lost)` : "End the shop phase and fight";
  }
}
