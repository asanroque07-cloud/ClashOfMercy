// OfflineLobby.jsx sets up a solo practice match against bots (no internet
// needed). You choose the map and how many/how tough the enemy bots are, then
// jump straight into the game.
import { useState } from "react";
import {
  Gamepad2,
  Compass,
  X,
  Minus,
  Plus,
  Bot,
  Crosshair,
  Flag,
  Shield,
  Map as MapIcon,
} from "lucide-react";
import { ADMIRALS_AVATARS, GAME_MAPS } from "@/lib/lobbyData";
import { weaponById } from "@/lib/gameTypes";

// these are for naming the AI teammates/enemies that fill out an offline (vs. bots) match
const BOT_NAMES_ALLIES = [
  "Sgt_Bravo",
  "Cpl_Jenkins",
  "Pvt_Vasquez",
  "Lt_Gomez",
  "Ranger_Echo",
];
const BOT_NAMES_ENEMIES = [
  "Rogue_Spectre",
  "Rogue_Titan",
  "Rogue_Viper",
  "Cyber_Assault",
  "Rogue_Reaper",
];
const ROLES = ["Core", "Sniper", "Marksman", "Gunner", "Scout"];

// this is a small +/- number control, used here for adjusting ally/enemy bot counts
function Stepper({ label, value, min, max, onChange, accent = "emerald" }) {
  const accentText =
    accent === "red" ? "text-red-400" : "text-emerald-400";
  const accentBorder =
    accent === "red" ? "border-red-500/50" : "border-emerald-500/50";
  const accentBg =
    accent === "red" ? "bg-red-950/30" : "bg-emerald-950/30";
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="lobby-section-tag">{label}</span>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${accentBorder} ${accentBg}`}
      >
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-md bg-stone-900/80 hover:bg-stone-800 text-stone-300 flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-90"
        >
          <Minus size={14} />
        </button>
        <span
          className={`font-display font-black text-3xl ${accentText} w-8 text-center tabular-nums`}
        >
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-md bg-stone-900/80 hover:bg-stone-800 text-stone-300 flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-90"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function TeamRow({
  label,
  color,
  icon,
  members,
  side,
}) {
  const headColor = color === "red" ? "text-red-400" : "text-emerald-400";
  const borderColor =
    color === "red" ? "border-red-900/40" : "border-emerald-900/40";
  return (
    <div className={`space-y-1.5 ${side === "right" ? "items-end" : ""}`}>
      <div
        className={`flex items-center gap-1.5 ${headColor} ${side === "right" ? "justify-end" : ""}`}
      >
        {icon}
        <span className="lobby-section-tag" style={{ color: undefined }}>
          {label} ({members.length})
        </span>
      </div>
      <div className="space-y-1">
        {members.map((m, i) => {
          const av =
            ADMIRALS_AVATARS.find((a) => a.id === m.avatarId)?.url ||
            ADMIRALS_AVATARS[0].url;
          const isYou = m.isYou;
          return (
            <div
              key={i}
              className={`p-1.5 rounded border flex items-center gap-1.5 ${
                side === "right" ? "flex-row-reverse" : ""
              } ${
                isYou
                  ? color === "red"
                    ? "border-red-500/50 bg-red-950/20"
                    : "border-emerald-500/50 bg-emerald-950/20"
                  : borderColor + " bg-stone-900/20"
              }`}
            >
              <div
                className={`w-6 h-6 rounded overflow-hidden border border-stone-700 flex-shrink-0 ${side === "right" ? "" : ""}`}
              >
                <img
                  src={av}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className={`min-w-0 font-mono text-[9px] ${side === "right" ? "text-right" : ""}`}
              >
                <div className="font-bold text-stone-200 truncate max-w-[80px]">
                  {m.name}
                </div>
                <div
                  className={`text-[8px] uppercase ${color === "red" ? "text-red-400" : "text-emerald-400"}`}
                >
                  {m.role} {isYou ? "• YOU" : m.isAI ? "• BOT" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OfflineLobby({
  profile,
  weapons,
  gameProfile,
  activeMap,
  onUpdatePlace,
  onLaunchGame,
}) {
  const [placeOpen, setPlaceOpen] = useState(false);
  const [allyCount, setAllyCount] = useState(3);
  const [enemyCount, setEnemyCount] = useState(3);

  // Show the gun the loadout actually carries into the match (slot 1).
  const activeWeapon = gameProfile?.loadout?.primary
    ? weaponById(gameProfile.loadout.primary).name
    : weapons.find((w) => w.equipped && w.owned)?.name || "M4 Tactical Rifle";
  const currentAvatar =
    ADMIRALS_AVATARS.find((a) => a.id === profile.avatarId) ||
    ADMIRALS_AVATARS[0];

  const allies = [
    {
      name: profile.name,
      role: profile.selectedRole,
      avatarId: profile.avatarId,
      isYou: true,
    },
    ...Array.from({ length: allyCount }, (_, i) => ({
      name: BOT_NAMES_ALLIES[i],
      role: ROLES[i % ROLES.length],
      avatarId: ADMIRALS_AVATARS[(i + 1) % ADMIRALS_AVATARS.length].id,
      isYou: false,
      isAI: true,
    })),
  ];

  const enemies = Array.from({ length: enemyCount }, (_, i) => ({
    name: BOT_NAMES_ENEMIES[i],
    role: ROLES[(i + 2) % ROLES.length],
    avatarId:
      ADMIRALS_AVATARS[
        (ADMIRALS_AVATARS.length - 1 - i) % ADMIRALS_AVATARS.length
      ].id,
    isAI: true,
  }));

  const getAvatarUrl = (id) =>
    ADMIRALS_AVATARS.find((a) => a.id === id)?.url || ADMIRALS_AVATARS[0].url;

  // Build the team config object that GameCanvas consumes to construct the
  // actual roster. Blue team = the player + their chosen number of ally bots,
  // red team = the chosen number of enemy bots.
  const buildTeamConfig = () => {
    const blue = [
      { name: profile.name, isAI: false, isHost: true },
      ...Array.from({ length: allyCount }, (_, i) => ({
        name: BOT_NAMES_ALLIES[i],
        isAI: true,
      })),
    ];
    const red = Array.from({ length: enemyCount }, (_, i) => ({
      name: BOT_NAMES_ENEMIES[i],
      isAI: true,
    }));
    return { blue, red };
  };

  void currentAvatar;
  void getAvatarUrl;
  void activeWeapon;

  return (
    <div className="offline-lobby h-full min-h-0 flex flex-col gap-4 w-full select-none animate-in fade-in duration-300 text-stone-100">
      {/* ── Bot Setup Panel ── */}
      <div className="offline-lobby__panel lobby-panel flex-1 min-h-0 flex flex-col">
        <div className="offline-lobby__header lobby-panel-header">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[#76a035]" />
            <span className="lobby-panel-title">Bot Battle Setup</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot ml-1" />
          </div>
          <button
            onClick={() => setPlaceOpen(!placeOpen)}
            className="lobby-btn-ghost text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1.5"
          >
            <Compass size={12} /> Change Map
          </button>
        </div>

        <div className="offline-lobby__content lobby-grid-bg flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Steppers + VS */}
          <div className="offline-lobby__controls flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <Stepper
              label="Ally Bots"
              value={allyCount}
              min={1}
              max={5}
              onChange={setAllyCount}
              accent="emerald"
            />
            <div className="flex flex-col items-center gap-1">
              <div className="lobby-vs-badge">VS</div>
              <span className="text-[8px] font-mono text-stone-600 uppercase tracking-widest">
                {allies.length} v {enemies.length}
              </span>
            </div>
            <Stepper
              label="Enemy Bots"
              value={enemyCount}
              min={1}
              max={5}
              onChange={setEnemyCount}
              accent="red"
            />
          </div>

          {/* Team preview */}
          <div className="offline-lobby__teams grid grid-cols-12 gap-3 items-start max-w-3xl mx-auto w-full">
            <div className="col-span-5">
              <TeamRow
                label="Your Team"
                color="emerald"
                icon={<Shield size={11} />}
                members={allies}
                side="left"
              />
            </div>
            <div className="col-span-2 flex items-center justify-center pt-5">
              <div className="font-display font-black text-xl text-stone-700">
                ⚔
              </div>
            </div>
            <div className="col-span-5 flex flex-col items-end">
              <TeamRow
                label="Enemy"
                color="red"
                icon={<Crosshair size={11} />}
                members={enemies}
                side="right"
              />
            </div>
          </div>

          {/* Map info card */}
          <div className="offline-lobby__map max-w-3xl mx-auto w-full bg-stone-950/60 p-3.5 border border-military rounded-lg flex items-start gap-3">
            <MapIcon size={20} className="text-[#76a035] flex-shrink-0 mt-0.5" />
            <div className="font-mono text-[10px] min-w-0">
              <div className="text-[#76a035] font-black uppercase tracking-wider mb-0.5">
                Active Arena
              </div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                {activeMap.name}
                <span className="text-stone-500 font-normal ml-2 text-[10px]">
                  {activeMap.location}
                </span>
              </div>
              <p className="text-[9px] text-stone-400 font-sans mt-1 leading-relaxed">
                {activeMap.description}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[9px] text-stone-500">
                <span className="flex items-center gap-1">
                  <Flag size={10} className="text-amber-500" /> Capture / Wipe
                  to win round
                </span>
                <span className="flex items-center gap-1">
                  <Crosshair size={10} className="text-red-400" /> First to 5
                  rounds
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map selector drawer */}
      {placeOpen && (
        <div className="lobby-panel animate-in slide-in-from-bottom duration-200">
          <div className="lobby-panel-header">
            <span className="lobby-panel-title">Select Arena</span>
            <button
              onClick={() => setPlaceOpen(false)}
              className="text-stone-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono">
            {GAME_MAPS.map((map) => (
              <button
                key={map.name}
                onClick={() => {
                  onUpdatePlace(map);
                  setPlaceOpen(false);
                }}
                className={`p-3 border rounded text-left transition-all ${
                  activeMap.name === map.name
                    ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                    : "border-military bg-stone-900/40 hover:bg-stone-950 hover:border-stone-500"
                }`}
              >
                <div className="text-xs uppercase text-white tracking-wider">
                  {map.name}
                </div>
                <div className="text-[8px] text-[#76a035] font-bold mt-1 uppercase">
                  {map.location}
                </div>
                <p className="text-[9px] text-stone-400 font-sans mt-2 leading-relaxed">
                  {map.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Start Button ── */}
      <div className="offline-lobby__start flex justify-center pt-1 mt-auto">
        <button
          onClick={() => onLaunchGame(buildTeamConfig())}
          className="lobby-btn-primary w-full md:w-1/2 flex items-center justify-center gap-3 text-lg px-8 py-4 rounded-lg"
        >
          <Gamepad2 size={22} />
          Start Game
        </button>
      </div>
    </div>
  );
}
