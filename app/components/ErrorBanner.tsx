import styles from "./ErrorBanner.module.css";
import { WarningIcon } from "./icons";
import type { ApiErrorKind } from "../lib/types";

const COPY_BY_KIND: Record<ApiErrorKind, string> = {
  validation_error: "Rally needs a bit more to go on — try rephrasing that.",
  rate_limit_exceeded:
    "Rally's catching its breath — you're sending messages faster than the coach can answer. Wait a few seconds and try again.",
  upstream_timeout: "The coach got stuck mid-thought. Try sending that again.",
  upstream_error: "Something went sideways on the coach's end. Give it another shot.",
  auth_error: "Rally's coach isn't configured correctly. Check the server credentials.",
  client_timeout: "That's taking longer than it should. Try again in a moment.",
  network_error: "Rally can't reach the coach right now. Check your connection and try again.",
  unknown_error: "Something went wrong on this end. Try again.",
};

interface ErrorBannerProps {
  kind: ApiErrorKind;
  onRetry: () => void;
}

export default function ErrorBanner({ kind, onRetry }: ErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <WarningIcon className={styles.icon} />
      <span className={styles.text}>{COPY_BY_KIND[kind]}</span>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
