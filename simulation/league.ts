// Many bot Runs played in lockstep, each fighting another Run's Ghost from the same Round.
import { playShop, type Personality } from "./bot";
import { createRng, int, seedFrom } from "./rng";
import { newRun, resolveBattle, snapshot, type Run } from "./run";
import type { Line } from "./types";

export interface Ghost {
  round: number;
  runIndex: number;
  personality: string;
  line: Line;
}

export interface RunRecord {
  personality: string;
  wins: number;
  lives: number;
  rounds: number;
  won: boolean;
}

export interface LeagueResult {
  ghosts: Ghost[];
  /** Lines that won their battle, by Round. */
  winningLines: Ghost[];
  runs: RunRecord[];
  /** Battles stopped by the ability-loop safety stop. */
  runawayBattles: number;
}

/** A safety net: a Run still going after this many Rounds is recorded as it stands. */
const MAX_ROUNDS = 40;

export function league(personalities: Personality[], runCount: number, seed: number): LeagueResult {
  const rng = createRng(seed);
  let entrants = Array.from({ length: runCount }, (_, i) => ({
    index: i,
    personality: personalities[i % personalities.length]!,
    run: newRun(seedFrom(rng)),
  }));
  const result: LeagueResult = { ghosts: [], winningLines: [], runs: [], runawayBattles: 0 };

  while (entrants.length > 0) {
    for (const e of entrants) e.run = playShop(e.run, e.personality);
    const round = entrants[0]!.run.round;
    const lines = entrants.map((e) => snapshot(e.run));
    const ghosts = entrants.map((e, i) => ({ round, runIndex: e.index, personality: e.personality.name, line: lines[i]! }));
    result.ghosts.push(...ghosts);

    entrants.forEach((e, i) => {
      // Fight another Run's Ghost from this Round; the last Run left fights the latest Ghost of another Run.
      let opponent: Ghost;
      if (entrants.length > 1) {
        let j = int(rng, entrants.length - 1);
        if (j >= i) j++;
        opponent = ghosts[j]!;
      } else {
        opponent = result.ghosts.findLast((g) => g.runIndex !== e.index) ?? ghosts[i]!;
      }
      const { run, result: battle } = resolveBattle(e.run, opponent.line);
      if (battle.outcome === "win") result.winningLines.push(ghosts[i]!);
      if (battle.events.some((ev) => ev.type === "end" && ev.runaway)) result.runawayBattles++;
      e.run = run;
    });

    for (const e of entrants) {
      if (e.run.phase !== "shop" || e.run.round > MAX_ROUNDS) result.runs.push(record(e.personality.name, e.run));
    }
    entrants = entrants.filter((e) => e.run.phase === "shop" && e.run.round <= MAX_ROUNDS);
  }
  return result;
}

export function record(personality: string, run: Run): RunRecord {
  return { personality, wins: run.wins, lives: run.lives, rounds: run.round, won: run.phase === "won" };
}
