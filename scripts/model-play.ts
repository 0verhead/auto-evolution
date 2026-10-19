// Test 2.5 from docs/hook-test.md: a model player (OpenAI Decisions API) plays Runs against saved Ghosts.
// It is told only to win, never about mixing Ages. Needs OPENAI_API_KEY in the environment.
//   npm run model-play [runs] [seed] [--preview] [--variant=name]
// --preview adds each action's estimated win rate against this Round's Ghosts to its description.
// --variant plays under a balance variant from scripts/variants.ts, against Ghosts saved for it by `npm run hook`.
import { mkdirSync, writeFileSync } from "node:fs";
import { battle } from "../simulation/battle";
import type { Ghost } from "../simulation/league";
import { createRng, sample, seedFrom } from "../simulation/rng";
import { UNITS, inventionDef, unitDef } from "../simulation/roster";
import { act, advancePrice, advanceRules, legalActions, newRun, prosperity, resolveBattle, shopRules, type Action, type Run } from "../simulation/run";
import { AGE_NAMES, AGES, type Line } from "../simulation/types";
import { stageOf, unitName } from "../simulation/units";
import { formatEvents, formatLine } from "./format";
import { ghostFor, loadGhosts } from "./ghosts";
import { VARIANTS } from "./variants";

const MODEL = "gpt-6-luna";
const MAX_ACTIONS_PER_ROUND = 25;
const SCOUTED_GHOSTS = 30;
const HISTORY_ROUNDS = 3;

/** The rules as the model reads them; built after the variant is applied, since variants change prices. */
const rules = () => `You are playing Auto Evolution, an auto-battler like Super Auto Pets. Win 10 battles before you lose 5 lives.

Run: each Round has a shop phase, then your Line fights another player's saved Line from the same Round automatically. A win adds 1 win, a loss costs 1 life, a draw changes nothing. If you lost any lives in Rounds 1–2 you get 1 back at the start of Round 3.

Shop: you get 10 gold each Round${advanceRules.prosperity > 0 ? `, plus ${advanceRules.prosperity} gold for every Round you have stayed in your current Age (at most +${advanceRules.maxProsperity}, back to +0 when you Advance)` : ""}, and unspent gold is lost when the shop phase ends. Units cost ${AGES.map((a, i) => `${shopRules.unitPriceByAge[i]} (${AGE_NAMES[a]})`).join(", ")} gold by their Age (some stocked Units cost less), Inventions cost 3 gold, a reroll costs 1 gold and replaces every Unit and Invention that is not frozen. Frozen offers stay for the next Round. The shop offers 3 Units (4 from Round 5, 5 from Round 9) and 1 Invention (2 from Round 3), drawn from your current Age and every Age before it.

Line: 5 slots, slot 1 is the front. To buy a new Unit you need an empty slot, so with a full Line you must sell a Unit first. Selling refunds 1 gold per Stage. Swapping is free.

Evolving: buying or merging a copy of a Unit you own gives it +1/+1 (from the higher stats of the two) and 1 experience. 3 copies make Stage 2, 6 copies make Stage 3, and every Stage-up adds a Unit from the Age after yours to the shop. Abilities get stronger by Stage.

Ages: Stone, Bronze, Iron, Modern, Sci-Fi. You start in the Stone Age and choose when to Advance to the next Age, at most once per Round. Advancing costs ${advanceRules.startPrice} gold in the Round you reach an Age and ${advanceRules.drop} gold less for every Round you stay (never below ${advanceRules.minPrice})${advanceRules.earliestRound.some((r) => r > 0) ? `, and an Age can't be reached before Round ${advanceRules.earliestRound.slice(1).join("/")} (Bronze/Iron/Modern/Sci-Fi)` : ""}. ${advanceRules.automatic ? " Once the price would reach " + advanceRules.minPrice + ", you Advance automatically at the start of that Round." : ""} When you Advance, every offer in the shop that is not frozen is replaced from the new, larger pool. Units of later Ages have higher base stats. Older Units stay in the shop. Your opponents are from the same Round but may be in any Age.

Battle: start-of-battle abilities trigger first, highest attack first. Then the two front Units hit each other at the same time, a Unit at 0 health faints and the Units behind move up, until one side is empty. Armor absorbs damage before health. Battle damage, Armor, summoned Cousins and "until end of battle" buffs vanish after the battle; stats gained in the shop are permanent.

