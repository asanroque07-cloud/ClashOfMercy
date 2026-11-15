// MainMenu.jsx is the big grid of buttons in the center of the lobby (Play,
// Shop, Inventory, Ranked, etc.). Each button just calls a function passed in
// from the parent so the parent can open the right screen or dialog.
// The layout is built for phones held in landscape: every tile flexes to fill
// the available height so the whole menu fits on screen without scrolling.
import {
  Briefcase,
  ShoppingBag,
  History,
  Crosshair,
  Cpu,
  BarChart3,
  Settings2,
  Zap,
} from "lucide-react";

const ACCENTS = {
  emerald: "hover:border-emerald-500/60 active:border-emerald-500/60",
  amber: "hover:border-amber-500/60 active:border-amber-500/60",
  cyan: "hover:border-cyan-500/60 active:border-cyan-500/60",
  green: "hover:border-[#76a035] active:border-[#76a035]",
  purple: "hover:border-purple-500/60 active:border-purple-500/60",
};

function UtilityTile({ label, description, icon: Icon, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex-1 min-h-[52px] bg-stone-900/40 hover:bg-stone-900/80 border border-military ${ACCENTS[accent]} rounded-lg px-3 py-2 text-left transition-all duration-200 flex items-center gap-3 relative overflow-hidden cursor-pointer shadow-lg active:scale-[0.98]`}
    >
      <span className="flex-shrink-0 w-9 h-9 rounded-md bg-[#76a035]/10 border border-military flex items-center justify-center">
        <Icon size={17} className="text-[#76a035]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex flex-col">
        <span className="font-display text-sm tracking-widest text-[#76a035] truncate">
          {label}
        </span>
        <span className="text-[9px] font-mono text-stone-400 leading-tight truncate short:hidden">
          {description}
        </span>
      </span>
    </button>
  );
}

function ModeTile({ label, sub, badge, badgeClass, icon: Icon, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group min-h-0 bg-stone-900/40 hover:bg-stone-900/80 border border-military ${ACCENTS[accent]} rounded-lg p-3 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative shadow-lg active:scale-[0.98] overflow-hidden`}
    >
      <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#76a035]/5 rounded-full" />
      <div className="flex justify-between items-start w-full relative">
        <Icon size={18} className="text-[#76a035]/70" aria-hidden="true" />
        <span
          className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${badgeClass}`}
        >
          {badge}
        </span>
      </div>
      <div className="relative">
        <span className="font-display text-sm sm:text-base tracking-widest text-white block">
          {label}
        </span>
        <span className="text-[9px] font-mono text-stone-500 uppercase mt-0.5 block leading-tight truncate">
          {sub}
        </span>
      </div>
    </button>
  );
}

export function MainMenu({
  onOpenLoadout,
  onOpenStore,
  onOpenHistory,
  onNavigate,
  onStartMatchmaking,
}) {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)] gap-2.5 select-none">
      {/* LEFT: utilities that open a modal over the home screen */}
      <div className="flex flex-col gap-2.5 min-h-0">
        <UtilityTile
          label="LOADOUT"
          description="Weapons • Attachments • Emotes"
          icon={Briefcase}
          accent="emerald"
          onClick={onOpenLoadout}
        />
        <UtilityTile
          label="STORE"
          description="Skins & weapons"
          icon={ShoppingBag}
          accent="amber"
          onClick={onOpenStore}
        />
        <UtilityTile
          label="HISTORY"
          description="Previous expeditions"
          icon={History}
          accent="cyan"
          onClick={onOpenHistory}
        />
      </div>

      {/* RIGHT: game modes */}
      <div className="grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5 min-h-0">
        <div className="grid grid-cols-3 gap-2.5 min-h-0">
          <ModeTile
            label="RANK"
            sub="Squad ranking"
            badge="COMP"
            badgeClass="bg-[#76a035]/15 text-[#76a035]"
            icon={BarChart3}
            accent="green"
            onClick={() => onNavigate("rank")}
          />
          <ModeTile
            label="CLASSIC"
            sub="Quick match"
            badge="PUB"
            badgeClass="bg-amber-500/10 text-amber-500 border border-amber-500/20"
            icon={Crosshair}
            accent="amber"
            onClick={onStartMatchmaking}
          />
          <ModeTile
            label="CUSTOM"
            sub="1v1 / 1v2…"
            badge="1P"
            badgeClass="bg-purple-500/10 text-purple-400 border border-purple-500/20"
            icon={Settings2}
            accent="purple"
            onClick={() => onNavigate("custom")}
          />
        </div>

        {/* OFFLINE: practice vs AI bots — the primary call to action */}
        <button
          onClick={() => onNavigate("offline")}
          className="group min-h-0 bg-gradient-to-r from-[#76a035]/15 via-stone-900/60 to-[#76a035]/15 hover:from-[#76a035]/25 hover:to-[#76a035]/25 border border-[#76a035]/60 rounded-lg px-4 py-2 transition-all duration-200 flex items-center justify-center gap-4 cursor-pointer relative shadow-xl active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute top-0 inset-x-8 h-[1.5px] bg-[#76a035]/70" />
          <span className="flex items-center gap-1.5">
            <Cpu size={24} className="text-[#76a035]" aria-hidden="true" />
            <Zap size={14} className="text-amber-400" aria-hidden="true" />
          </span>
          <span className="text-left">
            <span className="font-display text-lg sm:text-xl tracking-widest text-white block leading-none">
              OFFLINE
            </span>
            <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest mt-1 block">
              Squad training vs AI bots
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
