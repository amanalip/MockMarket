const configuredSeed = Number.parseInt(process.env.FUZZ_SEED ?? '20240901', 10);

export const FUZZ_SEED = Number.isFinite(configuredSeed) ? configuredSeed >>> 0 : 20240901;

export function createTestRandom(namespace: string): () => number {
  let state = FUZZ_SEED;
  for (const character of namespace) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
