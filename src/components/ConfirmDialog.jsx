// A small in-app confirmation prompt. window.confirm() cannot be relied on
// inside the Android WebView, so exit prompts are rendered by the game itself.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "CONFIRM",
  cancelLabel = "CANCEL",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm border border-[#76a035] bg-stone-950 p-5 text-center shadow-2xl">
        <div className="font-mono text-xs font-black uppercase tracking-widest text-[#9acd50]">
          {title}
        </div>
        <p className="mt-3 font-mono text-sm leading-relaxed text-stone-200">
          {message}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-stone-700 px-4 py-2 font-mono text-xs font-bold uppercase text-stone-300 hover:bg-stone-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="border border-red-500/60 bg-red-900/40 px-4 py-2 font-mono text-xs font-bold uppercase text-red-200 hover:bg-red-800/60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
