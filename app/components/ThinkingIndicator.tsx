import styles from "./ThinkingIndicator.module.css";

export default function ThinkingIndicator() {
  return (
    <div className={styles.row}>
      <div className={styles.bubble} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">
        Coach is thinking
      </span>
    </div>
  );
}
