"use client";

import { useState } from "react";
import styles from "./NewChatButton.module.css";
import { NewChatIcon } from "./icons";

interface NewChatButtonProps {
  onConfirm: (alsoResetProgress: boolean) => void;
}

export default function NewChatButton({ onConfirm }: NewChatButtonProps) {
  const [open, setOpen] = useState(false);
  const [resetProgress, setResetProgress] = useState(false);

  const close = () => {
    setOpen(false);
    setResetProgress(false);
  };

  if (open) {
    return (
      <div className={styles.confirm} role="dialog" aria-label="Start a new chat">
        <p className={styles.confirmText}>
          Start a new chat? This clears the conversation, not your progress.
        </p>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={resetProgress}
            onChange={(event) => setResetProgress(event.target.checked)}
          />
          Also reset my progress
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={() => {
              onConfirm(resetProgress);
              close();
            }}
          >
            Start new chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
      <NewChatIcon size={15} />
      New chat
    </button>
  );
}
