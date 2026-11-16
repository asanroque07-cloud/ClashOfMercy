import { RefreshCw, X } from "lucide-react";

/**
 * Shown when the deployed build differs from the one this tab is running.
 * Deliberately non-blocking: a match can finish first, but the restart stays
 * one tap away.
 */
export default function UpdatePrompt({ onRestart, onDismiss }) {
  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <span className="update-prompt__icon" aria-hidden="true">
        <RefreshCw size={16} />
      </span>
      <div className="update-prompt__copy">
        <span className="update-prompt__title">New update available</span>
        <span className="update-prompt__hint">
          Restart the game to load the latest version.
        </span>
      </div>
      <button
        type="button"
        className="update-prompt__button"
        onClick={onRestart}
      >
        Restart now
      </button>
      {onDismiss && (
        <button
          type="button"
          className="update-prompt__close"
          aria-label="Dismiss update notice"
          onClick={onDismiss}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
