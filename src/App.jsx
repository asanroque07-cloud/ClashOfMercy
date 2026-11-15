// App.jsx is the "brain" of the whole game. It keeps track of which screen the
// player is looking at (home, lobby, live match, etc.) and all of their saved
// data (profile, friends, shop, match history). Every other screen is a smaller
// component that App shows and hands data/handlers to.
import { useState, useEffect, useCallback } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { LobbyHeader } from "@/components/LobbyHeader";
import { RankLobby } from "@/components/RankLobby";
import { ClassicLobby } from "@/components/ClassicLobby";
import { OfflineLobby } from "@/components/OfflineLobby";
import { CustomLobby } from "@/components/CustomLobby";
import { Matchmaker } from "@/components/Matchmaker";
import GameCanvas from "@/components/GameCanvas";
import BackgroundMusic from "@/components/BackgroundMusic";
import Home from "@/pages/Home";
import OperatorSetup from "@/pages/OperatorSetup";
import {
  loadLobbyState,
  saveLobbyState,
  addLobbyMatch,
  loadProfile,
  saveProfile,
} from "@/lib/storage";

// this is for converting the lobby's role label (RoleType) into the role id GameCanvas understands
function toGameRole(role) {
  if (role === "Sniper") return "sniper";
  if (role === "Marksman") return "marksman";
  return "core";
}

// this is for converting the lobby's map display name into the map id GameCanvas understands
function toGameMapId(mapName) {
  if (mapName.includes("Dust") || mapName.includes("Desert")) return "desert";
  if (mapName.includes("Siberian") || mapName.includes("Breach"))
    return "bunker";
  if (mapName.includes("Rusty") || mapName.includes("Ridge")) return "jungle";
  return "city";
}

