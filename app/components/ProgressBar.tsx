import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  percent: number;
  currentLabel: string;
  nextLabel: string;
}

export default function ProgressBar({ percent, currentLabel, nextLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress to next level: ${currentLabel} of ${nextLabel} messages`}
      >
        <div className={styles.fill} style={{ width: `${clamped}%` }} />
      </div>
      <span className={styles.caption}>
        {currentLabel} / {nextLabel}
      </span>
    </div>
  );
}
