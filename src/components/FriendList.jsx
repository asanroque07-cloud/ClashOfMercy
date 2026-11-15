import { useState } from "react";
import { Users, Plus, X, Search, UserPlus, Check, Send } from "lucide-react";
import { ADMIRALS_AVATARS } from "@/lib/lobbyData";

export function FriendList({
  friends = [],
  incomingRequests = [],
  accountConnected,
  cloudConfigured,
  onSearchPlayer,
  onSendFriendRequest,
  onAcceptRequest,
  onRemoveFriend,
  onInviteFriend,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [username, setUsername] = useState("");
  const [foundPlayers, setFoundPlayers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const searchPlayer = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    setFoundPlayers([]);
    try {
      const results = await onSearchPlayer(username);
      setFoundPlayers(results);
      if (results.length === 0) setMessage("No players matched that search.");
    } catch (error) {
      setMessage(error.message);
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = async (player) => {
    if (!player) return;
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    try {
      await onSendFriendRequest(player.id);
      setMessage(`Friend request sent to ${player.name}.`);
      setFoundPlayers((players) =>
        players.filter((foundPlayer) => foundPlayer.id !== player.id),
      );
    } catch (error) {
      setMessage(error.message);
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
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
      default:
        return { color: "bg-stone-600", text: "status unavailable" };
    }
  };

  return (
    <div className="friend-list bg-stone-950/80 border border-military text-stone-100 flex flex-col h-full min-h-0 rounded overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#76a035]/60 to-transparent" />

      <div className="friend-list__header p-3 bg-zinc-900/60 border-b border-military flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#76a035]" />
          <span className="font-display text-sm font-bold tracking-widest text-[#76a035]">
            FRIEND LIST
          </span>
          {incomingRequests.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 text-[9px] font-mono font-bold text-black">
              {incomingRequests.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding((open) => !open);
            setMessage("");
            setFoundPlayers([]);
          }}
          aria-label={isAdding ? "Close add friend" : "Find a player"}
          className="text-[#76a035] hover:text-white bg-[#76a035]/10 hover:bg-[#76a035]/35 p-1 rounded transition-all cursor-pointer"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {isAdding && (
        <div className="p-3 bg-zinc-950 border-b border-military font-mono text-[11px] space-y-2.5">
          {!cloudConfigured ? (
            <p className="text-amber-300">
              Cloud friends need a Supabase project. Add its URL and publishable
              key, then connect Google in Settings.
            </p>
          ) : !accountConnected ? (
            <p className="text-amber-300">
              Connect Google in Settings to find and add real players.
            </p>
          ) : (
            <>
              <form onSubmit={searchPlayer} className="space-y-2">
                <label
                  htmlFor="friend-player-search"
                  className="block text-stone-400 font-bold"
                >
                  DISPLAY NAME, USERNAME, OR USER ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="friend-player-search"
                    type="text"
                    required
                    maxLength={80}
                    autoComplete="off"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="min-w-0 flex-1 bg-stone-900 border border-military/60 rounded px-2 py-1 text-white focus:outline-none focus:border-[#76a035]"
                    placeholder="name, username, or full user ID"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    aria-label="Search players"
                    className="border border-military-active text-[#76a035] px-2 rounded disabled:opacity-50"
                  >
                    <Search size={14} />
                  </button>
                </div>
              </form>

              {foundPlayers.length > 0 && (
                <div className="space-y-2">
                  {foundPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-2 border border-military bg-stone-900/60 p-2 rounded"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-bold text-stone-100">
                          {player.name}
                        </div>
                        <div className="truncate text-[9px] text-stone-500">
                          @{player.username}
                        </div>
                        <div
                          className="truncate text-[8px] text-stone-600"
                          title={player.id}
                        >
                          ID {player.id}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => sendRequest(player)}
                        disabled={busy}
                        className="flex items-center gap-1 bg-[#76a035] px-2 py-1 rounded text-[9px] font-bold text-black disabled:opacity-50"
                      >
                        <UserPlus size={12} /> ADD
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {message && (
            <p
              role="status"
              className={messageIsError ? "text-red-300" : "text-emerald-300"}
            >
              {message}
            </p>
          )}
        </div>
      )}

      <div className="friend-list__items flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 select-none">
        {incomingRequests.map((request) => {
          const avatar =
            ADMIRALS_AVATARS.find((item) => item.id === request.avatarId) ||
            ADMIRALS_AVATARS[0];
          return (
            <div
              key={request.id}
              className="flex items-center justify-between gap-2 border border-amber-500/30 bg-amber-950/10 p-2 rounded"
            >
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={avatar.url}
                  alt=""
                  className="h-8 w-8 rounded border border-military object-cover"
                />
                <div className="min-w-0 font-mono text-[10px]">
                  <div className="truncate font-bold">{request.name}</div>
                  <div className="truncate text-stone-500">
                    @{request.username} · request
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAcceptRequest(request.id)}
                className="flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-[9px] font-bold text-white"
              >
                <Check size={11} /> ACCEPT
              </button>
            </div>
          );
        })}

        {friends.length === 0 && incomingRequests.length === 0 ? (
          <div className="text-center py-12 text-stone-600 font-mono text-[10px]">
            — SQUAD VACANT —<br />
            {accountConnected ? "NO FRIENDS YET" : "CONNECT TO FIND PLAYERS"}
          </div>
        ) : (
          friends.map((friend) => {
            const status = getStatusDetails(friend.status);
            const avatar =
              ADMIRALS_AVATARS.find((item) => item.id === friend.avatarId) ||
              ADMIRALS_AVATARS[0];
            return (
              <div
                key={friend.id}
                className="friend-list__item p-2 border border-military bg-stone-900/30 hover:bg-stone-900/60 rounded flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={avatar.url}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded object-cover border border-military"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border border-stone-950 ${status.color}`}
                      title={status.text}
                    />
                  </div>
                  <div className="min-w-0 font-mono text-[11px] leading-tight text-left">
                    <div className="truncate font-bold text-stone-200">
                      {friend.name}
                    </div>
                    <div className="truncate text-[9px] text-stone-500">
                      @{friend.username} · {status.text}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onInviteFriend && (
                    <button
                      type="button"
                      onClick={() => onInviteFriend(friend)}
                      disabled={
                        friend.status !== "online" && friend.status !== "lobby"
                      }
                      aria-label={`Invite ${friend.name} to play`}
                      title={
                        friend.status === "online" || friend.status === "lobby"
                          ? "Invite to play"
                          : "Friend must be online to receive an invite"
                      }
                      className="text-[#76a035] hover:text-white hover:bg-[#76a035]/25 disabled:text-stone-700 disabled:hover:bg-transparent p-1 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Send size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveFriend(friend.id)}
                    aria-label={`Remove ${friend.name}`}
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
        {accountConnected ? "SUPABASE FRIENDS SYNCED" : "GUEST MODE · LOCAL SAVE"}
      </div>
    </div>
  );
}
