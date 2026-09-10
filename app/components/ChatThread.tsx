"use client";

import { useEffect, useRef } from "react";
import styles from "./ChatThread.module.css";
import MessageBubble from "./MessageBubble";
import ThinkingIndicator from "./ThinkingIndicator";
import ErrorBanner from "./ErrorBanner";
import type { ApiErrorKind, ChatMessage } from "../lib/types";

interface ChatThreadProps {
  messages: ChatMessage[];
  isSending: boolean;
  errorKind: ApiErrorKind | null;
  onRetry: () => void;
}

export default function ChatThread({ messages, isSending, errorKind, onRetry }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isSending, errorKind]);

  return (
    <div className={styles.thread}>
      {messages.length === 0 && (
        <div className={styles.welcomeRow}>
          <div className={styles.welcomeBubble}>
            I&apos;m your Rally coach. Tell me about your goals, your last workout, or how
            you&apos;re feeling today — I&apos;ll help you figure out the next move.
          </div>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isSending && <ThinkingIndicator />}
      {!isSending && errorKind && <ErrorBanner kind={errorKind} onRetry={onRetry} />}
      <div ref={endRef} />
    </div>
  );
}
