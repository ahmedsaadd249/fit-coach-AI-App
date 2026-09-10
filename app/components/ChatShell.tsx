"use client";

import { useCallback, useState } from "react";
import styles from "./ChatShell.module.css";
import ChatThread from "./ChatThread";
import Composer from "./Composer";
import GamificationRail from "./GamificationRail";
import LevelUpOverlay from "./LevelUpOverlay";
import NewChatButton from "./NewChatButton";
import { useChatThread } from "../hooks/useChatThread";
import { useProgress } from "../hooks/useProgress";

interface LevelUpInfo {
  level: number;
  title: string;
}

export default function ChatShell() {
  const chat = useChatThread();
  const progress = useProgress();
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);

  const handleSend = useCallback(
    (text: string) => {
      const { leveledUp, progress: newProgress } = progress.recordUserMessage();
      chat.sendMessage(text);
      if (leveledUp) {
        setLevelUpInfo({ level: newProgress.level, title: newProgress.title });
      }
    },
    [chat, progress]
  );

  const handleNewChat = useCallback(
    (alsoResetProgress: boolean) => {
      chat.newChat(alsoResetProgress ? progress.resetProgress : undefined);
    },
    [chat, progress]
  );

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.wordmark}>Rally</span>
        <NewChatButton onConfirm={handleNewChat} />
      </header>
      <div className={styles.body}>
        <GamificationRail
          progress={progress.progress}
          lifetimeMessageCount={progress.lifetimeMessageCount}
        />
        <div className={styles.chatColumn}>
          <ChatThread
            messages={chat.messages}
            isSending={chat.isSending}
            errorKind={chat.lastError?.kind ?? null}
            onRetry={chat.retryLast}
          />
          <Composer disabled={chat.isSending} onSend={handleSend} />
        </div>
      </div>
      {levelUpInfo && (
        <LevelUpOverlay
          level={levelUpInfo.level}
          title={levelUpInfo.title}
          onDismiss={() => setLevelUpInfo(null)}
        />
      )}
    </main>
  );
}
