"use client";

import { useEffect } from "react";
import styles from "./LevelUpOverlay.module.css";

interface LevelUpOverlayProps {
  level: number;
  title: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;

export default function LevelUpOverlay({ level, title, onDismiss }: LevelUpOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onDismiss]);

  return (
    <div className={styles.backdrop} role="presentation" onClick={onDismiss}>
      <div className={styles.toast} role="status" aria-live="assertive">
        <span className={styles.lead}>You leveled up</span>
        <span className={styles.number}>{level}</span>
        <span className={styles.title}>{title}</span>
      </div>
    </div>
  );
}
