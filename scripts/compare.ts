// Compares balance variants over several seeds: npm run compare [runs] [seeds] [--scout] [--only=a,b]
import { measure, presencePasses } from "./measure";
import { VARIANTS } from "./variants";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const scouting = process.argv.includes("--scout");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length).split(",");
const variants = only ? VARIANTS.filter((v) => only.includes(v.name)) : VARIANTS;
const runs = Number(args[0] ?? 1000);
const seeds = Number(args[1] ?? 5);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

console.log(`${runs} Runs × ${seeds} seeds per variant${scouting ? ", scouting bots" : ""}\n`);
console.log("variant          | new test 1: Stone / Bronze / Iron in late winners (seeds passing) | old test 1 Mixer h2h (min–max) | test 2 old Units | avg wins P / M | Runs won P / M" + (scouting ? " | Scout: Runs won, old Units, Ages in late winners" : ""));
for (const variant of variants) {
  const restore = variant.apply();
  const ms = Array.from({ length: seeds }, (_, i) => measure(runs, i + 1, scouting));
  restore();
  const h2h = ms.map((m) => m.mixerHeadToHead);
  console.log(
    [
      variant.name.padEnd(16),
      `${(["stone", "bronze", "iron"] as const).map((a) => pct(mean(ms.map((m) => m.latePresence[a])))).join(" / ")} (${ms.filter(presencePasses).length}/${ms.length})`.padEnd(63),
      `${pct(mean(h2h))} (${pct(Math.min(...h2h))}–${pct(Math.max(...h2h))})`.padEnd(30),
      mean(ms.map((m) => m.oldUnitsInLateWinners)).toFixed(2).padEnd(16),
      `${mean(ms.map((m) => m.purist.avgWins)).toFixed(2)} / ${mean(ms.map((m) => m.mixer.avgWins)).toFixed(2)}`.padEnd(14),
      `${pct(mean(ms.map((m) => m.purist.runsWon)))} / ${pct(mean(ms.map((m) => m.mixer.runsWon)))}`,
      ...(scouting
        ? [
            `${pct(mean(ms.map((m) => m.scout!.runsWon)))}, ${mean(ms.map((m) => m.scout!.lateWinnerAges.stone + m.scout!.lateWinnerAges.bronze + m.scout!.lateWinnerAges.iron)).toFixed(2)}, ${mean(ms.map((m) => m.scout!.lateWinnerDistinctAges)).toFixed(2)}`,
          ]
        : []),
    ].join(" | "),
  );
}
console.log("");
for (const v of variants) console.log(`${v.name}: ${v.description}`);
