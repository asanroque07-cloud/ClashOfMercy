// CustomLobby.jsx is the "custom game" room where you fine-tune the rules
// yourself (map, team sizes, bots, and other match settings) before starting a
// private match.
import { useState } from "react";
import {
  X,
  Shield,
  Sword,
  MapPin,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Bot,
  RotateCcw,
} from "lucide-react";
import { GAME_MAPS, ADMIRALS_AVATARS } from "@/lib/lobbyData";

// Maximum players per team. The actual team SIZE is adjustable via the steppers
// below — this is just the hard cap so the slots never overflow.
const MAX_TEAM_SIZE = 5;

// Names used when auto-filling empty team slots with AI bots.
const BOT_NAMES_BLUE = ["Ghost", "Viper", "Thorn", "Rook"];
const BOT_NAMES_RED = ["Ares", "Blaze", "Reaper", "Spectre"];

function PlayerSlot({ player, team, onRemove, isHost }) {
  const borderColor =
    team === "alpha" ? "border-emerald-500/70" : "border-red-500/70";
  const bgColor = team === "alpha" ? "bg-emerald-950/40" : "bg-red-950/40";
  const textColor = team === "alpha" ? "text-emerald-400" : "text-red-400";
  const emptyBorder =
    team === "alpha" ? "border-emerald-900/50" : "border-red-900/50";

  return (
    <div className="flex justify-center">
      {player ? (
        <div
          className={`custom-lobby__slot relative w-[88px] h-[88px] border-2 ${borderColor} ${bgColor} rounded flex flex-col items-center justify-center gap-1 shadow-lg`}
        >
          <div
            className={`w-9 h-9 rounded-full border ${borderColor} flex items-center justify-center font-mono font-black text-lg ${textColor}`}
          >
            {player.name[0]}
          </div>
          <div className="font-mono text-[9px] font-bold text-stone-300 text-center px-1 leading-tight truncate w-full text-center">
            {player.name}
          </div>
          <div className="font-mono text-[8px] text-stone-500">
            {player.isAI ? "AI" : `LVL ${player.level ?? 0}`}
          </div>
          {isHost && (
            <div
              className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${team === "alpha" ? "bg-emerald-700 text-emerald-100" : "bg-red-700 text-red-100"}`}
            >
              HOST
            </div>
          )}
          {player.isAI && (
            <div
              className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${team === "alpha" ? "bg-emerald-800 text-emerald-200" : "bg-red-800 text-red-200"}`}
            >
              BOT
            </div>
          )}
          {onRemove && !isHost && (
            <button
              onClick={onRemove}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center hover:bg-red-900 hover:border-red-500 transition-colors cursor-pointer"
            >
              <X size={8} className="text-stone-400" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`custom-lobby__slot w-[88px] h-[88px] border-2 border-dashed ${emptyBorder} rounded flex items-center justify-center opacity-40`}
        >
          <span className="text-stone-600 text-2xl font-light">+</span>
        </div>
      )}
    </div>
  );
}

// A compact +/- stepper for choosing each team's size (1–5 players).
function TeamSizeStepper({ label, value, onChange, accent }) {
  const accentColor =
    accent === "blue" ? "#60a5fa" : accent === "red" ? "#f87171" : "#76a035";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="font-mono text-[9px] font-black uppercase tracking-widest"
        style={{ color: accentColor }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="w-7 h-7 rounded border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          <Minus size={11} />
        </button>
        <span
          className="font-mono font-black text-xl w-5 text-center"
          style={{ color: accentColor }}
        >
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(MAX_TEAM_SIZE, value + 1))}
          disabled={value >= MAX_TEAM_SIZE}
          className="w-7 h-7 rounded border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