Ability timing: "End of round" abilities trigger when you end the shop phase, before the battle. "Start of round" abilities trigger when the next shop opens. "Buy" abilities trigger when you buy a Unit.`;

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const preview = process.argv.includes("--preview");
const variantName = process.argv.find((a) => a.startsWith("--variant="))?.slice("--variant=".length) ?? "baseline";
const found = VARIANTS.find((v) => v.name === variantName);
if (!found) throw new Error(`Unknown variant ${variantName}`);
const variant = found;
variant.apply();
const runs = Number(args[0] ?? 3);
const seed = Number(args[1] ?? 1);
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
// Ghosts from the Advance test's bots, which reach their Ages at different Rounds; `npm run advance` saves them.
const ghosts = loadGhosts(`${variant.name}-advancers`, `npm run advance 1000 1 -- --only=${variant.name}`);
mkdirSync("out/model", { recursive: true });

interface Played {
  round: number;
  line: Line;
  ghost: Line;
  outcome: string;
}

const results = await Promise.all(Array.from({ length: runs }, (_, i) => playRun(seed + i)));
console.log(`\nSummary (${variant.name}, ${preview ? "with" : "without"} action previews)`);
for (const r of results) {
  console.log(`  seed ${r.seed}: ${r.phase} with ${r.wins} wins, ${r.lives} lives after ${r.rounds} Rounds, ${r.calls} decisions, ${r.sells} sells, ${r.wastedGold} gold left unspent`);
  console.log(`    reached ${r.reached.map((x) => `${AGE_NAMES[AGES[x.age]!]} in Round ${x.round} (${x.paid ? `paid ${x.paid}` : "by itself"})`).join(", ") || "no new Age"}`);
}
const late = results.flatMap((r) => r.history.filter((h) => h.round >= 10 && h.outcome === "win"));
const oldUnits = late.reduce((s, h) => s + h.line.filter((u) => u && ["stone", "bronze", "iron"].includes(unitDef(u.def).age)).length, 0);
const ages = late.reduce((s, h) => s + new Set(h.line.filter((u) => u !== null).map((u) => unitDef(u.def).age)).size, 0);
if (late.length > 0) {
  console.log(`  ${late.length} won battles from Round 10+: ${(oldUnits / late.length).toFixed(2)} Stone/Bronze/Iron Units and ${(ages / late.length).toFixed(2)} distinct Ages per Line`);
}
writeFileSync(`out/model/summary-${variant.name}-${preview ? "preview" : "plain"}-${seed}.json`, JSON.stringify(results, null, 2));

async function playRun(runSeed: number) {
  const rng = createRng(runSeed);
  const log: string[] = [];
  const history: Played[] = [];
  let run = newRun(runSeed);
  let calls = 0, sells = 0, wastedGold = 0;
  /** Each Age the Run reached, when, and what it paid (0: history moved it on). */
  const reached: { age: number; round: number; paid: number }[] = [];
  while (run.phase === "shop") {
    if (run.age > (reached.at(-1)?.age ?? 0)) reached.push({ age: run.age, round: run.round, paid: 0 });
    log.push(`— Round ${run.round} · ${AGE_NAMES[AGES[run.age]!]} Age · ${run.lives} lives · ${run.wins} wins`);
    const scouts = sample(rng, ghostsFor(run.round), SCOUTED_GHOSTS);
    const taken: string[] = [];
    for (let i = 0; i < MAX_ACTIONS_PER_ROUND && run.phase === "shop"; i++) {
      const options = optionsFor(run);
      const choice = await decide(run, options, scouts, history, taken);
      calls++;
      const option = options[choice.index]!;
      log.push(`  ${option.text}  (confidence ${choice.confidence.toFixed(2)})`);
      taken.push(option.text);
      for (const action of option.actions) {
        if (action.type === "sell") sells++;
        if (action.type === "endShop") wastedGold += run.gold;
        if (action.type === "advance") reached.push({ age: run.age + 1, round: run.round, paid: advancePrice(run) });
        run = act(run, action);
      }
    }
    if (run.phase === "shop") run = act(run, { type: "endShop" });
    const ghost = ghostFor(ghosts, run.round, rng);
    log.push(`  line: ${formatLine(run.line)}`, `  vs ${ghost.personality} Ghost: ${formatLine(ghost.line)}`);
    const fought = resolveBattle(run, ghost.line);
    log.push(...formatEvents(fought.result.events).filter((l) => l.startsWith("  →")));
    history.push({ round: run.round, line: run.line.map((u) => (u ? { ...u } : null)), ghost: ghost.line, outcome: fought.result.outcome });
    run = fought.run;
    console.log(`seed ${runSeed} Round ${history.at(-1)!.round}: ${fought.result.outcome} (${run.wins} wins, ${run.lives} lives)`);
  }
  log.push(`Run ${run.phase} with ${run.wins} wins and ${run.lives} lives after ${run.round} Rounds`);
  writeFileSync(`out/model/run-${variant.name}-${runSeed}${preview ? "-preview" : ""}.log`, log.join("\n"));
  return { seed: runSeed, phase: run.phase, wins: run.wins, lives: run.lives, rounds: run.round, calls, sells, wastedGold, reached, history };
}

function ghostsFor(round: number): Ghost[] {
  const last = Math.max(...ghosts.keys());
  return ghosts.get(Math.min(round, last))!;
}

/** Share of scouted Ghosts this Line beats (draws count half), with end-of-round abilities applied first. */
function scout(run: Run, scouts: Ghost[]): number {
  const ready = run.phase === "shop" ? act(run, { type: "endShop" }) : run;
  const rng = createRng(run.round);
  let score = 0;
  for (const g of scouts) {
    const outcome = battle(ready.line, g.line, seedFrom(rng)).outcome;
    score += outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  }
  return score / Math.max(1, scouts.length);
}

interface Option {
  actions: Action[];
  text: string;
}

/** The legal actions, plus "replace" options that sell a Unit and buy a shop Unit into its slot in one step. */
function optionsFor(run: Run): Option[] {
  const options: Option[] = legalActions(run).map((a) => ({ actions: [a], text: describe(run, a) }));
  if (run.line.every((u) => u !== null)) {
    run.line.forEach((unit, slot) => {
      const refund = stageOf(unit!.exp);
      run.shopUnits.forEach((offer, shop) => {
        if (offer.def === unit!.def || offer.price > run.gold + refund) return;
        const text = `Replace ${unitName(unit!)} in slot ${slot + 1} (sell for ${refund} gold) with ${unitDef(offer.def).names[0]} (unit ${shop + 1}, ${offer.price} gold)`;
        options.splice(options.length - 1, 0, { actions: [{ type: "sell", slot }, { type: "buy", shop, slot }], text });
      });
    });
  }
  return options;
}

async function decide(run: Run, options: Option[], scouts: Ghost[], history: Played[], taken: string[]): Promise<{ index: number; confidence: number }> {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const context = [
    rules(),
    describeState(run),
    `Scouting: your Line as it stands would beat about ${pct(scout(run, scouts))} of ${scouts.length} typical opponents for this Round.`,
    history.length > 0
      ? ["Your last battles:", ...history.slice(-HISTORY_ROUNDS).map((h) => `  Round ${h.round}, ${h.outcome}: ${formatLine(h.line)}  vs  ${formatLine(h.ghost)}`)].join("\n")
      : "",
    taken.length > 0 ? ["Actions you have taken this Round:", ...taken.map((t) => `  ${t}`)].join("\n") : "",
  ].filter((part) => part !== "");
  const body = {
    model: MODEL,
    input: context.join("\n\n"),
    questions: [
      {
        type: "choice",
        name: "action",
        instructions: "Which shop action gives you the best chance of winning this Run, thinking about this Round's battle and the Rounds after it? Choose end_shop when you are done for this Round.",
        choices: options.map((o, i) => {
          let description = o.text;
          const kind = o.actions[0]!.type;
          if (preview && kind !== "freeze" && kind !== "reroll" && kind !== "advance") {
            description += ` (Line would then beat about ${pct(scout(o.actions.reduce(act, run), scouts))})`;
          }
          return { value: kind === "endShop" ? "end_shop" : `a${i}`, description };
        }),
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
      if (answer?.type !== "choice" || !answer.choice) return { index: options.length - 1, confidence: 0 };
      const index = answer.choice === "end_shop" ? options.findIndex((o) => o.actions[0]!.type === "endShop") : Number(answer.choice.slice(1));
      return { index, confidence: answer.confidence ?? 0 };
    }
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`Decisions API ${res.status}: ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}

