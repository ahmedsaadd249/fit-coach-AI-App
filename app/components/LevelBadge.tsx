import styles from "./LevelBadge.module.css";

interface LevelBadgeProps {
  level: number;
  title: string;
}

export default function LevelBadge({ level, title }: LevelBadgeProps) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.number}>{level}</span>
      <span className={styles.title}>{title}</span>
    </div>
  );
}
