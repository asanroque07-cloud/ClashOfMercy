// FriendList.jsx is the side panel that shows your friends, whether they're
// online, and lets you add or remove them. The add/remove actions are functions
// passed in from the parent, so this component only handles the display + clicks.
import { useState } from "react";
import { Users, Plus, X } from "lucide-react";
import { ADMIRALS_AVATARS } from "@/lib/lobbyData";

// This shows the player's friends list in the lobby sidebar, with a small form to add a made-up
// friend (for demo purposes, since there's no real backend) and buttons to invite them to a squad.
export function FriendList({
  friends,
  onAddFriend,
  onRemoveFriend,
  onInviteToSquad,
  canInvite = false,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedRole, setSelectedRole] = useState("Core");
  const [selectedRank, setSelectedRank] = useState("Gold");

  // this is for submitting the "add friend" form: builds a fake friend with a random avatar/level, then adds it
  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const randomAvatar =
      ADMIRALS_AVATARS[Math.floor(Math.random() * ADMIRALS_AVATARS.length)].id;
    const randomLevel = Math.floor(Math.random() * 40) + 5;
    const newFriend = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      avatarId: randomAvatar,
      level: randomLevel,
      rankName: selectedRank,
      rankTier: Math.floor(Math.random() * 4) + 1,
      status: "online",
      role: selectedRole,
      isCustom: true,
    };
    onAddFriend(newFriend);
    setNewName("");
    setIsAdding(false);
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case "online":
        return { color: "bg-emerald-500", text: "online" };
      case "playing":
        return { color: "bg-blue-500", text: "in combat" };
      case "lobby":
        return { color: "bg-yellow-500", text: "in lobby" };
      case "offline":
        return { color: "bg-stone-600", text: "offline" };
    }
  };

  return (
    <div className="friend-list bg-stone-950/80 border border-military text-stone-100 flex flex-col h-full min-h-0 rounded overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#76a035]/60 to-transparent" />

      <div className="friend-list__header p-3 bg-zinc-900/60 border-b border-military flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#76a035]" />
          <span className="font-display text-sm font-bold tracking-widest text-[#76a035]">
            FRIEND LIST
          </span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[#76a035] hover:text-white bg-[#76a035]/10 hover:bg-[#76a035]/35 p-1 rounded transition-all cursor-pointer"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-3 bg-zinc-950 border-b border-military font-mono text-[11px] space-y-2.5"
        >
          <div>
            <label className="block text-stone-400 mb-1 font-bold">
              NICKNAME ID
            </label>
            <input
              type="text"
              required
              maxLength={15}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-stone-900 border border-military/60 rounded px-2 py-1 text-white focus:outline-none focus:border-[#76a035]"
              placeholder="Sgt_Miller"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-stone-400 mb-1 font-bold">
                ROLE
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-stone-900 border border-military/60 rounded px-1.5 py-1 text-stone-300 focus:outline-none"
              >
                <option value="Core">Core</option>
                <option value="Sniper">Sniper</option>
                <option value="Marksman">Marksman</option>
                <option value="Gunner">Gunner</option>
                <option value="Scout">Scout</option>
              </select>
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-bold">
                MIL-RANK
              </label>
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className="w-full bg-stone-900 border border-military/60 rounded px-1.5 py-1 text-stone-300 focus:outline-none"
              >
                {[
                  "Bronze",
                  "Silver",
                  "Gold",
                  "Platinum",
                  "Diamond",
                  "Master",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-[#76a035] hover:bg-[#86b53b] text-stone-950 font-bold py-1.5 rounded transition-all tracking-wider uppercase text-[10px]"
          >
            ADD COMRADE
          </button>
        </form>
      )}

      <div className="friend-list__items flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 select-none">
        {friends.length === 0 ? (
          <div className="text-center py-12 text-stone-600 font-mono text-[10px]">
            — SQUAD VACANT —<br />
            NO ACTIVE COMPEERS
          </div>
        ) : (
          friends.map((friend) => {
            const status = getStatusDetails(friend.status);
            const friAvatar =
              ADMIRALS_AVATARS.find((a) => a.id === friend.avatarId) ||
              ADMIRALS_AVATARS[0];
            return (
              <div
                key={friend.id}
                className="friend-list__item p-2 border border-military bg-stone-900/30 hover:bg-stone-900/60 rounded flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2 max-w-[70%]">
                  <div className="relative flex-shrink-0">
                    <img
                      src={friAvatar.url}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded object-cover border border-military"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border border-stone-950 ${status.color}`}
                    ></span>
                  </div>
                  <div className="min-w-0 font-mono text-[11px] leading-tight text-left">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-stone-200 truncate block max-w-[85px]">
                        {friend.name}
                      </span>
                      <span className="text-[9px] text-[#76a035]">
                        L{friend.level}
                      </span>
                    </div>
                    <div className="text-[9px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                      <span className="text-stone-500">{friend.role}</span>
                      <span>•</span>
                      <span className="truncate max-w-[50px]">
                        {friend.rankName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {canInvite &&
                    onInviteToSquad &&
                    (friend.status === "online" ||
                      friend.status === "lobby") && (
                      <button
                        onClick={() => onInviteToSquad(friend)}
                        className="bg-[#76a035]/20 hover:bg-[#76a035] text-[#76a035] hover:text-stone-950 border border-military-active px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-colors"
                      >
                        Invite
                      </button>
                    )}
                  <button
                    onClick={() => onRemoveFriend(friend.id)}
                    className="text-stone-600 hover:text-red-500 p-1 hover:bg-red-950/15 rounded transition-all cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="friend-list__footer p-2 border-t border-military bg-stone-900/25 font-mono text-[9px] text-stone-500 text-center tracking-widest uppercase">
        ACTIVE INTEL FEED CONNECTED
      </div>
    </div>
  );
}
