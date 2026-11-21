import { ArrowDownToLine, Download, RefreshCw, ShieldCheck } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { formatSize } from "@/lib/nativeUpdater";

// Full-screen update panel shown over the boot screen. It lists the new build,
// its download size and what changed, then reports download progress in MB
// before handing the APK to Android's package installer.
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
  const downloading = status === "downloading";
  const ready = status === "ready";

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
          System update available
        </div>
        <h2 className="mt-2 font-display text-3xl text-white">
          V {APP_VERSION} → V {release.version}
        </h2>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-stone-400">
          Update size {formatSize(release.size)}
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

        {(downloading || ready) && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-stone-400">
              <span>
                {ready
                  ? "Download complete"
                  : `Downloading ${formatSize(received)} / ${formatSize(total)}`}
              </span>
              <span className="text-[#9acd50]">{ready ? 100 : pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-stone-800">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${ready ? 100 : pct}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.50 0.18 130), oklch(0.75 0.18 130))",
                  boxShadow: "0 0 10px oklch(0.70 0.18 130 / 60%)",
                  transition: "width 0.2s linear",
                }}
              />
            </div>
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
              Install &amp; restart
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startDownload()}
              disabled={downloading}
              className="flex flex-1 items-center justify-center gap-2 border border-[#9acd50] bg-[#76a035] px-4 py-2.5 font-mono text-[11px] font-black uppercase tracking-widest text-black hover:bg-[#8bc342] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? <Download size={14} /> : <ArrowDownToLine size={14} />}
              {downloading
                ? "Downloading update…"
                : status === "error"
                  ? "Retry download"
                  : "Download update"}
            </button>
          )}
          {!downloading && !ready && (
            <button
              type="button"
              onClick={dismiss}
              className="border border-stone-700 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-900"
            >
              Later
            </button>
          )}
        </div>

        {ready && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-stone-500">
            Android installs the update, then the app restarts on the new version.
          </p>
        )}
      </div>
    </div>
  );
}
