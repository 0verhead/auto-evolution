// The numbers behind hook tests 1 and 2 (docs/hook-test.md), from one league of bot Runs.
import { battle } from "../simulation/battle";
import { MIXER, PURIST, SCOUT, SCOUTING_MIXER, SCOUTING_PURIST } from "../simulation/bot";
import { league, scoutPool, type LeagueResult } from "../simulation/league";
import { createRng, pick, seedFrom } from "../simulation/rng";
import { UNITS, unitDef } from "../simulation/roster";
import { AGES, type Age, type Line } from "../simulation/types";

export interface PersonalityStats {
  avgWins: number;
  runsWon: number;
  /** Average Units per Age in this Personality's winning Lines from Round 10+. */
  lateWinnerAges: Record<Age, number>;
  lateWinners: number;
  /** Distinct Ages per winning Line from Round 10+. */
  lateWinnerDistinctAges: number;
}

export interface Measurement {
  result: LeagueResult;
  purist: PersonalityStats;
  mixer: PersonalityStats;
  /** Only with scouting: the bot that plays only to win. */
  scout?: PersonalityStats;
  /** Test 1: Mixer win rate over decided Round 9–12 battles against Purist Ghosts. */
  mixerHeadToHead: number;
  decided: number;
  draws: number;
  /** Test 2: Stone, Bronze and Iron Units per winning Line from Round 10+. */
  oldUnitsInLateWinners: number;
  lateWinners: number;
  /** Share of winning Lines from Round 10+ that hold at least one Unit of each Age. */
  latePresence: Record<Age, number>;
  /** Share of winning Lines from Round 10+ that hold each Unit, by Unit id. */
  lateUnitPresence: Record<string, number>;
}

/**
 * Test 1: keeping an old Unit is a real choice. No old Unit is in more than 70% of late winning Lines
 * (else keeping it is automatic), and each old Age is in at least 30% (else old Units are dead weight).
 */
export const MAX_UNIT_PRESENCE = 0.7;
export const MIN_AGE_PRESENCE = 0.3;
export const OLD_AGES = ["stone", "bronze", "iron"] as const;

export function oldUnits(): string[] {
  return UNITS.filter((u) => !u.token && (OLD_AGES as readonly string[]).includes(u.age)).map((u) => u.id);
}

export function presencePasses(m: Measurement): boolean {
  return oldUnits().every((id) => (m.lateUnitPresence[id] ?? 0) <= MAX_UNIT_PRESENCE) && OLD_AGES.every((age) => m.latePresence[age] >= MIN_AGE_PRESENCE);
}

/** The old Unit kept most often, which is what usually decides test 1's upper limit. */
export function mostKeptOldUnit(m: Measurement): { id: string; share: number } {
  return oldUnits().map((id) => ({ id, share: m.lateUnitPresence[id] ?? 0 })).sort((a, b) => b.share - a.share)[0]!;
}

const OLD = new Set<Age>(["stone", "bronze", "iron"]);

/**
 * With scouting, the simple bots first play a league whose Ghosts the scouting bots then preview against,
 * and the scouting Purist, Mixer and Scout play the measured league.
 */
export function measure(runs: number, seed: number, scouting = false): Measurement {
  const result = scouting
    ? league([SCOUTING_PURIST, SCOUTING_MIXER, SCOUT], runs, seed, scoutPool(league([PURIST, MIXER], runs, seed + 10_000).ghosts))
    : league([PURIST, MIXER], runs, seed);

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
    scout: scouting ? stats(result, SCOUT.name) : undefined,
    mixerHeadToHead: wins / Math.max(1, wins + losses),
    decided: wins + losses,
    draws,
    oldUnitsInLateWinners: late.reduce((s, g) => s + count(g.line, OLD), 0) / Math.max(1, late.length),
    lateWinners: late.length,
    latePresence: Object.fromEntries(
      AGES.map((age) => [age, late.filter((g) => count(g.line, new Set([age])) > 0).length / Math.max(1, late.length)]),
    ) as Record<Age, number>,
    lateUnitPresence: Object.fromEntries(
      UNITS.filter((u) => !u.token).map((u) => [u.id, late.filter((g) => g.line.some((x) => x?.def === u.id)).length / Math.max(1, late.length)]),
    ),
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
    lateWinnerDistinctAges: late.reduce((s, g) => s + new Set(g.line.filter((u) => u !== null).map((u) => unitDef(u.def).age)).size, 0) / Math.max(1, late.length),
  };
}
