// RankLobby.jsx is the pre-match screen for ranked play. It works like the
// classic lobby (squad, role, map) but also shows your competitive rank and
// leads into the ranked queue.
import { useState } from "react";
import {
  Compass,
  Plus,
  X,
  UserMinus,
  Trophy,
  Bot,
  Crown,
  Zap,
} from "lucide-react";
import { ADMIRALS_AVATARS, GAME_MAPS } from "@/lib/lobbyData";

// This is the "Ranked" game-mode lobby: lets the player pick a role and map, fill empty squad
// slots with AI bots, and launch into the ranked matchmaking queue.
export function RankLobby({
  profile,
  friends,
  squad,
  activeMap,
  onAddBotToSquad,
  onRemoveSquadMember,
  onUpdateRole,
  onUpdatePlace,
  onLaunchQueue,
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case "Core":
        return "👑";
      case "Sniper":
        return "🎯";
      case "Marksman":
        return "🏹";
      case "Gunner":
        return "💥";
      case "Scout":
        return "👣";
    }
  };

  const currentAvatar =
    ADMIRALS_AVATARS.find((a) => a.id === profile.avatarId) ||
    ADMIRALS_AVATARS[0];

  const filledSlots = squad.length;

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 w-full select-none animate-in fade-in duration-300">
      {/* Ranked banner */}
      <div className="lobby-panel flex items-center gap-3 px-4 py-3">
        <Trophy size={20} className="text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-widest text-amber-400 uppercase">
            Ranked Combat Protocol
          </div>
          <div className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
            Competitive squad warfare — {filledSlots}/4 squad slots filled
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-500/40 px-3 py-1.5 rounded">
          <Crown size={14} className="text-amber-400" />
          <div className="font-mono text-left">
            <div className="text-[8px] text-stone-400 uppercase">Your Rank</div>
            <div className="text-xs font-bold text-amber-400">
              {profile.rankName} {profile.rankTier}
            </div>
          </div>
        </div>
      </div>

      {/* 5-player squad cards */}
      <div className="grid grid-cols-5 gap-2.5">
        {/* Leader slot */}
        <div className="lobby-panel p-2.5 flex flex-col justify-between items-center text-center h-44 lg:h-48 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-emerald-500" />
          <div className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
            <Crown size={8} /> LEADER
          </div>
          <div className="relative my-2">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full border-2 border-emerald-500/60 overflow-hidden bg-stone-950">
              <img
                src={currentAvatar.url}
                alt="Leader"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-black text-emerald-400 border border-emerald-500 font-mono text-[9px] px-1 font-bold rounded">
              LVL {profile.level}
            </div>
          </div>
          <div className="min-w-0 font-mono">
            <div className="text-white text-xs font-black truncate max-w-[100px]">
              {profile.name}
            </div>
            <div className="text-[10px] text-[#76a035] uppercase font-bold tracking-widest mt-0.5 flex items-center justify-center gap-1">
              <span>{getRoleBadge(profile.selectedRole)}</span>
              <span>{profile.selectedRole}</span>
            </div>
          </div>
          <div className="bg-white/5 border border-military/40 rounded px-2 py-0.5 text-[9px] text-amber-400 flex items-center gap-1 font-bold">
            ⚔ {profile.rankName} {profile.rankTier}
          </div>
        </div>

        {/* Slots 2-5 */}
        {[0, 1, 2, 3].map((index) => {
          const member = squad[index];
          if (member) {
            const isBot = "isBot" in member ? member.isBot : false;
            const mbAvatar =
              ADMIRALS_AVATARS.find((a) => a.id === member.avatarId) ||
              ADMIRALS_AVATARS[0];
            return (
              <div
                key={member.id}
                className="lobby-panel p-2.5 flex flex-col justify-between items-center text-center h-44 lg:h-48 relative group transition-all hover:border-emerald-500/40"
              >
                <div className="text-[8px] font-mono font-bold bg-stone-950 px-1.5 py-0.5 border border-military/30 rounded uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  {isBot ? (
                    <>
                      <Bot size={8} /> AI MERC
                    </>
                  ) : (
                    "TEAMMATE"
                  )}
                </div>
                <div className="relative my-2">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full border border-military/60 overflow-hidden bg-stone-950">
                    <img
                      src={mbAvatar.url}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-black text-stone-300 border border-military font-mono text-[9px] px-1 font-bold rounded">
                    LVL {member.level}
                  </div>
                </div>
                <div className="min-w-0 font-mono">
                  <div className="text-stone-200 text-xs truncate max-w-[100px] font-bold">
                    {member.name}
                  </div>
                  <div className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-0.5 flex items-center justify-center gap-1">
                    <span>{getRoleBadge(member.role)}</span>
                    <span>{member.role}</span>
                  </div>
                </div>
                <div className="bg-stone-950 border border-military/30 rounded px-2.5 py-0.5 text-[8px] font-mono text-stone-400">
                  {member.rankName} {member.rankTier}
                </div>
                <button
                  onClick={() => onRemoveSquadMember(member.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-950/40 border border-red-500/30 text-red-400 p-1 rounded hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                >
                  <UserMinus size={11} />
                </button>
              </div>
            );
          }
          return (
            <div
              key={`empty-${index}`}
              className="border-2 border-dashed border-military/40 bg-stone-900/5 hover:bg-stone-900/20 p-3 rounded flex flex-col items-center justify-center text-center h-44 lg:h-48 transition-all"
            >
              <Plus size={22} className="text-[#76a035]/40 mb-2 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase leading-normal">
                Empty Slot
              </span>
              <span className="text-[8px] font-mono text-stone-600 mt-1 uppercase max-w-[80px] break-words">
                Invite a friend →
              </span>
              <button
                onClick={onAddBotToSquad}
                className="lobby-btn-ghost mt-3 px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold"
              >
                + Add AI Bot
              </button>
            </div>
          );
        })}
      </div>

      {/* Map banner */}
      <div className="lobby-panel p-3 flex flex-col md:flex-row justify-between items-center gap-3 relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#76a035]/8 to-transparent pointer-events-none" />
        <div className="text-left font-mono space-y-1">
          <div className="text-[#76a035] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Compass size={14} /> Active Arena: {activeMap.name}
          </div>
          <div className="text-[10px] text-stone-400 max-w-xl font-sans">
            Location: {activeMap.location} — {activeMap.description}
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setPlaceOpen(!placeOpen)}
            className="lobby-btn-ghost flex-1 md:flex-initial px-4 py-2 rounded text-xs"
          >
            🗺 Map
          </button>
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className="lobby-btn-ghost flex-1 md:flex-initial px-4 py-2 rounded text-xs"
          >
            🎖 Role
          </button>
        </div>
      </div>

      {/* Selection drawers */}
      {(roleOpen || placeOpen) && (
        <div className="lobby-panel animate-in slide-in-from-bottom duration-200">
          <div className="lobby-grid-bg p-4">
            {roleOpen && (
              <div>
                <div className="flex justify-between items-center border-b border-military/30 pb-2 mb-3">
                  <h4 className="lobby-panel-title flex items-center gap-2">
                    <Zap size={14} className="text-[#76a035]" /> Fireteam Role
                    System
                  </h4>
                  <button
                    onClick={() => setRoleOpen(false)}
                    className="text-stone-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono">
                  {[
                    {
                      name: "Core",
                      desc: "All weapons. Balanced speed.",
                      icon: "👑",
                    },
                    {
                      name: "Sniper",
                      desc: "Sniper rifles only. Lethal long range.",
                      icon: "🎯",
                    },
                    {
                      name: "Marksman",
                      desc: "Marksman weapons. Mid-long support.",
                      icon: "🏹",
                    },
                    {
                      name: "Gunner",
                      desc: "Heavy guns. Maximum firepower.",
                      icon: "💥",
                    },
                    {
                      name: "Scout",
                      desc: "Silenced weapons. Stealth & recon.",
                      icon: "👣",
                    },
                  ].map((r) => (
                    <button
                      key={r.name}
                      onClick={() => {
                        onUpdateRole(r.name);
                        setRoleOpen(false);
                      }}
                      className={`p-3 border rounded text-left transition-all ${
                        profile.selectedRole === r.name
                          ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                          : "border-military bg-stone-900/40 hover:bg-stone-950 hover:border-stone-500"
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <span>{r.icon}</span>
                        <span>{r.name}</span>
                      </div>
                      <p className="text-[9px] text-stone-400 font-sans mt-2 leading-relaxed">
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {placeOpen && (
              <div className={roleOpen ? "mt-4 pt-4 border-t border-military/30" : ""}>
                <div className="flex justify-between items-center border-b border-military/30 pb-2 mb-3">
                  <h4 className="lobby-panel-title text-amber-400">
                    Deployment Arena Directory
                  </h4>
                  <button
                    onClick={() => setPlaceOpen(false)}
                    className="text-stone-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 font-mono">
                  {GAME_MAPS.map((map) => (
                    <button
                      key={map.name}
                      onClick={() => {
                        onUpdatePlace(map);
                        setPlaceOpen(false);
                      }}
                      className={`p-3 border rounded text-left transition-all ${
                        activeMap.name === map.name
                          ? "border-amber-500 bg-amber-950/20 text-amber-400"
                          : "border-military bg-stone-900/40 hover:bg-stone-950 hover:border-stone-500"
                      }`}
                    >
                      <div className="font-bold text-xs uppercase text-white tracking-widest">
                        {map.name}
                      </div>
                      <div className="text-[9px] text-[#76a035] font-bold mt-1 uppercase">
                        {map.location}
                      </div>
                      <p className="text-[9px] text-stone-400 font-sans mt-2.5 leading-snug">
                        {map.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-1 mt-auto">
        <button
          onClick={onLaunchQueue}
          className="lobby-btn-primary w-full md:w-1/2 flex items-center justify-center gap-3 text-base py-3.5 rounded-lg"
        >
          🚀 Start In-Queue Protocol
        </button>
      </div>
    </div>
  );
}
