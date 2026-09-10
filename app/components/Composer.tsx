"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./Composer.module.css";
import { SendIcon } from "./icons";

interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

const LINE_HEIGHT_PX = 24;
const MAX_ROWS = 4;

export default function Composer({ disabled, onSend }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT_PX * MAX_ROWS)}px`;
  }, []);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(resize);
  }, [value, disabled, onSend, resize]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Tell your coach what's going on..."
        rows={1}
        disabled={disabled}
        aria-label="Message"
      />
      <button
        type="submit"
        className={styles.sendButton}
        disabled={disabled || value.trim().length === 0}
        aria-label="Send"
      >
        <SendIcon />
      </button>
    </form>
  );
}
