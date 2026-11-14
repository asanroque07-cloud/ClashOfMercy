// MainMenu.jsx is the big grid of buttons in the center of the lobby (Play,
// Shop, Inventory, Ranked, etc.). Each button just calls a function passed in
// from the parent so the parent can open the right screen or dialog.
import {
  Briefcase,
  ShoppingBag,
  History,
  Crosshair,
  Cpu,
  BarChart3,
  Settings2,
  Swords,
  Zap,
} from "lucide-react";

// This renders the home screen's stat bar and big navigation cards (loadout, store, history,
// and the game-mode buttons: rank, classic, offline, custom).
export function MainMenu({
  profile,
  onOpenLoadout,
  onOpenStore,
  onOpenHistory,
  onNavigate,
  onStartMatchmaking,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 w-full h-full min-h-0 select-none">
      <div className="flex flex-col gap-4 min-h-0">
        {/* Stats bar — top */}
        <div className="lobby-panel flex flex-wrap items-center justify-start gap-3 px-4 py-2.5 font-mono text-xs">
          <div className="lobby-section-tag mr-1 flex items-center gap-1.5">
            <Swords size={12} className="text-[#76a035]" /> Operator Stats
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-military/20">
            <span className="text-stone-500 font-bold">WEAPONS:</span>
            <span className="text-white font-extrabold">
              {profile.weaponsCount}
            </span>
          </div>
          <div className="h-4 w-px bg-stone-800 hidden sm:block" />
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-military/20">
            <span className="text-stone-500 font-bold">MATCHES:</span>
            <span className="text-white font-extrabold">
              {profile.matchesCount}
            </span>
          </div>
          <div className="h-4 w-px bg-stone-800 hidden sm:block" />
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-military/20">
            <span className="text-stone-500 font-bold">LEVEL:</span>
            <span className="text-emerald-400 font-extrabold">
              {profile.level}
            </span>
          </div>
          <div className="h-4 w-px bg-stone-800 hidden sm:block" />
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-military/20">
            <span className="text-stone-500 font-bold">RANK:</span>
            <span className="text-amber-400 font-extrabold">
              {profile.rankName} {profile.rankTier}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* LEFT COLUMN: buttons that open a modal over the home screen (see Modals.tsx) */}
          <div className="flex flex-col gap-3">
            {/* Opens the loadout modal: pick weapons/attachments/emote for the next match */}
            <button
              onClick={onOpenLoadout}
              className="group h-20 lg:h-22 bg-stone-900/40 hover:bg-stone-900/80 border border-military hover:border-emerald-500/60 rounded-lg p-4 text-left transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer shadow-lg active:scale-98"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rotate-45 transform translate-x-4 -translate-y-4 group-hover:bg-emerald-500/10 transition-colors" />
              <div className="flex justify-between items-center w-full">
                <span className="font-display font-extrabold text-base tracking-widest text-[#76a035] group-hover:text-emerald-400">
                  LOADOUT
                </span>
                <Briefcase
                  size={16}
                  className="text-[#76a035]/60 group-hover:text-emerald-400 group-hover:rotate-6 transition-all"
                />
              </div>
              <div className="text-[10px] font-mono text-stone-400 leading-none">
                WEAPONS • ATTACHMENTS • EMOTES
              </div>
            </button>

            {/* Opens the store modal: spend coins/diamonds on new weapons and cosmetics */}
            <button
              onClick={onOpenStore}
              className="group h-20 lg:h-22 bg-stone-900/40 hover:bg-stone-900/80 border border-military hover:border-amber-500/60 rounded-lg p-4 text-left transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer shadow-lg active:scale-98"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rotate-45 transform translate-x-4 -translate-y-4 group-hover:bg-amber-500/10 transition-colors" />
              <div className="flex justify-between items-center w-full">
                <span className="font-display font-extrabold text-base tracking-widest text-[#76a035] group-hover:text-amber-400">
                  STORE
                </span>
                <ShoppingBag
                  size={16}
                  className="text-[#76a035]/60 group-hover:text-amber-400 group-hover:scale-110 transition-all"
                />
              </div>
              <div className="text-[10px] font-mono text-stone-400 leading-none">
                REQUISITION SKINS & WEAPONS
              </div>
            </button>

            {/* Opens the match history modal: past match results (win/loss, kills, coins earned) */}
            <button
              onClick={onOpenHistory}
              className="group h-20 lg:h-22 bg-stone-900/40 hover:bg-stone-900/80 border border-military hover:border-cyan-500/60 rounded-lg p-4 text-left transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer shadow-lg active:scale-98"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rotate-45 transform translate-x-4 -translate-y-4 group-hover:bg-cyan-500/10 transition-colors" />
              <div className="flex justify-between items-center w-full">
                <span className="font-display font-extrabold text-base tracking-widest text-[#76a035] group-hover:text-cyan-400">
                  HISTORY
                </span>
                <History
                  size={16}
                  className="text-[#76a035]/60 group-hover:text-cyan-400 group-hover:-rotate-12 transition-all"
                />
              </div>
              <div className="text-[10px] font-mono text-stone-400 leading-none">
                REVIEW PREVIOUS EXPEDITIONS
              </div>
            </button>
          </div>

          {/* CENTER + RIGHT COLUMNS: game-mode picker buttons, each navigates to its own lobby screen */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {/* RANK: goes to the ranked lobby (competitive queue, squad management) */}
              <button
                onClick={() => onNavigate("rank")}
                className="group h-24 xl:h-28 bg-stone-900/40 hover:bg-stone-900/80 border border-military hover:border-[#76a035] rounded-lg p-3 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer relative shadow-lg active:scale-98 overflow-hidden"
              >
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#76a035]/5 rounded-full group-hover:bg-[#76a035]/10 transition-colors" />
                <div className="flex justify-between items-start w-full relative">
                  <BarChart3
                    size={18}
                    className="text-[#76a035]/60 group-hover:text-[#86b53b] transition-colors"
                  />
                  <span className="text-[7px] font-mono bg-[#76a035]/15 text-[#76a035] px-1 py-0.5 rounded font-bold uppercase">
                    COMP
                  </span>
                </div>
                <div className="relative">
                  <span className="font-display font-bold text-sm tracking-widest text-white group-hover:text-[#76a035] block">
                    RANK
                  </span>
                  <span className="text-[8px] font-mono text-stone-500 uppercase mt-0.5 block leading-tight">
                    SQUAD RANKING
                  </span>
                </div>
              </button>

              {/* CLASSIC: opens the Classic lobby, where the player queues into a public match */}
              <button
                onClick={onStartMatchmaking}
                className="group h-24 xl:h-28 bg-stone-900/40 hover:bg-stone-900/80 border border-military hover:border-amber-500/60 rounded-lg p-3 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer relative shadow-lg active:scale-98 overflow-hidden"
              >
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-amber-500/5 rounded-full group-hover:bg-amber-500/10 transition-colors" />
                <div className="flex justify-between items-start w-full relative">
                  <Crosshair
                    size={18}
                    className="text-[#76a035]/60 group-hover:text-amber-400 transition-colors"
                  />
                  <span className="text-[7px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.5 rounded font-bold uppercase animate-pulse">
                    PUB
                  </span>
                </div>
                <div className="relative">
                  <span className="font-display font-bold text-sm tracking-widest text-white group-hover:text-amber-400 block">
                    CLASSIC
                  </span>
                  <span className="text-[8px] font-mono text-stone-500 uppercase mt-0.5 block leading-tight">
                    QUICK MATCH
                  </span>
                </div>
              </button>

              {/* CUSTOM: lets the player set up a private match (choose team sizes, invite friends) */}
              <button
                onClick={() => onNavigate("custom")}
                className="group h-24 xl:h-28 bg-stone-900/40 hover:bg-stone-900/80 border border-military hover:border-purple-500/60 rounded-lg p-3 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer relative shadow-lg active:scale-98 xl:col-span-1 col-span-2 overflow-hidden"
              >
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-purple-500/5 rounded-full group-hover:bg-purple-500/10 transition-colors" />
                <div className="flex justify-between items-start w-full relative">
                  <Settings2
                    size={18}
                    className="text-[#76a035]/60 group-hover:text-purple-400 transition-colors"
                  />
                  <span className="text-[7px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded font-bold uppercase">
                    1P
                  </span>
                </div>
                <div className="relative">
                  <span className="font-display font-bold text-sm tracking-widest text-white group-hover:text-purple-400 block">
                    CUSTOM
                  </span>
                  <span className="text-[8px] font-mono text-stone-500 uppercase mt-0.5 block leading-tight">
                    1v1 / 1v2…
                  </span>
                </div>
              </button>
            </div>

            {/* OFFLINE: practice/training matches against AI bots, no internet opponents needed */}
            <div className="flex justify-center w-full">
              <button
                onClick={() => onNavigate("offline")}
                className="group w-full h-24 xl:h-28 bg-stone-900/40 hover:bg-stone-900/85 border border-military hover:border-[#76a035] rounded-lg p-4 text-center transition-all duration-300 flex flex-col justify-between items-center cursor-pointer relative shadow-xl active:scale-98 overflow-hidden"
              >
                <div className="absolute top-0 inset-x-8 h-[1.5px] bg-[#76a035]/50 group-hover:bg-[#86b53b] transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#76a035]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 relative">
                  <Cpu
                    size={22}
                    className="text-[#76a035]/50 group-hover:text-[#76a035] group-hover:scale-110 transition-transform"
                  />
                  <Zap
                    size={14}
                    className="text-amber-500/50 group-hover:text-amber-400 transition-colors"
                  />
                </div>
                <div className="relative">
                  <span className="font-display font-extrabold text-lg tracking-widest text-white group-hover:text-[#76a035] block">
                    OFFLINE
                  </span>
                  <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest mt-1 block">
                    SQUAD TRAINING vs AI BOTS
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
