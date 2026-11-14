// ============================================================================
// gameTypes.js
// ----------------------------------------------------------------------------
// This file is the game's "data sheet". It holds all the fixed game content
// (every weapon, map, and the default new-player save) plus a few small helper
// functions used by the shop, inventory, and the live match (GameCanvas).
// There are no React components here — just plain data and math.
// ============================================================================

// Each weapon object has two grouping fields:
//   - "class"    -> which role loadout it belongs to (core / marksman / sniper)
//   - "category" -> which shop/inventory tab it shows up in
//                   (weapon / attachment / throwable / melee)

// WEAPONS is the full catalog of guns, melee, throwables, and attachments a
// player can own and equip. Each entry lists its combat stats and shop price.
export const WEAPONS = [
  {
    id: "ar15",
    name: "AR-15 Carbine",
    class: "core",
    category: "weapon",
    damage: 14,
    fireRate: 8,
    bulletSpeed: 1100,
    spread: 0.05,
    range: 700,
    magazine: 30,
    reloadMs: 1600,
    price: 0,
    description: "Standard issue. Balanced & reliable.",
    icon: "🔫",
  },
  {
    id: "smg9",
    name: "MP9 SMG",
    class: "core",
    category: "weapon",
    damage: 10,
    fireRate: 14,
    bulletSpeed: 950,
    spread: 0.09,
    range: 450,
    magazine: 40,
    reloadMs: 1500,
    price: 800,
    description: "High fire-rate close quarters.",
    icon: "🔫",
  },
  {
    id: "shotgun",
    name: "M870 Shotgun",
    class: "core",
    category: "weapon",
    damage: 9,
    fireRate: 1.5,
    bulletSpeed: 900,
    spread: 0.22,
    range: 350,
    magazine: 8,
    reloadMs: 2200,
    price: 1200,
    description: "Devastating up close. 6 pellets per shot.",
    icon: "🔫",
  },
  {
    id: "dmr",
    name: "SR-25 DMR",
    class: "marksman",
    category: "weapon",
    damage: 32,
    fireRate: 3,
    bulletSpeed: 1300,
    spread: 0.015,
    range: 900,
    magazine: 20,
    reloadMs: 2000,
    price: 1800,
    description: "Designated marksman rifle. Crisp.",
    icon: "🔫",
  },
  {
    id: "scout",
    name: "Scout Rifle",
    class: "marksman",
    category: "weapon",
    damage: 40,
    fireRate: 2,
    bulletSpeed: 1400,
    spread: 0.01,
    range: 1000,
    magazine: 10,
    reloadMs: 1800,
    price: 2400,
    description: "Precision mid-long range.",
    icon: "🔫",
  },
  {
    id: "awp",
    name: "AWP .338",
    class: "sniper",
    category: "weapon",
    damage: 95,
    fireRate: 0.8,
    bulletSpeed: 1800,
    spread: 0.003,
    range: 1400,
    magazine: 5,
    reloadMs: 3000,
    price: 3500,
    description: "One-shot torso kill. Bolt action.",
    icon: "🔫",
  },
  {
    id: "barrett",
    name: "Barrett M82",
    class: "sniper",
    category: "weapon",
    damage: 120,
    fireRate: 0.5,
    bulletSpeed: 2000,
    spread: 0.002,
    range: 1600,
    magazine: 10,
    reloadMs: 3500,
    price: 5500,
    description: "Anti-materiel. Penetrates everything.",
    icon: "🔫",
  },
  {
    id: "knife",
    name: "Combat Knife",
    class: "melee",
    category: "melee",
    damage: 55,
    fireRate: 1.8,
    bulletSpeed: 0,
    spread: 0,
    range: 60,
    magazine: 1,
    reloadMs: 0,
    price: 600,
    description: "Silent, deadly up close.",
    icon: "🗡️",
    isMelee: true,
  },
  {
    id: "grenade",
    name: "Frag Grenade",
    class: "explosive",
    category: "throwable",
    damage: 90,
    fireRate: 0.5,
    bulletSpeed: 600,
    spread: 0,
    range: 400,
    magazine: 3,
    reloadMs: 0,
    price: 900,
    description: "Thrown explosive. 3 per respawn.",
    icon: "💣",
    isThrowable: true,
    maxCarry: 3,
  },
  {
    id: "laser",
    name: "Laser Sight",
    class: "core",
    category: "attachment",
    damage: 0,
    fireRate: 0,
    bulletSpeed: 0,
    spread: -0.04,
    range: 0,
    magazine: 0,
    reloadMs: 0,
    price: 700,
    description: "-40% spread, visible laser dot.",
    icon: "🔦",
  },
  {
    id: "scope",
    name: "4x Scope",
    class: "marksman",
    category: "attachment",
    damage: 0,
    fireRate: 0,
    bulletSpeed: 0,
    spread: -0.02,
    range: 300,
    magazine: 0,
    reloadMs: 0,
    price: 1100,
    description: "+300 range, tighter accuracy.",
    icon: "🔭",
  },
];

