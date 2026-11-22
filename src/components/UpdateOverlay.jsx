import { ArrowDownToLine, Download, RefreshCw, ShieldCheck } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { formatSize } from "@/lib/nativeUpdater";
import { releaseFileName } from "@/lib/updateFeed";

// The update flow. A newer build downloads by itself in the background, so the
// player never has to wait in a menu: while the file is coming down only a
// compact strip is shown (it sits over the loading screen too, so the boot
// screen shows the percentage and the file name). Once the APK is on the
// device, the popup asks for a restart to finish installing it.
export default function UpdateOverlay({ update }) {
  const {
    release,
    status,
    progress,
    error,
    startDownload,
    openInstaller,
    dismiss,
  } = update;
  if (!release) return null;

  const total = Number(progress.total) || Number(release.size) || 0;
  const received = Number(progress.received) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
  const notes = Array.isArray(release.notes) ? release.notes : [];
  const fileName = update.fileName || releaseFileName(release);
  const downloading = status === "downloading";
  const ready = status === "ready";

  // While downloading, stay out of the way: this strip is the only UI and the
  // lobby/match stays fully usable underneath it.
  if (downloading) {
    return (
      <div
        className="fixed bottom-4 left-1/2 z-[700] w-[min(92vw,28rem)] -translate-x-1/2 border border-[#76a035]/70 bg-black/90 p-3 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#9acd50]">
          <Download size={13} />
          System update
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="truncate font-mono text-[11px] text-stone-200">
            {fileName}
          </span>
          <span className="font-mono text-[11px] font-black text-[#9acd50]">
            {pct}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-stone-800">
          <div
            className="h-full rounded-sm"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, oklch(0.50 0.18 130), oklch(0.75 0.18 130))",
              boxShadow: "0 0 10px oklch(0.70 0.18 130 / 60%)",
              transition: "width 0.2s linear",
            }}
          />
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-stone-500">
          {formatSize(received)} / {formatSize(total)} · downloading in the
          background
        </div>
      </div>
    );
  }

  if (!ready && status !== "error") return null;

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d1a0d 0%, #050a05 65%, #000 100%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Game update"
    >
      <div className="scanline pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-xl border border-[#76a035]/60 bg-black/80 p-5 shadow-2xl">
        <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#9acd50]">
          <RefreshCw size={14} />
          {ready ? "System update ready" : "System update failed"}
        </div>
        <h2 className="mt-2 font-display text-3xl text-white">
          {ready ? "System has new update" : "Update download failed"}
        </h2>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-stone-400">
          {ready
            ? `Restart the game to install V ${release.version}`
            : `V ${APP_VERSION} → V ${release.version}`}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-stone-500">
          <span>{fileName}</span>
          <span>Update size {formatSize(release.size)}</span>
        </div>

        {notes.length > 0 && (
          <div className="mt-4 border border-stone-800 bg-stone-950/60 p-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#9acd50]">
              What&apos;s new
            </div>
            <ul className="mt-2 space-y-1.5">
              {notes.map((note) => (
                <li
                  key={note}
                  className="flex gap-2 font-mono text-[11px] leading-relaxed text-stone-300"
                >
                  <span className="text-[#76a035]">▸</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="mt-3 font-mono text-[10px] text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {ready ? (
            <button
              type="button"
              onClick={() => void openInstaller()}
              className="flex flex-1 items-center justify-center gap-2 border border-[#9acd50] bg-[#76a035] px-4 py-2.5 font-mono text-[11px] font-black uppercase tracking-widest text-black hover:bg-[#8bc342]"
            >
              <ShieldCheck size={14} />
              Restart game
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startDownload()}
              className="flex flex-1 items-center justify-center gap-2 border border-[#9acd50] bg-[#76a035] px-4 py-2.5 font-mono text-[11px] font-black uppercase tracking-widest text-black hover:bg-[#8bc342]"
            >
              <ArrowDownToLine size={14} />
              Retry download
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="border border-stone-700 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-900"
          >
            Later
          </button>
        </div>

        {ready && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-stone-500">
            Android installs the update, then the app restarts on the new
            version.
          </p>
        )}
      </div>
    </div>
  );
}