function describeState(run: Run): string {
  const lines = [
    `Round ${run.round}. Your Age: ${AGE_NAMES[AGES[run.age]!]} (since Round ${run.ageSince}${prosperity(run) > 0 ? `, +${prosperity(run)} gold this Round for staying` : ""}). Gold ${run.gold}. Lives ${run.lives}. Wins ${run.wins}/10. Rerolls this Round ${run.rerolls}.`,
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
    case "advance": {
      const next = AGES[run.age + 1]!;
      const units = UNITS.filter((u) => u.age === next && !u.token).map((u) => `${u.names[0]} ${u.attack}/${u.health} (${u.text(1)})`);
      return `Advance to the ${AGE_NAMES[next]} Age for ${advancePrice(run)} gold. The shop then also offers ${units.join("; ")}, at ${shopRules.unitPriceByAge[run.age + 1]} gold each, and rerolls now`;
    }
    case "freeze": {
      const offer = a.kind === "unit" ? run.shopUnits[a.shop] : run.shopInventions[a.shop];
      const name = a.kind === "unit" ? unitDef(offer!.def).names[0] : inventionDef(offer!.def).name;
      return `${offer!.frozen ? "Unfreeze" : "Freeze"} ${name} in the shop`;
    }
    case "endShop": return run.gold > 0 ? `End the shop phase and fight (your remaining ${run.gold} gold is lost)` : "End the shop phase and fight";
  }
}
