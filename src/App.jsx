// App.jsx is the "brain" of the whole game. It keeps track of which screen the
// player is looking at (home, lobby, live match, etc.) and all of their saved
// data (profile, friends, shop, match history). Every other screen is a smaller
// component that App shows and hands data/handlers to.
import { useState, useEffect, useCallback, useRef } from "react";
import { useCloudAccount } from "@/hooks/useCloudAccount";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";
import LoadingScreen from "@/components/LoadingScreen";
import { LobbyHeader } from "@/components/LobbyHeader";
import { RankLobby } from "@/components/RankLobby";
import { ClassicLobby } from "@/components/ClassicLobby";
import { OfflineLobby } from "@/components/OfflineLobby";
import { CustomLobby } from "@/components/CustomLobby";
import { Matchmaker } from "@/components/Matchmaker";
import GameCanvas from "@/components/GameCanvas";
import BackgroundMusic from "@/components/BackgroundMusic";
import DownloadPage from "@/pages/DownloadPage";
import Home from "@/pages/Home";
import OperatorSetup from "@/pages/OperatorSetup";
import {
  loadLobbyState,
  saveLobbyState,
  addLobbyMatch,
  loadProfile,
  saveProfile,
} from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";

const MUSIC_SETTING_KEY = "opwar_music_enabled";
const SOUND_SETTING_KEY = "opwar_sound_enabled";
const EMPTY_MATCH_PARTICIPANTS = [];

