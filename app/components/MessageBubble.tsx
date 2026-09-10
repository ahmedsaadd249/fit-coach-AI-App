import styles from "./MessageBubble.module.css";
import type { ChatMessage } from "../lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? `${styles.row} ${styles.rowUser}` : styles.row}>
      <div
        className={isUser ? `${styles.bubble} ${styles.bubbleUser}` : `${styles.bubble} ${styles.bubbleCoach}`}
        data-status={message.status}
      >
        {message.text}
      </div>
    </div>
  );
}
