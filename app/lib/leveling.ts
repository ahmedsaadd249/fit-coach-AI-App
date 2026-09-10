import type { LevelProgress } from "./types";

interface LevelDefinition {
  level: number;
  title: string;
  threshold: number;
}

/**
 * Cumulative user-messages-sent required to reach each level. Escalating by
 * design: level 2 unlocks fast (5 messages) to hook new users, then the
 * per-level cost roughly doubles by level 10 so climbing feels earned.
 */
const LEVELS: LevelDefinition[] = [
  { level: 1, title: "Warming Up", threshold: 0 },
  { level: 2, title: "First Rep", threshold: 5 },
  { level: 3, title: "Finding Rhythm", threshold: 15 },
  { level: 4, title: "Building Momentum", threshold: 30 },
  { level: 5, title: "In the Groove", threshold: 50 },
  { level: 6, title: "Locked In", threshold: 75 },
  { level: 7, title: "Hitting Stride", threshold: 110 },
  { level: 8, title: "Going the Distance", threshold: 155 },
  { level: 9, title: "Relentless", threshold: 215 },
  { level: 10, title: "Rally Captain", threshold: 300 },
];

const MAX_DEFINED_LEVEL = LEVELS[LEVELS.length - 1];

/** Beyond the highest defined level, keep climbing on a flat increment. */
const POST_MAX_LEVEL_INCREMENT = 100;

/** Every 5 levels past the max defined one, append a roman-numeral tier. */
const TIER_SIZE = 5;

function toRoman(num: number): string {
  if (num <= 0) return "";
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  let remaining = num;
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

function getLevelTitle(level: number): string {
  if (level <= MAX_DEFINED_LEVEL.level) {
    return LEVELS.find((entry) => entry.level === level)?.title ?? MAX_DEFINED_LEVEL.title;
  }
  const tier = Math.floor((level - MAX_DEFINED_LEVEL.level) / TIER_SIZE) + 1;
  const suffix = tier > 1 ? ` ${toRoman(tier)}` : "";
  return `${MAX_DEFINED_LEVEL.title}${suffix}`;
}

/** Pure derivation: level/title/progress all come from one message count. */
export function getProgress(lifetimeMessageCount: number): LevelProgress {
  const count = Math.max(0, Math.floor(lifetimeMessageCount));

  if (count < MAX_DEFINED_LEVEL.threshold) {
    let current = LEVELS[0];
    let next = LEVELS[1];
    for (let i = 0; i < LEVELS.length - 1; i++) {
      if (count >= LEVELS[i].threshold && count < LEVELS[i + 1].threshold) {
        current = LEVELS[i];
        next = LEVELS[i + 1];
        break;
      }
    }
    const span = next.threshold - current.threshold;
    const into = count - current.threshold;
    return {
      level: current.level,
      title: current.title,
      currentFloor: current.threshold,
      nextThreshold: next.threshold,
      progressPct: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100,
      messagesToNext: next.threshold - count,
    };
  }

  const extra = count - MAX_DEFINED_LEVEL.threshold;
  const stepsBeyond = Math.floor(extra / POST_MAX_LEVEL_INCREMENT);
  const level = MAX_DEFINED_LEVEL.level + stepsBeyond;
  const currentFloor = MAX_DEFINED_LEVEL.threshold + stepsBeyond * POST_MAX_LEVEL_INCREMENT;
  const nextThreshold = currentFloor + POST_MAX_LEVEL_INCREMENT;
  const into = count - currentFloor;

  return {
    level,
    title: getLevelTitle(level),
    currentFloor,
    nextThreshold,
    progressPct: Math.min(100, Math.round((into / POST_MAX_LEVEL_INCREMENT) * 100)),
    messagesToNext: nextThreshold - count,
  };
}

export function getLevelForCount(count: number): number {
  return getProgress(count).level;
}

export { LEVELS, POST_MAX_LEVEL_INCREMENT };
