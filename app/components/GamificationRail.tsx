import styles from "./GamificationRail.module.css";
import LevelBadge from "./LevelBadge";
import ProgressBar from "./ProgressBar";
import type { LevelProgress } from "../lib/types";

interface GamificationRailProps {
  progress: LevelProgress;
  lifetimeMessageCount: number;
}

export default function GamificationRail({ progress, lifetimeMessageCount }: GamificationRailProps) {
  const nextLabel =
    progress.nextThreshold !== null ? String(progress.nextThreshold) : String(lifetimeMessageCount);

  return (
    <aside className={styles.rail} aria-label="Coaching progress">
      <LevelBadge level={progress.level} title={progress.title} />
      <div className={styles.progressSlot}>
        <ProgressBar
          percent={progress.progressPct}
          currentLabel={String(lifetimeMessageCount)}
          nextLabel={nextLabel}
        />
      </div>
      <div className={styles.lifetime}>
        <span className={styles.lifetimeCount}>{lifetimeMessageCount.toLocaleString()}</span>
        <span className={styles.lifetimeLabel}>lifetime messages</span>
      </div>
    </aside>
  );
}
