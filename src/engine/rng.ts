export type RngState = { seed: number; counter: number };

export function makeRng(seed: number): RngState {
  return { seed: seed >>> 0, counter: 0 };
}

// mulberry32 : générateur déterministe sur (seed + counter).
function mulberry32(a: number): number {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextFloat(state: RngState): [number, RngState] {
  const value = mulberry32((state.seed + state.counter) >>> 0);
  return [value, { seed: state.seed, counter: state.counter + 1 }];
}

export function nextInt(state: RngState, maxExclusive: number): [number, RngState] {
  const [f, next] = nextFloat(state);
  return [Math.floor(f * maxExclusive), next];
}

export function shuffle<T>(items: readonly T[], state: RngState): [T[], RngState] {
  const arr = [...items];
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const [j, ns] = nextInt(s, i + 1);
    s = ns;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return [arr, s];
}