function loadAudioPreference(key) {
  if (typeof window === "undefined") return true;
  try {
    const saved = window.localStorage.getItem(key);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

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

function requestPhoneFullscreen(force = false) {
  const isTouchDevice =
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    (typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches);
  const mobileSized =
    typeof window !== "undefined" &&
    Math.max(window.innerWidth, window.innerHeight) <= 1400;

  const isMobile = isTouchDevice && mobileSized;
  if (!isMobile && !force) return;

  const isInstalled =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    navigator.standalone;

  if (!isInstalled && !document.fullscreenElement) {
    try {
      const request = document.documentElement.requestFullscreen?.({
        navigationUI: "hide",
      });
      request?.catch(() => {});
    } catch {
      try {
        const request = document.documentElement.requestFullscreen?.();
        request?.catch(() => {});
      } catch {
        // Fullscreen is best-effort on browsers without the Fullscreen API.
      }
    }
  }

  if (isMobile) {
    try {
      const lock = window.screen.orientation?.lock?.("landscape");
      lock?.catch(() => {});
    } catch {
      // Orientation lock is best-effort and may be denied by the browser.
    }
  }
}

function OnlineMatchOverlay({
  onlineMatch,
  onAcceptInvite,
  onDeclineInvite,
  onStartHostRoom,
}) {
  const invite = onlineMatch.incomingInvites[0];
  const waiting = onlineMatch.room?.status === "waiting";
  const hostRoom =
    onlineMatch.room?.role === "host" &&
    onlineMatch.room.status === "inviting" &&
    onlineMatch.room.mode !== "custom";
  if (!invite && !waiting && !hostRoom) return null;

  if (hostRoom && !invite && !waiting) {
    return (
      <div className="fixed top-20 right-4 z-[450] w-72 border border-[#76a035] bg-stone-950 p-3 shadow-2xl">
        <div className="font-mono text-[10px] font-black uppercase tracking-widest text-[#9acd50]">
          {onlineMatch.room.mode} match lobby
        </div>
        <p className="mt-1 font-mono text-[10px] text-stone-300">
          {onlineMatch.room.participants.length - 1} friend
          {onlineMatch.room.participants.length === 2 ? "" : "s"} joined.
          Unfilled slots use AI.
        </p>
        <button
          type="button"
          onClick={onStartHostRoom}
          className="mt-3 w-full border border-[#9acd50] bg-[#76a035] px-3 py-2 font-mono text-xs font-bold uppercase text-black hover:bg-[#8bc342]"
        >
          Start match
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm border border-[#76a035] bg-stone-950 p-5 text-center shadow-2xl">
        <div className="font-mono text-xs font-black uppercase tracking-widest text-[#9acd50]">
          {invite ? "Match invitation" : "Joining match"}
        </div>
        <p className="mt-3 font-mono text-sm text-stone-200">
          {invite
            ? `${invite.fromName} invited you to a ${invite.mode} match.`
            : `Waiting for ${onlineMatch.room.hostName} to start the match…`}
        </p>
        {invite ? (
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onDeclineInvite(invite.id)}
              className="border border-stone-700 px-4 py-2 font-mono text-xs font-bold uppercase text-stone-300 hover:bg-stone-800"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => onAcceptInvite(invite)}
              className="border border-[#9acd50] bg-[#76a035] px-4 py-2 font-mono text-xs font-bold uppercase text-black hover:bg-[#8bc342]"
            >
              Accept
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onlineMatch.leaveRoom}
            className="mt-5 border border-stone-700 px-4 py-2 font-mono text-xs font-bold uppercase text-stone-300 hover:bg-stone-800"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// This is the root component: it owns which screen is showing and all of the player's
// lobby/game state, and renders the matching screen component below.
export default function App() {
  const [showDownloadPage, setShowDownloadPage] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("play") !== "1";
  });
  const [loading, setLoading] = useState(true); // true while the boot-up LoadingScreen is showing
  const [screen, setScreen] = useState("home"); // which screen is currently visible
  const [prevScreen, setPrevScreen] = useState("home"); // screen to return to after a match/queue ends
  const [gameMode, setGameMode] = useState("classic"); // classic vs. ranked queue
  const [lobbyState, setLobbyState] = useState(null); // profile/friends/shop/history, saved to localStorage
  const [initialStateLoaded, setInitialStateLoaded] = useState(false);
  const [cloudReadyUser, setCloudReadyUser] = useState(null);
  const cloudAccount = useCloudAccount();
  const onlineMatch = useOnlineMatch(
    cloudAccount.user,
    lobbyState?.lobbyProfile?.name,
  );
  const [squad, setSquad] = useState([]); // friends/bots currently grouped up for a match
  const [alerts, setAlerts] = useState([]); // toast notifications shown top-right
  const [pendingModal, setPendingModal] = useState(null); // which popup dialog Home should open, if any
  const previousOnlineRoomRef = useRef(null);
  const [gameProfile, setGameProfile] = useState(loadProfile()); // in-match profile (coins/loadout/upgrades)
  const [musicEnabled, setMusicEnabled] = useState(() =>
    loadAudioPreference(MUSIC_SETTING_KEY),
  );
  const [soundEnabled, setSoundEnabled] = useState(() =>
    loadAudioPreference(SOUND_SETTING_KEY),
  );
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
    setInitialStateLoaded(true);
  }, []);

  useEffect(() => {
    const user = cloudAccount.user;
    if (!user || !initialStateLoaded || !lobbyState || !supabase) {
      if (!user) setCloudReadyUser(null);
      return undefined;
    }

    let active = true;
    setCloudReadyUser(null);
    const loadAccountSave = async () => {
      try {
        const { data, error } = await supabase
          .from("player_saves")
          .select("lobby_state, game_profile")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;

        if (data) {
          const restoredLobby = { ...data.lobby_state, friends: [] };
          saveLobbyState(restoredLobby);
          setLobbyState(restoredLobby);
          if (data.game_profile) {
            saveProfile(data.game_profile);
            setGameProfile(data.game_profile);
          }
        } else {
          const { error: saveError } = await supabase
            .from("player_saves")
            .upsert({
              user_id: user.id,
              lobby_state: { ...lobbyState, friends: [] },
              game_profile: gameProfile,
              updated_at: new Date().toISOString(),
            });
          if (saveError) throw saveError;
        }
        if (active) setCloudReadyUser(user.id);
      } catch (error) {
        if (active) {
          cloudAccount.setError(
            `Cloud save could not be loaded: ${error.message}`,
          );
        }
      }
    };

    loadAccountSave();
    return () => {
      active = false;
    };
  }, [cloudAccount.user?.id, initialStateLoaded]);

  useEffect(() => {
    const user = cloudAccount.user;
    if (
      !user ||
      cloudReadyUser !== user.id ||
      !lobbyState ||
      !gameProfile ||
      !supabase
    ) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      const { friends: _localFriends, ...savedLobbyState } = lobbyState;
      const [saveResult, profileResult] = await Promise.all([
        supabase.from("player_saves").upsert({
          user_id: user.id,
          lobby_state: savedLobbyState,
          game_profile: gameProfile,
          updated_at: new Date().toISOString(),
        }),
        supabase
          .from("profiles")
          .update({
            display_name: lobbyState.lobbyProfile.name,
            avatar_id: lobbyState.lobbyProfile.avatarId,
          })
          .eq("user_id", user.id),
      ]);
      const error = saveResult.error || profileResult.error;
      if (error) {
        cloudAccount.setError(`Cloud save failed: ${error.message}`);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [cloudReadyUser, cloudAccount.user?.id, lobbyState, gameProfile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUSIC_SETTING_KEY, String(musicEnabled));
      window.localStorage.setItem(SOUND_SETTING_KEY, String(soundEnabled));
    } catch {
      // Audio preferences still work for this session if storage is unavailable.
    }
  }, [musicEnabled, soundEnabled]);

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
      const shouldUseMobileLayout =
        !showDownloadPage && Boolean(isTouchDevice) && mobileSized;
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
  }, [screen, showDownloadPage]);

  useEffect(() => {
    if (showDownloadPage) return undefined;

    const handleMobileInteraction = () => requestPhoneFullscreen();
    document.addEventListener("pointerdown", handleMobileInteraction, true);
    return () =>
      document.removeEventListener("pointerdown", handleMobileInteraction, true);
  }, [showDownloadPage]);

  // this is for showing a short-lived toast message, which removes itself after 3.5 seconds
  const pushAlert = useCallback((alert) => {
    const id = `alert_${Date.now()}`;
    setAlerts((prev) => [...prev, { ...alert, id }]);
    setTimeout(
      () => setAlerts((prev) => prev.filter((a) => a.id !== id)),
      3500,
    );
  }, []);

  useEffect(() => {
    if (onlineMatch.error) {
      pushAlert({ message: onlineMatch.error, type: "error" });
    }
  }, [onlineMatch.error, pushAlert]);

  useEffect(() => {
    const room = onlineMatch.room;
    if (room?.role !== "guest" || room.status !== "started") return;

    const fromScreen = room.mode === "custom" ? "custom" : room.mode;
    setTeamConfig(room.teamConfig);
    setGameMode(room.mode === "rank" ? "rank" : "classic");
    setPrevScreen(fromScreen);
    requestPhoneFullscreen(true);
    setScreen("game");
  }, [
    onlineMatch.room?.id,
    onlineMatch.room?.role,
    onlineMatch.room?.status,
  ]);

  useEffect(() => {
    const previousRoom = previousOnlineRoomRef.current;
    previousOnlineRoomRef.current = onlineMatch.room;
    if (
      previousRoom?.status === "started" &&
      !onlineMatch.room &&
      screen === "game"
    ) {
      setTeamConfig(null);
      setScreen("home");
      pushAlert({
        message: "The match host ended the online match.",
        type: "warning",
      });
    }
  }, [
    onlineMatch.room?.id,
    onlineMatch.room?.status,
    screen,
    pushAlert,
  ]);

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

  // ── Friend handlers (friends list + online match invitations) ──────
  const handleInviteToSquad = async (
    friend,
    requestedMode = screen === "rank" || screen === "custom" ? screen : "classic",
    team = "blue",
  ) => {
    try {
      await onlineMatch.inviteFriend(friend, requestedMode, team);
      pushAlert({
        message: `Match invitation sent to ${friend.name}.`,
        type: "success",
      });
      return true;
    } catch (error) {
      pushAlert({ message: error.message, type: "error" });
      return false;
    }
  };

  const handleQueueMatchLaunch = async (mode) => {
    const room = onlineMatch.room;
    const participants =
      room?.role === "host" && room.mode === mode
        ? room.participants || []
        : [];
    const joinedPlayers = participants.filter(
      (participant) => participant.userId,
    );

    if (joinedPlayers.length > 1) {
      const createTeam = (team) => {
        const humans = joinedPlayers
          .filter((participant) => participant.team === team)
          .slice(0, 3)
          .map((participant) => ({
            userId: participant.userId,
            name: participant.name,
            isAI: false,
            isHost: participant.userId === cloudAccount.user?.id,
          }));
        const bots = ["Ghost", "Viper", "Thorn"];
        while (humans.length < 3) {
          humans.push({
            name: bots[humans.length],
            isAI: true,
          });
        }
        return humans;
      };
      const config = {
        blue: createTeam("blue"),
        red: createTeam("red"),
      };

      try {
        await onlineMatch.startMatch({
          teamConfig: config,
          mapId: toGameMapId(activeMap.name),
        });
        setTeamConfig(config);
        handleLaunchGame(mode);
      } catch (error) {
        pushAlert({ message: error.message, type: "error" });
      }
      return;
    }

    if (room?.role === "host") await onlineMatch.leaveRoom();
    setTeamConfig(null);
    handleLaunchGame(mode);
  };

  const handleCustomMatchLaunch = async (config) => {
    if (
      onlineMatch.room?.role !== "host" ||
      onlineMatch.room.mode !== "custom" ||
      onlineMatch.room.participants.length < 2
    ) {
      pushAlert({
        message: "Invite at least one online friend and wait for them to join.",
        type: "warning",
      });
      return;
    }

    try {
      await onlineMatch.startMatch({
        teamConfig: config,
        mapId: toGameMapId(activeMap.name),
      });
      setTeamConfig(config);
      handleLaunchGame("custom");
    } catch (error) {
      pushAlert({ message: error.message, type: "error" });
    }
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
    requestPhoneFullscreen(true);

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

  const handleEnterGame = () => {
    requestPhoneFullscreen();
    const url = new URL(window.location.href);
    url.searchParams.set("play", "1");
    window.history.replaceState({}, "", url);
    setShowDownloadPage(false);
  };

  // ─────────────────────────────────────────────────────────────

  if (showDownloadPage) {
    return <DownloadPage onPlay={handleEnterGame} />;
  }

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
    weapons,
    storeItems,
    matchHistory,
    activeMap,
    ownedEmoteIds,
  } = lobbyState;
  const friends = cloudAccount.user ? cloudAccount.friends : [];

  const needsSetup =
    !lobbyProfile.name ||
    lobbyProfile.name === "Recruit" ||
    !lobbyProfile.country;

  if (needsSetup) {
    return (
      <>
        <BackgroundMusic combatMode={false} enabled={musicEnabled} />
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

  const activeOnlineRoom =
    onlineMatch.room?.status === "started" ? onlineMatch.room : null;
  const networkSession =
    activeOnlineRoom && onlineMatch.roomChannel
      ? {
          roomId: activeOnlineRoom.id,
          role: activeOnlineRoom.role,
          userId: cloudAccount.user?.id,
          hostUserId: activeOnlineRoom.hostUserId,
          channel: onlineMatch.roomChannel,
        }
      : null;
  // Determine which ruleset GameCanvas should run, based on the launched match.
  const canvasMode = activeOnlineRoom
    ? activeOnlineRoom.mode === "custom"
      ? "offline"
      : activeOnlineRoom.mode
    : prevScreen === "offline" || prevScreen === "custom"
      ? "offline"
      : prevScreen === "rank"
        ? "rank"
        : "classic";

  const handleExitGame = () => {
    setTeamConfig(null);
    setScreen("home");
    void onlineMatch.leaveRoom();
    pushAlert({
      message: "Returned to HQ.",
      type: "info",
    });
  };
  // The app now auto-rotates into landscape (see the forced-landscape effect
  // above), so the blocking "rotate your device" overlay is no longer needed.
  const showRotateOverlay = false;

  // ── Full-screen real GameCanvas (the actual playable match) ────
  if (screen === "game") {
    return (
      <>
        <BackgroundMusic combatMode enabled={musicEnabled} />
        <div className="fixed inset-0 z-[200] bg-black">
          <GameCanvas
            mode={canvasMode}
            role={toGameRole(lobbyProfile.selectedRole)}
            mapId={activeOnlineRoom?.mapId || toGameMapId(activeMap.name)}
            profile={gameProfile}
            soundEnabled={soundEnabled}
            teamConfig={teamConfig}
            networkSession={networkSession}
            onNetworkError={pushAlert}
            onProfileChange={handleGameProfileChange}
            onExit={handleExitGame}
          />
        </div>
        <OnlineMatchOverlay
          onlineMatch={onlineMatch}
          onAcceptInvite={onlineMatch.acceptInvite}
          onDeclineInvite={onlineMatch.declineInvite}
          onStartHostRoom={() =>
            handleQueueMatchLaunch(onlineMatch.room.mode)
          }
        />
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
      <BackgroundMusic combatMode={false} enabled={musicEnabled} />
      <div
        className="app-shell"
        style={{ background: "oklch(0.10 0.018 120)" }}
      >
        {/* Header */}
        <LobbyHeader
          activeScreen={screen}
          profile={lobbyProfile}
          musicOn={musicEnabled}
          soundOn={soundEnabled}
          onToggleMusic={() => setMusicEnabled((enabled) => !enabled)}
          onToggleSound={() => setSoundEnabled((enabled) => !enabled)}
          onChangeScreen={(s) => setScreen(s)}
          onOpenSettings={() => setPendingModal("settings")}
          onAddCurrency={handleAddCurrency}
          cloudAccount={cloudAccount}
        />

        {/* Alert toasts */}
        <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`alert-slide-in alert-toast rounded border font-mono font-bold shadow-xl ${
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
                accountConnected={!!cloudAccount.user}
                cloudConfigured={cloudAccount.configured}
                incomingFriendRequests={cloudAccount.incomingRequests}
                onNavigate={handleNavigate}
                onStartMatchmaking={handleStartMatchmaking}
                onUpdateProfile={handleUpdateProfile}
                onSearchPlayer={cloudAccount.findPlayer}
                onSendFriendRequest={cloudAccount.sendFriendRequest}
                onAcceptFriendRequest={async (id) => {
                  try {
                    await cloudAccount.acceptFriendRequest(id);
                    pushAlert({
                      message: "Friend request accepted.",
                      type: "success",
                    });
                  } catch (error) {
                    cloudAccount.setError(error.message);
                    pushAlert({ message: error.message, type: "error" });
                  }
                }}
                onRemoveFriend={async (id) => {
                  try {
                    await cloudAccount.removeFriend(id);
                    pushAlert({ message: "Friend removed.", type: "info" });
                  } catch (error) {
                    cloudAccount.setError(error.message);
                    pushAlert({ message: error.message, type: "error" });
                  }
                }}
                onInviteFriend={(friend) =>
                  handleInviteToSquad(friend, "classic", "blue")
                }
                onEquipWeapon={handleEquipWeapon}
                onBuyItem={handleBuyItem}
                onBuyEmote={handleBuyEmote}
                onSelectEmote={handleSelectEmote}
                onClearHistory={handleClearHistory}
              />
            </div>
          )}

          {screen === "rank" && (
            <div className="match-lobby-shell screen-shell p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
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
                <div className="match-lobby__invites bg-stone-950/80 border border-military text-stone-100 flex flex-col h-full rounded overflow-hidden shadow-2xl">
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
                            onClick={() =>
                              handleInviteToSquad(friend, "rank", "blue")
                            }
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
            <div className="match-lobby-shell screen-shell p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 xl:col-span-9 min-h-0">
                <ClassicLobby
                  profile={lobbyProfile}
                  friends={friends}
                  squad={squad}
                  activeMap={activeMap}
                  onRemoveSquadMember={handleRemoveSquadMember}
                  onInviteFriend={(friend) =>
                    handleInviteToSquad(friend, "classic", "blue")
                  }
                  onUpdatePlace={handleUpdatePlace}
                  onFindMatch={handleLaunchClassicQueue}
                />
              </div>
              <div className="md:col-span-4 xl:col-span-3 min-h-0">
                <div className="match-lobby__invites bg-stone-950/80 border border-military text-stone-100 flex flex-col h-full rounded overflow-hidden shadow-2xl">
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
                            onClick={() =>
                              handleInviteToSquad(friend, "classic", "blue")
                            }
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
                accountUserId={cloudAccount.user?.id}
                onlineParticipants={
                  onlineMatch.room?.role === "host" &&
                  onlineMatch.room.mode === "custom"
                    ? onlineMatch.room.participants
                    : EMPTY_MATCH_PARTICIPANTS
                }
                onInviteFriend={(friend, team) =>
                  handleInviteToSquad(
                    friend,
                    "custom",
                    team === "alpha" ? "blue" : "red",
                  )
                }
                onUpdatePlace={handleUpdatePlace}
                onLaunchGame={handleCustomMatchLaunch}
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
                onLaunchGame={() => handleQueueMatchLaunch(gameMode)}
              />
            </div>
          )}
        </div>
      </div>
      <OnlineMatchOverlay
        onlineMatch={onlineMatch}
        onAcceptInvite={onlineMatch.acceptInvite}
        onDeclineInvite={onlineMatch.declineInvite}
        onStartHostRoom={() => handleQueueMatchLaunch(onlineMatch.room.mode)}
      />
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
