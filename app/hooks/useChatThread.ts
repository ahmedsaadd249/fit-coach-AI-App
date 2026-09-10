"use client";

import { useCallback, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { postCoachMessage } from "../lib/api";
import type { ApiErrorKind, ChatMessage, ThreadState } from "../lib/types";

const STORAGE_KEY = "rally.thread.v1";

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyThread(): ThreadState {
  return { sessionId: randomId("session"), messages: [] };
}

export interface LastError {
  kind: ApiErrorKind;
  messageId: string;
}

/**
 * Owns the visible conversation and its n8n session id. Message-count/level
 * bookkeeping lives entirely in useProgress -- this hook never touches it,
 * which is what makes "new chat clears the thread but never the level" a
 * structural guarantee rather than a rule callers have to remember.
 */
export function useChatThread() {
  const [thread, setThread] = useLocalStorage<ThreadState>(STORAGE_KEY, emptyThread());
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<LastError | null>(null);

  const dispatch = useCallback(
    async (userMessageId: string, text: string, sessionId: string) => {
      setIsSending(true);
      setLastError(null);

      const result = await postCoachMessage(text, sessionId);

      if (result.ok) {
        setThread((prev) => ({
          ...prev,
          messages: prev.messages
            .map((m) => (m.id === userMessageId ? { ...m, status: "sent" as const } : m))
            .concat({
              id: randomId("msg"),
              role: "coach",
              text: result.reply,
              createdAt: new Date().toISOString(),
              status: "sent",
            }),
        }));
      } else {
        setThread((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === userMessageId ? { ...m, status: "error" as const } : m
          ),
        }));
        setLastError({ kind: result.kind, messageId: userMessageId });
      }

      setIsSending(false);
    },
    [setThread]
  );

  /** Sends a brand-new message. Callers should increment progress before calling this. */
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMessage: ChatMessage = {
        id: randomId("msg"),
        role: "user",
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setThread((prev) => ({ ...prev, messages: [...prev.messages, userMessage] }));
      void dispatch(userMessage.id, trimmed, thread.sessionId);
    },
    [dispatch, isSending, setThread, thread.sessionId]
  );

  /** Re-sends the last failed message verbatim. Never increments progress. */
  const retryLast = useCallback(() => {
    if (!lastError || isSending) return;
    const target = thread.messages.find((m) => m.id === lastError.messageId);
    if (!target) return;

    setThread((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === target.id ? { ...m, status: "sending" as const } : m
      ),
    }));
    void dispatch(target.id, target.text, thread.sessionId);
  }, [dispatch, isSending, lastError, setThread, thread.messages, thread.sessionId]);

  const newChat = useCallback(
    (onCleared?: () => void) => {
      setThread(emptyThread());
      setLastError(null);
      onCleared?.();
    },
    [setThread]
  );

  return {
    messages: thread.messages,
    sessionId: thread.sessionId,
    isSending,
    lastError,
    sendMessage,
    retryLast,
    newChat,
  };
}