// This is the "Custom Match" screen: set each team's size, drag friends into
// either team's slots (or auto-fill with bots), pick a map, then start.
export function CustomLobby({
  profile,
  weapons,
  activeMap,
  friends,
  onUpdatePlace,
  onLaunchGame,
}) {
  void weapons; // reserved for a future per-player loadout preview

  // Each team's roster is an array sized to the chosen team size. Slot 0 on
  // Alpha is always the host (you); every other slot starts empty and can be
  // filled with a friend or an AI bot.
  const [teamSize, setTeamSize] = useState({ alpha: 3, bravo: 3 });
  const [teamAlpha, setTeamAlpha] = useState([
    { id: "host", name: profile.name, level: profile.level, isHost: true },
    null,
    null,
  ]);
  const [teamBravo, setTeamBravo] = useState([null, null, null]);
  const [mapOpen, setMapOpen] = useState(false);

  // When the team size changes we grow or shrink the roster array, preserving
  // any players already placed and keeping the host in Alpha slot 0.
  const resizeTeam = (team, newSize) => {
    setTeamSize((prev) => ({ ...prev, [team]: newSize }));
    if (team === "alpha") {
      setTeamAlpha((prev) => {
        const next = [...prev];
        if (newSize > next.length) {
          while (next.length < newSize) next.push(null);
        } else {
          next.length = newSize;
        }
        // Always re-anchor the host at slot 0.
        if (!next[0] || !next[0].isHost) {
          next[0] = {
            id: "host",
            name: profile.name,
            level: profile.level,
            isHost: true,
          };
        }
        return next;
      });
    } else {
      setTeamBravo((prev) => {
        const next = [...prev];
        if (newSize > next.length) {
          while (next.length < newSize) next.push(null);
        } else {
          next.length = newSize;
        }
        return next;
      });
    }
  };

  const invitedIds = new Set([
    ...teamAlpha.filter(Boolean).map((p) => p.id),
    ...teamBravo.filter(Boolean).map((p) => p.id),
  ]);

  const availableFriends = friends.filter(
    (f) =>
      (f.status === "online" || f.status === "lobby") && !invitedIds.has(f.id),
  );

  const addToTeam = (friend, team) => {
    const player = {
      id: friend.id,
      name: friend.name,
      level: friend.level,
    };
    const setTeam = team === "alpha" ? setTeamAlpha : setTeamBravo;
    setTeam((prev) => {
      const emptyIdx = prev.findIndex((s) => s === null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = player;
      return next;
    });
  };

  const removeFromTeam = (team, idx) => {
    const setTeam = team === "alpha" ? setTeamAlpha : setTeamBravo;
    setTeam((prev) => {
      const n = [...prev];
      // Never remove the host from Alpha.
      if (team === "alpha" && n[idx]?.isHost) return prev;
      n[idx] = null;
      return n;
    });
  };

  // Fills every empty slot on a team with an AI bot.
  const fillBots = (team) => {
    const names = team === "alpha" ? BOT_NAMES_BLUE : BOT_NAMES_RED;
    const setTeam = team === "alpha" ? setTeamAlpha : setTeamBravo;
    setTeam((prev) => {
      let botIdx = 0;
      return prev.map((slot) => {
        if (slot) return slot;
        const used = new Set(prev.filter(Boolean).map((p) => p.name));
        let nm = names[botIdx % names.length];
        while (used.has(nm)) {
          botIdx++;
          nm = names[botIdx % names.length];
        }
        botIdx++;
        return { id: `bot_${team}_${Date.now()}_${botIdx}`, name: nm, isAI: true };
      });
    });
  };

  // Removes all non-host players from a team.
  const clearTeam = (team) => {
    if (team === "alpha") {
      setTeamAlpha((prev) =>
        prev.map((slot, i) =>
          i === 0
            ? { id: "host", name: profile.name, level: profile.level, isHost: true }
            : null,
        ),
      );
    } else {
      setTeamBravo((prev) => prev.map(() => null));
    }
  };

  const alphaCount = teamAlpha.filter(Boolean).length;
  const bravoCount = teamBravo.filter(Boolean).length;
  const totalPlayers = alphaCount + bravoCount;
  const canStart = alphaCount >= 1 && bravoCount >= 1;

  // Build the team config handed to GameCanvas. Only FILLED slots are included,
  // so a 2v2 setup produces exactly 2 players per team in the match.
  const buildTeamConfig = () => {
    const blue = teamAlpha
      .filter(Boolean)
      .map((p) => ({ name: p.name, isAI: !!p.isAI, isHost: !!p.isHost }));
    const red = teamBravo
      .filter(Boolean)
      .map((p) => ({ name: p.name, isAI: !!p.isAI }));
    return { blue, red };
  };

  return (
    <div
      className="custom-lobby h-full min-h-0 overflow-hidden w-full flex flex-col select-none animate-in fade-in duration-300 text-stone-100"
      style={{ background: "oklch(0.10 0.018 120)" }}
    >
      {/* Top header bar */}
      <div className="custom-lobby__header flex flex-none items-center gap-0 border-b border-stone-800 bg-stone-950/70 px-4 py-2">
        <div className="font-mono font-black text-sm tracking-widest uppercase text-[#76a035] px-3 py-1 border border-[#76a035]/40 bg-[#76a035]/10 rounded mr-4">
          CUSTOM
        </div>
        <div className="flex items-center gap-1 px-3 py-1 border border-stone-700 bg-stone-900/50 rounded mr-2 font-mono text-[10px] text-stone-400 uppercase font-bold tracking-wider">
          <Shield size={11} className="text-emerald-500" /> {alphaCount}/
          {teamSize.alpha}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 font-mono text-[10px] text-stone-500 uppercase">
          <MapPin size={11} className="text-[#76a035]" />
          <span className="text-stone-300 font-bold">{activeMap.name}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-3 py-1 border border-stone-700 bg-stone-900/50 rounded ml-2 font-mono text-[10px] text-stone-400 uppercase font-bold tracking-wider">
          <Sword size={11} className="text-red-500" /> {bravoCount}/
          {teamSize.bravo}
        </div>
        <div className="font-mono font-black text-[10px] tracking-widest uppercase text-stone-500 px-3 py-1 border border-stone-800 rounded ml-4">
          {totalPlayers} PLAYERS
        </div>
      </div>

      {/* Main content */}
      <div className="custom-lobby__main flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_240px] gap-3 px-3 py-3">
        {/* Team Alpha + VS + Team Bravo */}
        <div className="custom-lobby__teams min-w-0 grid grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)] items-stretch min-h-0">
          {/* Team Alpha (left) */}
          <div className="custom-lobby__team min-w-0 flex flex-col justify-between py-2 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                <Shield size={10} /> TEAM ALPHA
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fillBots("alpha")}
                  title="Fill empty slots with bots"
                  className="flex items-center gap-1 text-[8px] font-mono font-black uppercase px-2 py-1 rounded border border-emerald-800 text-emerald-400 hover:bg-emerald-900/40 cursor-pointer transition-colors"
                >
                  <Bot size={9} /> Fill
                </button>
                <button
                  onClick={() => clearTeam("alpha")}
                  title="Clear team (keep host)"
                  className="flex items-center gap-1 text-[8px] font-mono font-black uppercase px-2 py-1 rounded border border-stone-700 text-stone-400 hover:bg-stone-800/60 cursor-pointer transition-colors"
                >
                  <RotateCcw size={9} /> Clear
                </button>
              </div>
            </div>
            <div className="custom-lobby__roster flex flex-1 flex-wrap content-center justify-center gap-2 min-h-0 overflow-y-auto py-1">
              {teamAlpha.map((player, i) => (
                <PlayerSlot
                  key={i}
                  player={player}
                  team="alpha"
                  isHost={player?.isHost}
                  onRemove={
                    player && !player.isHost
                      ? () => removeFromTeam("alpha", i)
                      : undefined
                  }
                />
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              <TeamSizeStepper
                label="Team Size"
                value={teamSize.alpha}
                accent="blue"
                onChange={(v) => resizeTeam("alpha", v)}
              />
            </div>
          </div>

          {/* VS center */}
          <div className="custom-lobby__versus flex flex-col items-center justify-center px-2 gap-4 min-w-0">
            <div
              className="font-black text-5xl tracking-widest select-none"
              style={{
                color: "#76a035",
                textShadow:
                  "0 0 20px rgba(118,160,53,0.5), 0 0 40px rgba(118,160,53,0.2)",
                fontFamily: "monospace",
              }}
            >
              VS
            </div>
            <div className="text-center">
              <div className="font-mono text-[8px] text-stone-500 uppercase tracking-widest mb-1">
                {alphaCount} v {bravoCount}
              </div>
              <button
                onClick={() => canStart && onLaunchGame(buildTeamConfig())}
                disabled={!canStart}
                className="px-6 py-3 bg-[#76a035] hover:bg-[#8bc342] active:scale-95 text-black font-mono font-black text-sm uppercase tracking-widest rounded border border-[#9acd50] shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 0 16px rgba(118,160,53,0.35)" }}
              >
                START
              </button>
              {!canStart && (
                <div className="font-mono text-[7px] text-stone-500 uppercase mt-1.5">
                  Each team needs 1+
                </div>
              )}
            </div>
          </div>

          {/* Team Bravo (right) */}
          <div className="custom-lobby__team min-w-0 flex flex-col justify-between py-2 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => clearTeam("bravo")}
                  title="Clear team"
                  className="flex items-center gap-1 text-[8px] font-mono font-black uppercase px-2 py-1 rounded border border-stone-700 text-stone-400 hover:bg-stone-800/60 cursor-pointer transition-colors"
                >
                  <RotateCcw size={9} /> Clear
                </button>
                <button
                  onClick={() => fillBots("bravo")}
                  title="Fill empty slots with bots"
                  className="flex items-center gap-1 text-[8px] font-mono font-black uppercase px-2 py-1 rounded border border-red-800 text-red-400 hover:bg-red-900/40 cursor-pointer transition-colors"
                >
                  <Bot size={9} /> Fill
                </button>
              </div>
              <div className="font-mono text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center justify-end gap-1">
                TEAM BRAVO <Sword size={10} />
              </div>
            </div>
            <div className="custom-lobby__roster flex flex-1 flex-wrap content-center justify-center gap-2 min-h-0 overflow-y-auto py-1">
              {teamBravo.map((player, i) => (
                <PlayerSlot
                  key={i}
                  player={player}
                  team="bravo"
                  onRemove={
                    player ? () => removeFromTeam("bravo", i) : undefined
                  }
                />
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              <TeamSizeStepper
                label="Team Size"
                value={teamSize.bravo}
                accent="red"
                onChange={(v) => resizeTeam("bravo", v)}
              />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="custom-lobby__sidebar min-w-0 flex flex-col gap-3 min-h-0">
          {/* Friend list */}
          <div className="flex-1 min-h-0 border border-stone-700 rounded overflow-hidden flex flex-col bg-stone-950/60">
            <div className="px-3 py-2 bg-stone-900/60 border-b border-stone-700 font-mono text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1">
              <UserPlus size={10} /> FRIEND LIST
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
              {availableFriends.length === 0 ? (
                <div className="text-center py-6 text-stone-600 font-mono text-[9px] uppercase">
                  {friends.filter(
                    (f) => f.status === "online" || f.status === "lobby",
                  ).length === 0
                    ? "No friends online"
                    : "All friends invited"}
                </div>
              ) : (
                availableFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="border border-stone-800 bg-stone-900/40 rounded p-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center font-mono text-[9px] font-black text-stone-300">
                        {friend.name[0]}
                      </div>
                      <div>
                        <div className="font-mono text-[9px] font-bold text-stone-200 leading-none">
                          {friend.name}
                        </div>
                        <div className="font-mono text-[8px] text-stone-500">
                          LVL {friend.level}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => addToTeam(friend, "alpha")}
                        disabled={teamAlpha.every((s) => s !== null)}
                        className="flex-1 text-[8px] font-mono font-black uppercase py-1 rounded border border-emerald-800 text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        α
                      </button>
                      <button
                        onClick={() => addToTeam(friend, "bravo")}
                        disabled={teamBravo.every((s) => s !== null)}
                        className="flex-1 text-[8px] font-mono font-black uppercase py-1 rounded border border-red-800 text-red-400 hover:bg-red-900/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        β
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Place selection */}
          <div className="border border-stone-700 rounded overflow-hidden bg-stone-950/60">
            <button
              onClick={() => setMapOpen((o) => !o)}
              className="w-full px-3 py-2 bg-stone-900/60 border-b border-stone-700 font-mono text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center justify-between cursor-pointer hover:bg-stone-800/60 transition-colors"
            >
              <span className="flex items-center gap-1">
                <MapPin size={10} /> PLACE
              </span>
              {mapOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            <div className="px-3 py-2">
              <div className="font-mono text-[9px] font-bold text-[#76a035] uppercase mb-0.5">
                {activeMap.name}
              </div>
              <div className="font-mono text-[8px] text-stone-500">
                {activeMap.location}
              </div>
            </div>
            {mapOpen && (
              <div className="border-t border-stone-800 max-h-48 overflow-y-auto">
                {GAME_MAPS.map((map) => (
                  <button
                    key={map.name}
                    onClick={() => {
                      onUpdatePlace(map);
                      setMapOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 border-b border-stone-800/50 last:border-0 transition-colors cursor-pointer ${
                      activeMap.name === map.name
                        ? "bg-[#76a035]/15 text-[#76a035]"
                        : "hover:bg-stone-800/50 text-stone-400"
                    }`}
                  >
                    <div className="font-mono text-[9px] font-bold uppercase">
                      {map.name}
                    </div>
                    <div className="font-mono text-[8px] text-stone-600">
                      {map.location}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
