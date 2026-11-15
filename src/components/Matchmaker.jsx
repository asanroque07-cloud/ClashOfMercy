// Matchmaker.jsx is the "Searching for a match…" screen. It fakes finding other
// players by filling teams with bots over a few seconds (there's no real online
// server), then calls onMatchFound so App.jsx can start the actual match.
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ADMIRALS_AVATARS } from "@/lib/lobbyData";

// this is for naming the fake players shown "joining" the lobby while searching for a match
const FAKE_NAMES = [
  "Sgt_Frost",
  "Rogue_Viper",
  "Lt_Blaze",
  "Cpl_Steel",
  "Ranger_X",
  "Ghost_Actual",
  "Delta_Six",
  "Pvt_Hawk",
  "Alpha_Zero",
  "Sgt_Cipher",
  "Unit_Kilo",
  "Bravo_Echo",
  "Wolf_Alpha",
  "Iron_Fist",
  "Reaper_7",
];

function makePlayer(name, avatarIndex) {
  return {
    name,
    avatarId: ADMIRALS_AVATARS[avatarIndex % ADMIRALS_AVATARS.length].id,
  };
}

// This is the "searching for match" screen: simulates other players joining a lobby with a
// countdown, then transitions into the live match once everyone (fake players included) is in.
export function Matchmaker({
  profile,
  activeMap,
  gameMode,
  onCancel,
  onLaunchGame,
}) {
  const [playerCount, setPlayerCount] = useState(1); // how many "players found" so far during searching phase
  const [status, setStatus] = useState("searching");
  const [enteredCount, setEnteredCount] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const [players, setPlayers] = useState([]);

  const searchTimerRef = useRef(null);
  const enterTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const launchedRef = useRef(false);

  const currentAvatar =
    ADMIRALS_AVATARS.find((a) => a.id === profile.avatarId) ||
    ADMIRALS_AVATARS[0];

  const clearAllTimers = () => {
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (enterTimerRef.current) clearInterval(enterTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const buildPlayerList = () => {
    const shuffled = FAKE_NAMES.filter((n) => n !== profile.name).sort(
      () => Math.random() - 0.5,
    );
    const others = shuffled
      .slice(0, 9)
      .map((name, i) => makePlayer(name, i + 1));
    const me = {
      name: profile.name,
      avatarId: profile.avatarId,
      entered: false,
    };
    return [me, ...others.map((p) => ({ ...p, entered: false }))];
  };

  // this is for starting/restarting the "searching for players" phase — fake players trickle in
  // one by one until 10 total are found, then the lobby (ready-up) phase begins
  const startSearch = () => {
    launchedRef.current = false;
    setStatus("searching");
    setPlayerCount(1);
    setEnteredCount(0);
    setCountdown(20);
    setPlayers([]);
    clearAllTimers();

    searchTimerRef.current = setInterval(() => {
      setPlayerCount((prev) => {
        const next = prev + Math.floor(Math.random() * 2) + 1;
        if (next >= 10) {
          clearInterval(searchTimerRef.current);
          const pl = buildPlayerList();
          setPlayers(pl);
          setStatus("lobby");
          return 10;
        }
        return next;
      });
    }, 600);
  };

  useEffect(() => {
    startSearch();
    return () => clearAllTimers();
  }, []);

  // this is for the "ready up" click: marks you as entered, then randomly brings in the other
  // fake players over time; if all 10 enter before the countdown hits 0, launches the game
  const handleEnterMatch = () => {
    if (status !== "lobby") return;
    setStatus("entering");
    setEnteredCount(1);

    setPlayers((prev) =>
      prev.map((p, i) => (i === 0 ? { ...p, entered: true } : p)),
    );

    let entered = 1;
    let cdown = 30;
    setCountdown(30);

    countdownRef.current = setInterval(() => {
      cdown--;
      setCountdown(cdown);
      if (cdown <= 0) {
        clearAllTimers();
        setStatus("cancelled");
      }
    }, 1000);

    let otherIdx = 1;
    enterTimerRef.current = setInterval(() => {
      if (otherIdx >= 10) {
        clearInterval(enterTimerRef.current);
        return;
      }
      const enterNow = Math.random() > 0.25;
      if (enterNow) {
        const idx = otherIdx;
        setPlayers((prev) =>
          prev.map((p, i) => (i === idx ? { ...p, entered: true } : p)),
        );
        entered++;
        setEnteredCount(entered);
        if (entered >= 10 && !launchedRef.current) {
          launchedRef.current = true;
          clearAllTimers();
          onLaunchGame();
        }
      }
      otherIdx++;
    }, 1800);
  };

  const handleCancel = () => {
    clearAllTimers();
    onCancel();
  };

  const handleRetry = () => {
    startSearch();
  };

  return (
    <div className="matchmaker__shell flex items-center justify-center min-h-[60vh] select-none text-stone-100">
      <div className="matchmaker__card w-full max-w-lg bg-stone-950 border border-military-active p-8 rounded-lg shadow-2xl relative overflow-hidden flex flex-col items-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(118,160,53,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(118,160,53,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#76a035] to-transparent animate-pulse" />

        {/* Avatar */}
        <div className="matchmaker__avatar relative mb-6">
          <div className="absolute inset-0 -m-4 border border-military/15 rounded-full animate-ping" />
          <div className="w-24 h-24 rounded-full border-2 border-military-active overflow-hidden relative bg-stone-900 z-10">
            <img
              src={currentAvatar.url}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {status === "searching" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-400 w-8 h-8" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="matchmaker__title text-center font-mono space-y-1.5 mb-6 z-10">
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest leading-none">
            {status === "searching" && "Lobby Matchmaking"}
            {status === "lobby" && "Match Found — Ready Up!"}
            {status === "entering" && "Entering Match"}
            {status === "cancelled" && "Match Cancelled"}
          </h2>
          <div className="text-xs font-black text-[#76a035] uppercase tracking-wider flex items-center justify-center gap-1.5 glow-green">
            <span>● ZONE: {activeMap.name}</span>
            <span className="text-stone-500">|</span>
            <span className="text-amber-400">{gameMode.toUpperCase()}</span>
          </div>
        </div>

        {/* Searching phase */}
        {status === "searching" && (
          <div className="matchmaker__phase bg-stone-900/60 border border-military/60 px-8 py-3 rounded mb-8 text-center min-w-[140px] font-mono shadow-inner z-10 relative">
            <div className="text-[10px] text-stone-500 font-bold tracking-wider leading-none mb-1">
              PLAYERS FOUND
            </div>
            <div className="text-2xl font-black text-stone-300">
              {Math.min(playerCount, 9)} / 10
            </div>
            <div className="text-[9px] text-stone-600 mt-1 tracking-widest">
              SCANNING NETWORK…
            </div>
          </div>
        )}

        {/* Lobby phase — all 10 found */}
        {status === "lobby" && (
          <div className="matchmaker__phase w-full mb-6 z-10 space-y-3">
            <div className="bg-stone-900/60 border border-military/60 px-6 py-2 rounded text-center font-mono">
              <div className="text-[10px] text-stone-500 font-bold tracking-wider mb-0.5">
                PLAYERS FOUND
              </div>
              <div className="text-2xl font-black text-[#76a035]">10 / 10</div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {players.map((p, i) => {
                const av =
                  ADMIRALS_AVATARS.find((a) => a.id === p.avatarId) ||
                  ADMIRALS_AVATARS[0];
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded border ${i === 0 ? "border-emerald-500/60 bg-emerald-950/20" : "border-military/40 bg-stone-900/30"}`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-military/50">
                      <img
                        src={av.url}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono text-[7px] text-stone-400 truncate max-w-[48px] text-center">
                      {p.name}
                    </span>
                    {i === 0 && (
                      <span className="text-[6px] font-mono text-emerald-400 uppercase font-bold">
                        You
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Entering phase — countdown + who has entered */}
        {status === "entering" && (
          <div className="matchmaker__phase w-full mb-6 z-10 space-y-3">
            <div className="flex items-center justify-between bg-stone-900/60 border border-military/60 px-4 py-2 rounded font-mono">
              <div className="text-center">
                <div className="text-[9px] text-stone-500 font-bold tracking-wider">
                  ENTERING
                </div>
                <div className="text-xl font-black text-[#76a035]">
                  {enteredCount} / 10
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-stone-500 font-bold tracking-wider">
                  TIMEOUT
                </div>
                <div
                  className={`text-xl font-black ${countdown <= 5 ? "text-red-400 animate-pulse" : "text-amber-400"}`}
                >
                  {countdown}s
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {players.map((p, i) => {
                const av =
                  ADMIRALS_AVATARS.find((a) => a.id === p.avatarId) ||
                  ADMIRALS_AVATARS[0];
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded border transition-all ${p.entered ? "border-emerald-500/70 bg-emerald-950/30" : "border-military/30 bg-stone-900/20 opacity-50"}`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-military/50 relative">
                      <img
                        src={av.url}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {p.entered && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-[10px]">✓</span>
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[7px] text-stone-400 truncate max-w-[48px] text-center">
                      {p.name}
                    </span>
                    {p.entered ? (
                      <span className="text-[6px] font-mono text-emerald-400 uppercase font-bold">
                        READY
                      </span>
                    ) : (
                      <span className="text-[6px] font-mono text-stone-600 uppercase">
                        waiting
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center text-[9px] font-mono text-stone-500 animate-pulse">
              Waiting for all players to enter…
            </div>
          </div>
        )}

        {/* Cancelled */}
        {status === "cancelled" && (
          <div className="matchmaker__phase mb-8 text-center z-10 space-y-2">
            <div className="text-red-400 text-4xl">✗</div>
            <div className="font-mono text-sm font-bold text-red-400 tracking-wider">
              MATCH CANCELLED
            </div>
            <div className="text-[11px] font-mono text-stone-500">
              Not all players confirmed in time.
              <br />
              Re-searching for a new lobby…
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="matchmaker__actions w-full space-y-3 z-10 mt-2">
          {status === "searching" && (
            <button
              onClick={handleCancel}
              className="w-full bg-stone-900 hover:bg-stone-800 text-stone-400 border border-military/60 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel Search
            </button>
          )}

          {status === "lobby" && (
            <>
              <button
                onClick={handleEnterMatch}
                className="w-full bg-gradient-to-r from-emerald-500 to-[#76a035] hover:from-emerald-400 hover:to-[#86b53b] text-stone-950 font-display font-extrabold text-base tracking-widest py-4 rounded transition-all shadow-lg cursor-pointer uppercase animate-pulse"
              >
                🚀 ENTER MATCH
              </button>
              <button
                onClick={handleCancel}
                className="w-full bg-stone-900 hover:bg-stone-800 text-stone-500 border border-military/40 py-2 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
            </>
          )}

          {status === "entering" && (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="animate-spin text-[#76a035] w-6 h-6" />
              <div className="text-[10px] font-mono text-stone-500 tracking-wider font-bold text-center">
                You confirmed — waiting for remaining players…
              </div>
            </div>
          )}

          {status === "cancelled" && (
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-[#76a035] to-emerald-600 hover:from-[#86b53b] hover:to-emerald-500 text-stone-950 font-display font-extrabold text-sm tracking-widest py-3.5 rounded transition-all shadow-xl uppercase cursor-pointer"
              >
                🔄 RE-SEARCH LOBBY
              </button>
              <button
                onClick={handleCancel}
                className="w-full bg-stone-900 hover:bg-stone-800 text-stone-400 border border-military/60 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Return to HQ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