// This is the root component: it owns which screen is showing and all of the player's
// lobby/game state, and renders the matching screen component below.
export default function App() {
  const [loading, setLoading] = useState(true); // true while the boot-up LoadingScreen is showing
  const [screen, setScreen] = useState("home"); // which screen is currently visible
  const [prevScreen, setPrevScreen] = useState("home"); // screen to return to after a match/queue ends
  const [gameMode, setGameMode] = useState("classic"); // classic vs. ranked queue
  const [lobbyState, setLobbyState] = useState(null); // profile/friends/shop/history, saved to localStorage
  const [squad, setSquad] = useState([]); // friends/bots currently grouped up for a match
  const [alerts, setAlerts] = useState([]); // toast notifications shown top-right
  const [pendingModal, setPendingModal] = useState(null); // which popup dialog Home should open, if any
  const [gameProfile, setGameProfile] = useState(loadProfile()); // in-match profile (coins/loadout/upgrades)
  // team sizes / rosters chosen in a lobby, passed to GameCanvas so the actual
  // match uses exactly those team compositions (e.g. 2v2, 1v1, 5v5).
  const [teamConfig, setTeamConfig] = useState(null);
  // current browser window size, used to detect portrait mode and show the "rotate device" prompt
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  }));

  useEffect(() => {
    setLobbyState(loadLobbyState());
    setGameProfile(loadProfile());
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, []);

  // ── Forced landscape ────────────────────────────────────────────────────
  // Phones/tablets must always play in landscape. Native orientation lock only
  // works in fullscreen on Android and is unsupported on iOS, so as a reliable
  // fallback we rotate the entire app 90° with CSS whenever a touch device is
  // held in portrait. This makes the game landscape even when the OS won't
  // rotate the screen for us.
  useEffect(() => {
    const root = document.documentElement;

    const isTouchDevice =
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches);

    const applyOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = h > w;
      // Only rotate phone/tablet-sized screens — never a desktop window that
      // merely happens to be narrow or has a touchscreen.
      const mobileSized = Math.max(w, h) <= 1400;
      const shouldUseMobileLayout = Boolean(isTouchDevice) && mobileSized;
      root.classList.toggle("mobile-game-ui", shouldUseMobileLayout);
      root.classList.toggle("force-landscape", shouldUseMobileLayout && portrait);
    };

    applyOrientation();
    window.addEventListener("resize", applyOrientation);
    window.addEventListener("orientationchange", applyOrientation);
    // Some mobile browsers report stale sizes right after rotation.
    const t = setTimeout(applyOrientation, 250);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", applyOrientation);
      window.removeEventListener("orientationchange", applyOrientation);
      root.classList.remove("force-landscape", "mobile-game-ui");
    };
  }, [screen]);

  // this is for showing a short-lived toast message, which removes itself after 3.5 seconds
  const pushAlert = useCallback((alert) => {
    const id = `alert_${Date.now()}`;
    setAlerts((prev) => [...prev, { ...alert, id }]);
    setTimeout(
      () => setAlerts((prev) => prev.filter((a) => a.id !== id)),
      3500,
    );
  }, []);

  // this is a shared helper: applies a change to the saved lobby state and persists it in one step
  const updateLobbyState = useCallback((updater) => {
    setLobbyState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveLobbyState(next);
      return next;
    });
  }, []);

  // ── Profile handlers (lobby-facing profile card: name, country, currency, etc.) ──
  const handleUpdateProfile = (updates) => {
    updateLobbyState((s) => ({
      ...s,
      lobbyProfile: { ...s.lobbyProfile, ...updates },
    }));
  };

  const handleAddCurrency = (type, amount) => {
    updateLobbyState((s) => ({
      ...s,
      lobbyProfile: {
        ...s.lobbyProfile,
        [type]: s.lobbyProfile[type] + amount,
      },
    }));
    pushAlert({
      message: `+${amount} ${type === "coins" ? "💰 Coins" : "💎 Diamonds"} added!`,
      type: "success",
    });
  };

  // ── Friend handlers (friends list + squad-up for a match) ──────
  const handleAddFriend = (friend) => {
    updateLobbyState((s) => ({ ...s, friends: [...s.friends, friend] }));
  };

  const handleRemoveFriend = (id) => {
    updateLobbyState((s) => ({
      ...s,
      friends: s.friends.filter((f) => f.id !== id),
    }));
  };

  const handleInviteToSquad = (friend) => {
    if (squad.length >= 4) {
      pushAlert({
        message: "Squad is full (max 4 slots + you as leader)",
        type: "error",
      });
      return;
    }
    if (squad.find((s) => s.id === friend.id)) {
      pushAlert({
        message: `${friend.name} is already in your squad`,
        type: "warning",
      });
      return;
    }
    setSquad((prev) => [...prev, friend]);
    pushAlert({ message: `${friend.name} joined the squad!`, type: "success" });
  };

  // ── Weapon / store handlers (armory + shop purchases) ──────────
  const handleEquipWeapon = (id) => {
    updateLobbyState((s) => ({
      ...s,
      weapons: s.weapons.map((w) =>
        w.id === id ? { ...w, equipped: !w.equipped } : w,
      ),
    }));
  };

  // this is for buying a weapon or cosmetic item: checks the player can afford it, then deducts
  // the cost and marks the item as owned
  const handleBuyItem = (itemId, cost, costType, targetType) => {
    setLobbyState((prev) => {
      if (!prev) return prev;
      const bal =
        costType === "coins"
          ? prev.lobbyProfile.coins
          : prev.lobbyProfile.diamonds;
      if (bal < cost) {
        pushAlert({ message: `Insufficient ${costType}!`, type: "error" });
        return prev;
      }
      const updatedProfile = { ...prev.lobbyProfile, [costType]: bal - cost };
      let next;
      if (targetType === "weapon") {
        next = {
          ...prev,
          lobbyProfile: {
            ...updatedProfile,
            weaponsCount: updatedProfile.weaponsCount + 1,
          },
          weapons: prev.weapons.map((w) =>
            w.id === itemId ? { ...w, owned: true } : w,
          ),
        };
      } else {
        next = {
          ...prev,
          lobbyProfile: updatedProfile,
          storeItems: prev.storeItems.map((i) =>
            i.id === itemId ? { ...i, owned: true } : i,
          ),
        };
      }
      saveLobbyState(next);
      pushAlert({ message: "Purchase successful! ✅", type: "success" });
      return next;
    });
  };

  // this is for unlocking a purchasable emote, same afford-check pattern as handleBuyItem
  const handleBuyEmote = (emoteId, cost, costType) => {
    setLobbyState((prev) => {
      if (!prev) return prev;
      if (prev.ownedEmoteIds.includes(emoteId)) {
        pushAlert({ message: "Emote already owned!", type: "warning" });
        return prev;
      }
      const bal =
        costType === "coins"
          ? prev.lobbyProfile.coins
          : prev.lobbyProfile.diamonds;
      if (bal < cost) {
        pushAlert({ message: `Insufficient ${costType}!`, type: "error" });
        return prev;
      }
      const next = {
        ...prev,
        lobbyProfile: { ...prev.lobbyProfile, [costType]: bal - cost },
        ownedEmoteIds: [...prev.ownedEmoteIds, emoteId],
      };
      saveLobbyState(next);
      pushAlert({ message: "Emote unlocked! 🎭", type: "success" });
      return next;
    });
  };

  const handleClearHistory = () => {
    updateLobbyState((s) => ({ ...s, matchHistory: [] }));
    pushAlert({ message: "Match history cleared.", type: "info" });
  };

  // ── Rank lobby handlers (squad management, role/map picks) ─────
  // this is for filling an empty squad slot with an AI-controlled bot teammate
  const handleAddBotToSquad = () => {
    if (squad.length >= 4) {
      pushAlert({ message: "Squad is full!", type: "error" });
      return;
    }
    const botNames = ["Bot_Alpha", "Bot_Bravo", "Bot_Charlie", "Bot_Delta"];
    const roles = ["Core", "Sniper", "Marksman", "Gunner", "Scout"];
    const bot = {
      id: `bot_${Date.now()}`,
      name: botNames[squad.length],
      avatarId: "avatar_default",
      level: Math.max(1, (lobbyState?.lobbyProfile.level || 10) - 2),
      rankName: lobbyState?.lobbyProfile.rankName || "Gold",
      rankTier: lobbyState?.lobbyProfile.rankTier || 2,
      status: "online",
      role: roles[Math.floor(Math.random() * roles.length)],
    };
    setSquad((prev) => [...prev, bot]);
    pushAlert({ message: `${bot.name} (AI) joined the squad!`, type: "info" });
  };

  const handleRemoveSquadMember = (id) => {
    setSquad((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateRole = (role) => {
    handleUpdateProfile({ selectedRole: role });
    pushAlert({ message: `Role set to ${role}`, type: "info" });
  };

  const handleUpdatePlace = (map) => {
    updateLobbyState((s) => ({ ...s, activeMap: map }));
    handleUpdateProfile({ selectedPlace: map.name });
    pushAlert({ message: `Map set to ${map.name}`, type: "info" });
  };

  const handleSelectEmote = (emoteId) => {
    handleUpdateProfile({ activeEmoteId: emoteId });
    if (emoteId)
      pushAlert({ message: `Active emote set! 🎭`, type: "success" });
  };

  // ── Navigation (switching between lobby screens) ────────────────
  const handleNavigate = (dest) => {
    if (dest === "rank") setGameMode("rank");
    else if (dest === "classic") setGameMode("classic");
    setScreen(dest);
  };

  const handleStartMatchmaking = () => {
    setGameMode("classic");
    setScreen("classic");
  };

  const handleLaunchRankQueue = () => {
    setGameMode("rank");
    setPrevScreen("rank");
    setScreen("queue");
  };

  const handleLaunchClassicQueue = () => {
    setGameMode("classic");
    setPrevScreen("classic");
    setScreen("queue");
  };

  const handleOfflineRewards = (coins, diamonds, xp, outcome, map) => {
    setLobbyState((prev) => {
      if (!prev) return prev;
      return addLobbyMatch(prev, coins, diamonds, xp, outcome, map);
    });
  };

  // ── Launch real GameCanvas (switch from lobby into the live match) ──
  const handleLaunchGame = (fromScreen) => {
    // Try to go fullscreen and lock to landscape for a better mobile experience.
    // Both can silently fail (browser permissions), so they're wrapped in try/catch and ignored.
    void (async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.();
        }
      } catch {
        // Fullscreen is best-effort and may be blocked by the browser.
      }
      try {
        // Cast needed: landscape lock isn't in the standard TS DOM types yet, but is supported by most mobile browsers.
        await window.screen.orientation?.lock?.("landscape");
      } catch {
        // Orientation lock is also best-effort.
      }
    })();

    const fresh = loadProfile();
    setGameProfile(fresh);
    setPrevScreen(fromScreen || screen);
    setScreen("game");
    pushAlert({
      message: "Loading combat zone… use WASD + click to fight!",
      type: "info",
    });
  };

  const handleGameProfileChange = (p) => {
    saveProfile(p);
    setGameProfile(p);
  };

  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return <LoadingScreen onDone={() => setLoading(false)} />;
  }

  if (!lobbyState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="text-2xl text-center font-display"
          style={{ color: "oklch(0.70 0.18 130)" }}
        >
          INITIALIZING...
        </div>
      </div>
    );
  }

  const {
    lobbyProfile,
    friends,
    weapons,
    storeItems,
    matchHistory,
    activeMap,
    ownedEmoteIds,
  } = lobbyState;

  const needsSetup =
    !lobbyProfile.name ||
    lobbyProfile.name === "Recruit" ||
    !lobbyProfile.country;

  if (needsSetup) {
    return (
      <>
        <BackgroundMusic combatMode={false} />
        <OperatorSetup
          initialName={lobbyProfile.name}
          initialCountry={lobbyProfile.country}
          onComplete={(name, country) => {
            handleUpdateProfile({ name, country });
            const nextGameProfile = { ...gameProfile, name };
            saveProfile(nextGameProfile);
            setGameProfile(nextGameProfile);
            setScreen("home");
            pushAlert({ message: `Welcome, ${name}.`, type: "success" });
          }}
        />
      </>
    );
  }

  // Determine which ruleset GameCanvas should run, based on which lobby screen launched the match
  const canvasMode =
    prevScreen === "offline" || prevScreen === "custom"
      ? "offline"
      : prevScreen === "rank"
        ? "rank"
        : "classic";

  const exitToScreen =
    prevScreen === "offline"
      ? "offline"
      : prevScreen === "custom"
        ? "custom"
        : prevScreen === "rank"
          ? "rank"
          : "classic";
  // The app now auto-rotates into landscape (see the forced-landscape effect
  // above), so the blocking "rotate your device" overlay is no longer needed.
  const showRotateOverlay = false;

  // ── Full-screen real GameCanvas (the actual playable match) ────
  if (screen === "game") {
    return (
      <>
        <BackgroundMusic combatMode />
        <div className="fixed inset-0 z-[200] bg-black">
          <GameCanvas
            mode={canvasMode}
            role={toGameRole(lobbyProfile.selectedRole)}
            mapId={toGameMapId(activeMap.name)}
            profile={gameProfile}
            teamConfig={teamConfig}
            onProfileChange={handleGameProfileChange}
            onExit={() => {
              setScreen(exitToScreen);
              pushAlert({
                message: "Returned to HQ. Check match history!",
                type: "info",
              });
            }}
          />
        </div>
        {showRotateOverlay && (
          <div className="rotate-device-overlay">
            <div className="rotate-device-card">
              <div className="display text-xl text-[#76a035]">
                Rotate Device
              </div>
              <p className="mt-2 text-sm text-stone-300">
                This game is tuned for landscape mode. Rotate your phone to
                continue the match.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Main lobby shell: header + toasts + whichever screen is active ──
  return (
    <>
      {/* screen can never be "game" here — that case returns its own JSX above — so music always plays in lobby mode */}
      <BackgroundMusic combatMode={false} />
      <div
        className="app-shell"
        style={{ background: "oklch(0.10 0.018 120)" }}
      >
        {/* Header */}
        <LobbyHeader
          activeScreen={screen}
          profile={lobbyProfile}
          onChangeScreen={(s) => setScreen(s)}
          onOpenSettings={() => setPendingModal("settings")}
          onAddCurrency={handleAddCurrency}
        />

        {/* Alert toasts */}
        <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`alert-slide-in px-4 py-2.5 rounded border font-mono text-xs font-bold shadow-xl max-w-xs ${
                a.type === "success"
                  ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                  : a.type === "error"
                    ? "bg-red-950 border-red-500 text-red-300"
                    : a.type === "warning"
                      ? "bg-amber-950 border-amber-500 text-amber-300"
                      : "bg-stone-900 border-[#76a035] text-[#76a035]"
              }`}
            >
              {a.message}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {screen === "home" && (
            <div className="screen-shell">
              <Home
                profile={lobbyProfile}
                friends={friends}
                weapons={weapons}
                storeItems={storeItems}
                matchHistory={matchHistory}
                activeMap={activeMap}
                ownedEmoteIds={ownedEmoteIds}
                pendingModal={pendingModal}
                onClearModal={() => setPendingModal(null)}
                onNavigate={handleNavigate}
                onStartMatchmaking={handleStartMatchmaking}
                onUpdateProfile={handleUpdateProfile}
                onAddFriend={handleAddFriend}
                onRemoveFriend={handleRemoveFriend}
                onEquipWeapon={handleEquipWeapon}
                onBuyItem={handleBuyItem}
                onBuyEmote={handleBuyEmote}
                onSelectEmote={handleSelectEmote}
                onClearHistory={handleClearHistory}
                onPushAlert={pushAlert}
              />
            </div>
          )}

          {screen === "rank" && (
            <div className="screen-shell p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 xl:col-span-9 min-h-0">
                <RankLobby
                  profile={lobbyProfile}
                  friends={friends}
                  squad={squad}
                  activeMap={activeMap}
                  onAddBotToSquad={handleAddBotToSquad}
                  onRemoveSquadMember={handleRemoveSquadMember}
                  onUpdateRole={handleUpdateRole}
                  onUpdatePlace={handleUpdatePlace}
                  onLaunchQueue={handleLaunchRankQueue}
                />
              </div>
              <div className="md:col-span-4 xl:col-span-3 min-h-0">
                <div className="bg-stone-950/80 border border-military text-stone-100 flex flex-col h-full rounded overflow-hidden shadow-2xl">
                  <div className="p-3 bg-zinc-900/60 border-b border-military text-[#76a035] text-xs font-mono font-black uppercase tracking-widest">
                    SQUAD INVITE
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {friends
                      .filter(
                        (f) => f.status === "online" || f.status === "lobby",
                      )
                      .map((friend) => (
                        <div
                          key={friend.id}
                          className="p-2 border border-military bg-stone-900/30 rounded flex items-center justify-between"
                        >
                          <span className="font-mono text-xs font-bold text-stone-200">
                            {friend.name}
                          </span>
                          <button
                            onClick={() => handleInviteToSquad(friend)}
                            disabled={!!squad.find((s) => s.id === friend.id)}
                            className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border transition-all ${
                              squad.find((s) => s.id === friend.id)
                                ? "border-stone-700 text-stone-600 cursor-not-allowed"
                                : "border-military-active text-[#76a035] hover:bg-[#76a035] hover:text-black cursor-pointer"
                            }`}
                          >
                            {squad.find((s) => s.id === friend.id)
                              ? "In Squad"
                              : "Invite"}
                          </button>
                        </div>
                      ))}
                    {friends.filter(
                      (f) => f.status === "online" || f.status === "lobby",
                    ).length === 0 && (
                      <div className="text-center py-8 text-stone-600 font-mono text-[10px]">
                        No friends online
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen === "classic" && (
            <div className="screen-shell p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 xl:col-span-9 min-h-0">
                <ClassicLobby
                  profile={lobbyProfile}
                  friends={friends}
                  squad={squad}
                  activeMap={activeMap}
                  onRemoveSquadMember={handleRemoveSquadMember}
                  onInviteFriend={handleInviteToSquad}
                  onUpdatePlace={handleUpdatePlace}
                  onFindMatch={handleLaunchClassicQueue}
                />
              </div>
              <div className="md:col-span-4 xl:col-span-3 min-h-0">
                <div className="bg-stone-950/80 border border-military text-stone-100 flex flex-col h-full rounded overflow-hidden shadow-2xl">
                  <div className="p-3 bg-zinc-900/60 border-b border-military text-[#76a035] text-xs font-mono font-black uppercase tracking-widest">
                    SQUAD INVITE
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {friends
                      .filter(
                        (f) => f.status === "online" || f.status === "lobby",
                      )
                      .map((friend) => (
                        <div
                          key={friend.id}
                          className="p-2 border border-military bg-stone-900/30 rounded flex items-center justify-between"
                        >
                          <span className="font-mono text-xs font-bold text-stone-200">
                            {friend.name}
                          </span>
                          <button
                            onClick={() => handleInviteToSquad(friend)}
                            disabled={!!squad.find((s) => s.id === friend.id)}
                            className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border transition-all ${
                              squad.find((s) => s.id === friend.id)
                                ? "border-stone-700 text-stone-600 cursor-not-allowed"
                                : "border-military-active text-[#76a035] hover:bg-[#76a035] hover:text-black cursor-pointer"
                            }`}
                          >
                            {squad.find((s) => s.id === friend.id)
                              ? "In Squad"
                              : "Invite"}
                          </button>
                        </div>
                      ))}
                    {friends.filter(
                      (f) => f.status === "online" || f.status === "lobby",
                    ).length === 0 && (
                      <div className="text-center py-8 text-stone-600 font-mono text-[10px]">
                        No friends online
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen === "custom" && (
            <div className="screen-shell p-4 md:p-5">
              <CustomLobby
                profile={lobbyProfile}
                weapons={weapons}
                activeMap={activeMap}
                friends={friends}
                onUpdatePlace={handleUpdatePlace}
                onLaunchGame={(cfg) => {
                  setTeamConfig(cfg);
                  handleLaunchGame("custom");
                }}
              />
            </div>
          )}

          {screen === "offline" && (
            <div className="screen-shell p-4 md:p-5">
              <OfflineLobby
                profile={lobbyProfile}
                weapons={weapons}
                activeMap={activeMap}
                onUpdatePlace={handleUpdatePlace}
                onAddRewards={handleOfflineRewards}
                onLaunchGame={(cfg) => {
                  setTeamConfig(cfg);
                  handleLaunchGame("offline");
                }}
              />
            </div>
          )}

          {screen === "queue" && (
            <div className="screen-shell p-4 md:p-5">
              <Matchmaker
                profile={lobbyProfile}
                activeMap={activeMap}
                gameMode={gameMode}
                onCancel={() =>
                  setScreen(prevScreen === "rank" ? "rank" : "classic")
                }
                onLaunchGame={() =>
                  handleLaunchGame(gameMode === "rank" ? "rank" : "classic")
                }
              />
            </div>
          )}
        </div>
      </div>
      {showRotateOverlay && (
        <div className="rotate-device-overlay">
          <div className="rotate-device-card">
            <div className="display text-xl text-[#76a035]">Landscape Only</div>
            <p className="mt-2 text-sm text-stone-300">
              The lobby and matches are optimized for landscape. Rotate your
              phone for the best experience.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
