import { useEffect, useState } from "react";

// This is the animated boot-up screen shown once when the app first opens: it plays through a
// sequence of phases (logo -> title -> subtitle -> progress bar) before calling onDone() to reveal the game.
export default function LoadingScreen({ onDone }) {
  const [phase, setPhase] = useState("black"); // current step in the intro sequence
  const [barPct, setBarPct] = useState(0); // 0-100 fill of the fake loading progress bar
  const [glitch, setGlitch] = useState(false); // brief visual "glitch" flicker effect for style

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 300);
    const t2 = setTimeout(() => setPhase("title"), 900);
    const t3 = setTimeout(() => setPhase("sub"), 1600);
    const t4 = setTimeout(() => setPhase("bar"), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    if (phase !== "bar") return;
    let pct = 0;
    const intervals = [
      { speed: 40, target: 30 },
      { speed: 20, target: 65 },
      { speed: 60, target: 75 },
      { speed: 15, target: 100 },
    ];
    let cur = 0;
    const step = () => {
      const seg = intervals[cur];
      if (!seg) return;
      const id = setInterval(() => {
        pct += 1;
        setBarPct(pct);
        if (pct >= seg.target) {
          clearInterval(id);
          cur++;
          if (pct >= 100) {
            setTimeout(() => setPhase("done"), 400);
          } else {
            setTimeout(step, seg.speed * 3);
          }
        }
      }, seg.speed);
    };
    step();
  }, [phase]);

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, onDone]);

  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const visible = phase !== "black" && phase !== "done";
  const fadeOut = phase === "done";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d1a0d 0%, #050a05 60%, #000 100%)",
        transition: fadeOut ? "opacity 0.6s ease" : undefined,
        opacity: fadeOut ? 0 : 1,
      }}
    >
      <div className="scanline absolute inset-0 pointer-events-none z-10" />

      {/* Version badge — pinned to the top-right corner of the screen, visible across the whole boot sequence */}
        {(phase === "logo" ||
          phase === "title" ||
          phase === "sub" ||
          phase === "bar") && (
          <div
            className="absolute top-4 right-4 z-30 font-mono text-[11px] font-black tracking-widest"
            style={{
              color: "oklch(0.70 0.18 130)",
              opacity: visible ? 0.95 : 0,
              transition: "opacity 0.6s ease 0.4s",
              border: "1px solid oklch(0.70 0.18 130 / 40%)",
              background: "oklch(0.70 0.18 130 / 8%)",
              padding: "3px 9px",
              borderRadius: 4,
              letterSpacing: "0.15em",
              textShadow: "0 0 12px oklch(0.70 0.18 130 / 50%)",
            }}
          >
            V 1.0.0
          </div>
        )}

      <div className="relative flex flex-col items-center gap-6 short:gap-2 z-20 px-4">
        {(phase === "logo" ||
          phase === "title" ||
          phase === "sub" ||
          phase === "bar") && (
          <div
            className="text-7xl short:text-4xl mb-2 short:mb-0"
            style={{
              opacity: visible ? 1 : 0,
              transition: "opacity 0.5s ease",
              filter: "drop-shadow(0 0 20px oklch(0.70 0.18 130 / 60%))",
              animation: glitch ? "glitch 0.3s ease" : undefined,
            }}
          >
            ⚔️
          </div>
        )}

        {(phase === "title" || phase === "sub" || phase === "bar") && (
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.7s ease",
            }}
          >
            <div
              className="display text-center"
              style={{
                fontSize: "clamp(2.5rem, 8vw, 5rem)",
                color: "oklch(0.70 0.18 130)",
                textShadow:
                  "0 0 30px oklch(0.70 0.18 130 / 80%), 0 0 60px oklch(0.70 0.18 130 / 40%)",
                letterSpacing: "0.1em",
                animation: glitch ? "glitch 0.3s ease" : undefined,
              }}
            >
              Clash Of Mercy
            </div>
          </div>
        )}

        {(phase === "sub" || phase === "bar") && (
          <div
            className="text-xs tracking-widest"
            style={{
              color: "oklch(0.62 0.03 95)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.5s ease 0.2s",
            }}
          >
            TACTICAL MULTIPLAYER WARFARE
          </div>
        )}

        {/* Version label under the subtitle */}
        {(phase === "sub" || phase === "bar") && (
          <div
            className="font-mono text-[10px] font-black tracking-[0.3em]"
            style={{
              color: "oklch(0.70 0.18 130)",
              opacity: visible ? 0.85 : 0,
              transition: "opacity 0.5s ease 0.3s",
              marginTop: -10,
              textShadow: "0 0 10px oklch(0.70 0.18 130 / 45%)",
            }}
          >
            V 1.0.0
          </div>
        )}

        {phase === "bar" && (
          <div
            className="w-80 max-w-[80vw] mt-4 short:mt-1"
            style={{
              opacity: visible ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          >
            <div
              className="flex justify-between text-xs mb-1"
              style={{ color: "oklch(0.62 0.03 95)" }}
            >
              <span>INITIALIZING SYSTEMS</span>
              <span>{barPct}%</span>
            </div>
            <div
              className="h-2 rounded-sm overflow-hidden"
              style={{ background: "oklch(0.22 0.018 110)" }}
            >
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${barPct}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.50 0.18 130), oklch(0.75 0.18 130))",
                  boxShadow: "0 0 10px oklch(0.70 0.18 130 / 60%)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <div
              className="text-xs mt-2 text-center blink"
              style={{ color: "oklch(0.70 0.18 130)" }}
            >
              {barPct < 30
                ? "LOADING ASSETS..."
                : barPct < 65
                  ? "ARMING SYSTEMS..."
                  : barPct < 90
                    ? "DEPLOYING OPERATORS..."
                    : "MISSION READY"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