// this is for the cosmetic victory-screen/lobby emotes players can buy and equip
export const EMOTES = [
  {
    id: "salute",
    name: "Salute",
    price: 400,
    description: "Sharp military salute.",
    frames: ["o7", "o7", "o7"],
  },
  {
    id: "wave",
    name: "Wave",
    price: 300,
    description: "Friendly wave.",
    frames: ["( ^ )", "(>^)>", "( ^ )"],
  },
  {
    id: "taunt",
    name: "Taunt",
    price: 500,
    description: "Flex on the enemy.",
    frames: ["ᕙ(⇀‸↼‶)ᕗ", "ᕙ(⇀‸↼‶)ᕗ", "ᕙ(⇀‸↼‶)ᕗ"],
  },
  {
    id: "dance",
    name: "Dance",
    price: 600,
    description: "Victory dance.",
    frames: ["(ノ^_^)ノ", "ヽ(^_^ヽ)", "(ノ^_^)ノ"],
  },
];

// this is for looking up a weapon by id anywhere in the app; falls back to the first weapon if not found
export const weaponById = (id) =>
  WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];

// MAPS is the list of playable maps offered in lobby map selection. The color
// fields describe each map's visual theme, drawn directly by GameCanvas.
export const MAPS = [
  {
    id: "city",
    name: "Urban Ruins",
    description: "Downtown firefight.",
    bgColor: "#1a1a2e",
    groundColor: "#2d2d3d",
    wallColor: "#3a3a4a",
    ambientColor: "#4a4a7a",
  },
  {
    id: "jungle",
    name: "Dense Jungle",
    description: "Thick canopy cover.",
    bgColor: "#0d1f0d",
    groundColor: "#1a3d1a",
    wallColor: "#2a5a2a",
    ambientColor: "#3a7a2a",
  },
  {
    id: "desert",
    name: "Scorched Desert",
    description: "Open sands, exposed flanks.",
    bgColor: "#1f1806",
    groundColor: "#3d3010",
    wallColor: "#5a4a20",
    ambientColor: "#8a7030",
  },
  {
    id: "bunker",
    name: "Underground Bunker",
    description: "Tight corridors, metal.",
    bgColor: "#0a0a0a",
    groundColor: "#1a1a1a",
    wallColor: "#2a2a2a",
    ambientColor: "#3a4a3a",
  },
];
// this is for looking up a map by id; falls back to the first map if not found
export const mapById = (id) => MAPS.find((m) => m.id === id) ?? MAPS[0];

// Per-weapon upgrade levels (0-MAX_UPGRADE) purchased in the inventory screen
export const MAX_UPGRADE = 3;
// this is for pricing the next upgrade level for a stat (scales up with each level)
export const upgradeCost = (level) => 300 * (level + 1);
// this is for computing a weapon's effective stats after upgrades are applied, used by GameCanvas combat math
export function applyUpgrades(w, u) {
  return {
    ...w,
    damage: Math.round(w.damage * (1 + 0.12 * u.damage)),
    fireRate: +(w.fireRate * (1 + 0.1 * u.fireRate)).toFixed(2),
    magazine: Math.round(w.magazine * (1 + 0.2 * u.magazine)),
  };
}

// DEFAULT_PROFILE is the starting save given to a brand-new player (before any
// saved data exists in localStorage): starting coins, the two free weapons,
// empty upgrades, and an empty match history.
export const DEFAULT_PROFILE = {
  name: "Recruit",
  coins: 2500,
  rankPoints: 0,
  ownedWeapons: ["ar15", "knife"],
  ownedEmotes: [],
  equipped: { core: "ar15", marksman: "ar15", sniper: "ar15" },
  activeEmote: "",
  upgrades: {},
  attachments: { laser: false, scope: false },
  weaponAttachments: {},
  history: [],
};
