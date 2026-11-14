// storage.js is the game's "save file" helper. Browsers give every site a small
// storage box called localStorage; this file reads and writes the player's
// progress there so it survives page reloads. If nothing is saved yet, it hands
// back sensible defaults (DEFAULT_PROFILE / the initial lobby data).
import { DEFAULT_PROFILE } from "./gameTypes";
import {
  INITIAL_FRIENDS,
  INITIAL_WEAPONS,
  INITIAL_STORE_ITEMS,
  GAME_MAPS,
} from "./lobbyData";

// localStorage keys for the two independently-saved slices of state.
// Bump the version suffix (v3/v2) if the saved shape ever changes incompatibly.
const GAME_KEY = "op_war_tactics_v3";
const LOBBY_KEY = "op_war_tactics_lobby_v2";

// ── Game Profile (in-match progression: coins, unlocks, loadout, upgrades) ──
// this is for reading the player's saved match profile from localStorage, merging in any new default fields
export function loadProfile() {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const p = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...p,
      equipped: { ...DEFAULT_PROFILE.equipped, ...(p.equipped || {}) },
      attachments: { ...DEFAULT_PROFILE.attachments, ...(p.attachments || {}) },
      weaponAttachments: { ...(p.weaponAttachments || {}) },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

// this is for persisting the match profile and notifying any listening components (see useProfile.ts)
export function saveProfile(p) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GAME_KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("profile:change"));
}

// this is for applying one completed match's rewards/rank changes to the profile and saving the result
export function addMatch(p, m) {
  const np = {
    ...p,
    coins: p.coins + m.coinsEarned,
    rankPoints:
      p.rankPoints +
      (m.mode === "rank" ? (m.result === "victory" ? 25 : -10) : 0),
    history: [m, ...p.history].slice(0, 50),
  };
  saveProfile(np);
  return np;
}

// ── Lobby State (profile card, friends, shop, store, match history shown in menus) ──
// this is the shape of everything the lobby screens (Home, ClassicLobby, RankLobby, Shop, Inventory) read/write

// this is the starting lobby state given to a brand-new player (before any save data exists)
function defaultLobbyState() {
  return {
    lobbyProfile: {
      name: "Recruit",
      country: "",
      avatarId: "avatar_default",
      level: 12,
      xp: 340,
      xpRequired: 500,
      weaponsCount: INITIAL_WEAPONS.filter((w) => w.owned).length,
      matchesCount: 0,
      coins: 5000,
      diamonds: 75,
      rankName: "Gold",
      rankTier: 2,
      selectedRole: "Core",
      selectedPlace: GAME_MAPS[0].name,
    },
    friends: INITIAL_FRIENDS,
    weapons: INITIAL_WEAPONS,
    storeItems: INITIAL_STORE_ITEMS,
    matchHistory: [],
    activeMap: GAME_MAPS[0],
    ownedEmoteIds: [],
  };
}

// this is for reading the saved lobby state from localStorage, filling in any missing fields with defaults
export function loadLobbyState() {
  if (typeof window === "undefined") return defaultLobbyState();
  try {
    const raw = localStorage.getItem(LOBBY_KEY);
    if (!raw) return defaultLobbyState();
    const s = JSON.parse(raw);
    const def = defaultLobbyState();
    return {
      lobbyProfile: { ...def.lobbyProfile, ...s.lobbyProfile },
      friends: s.friends ?? def.friends,
      weapons: s.weapons ?? def.weapons,
      storeItems: s.storeItems ?? def.storeItems,
      matchHistory: s.matchHistory ?? def.matchHistory,
      activeMap: s.activeMap ?? def.activeMap,
      ownedEmoteIds: s.ownedEmoteIds ?? def.ownedEmoteIds,
    };
  } catch {
    return defaultLobbyState();
  }
}

// this is for persisting the lobby state and notifying any listening components
export function saveLobbyState(s) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOBBY_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("lobby:change"));
}

// this is for recording a finished lobby-mode match: generates a history entry with randomized
// K/D/assists, grants coins/diamonds/XP, handles level-up, and saves the updated lobby state
export function addLobbyMatch(state, coins, diamonds, xp, outcome, map) {
  const now = new Date();
  const timestamp =
    now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const match = {
    id: `match_${Date.now()}`,
    timestamp,
    outcome,
    map,
    score:
      outcome === "victory"
        ? `${Math.floor(Math.random() * 4) + 5} - ${Math.floor(Math.random() * 4) + 1}`
        : `${Math.floor(Math.random() * 4) + 1} - ${Math.floor(Math.random() * 4) + 5}`,
    kills: Math.floor(Math.random() * 12) + (outcome === "victory" ? 5 : 1),
    deaths: Math.floor(Math.random() * 6) + (outcome === "defeat" ? 4 : 1),
    assists: Math.floor(Math.random() * 5),
    coinsEarned: coins,
    diamondsEarned: diamonds,
  };

  const newXp = state.lobbyProfile.xp + xp;
  const levelUp = newXp >= state.lobbyProfile.xpRequired;
  const updatedProfile = {
    ...state.lobbyProfile,
    coins: state.lobbyProfile.coins + coins,
    diamonds: state.lobbyProfile.diamonds + diamonds,
    xp: levelUp ? newXp - state.lobbyProfile.xpRequired : newXp,
    xpRequired: levelUp
      ? state.lobbyProfile.xpRequired + 100
      : state.lobbyProfile.xpRequired,
    level: levelUp ? state.lobbyProfile.level + 1 : state.lobbyProfile.level,
    matchesCount: state.lobbyProfile.matchesCount + 1,
  };

  const newState = {
    ...state,
    lobbyProfile: updatedProfile,
    matchHistory: [match, ...state.matchHistory].slice(0, 100),
  };
  saveLobbyState(newState);
  return newState;
}
