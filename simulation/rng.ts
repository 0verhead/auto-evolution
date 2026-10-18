// Seeded mulberry32. All simulation randomness goes through this (ADR 0003).
export interface Rng {
  state: number;
}

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 };
}

export function next(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function int(rng: Rng, max: number): number {
  return Math.floor(next(rng) * max);
}

export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  return items.length === 0 ? undefined : items[int(rng, items.length)];
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = next(rng) * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(int(rng, pool.length), 1)[0]!);
  }
  return out;
}

export function seedFrom(rng: Rng): number {
  return int(rng, 0xffffffff);
}
