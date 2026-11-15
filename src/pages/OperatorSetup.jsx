// OperatorSetup.jsx is the one-time welcome screen a brand-new player sees.
// It asks for a callsign (name) and a country, then hands those values back to
// App.jsx so the rest of the game knows who the player is.
import { useMemo, useState } from "react";
import { Flag, User } from "lucide-react";

// this is for choosing country — populates the dropdown on the "create your operator" setup screen
const COUNTRIES = [
  "Philippines",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Japan",
  "South Korea",
  "India",
  "Germany",
  "France",
  "Brazil",
  "Mexico",
  "Indonesia",
  "Singapore",
  "Vietnam",
  "Thailand",
  "Malaysia",
  "Other",
];

// This is the one-time "create your operator" screen shown to brand-new players before they
// reach the lobby: it collects a callsign (name) and home country, then hands them to onComplete.
export default function OperatorSetup({
  initialName,
  initialCountry,
  onComplete,
}) {
  const [name, setName] = useState(
    initialName && initialName !== "Recruit" ? initialName : "",
  );
  const [country, setCountry] = useState(initialCountry || "");
  const [otherCountry, setOtherCountry] = useState("");

  const resolvedCountry = useMemo(() => {
    if (country === "Other") return otherCountry.trim();
    return country.trim();
  }, [country, otherCountry]);

  const canContinue = name.trim().length >= 2 && resolvedCountry.length >= 2;

  return (
    <div className="fixed inset-0 z-[210] overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(2,10,2,0.88) 55%, rgba(0,0,0,0.92) 100%)",
            "radial-gradient(ellipse at 35% 20%, rgba(118,160,53,0.25) 0%, rgba(118,160,53,0.0) 55%)",
            "url('/opengraph.jpg')",
          ].join(", "),
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "center, center, center",
          filter: "saturate(1.05) contrast(1.05)",
        }}
      />

      <div className="scanline absolute inset-0 pointer-events-none" />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-60 bg-[linear-gradient(to_right,rgba(118,160,53,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(118,160,53,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* Content */}
      <div className="relative h-full w-full overflow-y-auto flex items-center justify-center p-3 short:p-2">
        <div className="w-full max-w-2xl my-auto border border-military bg-stone-950/70 backdrop-blur-sm shadow-2xl rounded overflow-hidden">
          <div className="px-4 py-3 short:py-2 border-b border-military bg-zinc-900/50">
            <div className="display text-[#76a035] text-xl md:text-2xl tracking-widest uppercase">
              OP:WARTACTICS
            </div>
            <div className="font-mono text-[10px] text-stone-400 tracking-widest uppercase mt-1">
              Operator registration required
            </div>
          </div>

          <div className="p-4 short:p-3 grid grid-cols-12 gap-4">
            <div className="col-span-7">
              <div className="font-mono text-xs text-stone-300 leading-relaxed">
                Enter your callsign and choose your country. This will be used
                in the lobby and during matches.
              </div>

              <div className="mt-4 short:mt-2.5 space-y-3 short:space-y-2">
                <label className="block">
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 mb-2">
                    <User size={14} className="text-[#76a035]" />
                    Callsign
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 16))}
                    placeholder="Enter name"
                    className="w-full bg-black/40 border border-military rounded px-3 py-2 text-sm font-mono text-stone-100 outline-none focus:border-[#76a035]"
                  />

                  <div className="mt-1 text-[10px] font-mono text-stone-500">
                    2–16 characters
                  </div>
                </label>

                <label className="block">
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 mb-2">
                    <Flag size={14} className="text-[#76a035]" />
                    Country
                  </div>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-black/40 border border-military rounded px-3 py-2 text-sm font-mono text-stone-100 outline-none focus:border-[#76a035]"
                  >
                    <option value="" disabled>
                      Select country
                    </option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                {country === "Other" && (
                  <label className="block">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 mb-2">
                      Country name
                    </div>
                    <input
                      value={otherCountry}
                      onChange={(e) =>
                        setOtherCountry(e.target.value.slice(0, 24))
                      }
                      placeholder="Type your country"
                      className="w-full bg-black/40 border border-military rounded px-3 py-2 text-sm font-mono text-stone-100 outline-none focus:border-[#76a035]"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="col-span-5">
              <div className="h-full border border-military/60 bg-black/30 rounded p-4">
                <div className="text-[10px] font-mono font-black text-[#76a035] uppercase tracking-widest">
                  Mission briefing
                </div>
                <div className="mt-3 text-xs font-mono text-stone-300 leading-relaxed">
                  Global conflict escalation detected. Operators are being
                  deployed under strict identification protocols.
                </div>
                <div className="mt-4 text-[10px] font-mono text-stone-500 space-y-1">
                  <div>
                    <span className="text-stone-400">RULES</span>: no name, no
                    deploy.
                  </div>
                  <div>
                    <span className="text-stone-400">STATUS</span>: awaiting
                    operator data.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => onComplete(name.trim(), resolvedCountry)}
                  className={`mt-4 short:mt-3 w-full py-3 rounded border font-mono font-bold uppercase tracking-widest text-xs transition-all ${
                    canContinue
                      ? "border-military-active bg-[#76a035]/15 text-[#76a035] hover:bg-[#76a035] hover:text-black cursor-pointer"
                      : "border-stone-800 bg-stone-900/30 text-stone-600 cursor-not-allowed"
                  }`}
                >
                  Deploy
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-military/60 bg-black/30">
            <div className="font-mono text-[10px] text-stone-500 uppercase tracking-widest">
              Tip: if audio doesn’t start, click once to unlock it.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
