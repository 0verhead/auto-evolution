// Compares balance variants over several seeds: npm run compare [runs] [seeds]
import { measure } from "./measure";
import { VARIANTS } from "./variants";

const runs = Number(process.argv[2] ?? 1000);
const seeds = Number(process.argv[3] ?? 5);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

console.log(`${runs} Runs × ${seeds} seeds per variant\n`);
console.log("variant          | test 1 Mixer h2h (min–max) | test 2 old Units | Purist Stone in late winners | avg wins P / M | Runs won P / M");
for (const variant of VARIANTS) {
  const restore = variant.apply();
  const ms = Array.from({ length: seeds }, (_, i) => measure(runs, i + 1));
  restore();
  const h2h = ms.map((m) => m.mixerHeadToHead);
  console.log(
    [
      variant.name.padEnd(16),
      `${pct(mean(h2h))} (${pct(Math.min(...h2h))}–${pct(Math.max(...h2h))})`.padEnd(26),
      mean(ms.map((m) => m.oldUnitsInLateWinners)).toFixed(2).padEnd(16),
      mean(ms.map((m) => m.purist.lateWinnerAges.stone)).toFixed(2).padEnd(28),
      `${mean(ms.map((m) => m.purist.avgWins)).toFixed(2)} / ${mean(ms.map((m) => m.mixer.avgWins)).toFixed(2)}`.padEnd(14),
      `${pct(mean(ms.map((m) => m.purist.runsWon)))} / ${pct(mean(ms.map((m) => m.mixer.runsWon)))}`,
    ].join(" | "),
  );
}
console.log("");
for (const v of VARIANTS) console.log(`${v.name}: ${v.description}`);
