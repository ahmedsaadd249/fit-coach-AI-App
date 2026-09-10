"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getLevelForCount, getProgress } from "../lib/leveling";
import type { LevelProgress, ProgressRecord } from "../lib/types";

const STORAGE_KEY = "rally.progress.v1";

const DEFAULT_PROGRESS: ProgressRecord = {
  lifetimeMessageCount: 0,
  firstMessageAt: null,
  lastMessageAt: null,
};

export interface RecordMessageResult {
  leveledUp: boolean;
  progress: LevelProgress;
}

/**
 * Lifetime message count and everything derived from it (level, title,
 * progress toward the next one). Deliberately never cleared by "new chat" --
 * that reset only touches the separate chat-thread storage key.
 */
export function useProgress() {
  const [record, setRecord] = useLocalStorage<ProgressRecord>(STORAGE_KEY, DEFAULT_PROGRESS);

  const recordUserMessage = useCallback((): RecordMessageResult => {
    const previousLevel = getLevelForCount(record.lifetimeMessageCount);
    const nextCount = record.lifetimeMessageCount + 1;
    const nextProgress = getProgress(nextCount);
    const now = new Date().toISOString();

    setRecord({
      lifetimeMessageCount: nextCount,
      firstMessageAt: record.firstMessageAt ?? now,
      lastMessageAt: now,
    });

    return { leveledUp: nextProgress.level > previousLevel, progress: nextProgress };
  }, [record, setRecord]);

  const resetProgress = useCallback(() => {
    setRecord(DEFAULT_PROGRESS);
  }, [setRecord]);

  return {
    lifetimeMessageCount: record.lifetimeMessageCount,
    progress: getProgress(record.lifetimeMessageCount),
    recordUserMessage,
    resetProgress,
  };
}
