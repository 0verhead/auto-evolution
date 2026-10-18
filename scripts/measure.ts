// The numbers behind hook tests 1 and 2 (docs/hook-test.md), from one league of bot Runs.
import { battle } from "../simulation/battle";
import { MIXER, PURIST } from "../simulation/bot";
import { league, type LeagueResult } from "../simulation/league";
import { createRng, pick, seedFrom } from "../simulation/rng";
import { unitDef } from "../simulation/roster";
import { AGES, type Age, type Line } from "../simulation/types";

export interface PersonalityStats {
  avgWins: number;
  runsWon: number;
  /** Average Units per Age in this Personality's winning Lines from Round 10+. */
  lateWinnerAges: Record<Age, number>;
  lateWinners: number;
}

export interface Measurement {
  result: LeagueResult;
  purist: PersonalityStats;
  mixer: PersonalityStats;
  /** Test 1: Mixer win rate over decided Round 9–12 battles against Purist Ghosts. */
  mixerHeadToHead: number;
  decided: number;
  draws: number;
  /** Test 2: Stone, Bronze and Iron Units per winning Line from Round 10+. */
  oldUnitsInLateWinners: number;
  lateWinners: number;
}

const OLD = new Set<Age>(["stone", "bronze", "iron"]);

export function measure(runs: number, seed: number): Measurement {
  const result = league([PURIST, MIXER], runs, seed);

  const rng = createRng(seed);
  let wins = 0, losses = 0, draws = 0;
  for (let round = 9; round <= 12; round++) {
    const purists = result.ghosts.filter((g) => g.round === round && g.personality === PURIST.name);
    for (const mixer of result.ghosts.filter((g) => g.round === round && g.personality === MIXER.name)) {
      const purist = pick(rng, purists);
      if (!purist) continue;
      const outcome = battle(mixer.line, purist.line, seedFrom(rng)).outcome;
      if (outcome === "win") wins++;
      else if (outcome === "loss") losses++;
      else draws++;
    }
  }

  const late = result.winningLines.filter((g) => g.round >= 10);
  const count = (line: Line, ages: Set<Age>) => line.filter((u) => u && ages.has(unitDef(u.def).age)).length;
  return {
    result,
    purist: stats(result, PURIST.name),
    mixer: stats(result, MIXER.name),
    mixerHeadToHead: wins / Math.max(1, wins + losses),
    decided: wins + losses,
    draws,
    oldUnitsInLateWinners: late.reduce((s, g) => s + count(g.line, OLD), 0) / Math.max(1, late.length),
    lateWinners: late.length,
  };
}

function stats(result: LeagueResult, name: string): PersonalityStats {
  const runs = result.runs.filter((r) => r.personality === name);
  const late = result.winningLines.filter((g) => g.round >= 10 && g.personality === name);
  const lateWinnerAges = Object.fromEntries(
    AGES.map((age) => [age, late.reduce((s, g) => s + g.line.filter((u) => u && unitDef(u.def).age === age).length, 0) / Math.max(1, late.length)]),
  ) as Record<Age, number>;
  return {
    avgWins: runs.reduce((s, r) => s + r.wins, 0) / runs.length,
    runsWon: runs.filter((r) => r.won).length / runs.length,
    lateWinnerAges,
    lateWinners: late.length,
  };
}
