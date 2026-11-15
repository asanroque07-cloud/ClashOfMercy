// ClassicLobby.jsx is the pre-match screen for a normal (unranked) game. It lets
// you build your squad, pick a map, and press play to start matchmaking.
import { useState } from "react";
import { UserMinus, Plus, X, Crosshair, Bot, Users, Map as MapIcon } from "lucide-react";
import { ADMIRALS_AVATARS, GAME_MAPS } from "@/lib/lobbyData";

// this is for picking the small emoji shown next to a squad member's name based on their combat role
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

// This is the "Classic" game-mode lobby: shows the 5-player squad cards and map picker before
// the player queues into a classic match.
export function ClassicLobby({
  profile,
  friends,
  squad,
  activeMap,
  onRemoveSquadMember,
  onInviteFriend,
  onUpdatePlace,
  onFindMatch,
}) {
  const [mapOpen, setMapOpen] = useState(false); // whether the map-picker drawer is expanded
  const currentAvatar =
    ADMIRALS_AVATARS.find((a) => a.id === profile.avatarId) ||
    ADMIRALS_AVATARS[0];

  // `friends`/`onInviteFriend` are accepted for API parity with other lobbies but this squad view
  // is currently read-only (no invite UI here yet), so they're intentionally unused for now.
  void friends;
  void onInviteFriend;

  const onlineFriends = friends.filter(
    (f) => f.status === "online" || f.status === "lobby",
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto flex flex-col gap-4 short:gap-2.5 w-full select-none animate-in fade-in duration-300">
      {/* Classic banner */}
      <div className="lobby-panel flex items-center gap-3 px-4 py-3">
        <Crosshair size={20} className="text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-widest text-amber-400 uppercase">
            Classic Quick Match
          </div>
          <div className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
            Open matchmaking — {squad.length}/4 squad slots ·{" "}
            {onlineFriends.length} friends online
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-950/20 border border-amber-500/30 px-3 py-1.5 rounded">
          <Users size={14} className="text-amber-400" />
          <div className="font-mono text-left">
            <div className="text-[8px] text-stone-400 uppercase">Squad</div>
            <div className="text-xs font-bold text-amber-400">
              {squad.length}/4
            </div>
          </div>
        </div>
      </div>

      {/* 5-player squad cards */}
      <div className="grid grid-cols-5 gap-2.5">
        {/* Leader slot */}
        <div className="lobby-panel p-2.5 flex flex-col justify-between items-center text-center h-44 lg:h-48 short:h-40 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-emerald-500" />
          <div className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded uppercase tracking-wider">
            SQUAD LEADER
          </div>
          <div className="relative my-2">
            <div className="w-14 h-14 lg:w-16 lg:h-16 short:w-11 short:h-11 rounded-full border-2 border-emerald-500/60 overflow-hidden bg-stone-950">
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
          <div className="bg-white/5 border border-military/40 rounded px-2 py-0.5 text-[9px] text-[#76a035] flex items-center gap-1 font-bold">
            ⚔ {profile.rankName} {profile.rankTier}
          </div>
        </div>

        {/* Slots 2-5 */}
        {[0, 1, 2, 3].map((index) => {
          const member = squad[index];
          if (member) {
            const mbAvatar =
              ADMIRALS_AVATARS.find((a) => a.id === member.avatarId) ||
              ADMIRALS_AVATARS[0];
            return (
              <div
                key={member.id}
                className="lobby-panel p-2.5 flex flex-col justify-between items-center text-center h-44 lg:h-48 short:h-40 relative group transition-all hover:border-emerald-500/40"
              >
                <div className="text-[8px] font-mono font-bold bg-stone-950 px-1.5 py-0.5 border border-military/30 rounded uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Users size={8} /> TEAMMATE
                </div>
                <div className="relative my-2">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 short:w-11 short:h-11 rounded-full border border-military/60 overflow-hidden bg-stone-950">
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
                  className="absolute top-2 right-2 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 bg-red-950/40 border border-red-500/30 text-red-400 p-1 rounded hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                >
                  <UserMinus size={11} />
                </button>
              </div>
            );
          }
          return (
            <div
              key={`empty-${index}`}
              className="border-2 border-dashed border-military/40 bg-stone-900/5 hover:bg-stone-900/20 p-3 rounded flex flex-col items-center justify-center text-center h-44 lg:h-48 short:h-40 transition-all"
            >
              <Plus size={22} className="text-[#76a035]/40 mb-2 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase leading-normal">
                Empty Slot
              </span>
              <span className="text-[8px] font-mono text-stone-600 mt-1 uppercase max-w-[80px] break-words">
                Invite a friend →
              </span>
            </div>
          );
        })}
      </div>

      {/* Map + Mode info banner */}
      <div className="lobby-panel p-3 flex items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#76a035]/8 to-transparent pointer-events-none" />
        <div className="flex items-start gap-3">
          <MapIcon size={20} className="text-[#76a035] flex-shrink-0 mt-0.5" />
          <div className="font-mono space-y-1">
            <div className="text-[#76a035] text-xs font-bold uppercase tracking-wider">
              Classic Mode
            </div>
            <div className="text-[10px] text-stone-400 font-sans max-w-md">
              Open matchmaking — any weapon, any role. Fill your squad or queue
              solo.
            </div>
            <div className="text-[10px] text-stone-300 font-mono">
              Map:{" "}
              <span className="text-[#76a035] font-bold">{activeMap.name}</span>
              <span className="text-stone-600 mx-1">·</span>
              <span className="text-stone-500">{activeMap.location}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMapOpen((v) => !v)}
          className="lobby-btn-ghost flex-shrink-0 text-[10px] px-3 py-1.5 rounded whitespace-nowrap"
        >
          🗺 Change Map
        </button>
      </div>

      {/* Map selector drawer */}
      {mapOpen && (
        <div className="lobby-panel animate-in slide-in-from-bottom duration-200">
          <div className="lobby-grid-bg p-4">
            <div className="flex justify-between items-center border-b border-military/30 pb-2 mb-3">
              <h4 className="lobby-panel-title">Select Arena</h4>
              <button
                onClick={() => setMapOpen(false)}
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
                    setMapOpen(false);
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
        </div>
      )}

      {/* Find match button */}
      <div className="flex justify-center pt-1 mt-auto">
        <button
          onClick={onFindMatch}
          className="lobby-btn-primary w-full md:w-1/2 flex items-center justify-center gap-3 text-base py-3.5 short:py-2.5 rounded-lg flex-shrink-0"
        >
          🎯 Find Match
        </button>
      </div>
    </div>
  );
}
