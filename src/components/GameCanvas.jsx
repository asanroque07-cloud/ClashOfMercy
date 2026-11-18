// GameCanvas.jsx is the actual playable match — the biggest file in the project.
// It draws everything onto an HTML <canvas> (players, bullets, walls, HUD) and
// runs a game loop that updates ~60 times a second: reads keyboard/mouse input,
// moves everyone, handles shooting and damage, controls the enemy bots, and
// tracks the score. When the match ends it saves the results via storage.js.
import { useEffect, useRef, useCallback, useState } from "react";
import {
  mapById,
  weaponById,
  WEAPONS,
  applyUpgrades,
  EMOTES,
} from "../lib/gameTypes";
import { addMatch } from "../lib/storage";
import {
  drawOperatorBody,
  drawWeaponSprite,
  operatorStateFor,
  weaponClassFor,
} from "../game/operatorArt";
import {
  getTouchControlPosition,
  getTouchControlScale,
  loadTouchLayout,
  saveTouchLayout,
} from "../lib/touchControls";
import { GENERATED_GUN_KEYS, renderGunBuffers } from "../lib/weaponAudio";
import {
  ArrowUp,
  ArrowDown,
  RotateCw,
  Bomb,
  Hand,
  Move,
  Crosshair,
} from "lucide-react";
import SwapIcon from "./SwapIcon";

// ──── Constants (tunable game-feel numbers: world size, gravity, jump strength, speed) ────
const VIEW_W = 960,
  VIEW_H = 540,
  WORLD_W = 3600;
// The canvas draws in 960×540 world units but backs those with 2× the pixels,
// so rounded cartoon shapes and gradients come out crisp instead of chunky.
const RENDER_SCALE = 2;
const GY = 490; // GROUND_Y
const PW = 22,
  PH = 34; // player width/height
const GRAV = 0.55,
  JUMP = -13.5,
  SPD = 4.2;
// House (enterable armory) base geometry. The x-position is set per-map via
// each WORLDS entry's `houseX` field so it never overlaps battlefield
// structures (see IMPROVEMENT_TODO item #2). `houseW` may also be overridden
// per map when the clear gap is narrower than the default.
const HOUSE_DEF = { w: 280, h: 180 };
// HOUSE/DOOR are resolved at match start (see init()). Defaults keep the
// module-level helpers valid before the first match.
let HOUSE = { x: 1360, y: GY - 180, w: 280, h: 180 };
let DOOR = { x: HOUSE.x + 110, w: 60 };
function resolveHouse(mapDef) {
  const w = mapDef?.houseW ?? HOUSE_DEF.w;
  const x = mapDef?.houseX ?? 1360;
  HOUSE = { x, y: GY - 180, w, h: 180 };
  DOOR = { x: x + Math.round(w / 2) - 30, w: 60 };
}
const PLAYER_SPRITE_HEIGHT = 58;
const PLAYER_SPRITE_PATHS = {
  blue: { stand: "/sprites/blue-stand.png", run: "/sprites/blue-run.png" },
  red: { stand: "/sprites/red-stand.png", run: "/sprites/red-run.png" },
};
// Gunfire is synthesised at load time (see lib/weaponAudio) instead of being
// streamed from small mp3s, so these three keys have a volume but no src.
const SFX_CONFIG = {
  machinegun: { volume: 0.46 },
  pistol: { volume: 0.56 },
  sniper: { volume: 0.72 },
  reload: { src: "/sfx/reload.mp3", volume: 0.45 },
  load: { src: "/sfx/load.mp3", volume: 0.4 },
  bomb: { src: "/sfx/bomb.mp3", volume: 0.58 },
};

// How far a gunshot, reload or grenade carries. Sounds from other players are
// only played when they happen inside this radius, so a teammate shooting at the
// far end of the map no longer sounds like it came from your own barrel.
const SFX_HEAR_RANGE = 820;

// ──── Effect tuning ────
const MAX_PARTICLES = 400;
const MAX_DAMAGE_NUMBERS = 30;
const MAX_KILL_FEED = 5;
const KILL_FEED_LIFE = 5000;
const HEALTH_REGEN_DELAY = 4000; // ms before regen starts
const HEALTH_REGEN_RATE = 8; // hp per second

// ──── World geometry ────
// Each map now has its OWN battlefield layout with unique tactical features.
// buildWorld(mapId) returns { structures, bushes, ladders, pits, tunnels,
// hkitX, undergroundY, layers } used by the geometry helpers + renderer.
const GROUND_Y = GY; // surface ground line
// Underground floor (sewer / mine tunnel level). Deep enough that the lower
// level plays as its own stretch of map rather than a shallow trench.
const UNDERGROUND_Y = GY + 320;

// Per-map world layouts. Structure types:
//   wall    – solid vertical wall (blocks movement + bullets)
//   box     – solid crate (can stand on top; blocks when beside)
//   stair   – diagonal ramp (dir "left"/"right"), walkable slope
//   platform– one-way horizontal platform (stand on top, can jump up through)
//   sandbag – low solid cover (like a short wall)
//   rock    – solid irregular boulder
//   car     – solid wrecked vehicle (cover)
//   trench  – a pit in the ground (lowered floor) — entered from the top
// Ladders: { x, topY, botY } – climb vertically between two levels
// Pits/Manholes: { x, w, topY, botY, kind } – openings to an underground layer
//   kind "sewer" | "mine" | "shaft"
const WORLDS = {
  // ── CITY: Urban Ruins — sewers with ladders, elevated platforms, cars ──
  city: {
    structures: [
      { x: 360, y: GY - 110, w: 20, h: 110, type: "wall" },
      { x: 430, y: GY - 40, w: 70, h: 40, type: "car" },
      { x: 560, y: GY - 70, w: 120, h: 14, type: "platform" }, // collapsed overpass
      { x: 760, y: GY - 56, w: 40, h: 56, type: "box" },
      { x: 820, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 960, y: GY - 92, w: 18, h: 92, type: "wall" },
      { x: 1080, y: GY - 44, w: 60, h: 44, type: "car" },
      { x: 1180, y: GY - 80, w: 140, h: 14, type: "platform" },
      { x: 1710, y: GY - 75, w: 18, h: 75, type: "wall" },
      { x: 1762, y: GY - 64, w: 88, h: 64, type: "stair", dir: "left" },
      { x: 1960, y: GY - 40, w: 70, h: 40, type: "car" },
      { x: 2080, y: GY - 70, w: 120, h: 14, type: "platform" },
      { x: 2280, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 2410, y: GY - 110, w: 20, h: 110, type: "wall" },
      // ── Eastern district: bunker line, mine works, elevated slab ──
      { x: 2500, y: GY - 60, w: 88, h: 60, type: "stair", dir: "right" },
      { x: 2600, y: GY - 100, w: 150, h: 100, type: "bunker" },
      { x: 2790, y: GY - 46, w: 64, h: 46, type: "ore" },
      { x: 2910, y: GY - 96, w: 150, h: 14, type: "platform" },
      { x: 3090, y: GY - 110, w: 20, h: 110, type: "wall" },
      { x: 3170, y: GY - 44, w: 70, h: 44, type: "car" },
      { x: 3300, y: GY - 56, w: 44, h: 56, type: "box" },
    ],
    bushes: [
      { x: 690, y: GY, r: 44 },
      { x: 1500, y: GY, r: 48 },
      { x: 2340, y: GY, r: 40 },
    ],
    ladders: [
      { x: 600, topY: GY - 70, botY: UNDERGROUND_Y }, // into sewer below overpass
      { x: 1240, topY: GY - 80, botY: UNDERGROUND_Y }, // sewer access
      { x: 2120, topY: GY - 70, botY: UNDERGROUND_Y },
      { x: 2700, topY: GY, botY: UNDERGROUND_Y }, // eastern district access
      { x: 3150, topY: GY, botY: UNDERGROUND_Y },
    ],
    pits: [
      { x: 590, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "sewer" }, // manhole
      { x: 1230, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "sewer" },
      { x: 2110, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "sewer" },
      { x: 2690, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "sewer" },
      { x: 3140, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "sewer" },
    ],
    // underground sewer tunnel runs the whole width at UNDERGROUND_Y
    tunnel: { y: UNDERGROUND_Y, leftWall: 80, rightWall: WORLD_W - 80 },
    hkitX: [450, 1080, 1400, 2060, 2270, 2650, 3150, 3350],
    // Underground health kits (IMPROVEMENT_TODO #4) — sustain long sewer standoffs
    hkitXUnderground: [500, 900, 2100, 2700, 3200],
    // Underground cover (IMPROVEMENT_TODO #12) — pillars & rubble in the sewer
    underCover: [
      { x: 700, w: 26, h: 60, type: "pillar" },
      { x: 1100, w: 30, h: 50, type: "rubble" },
      { x: 1500, w: 26, h: 60, type: "pillar" },
      { x: 1900, w: 32, h: 46, type: "rubble" },
      { x: 2450, w: 26, h: 60, type: "pillar" },
      { x: 2900, w: 32, h: 46, type: "rubble" },
      { x: 3300, w: 26, h: 60, type: "pillar" },
    ],
    // Underground catwalks — a second walkable level above the service road
    underPlatforms: [
      { x: 700, w: 180, y: UNDERGROUND_Y - 84 },
      { x: 1600, w: 200, y: UNDERGROUND_Y - 84 },
      { x: 2500, w: 190, y: UNDERGROUND_Y - 220 },
    ],
    // House (armory) placed in the clear 1320–1710 gap (IMPROVEMENT_TODO #2)
    houseX: 1360,
  },

  // ── JUNGLE: Dense Jungle — mine tunnels, rope bridges, rocks ──
  jungle: {
    structures: [
      { x: 360, y: GY - 96, w: 60, h: 96, type: "rock" },
      { x: 520, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 620, y: GY - 110, w: 150, h: 14, type: "bridge" }, // rope bridge
      { x: 820, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 960, y: GY - 92, w: 18, h: 92, type: "wall" },
      { x: 1060, y: GY - 75, w: 18, h: 75, type: "wall" },
      { x: 1180, y: GY - 70, w: 56, h: 70, type: "rock" },
      { x: 1380, y: GY - 120, w: 160, h: 14, type: "bridge" }, // rope bridge
      { x: 1710, y: GY - 75, w: 18, h: 75, type: "wall" },
      { x: 1762, y: GY - 64, w: 88, h: 64, type: "stair", dir: "left" },
      { x: 1980, y: GY - 80, w: 60, h: 80, type: "rock" },
      { x: 2280, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 2410, y: GY - 96, w: 18, h: 96, type: "wall" },
      // ── Eastern works: mine head, bunker outpost, rope bridge over the pit ──
      { x: 2500, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 2610, y: GY - 96, w: 130, h: 96, type: "bunker" },
      { x: 2780, y: GY - 60, w: 64, h: 60, type: "ore" },
      { x: 2900, y: GY - 100, w: 60, h: 100, type: "rock" },
      { x: 3050, y: GY - 120, w: 160, h: 14, type: "bridge" },
      { x: 3250, y: GY - 96, w: 18, h: 96, type: "wall" },
      { x: 3320, y: GY - 52, w: 44, h: 52, type: "box" },
    ],
    bushes: [
      { x: 470, y: GY, r: 50 },
      { x: 760, y: GY, r: 52 },
      { x: 1290, y: GY, r: 56 },
      { x: 1700, y: GY, r: 44 },
      { x: 2140, y: GY, r: 48 },
      { x: 2340, y: GY, r: 40 },
    ],
    ladders: [
      { x: 700, topY: GY, botY: UNDERGROUND_Y }, // mine shaft ladder
      { x: 1450, topY: GY, botY: UNDERGROUND_Y },
      { x: 2700, topY: GY, botY: UNDERGROUND_Y }, // eastern mine access
      { x: 3150, topY: GY, botY: UNDERGROUND_Y },
    ],
    pits: [
      { x: 690, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "mine" }, // cave entrance
      { x: 1440, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "mine" },
      { x: 2690, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "mine" },
      { x: 3140, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "mine" },
    ],
    tunnel: { y: UNDERGROUND_Y, leftWall: 120, rightWall: WORLD_W - 120 },
    hkitX: [450, 1080, 1400, 2060, 2270, 2650, 3150, 3350],
    // Underground health kits (IMPROVEMENT_TODO #4)
    hkitXUnderground: [600, 1700, 2200, 2750, 3250],
    // Underground cover (IMPROVEMENT_TODO #12) — support beams & broken cart in mine
    underCover: [
      { x: 650, w: 24, h: 64, type: "beam" },
      { x: 1100, w: 34, h: 48, type: "rubble" },
      { x: 1600, w: 24, h: 64, type: "beam" },
      { x: 2100, w: 30, h: 50, type: "rubble" },
      { x: 2450, w: 24, h: 64, type: "beam" },
      { x: 2900, w: 34, h: 50, type: "rubble" },
      { x: 3300, w: 24, h: 64, type: "beam" },
    ],
    // Underground catwalks — mine gantries above the road
    underPlatforms: [
      { x: 600, w: 170, y: UNDERGROUND_Y - 84 },
      { x: 1720, w: 190, y: UNDERGROUND_Y - 84 },
      { x: 2650, w: 190, y: UNDERGROUND_Y - 220 },
    ],
    // House placed in the jungle's clearest gap (1540–1710) — narrower (IMPROVEMENT_TODO #2)
    houseX: 1540, houseW: 170,
  },

  // ── DESERT: Scorched Desert — trenches, sandbag bunkers, rock outcrops ──
  desert: {
    structures: [
      { x: 380, y: GY - 40, w: 80, h: 40, type: "sandbag" }, // bunker wall
      { x: 470, y: GY - 52, w: 44, h: 52, type: "box" }, // moved clear of pit@550
      { x: 700, y: GY - 70, w: 70, h: 70, type: "rock" },
      { x: 820, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 960, y: GY - 92, w: 18, h: 92, type: "wall" },
      { x: 1060, y: GY - 75, w: 18, h: 75, type: "wall" },
      { x: 1200, y: GY - 40, w: 90, h: 40, type: "sandbag" },
      { x: 1710, y: GY - 75, w: 18, h: 75, type: "wall" },
      { x: 1762, y: GY - 64, w: 88, h: 64, type: "stair", dir: "left" },
      { x: 1960, y: GY - 60, w: 70, h: 60, type: "rock" },
      { x: 2160, y: GY - 40, w: 80, h: 40, type: "sandbag" },
      { x: 2280, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 2410, y: GY - 92, w: 18, h: 92, type: "wall" },
      // ── Eastern works: bunker, ore cart, rock outcrops over the trench ──
      { x: 2500, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 2610, y: GY - 92, w: 140, h: 92, type: "bunker" },
      { x: 2790, y: GY - 48, w: 64, h: 48, type: "ore" },
      { x: 2900, y: GY - 70, w: 70, h: 70, type: "rock" },
      { x: 3050, y: GY - 40, w: 80, h: 40, type: "sandbag" },
      { x: 3180, y: GY - 92, w: 18, h: 92, type: "wall" },
      { x: 3300, y: GY - 52, w: 44, h: 52, type: "box" },
    ],
    bushes: [
      { x: 640, y: GY, r: 36 },
      { x: 1500, y: GY, r: 38 },
      { x: 2080, y: GY, r: 34 },
    ],
    ladders: [
      { x: 550, topY: GY, botY: UNDERGROUND_Y }, // down into a dug trench system (aligned with pit)
      { x: 1890, topY: GY, botY: UNDERGROUND_Y }, // aligned with pit
      { x: 2700, topY: GY, botY: UNDERGROUND_Y }, // eastern trench access
      { x: 3150, topY: GY, botY: UNDERGROUND_Y },
    ],
    pits: [
      { x: 550, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 1890, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 2690, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 3140, w: 46, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
    ],
    trench: { y: UNDERGROUND_Y, leftWall: 100, rightWall: WORLD_W - 100 },
    hkitX: [450, 1080, 1400, 2060, 2270, 2650, 3150, 3350],
    // Underground health kits (IMPROVEMENT_TODO #4)
    hkitXUnderground: [550, 1700, 2200, 2750, 3250],
    // Underground cover (IMPROVEMENT_TODO #12) — sandbag piles & broken crates in trench
    underCover: [
      { x: 700, w: 32, h: 52, type: "sandpile" },
      { x: 1100, w: 28, h: 50, type: "rubble" },
      { x: 1500, w: 32, h: 52, type: "sandpile" },
      { x: 1900, w: 28, h: 50, type: "rubble" },
      { x: 2450, w: 32, h: 52, type: "sandpile" },
      { x: 2900, w: 28, h: 50, type: "rubble" },
      { x: 3300, w: 32, h: 52, type: "sandpile" },
    ],
    // Underground catwalks — timber walkways above the trench road
    underPlatforms: [
      { x: 650, w: 180, y: UNDERGROUND_Y - 84 },
      { x: 1700, w: 180, y: UNDERGROUND_Y - 84 },
      { x: 2600, w: 190, y: UNDERGROUND_Y - 220 },
    ],
    // House placed in the clear 1290–1710 gap (IMPROVEMENT_TODO #2)
    houseX: 1360,
  },

  // ── BUNKER: Underground — vertical shafts with ladders, catwalks ──
  bunker: {
    structures: [
      { x: 360, y: GY - 92, w: 20, h: 92, type: "wall" },
      { x: 500, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 560, y: GY - 120, w: 160, h: 14, type: "platform" }, // catwalk
      { x: 820, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 960, y: GY - 92, w: 18, h: 92, type: "wall" },
      { x: 1080, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 1200, y: GY - 130, w: 180, h: 14, type: "platform" }, // catwalk
      { x: 1710, y: GY - 75, w: 18, h: 75, type: "wall" },
      { x: 1762, y: GY - 64, w: 88, h: 64, type: "stair", dir: "left" },
      { x: 2000, y: GY - 120, w: 160, h: 14, type: "platform" },
      { x: 2280, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 2410, y: GY - 92, w: 20, h: 92, type: "wall" },
      // ── Eastern works: second bunker block, ore rail, long catwalk ──
      { x: 2500, y: GY - 64, w: 88, h: 64, type: "stair", dir: "right" },
      { x: 2610, y: GY - 100, w: 150, h: 100, type: "bunker" },
      { x: 2800, y: GY - 50, w: 64, h: 50, type: "ore" },
      { x: 2920, y: GY - 130, w: 180, h: 14, type: "platform" },
      { x: 3100, y: GY - 92, w: 20, h: 92, type: "wall" },
      { x: 3190, y: GY - 52, w: 44, h: 52, type: "box" },
      { x: 3310, y: GY - 92, w: 20, h: 92, type: "wall" },
    ],
    bushes: [],
    ladders: [
      { x: 620, topY: GY, botY: UNDERGROUND_Y }, // shaft ladder
      { x: 1270, topY: GY, botY: UNDERGROUND_Y },
      { x: 2060, topY: GY, botY: UNDERGROUND_Y },
      { x: 2700, topY: GY, botY: UNDERGROUND_Y }, // eastern works access
      { x: 3150, topY: GY, botY: UNDERGROUND_Y },
    ],
    pits: [
      { x: 610, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 1260, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 2050, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 2690, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
      { x: 3140, w: 40, topY: GY, botY: UNDERGROUND_Y, kind: "shaft" },
    ],
    tunnel: { y: UNDERGROUND_Y, leftWall: 140, rightWall: WORLD_W - 140 },
    hkitX: [450, 1080, 1400, 2060, 2270, 2650, 3150, 3350],
    // Underground health kits (IMPROVEMENT_TODO #4)
    hkitXUnderground: [650, 1700, 2200, 2750, 3250],
    // Underground cover (IMPROVEMENT_TODO #12) — metal crates & cable drums in shaft
    underCover: [
      { x: 700, w: 28, h: 56, type: "crate" },
      { x: 1100, w: 30, h: 50, type: "rubble" },
      { x: 1500, w: 28, h: 56, type: "crate" },
      { x: 1900, w: 30, h: 50, type: "rubble" },
      { x: 2450, w: 28, h: 56, type: "crate" },
      { x: 2900, w: 30, h: 50, type: "rubble" },
      { x: 3300, w: 28, h: 56, type: "crate" },
    ],
    // Underground catwalks — steel catwalks above the shaft road
    underPlatforms: [
      { x: 720, w: 190, y: UNDERGROUND_Y - 84 },
      { x: 1650, w: 180, y: UNDERGROUND_Y - 84 },
      { x: 2550, w: 200, y: UNDERGROUND_Y - 220 },
    ],
    // House placed in the clear 1380–1710 gap (IMPROVEMENT_TODO #2)
    houseX: 1400,
  },
};

// Active world (set per match). Defaults to city so the module-level helpers
// always have something valid before the first match initializes.
let WORLD = WORLDS.city;
const STRUCTURES = () => WORLD.structures;
const BUSHES = () => WORLD.bushes;
const HKIT_X = () => WORLD.hkitX;
const HKIT_X_UNDER = () => WORLD.hkitXUnderground || [];
const UNDER_COVER = () => WORLD.underCover || [];

// ──── Geometry helpers ────
// p.underground: when true the player is on the lower tunnel/sewer level.
// prevFeetY: the player's feet Y on the previous frame — used so one-way
// platforms/bridges only catch a player who was ABOVE them last frame
// (IMPROVEMENT_TODO #1). Callers should pass the stored p._prevFeetY.
function getFloorAt(x, underground, prevFeetY) {
  let fl = underground ? UNDERGROUND_Y : GY;
  // Underground layer: bounded by tunnel/sewer/trench side walls (a flat floor
  // across the span; nothing to stand on above while underground).
  if (underground) {
    // The road is the base floor; underground catwalks add a second walkable
    // level above it (one-way, exactly like the surface platforms).
    let fl = UNDERGROUND_Y;
    for (const pl of (WORLD.underPlatforms || [])) {
      if (x + PW / 2 > pl.x + 2 && x - PW / 2 < pl.x + pl.w - 2 && pl.y < fl) {
        const wasAbove = prevFeetY === undefined || prevFeetY <= pl.y + 4;
        if (wasAbove) fl = pl.y;
      }
    }
    return fl;
  }
  for (const s of WORLD.structures) {
    if (s.type === "box" || s.type === "rock" || s.type === "car" ||
        s.type === "sandbag" || s.type === "bunker" || s.type === "ore") {
      if (x + PW / 2 > s.x + 2 && x - PW / 2 < s.x + s.w - 2 && s.y < fl)
        fl = s.y;
    } else if (s.type === "stair" && s.dir) {
      if (x > s.x - 4 && x < s.x + s.w + 4) {
        const t = Math.max(0, Math.min(1, (x - s.x) / s.w));
        const sf = s.dir === "right" ? GY - s.h * t : GY - s.h * (1 - t);
        if (sf < fl) fl = sf;
      }
    } else if (s.type === "platform" || s.type === "bridge") {
      // One-way (IMPROVEMENT_TODO #1): only a floor when the player's feet were
      // above the platform top in the previous frame AND they are now at/below
      // it (i.e. falling onto it). A player rising from below passes through.
      if (x + PW / 2 > s.x + 2 && x - PW / 2 < s.x + s.w - 2 && s.y < fl) {
        const wasAbove = prevFeetY === undefined || prevFeetY <= s.y + 4;
        if (wasAbove) fl = s.y;
      }
    }
  }
  return fl;
}

function resolveX(oldX, newX, y, underground) {
  if (underground) {
    // Confined to the tunnel span.
    const t = WORLD.tunnel || WORLD.trench;
    if (t) {
      const left = t.leftWall + PW / 2;
      const right = t.rightWall - PW / 2;
      let x = Math.max(left, Math.min(newX, right));
      // Collide with underground cover objects (IMPROVEMENT_TODO #12)
      for (const c of UNDER_COVER()) {
        const sL = c.x,
          sR = c.x + c.w;
        if (y - PH < UNDERGROUND_Y && y > UNDERGROUND_Y - c.h) {
          if (x + PW / 2 > sL && x - PW / 2 < sR) {
            if (oldX + PW / 2 <= sL) return sL - PW / 2 - 0.5;
            if (oldX - PW / 2 >= sR) return sR + PW / 2 + 0.5;
            return oldX;
          }
        }
      }
      return x;
    }
    return newX;
  }
  for (const s of WORLD.structures) {
    if (s.type === "stair") continue;
    if ((s.type === "platform" || s.type === "bridge")) continue; // one-way, no X block
    const sL = s.x,
      sR = s.x + s.w;
    const standable =
      s.type === "box" || s.type === "rock" || s.type === "car" ||
      s.type === "sandbag" || s.type === "bunker" || s.type === "ore";
    if (standable && y <= s.y + 2) continue; // standing on top
    if (y - PH < GY && y > s.y) {
      if (newX + PW / 2 > sL && newX - PW / 2 < sR) {
        if (oldX + PW / 2 <= sL) return sL - PW / 2 - 0.5;
        if (oldX - PW / 2 >= sR) return sR + PW / 2 + 0.5;
        return oldX;
      }
    }
  }
  return newX;
}

function isInBush(x, y) {
  for (const b of WORLD.bushes) {
    if (Math.hypot(x - b.x, y - b.y) < b.r) return true;
  }
  return false;
}

function isOccluded(meX, tx, underground) {
  if (underground) {
    // Underground: check cover pillars/rubble along the sightline
    // (IMPROVEMENT_TODO #12). Treat any cover object between me and target as
    // a sightline blocker.
    const lo = Math.min(meX, tx),
      hi = Math.max(meX, tx);
    for (const c of UNDER_COVER()) {
      if (c.x + c.w <= lo || c.x >= hi) continue;
      return true;
    }
    return false; // open tunnel sightline elsewhere
  }
  const lo = Math.min(meX, tx),
    hi = Math.max(meX, tx);
  const eyeY = GY - PH * 0.65;
  for (const s of WORLD.structures) {
    if (s.type === "stair" || s.type === "platform" || s.type === "bridge")
      continue;
    if (s.x + s.w <= lo || s.x >= hi) continue;
    if (s.y <= eyeY) return true;
  }
  return false;
}

// Find nearest cover structure for AI retreat.
// Underground: searches the per-map underCover objects (IMPROVEMENT_TODO #12).
function findCoverNear(x, fromX, underground) {
  if (underground) {
    let best = null;
    let bestDist = Infinity;
    for (const c of UNDER_COVER()) {
      const sx = c.x + c.w / 2;
      const distFromThreat = Math.abs(sx - fromX);
      const distFromMe = Math.abs(sx - x);
      if (distFromThreat > 50 && distFromMe < bestDist && distFromMe < 200) {
        best = c;
        bestDist = distFromMe;
      }
    }
    return best;
  }
  let best = null;
  let bestDist = Infinity;
  for (const s of WORLD.structures) {
    if (s.type === "stair" || s.type === "platform" || s.type === "bridge")
      continue;
    const sx = s.x + s.w / 2;
    const distFromThreat = Math.abs(sx - fromX);
    const distFromMe = Math.abs(sx - x);
    // Cover should be between AI and threat, and reasonably close
    if (distFromThreat > 50 && distFromMe < bestDist && distFromMe < 200) {
      best = s;
      bestDist = distFromMe;
    }
  }
  return best;
}

// Find a ladder the player can grab at their current position.
// Returns the NEAREST ladder whose x is within grab range and whose vertical
// span covers the player (or their feet, just after stepping off an end).
const LADDER_GRAB_X = 30;
const LADDER_COOLDOWN = 30; // frames before a ladder can be grabbed again
function findLadderNear(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const lad of (WORLD.ladders || [])) {
    const dx = Math.abs(x - lad.x);
    if (dx >= LADDER_GRAB_X) continue;
    if (y < lad.topY - 14 || y > lad.botY + 14) continue;
    if (dx < bestDist) {
      best = lad;
      bestDist = dx;
    }
  }
  return best;
}

// Ladder traversal state. The lower level is one continuous tunnel that both
// teams can walk, so a ladder in the enemy field is a real flank route.
function grabLadder(p, lad) {
  if ((p.ladderCooldown || 0) > 0) return false;
  p.onLadder = lad;
  p.climbing = true;
  p.x = lad.x;
  p.vy = 0;
  p.onGround = false;
  p.fallingIntoPit = false;
  return true;
}

// Step off a ladder. The player's height decides the layer they land on, which
// also drives the camera, collisions, AI and the underground-only health kits.
function releaseLadder(p) {
  p.onLadder = null;
  p.climbing = false;
  p.climbDir = 0;
  p.vy = 0;
  p.onGround = false;
  p.ladderCooldown = LADDER_COOLDOWN;
  p.underground = p.y > GY + 2;
}

// Drop through an open pit / manhole / mine entrance into the lower level.
// The player starts falling from the surface and lands on the tunnel floor.
function dropIntoPit(p) {
  p.underground = true;
  p.onGround = false;
  p.vy = 1;
  p.fallingIntoPit = true;
}

function pitAt(x, y) {
  if (Math.abs(y - GY) > 3) return null;
  for (const pit of (WORLD.pits || [])) {
    if (Math.abs(x - pit.x) < pit.w / 2 + 4) return pit;
  }
  return null;
}

// How far the camera is panned down toward the underground layer.
function undergroundCameraY(p) {
  if (p.onLadder) {
    // Follow the climber smoothly so the shaft is visible all the way down/up.
    return Math.max(0, Math.min(p.y - GY, UNDERGROUND_Y - GY));
  }
  return p.underground ? UNDERGROUND_Y - GY : 0;
}

let _eid = 0,
  _bid = 0,
  _pid = 0,
  _dnid = 0,
  _kfid = 0;
function randBetween(a, b) {
  return a + Math.random() * (b - a);
}
// Returns which sprite sheet to display for a player. "run" only when actually
// moving on the ground, otherwise "stand". (Smooth body motion is handled by the
// procedural transform in drawPlayer, not by swapping frames.)
function getSpriteFrame(p) {
  if (p.onLadder) return "stand"; // climbing uses procedural pose, no run sheet
  if (!p.onGround || Math.abs(p.vx) < 0.85) return "stand";
  return "run";
}

// ── Procedural animation engine ──
// Computes a set of smooth, continuous animation values for a player every
// frame. Each player carries its own clock (p.animTime) and gait phase
// (p.walkPhase) so characters never move in lockstep. The result drives the
// body transform (bob, lean, squash/stretch, recoil kick, idle breathing) in
// drawPlayer. dtScale is the frame delta-time multiplier (≈1 at 60fps).
const ANIM_WALK_FREQ = 0.62; // gait cycles per frame at full speed (snappier stride)
const ANIM_BOB_AMP = 4.2; // px vertical bob at full stride (livelier)
const ANIM_LEAN_AMP = 0.22; // rad forward lean at full speed (more dynamic)
const ANIM_BREATH_AMP = 1.6; // px idle breathing amplitude (more present)
const ANIM_SQUASH_MAX = 0.32; // max landing squash (harder-hitting impact)
const ANIM_RECOIL_KICK = 0.2; // max body recoil rotation per shot (punchier)
const ANIM_SMOOTH = 0.22; // smoothing factor (snappier but still smooth)

// Starts the gun-swap animation. Kept at module scope because updatePlayerAnim
// (also module scope) needs it; the component-level triggerWeaponSwap adds SFX.
function beginWeaponSwapAnim(p) {
  p.weaponSwapTimer = p.weaponSwapDur || 18;
}

function updatePlayerAnim(p, dtScale) {
  p.animTime += dtScale;

  const speed = Math.abs(p.vx);
  const moving = p.onGround && speed > 0.85;
  const speedT = Math.min(1, speed / SPD); // 0..1 normalized run intensity

  // Advance the gait phase. We scale by speed so a slow walk cycles slowly and a
  // full sprint cycles fast, and freeze it when standing so legs don't slide.
  if (moving) {
    p.walkPhase += dtScale * ANIM_WALK_FREQ * (0.45 + speedT * 0.9);
  } else {
    // Ease the phase back toward a neutral stance when idle.
    p.walkPhase *= 0.85;
  }

  // Detect landing: was airborne last frame, on ground this frame, and falling.
  if (p.onGround && !p.wasOnGround) {
    const impact = Math.min(1, Math.abs(p._lastVy ?? 0) / 16);
    p.landSquash = Math.max(p.landSquash, ANIM_SQUASH_MAX * (0.4 + impact));
    // Kick off a springy settle bounce: the body rebounds upward then settles.
    // Stronger landings produce a bigger, longer bounce.
    p.landBounce = -ANIM_SQUASH_MAX * (0.5 + impact) * 1.7;
  }
  p.wasOnGround = p.onGround;
  // Track previous vertical velocity for landing impact strength.
  p._lastVy = p.vy;

  // Decay landing squash (recovers over ~8 frames).
  p.landSquash *= Math.pow(0.86, dtScale);
  if (p.landSquash < 0.004) p.landSquash = 0;

  // Integrate the springy settle bounce (damped spring toward 0). This makes the
  // character rebound and gently overshoot after a hard landing instead of just
  // snapping back, giving landings weight and bounce.
  if (Math.abs(p.landBounce) > 0.001 || Math.abs(p.landBouncePos) > 0.001) {
    // spring force: pulls position back to 0; bounce is the velocity.
    const spring = -p.landBouncePos * 0.35;
    p.landBounce += spring * dtScale;
    // damping (loses a little energy each frame so it settles).
    p.landBounce *= Math.pow(0.82, dtScale);
    p.landBouncePos += p.landBounce * dtScale;
    if (Math.abs(p.landBounce) < 0.0015 && Math.abs(p.landBouncePos) < 0.0015) {
      p.landBounce = 0;
      p.landBouncePos = 0;
    }
  }

  // Smoothed bob / lean targets.
  const targetBob = moving ? ANIM_BOB_AMP * speedT : 0;
  const targetLean = moving ? ANIM_LEAN_AMP * speedT : 0;
  p.bobAmt += (targetBob - p.bobAmt) * Math.min(1, ANIM_SMOOTH * dtScale);
  p.leanAmt += (targetLean - p.leanAmt) * Math.min(1, ANIM_SMOOTH * dtScale);

  // Body recoil kick follows the gameplay recoil value, decays with it.
  const targetRecoil = (p.recoil ?? 0) * ANIM_RECOIL_KICK;
  p.bodyRecoil += (targetRecoil - p.bodyRecoil) * Math.min(1, 0.25 * dtScale);

  // ── Ladder climbing animation (IMPROVEMENT_TODO #13) ──
  // While on a ladder, run an alternating reach-pull gait. Speed of the cycle
  // is driven by how fast the player is actually moving along the ladder
  // (measured by vertical delta since last frame), so resting on a rung freezes
  // the limbs while active climbing animates them.
  if (p.onLadder) {
    const dy = Math.abs(p.y - (p.prevClimbY || p.y));
    p.prevClimbY = p.y;
    const climbSpeedT = Math.min(1, dy / 2.5);
    p.climbPhase += dtScale * 0.5 * (0.3 + climbSpeedT * 1.3);
    const targetClimb = ANIM_BOB_AMP * 0.55 * climbSpeedT;
    p.climbBobAmt += (targetClimb - p.climbBobAmt) * Math.min(1, ANIM_SMOOTH * dtScale);
  } else {
    p.prevClimbY = p.y;
    p.climbBobAmt *= Math.pow(0.85, dtScale);
    if (p.climbBobAmt < 0.004) p.climbBobAmt = 0;
  }

  // ── Gun / weapon animation (swap, sway, bob, reload dip) ──
  // Detect weapon/slot changes that happened outside the explicit trigger
  // paths (a safety net so any swap animates even if a call site was missed).
  if (p.prevSlot !== p.slot || p.prevWeaponId !== p.primaryWeaponId) {
    if (p.weaponSwapTimer <= 0) beginWeaponSwapAnim(p);
    p.prevSlot = p.slot;
    p.prevWeaponId = p.primaryWeaponId;
  }
  // Weapon-swap timer counts down; the gun lowers then raises in an arc.
  if (p.weaponSwapTimer > 0) {
    p.weaponSwapTimer -= dtScale;
    if (p.weaponSwapTimer < 0) p.weaponSwapTimer = 0;
  }
  // Gun bob: a small independent vertical+horizontal cycle while moving on
  // ground, so the weapon feels alive in the hands (separate from body bob).
  if (moving && p.onGround) {
    p.gunBobPhase += dtScale * ANIM_WALK_FREQ * (0.4 + speedT * 0.9);
    p.gunBobAmt += (1 - p.gunBobAmt) * Math.min(1, ANIM_SMOOTH * dtScale);
  } else {
    p.gunBobAmt *= Math.pow(0.86, dtScale);
    if (p.gunBobAmt < 0.004) p.gunBobAmt = 0;
  }
  // Reload dip: smoothly lower the gun while reloading, raise when done.
  const targetDip = p.reloading ? 1 : 0;
  p.reloadDip += (targetDip - p.reloadDip) * Math.min(1, 0.12 * dtScale);
  // Lateral sway eases toward 0 (set by aim movement elsewhere if desired).
  p.gunSway *= Math.pow(0.9, dtScale);
}

// Computes the per-frame gun/weapon transform for rendering. This drives the
// "gun is moving" feel: a vertical+horizontal bob while running, a downward dip
// while reloading, and a full lower-then-raise arc while swapping weapons.
// Returns offsets in pixels and an opacity for the swap hide moment.
function getGunTransform(p) {
  // Base bob: small independent cycle so the gun jiggles in the hands while
  // moving. Uses the gun's own phase so it desyncs from the body bob.
  const moving = p.onGround && Math.abs(p.vx) > 0.85;
  const speedT = Math.min(1, Math.abs(p.vx) / SPD);
  const bobY = moving
    ? (Math.sin(p.gunBobPhase * 2) * 1.4 + Math.sin(p.gunBobPhase) * 0.6) *
      p.gunBobAmt * speedT
    : 0;
  const bobX = moving ? Math.sin(p.gunBobPhase * 2 + 0.6) * 1.0 * p.gunBobAmt * speedT : 0;

  // Reload dip: the gun muzzle drops while the mag is swapped (down to ~10px).
  const dipY = p.reloadDip * 11;
  const dipAngle = p.reloadDip * 0.5; // rotate muzzle downward

  // Weapon-swap arc: over weaponSwapDur frames the gun lowers out of view,
  // hits the bottom at the midpoint (where the old gun is "holstered" and the
  // new one grabbed), then rises back to firing position. We model it as a
  // sin(0..π) so it eases in and out — peak hide at t=0.5.
  let swapY = 0;
  let swapOpacity = 1;
  if (p.weaponSwapTimer > 0) {
    const t = 1 - p.weaponSwapTimer / p.weaponSwapDur; // 0→1 over the swap
    const arc = Math.sin(t * Math.PI); // 0→1→0
    swapY = arc * 26; // gun drops ~26px at the midpoint (fully out of view)
    swapOpacity = 1 - arc; // fades the gun out at the swap moment
  }

  // Add recoil kick to the gun (muzzle flips up slightly when firing).
  const recoilKick = (p.recoil ?? 0) * -8;

  return {
    offsetY: bobY + dipY + swapY + recoilKick,
    offsetX: bobX,
    rotate: dipAngle + (p.recoil ?? 0) * 0.18,
    opacity: swapOpacity,
    swapping: p.weaponSwapTimer > 0,
  };
}

// Returns the full set of transform values for rendering a player this frame.
// All angles in radians; squashX/squashY are scale multipliers around the body.
function getAnimTransform(p) {
  const speedT = Math.min(1, Math.abs(p.vx) / SPD);
  const moving = p.onGround && Math.abs(p.vx) > 0.85;
  // Vertical bob: a sine driven by the gait phase. Add a second harmonic for a
  // more natural two-beat stride (head dips twice per full leg cycle). Add the
  // springy landing bounce (rebound + settle) on top.
  const bob =
    (moving
      ? (Math.sin(p.walkPhase * 2) * 0.7 + Math.sin(p.walkPhase) * 0.3) *
        p.bobAmt
      : Math.sin(p.animTime * 0.045) * ANIM_BREATH_AMP) + // idle breathing
    (p.landBouncePos || 0) * 9; // rebound in px (positive = lift after squash)

  // Horizontal sway (opposite to bob) — the torso counter-rotates slightly.
  const sway = moving ? Math.sin(p.walkPhase * 2 + 0.4) * 1.4 * speedT : 0;

  // Forward lean when running (positive = lean into movement). In air we add a
  // tuck based on vertical velocity (legs up when rising, extended when falling).
  let lean = p.leanAmt;
  if (!p.onGround) {
    lean += Math.max(-0.12, Math.min(0.12, (p.vy ?? 0) * -0.006));
  }

  // Recoil kick: lean backward a touch when the gun fires.
  lean += p.bodyRecoil;

  // Squash & stretch: landing compresses vertically (and widens), a jump in the
  // air stretches vertically (and narrows).
  let squashY = 1;
  let squashX = 1;
  if (p.landSquash > 0) {
    squashY = 1 - p.landSquash; // compress
    squashX = 1 + p.landSquash * 0.7; // widen (area-ish preserved)
  } else if (!p.onGround) {
    const stretch = Math.min(0.12, Math.abs(p.vy ?? 0) * 0.006);
    squashY = 1 + stretch; // stretch up
    squashX = 1 - stretch * 0.6; // narrow
  }

  // ── Ladder climbing overrides (IMPROVEMENT_TODO #13) ──
  // On a ladder the character is upright, anchored, and performs a rhythmic
  // reach-and-pull cycle: the body bobs with each rung while the torso sways
  // side to side as weight shifts between hands. We replace the walk-driven
  // bob/sway with the climb cycle so the pose reads as climbing, not running.
  let climbing = false;
  if (p.onLadder) {
    climbing = true;
    // Body bobs in a two-beat rhythm matching the reach cycle (head dips per
    // hand-pull). Uses the smoothed climb amplitude so resting freezes motion.
    const cb = Math.sin(p.climbPhase * 2) * p.climbBobAmt;
    const bobClimb = cb + (p.landBouncePos || 0) * 9;
    return {
      bob: bobClimb,
      sway: Math.sin(p.climbPhase) * 1.6 * Math.min(1, p.climbBobAmt / 1.5),
      lean: 0,
      squashX,
      squashY,
      speedT: 0,
      moving: false,
      climbing,
      climbPhase: p.climbPhase,
      gun: getGunTransform(p),
    };
  }

  return { bob, sway, lean, squashX, squashY, speedT, moving, gun: getGunTransform(p) };
}
function getLoadoutWeapon(profile, role, mode) {
  // The loadout modal sets profile.loadout.primary — that gun is what the player
  // spawns with. Older saves without a loadout fall back to the role table.
  const eqId =
    profile.loadout?.primary ||
    (mode === "classic" ? profile.equipped.core : profile.equipped[role]);
  const u = profile.upgrades[eqId] || { damage: 0, fireRate: 0, magazine: 0 };
  return applyUpgrades(weaponById(eqId), u);
}
function getAvailableGuns(profile, mode) {
  const all = WEAPONS.filter(
    (w) => !w.isMelee && !w.isThrowable && w.category === "weapon",
  );
  return mode === "classic"
    ? all
    : all.filter((w) => profile.ownedWeapons.includes(w.id));
}
function findBestTarget(me, s) {
  const candidates = s.players
    .filter(
      (p) =>
        p.team !== me.team &&
        p.alive &&
        !p.inBush &&
        !isOccluded(me.x, p.x, me.underground) &&
        // can't see a target on a different layer (surface vs underground)
        me.underground === p.underground,
    )
    .sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x));
  return candidates[0] ?? null;
}

// ──── Particle system helpers ────
function spawnParticles(arr, x, y, opts) {
  const {
    count = 8,
    speed = 3,
    spread = Math.PI * 2,
    angle = 0,
    life = 40,
    size = 3,
    color = "#fde047",
    gravity = 0.15,
    shrink = true,
    type = "circle",
  } = opts || {};
  for (let i = 0; i < count; i++) {
    if (arr.length >= MAX_PARTICLES) arr.shift();
    const a = angle + (Math.random() - 0.5) * spread;
    const sp = speed * (0.5 + Math.random() * 0.5);
    const lf = life * (0.7 + Math.random() * 0.6);
    _pid++;
    arr.push({
      id: _pid,
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: lf,
      maxLife: lf,
      size: size * (0.7 + Math.random() * 0.6),
      color,
      gravity,
      shrink,
      type,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
}

function spawnMuzzleFlash(arr, x, y, angle) {
  spawnParticles(arr, x, y, {
    count: 5,
    speed: 6,
    spread: 0.5,
    angle,
    life: 8,
    size: 5,
    color: "#fde047",
    gravity: 0,
    shrink: true,
  });
  // bright flash core
  _pid++;
  arr.push({
    id: _pid,
    x,
    y,
    vx: 0,
    vy: 0,
    life: 5,
    maxLife: 5,
    size: 12,
    color: "#fff8dc",
    gravity: 0,
    shrink: true,
    type: "flash",
    rot: angle,
    rotSpeed: 0,
  });
  // A couple of slow smoke puffs drifting off the barrel.
  spawnParticles(arr, x, y, {
    count: 2,
    speed: 1.6,
    spread: 0.9,
    angle,
    life: 26,
    size: 4,
    color: "rgba(170,170,170,0.5)",
    gravity: -0.04,
  });
}

function spawnBloodHit(arr, x, y, angle) {
  spawnParticles(arr, x, y, {
    count: 6,
    speed: 4,
    spread: 1.2,
    angle: angle + Math.PI,
    life: 20,
    size: 2.5,
    color: "#c41e3a",
    gravity: 0.2,
    shrink: true,
  });
}

function spawnImpactSparks(arr, x, y, angle) {
  spawnParticles(arr, x, y, {
    count: 5,
    speed: 3.5,
    spread: 1.0,
    angle: angle + Math.PI + (Math.random() - 0.5) * 0.5,
    life: 15,
    size: 2,
    color: "#aaa",
    gravity: 0.25,
    shrink: true,
  });
}

function spawnFootstepDust(arr, x, y) {
  spawnParticles(arr, x, y, {
    count: 2,
    speed: 1.5,
    spread: 1.5,
    angle: -Math.PI / 2,
    life: 18,
    size: 3,
    color: "rgba(120,110,90,0.5)",
    gravity: 0.05,
    shrink: true,
  });
}

function spawnExplosionFx(arr, x, y) {
  // Fireball particles
  spawnParticles(arr, x, y, {
    count: 20,
    speed: 7,
    spread: Math.PI * 2,
    angle: 0,
    life: 30,
    size: 5,
    color: "#f97316",
    gravity: 0.1,
    shrink: true,
  });
  // Smoke
  spawnParticles(arr, x, y, {
    count: 12,
    speed: 2.5,
    spread: Math.PI * 2,
    angle: 0,
    life: 50,
    size: 8,
    color: "rgba(80,80,80,0.6)",
    gravity: -0.05,
    shrink: false,
  });
  // Debris
  spawnParticles(arr, x, y, {
    count: 8,
    speed: 6,
    spread: Math.PI * 2,
    angle: 0,
    life: 40,
    size: 3,
    color: "#5a4030",
    gravity: 0.35,
    shrink: false,
    type: "debris",
  });
  // Bright flash
  _pid++;
  arr.push({
    id: _pid,
    x,
    y,
    vx: 0,
    vy: 0,
    life: 6,
    maxLife: 6,
    size: 40,
    color: "#fff8dc",
    gravity: 0,
    shrink: true,
    type: "flash",
    rot: 0,
    rotSpeed: 0,
  });
}

// ──── Main component ────
export default function GameCanvas({
  mode,
  role,
  mapId,
  profile,
  soundEnabled = true,
  onProfileChange,
  onExit,
  teamConfig,
  networkSession,
  onNetworkError,
  onMatchEnd,
  onConnectionLost,
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const profileRef = useRef(profile);
  const networkSessionRef = useRef(networkSession);
  const networkTargetsRef = useRef(new Map());
  const remoteInputsRef = useRef(new Map());
  const pendingNetworkActionsRef = useRef(new Set());
  const networkFailureReportedRef = useRef(false);
  const attachedNetworkHandlersRef = useRef(new WeakMap());
  const networkResultRecordedRef = useRef(false);
  const onMatchEndRef = useRef(onMatchEnd);
  const onConnectionLostRef = useRef(onConnectionLost);
  const lastNetworkStateRef = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);
  const pausedRef = useRef(false);
  profileRef.current = profile;
  networkSessionRef.current = networkSession;
  onMatchEndRef.current = onMatchEnd;
  onConnectionLostRef.current = onConnectionLost;
  soundEnabledRef.current = soundEnabled;
  const spriteRef = useRef({});
  const audioCtxRef = useRef(null);
  const sfxBuffersRef = useRef({});
  // Everything audible goes through one compressor, so a burst of automatic
  // fire (or a grenade on top of it) ducks instead of clipping the output.
  const sfxBusRef = useRef(null);
  const [over, setOver] = useState(null);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({
    hp: 100,
    ammo: 30,
    mag: 30,
    reloading: false,
    kills: 0,
    deaths: 0,
    slot: 0,
    grenades: 0,
    inBush: false,
  });
  const hudRef = useRef(hud);
  const [roundAnim, setRoundAnim] = useState(null);
  const pendingRoundAnim = useRef(null);
  const roundAnimActive = useRef(false);
  // roundStart shows the "NEW ROUND" overlay during the brief freeze between rounds.
  // We keep a ref mirror of roundStart so the requestAnimationFrame loop (which is
  // created once and closes over the first-render values) can read the CURRENT
  // value instead of a stale one. Without this the overlay shows but never clears
  // because the rAF closure always sees the initial null.
  const [roundStart, setRoundStart] = useState(null);
  const roundStartRef = useRef(null);
  const mapDef = mapById(mapId);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : VIEW_W,
    height: typeof window !== "undefined" ? window.innerHeight : VIEW_H,
  }));
  const [isTouchDevice, setIsTouchDevice] = useState(() =>
    typeof navigator !== "undefined" ? navigator.maxTouchPoints > 0 : false,
  );
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined"
      ? Boolean(document.fullscreenElement)
      : false,
  );
  const [pressedControls, setPressedControls] = useState({});
  const [moveStick, setMoveStick] = useState({ x: 0, y: 0, active: false });
  const [aimStick, setAimStick] = useState({ x: 0, y: 0, active: false });
  const [touchLayout, setTouchLayout] = useState(loadTouchLayout);
  const showTouchControls = isTouchDevice || viewport.width <= 900;
  // The app auto-rotates into landscape at the root (see App.jsx), so the
  // in-match "rotate to fight" prompt is no longer required.
  const showRotatePrompt = false;

  const ensureAudioUnlocked = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
  }, []);

  // Keep the imperative pausedRef in sync with the React paused state so the
  // requestAnimationFrame loop (which closes over the ref) can read it without
  // being re-created on every pause/resume.
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Keep roundStartRef in sync with the React roundStart state so the rAF loop
  // can read the current overlay state instead of a stale first-render value.
  useEffect(() => {
    roundStartRef.current = roundStart;
  }, [roundStart]);

  useEffect(() => {
    saveTouchLayout(touchLayout);
  }, [touchLayout]);

  const playSfx = useCallback((key, source) => {
    if (!soundEnabledRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== "running") return;
    const buffer = sfxBuffersRef.current[key];
    if (!buffer) return;
    // Generated gunfire keeps several variants; rotate through them so repeated
    // shots are not bit-identical. Recorded sounds stay a single buffer.
    const shot = Array.isArray(buffer)
      ? buffer[Math.floor(Math.random() * buffer.length)]
      : buffer;
    if (!shot) return;

    const config = SFX_CONFIG[key];
    let volume = config.volume;
    let pan = 0;

    // Sounds that belong to someone else (or to a world event like a grenade)
    // are positional: silent when out of earshot, quieter and panned with
    // distance. Sounds of "me" and UI sounds keep full volume and no pan.
    const me = stateRef.current?.players?.find((player) => player.id === "me");
    if (source && source.id !== "me" && me) {
      const dx = source.x - me.x;
      const dy = source.y - me.y;
      const distance = Math.hypot(dx, dy);
      if (distance > SFX_HEAR_RANGE) return;
      const falloff = 1 - distance / SFX_HEAR_RANGE;
      volume *= 0.12 + 0.88 * falloff;
      pan = Math.max(-1, Math.min(1, dx / (SFX_HEAR_RANGE * 0.55))) * 0.7;
    }

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = shot;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    const bus = sfxBusRef.current ?? ctx.destination;
    sourceNode.connect(gain);
    if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(bus);
    } else {
      gain.connect(bus);
    }
    sourceNode.start(0);
  }, []);

  const playWeaponSfx = useCallback(
    (weaponId, shooter) => {
      if (weaponId === "awp" || weaponId === "barrett") {
        playSfx("sniper", shooter);
        return;
      }
      if (weaponId === "dmr" || weaponId === "scout" || weaponId === "shotgun") {
        playSfx("pistol", shooter);
        return;
      }
      playSfx("machinegun", shooter);
    },
    [playSfx],
  );

  // Fullscreen/orientation requests are only worth making on an explicit tap
  // (or the first touch of a match). Re-requesting them on every control press
  // makes some browsers abort the active touch session, which drops the
  // fingers that are already held down.
  const lastImmersiveAttemptRef = useRef(0);
  const requestImmersiveMode = useCallback(async (force = false) => {
    ensureAudioUnlocked();
    const now = Date.now();
    if (!force && now - lastImmersiveAttemptRef.current < 4000) return;
    lastImmersiveAttemptRef.current = now;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
    } catch {}
    try {
      await screen.orientation?.lock?.("landscape");
    } catch {}
  }, [ensureAudioUnlocked]);

  const setMobilePressed = useCallback((key, pressed) => {
    const s = stateRef.current;
    if (!s) return;
    s.mobile[key] = pressed;
    setPressedControls((prev) => ({ ...prev, [key]: pressed }));
  }, []);

  const init = useCallback(() => {
    // Activate this match's battlefield layout before any geometry helper or
    // mkPlayer runs. The WORLD variable is read by STRUCTURES()/BUSHES()/HKIT_X()
    // and the floor/collision helpers, so it must match the selected map.
    WORLD = WORLDS[mapId] || WORLDS.city;
    // Resolve the per-map house position so it never overlaps structures.
    resolveHouse(WORLD);
    const myW = getLoadoutWeapon(profile, role, mode);
    // Slot 2 is whatever melee weapon the loadout has equipped.
    const meleeWeaponId = profile.loadout?.secondary || "knife";
    const hasGrenade = profile.ownedWeapons.includes("grenade");
    const availHouseWeapons = getAvailableGuns(profile, mode);
    const aiNames = ["Ghost", "Viper", "Thorn", "Rook", "Ares", "Blaze"];

    function mkPlayer(id, name, team, isAI, wId, aiRole) {
      const wid =
        wId ??
        (team === "blue" ? myW.id : WEAPONS[Math.floor(Math.random() * 3)].id);
      const x =
        team === "blue"
          ? randBetween(60, 230)
          : randBetween(WORLD_W - 230, WORLD_W - 60);
      const w = weaponById(wid);
      return {
        id,
        name,
        team,
        x,
        y: GY,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        onGround: true,
        facing: team === "blue" ? 1 : -1,
        aimAngle: team === "blue" ? 0 : Math.PI,
        kills: 0,
        deaths: 0,
        isAI,
        aiRole: aiRole || "fighter",
        aiTimer: 0,
        aiJumpCooldown: 0,
        aiRetreatTimer: 0,
        aiCoverTarget: null,
        aiStrafeDir: Math.random() < 0.5 ? 1 : -1,
        aiStrafeTimer: Math.floor(randBetween(60, 180)),
        slot: 0,
        primaryWeaponId: wid,
        ownPrimaryId: wid,
        meleeWeaponId,
        grenadeCount: isAI ? 2 : hasGrenade ? 3 : 0,
        lootWeaponId: null,
        reloadTimer: 0,
        lastFire: 0,
        ammo: w?.magazine ?? 30,
        mag: w?.magazine ?? 30,
        reloading: false,
        hasFlag: false,
        inHouse: false,
        nearDoor: false,
        alive: true,
        respawnTimer: 0,
        emoteTimer: 0,
        emoteFrame: "",
        inBush: false,
        lastDamageTime: 0,
        recoil: 0,
        footstepTimer: 0,
        flashTimer: 0,
        // ── Battlefield layer state ──
        underground: false, // true when standing on the sewer/mine/trench floor
        onLadder: null, // reference to the ladder object while climbing (null otherwise)
        climbing: false, // true while actively moving up/down a ladder
        // ── Procedural animation state (per-player, so everyone is desynced) ──
        animTime: Math.random() * 1000, // each player's own clock offset
        walkPhase: Math.random() * Math.PI * 2, // gait phase offset
        landSquash: 0, // landing impact squash (decays)
        wasOnGround: true, // previous frame ground state (for landing detection)
        bobAmt: 0, // smoothed walk bob amount
        leanAmt: 0, // smoothed lean amount
        bodyRecoil: 0, // smoothed visual recoil kick
        landBounce: 0, // secondary settle bounce velocity (springy landing recovery)
        landBouncePos: 0, // current bounce offset (oscillates & damps to 0)
        // ── Ladder climbing animation state (IMPROVEMENT_TODO #13) ──
        climbPhase: Math.random() * Math.PI * 2, // reach-for-rung cycle phase
        climbBobAmt: 0, // smoothed climbing bob amplitude
        prevClimbY: 0, // previous-frame y while on ladder (to detect climb speed)
        // ── Weapon / gun animation state (gun-swap + sway + reload dip) ──
        weaponSwapTimer: 0, // counts down during a weapon swap animation
        weaponSwapDur: 18, // frames the full swap animation lasts
        gunBobPhase: Math.random() * Math.PI * 2, // gun bob cycle (independent of body)
        gunBobAmt: 0, // smoothed gun bob amplitude
        gunSway: 0, // smoothed lateral gun sway target
        reloadDip: 0, // 0..1 how far the gun is dipped during reload
        // Track which slot/weapon we last animated so we detect swaps anywhere
        // (keyboard 1/2/3, cycle button, or house pickup) without each call
        // site needing to invoke a trigger.
        prevSlot: 0,
        prevWeaponId: wid,
      };
    }

    // Build the player roster dynamically. If a teamConfig was passed in from the
    // Custom Lobby (custom/offline), we honor the exact team sizes and names the
    // player chose. Otherwise we fall back to the default 3v3 layout used by the
    // classic and ranked queues.
    let players = [];
    if (teamConfig && Array.isArray(teamConfig.blue) && Array.isArray(teamConfig.red)) {
      // teamConfig.blue / teamConfig.red are arrays of { name, isAI?, isHost? } entries.
      // The first human/non-AI entry on blue is "me".
      const aiRoles = ["runner", "fighter"];
      const blueRoster = teamConfig.blue.filter(Boolean);
      const redRoster = teamConfig.red.filter(Boolean);
      let mePlaced = false;
      const addRoster = (roster, team) => {
        roster.forEach((entry, i) => {
          const isMe = entry.userId
            ? entry.userId === networkSession?.userId
            : team === "blue" && !mePlaced && !entry.isAI;
          if (isMe) mePlaced = true;
          const id = isMe
            ? "me"
            : entry.userId || `${team}${i}`;
          const name =
            entry.name ||
            (isMe ? profile.name : aiNames[(i + (team === "red" ? 3 : 0)) % aiNames.length]);
          const isAI = Boolean(entry.isAI) || (!networkSession && !isMe);
          players.push(
            mkPlayer(id, name, team, isAI, null, aiRoles[i % aiRoles.length]),
          );
        });
      };
      addRoster(blueRoster, "blue");
      addRoster(redRoster, "red");
    } else {
      players = [
        mkPlayer("me", profile.name, "blue", false, myW.id),
        mkPlayer("ally0", aiNames[0], "blue", true, null, "runner"),
        mkPlayer("ally1", aiNames[1], "blue", true, null, "fighter"),
        mkPlayer("enemy0", aiNames[3], "red", true, null, "runner"),
        mkPlayer("enemy1", aiNames[4], "red", true, null, "fighter"),
        mkPlayer("enemy2", aiNames[5], "red", true, null, "fighter"),
      ];
    }

    stateRef.current = {
      players,
      bullets: [],
      loot: [],
      explosions: [],
      healthKits: [
        // Surface health kits
        ...HKIT_X().map((x, i) => ({
          id: `s${i}`,
          x,
          y: GY,
          alive: true,
          respawnIn: 0,
          underground: false,
        })),
        // Underground health kits (IMPROVEMENT_TODO #4)
        ...HKIT_X_UNDER().map((x, i) => ({
          id: `u${i}`,
          x,
          y: UNDERGROUND_Y,
          alive: true,
          respawnIn: 0,
          underground: true,
        })),
      ],
      flags: [
        { x: 120, y: GY, team: "blue", carrier: null },
        { x: WORLD_W - 120, y: GY, team: "red", carrier: null },
      ],
      score: { blue: 0, red: 0, msg: "", msgUntil: 0 },
      keys: new Set(),
      mouse: { x: VIEW_W / 2, y: VIEW_H / 2, down: false },
      mobile: {
        left: false,
        right: false,
        jump: false,
        fire: false,
        down: false,
        moveX: 0,
        aimX: 0,
        aimY: 0,
      },
      cameraX: 0,
      over: false,
      inHouse: false,
      houseWeaponIndex: 0,
      availHouseWeapons,
      matchStartTime: performance.now(),
      particles: [],
      damageNumbers: [],
      killFeed: [],
      shake: { x: 0, y: 0, intensity: 0 },
      hitMarker: 0,
      hitMarkerHeadshot: false,
      lowHealthPulse: 0,
      matchTimer: 0,
      showScoreboard: false,
      // Round-based respawn system: after every round (team wipe or flag capture)
      // all players respawn at their bases simultaneously for the next round.
      // roundState tracks the inter-round countdown so the reset is synchronized.
      roundState: {
        phase: "live", // "live" | "roundEnd" | "starting"
        timer: 0, // frames remaining in the current non-live phase
        roundNumber: 1, // current round index (1-based)
      },
    };
  }, []);

  useEffect(() => {
    const loaded = {};
    for (const [team, frames] of Object.entries(PLAYER_SPRITE_PATHS)) {
      for (const [frame, src] of Object.entries(frames)) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
        loaded[`${team}-${frame}`] = img;
      }
    }
    spriteRef.current = loaded;
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setIsTouchDevice(
        navigator.maxTouchPoints > 0 ||
          window.matchMedia("(pointer: coarse)").matches,
      );
    };
    const onFullscreenChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    const master = ctx.createGain();
    master.gain.value = 0.92;
    compressor.connect(master);
    master.connect(ctx.destination);
    sfxBusRef.current = compressor;

    let cancelled = false;
    const loadAll = async () => {
      // Recorded sounds (reload, grenade, load) stream from /sfx.
      const recorded = Object.entries(SFX_CONFIG).filter(
        ([key, config]) => config.src && !GENERATED_GUN_KEYS.includes(key),
      );
      const loadRecorded = Promise.all(
        recorded.map(async ([key, config]) => {
          const res = await fetch(config.src);
          const arr = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(arr.slice(0));
          if (!cancelled) sfxBuffersRef.current[key] = buf;
        }),
      );
      // Gunfire is rendered in an OfflineAudioContext, which needs no gesture.
      const synthesised = (async () => {
        const shots = await renderGunBuffers();
        if (cancelled) return;
        Object.entries(shots).forEach(([key, variants]) => {
          if (variants?.length) sfxBuffersRef.current[key] = variants;
        });
      })();
      await Promise.all([loadRecorded, synthesised]);
    };

    void loadAll().catch(() => {});
    return () => {
      cancelled = true;
      sfxBuffersRef.current = {};
      sfxBusRef.current = null;
      void ctx.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  // ──── Effect helpers ────
  function addShake(intensity) {
    const s = stateRef.current;
    if (!s) return;
    s.shake.intensity = Math.min(20, s.shake.intensity + intensity);
  }

  function addDamageNumber(x, y, value, color, isHeadshot) {
    const s = stateRef.current;
    if (!s) return;
    if (s.damageNumbers.length >= MAX_DAMAGE_NUMBERS) s.damageNumbers.shift();
    _dnid++;
    s.damageNumbers.push({
      id: _dnid,
      x: x + randBetween(-8, 8),
      y: y - 10,
      vy: -2.5,
      life: 50,
      maxLife: 50,
      value: Math.round(value),
      color,
      isHeadshot,
    });
  }

  function addKillFeed(killerName, victimName, weaponName, killerTeam, underground) {
    const s = stateRef.current;
    if (!s) return;
    if (s.killFeed.length >= MAX_KILL_FEED) s.killFeed.shift();
    _kfid++;
    s.killFeed.push({
      id: _kfid,
      killer: killerName,
      victim: victimName,
      weapon: weaponName,
      team: killerTeam,
      underground: !!underground, // tag underground kills (IMPROVEMENT_TODO #17)
      life: KILL_FEED_LIFE,
      maxLife: KILL_FEED_LIFE,
    });
  }

  // ──── Game logic helpers ────
  function startReload(p) {
    const w = weaponById(p.primaryWeaponId);
    if (!w || p.ammo >= w.magazine || p.reloading) return;
    p.reloading = true;
    p.reloadTimer = w.reloadMs;
    playSfx("reload", p);
  }

  function cycleWeaponSlot(p) {
    const available = [0];
    if (p.meleeWeaponId) available.push(1);
    if (p.grenadeCount > 0) available.push(2);
    const currentIndex = Math.max(0, available.indexOf(p.slot));
    const next = available[(currentIndex + 1) % available.length];
    if (next !== p.slot) {
      p.slot = next;
      triggerWeaponSwap(p); // gun-change animation (lower old → raise new)
    }
  }

  // Kick off a weapon-swap animation. The gun dips down out of view, then the
  // new weapon rises back up — a clear "I'm changing guns" readout. Called from
  // cycleWeaponSlot, keyboard 1/2/3, and house weapon pickup.
  function triggerWeaponSwap(p) {
    beginWeaponSwapAnim(p);
    if (typeof playSfx === "function") {
      try { playSfx("load", p); } catch (_) {}
    }
  }

  function performInteract(p, s) {
    if (p.nearDoor) {
      p.inHouse = !p.inHouse;
      s.inHouse = p.inHouse;
      if (p.inHouse) {
        p.x = HOUSE.x + HOUSE.w / 2;
        p.y = GY;
      }
      return;
    }

    if (p.inHouse) {
      const hw = s.availHouseWeapons[s.houseWeaponIndex];
      if (hw) {
        if (hw.id !== p.primaryWeaponId) {
          p.primaryWeaponId = hw.id; // gun-change animation triggered below
          triggerWeaponSwap(p);
        }
        p.ammo = hw.magazine;
        p.mag = hw.magazine;
        p.reloading = false;
        p.lootWeaponId = hw.id;
        playSfx("load", p);
      }
      return;
    }

    // Ladders: USE grabs the ladder you are standing at, or lets go when you
    // are already climbing one.
    if (p.onLadder) {
      releaseLadder(p);
      return;
    }
    const ladder = findLadderNear(p.x, p.y);
    if (ladder && grabLadder(p, ladder)) return;

    const ae = profileRef.current.activeEmote;
    if (ae) {
      const em = EMOTES.find((x) => x.id === ae);
      if (em) {
        p.emoteTimer = 120;
        p.emoteFrame = em.frames[0];
      }
    }
  }

  function throwGrenade(p, s) {
    // Can't throw while climbing a ladder (IMPROVEMENT_TODO #3)
    if (p.onLadder) return;
    if (p.grenadeCount <= 0) return;
    p.grenadeCount--;
    // Drives the throw animation pose (wind-up + release).
    p.throwDur = 22;
    p.throwTimer = 22;
    _bid++;
    s.bullets.push({
      x: p.x,
      y: p.y - PH / 2,
      vx: Math.cos(p.aimAngle) * 14,
      vy: Math.sin(p.aimAngle) * 14 - 3,
      damage: 90,
      range: 800,
      dist: 0,
      team: p.team,
      id: _bid,
      isGrenade: true,
      explodeTimer: 90,
      underground: !!p.underground,
    });
  }

  function fire(p, s) {
    // Can't fire while climbing a ladder — both hands are on the rungs
    // (IMPROVEMENT_TODO #3). Throwing grenades is blocked in throwGrenade().
    if (p.onLadder) return;
    // Can't fire while swapping weapons — the gun is mid-change.
    if (p.weaponSwapTimer > 0) return;
    const now = performance.now();
    if (p.slot === 1 && p.meleeWeaponId) {
      const md = weaponById(p.meleeWeaponId);
      if (now - p.lastFire < 1000 / (md?.fireRate ?? 1.8)) return;
      p.lastFire = now;
      // Knife swing particles
      spawnParticles(s.particles, p.x + p.facing * 20, p.y - PH / 2, {
        count: 4,
        speed: 3,
        spread: 1.0,
        angle: p.aimAngle,
        life: 10,
        size: 3,
        color: "#ccc",
        gravity: 0,
        shrink: true,
      });
      for (const t of s.players) {
        if (t.team === p.team || !t.alive) continue;
        const dx = t.x - p.x,
          dy = t.y - PH / 2 - (p.y - PH / 2);
        if (
          Math.abs(dx) < (md?.range ?? 60) &&
          Math.abs(dy) < PH &&
          Math.sign(dx) === p.facing
        ) {
          spawnBloodHit(s.particles, t.x, t.y - PH / 2, p.aimAngle);
          applyDamage(t, md?.damage ?? 55, p, s);
        }
      }
      return;
    }
    if (p.slot === 2) {
      throwGrenade(p, s);
      return;
    }
    const w = weaponById(p.primaryWeaponId);
    if (!w || now - p.lastFire < 1000 / w.fireRate || p.reloading) return;
    if (p.ammo <= 0) {
      startReload(p);
      return;
    }
    p.lastFire = now;
    p.ammo--;
    p.recoil = Math.min(1, p.recoil + (w.id === "shotgun" ? 0.5 : 0.25));
    playWeaponSfx(w.id, p);

    // Muzzle flash position
    const gx = p.x + p.facing * 3;
    const gy2 = p.y - PH / 2 - 4;
    const muzzleX = gx + Math.cos(p.aimAngle) * 22;
    const muzzleY = gy2 + Math.sin(p.aimAngle) * 22;
    spawnMuzzleFlash(s.particles, muzzleX, muzzleY, p.aimAngle);

    // Screen shake on fire (more for heavy weapons)
    if (p.id === "me") {
      if (w.id === "shotgun") addShake(4);
      else if (w.id === "awp" || w.id === "barrett") addShake(6);
      else addShake(1.5);
    }

    const prof = profileRef.current;
    const wa = prof.weaponAttachments?.[p.primaryWeaponId] ?? {
      laser: false,
      scope: false,
    };
    // Attachments are configured per gun in the loadout modal, so a gun carries
    // exactly the attachments picked for it.
    let spread = w.spread;
    if (wa.laser) spread = Math.max(0.001, spread - 0.04);
    if (wa.scope) spread = Math.max(0.001, spread - 0.02);
    // Recoil adds spread
    spread += p.recoil * 0.03;
    const range = w.range + (wa.scope ? 300 : 0);
    const pellets = w.id === "shotgun" ? 6 : 1;
    for (let i = 0; i < pellets; i++) {
      const angle = p.aimAngle + (Math.random() - 0.5) * spread * 2;
      const spd = w.bulletSpeed / 60;
      _bid++;
      s.bullets.push({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        damage: w.damage,
        range,
        dist: 0,
        team: p.team,
        id: _bid,
        ownerId: p.id,
        tracer: true,
        prevX: muzzleX,
        prevY: muzzleY,
        underground: !!p.underground,
      });
    }
    if (p.ammo <= 0) startReload(p);
  }

  function applyDamage(target, dmg, attacker, s, isHeadshot) {
    if (!target.alive) return;
    const actualDmg = isHeadshot ? dmg * 1.8 : dmg;
    target.hp = Math.max(0, target.hp - actualDmg);
    target.lastDamageTime = performance.now();
    target.flashTimer = 6;

    // Damage number
    const color = target.team === "blue" ? "#60a5fa" : "#f87171";
    addDamageNumber(target.x, target.y - PH, actualDmg, isHeadshot ? "#fde047" : color, isHeadshot);

    // Hit marker for the player
    if (attacker && attacker.id === "me") {
      s.hitMarker = 12;
      s.hitMarkerHeadshot = isHeadshot;
    }

    // Screen shake when player takes damage
    if (target.id === "me") {
      addShake(actualDmg * 0.3);
    }

    if (target.hp <= 0) killPlayer(target, attacker, s);
  }

  function killPlayer(target, attacker, s) {
    if (!target.alive) return;
    target.alive = false;
    target.respawnTimer = 280;
    if (attacker) attacker.kills++;
    target.deaths++;

    // Death particles - blood burst
    spawnParticles(s.particles, target.x, target.y - PH / 2, {
      count: 15,
      speed: 5,
      spread: Math.PI * 2,
      angle: 0,
      life: 30,
      size: 3,
      color: "#c41e3a",
      gravity: 0.3,
      shrink: true,
    });

    // Kill feed
    const wName = attacker
      ? weaponById(attacker.primaryWeaponId)?.name ?? "Unknown"
      : "Environment";
    addKillFeed(
      attacker?.name ?? "???",
      target.name,
      wName,
      attacker?.team ?? "red",
      target.underground, // tag underground kills (IMPROVEMENT_TODO #17)
    );

    // Big screen shake on kill
    if (attacker?.id === "me" || target.id === "me") {
      addShake(8);
    }

    if (target.hasFlag) {
      const f = s.flags.find(
        (f) => f.team !== target.team && f.carrier === target.id,
      );
      if (f) {
        f.carrier = null;
        f.x = target.x;
        f.y = GY;
      }
      target.hasFlag = false;
    }
    _eid++;
    s.loot.push({
      id: _eid,
      x: target.x,
      y: GY - 8,
      weaponId: target.primaryWeaponId,
      vy: -3,
    });
    const aliveOnTeam = s.players.filter(
      (p) => p.team === target.team && p.alive && p.id !== target.id,
    );
    if (aliveOnTeam.length === 0) {
      const scoringTeam = attacker ? attacker.team : target.team === "blue" ? "red" : "blue";
      s.score[scoringTeam]++;
      s.score.msg =
        scoringTeam === "blue" ? "BLUE TEAM WIPE! ★" : "RED TEAM WIPE! ★";
      s.score.msgUntil = performance.now() + 2500;
      pendingRoundAnim.current = {
        msg: s.score.msg,
        blue: s.score.blue,
        red: s.score.red,
        event: "wipe",
      };
      if (checkWin(s)) return;
      // Not a match-ending score: freeze everyone and start the round-end transition
      // so all players respawn at base together for the next round.
      startRoundEnd(s);
    }
  }

  // Begins the inter-round transition: combat is paused while the round result
  // overlay shows, then resetRound() respawns everyone at their bases.
  function startRoundEnd(s) {
    s.roundState.phase = "roundEnd";
    s.roundState.timer = 180; // ~3s pause to display the round result
    // Cancel any pending individual respawn timers — the synchronized reset
    // will handle respawning everyone at once.
    for (const p of s.players) p.respawnTimer = 0;
  }

  function finishMatch(s, winningTeam) {
    if (s.over) return;
    s.over = true;
    s.winnerTeam = winningTeam;
    const me = s.players.find((p) => p.id === "me");
    if (!me) return;
    const result = me.team === winningTeam ? "victory" : "defeat";
    const record = {
      id: Date.now().toString(),
      date: Date.now(),
      mode,
      mapId,
      result,
      stars: s.score[me.team],
      enemyStars: s.score[me.team === "blue" ? "red" : "blue"],
      kills: me.kills,
      deaths: me.deaths,
      weaponId: me.primaryWeaponId,
      coinsEarned: (result === "victory" ? 350 : 80) + me.kills * 25,
    };
    const newProfile = addMatch(profileRef.current, record);
    onMatchEndRef.current?.(record);
    setTimeout(() => {
      onProfileChange(newProfile);
      setOver({ result, record });
    }, 500);
  }

  function checkWin(s) {
    if (s.over || (s.score.blue < 5 && s.score.red < 5)) return false;
    if (networkSessionRef.current?.role === "guest") return true;
    finishMatch(s, s.score.blue >= 5 ? "blue" : "red");
    return true;
  }

  const surrenderMatch = useCallback(() => {
    const current = stateRef.current;
    const me = current?.players.find((player) => player.id === "me");
    if (!current || !me || current.over) return;

    const session = networkSessionRef.current;
    if (session?.role === "guest") {
      void session.channel
        .send({
          type: "broadcast",
          event: "surrender",
          payload: { userId: session.userId },
        })
        .then((status) => {
          if (status !== "ok") {
            onNetworkError?.({
              message: "Your surrender could not reach the match host.",
              type: "error",
            });
          }
        })
        .catch(() => {
          onNetworkError?.({
            message: "Your surrender could not reach the match host.",
            type: "error",
          });
        });
      setPaused(false);
      return;
    }

    finishMatch(current, me.team === "blue" ? "red" : "blue");
    setPaused(false);
  }, [onNetworkError]);

  function respawn(p, s) {
    p.alive = true;
    p.hp = 100;
    p.x =
      p.team === "blue"
        ? randBetween(60, 220)
        : randBetween(WORLD_W - 220, WORLD_W - 60);
    p.y = GY;
    p.vy = 0;
    p.vx = 0;
    p.primaryWeaponId = p.ownPrimaryId;
    p.lootWeaponId = null;
    const w = weaponById(p.ownPrimaryId);
    p.ammo = w?.magazine ?? 30;
    p.mag = w?.magazine ?? 30;
    p.reloading = false;
    p.inHouse = false;
    p.lastDamageTime = 0;
    p.recoil = 0;
    p.underground = false;
    p.onLadder = null;
    p.climbing = false;
    p.climbDir = 0;
    p.ladderCooldown = 0;
    p.fallingIntoPit = false;
    // Reset weapon animation state so respawn doesn't trigger a swap animation.
    p.weaponSwapTimer = 0;
    p.reloadDip = 0;
    p.prevSlot = 0;
    p.prevWeaponId = p.ownPrimaryId;
    if (p.id === "me")
      p.grenadeCount = profileRef.current.ownedWeapons.includes("grenade")
        ? 3
        : 0;
    else p.grenadeCount = 2;
  }

  // Round reset: called after a round ends (team wipe or flag capture) and the
  // inter-round delay expires. Every player on both teams is respawned at their
  // own base at the same time, flags return home, dropped loot and bullets are
  // cleared, and health kits refresh so the next round starts clean.
  function resetRound(s) {
    for (const p of s.players) {
      respawn(p, s);
      p.respawnTimer = 0;
    }
    s.bullets = [];
    s.loot = [];
    s.explosions = [];
    for (const f of s.flags) {
      f.carrier = null;
      f.x = f.team === "blue" ? 120 : WORLD_W - 120;
      f.y = GY;
    }
    for (const k of s.healthKits) {
      k.alive = true;
      k.respawnIn = 0;
    }
    s.roundState.phase = "starting";
    s.roundState.timer = 120; // ~2s "NEW ROUND" freeze before combat resumes
    s.roundState.roundNumber += 1;
  }

  // Improved AI: uses cover, retreats when low, strafes, jumps more tactically
  function updateAI(p, s) {
    const enemies = s.players.filter(
      (x) => x.team !== p.team && x.alive && !x.inBush,
    );
    if (enemies.length === 0) {
      p.vx = 0;
      return;
    }
    const target = enemies.reduce((a, b) =>
      Math.abs(a.x - p.x) < Math.abs(b.x - p.x) ? a : b,
    );
    const dx = target.x - p.x,
      dist = Math.abs(dx);
    const w = weaponById(p.primaryWeaponId);
    const optR = (w?.range ?? 600) * 0.55;

    // Aim with slight inaccuracy
    const aimError = (Math.random() - 0.5) * 0.08;
    p.aimAngle = Math.atan2(
      target.y - PH / 2 - (p.y - PH / 2 - 4),
      dx,
    ) + aimError;
    p.facing = dx > 0 ? 1 : -1;

    // Retreat behavior when low HP
    if (p.hp < 35) {
      p.aiRetreatTimer = 120;
    }
    if (p.aiRetreatTimer > 0) {
      p.aiRetreatTimer--;
      // Move away from target
      p.vx = -p.facing * SPD * 0.8;
      // Try to find cover
      if (!p.aiCoverTarget) {
        p.aiCoverTarget = findCoverNear(p.x, target.x, p.underground);
      }
      if (p.aiCoverTarget) {
        const coverX = p.aiCoverTarget.x + p.aiCoverTarget.w / 2;
        p.vx = coverX > p.x ? SPD * 0.7 : -SPD * 0.7;
        if (Math.abs(p.x - coverX) < 20) {
          p.vx = 0;
        }
      }
      // Look for health kit
      for (const k of s.healthKits) {
        if (!k.alive) continue;
        // Only seek health kits on the same layer (IMPROVEMENT_TODO #4)
        if (k.underground !== p.underground) continue;
        if (Math.abs(k.x - p.x) < 300 && p.hp < 80) {
          p.vx = k.x > p.x ? SPD * 0.8 : -SPD * 0.8;
          break;
        }
      }
      // Jump while retreating
      p.aiJumpCooldown--;
      if (p.aiJumpCooldown <= 0 && p.onGround && Math.random() < 0.03) {
        p.vy = JUMP;
        p.onGround = false;
        p.aiJumpCooldown = 80 + Math.random() * 80;
      }
    } else {
      // Normal combat behavior
      if (dist > optR + 60) {
        p.vx = p.facing * SPD * 0.7;
      } else if (dist < optR - 60) {
        p.vx = -p.facing * SPD * 0.5;
      } else {
        // Strafe at optimal range
        p.aiStrafeTimer--;
        if (p.aiStrafeTimer <= 0) {
          p.aiStrafeDir *= -1;
          p.aiStrafeTimer = Math.floor(randBetween(40, 120));
        }
        p.vx = p.aiStrafeDir * SPD * 0.4;
      }

      // Jump tactically (to dodge or reach high ground)
      p.aiJumpCooldown--;
      if (p.aiJumpCooldown <= 0 && p.onGround) {
        // Jump if target is above, or randomly to dodge
        if (target.y < p.y - 30 && Math.random() < 0.04) {
          p.vy = JUMP;
          p.onGround = false;
          p.aiJumpCooldown = 60 + Math.random() * 80;
        } else if (Math.random() < 0.01) {
          p.vy = JUMP;
          p.onGround = false;
          p.aiJumpCooldown = 100 + Math.random() * 100;
        }
      }

      // Flag-seeking: if no enemy nearby, go for the enemy flag
      const enemyFlag = s.flags.find((f) => f.team !== p.team);
      // Flag runners always prioritize the flag
      const isRunner = p.aiRole === "runner";
      if (!p.hasFlag && enemyFlag && !enemyFlag.carrier) {
        const flagDist = Math.abs(enemyFlag.x - p.x);
        // Runners always go for flag; fighters go when no enemies very close or already near flag
        if (isRunner || dist > 250 || flagDist < 200) {
          if (flagDist > 40) {
            p.vx = enemyFlag.x > p.x ? SPD * (isRunner ? 1.0 : 0.85) : -SPD * (isRunner ? 1.0 : 0.85);
            // Jump over obstacles
            if (p.onGround && Math.random() < (isRunner ? 0.06 : 0.04)) {
              p.vy = JUMP;
              p.onGround = false;
            }
          }
        }
      }
    }

    // Shooting logic
    p.aiTimer--;
    const canSee = !isOccluded(p.x, target.x, p.underground);
    // If carrying flag, run to base instead of fighting
    if (p.hasFlag) {
      const baseX = p.team === "blue" ? 120 : WORLD_W - 120;
      p.vx = baseX > p.x ? SPD * 0.9 : -SPD * 0.9;
      p.facing = baseX > p.x ? 1 : -1;
      // Jump over obstacles while carrying flag
      if (p.onGround && Math.random() < 0.03) {
        p.vy = JUMP;
        p.onGround = false;
      }
      // Only shoot if enemy is very close
      if (dist < 200 && p.aiTimer <= 0 && canSee) {
        fire(p, s);
        p.aiTimer = Math.floor(20 + Math.random() * 20);
      }
    } else if (p.aiRole === "runner" && dist > 150) {
      // Runners only shoot at close range, otherwise focus on running
      if (dist < 250 && p.aiTimer <= 0 && canSee && p.hp > 0) {
        fire(p, s);
        p.aiTimer = Math.floor(25 + Math.random() * 25);
      }
    } else if (dist < (w?.range ?? 700) && p.aiTimer <= 0 && canSee && p.hp > 0) {
      fire(p, s);
      p.aiTimer = Math.floor(12 + Math.random() * 18);
    }

    // Loot pickup
    for (const loot of s.loot) {
      if (Math.abs(loot.x - p.x) < 35 && Math.abs(loot.y - p.y) < 35) {
        const lw = weaponById(loot.weaponId);
        if (lw && !lw.isMelee && !lw.isThrowable) {
          p.primaryWeaponId = loot.weaponId;
          p.ammo = lw.magazine;
          s.loot = s.loot.filter((l) => l.id !== loot.id);
          break;
        }
      }
    }
    // AI heals on health kit
    for (const k of s.healthKits) {
      if (!k.alive) continue;
      // Only heal from kits on the same layer (IMPROVEMENT_TODO #4)
      if (k.underground !== p.underground) continue;
      if (Math.abs(k.x - p.x) < 20 && p.hp < 80) {
        p.hp = Math.min(100, p.hp + 30);
        k.alive = false;
        k.respawnIn = 1200;
        break;
      }
    }

    // ── AI ladder & underground navigation ──
    // AI uses the underground tactically (IMPROVEMENT_TODO #15):
    //  • When low HP & being chased, escape underground via the nearest ladder/pit.
    //  • When an enemy flag carrier is underground, pursue them underground.
    //  • When regenerating, stay underground where it's safer.
    // Enemy flag carrier detection
    const enemyCarrier = s.players.find(
      (x) => x.team !== p.team && x.alive && x.hasFlag && x.underground,
    );
    const lowAndChased = p.hp < 30 && dist < 320 && !p.hasFlag;
    const wantsUnderground =
      enemyCarrier || (lowAndChased && !p.underground) ||
      (p.underground && p.hp < 60); // stay underground until recovered

    if (p.onLadder) {
      // Climb down to escape when low, climb up to chase a surface carrier.
      const climbUp = enemyCarrier && !enemyCarrier.underground
        ? true
        : p.hp < 50
          ? false // go down to escape
          : Math.random() < 0.5;
      p.climbing = true;
      p.climbDir = climbUp ? -1 : 1;
      p.y += (climbUp ? -1 : 1) * SPD * 0.6 * (s._dtScale || 1);
      // Occasionally release the ladder
      if (Math.random() < 0.005) {
        p.onLadder = null;
        p.climbing = false;
        p.climbDir = 0;
        p.vy = JUMP * 0.5;
        p.underground = p.y > GY + 2;
      }
    } else if (wantsUnderground && !p.underground && p.onGround) {
      // Actively seek the nearest ladder/pit to go underground
      const lad = findLadderNear(p.x, p.y);
      if (lad) {
        p.onLadder = lad;
        p.climbing = true;
        p.climbDir = 1;
        p.vy = 0;
        p.onGround = false;
      } else if (pitAt(p.x, p.y)) {
        // Standing on a shaft opening — drop in.
        dropIntoPit(p);
      } else {
        // Move toward the nearest ladder/pit entrance
        let nearest = null,
          nd = Infinity;
        for (const l of (WORLD.ladders || [])) {
          const d = Math.abs(l.x - p.x);
          if (d < nd) { nd = d; nearest = l.x; }
        }
        for (const pit of (WORLD.pits || [])) {
          const d = Math.abs(pit.x - p.x);
          if (d < nd) { nd = d; nearest = pit.x; }
        }
        if (nearest !== null) {
          p.vx = nearest > p.x ? SPD * 0.8 : -SPD * 0.8;
          p.facing = nearest > p.x ? 1 : -1;
        }
      }
    } else if (!p.underground && p.onGround && Math.random() < 0.003) {
      // Occasionally grab a ladder when near one and on the surface
      const lad = findLadderNear(p.x, p.y);
      if (lad) {
        p.onLadder = lad;
        p.climbing = true;
        p.climbDir = 1;
        p.vy = 0;
        p.onGround = false;
      }
    } else if (p.underground && p.onGround && Math.random() < 0.004) {
      // While underground, grab a ladder to climb back up (unless staying to
      // recover / chase an underground carrier)
      if (!wantsUnderground) {
        const lad = findLadderNear(p.x, p.y);
        if (lad) {
          p.onLadder = lad;
          p.climbing = true;
          p.climbDir = -1;
          p.vy = 0;
          p.onGround = false;
        }
      }
    }

    // Clear cover target when recovered
    if (p.hp > 70) p.aiCoverTarget = null;
  }

  // ──── Update ────
  function update() {
    const s = stateRef.current;
    if (!s || s.over) return;
    if (pausedRef.current) return; // game is paused via the in-game menu
    const isNetworkGuest = networkSessionRef.current?.role === "guest";
    const me = s.players.find((p) => p.id === "me");
    if (!me) return;

    // Delta time scaling (maintains 60fps feel at any framerate)
    const now = performance.now();
    const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 16.67 : 1;
    lastTimeRef.current = now;
    const dtScale = Math.min(dt, 3); // clamp to avoid huge jumps

    s.matchTimer += (now - (s._lastMatchTime || now));
    s._lastMatchTime = now;

    // ── Round-based respawn state machine ──
    // "live"      → normal combat
    // "roundEnd"  → a round just ended (wipe/flag); show result, then reset everyone
    // "starting"  → players are at base, brief "NEW ROUND" freeze before combat resumes
    const rs = s.roundState;
    if (rs.phase !== "live") {
      rs.timer -= dtScale;
      if (rs.phase === "roundEnd" && rs.timer <= 0) {
        resetRound(s); // respawns all players at base, sets phase to "starting"
      } else if (rs.phase === "starting" && rs.timer <= 0) {
        rs.phase = "live";
        rs.timer = 0;
      }
    }
    const roundFrozen = rs.phase !== "live";

    if (!me.inHouse && !showTouchControls) {
      const wx = s.mouse.x + s.cameraX;
      me.aimAngle = Math.atan2(s.mouse.y - (me.y - PH / 2 - 4), wx - me.x);
      me.facing = wx > me.x ? 1 : -1;
    } else if (!me.inHouse && showTouchControls) {
      if (s.mobile.fire) {
        me.aimAngle = Math.atan2(s.mobile.aimY, s.mobile.aimX);
        me.facing = s.mobile.aimX >= 0 ? 1 : -1;
      } else {
        const target = findBestTarget(me, s);
        if (target) {
          me.aimAngle = Math.atan2(
            target.y - PH / 2 - (me.y - PH / 2 - 4),
            target.x - me.x,
          );
          me.facing = target.x >= me.x ? 1 : -1;
        } else {
          me.aimAngle = me.facing > 0 ? 0 : Math.PI;
        }
      }
    }

    // Recoil recovery
    me.recoil = Math.max(0, me.recoil - 0.04 * dtScale);

    // During round transitions the player is frozen at base — ignore input.
    if (me.alive && !me.inHouse && !roundFrozen) {
      const moveLeft =
        s.keys.has("a") || s.keys.has("arrowleft") || s.mobile.left;
      const moveRight =
        s.keys.has("d") || s.keys.has("arrowright") || s.mobile.right;
      const moveX = moveLeft ? -1 : moveRight ? 1 : s.mobile.moveX;
      if (moveX < -0.18) {
        me.vx = SPD * moveX;
        me.facing = -1;
      } else if (moveX > 0.18) {
        me.vx = SPD * moveX;
        me.facing = 1;
      } else me.vx = 0;

      // ── Ladder climbing controls (W/Up = climb up, S/Down = climb down) ──
      // Down grabs a ladder on the surface (and keeps descending a shaft); Up
      // grabs one from the underground level to climb back out. USE (E / the
      // on-screen hand button) also grabs or lets go, see performInteract().
      const downKey =
        s.keys.has("s") || s.keys.has("arrowdown") || s.mobile.down;
      const upKey =
        s.keys.has("w") || s.keys.has("arrowup") || s.mobile.jump;
      if (me.onLadder) {
        if (upKey) {
          me.climbing = true;
          me.climbDir = -1;
          me.y -= SPD * 0.8 * dtScale;
        } else if (downKey) {
          me.climbing = true;
          me.climbDir = 1;
          me.y += SPD * 0.8 * dtScale;
        } else {
          me.climbing = false; // hold position on the ladder
          me.climbDir = 0;
        }
      } else if (downKey && !me.underground) {
        const lad = findLadderNear(me.x, me.y);
        if (lad) grabLadder(me, lad);
        else if (pitAt(me.x, me.y)) dropIntoPit(me);
      } else if (upKey) {
        // Climb up from the tunnel, or up a rooftop ladder whose top is above
        // the player. A surface-level tunnel ladder leaves UP free for jumping.
        const lad = findLadderNear(me.x, me.y);
        if (lad && me.y > lad.topY + 2) grabLadder(me, lad);
      }

      if (
        (s.keys.has("w") ||
          s.keys.has(" ") ||
          s.keys.has("arrowup") ||
          s.mobile.jump) &&
        me.onGround &&
        !me.onLadder
      ) {
        me.vy = JUMP;
        me.onGround = false;
        // Jump dust
        spawnFootstepDust(s.particles, me.x, me.y);
      }
      if (s.mouse.down || s.mobile.fire) fire(me, s);
    }
    if (me.alive && me.inHouse && !roundFrozen) {
      const moveLeft =
        s.keys.has("a") || s.keys.has("arrowleft") || s.mobile.left;
      const moveRight =
        s.keys.has("d") || s.keys.has("arrowright") || s.mobile.right;
      const moveX = moveLeft ? -1 : moveRight ? 1 : s.mobile.moveX;
      if (moveX < -0.18) me.vx = SPD * moveX;
      else if (moveX > 0.18) me.vx = SPD * moveX;
      else me.vx = 0;
    }

    if (networkSessionRef.current?.role === "host" && !roundFrozen) {
      for (const player of s.players) {
        if (player.isAI || player.id === "me" || !player.alive) continue;
        const input = remoteInputsRef.current.get(player.id);
        if (!input) continue;
        const previous = player.networkInput || {};
        const keys = new Set(input.keys || []);
        const mobile = input.mobile || {};
        const moveLeft =
          keys.has("a") || keys.has("arrowleft") || mobile.left;
        const moveRight =
          keys.has("d") || keys.has("arrowright") || mobile.right;
        const moveX = moveLeft ? -1 : moveRight ? 1 : mobile.moveX || 0;
        player.aimAngle = input.aimAngle ?? player.aimAngle;
        player.facing = Math.cos(player.aimAngle) >= 0 ? 1 : -1;

        if (player.inHouse) {
          player.vx = Math.abs(moveX) > 0.18 ? SPD * moveX : 0;
        } else {
          player.vx = Math.abs(moveX) > 0.18 ? SPD * moveX : 0;
          const jump =
            keys.has("w") ||
            keys.has(" ") ||
            keys.has("arrowup") ||
            mobile.jump;
          const down =
            keys.has("s") || keys.has("arrowdown") || mobile.down;
          if (!player.onLadder && (jump || down)) {
            const ladder = findLadderNear(player.x, player.y);
            if (ladder) {
              player.onLadder = ladder;
              player.climbing = true;
              player.vy = 0;
              player.onGround = false;
            }
          }
          if (player.onLadder) {
            player.climbing = Boolean(jump || down);
            if (jump) {
              player.climbDir = -1;
              player.y -= SPD * 0.8 * dtScale;
            } else if (down) {
              player.climbDir = 1;
              player.y += SPD * 0.8 * dtScale;
            } else {
              player.climbDir = 0;
            }
          } else if (jump && player.onGround) {
            player.vy = JUMP;
            player.onGround = false;
          }
          if (input.fire) fire(player, s);
        }

        if (input.reload && !previous.reload) startReload(player);
        if (input.interact && !previous.interact)
          performInteract(player, s);
        if (input.grenade && !previous.grenade)
          throwGrenade(player, s);
        const requestedSlot = keys.has("1")
          ? 0
          : keys.has("2") && player.meleeWeaponId
            ? 1
            : keys.has("3") && player.grenadeCount > 0
              ? 2
              : Number.isInteger(input.slot)
                ? input.slot
                : null;
        if (requestedSlot !== null && player.slot !== requestedSlot) {
          player.slot = requestedSlot;
          triggerWeaponSwap(player);
        }
        player.networkInput = input;
      }
    }

    if (roundFrozen) me.vx = 0;

    // Footstep dust
    if (me.alive && me.onGround && Math.abs(me.vx) > 2) {
      me.footstepTimer -= dtScale;
      if (me.footstepTimer <= 0) {
        spawnFootstepDust(s.particles, me.x, me.y);
        me.footstepTimer = 12;
      }
    }

    for (const p of s.players) {
      if (isNetworkGuest && p.id !== "me") {
        const target = networkTargetsRef.current.get(p.id);
        if (target) {
          const blend = 1 - Math.pow(0.78, dtScale);
          p.x += (target.x - p.x) * blend;
          p.y += (target.y - p.y) * blend;
        }
        updatePlayerAnim(p, dtScale);
        continue;
      }

      if (!p.alive) {
        // Individual respawns only happen during live combat. During round
        // transitions the synchronized resetRound() handles respawning.
        if (!roundFrozen) {
          p.respawnTimer -= dtScale;
          if (p.respawnTimer <= 0) respawn(p, s);
        }
        continue;
      }
      if (roundFrozen) {
        // Round transition: freeze everyone in place at their base.
        p.vx = 0;
        continue;
      }
      if (p.isAI) updateAI(p, s);
      p.vy += GRAV * dtScale;

      // Health regen
      if (p.lastDamageTime > 0 && performance.now() - p.lastDamageTime > HEALTH_REGEN_DELAY && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + HEALTH_REGEN_RATE * dtScale / 60 * 60);
      }

      // Flash timer (hit flash)
      if (p.flashTimer > 0) p.flashTimer -= dtScale;

      // Recoil recovery for AI
      if (p.isAI) p.recoil = Math.max(0, p.recoil - 0.04 * dtScale);

      if (p.inHouse) {
        p.x = Math.max(
          HOUSE.x + 8,
          Math.min(p.x + p.vx * dtScale, HOUSE.x + HOUSE.w - 8),
        );
        p.y = GY;
        p.vy = 0;
        p.onGround = true;
      } else {
        // ── Ladder climbing ──
        // The climb offset itself is applied by the input/AI pass above; here we
        // snap to the ladder, keep gravity off, and hand the player over to the
        // correct layer at each end. Descending past the surface line switches
        // to the underground level, which pans the camera and enables the
        // tunnel's collision, cover and health kits.
        if (p.ladderCooldown > 0) p.ladderCooldown -= dtScale;
        if (p.onLadder) {
          const lad = p.onLadder;
          p.x = lad.x; // snap to ladder x
          p.vy = 0; // hands on the rungs — no gravity while climbing
          p.fallingIntoPit = false;
          p.onGround = false;
          p.y = Math.max(lad.topY, Math.min(p.y, lad.botY));
          const climbDir = p.climbDir || 0;
          if (p.y <= lad.topY && climbDir < 0) {
            releaseLadder(p); // climbed off the top — surface/rooftop
          } else if (p.y >= lad.botY && climbDir > 0) {
            releaseLadder(p); // climbed off the bottom — into the tunnel
          } else {
            // Below the surface line the player is on the lower level.
            p.underground = p.y > GY + 2;
          }
          p._prevFeetY = p.y;
        } else {
          const nx = Math.max(10, Math.min(p.x + p.vx * dtScale, WORLD_W - 10));
          p.x = resolveX(p.x, nx, p.y, p.underground);
          // Capture feet position before applying vertical movement, so the
          // one-way platform check can tell whether the player was above the
          // platform last frame (IMPROVEMENT_TODO #1).
          const prevFeetY = p.y;
          p.y += p.vy * dtScale;
          const fl = getFloorAt(p.x, p.underground, prevFeetY);
          p._prevFeetY = p.y; // remember for next frame
          if (p.y >= fl) {
            p.y = fl;
            p.vy = 0;
            p.onGround = true;
          } else {
            p.onGround = false;
          }
          // A landing on any floor (road or catwalk) ends the pit fall state.
          if (p.onGround) p.fallingIntoPit = false;
          // While in the "falling into pit" state, gravity carries the player
          // down to the underground floor. We detect landing here and spawn a
          // dust cloud + small screen shake on impact (IMPROVEMENT_TODO #14).
          if (p.fallingIntoPit) {
            if (p.y >= UNDERGROUND_Y) {
              p.y = UNDERGROUND_Y;
              p.vy = 0;
              p.onGround = true;
              p.fallingIntoPit = false;
              // Landing dust cloud
              spawnParticles(s.particles, p.x, UNDERGROUND_Y, {
                count: 12,
                speed: 3,
                spread: 1.8,
                angle: -Math.PI / 2,
                life: 22,
                size: 4,
                color: "rgba(120,110,90,0.7)",
                gravity: 0.08,
                shrink: true,
              });
              // Screen shake on the player's own landing
              if (p.id === "me") addShake(4);
            }
          }
          // Auto-leave underground when climbing a ladder to the top (handled
          // in the ladder block above: onLadder set null at topY). Also, if the
          // player is underground and reaches the surface via a ladder top,
          // clear underground.
          if (p.underground && p.y <= GY) {
            p.underground = false;
          }
        }
      }

      // Procedural character animation (bob, lean, squash/stretch, recoil).
      updatePlayerAnim(p, dtScale);

      p.inBush = isInBush(p.x, p.y);
      p.nearDoor =
        !p.inHouse &&
        Math.abs(p.x - (DOOR.x + DOOR.w / 2)) < 45 &&
        Math.abs(p.y - GY) < 5;

      if (p.reloading) {
        p.reloadTimer -= 16.67 * dtScale;
        if (p.reloadTimer <= 0) {
          p.ammo = weaponById(p.primaryWeaponId)?.magazine ?? 30;
          p.reloading = false;
        }
      }
      if (p.emoteTimer > 0) p.emoteTimer -= dtScale;
      if (p.throwTimer > 0) {
        p.throwTimer = Math.max(0, p.throwTimer - dtScale);
      }

      if (p.id === "me" && p.alive) {
        for (const loot of s.loot) {
          if (Math.abs(loot.x - p.x) < 35 && Math.abs(loot.y - p.y) < 35) {
            const lw = weaponById(loot.weaponId);
            if (lw && !lw.isMelee && !lw.isThrowable) {
              p.primaryWeaponId = loot.weaponId;
              p.ammo = lw.magazine;
              p.mag = lw.magazine;
              p.lootWeaponId = loot.weaponId;
              s.loot = s.loot.filter((l) => l.id !== loot.id);
              playSfx("load", p);
              break;
            }
          }
        }
      }

      // Flag logic
      for (const flag of s.flags) {
        if (
          !flag.carrier &&
          flag.team !== p.team &&
          p.alive &&
          Math.abs(flag.x - p.x) < 45 &&
          Math.abs(flag.y - p.y) < 45
        ) {
          flag.carrier = p.id;
          p.hasFlag = true;
        }
        if (flag.carrier === p.id) {
          flag.x = p.x;
          flag.y = p.y - PH;
          const baseX = p.team === "blue" ? 120 : WORLD_W - 120;
          if (Math.abs(p.x - baseX) < 60) {
            flag.carrier = null;
            p.hasFlag = false;
            const ef = s.flags.find((f) => f.team !== p.team);
            if (ef) {
              ef.x = ef.team === "blue" ? 120 : WORLD_W - 120;
              ef.y = GY;
              ef.carrier = null;
            }
            s.score[p.team]++;
            s.score.msg = `${p.team.toUpperCase()} CAPTURES FLAG! ★`;
            s.score.msgUntil = performance.now() + 2500;
            pendingRoundAnim.current = {
              msg: s.score.msg,
              blue: s.score.blue,
              red: s.score.red,
              event: "flag",
            };
            if (checkWin(s)) return;
            // Flag captured but no winner yet: start the synchronized round reset
            // so both teams respawn at their bases for the next round.
            startRoundEnd(s);
          }
        }
      }
    }

    if (isNetworkGuest) {
      const target = networkTargetsRef.current.get("me");
      const moving =
        s.mobile.left ||
        s.mobile.right ||
        s.mobile.jump ||
        s.mobile.down ||
        Math.abs(s.mobile.moveX) > 0.18 ||
        s.keys.has("a") ||
        s.keys.has("d") ||
        s.keys.has("arrowleft") ||
        s.keys.has("arrowright") ||
        s.keys.has("w") ||
        s.keys.has("s") ||
        s.keys.has("arrowup") ||
        s.keys.has("arrowdown") ||
        s.keys.has(" ");
      if (target && !moving) {
        const dx = target.x - me.x;
        const dy = target.y - me.y;
        if (Math.abs(dx) > 80 || Math.abs(dy) > 80) {
          me.x = target.x;
          me.y = target.y;
        } else {
          const blend = 1 - Math.pow(0.88, dtScale);
          me.x += dx * blend;
          me.y += dy * blend;
        }
      }
    }

    // Health kits
    for (const k of s.healthKits) {
      if (!k.alive) {
        k.respawnIn -= dtScale;
        if (k.respawnIn <= 0) k.alive = true;
        continue;
      }
      for (const p of s.players) {
        if (!p.alive || p.hp >= 100) continue;
        // Underground kits only heal underground players & vice versa (IMPROVEMENT_TODO #4)
        if (p.underground !== k.underground) continue;
        if (Math.abs(p.x - k.x) < 22 && Math.abs(p.y - k.y) < 22) {
          p.hp = Math.min(100, p.hp + 30);
          k.alive = false;
          k.respawnIn = 1200;
          // Heal particles
          spawnParticles(s.particles, k.x, k.y - 12, {
            count: 8,
            speed: 2,
            spread: Math.PI * 2,
            angle: -Math.PI / 2,
            life: 25,
            size: 4,
            color: "#22c55e",
            gravity: -0.05,
            shrink: true,
          });
          if (p.id === "me") {
            s.score.msg = "MEDKIT +30 HP!";
            s.score.msgUntil = performance.now() + 1800;
          }
          break;
        }
      }
    }

    // Bullets
    s.bullets = s.bullets.filter((b) => {
      b.prevX = b.x;
      b.prevY = b.y;
      if (b.isGrenade) {
        b.vy += GRAV * 0.4 * dtScale;
        b.x += b.vx * dtScale;
        b.y += b.vy * dtScale;
        b.dist += Math.hypot(b.vx, b.vy) * dtScale;
        if (b.explodeTimer !== undefined) b.explodeTimer -= dtScale;
        const grenadeGround = b.underground ? UNDERGROUND_Y : GY;
        if (b.y >= grenadeGround || (b.explodeTimer !== undefined && b.explodeTimer <= 0)) {
          _eid++;
          const exY = Math.min(b.y, grenadeGround);
          s.explosions.push({ x: b.x, y: exY, r: 0, alpha: 1, id: _eid });
          spawnExplosionFx(s.particles, b.x, exY);
          playSfx("bomb", { x: b.x, y: exY });
          addShake(12);
          const att = s.players.find((p) => p.team === b.team) ?? s.players[0];
          for (const p of s.players) {
            if (!p.alive) continue;
            // Grenade only damages players on the same layer.
            if (!!p.underground !== !!b.underground) continue;
            const d = Math.hypot(p.x - b.x, p.y - b.y);
            if (d < 80) applyDamage(p, b.damage * (1 - d / 80), att, s);
          }
          return false;
        }
        return true;
      }
      b.x += b.vx * dtScale;
      b.y += b.vy * dtScale;
      b.dist += Math.hypot(b.vx, b.vy) * dtScale;
      // Ground level depends on which layer the bullet is on.
      const bulletGround = b.underground ? UNDERGROUND_Y : GY;
      if (b.dist > b.range || b.y > bulletGround || b.x < 0 || b.x > WORLD_W) {
        // Bullet impact dust on ground
        if (b.y >= bulletGround) {
          spawnParticles(s.particles, b.x, bulletGround, {
            count: 3,
            speed: 2,
            spread: 1.5,
            angle: -Math.PI / 2,
            life: 12,
            size: 2,
            color: "rgba(150,140,100,0.6)",
            gravity: 0.1,
            shrink: true,
          });
        }
        return false;
      }
      // Stop bullet on solid structures (walls, boxes, rocks, cars, sandbags).
      // One-way platforms/bridges and stairs don't block bullets.
      // Surface structures don't block underground bullets and vice versa.
      if (!b.underground) {
        for (const str of STRUCTURES()) {
          if (
            str.type === "stair" ||
            str.type === "platform" ||
            str.type === "bridge"
          )
            continue;
          if (
            b.x >= str.x - 1 &&
            b.x <= str.x + str.w + 1 &&
            b.y >= str.y &&
            b.y <= str.y + str.h
          ) {
            spawnImpactSparks(s.particles, b.x, b.y, Math.atan2(b.vy, b.vx));
            return false;
          }
        }
      } else {
        // Underground: tunnel side walls block bullets.
        const tun = WORLD.tunnel || WORLD.trench;
        if (tun && (b.x <= tun.leftWall || b.x >= tun.rightWall)) {
          spawnImpactSparks(s.particles, b.x, b.y, Math.atan2(b.vy, b.vx));
          return false;
        }
        // Underground cover objects block bullets (IMPROVEMENT_TODO #12)
        for (const c of UNDER_COVER()) {
          if (
            b.x >= c.x - 1 &&
            b.x <= c.x + c.w + 1 &&
            b.y >= UNDERGROUND_Y - c.h &&
            b.y <= UNDERGROUND_Y
          ) {
            spawnImpactSparks(s.particles, b.x, b.y, Math.atan2(b.vy, b.vx));
            return false;
          }
        }
      }
      for (const p of s.players) {
        if (p.team === b.team || !p.alive) continue;
        // Bullets only hit players on the same layer (surface vs underground)…
        if (!!p.underground !== !!b.underground) {
          // …EXCEPT at pit openings, where surface & underground players can
          // shoot across layers — making pits dangerous chokepoints
          // (IMPROVEMENT_TODO #16). Both the bullet and the player must be near
          // a pit opening.
          let crossAllowed = false;
          for (const pit of (WORLD.pits || [])) {
            const near = pit.w / 2 + 20;
            if (
              Math.abs(b.x - pit.x) < near &&
              Math.abs(p.x - pit.x) < near
            ) {
              crossAllowed = true;
              break;
            }
          }
          if (!crossAllowed) continue;
        }
        if (
          Math.abs(p.x - b.x) < PW / 2 + 3 &&
          Math.abs(p.y - PH / 2 - b.y) < PH / 2 + 3
        ) {
          const att =
            s.players.find((x) => x.id === b.ownerId) ??
            s.players.find((x) => x.team === b.team) ??
            s.players[0];
          // Headshot detection: bullet hits upper third of player
          const hitY = b.y;
          const playerTop = p.y - PH;
          const headZone = playerTop + PH * 0.35;
          const isHead = hitY < headZone;
          spawnBloodHit(s.particles, b.x, b.y, Math.atan2(b.vy, b.vx));
          applyDamage(p, b.damage, att, s, isHead);
          return false;
        }
      }
      return true;
    });

    s.explosions = s.explosions.filter((e) => {
      e.r += 3 * dtScale;
      e.alpha -= 0.04 * dtScale;
      return e.alpha > 0;
    });

    // Particles update
    s.particles = s.particles.filter((pt) => {
      pt.x += pt.vx * dtScale;
      pt.y += pt.vy * dtScale;
      pt.vy += pt.gravity * dtScale;
      pt.life -= dtScale;
      pt.rot += pt.rotSpeed * dtScale;
      return pt.life > 0;
    });

    // Damage numbers update
    s.damageNumbers = s.damageNumbers.filter((dn) => {
      dn.y += dn.vy * dtScale;
      dn.vy += 0.05 * dtScale;
      dn.life -= dtScale;
      return dn.life > 0;
    });

    // Kill feed update
    s.killFeed = s.killFeed.filter((kf) => {
      kf.life -= 16.67 * dtScale;
      return kf.life > 0;
    });

    // Screen shake decay
    if (s.shake.intensity > 0) {
      s.shake.intensity = Math.max(0, s.shake.intensity - 0.6 * dtScale);
      s.shake.x = (Math.random() - 0.5) * s.shake.intensity;
      s.shake.y = (Math.random() - 0.5) * s.shake.intensity;
    } else {
      s.shake.x = 0;
      s.shake.y = 0;
    }

    // Hit marker decay
    if (s.hitMarker > 0) s.hitMarker -= dtScale;

    // Low health pulse
    if (me.hp < 30 && me.alive) {
      s.lowHealthPulse += 0.05 * dtScale;
    } else {
      s.lowHealthPulse = 0;
    }

    for (const l of s.loot) {
      l.vy = Math.min(l.vy + 0.4 * dtScale, 8);
      l.y = Math.min(l.y + l.vy * dtScale, GY - 6);
      if (l.y >= GY - 6) l.vy = 0;
    }
    if (s.loot.length > 20) s.loot = s.loot.slice(-20);
    s.cameraX = Math.max(0, Math.min(me.x - VIEW_W / 2, WORLD_W - VIEW_W));
    // Vertical camera: when the player goes underground, shift the view down
    // so the tunnel/sewer level is visible. Smoothly interpolate.
    const targetCamY = undergroundCameraY(me);
    s.cameraY = (s.cameraY ?? 0) + (targetCamY - (s.cameraY ?? 0)) * 0.08 * dtScale;

    const nextHud = {
      hp: me.hp,
      ammo: me.ammo,
      mag: me.mag,
      reloading: me.reloading,
      kills: me.kills,
      deaths: me.deaths,
      slot: me.slot,
      grenades: me.grenadeCount,
      inBush: me.inBush,
    };
    const previousHud = hudRef.current;
    if (Object.keys(nextHud).some((key) => nextHud[key] !== previousHud[key])) {
      hudRef.current = nextHud;
      setHud(nextHud);
    }

    if (pendingRoundAnim.current && !roundAnimActive.current && !s.over) {
      const ev = pendingRoundAnim.current;
      pendingRoundAnim.current = null;
      roundAnimActive.current = true;
      setRoundAnim(ev);
      setTimeout(() => {
        setRoundAnim(null);
        roundAnimActive.current = false;
      }, 3000);
    }

    // Sync the "NEW ROUND" overlay with the starting phase of the round state machine.
    // This shows a brief countdown when players have respawned at base for the next round.
    // We read roundStartRef.current (not the roundStart state) because update() is called
    // from a requestAnimationFrame loop that was created once and closes over the first
    // render's values — reading the state directly would always see the stale initial null.
    if (s.roundState.phase === "starting" && !roundStartRef.current) {
      roundStartRef.current = { round: s.roundState.roundNumber };
      setRoundStart({ round: s.roundState.roundNumber });
    } else if (s.roundState.phase !== "starting" && roundStartRef.current) {
      roundStartRef.current = null;
      setRoundStart(null);
    }
  }

  // ──── Draw ────
  function draw() {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Everything below is written in 960×540 world units; the transform maps
    // that onto the higher-resolution backing store.
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const me = s.players.find((p) => p.id === "me");
    if (!me) return;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    if (mapId === "city") {
      sky.addColorStop(0, "#0c0c22");
      sky.addColorStop(1, "#1a1a3a");
    } else if (mapId === "jungle") {
      sky.addColorStop(0, "#041204");
      sky.addColorStop(1, "#0d1f0d");
    } else if (mapId === "desert") {
      sky.addColorStop(0, "#1a1206");
      sky.addColorStop(1, "#2a2010");
    } else {
      sky.addColorStop(0, "#050505");
      sky.addColorStop(1, "#0a0a0a");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Ambient light overlay using the map's ambientColor field (IMPROVEMENT_TODO
    // #8): a subtle colored gradient near the horizon that tints the surface
    // with each map's mood. Only drawn near the surface view.
    if ((s.cameraY || 0) < 40 && mapDef.ambientColor) {
      const amb = mapDef.ambientColor;
      const ambGrad = ctx.createLinearGradient(0, VIEW_H * 0.45, 0, GY + 20);
      ambGrad.addColorStop(0, "rgba(0,0,0,0)");
      ambGrad.addColorStop(1, amb + "33"); // ~20% opacity tint at the horizon
      ctx.fillStyle = ambGrad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // Background parallax — only when the camera is near the surface. When
    // underground the view is below the surface, so we skip the sky background
    // and the underground fill (drawn in world space) covers the screen.
    if ((s.cameraY || 0) < 40) {
      drawBackground(ctx, s.cameraX);
    }

    // Apply screen shake
    ctx.save();
    ctx.translate(s.shake.x, s.shake.y);
    ctx.save();
    ctx.translate(-s.cameraX, -(s.cameraY || 0));

    // Ground — only fill the surface soil layer (GY to UNDERGROUND_Y). The
    // underground floor is drawn by drawUnderground() below. The soil between
    // the two layers is the "wall" that pit openings cut through.
    ctx.fillStyle = mapDef.groundColor;
    ctx.fillRect(0, GY, WORLD_W, UNDERGROUND_Y - GY);
    ctx.fillStyle = mapDef.wallColor;
    ctx.fillRect(0, GY, WORLD_W, 4);
    drawMapDecorations(ctx, s.cameraX);

    // Underground layer (sewers / mine tunnels / trenches) with ladders & pits.
    // Drawn before structures so pit openings appear as dark voids in the ground.
    drawUnderground(ctx);

    drawStructures(ctx);

    // Floating interaction prompts for ladders & pits (IMPROVEMENT_TODO #10).
    // Drawn in world space so they sit above the ladder/pit the player is near.
    drawInteractionPrompts(ctx, me);

    // Bases & flags
    drawBase(ctx, 120, "blue");
    drawBase(ctx, WORLD_W - 120, "red");
    for (const f of s.flags) {
      if (f.carrier) continue;
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f.x, GY - 2);
      ctx.lineTo(f.x, GY - 36);
      ctx.stroke();
      ctx.fillStyle = f.team === "blue" ? "#3b82f6" : "#ef4444";
      ctx.beginPath();
      ctx.moveTo(f.x, GY - 36);
      ctx.lineTo(f.x + 20, GY - 29);
      ctx.lineTo(f.x, GY - 22);
      ctx.closePath();
      ctx.fill();
    }

    // Health kits
    for (const k of s.healthKits) {
      if (!k.alive) continue;
      // Underground kits only draw when the camera is viewing the underground
      // layer; surface kits only when viewing the surface (IMPROVEMENT_TODO #4).
      const camY = s.cameraY || 0;
      if (k.underground && camY < 40) continue;
      if (!k.underground && camY >= 40) continue;
      const ky = k.y; // GY for surface kits, UNDERGROUND_Y for underground kits
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#fff";
      ctx.fillRect(k.x - 11, ky - 24, 22, 22);
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.strokeRect(k.x - 11, ky - 24, 22, 22);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(k.x - 2, ky - 22, 4, 18);
      ctx.fillRect(k.x - 9, ky - 16, 18, 4);
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(k.x, ky - 13, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Loot items
    for (const l of s.loot) {
      const lw = weaponById(l.weaponId);
      ctx.fillStyle = "rgba(253,224,71,0.2)";
      ctx.fillRect(l.x - 14, l.y - 7, 28, 13);
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 1;
      ctx.strokeRect(l.x - 14, l.y - 7, 28, 13);
      ctx.fillStyle = "#fde047";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(lw?.name.slice(0, 9) ?? "?", l.x, l.y + 2);
      ctx.textAlign = "left";
    }

    // Particles (behind players - dust, smoke)
    drawParticles(ctx, s.particles, ["circle", "debris"]);

    // Players
    for (const p of s.players) {
      if (!p.alive) continue;
      if (p.inHouse && p.id !== "me") continue;
      // Players on different layers (surface vs underground) can't see each
      // other through the ground — unless we're both at a pit opening.
      let layerHidden = false;
      if (me.underground !== p.underground) {
        layerHidden = true;
        // Exception: if the surface player is directly above an underground
        // player at a pit/manhole opening, both are visible.
        const pits = WORLD.pits || [];
        for (const pit of pits) {
          if (
            Math.abs(p.x - pit.x) < pit.w / 2 + 20 &&
            Math.abs(me.x - pit.x) < pit.w / 2 + 20
          ) {
            layerHidden = false;
            break;
          }
        }
      }
      const occluded = p.id !== "me" && (isOccluded(me.x, p.x, me.underground) || layerHidden);
      const hiddenInBush = p.inBush && p.id !== "me";
      if (occluded) continue;
      const alpha = hiddenInBush ? 0.1 : 1;
      ctx.globalAlpha = alpha;
      drawPlayer(ctx, p, me, hiddenInBush);
      ctx.globalAlpha = 1;
    }

    drawBushes(ctx);

    if (me.alive && me.inBush) {
      ctx.globalAlpha = 0.55;
      drawPlayer(ctx, me, me, false);
      ctx.globalAlpha = 1;
    }

    // Bullets with tracer trails
    for (const b of s.bullets) {
      if (b.isGrenade) {
        ctx.fillStyle = "#5a3e10";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Tracer trail — a tapered streak that fades behind the round, plus a
        // hot core, so fast projectiles read as motion instead of a dot.
        const angle = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.globalCompositeOperation = "lighter";
        const trailLen = 34;
        const streak = ctx.createLinearGradient(-trailLen, 0, 3, 0);
        streak.addColorStop(0, "rgba(253,224,71,0)");
        streak.addColorStop(0.55, "rgba(253,224,71,0.28)");
        streak.addColorStop(1, "rgba(255,248,220,0.75)");
        ctx.fillStyle = streak;
        ctx.beginPath();
        ctx.moveTo(-trailLen, -0.4);
        ctx.lineTo(2, -2.4);
        ctx.lineTo(2, 2.4);
        ctx.lineTo(-trailLen, 0.4);
        ctx.closePath();
        ctx.fill();
        // glow halo around the head of the round
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 11);
        halo.addColorStop(0, "rgba(255, 248, 220, 0.5)");
        halo.addColorStop(1, "rgba(253, 224, 71, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        // Core bullet
        ctx.fillStyle = "#fff8dc";
        ctx.fillRect(-5, -1.4, 9, 2.8);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-3, -0.9, 5, 1.8);
        ctx.restore();
      }
    }

    // Explosions
    for (const ex of s.explosions) {
      ctx.globalAlpha = ex.alpha;
      const g = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.3, "#fbbf24");
      g.addColorStop(0.7, "#ef4444");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
      ctx.fill();
      // Shockwave ring
      ctx.globalAlpha = ex.alpha * 0.5;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Flash and glow particles (on top)
    drawParticles(ctx, s.particles, ["flash"]);

    // Damage numbers
    drawDamageNumbers(ctx, s.damageNumbers);

    drawHouse(ctx, me, s);

    ctx.restore(); // camera translate
    ctx.restore(); // shake translate

    // HUD (screen space, no shake)
    drawHUD(ctx, me, s);
    drawVignette(ctx, me);
    // Underground atmosphere overlay: dark vignette + flickering light sources
    // when the camera is viewing the underground layer (IMPROVEMENT_TODO #6).
    drawUndergroundAtmosphere(ctx, me, s);
    drawCrosshair(ctx, me, s);
    drawMinimap(ctx, s);
    drawKillFeed(ctx, s.killFeed);
    if (s.showScoreboard) drawScoreboard(ctx, s);
  }

  function drawParticles(ctx, particles, types) {
    for (const pt of particles) {
      if (types && !types.includes(pt.type)) continue;
      const lifeRatio = pt.life / pt.maxLife;
      const alpha = Math.min(1, lifeRatio * 1.5);
      ctx.globalAlpha = alpha;
      const sz = pt.shrink ? pt.size * lifeRatio : pt.size;

      if (pt.type === "flash") {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
        grd.addColorStop(0, "rgba(255,248,220,0.9)");
        grd.addColorStop(0.5, "rgba(253,224,71,0.5)");
        grd.addColorStop(1, "rgba(253,224,71,0)");
        // Additive so the flash actually casts light over the scene.
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, sz, 0, Math.PI * 2);
        ctx.fill();
        // Forward light cone — the muzzle throws light down the barrel line.
        const cone = ctx.createLinearGradient(0, 0, sz * 2.6, 0);
        cone.addColorStop(0, "rgba(255, 244, 190, 0.34)");
        cone.addColorStop(1, "rgba(255, 240, 170, 0)");
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.16);
        ctx.lineTo(sz * 2.6, -sz * 0.62);
        ctx.lineTo(sz * 2.6, sz * 0.62);
        ctx.lineTo(0, sz * 0.16);
        ctx.closePath();
        ctx.fill();
        // Tapered four-point star: longer spikes forward, short ones sideways.
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.moveTo(sz * 1.35, 0);
        ctx.lineTo(0, -sz * 0.2);
        ctx.lineTo(-sz * 0.5, 0);
        ctx.lineTo(0, sz * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 252, 235, 0.75)";
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.85);
        ctx.lineTo(sz * 0.14, 0);
        ctx.lineTo(0, sz * 0.85);
        ctx.lineTo(-sz * 0.14, 0);
        ctx.closePath();
        ctx.fill();
        // hot core
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, sz * 0.22), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === "debris") {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDamageNumbers(ctx, numbers) {
    for (const dn of numbers) {
      const lifeRatio = dn.life / dn.maxLife;
      ctx.globalAlpha = Math.min(1, lifeRatio * 2);
      ctx.font = dn.isHeadshot
        ? "bold 16px 'Courier New', monospace"
        : "bold 12px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(`${dn.isHeadshot ? "!" : ""}${dn.value}`, dn.x + 1, dn.y + 1);
      ctx.fillStyle = dn.color;
      ctx.fillText(`${dn.isHeadshot ? "!" : ""}${dn.value}`, dn.x, dn.y);
      if (dn.isHeadshot) {
        ctx.font = "8px monospace";
        ctx.fillStyle = "#fde047";
        ctx.fillText("HEADSHOT", dn.x, dn.y - 14);
      }
      ctx.textAlign = "left";
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(ctx, p, me, hiddenInBush) {
    const col = p.team === "blue" ? "#60a5fa" : "#f87171";
    const frame = getSpriteFrame(p);
    const sprite =
      spriteRef.current[`${p.team}-${frame}`] ??
      spriteRef.current[`${p.team}-stand`];
    const hasSprite = Boolean(
      sprite?.complete && sprite.naturalWidth > 0 && sprite.naturalHeight > 0,
    );
    // The procedural operator art always occupies the same box, so anchors (gun
    // hand, HP bar, name) stay put whether or not a legacy bitmap is present.
    const spriteH = PLAYER_SPRITE_HEIGHT;
    const spriteW = 34;
    const topY = p.y - spriteH;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y - 2,
      Math.max(9, spriteW * 0.28),
      6,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Hit flash
    if (p.flashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (p.flashTimer / 6) * 0.5;
    }

    // Procedural animation transform for this player this frame.
    const anim = getAnimTransform(p);
    // The body rotates around its feet (bottom-center at p.x, p.y), so we
    // pivot there for the lean. Squash/stretch is also anchored at the feet so
    // the character stays planted while the upper body deforms.
    const pivotX = p.x;
    const pivotY = p.y;
    // bob raises the whole body; sway shifts it horizontally.
    const bodyOffsetY = -anim.bob;
    const bodyOffsetX = anim.sway * p.facing;

    if (hasSprite && sprite) {
      ctx.save();
      // Move to the foot pivot, apply lean (rotate) + squash/stretch, then draw
      // the sprite centered above the feet.
      ctx.translate(pivotX + bodyOffsetX, pivotY + bodyOffsetY);
      ctx.rotate(anim.lean * p.facing);
      ctx.scale(anim.squashX, anim.squashY);
      // Now the local origin is at the feet; draw the sprite so its bottom is
      // at the origin and centered horizontally. Account for facing flip.
      if (p.facing < 0) ctx.scale(-1, 1);
      // Layered pixel-art operator: legs, armour, helmet and arms are drawn
      // separately so each animation state has its own real pose.
      const activeWeapon = weaponById(p.primaryWeaponId);
      drawOperatorBody(ctx, {
        team: p.team,
        state: operatorStateFor(p),
        phase: p.walkPhase ?? 0,
        time: (p.animTime ?? 0) / 1000,
        leaning: anim.lean,
        reloadProgress:
          p.reloading && activeWeapon
            ? Math.max(
                0,
                Math.min(1, 1 - (p.reloadTimer ?? 0) / activeWeapon.reloadMs),
              )
            : 0,
        swapProgress:
          p.weaponSwapTimer > 0
            ? 1 - p.weaponSwapTimer / (p.weaponSwapDur || 18)
            : 0,
        throwProgress:
          p.throwTimer > 0 ? 1 - p.throwTimer / (p.throwDur || 20) : 0,
      });
      ctx.restore();

      // Selection ring stays grounded (does not follow the bob) for stability.
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y - 2,
        Math.max(10, spriteW * 0.26),
        5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else {
      // Fallback rectangle avatar — apply the same procedural transform.
      ctx.save();
      ctx.translate(pivotX + bodyOffsetX, pivotY + bodyOffsetY);
      ctx.rotate(anim.lean * p.facing);
      ctx.scale(anim.squashX, anim.squashY);
      if (p.facing < 0) ctx.scale(-1, 1);
      // Same procedural operator as the main path — no bitmap needed at all.
      drawOperatorBody(ctx, {
        team: p.team,
        state: operatorStateFor(p),
        phase: p.walkPhase ?? 0,
        time: (p.animTime ?? 0) / 1000,
        leaning: anim.lean,
      });
      ctx.restore();
    }

    // ── Climbing limbs overlay (IMPROVEMENT_TODO #13) ──
    // When on a ladder, draw animated arms reaching for rungs and legs in an
    // alternating climb pose on top of the body. This gives a clear visual
    // readout of the climbing state for both the player and observed teammates.
    if (p.onLadder) {
      const cph = p.climbPhase;
      const reach = Math.sin(cph); // -1..1 alternating reach
      const reach2 = Math.sin(cph + Math.PI); // opposite arm
      const legA = Math.sin(cph + Math.PI / 2); // legs counter-cycle
      const legB = Math.sin(cph - Math.PI / 2);
      const bx = pivotX + bodyOffsetX;
      const by = pivotY + bodyOffsetY;
      const bodyH = hasSprite ? spriteH : PH;
      const hipY = by - bodyH * 0.45;
      const shoulderY = by - bodyH * 0.82;
      ctx.strokeStyle = "#1f2410";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      // Arms reach upward toward alternating rungs
      ctx.beginPath();
      ctx.moveTo(bx - 4, shoulderY);
      ctx.lineTo(bx - 4 + reach * 3, shoulderY - 10 - Math.max(0, reach) * 7);
      ctx.moveTo(bx + 4, shoulderY);
      ctx.lineTo(bx + 4 + reach2 * 3, shoulderY - 10 - Math.max(0, reach2) * 7);
      ctx.stroke();
      // Legs bent in alternating step
      ctx.beginPath();
      ctx.moveTo(bx - 3, hipY);
      ctx.lineTo(bx - 3 + legA * 4, by - Math.max(0, legA) * 6);
      ctx.moveTo(bx + 3, hipY);
      ctx.lineTo(bx + 3 + legB * 4, by - Math.max(0, legB) * 6);
      ctx.stroke();
      ctx.lineCap = "butt";
    }

    if (p.flashTimer > 0) {
      ctx.restore();
    }

    if (!hiddenInBush) {
      // Compute the gun "hand" anchor in world space by transforming the local
      // hand point through the same procedural body transform (so the weapon
      // rides the bob/lean/squash and stays in the character's grip).
      // Local hand: a few px toward the facing side, ~56% up the sprite from feet.
      const handLocalY = -(hasSprite ? spriteH : PH) * 0.44;
      const handLocalX = p.facing * 3;
      const ang = anim.lean * p.facing;
      const sx = anim.squashX,
        sy = anim.squashY;
      const flip = p.facing < 0 ? -1 : 1;
      // Rotate the (flipped, scaled) local hand offset, then translate to pivot.
      const lx = handLocalX * flip * sx;
      const ly = handLocalY * sy;
      const gx = pivotX + bodyOffsetX + (lx * Math.cos(ang) - ly * Math.sin(ang));
      const gy2 = pivotY + bodyOffsetY + (lx * Math.sin(ang) + ly * Math.cos(ang));

      // Weapon — apply the gun transform (swap lower, reload dip, bob/sway,
      // recoil kick) so the gun visibly moves and changes (gun-swap animation).
      const gun = anim.gun;
      if ((p.slot === 0 || p.isAI) && gun) {
        // Hand grip stays anchored; the muzzle end swings with the gun offsets.
        // Offset the muzzle along the aim direction plus a downward dip.
        const muzzleLen = 22;
        const aimX = Math.cos(p.aimAngle) * muzzleLen;
        const aimY = Math.sin(p.aimAngle) * muzzleLen;
        // Rotate the aim vector by the gun rotate (reload dip + recoil), then
        // add the bob/sway and swap-lower offsets to the muzzle endpoint.
        const gr = gun.rotate;
        const rAimX = aimX * Math.cos(gr) - aimY * Math.sin(gr);
        const rAimY = aimX * Math.sin(gr) + aimY * Math.cos(gr);
        const muzzleGx = gx + rAimX + gun.offsetX * flip;
        const muzzleGy = gy2 + rAimY + gun.offsetY;
        ctx.globalAlpha = Math.max(0, gun.opacity);
        // Pixel-art weapon silhouette per class, angled down the aim vector.
        drawWeaponSprite(
          ctx,
          gx,
          gy2,
          Math.atan2(muzzleGy - gy2, muzzleGx - gx),
          weaponClassFor(p.primaryWeaponId),
          { alpha: Math.max(0, gun.opacity), recoil: p.recoil ?? 0 },
        );
        const prof = profileRef.current;
        const wa = prof.weaponAttachments?.[p.primaryWeaponId] ?? {
          laser: false,
          scope: false,
        };
        if (wa.laser && p.id === "me") {
          ctx.strokeStyle = "rgba(255,0,0,0.6)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(gx, gy2);
          ctx.lineTo(
            gx + Math.cos(p.aimAngle) * 160,
            gy2 + Math.sin(p.aimAngle) * 160,
          );
          ctx.stroke();
          ctx.fillStyle = "rgba(255,0,0,0.7)";
          ctx.beginPath();
          ctx.arc(
            gx + Math.cos(p.aimAngle) * 160,
            gy2 + Math.sin(p.aimAngle) * 160,
            2.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        // Weapon-swap sparkle: a brief highlight at the grip when the new gun
        // comes up (second half of the swap arc) to make the change pop.
        if (gun.swapping) {
          const t = 1 - p.weaponSwapTimer / p.weaponSwapDur;
          if (t > 0.5) {
            const pop = (t - 0.5) * 2; // 0→1 in the second half
            ctx.globalAlpha = (1 - pop) * 0.8;
            ctx.strokeStyle = "#fde047";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(gx, gy2, 4 + pop * 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      if (p.slot === 1 && !p.isAI) {
        const kgun = anim.gun;
        const kAlpha = kgun ? Math.max(0, kgun.opacity) : 1;
        const kDip = kgun ? kgun.offsetY : 0;
        ctx.globalAlpha = kAlpha;
        ctx.strokeStyle = "#bbb";
        ctx.lineWidth = 2;
        const kxLocal = 0,
          kyLocal = -(hasSprite ? spriteH : PH) * 0.5;
        const klx = kxLocal * flip * sx,
          kly = kyLocal * sy;
        const kx = pivotX + bodyOffsetX + (klx * Math.cos(ang) - kly * Math.sin(ang));
        const ky = pivotY + bodyOffsetY + (klx * Math.sin(ang) + kly * Math.cos(ang));
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.lineTo(kx + p.facing * 28, ky - (hasSprite ? spriteH : PH) * 0.22 + kDip);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // HP bar & name
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(p.x - 15, topY - 14, 30, 4);
      ctx.fillStyle = p.hp > 50 ? "#86efac" : p.hp > 25 ? "#fde68a" : "#fca5a5";
      ctx.fillRect(p.x - 15, topY - 14, (p.hp / 100) * 30, 4);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(p.name + (p.id === "me" ? " [YOU]" : ""), p.x, topY - 18);
      ctx.textAlign = "left";

      if (p.hasFlag) {
        ctx.fillStyle = p.team === "blue" ? "#ef4444" : "#3b82f6";
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        ctx.fillText("⚑", p.x, topY - 30);
        ctx.textAlign = "left";
      }
      if (p.emoteTimer > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(p.x - 30, topY - 48, 60, 20);
        ctx.fillStyle = "#000";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.emoteFrame, p.x, topY - 33);
        ctx.textAlign = "left";
      }
    }
  }

  function drawStructures(ctx) {
    const wallC = mapDef.wallColor;
    const darkC = shade(wallC, -0.35);
    const lightC = shade(wallC, 0.2);
    for (const s of STRUCTURES()) {
      if (s.type === "wall") {
        // Rounded concrete post with a soft top light and a chunky ink outline
        cartoonShadow(ctx, s.x - 2, GY - 1, s.w + 4);
        cartoonBlock(ctx, s.x, s.y, s.w, s.h, lightC, wallC, 6);
        ctx.strokeStyle = "rgba(0,0,0,0.16)";
        ctx.lineWidth = 1;
        for (let wy = s.y + 18; wy < GY - 4; wy += 24) {
          ctx.beginPath();
          ctx.moveTo(s.x + 3, wy);
          ctx.lineTo(s.x + s.w - 3, wy);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,0.26)";
        roundRectPath(ctx, s.x + 4, s.y + 5, Math.max(3, s.w * 0.3), Math.max(8, s.h * 0.4), 3);
        ctx.fill();
      } else if (s.type === "box") {
        cartoonShadow(ctx, s.x - 2, GY - 1, s.w + 4);
        cartoonBlock(ctx, s.x, s.y, s.w, s.h, "#a3713c", "#6b4423", 7);
        ctx.strokeStyle = "#4a2c10";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x + 5, s.y + 5);
        ctx.lineTo(s.x + s.w - 5, s.y + s.h - 5);
        ctx.moveTo(s.x + s.w - 5, s.y + 5);
        ctx.lineTo(s.x + 5, s.y + s.h - 5);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        roundRectPath(ctx, s.x + 5, s.y + 5, s.w - 10, 5, 3);
        ctx.fill();
      } else if (s.type === "stair" && s.dir) {
        ctx.fillStyle = "#504535";
        ctx.beginPath();
        if (s.dir === "right") {
          ctx.moveTo(s.x, GY);
          ctx.lineTo(s.x + s.w, GY - s.h);
          ctx.lineTo(s.x + s.w, GY);
        } else {
          ctx.moveTo(s.x + s.w, GY);
          ctx.lineTo(s.x, GY - s.h);
          ctx.lineTo(s.x, GY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#3a3020";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = "#6a6050";
        ctx.lineWidth = 1;
        const steps = 4;
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const sx = s.dir === "right" ? s.x + s.w * t : s.x + s.w * (1 - t);
          const sy = GY - s.h * t;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, GY);
          ctx.stroke();
        }
      } else if (s.type === "platform") {
        // Cast concrete catwalk — rounded slab with an ink outline
        const slab = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
        slab.addColorStop(0, "#83839c");
        slab.addColorStop(1, "#45455a");
        roundRectPath(ctx, s.x, s.y, s.w, s.h, 6);
        ctx.fillStyle = slab;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        roundRectPath(ctx, s.x + 5, s.y + 3, Math.max(6, s.w - 10), 3, 2);
        ctx.fill();
      } else if (s.type === "bridge") {
        // Rope bridge — wooden planks slung between two posts
        ctx.strokeStyle = "#5a4020";
        ctx.lineWidth = 2;
        // Support ropes (slight sag)
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + s.w / 2, s.y + 6, s.x + s.w, s.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + s.h - 2);
        ctx.quadraticCurveTo(s.x + s.w / 2, s.y + s.h + 4, s.x + s.w, s.y + s.h - 2);
        ctx.stroke();
        // Planks
        ctx.fillStyle = "#6b4a28";
        for (let px = s.x; px < s.x + s.w; px += 14) {
          const sag = Math.sin(((px - s.x) / s.w) * Math.PI) * 3;
          ctx.fillRect(px, s.y + sag, 12, s.h);
        }
        // Posts at each end
        ctx.fillStyle = "#3a2810";
        ctx.fillRect(s.x - 3, s.y - 20, 5, 24);
        ctx.fillRect(s.x + s.w - 2, s.y - 20, 5, 24);
      } else if (s.type === "sandbag") {
        // Stacked sandbag bunker wall
        const rows = Math.ceil(s.h / 12);
        const bagW = s.w / 2;
        for (let row = 0; row < rows; row++) {
          const offset = row % 2 === 0 ? 0 : bagW / 2;
          for (let col = -1; col < 2; col++) {
            const bx = s.x + col * bagW + offset;
            const by = s.y + row * 12;
            if (bx + bagW > s.x && bx < s.x + s.w) {
              ctx.fillStyle = row % 2 === 0 ? "#8a7848" : "#7a6838";
              ctx.beginPath();
              ctx.ellipse(bx + bagW / 2, by + 6, bagW / 2, 7, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#5a4828";
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
        // Top lip
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(s.x, s.y, s.w, 2);
      } else if (s.type === "rock") {
        // Irregular boulder — polygon with shaded facets
        ctx.fillStyle = "#5a5a5a";
        ctx.beginPath();
        ctx.moveTo(s.x, GY);
        ctx.lineTo(s.x + s.w * 0.15, s.y + s.h * 0.3);
        ctx.lineTo(s.x + s.w * 0.5, s.y);
        ctx.lineTo(s.x + s.w * 0.85, s.y + s.h * 0.35);
        ctx.lineTo(s.x + s.w, GY);
        ctx.closePath();
        ctx.fill();
        // Light facet
        ctx.fillStyle = "#6e6e6e";
        ctx.beginPath();
        ctx.moveTo(s.x + s.w * 0.15, s.y + s.h * 0.3);
        ctx.lineTo(s.x + s.w * 0.5, s.y);
        ctx.lineTo(s.x + s.w * 0.45, s.y + s.h * 0.6);
        ctx.closePath();
        ctx.fill();
        // Dark facet
        ctx.fillStyle = "#3e3e3e";
        ctx.beginPath();
        ctx.moveTo(s.x + s.w * 0.5, s.y);
        ctx.lineTo(s.x + s.w * 0.85, s.y + s.h * 0.35);
        ctx.lineTo(s.x + s.w * 0.55, s.y + s.h * 0.6);
        ctx.closePath();
        ctx.fill();
        // Outline
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, GY);
        ctx.lineTo(s.x + s.w * 0.15, s.y + s.h * 0.3);
        ctx.lineTo(s.x + s.w * 0.5, s.y);
        ctx.lineTo(s.x + s.w * 0.85, s.y + s.h * 0.35);
        ctx.lineTo(s.x + s.w, GY);
        ctx.stroke();
      } else if (s.type === "car") {
        // Wrecked car — rounded cartoon body, cabin, wheels
        cartoonShadow(ctx, s.x - 2, GY - 1, s.w + 4);
        const body = ctx.createLinearGradient(s.x, s.y + s.h * 0.4, s.x, s.y + s.h);
        body.addColorStop(0, "#ab4a4a");
        body.addColorStop(1, "#6d2626");
        roundRectPath(ctx, s.x, s.y + s.h * 0.4, s.w, s.h * 0.6, 8);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        roundRectPath(ctx, s.x + s.w * 0.18, s.y, s.w * 0.64, s.h * 0.56, 7);
        ctx.fillStyle = "#8f3737";
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.fillStyle = "#28303e";
        roundRectPath(ctx, s.x + s.w * 0.26, s.y + 4, s.w * 0.48, s.h * 0.3, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        roundRectPath(ctx, s.x + s.w * 0.3, s.y + 6, s.w * 0.16, s.h * 0.12, 3);
        ctx.fill();
        for (const wx of [s.x + s.w * 0.26, s.x + s.w * 0.74]) {
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(wx, s.y + s.h, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#9aa0a6";
          ctx.beginPath();
          ctx.arc(wx, s.y + s.h, 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (s.type === "bunker") {
        // Reinforced concrete bunker: rounded slab, roof lip, firing slit and
        // a hazard-striped skirt. Solid cover you can stand on.
        cartoonShadow(ctx, s.x - 3, GY - 1, s.w + 6);
        cartoonBlock(ctx, s.x, s.y, s.w, s.h, "#9aa088", "#5d6354", 10);
        cartoonBlock(ctx, s.x - 6, s.y - 9, s.w + 12, 13, "#b3b99f", "#7b8172", 6);
        roundRectPath(
          ctx,
          s.x + s.w * 0.14,
          s.y + s.h * 0.33,
          s.w * 0.72,
          Math.max(10, s.h * 0.16),
          5,
        );
        ctx.fillStyle = "#14180f";
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        roundRectPath(
          ctx,
          s.x + s.w * 0.4,
          GY - s.h * 0.44,
          s.w * 0.2,
          s.h * 0.44,
          4,
        );
        ctx.fillStyle = "#2c3324";
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.stroke();
        // Hazard stripe along the base
        ctx.save();
        roundRectPath(ctx, s.x + 8, GY - 20, s.w - 16, 11, 4);
        ctx.clip();
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(s.x + 8, GY - 20, s.w - 16, 11);
        ctx.fillStyle = INK;
        for (let hx = s.x - 12; hx < s.x + s.w; hx += 16) {
          ctx.beginPath();
          ctx.moveTo(hx, GY - 9);
          ctx.lineTo(hx + 9, GY - 21);
          ctx.lineTo(hx + 15, GY - 21);
          ctx.lineTo(hx + 6, GY - 9);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (s.type === "ore") {
        // Mine cart loaded with ore — climbable solid cover
        cartoonShadow(ctx, s.x - 2, GY - 1, s.w + 4);
        const tub = ctx.createLinearGradient(s.x, s.y + 6, s.x, GY);
        tub.addColorStop(0, "#8b95a1");
        tub.addColorStop(1, "#49515b");
        roundRectPath(ctx, s.x, s.y + 6, s.w, s.h - 6, 8);
        ctx.fillStyle = tub;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        for (const [t, color] of [
          [0.24, "#e0a92f"],
          [0.46, "#a9d14a"],
          [0.68, "#e0703a"],
        ]) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(s.x + s.w * t, s.y + 7, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        for (const wx of [s.x + s.w * 0.22, s.x + s.w * 0.78]) {
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(wx, GY - 5, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#b9c0c7";
          ctx.beginPath();
          ctx.arc(wx, GY - 5, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Draw the underground layer: sewer/tunnel/trench floor, walls, and the
  // ladder & pit openings that connect it to the surface. This is called
  // from draw() after the ground but before structures so pits appear as
  // dark voids cut into the surface.
  // Floating prompts for ladder/pit interaction (IMPROVEMENT_TODO #10).
  // Shows "↑/↓ Climb" near a ladder and "↓ Drop" over a pit when the player
  // is close enough to interact.
  function drawInteractionPrompts(ctx, me) {
    if (!me || !me.alive || me.inHouse) return;
    ctx.textAlign = "center";
    ctx.font = "bold 10px monospace";
    // Ladder prompt
    const lad = findLadderNear(me.x, me.y);
    if (lad && !me.onLadder) {
      const px = lad.x;
      const py = Math.max(lad.topY, me.y - PH - 18);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(px - 44, py - 12, 88, 16);
      ctx.fillStyle = "#a78bfa";
      ctx.fillText("USE / \u2191\u2193 CLIMB", px, py);
    }
    // Pit/manhole "drop" prompt — when standing over a pit on the surface
    if (!me.underground && Math.abs(me.y - GY) < 2) {
      for (const pit of (WORLD.pits || [])) {
        if (me.x > pit.x - pit.w / 2 - 6 && me.x < pit.x + pit.w / 2 + 6) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(pit.x - 40, GY - 36, 80, 16);
          ctx.fillStyle = "#a78bfa";
          ctx.fillText("\u2193 PRESS DOWN", pit.x, GY - 24);
          break;
        }
      }
    }
    ctx.textAlign = "left";
  }

  function drawUnderground(ctx) {
    const tun = WORLD.tunnel || WORLD.trench;
    if (!tun) {
      // No underground layer — fill the rest of the screen with ground color
      // so there's no gap below the surface soil strip.
      ctx.fillStyle = mapDef.groundColor;
      ctx.fillRect(0, UNDERGROUND_Y, WORLD_W, VIEW_H - UNDERGROUND_Y + 40);
      return;
    }
    const uy = tun.y;
    // Carve the tunnel air out of the soil: the open space between the street
    // slab and the tunnel floor. Without it the lower level reads as a slab of
    // dirt with a road painted along the bottom.
    const ceilingY = GY + 40;
    const airGrad = ctx.createLinearGradient(0, ceilingY, 0, uy);
    airGrad.addColorStop(0, "#05070a");
    airGrad.addColorStop(0.55, "#0b0f13");
    airGrad.addColorStop(1, "#171c22");
    ctx.fillStyle = airGrad;
    ctx.fillRect(tun.leftWall, ceilingY, tun.rightWall - tun.leftWall, uy - ceilingY);
    // Underside of the street slab (the tunnel ceiling)
    ctx.fillStyle = shade(mapDef.wallColor, -0.55);
    ctx.fillRect(tun.leftWall, ceilingY, tun.rightWall - tun.leftWall, 7);
    // Underground floor strip (fills from tunnel floor to bottom of screen)
    ctx.fillStyle = shade(mapDef.groundColor, -0.5);
    ctx.fillRect(tun.leftWall, uy, tun.rightWall - tun.leftWall, VIEW_H - uy + 40);
    // Fill the area outside the tunnel walls with surface ground color (soil)
    ctx.fillStyle = mapDef.groundColor;
    ctx.fillRect(0, uy, tun.leftWall, VIEW_H - uy + 40);
    ctx.fillRect(tun.rightWall, uy, WORLD_W - tun.rightWall, VIEW_H - uy + 40);
    // Floor top edge
    ctx.fillStyle = shade(mapDef.wallColor, -0.3);
    ctx.fillRect(tun.leftWall, uy, tun.rightWall - tun.leftWall, 3);

    // Underground service road: a paved strip along the whole tunnel with a
    // dashed centre line, so the lower level reads as a real road to fight on.
    const roadGrad = ctx.createLinearGradient(0, uy, 0, uy + 22);
    roadGrad.addColorStop(0, "#49505a");
    roadGrad.addColorStop(1, "#2b3138");
    roundRectPath(ctx, tun.leftWall, uy, tun.rightWall - tun.leftWall, 22, 6);
    ctx.fillStyle = roadGrad;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(228,196,84,0.85)";
    for (let dx = tun.leftWall + 20; dx < tun.rightWall - 40; dx += 48) {
      roundRectPath(ctx, dx, uy + 9, 22, 4, 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(tun.leftWall + 6, uy + 2, tun.rightWall - tun.leftWall - 12, 1.5);
    // Side walls (the soil walls of the tunnel)
    ctx.fillStyle = shade(mapDef.wallColor, -0.45);
    ctx.fillRect(tun.leftWall - 8, ceilingY, 8, VIEW_H - ceilingY + 40);
    ctx.fillRect(tun.rightWall, ceilingY, 8, VIEW_H - ceilingY + 40);

    // Tile / brick pattern on the underground floor for texture
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.5;
    for (let tx = tun.leftWall; tx < tun.rightWall; tx += 40) {
      ctx.beginPath();
      ctx.moveTo(tx, uy + 3);
      ctx.lineTo(tx, uy + 40);
      ctx.stroke();
    }

    // Pits / manholes / mine entrances — dark voids from surface to underground
    for (const pit of (WORLD.pits || [])) {
      const pitX = pit.x;
      const pitW = pit.w;
      // Dark shaft
      ctx.fillStyle = "#050505";
      ctx.fillRect(pitX - pitW / 2, GY, pitW, uy - GY);
      // Shaft walls (slight 3D)
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(pitX - pitW / 2, GY, 3, uy - GY);
      ctx.fillRect(pitX + pitW / 2 - 3, GY, 3, uy - GY);
      // Rim / manhole cover edge on the surface
      ctx.strokeStyle = shade(mapDef.wallColor, 0.15);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pitX - pitW / 2 - 2, GY);
      ctx.lineTo(pitX - pitW / 2, GY);
      ctx.moveTo(pitX + pitW / 2, GY);
      ctx.lineTo(pitX + pitW / 2 + 2, GY);
      ctx.stroke();
      // Street sign over the opening: a dark plate with a yellow chevron, so
      // the way down to the lower level is obvious from the surface.
      ctx.fillStyle = "rgba(10,12,8,0.92)";
      roundRectPath(ctx, pitX - 26, GY - 30, 52, 16, 4);
      ctx.fill();
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#e6d189";
      ctx.beginPath();
      ctx.moveTo(pitX - 8, GY - 25);
      ctx.lineTo(pitX, GY - 17);
      ctx.lineTo(pitX + 8, GY - 25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f3e6b0";
      ctx.fillRect(pitX - 7, GY - 27, 14, 2.5);

      // Kind label (subtle)
      if (pit.kind === "sewer") {
        ctx.fillStyle = "rgba(80,120,60,0.3)";
        ctx.fillRect(pitX - pitW / 2, GY - 1, pitW, 2);
      } else if (pit.kind === "mine") {
        ctx.fillStyle = "rgba(100,70,30,0.3)";
        ctx.fillRect(pitX - pitW / 2, GY - 1, pitW, 2);
      }
    }

    // Ladders — wooden/metal rungs between topY and botY
    for (const lad of (WORLD.ladders || [])) {
      const railColor = mapId === "jungle" ? "#5a4020" : "#4a4a4a";
      const rungColor = mapId === "jungle" ? "#6b4a28" : "#6a6a6a";
      // Two rails
      ctx.strokeStyle = railColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lad.x - 7, lad.topY);
      ctx.lineTo(lad.x - 7, lad.botY);
      ctx.moveTo(lad.x + 7, lad.topY);
      ctx.lineTo(lad.x + 7, lad.botY);
      ctx.stroke();
      // Rungs
      ctx.strokeStyle = rungColor;
      ctx.lineWidth = 2.5;
      for (let ry = lad.topY; ry <= lad.botY; ry += 14) {
        ctx.beginPath();
        ctx.moveTo(lad.x - 7, ry);
        ctx.lineTo(lad.x + 7, ry);
        ctx.stroke();
      }
    }

    // ── Underground catwalks ──
    // Steel walkways hung above the road give the lower level its own
    // verticality: climb a ladder, then drop onto a catwalk instead of the road.
    for (const pl of (WORLD.underPlatforms || [])) {
      // Support posts down to the road
      ctx.strokeStyle = "#2f333b";
      ctx.lineWidth = 4;
      for (let sx = pl.x + 14; sx < pl.x + pl.w; sx += 60) {
        ctx.beginPath();
        ctx.moveTo(sx, pl.y + 10);
        ctx.lineTo(sx, uy);
        ctx.stroke();
      }
      // Deck
      const deck = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + 12);
      deck.addColorStop(0, "#8d949e");
      deck.addColorStop(1, "#4a5058");
      roundRectPath(ctx, pl.x, pl.y, pl.w, 12, 5);
      ctx.fillStyle = deck;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Railing
      ctx.strokeStyle = "rgba(200,208,216,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pl.x + 4, pl.y - 12);
      ctx.lineTo(pl.x + pl.w - 4, pl.y - 12);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let rx = pl.x + 8; rx < pl.x + pl.w - 4; rx += 26) {
        ctx.beginPath();
        ctx.moveTo(rx, pl.y - 12);
        ctx.lineTo(rx, pl.y);
        ctx.stroke();
      }
      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      roundRectPath(ctx, pl.x + 5, pl.y + 2, Math.max(8, pl.w - 10), 2.5, 2);
      ctx.fill();
    }

    // ── Underground cover objects (IMPROVEMENT_TODO #12) ──
    // Render pillars / rubble / crates / sandpiles / beams that give the
    // underground tunnel real cover to fight around.
    for (const c of UNDER_COVER()) {
      const top = uy - c.h;
      if (c.type === "pillar") {
        // Concrete sewer pillar
        ctx.fillStyle = "#3a3a44";
        ctx.fillRect(c.x, top, c.w, c.h);
        ctx.fillStyle = "#4a4a54";
        ctx.fillRect(c.x, top, c.w, 3);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(c.x, top, c.w, c.h);
      } else if (c.type === "beam") {
        // Wooden mine support beam
        ctx.fillStyle = "#4a3216";
        ctx.fillRect(c.x, top, c.w, c.h);
        ctx.fillStyle = "#5a4020";
        ctx.fillRect(c.x, top, c.w, 4);
        ctx.fillRect(c.x - 4, top, 4, c.h);
        ctx.fillRect(c.x + c.w, top, 4, c.h);
      } else if (c.type === "sandpile") {
        // Sandbag-reinforced trench cover
        ctx.fillStyle = "#5a4a28";
        ctx.beginPath();
        ctx.moveTo(c.x, uy);
        ctx.lineTo(c.x + 4, top + 4);
        ctx.lineTo(c.x + c.w - 4, top + 4);
        ctx.lineTo(c.x + c.w, uy);
        ctx.closePath();
        ctx.fill();
        // Sandbag rows
        ctx.fillStyle = "#6a5a32";
        for (let by = top + 6; by < uy - 2; by += 9) {
          ctx.fillRect(c.x + 3, by, c.w - 6, 7);
        }
      } else if (c.type === "crate") {
        // Metal bunker crate
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(c.x, top, c.w, c.h);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x, top, c.w, c.h);
        ctx.beginPath();
        ctx.moveTo(c.x, top);
        ctx.lineTo(c.x + c.w, top + c.h);
        ctx.moveTo(c.x + c.w, top);
        ctx.lineTo(c.x, top + c.h);
        ctx.stroke();
      } else {
        // rubble — broken pipes / concrete chunks
        ctx.fillStyle = "#3a3630";
        ctx.beginPath();
        ctx.moveTo(c.x, uy);
        ctx.lineTo(c.x + 3, top + 6);
        ctx.lineTo(c.x + c.w * 0.4, top);
        ctx.lineTo(c.x + c.w * 0.7, top + 5);
        ctx.lineTo(c.x + c.w - 3, top + 3);
        ctx.lineTo(c.x + c.w, uy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#4a4638";
        ctx.fillRect(c.x + c.w * 0.2, top + 4, c.w * 0.25, c.h * 0.4);
      }
    }

    // ── Per-map underground atmosphere (IMPROVEMENT_TODO #5) ──
    // Each map type gets distinctive detailing so sewers, mine tunnels,
    // trenches, and shafts no longer look identical.
    const t = (Date.now() / 1000);
    if (mapId === "city") {
      // Sewer: greenish tint, flowing water band, dripping water
      ctx.fillStyle = "rgba(40,70,40,0.18)";
      ctx.fillRect(tun.leftWall, uy, tun.rightWall - tun.leftWall, VIEW_H - uy + 40);
      // Flowing water at the very bottom
      ctx.fillStyle = "rgba(30,60,50,0.5)";
      ctx.beginPath();
      ctx.moveTo(tun.leftWall, uy + 28);
      for (let wx = tun.leftWall; wx <= tun.rightWall; wx += 20) {
        const wy = uy + 28 + Math.sin((wx + t * 60) * 0.05) * 3;
        ctx.lineTo(wx, wy);
      }
      ctx.lineTo(tun.rightWall, uy + 60);
      ctx.lineTo(tun.leftWall, uy + 60);
      ctx.closePath();
      ctx.fill();
      // Sewer pipe openings on the walls
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      for (let wx = tun.leftWall + 120; wx < tun.rightWall - 120; wx += 360) {
        ctx.beginPath();
        ctx.ellipse(wx, uy + 8, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Dripping water particles (subtle)
      ctx.fillStyle = "rgba(120,160,140,0.4)";
      for (let i = 0; i < 6; i++) {
        const dx = tun.leftWall + ((i * 211 + t * 30) % (tun.rightWall - tun.leftWall));
        const dy = uy + ((i * 53 + t * 50) % 24);
        ctx.fillRect(dx, dy, 1.5, 4);
      }
    } else if (mapId === "jungle") {
      // Mine tunnel: root tendrils, flickering lantern glow, ore sparkles
      ctx.fillStyle = "rgba(60,45,20,0.12)";
      ctx.fillRect(tun.leftWall, uy, tun.rightWall - tun.leftWall, VIEW_H - uy + 40);
      // Root tendrils on walls
      ctx.strokeStyle = "rgba(40,30,12,0.5)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const rx = tun.leftWall + i * ((tun.rightWall - tun.leftWall) / 10) + 20;
        ctx.beginPath();
        ctx.moveTo(rx, uy + 2);
        ctx.quadraticCurveTo(rx + 6, uy + 10, rx - 4, uy + 22);
        ctx.stroke();
      }
      // Flickering lantern glow near ladders
      for (const lad of (WORLD.ladders || [])) {
        const flicker = 0.5 + 0.5 * Math.sin(t * 8 + lad.x);
        ctx.fillStyle = `rgba(255,180,60,${0.06 * flicker})`;
        ctx.beginPath();
        ctx.arc(lad.x, uy + 8, 70, 0, Math.PI * 2);
        ctx.fill();
      }
      // Ore vein sparkles
      for (let i = 0; i < 8; i++) {
        const sx = tun.leftWall + ((i * 167) % (tun.rightWall - tun.leftWall));
        const twinkle = Math.sin(t * 3 + i) > 0.85 ? 1 : 0;
        if (twinkle) {
          ctx.fillStyle = "rgba(200,200,120,0.6)";
          ctx.fillRect(sx, uy + 6 + (i % 3) * 6, 1.5, 1.5);
        }
      }
    } else if (mapId === "desert") {
      // Trench: sandbag rim, plank flooring, sand drifts, barbed wire
      ctx.fillStyle = "rgba(70,55,25,0.12)";
      ctx.fillRect(tun.leftWall, uy, tun.rightWall - tun.leftWall, VIEW_H - uy + 40);
      // Wooden plank flooring lines
      ctx.strokeStyle = "rgba(40,30,15,0.4)";
      ctx.lineWidth = 0.8;
      for (let wx = tun.leftWall; wx < tun.rightWall; wx += 32) {
        ctx.beginPath();
        ctx.moveTo(wx, uy + 3);
        ctx.lineTo(wx, uy + 20);
        ctx.stroke();
      }
      // Sand drift piles near walls
      ctx.fillStyle = "rgba(90,72,35,0.35)";
      ctx.beginPath();
      ctx.moveTo(tun.leftWall, uy + 16);
      ctx.quadraticCurveTo(tun.leftWall + 24, uy + 4, tun.leftWall + 50, uy + 16);
      ctx.lineTo(tun.leftWall + 50, uy + 30);
      ctx.lineTo(tun.leftWall, uy + 30);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tun.rightWall, uy + 16);
      ctx.quadraticCurveTo(tun.rightWall - 24, uy + 4, tun.rightWall - 50, uy + 16);
      ctx.lineTo(tun.rightWall - 50, uy + 30);
      ctx.lineTo(tun.rightWall, uy + 30);
      ctx.closePath();
      ctx.fill();
      // Barbed wire on rim
      ctx.strokeStyle = "rgba(120,110,90,0.5)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(tun.leftWall, uy + 1);
      for (let wx = tun.leftWall; wx <= tun.rightWall; wx += 12) {
        ctx.lineTo(wx + 6, uy + 1 + Math.sin(wx * 0.2) * 2);
      }
      ctx.stroke();
    } else {
      // Bunker shaft: metal grating, hanging cables, warning strobes
      ctx.fillStyle = "rgba(30,40,30,0.12)";
      ctx.fillRect(tun.leftWall, uy, tun.rightWall - tun.leftWall, VIEW_H - uy + 40);
      // Metal grating texture
      ctx.strokeStyle = "rgba(60,60,60,0.5)";
      ctx.lineWidth = 0.4;
      for (let wx = tun.leftWall; wx < tun.rightWall; wx += 8) {
        ctx.beginPath();
        ctx.moveTo(wx, uy + 3);
        ctx.lineTo(wx, uy + 22);
        ctx.stroke();
      }
      for (let wy = uy + 3; wy < uy + 22; wy += 6) {
        ctx.beginPath();
        ctx.moveTo(tun.leftWall, wy);
        ctx.lineTo(tun.rightWall, wy);
        ctx.stroke();
      }
      // Hanging cables
      ctx.strokeStyle = "rgba(40,40,40,0.6)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const cx2 = tun.leftWall + i * ((tun.rightWall - tun.leftWall) / 5) + 40;
        const sway = Math.sin(t * 1.5 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(cx2, uy + 2);
        ctx.quadraticCurveTo(cx2 + sway, uy + 14, cx2, uy + 26);
        ctx.stroke();
      }
      // Warning strobe near ladders (alternating red)
      for (const lad of (WORLD.ladders || [])) {
        const strobe = Math.sin(t * 6 + lad.x) > 0 ? 0.08 : 0;
        if (strobe) {
          ctx.fillStyle = `rgba(255,40,40,${strobe})`;
          ctx.beginPath();
          ctx.arc(lad.x, uy + 8, 60, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Helper: lighten/darken a hex color by a factor (-0.5 .. +0.5)
  function shade(hex, amt) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const f = (v) =>
      Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  // ── Cartoon drawing helpers ────────────────────────────────────────────
  // The art is smooth and rounded rather than pixel-blocky: soft fills, round
  // corners and a single bold ink outline on every object.
  const INK = "#1b1a14";

  function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Filled, rounded block with a vertical gradient and a chunky ink outline.
  function cartoonBlock(ctx, x, y, w, h, top, bottom, radius = 7, outline = INK) {
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Soft blob shadow under a ground object.
  function cartoonShadow(ctx, x, y, w) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y, w / 2 + 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBushes(ctx) {
    for (const b of BUSHES()) {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#1a4a18";
      ctx.beginPath();
      ctx.ellipse(
        b.x,
        b.y - b.r * 0.28,
        b.r * 1.0,
        b.r * 0.55,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#163e12";
      ctx.beginPath();
      ctx.ellipse(
        b.x - b.r * 0.42,
        b.y - b.r * 0.15,
        b.r * 0.65,
        b.r * 0.45,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#163e12";
      ctx.beginPath();
      ctx.ellipse(
        b.x + b.r * 0.42,
        b.y - b.r * 0.15,
        b.r * 0.65,
        b.r * 0.45,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#2a6820";
      ctx.beginPath();
      ctx.ellipse(
        b.x,
        b.y - b.r * 0.45,
        b.r * 0.6,
        b.r * 0.38,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#246018";
      ctx.beginPath();
      ctx.ellipse(
        b.x - b.r * 0.2,
        b.y - b.r * 0.5,
        b.r * 0.4,
        b.r * 0.28,
        -0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#246018";
      ctx.beginPath();
      ctx.ellipse(
        b.x + b.r * 0.25,
        b.y - b.r * 0.52,
        b.r * 0.38,
        b.r * 0.25,
        0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(134,204,22,0.55)";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("hide here", b.x, b.y - b.r - 2);
      ctx.textAlign = "left";
    }
  }

  function drawBackground(ctx, camX) {
    // Far parallax layer
    if (mapId === "city") {
      // Layer 1 — distant skyline haze: a soft band of city light just above the
      // rooftops, so the far layer fades into atmosphere instead of ending hard.
      const haze = ctx.createLinearGradient(0, VIEW_H - 260, 0, VIEW_H - 40);
      haze.addColorStop(0, "rgba(40, 60, 110, 0)");
      haze.addColorStop(0.55, "rgba(46, 74, 130, 0.22)");
      haze.addColorStop(1, "rgba(90, 130, 190, 0.1)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, VIEW_H - 260, VIEW_W, 220);

      // Layer 2 — farthest silhouette towers (0.07 parallax) with roof beacons.
      ctx.fillStyle = "rgba(14, 16, 36, 0.85)";
      for (let i = 0; i < 22; i++) {
        const bx = ((i * 150 - camX * 0.07 + 3400) % (VIEW_W + 260)) - 90;
        const bw = 46 + (i % 4) * 26;
        const bh = 70 + (i % 6) * 34;
        ctx.fillRect(bx, VIEW_H - bh - 46, bw, bh);
        // rooftop mast
        if (i % 3 === 0) {
          ctx.fillRect(bx + bw * 0.5 - 1, VIEW_H - bh - 58, 2, 12);
          ctx.fillStyle = "rgba(248, 113, 113, 0.45)";
          ctx.fillRect(bx + bw * 0.5 - 1.5, VIEW_H - bh - 60, 3, 3);
          ctx.fillStyle = "rgba(14, 16, 36, 0.85)";
        }
      }

      // Layer 3 — mid buildings (0.15 parallax) with lit window grids.
      for (let i = 0; i < 16; i++) {
        const bx = ((i * 210 - camX * 0.15 + 3080) % (VIEW_W + 300)) - 80;
        const bw = 84 + (i % 3) * 18;
        const bh = 90 + (i % 4) * 40;
        const by = VIEW_H - bh - 44;
        ctx.fillStyle = "#101026";
        ctx.fillRect(bx, by, bw, bh);
        // warm interior glow bleeding out of the facade
        const glow = ctx.createLinearGradient(bx, by, bx, by + bh);
        glow.addColorStop(0, "rgba(253, 224, 71, 0.05)");
        glow.addColorStop(1, "rgba(253, 224, 71, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(bx, by, bw, bh);
        // window grid: deterministic pattern, some lit some dark
        for (let wy = by + 10; wy < by + bh - 8; wy += 16) {
          for (let wx = bx + 8; wx < bx + bw - 10; wx += 14) {
            const seed = (wx * 13 + wy * 7 + i * 31) % 11;
            if (seed < 3) {
              ctx.fillStyle = "rgba(253, 224, 71, 0.16)";
              ctx.fillRect(wx, wy, 7, 10);
              ctx.fillStyle = "rgba(255, 246, 196, 0.22)";
              ctx.fillRect(wx, wy, 7, 3);
            } else if (seed < 5) {
              ctx.fillStyle = "rgba(120, 180, 255, 0.1)";
              ctx.fillRect(wx, wy, 7, 10);
            } else {
              ctx.fillStyle = "rgba(4, 6, 14, 0.5)";
              ctx.fillRect(wx, wy, 7, 10);
            }
          }
        }
        // parapet + edge highlight
        ctx.fillStyle = "#16163a";
        ctx.fillRect(bx - 2, by - 4, bw + 4, 4);
        ctx.fillStyle = "rgba(120, 160, 220, 0.14)";
        ctx.fillRect(bx, by, 1.5, bh);
      }

      // Layer 4 — nearest facades (0.32 parallax), very dark, adds depth framing.
      ctx.fillStyle = "#0a0a1c";
      for (let i = 0; i < 9; i++) {
        const bx = ((i * 330 - camX * 0.32 + 3600) % (VIEW_W + 400)) - 120;
        const bw = 120 + (i % 2) * 60;
        const bh = 150 + (i % 3) * 60;
        ctx.fillRect(bx, VIEW_H - bh - 20, bw, bh);
        ctx.fillStyle = "rgba(120, 170, 230, 0.06)";
        ctx.fillRect(bx, VIEW_H - bh - 20, 2, bh);
        ctx.fillStyle = "#0a0a1c";
      }
    } else if (mapId === "jungle") {
      // Far tree line
      ctx.fillStyle = "rgba(8,30,8,0.5)";
      for (let i = 0; i < 20; i++) {
        const tx = ((i * 140 - camX * 0.2 + 2800) % (VIEW_W + 200)) - 30;
        ctx.beginPath();
        ctx.moveTo(tx, GY - 20);
        ctx.lineTo(tx + 26, GY - 110);
        ctx.lineTo(tx + 52, GY - 20);
        ctx.closePath();
        ctx.fill();
      }
      // Near trees
      ctx.fillStyle = "#0d2a0d";
      for (let i = 0; i < 28; i++) {
        const tx = ((i * 110 - camX * 0.3 + 3080) % (VIEW_W + 150)) - 20;
        ctx.beginPath();
        ctx.moveTo(tx, GY - 30);
        ctx.lineTo(tx + 22, GY - 130);
        ctx.lineTo(tx + 44, GY - 30);
        ctx.closePath();
        ctx.fill();
      }
    } else if (mapId === "desert") {
      // Far dunes
      ctx.fillStyle = "rgba(42,30,8,0.4)";
      for (let i = 0; i < 8; i++) {
        const dx = ((i * 380 - camX * 0.15 + 3040) % (VIEW_W + 400)) - 100;
        ctx.beginPath();
        ctx.ellipse(dx + 190, VIEW_H - 30, 220, 60, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Near dunes
      ctx.fillStyle = "#2a1e08";
      for (let i = 0; i < 10; i++) {
        const dx = ((i * 300 - camX * 0.25 + 3000) % (VIEW_W + 300)) - 60;
        ctx.beginPath();
        ctx.ellipse(dx + 150, VIEW_H - 35, 180, 50, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Bunker - pipes and structures
      ctx.fillStyle = "rgba(26,26,26,0.5)";
      for (let i = 0; i < 4; i++) {
        const px = ((i * 320 - camX * 0.1 + 1280) % (VIEW_W + 320)) - 40;
        ctx.fillRect(px, 50, 22, VIEW_H - 50);
      }
      ctx.fillStyle = "#1a1a1a";
      for (let i = 0; i < 6; i++) {
        const px = ((i * 220 - camX * 0.15 + 1320) % (VIEW_W + 220)) - 20;
        ctx.fillRect(px, 60, 18, VIEW_H - 60);
      }
    }

    // ── Atmospheric pass (all maps) ──
    // Slow drifting fog banks plus a horizon bloom. Drawn behind the gameplay
    // layer, so it separates near silhouettes from the skyline without ever
    // washing out the fight.
    const drift = (Date.now() / 90) % VIEW_W;
    const fogTint =
      mapId === "jungle"
        ? "120, 190, 140"
        : mapId === "desert"
          ? "210, 170, 110"
          : mapId === "city"
            ? "130, 165, 220"
            : "170, 175, 185";
    for (let i = 0; i < 2; i++) {
      const fg = ctx.createLinearGradient(0, GY - 150, 0, GY + 10);
      fg.addColorStop(0, `rgba(${fogTint}, 0)`);
      fg.addColorStop(0.6, `rgba(${fogTint}, ${0.05 + i * 0.02})`);
      fg.addColorStop(1, `rgba(${fogTint}, ${0.1 + i * 0.04})`);
      ctx.fillStyle = fg;
      const bandY = GY - 160 + i * 40;
      ctx.fillRect(0, bandY, VIEW_W, 190 - i * 30);
    }
    // Horizon bloom — a wide, very soft light source behind the rooftops.
    const bloom = ctx.createRadialGradient(
      VIEW_W * 0.62 - camX * 0.04,
      GY - 60,
      20,
      VIEW_W * 0.62 - camX * 0.04,
      GY - 60,
      420,
    );
    bloom.addColorStop(0, `rgba(${fogTint}, 0.10)`);
    bloom.addColorStop(1, `rgba(${fogTint}, 0)`);
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Drifting smoke wisps (cheap, three soft strips).
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 3; i++) {
      const wx = ((i * 420 + drift * (i % 2 ? -1 : 1)) % (VIEW_W + 400)) - 200;
      ctx.fillStyle = `rgba(${fogTint}, 1)`;
      ctx.fillRect(wx, GY - 120 + i * 26, 340, 22 + i * 6);
    }
    ctx.globalAlpha = 1;
  }

  function drawMapDecorations(ctx, camX) {
    if (mapId === "city") {
      for (let i = 0; i < 10; i++) {
        const lx = i * 320 + 180;
        if (lx < camX - 60 || lx > camX + VIEW_W + 60) continue;
        ctx.fillStyle = "#444";
        ctx.fillRect(lx, GY - 80, 5, 80);
        ctx.fillStyle = "rgba(253,224,71,0.35)";
        ctx.fillRect(lx - 10, GY - 84, 25, 7);
        // Light glow
        ctx.fillStyle = "rgba(253,224,71,0.08)";
        ctx.beginPath();
        ctx.arc(lx + 2, GY - 80, 35, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (mapId === "desert") {
      for (let i = 0; i < 8; i++) {
        const rx = i * 380 + 120;
        if (rx < camX - 60 || rx > camX + VIEW_W + 60) continue;
        ctx.fillStyle = "#4a3a1a";
        ctx.fillRect(rx, GY - 25, 16, 25);
        ctx.fillRect(rx - 6, GY - 10, 28, 10);
      }
    } else if (mapId === "bunker") {
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1;
      for (
        let gx = Math.floor(camX / 40) * 40;
        gx < camX + VIEW_W + 40;
        gx += 40
      ) {
        ctx.beginPath();
        ctx.moveTo(gx, GY);
        ctx.lineTo(gx, GY + 20);
        ctx.stroke();
      }
    }
  }

  function drawHouse(ctx, me, s) {
    const h = HOUSE;
    let wallC = "#3a3a4a",
      roofC = "#2a2a3a",
      interiorC = "#1a1a2a";
    if (mapId === "jungle") {
      wallC = "#2a4a2a";
      roofC = "#1a3a1a";
      interiorC = "#0d1a0d";
    } else if (mapId === "desert") {
      wallC = "#5a4a20";
      roofC = "#4a3a14";
      interiorC = "#2a2010";
    } else if (mapId === "bunker") {
      wallC = "#2a2a2a";
      roofC = "#1a1a1a";
      interiorC = "#0a0a0a";
    }

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(h.x + 10, GY - 4, h.w, 8);
    ctx.fillStyle = wallC;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = roofC;
    ctx.beginPath();
    ctx.moveTo(h.x - 15, h.y);
    ctx.lineTo(h.x + h.w / 2, h.y - 45);
    ctx.lineTo(h.x + h.w + 15, h.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(132,204,22,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h.x - 15, h.y);
    ctx.lineTo(h.x + h.w + 15, h.y);
    ctx.stroke();
    ctx.fillStyle = me.inHouse ? "rgba(132,204,22,0.1)" : "rgba(0,0,0,0.8)";
    ctx.fillRect(DOOR.x, GY - 52, DOOR.w, 52);
    ctx.strokeStyle = "#84cc16";
    ctx.lineWidth = 2;
    ctx.strokeRect(DOOR.x, GY - 52, DOOR.w, 52);
    ctx.fillStyle = "#84cc16";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARMORY", h.x + h.w / 2, h.y - 52);
    ctx.textAlign = "left";
    for (const wx of [h.x + 18, h.x + h.w - 58]) {
      ctx.fillStyle = "rgba(253,224,71,0.1)";
      ctx.fillRect(wx, h.y + 28, 36, 28);
      ctx.strokeStyle = "rgba(132,204,22,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, h.y + 28, 36, 28);
      ctx.beginPath();
      ctx.moveTo(wx + 18, h.y + 28);
      ctx.lineTo(wx + 18, h.y + 56);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx, h.y + 42);
      ctx.lineTo(wx + 36, h.y + 42);
      ctx.stroke();
    }
    if (me.inHouse) {
      ctx.fillStyle = interiorC;
      ctx.fillRect(h.x + 2, h.y + 1, h.w - 4, h.h - 2);
      ctx.fillStyle = "#2a2a1a";
      ctx.fillRect(h.x + 16, h.y + 16, h.w - 32, 14);
      const aw = s.availHouseWeapons;
      if (aw.length > 0) {
        const slW = Math.min(48, (h.w - 36) / aw.length);
        for (let i = 0; i < aw.length; i++) {
          const wx2 = h.x + 18 + i * slW,
            isSel = i === s.houseWeaponIndex;
          ctx.fillStyle = isSel ? "#84cc16" : "#3a3a1a";
          ctx.fillRect(wx2, h.y + 14, slW - 3, 18);
          ctx.fillStyle = isSel ? "#000" : "#fde047";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(aw[i].icon, wx2 + slW / 2 - 1, h.y + 26);
          ctx.textAlign = "left";
        }
        const sel = aw[s.houseWeaponIndex];
        ctx.fillStyle = "#84cc16";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(sel.name, h.x + h.w / 2, h.y + 50);
        ctx.fillStyle = "#aaa";
        ctx.font = "8px monospace";
        ctx.fillText(
          `DMG:${sel.damage} RoF:${sel.fireRate} Mag:${sel.magazine}`,
          h.x + h.w / 2,
          h.y + 63,
        );
        ctx.fillText("[Q/F] Browse  [E] Equip", h.x + h.w / 2, h.y + 76);
        ctx.textAlign = "left";
      }
    }
    if (me.nearDoor) {
      ctx.fillStyle = "rgba(253,224,71,0.95)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `[E] ${me.inHouse ? "EXIT" : "ENTER"} ARMORY`,
        h.x + h.w / 2,
        GY - 58,
      );
      ctx.textAlign = "left";
    }
  }

  function drawBase(ctx, x, team) {
    const col = team === "blue" ? "#3b82f6" : "#ef4444";
    ctx.fillStyle = col + "22";
    ctx.fillRect(x - 60, GY - 70, 120, 70);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 60, GY - 70, 120, 70);
    // Flag pole at base
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 40, GY);
    ctx.lineTo(x - 40, GY - 50);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(team.toUpperCase() + " BASE", x, GY - 74);
    ctx.textAlign = "left";
  }

  // Underground atmosphere overlay (IMPROVEMENT_TODO #6).
  // Drawn in screen space when the camera is viewing the underground layer:
  // a darker radial vignette, warm flickering light sources near ladder/pit
  // openings, and drifting dust motes for depth.
  function drawUndergroundAtmosphere(ctx, me, s) {
    const camY = s.cameraY || 0;
    if (camY < 30) return; // only when underground view is active
    const t = Date.now() / 1000;
    // Darker radial vignette — edges nearly black, center slightly lit
    const grd = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.2,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.7,
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Warm flickering light sources near ladder/pit openings (screen space).
    // Project world x -> screen x using the camera, and the underground floor
    // -> screen y.
    const screenFloorY = UNDERGROUND_Y - (s.cameraY || 0);
    for (const lad of (WORLD.ladders || [])) {
      const sx = lad.x - s.cameraX;
      if (sx < -80 || sx > VIEW_W + 80) continue;
      const flicker = 0.7 + 0.3 * Math.sin(t * 9 + lad.x);
      const radius = 90 * flicker;
      const glow = ctx.createRadialGradient(sx, screenFloorY - 10, 4, sx, screenFloorY - 10, radius);
      glow.addColorStop(0, `rgba(255,200,110,${0.22 * flicker})`);
      glow.addColorStop(1, "rgba(255,200,110,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, screenFloorY - 10, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle drifting dust motes
    ctx.fillStyle = "rgba(180,170,150,0.25)";
    for (let i = 0; i < 18; i++) {
      const mx = (i * 137 + t * 12) % VIEW_W;
      const my = (i * 89 + t * 6) % VIEW_H;
      const drift = Math.sin(t * 0.8 + i) * 8;
      ctx.fillRect(mx + drift, my, 1.2, 1.2);
    }
  }

  function drawVignette(ctx, me) {
    // Standard vignette
    const grd = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.35,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.75,
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Low health red pulse
    if (me.hp < 30 && me.alive) {
      const s = stateRef.current;
      const pulse = 0.15 + 0.1 * Math.sin(s.lowHealthPulse);
      const rgrd = ctx.createRadialGradient(
        VIEW_W / 2,
        VIEW_H / 2,
        VIEW_H * 0.2,
        VIEW_W / 2,
        VIEW_H / 2,
        VIEW_H * 0.7,
      );
      rgrd.addColorStop(0, "rgba(239,68,68,0)");
      rgrd.addColorStop(1, `rgba(239,68,68,${pulse})`);
      ctx.fillStyle = rgrd;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawCrosshair(ctx, me, s) {
    if (me.inHouse || !me.alive || showTouchControls) return;
    const mx = s.mouse.x;
    const my = s.mouse.y;
    const w = weaponById(me.primaryWeaponId);
    if (!w) return;

    // Dynamic spread based on weapon spread + recoil
    let spread = w.spread * 100;
    spread += me.recoil * 40;
    const gap = 8 + spread;
    const len = 6;

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Top
    ctx.moveTo(mx, my - gap);
    ctx.lineTo(mx, my - gap - len);
    // Bottom
    ctx.moveTo(mx, my + gap);
    ctx.lineTo(mx, my + gap + len);
    // Left
    ctx.moveTo(mx - gap, my);
    ctx.lineTo(mx - gap - len, my);
    // Right
    ctx.moveTo(mx + gap, my);
    ctx.lineTo(mx + gap + len, my);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(mx, my, 1, 0, Math.PI * 2);
    ctx.fill();

    // Hit marker
    if (s.hitMarker > 0) {
      const ha = s.hitMarker / 12;
      ctx.strokeStyle = s.hitMarkerHeadshot
        ? `rgba(253,224,71,${ha})`
        : `rgba(255,255,255,${ha})`;
      ctx.lineWidth = 2;
      const hsz = 8;
      ctx.beginPath();
      ctx.moveTo(mx - hsz, my - hsz);
      ctx.lineTo(mx - hsz + 4, my - hsz + 4);
      ctx.moveTo(mx + hsz, my - hsz);
      ctx.lineTo(mx + hsz - 4, my - hsz + 4);
      ctx.moveTo(mx - hsz, my + hsz);
      ctx.lineTo(mx - hsz + 4, my + hsz - 4);
      ctx.moveTo(mx + hsz, my + hsz);
      ctx.lineTo(mx + hsz - 4, my + hsz - 4);
      ctx.stroke();
    }
  }

  function drawMinimap(ctx, s) {
    const mw = 160;
    const mh = 40;
    const mx = VIEW_W - mw - 10;
    const my = VIEW_H - mh - 10;
    const scale = mw / WORLD_W;
    const myTeam = s.players.find((p) => p.id === "me")?.team;

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = "rgba(132,204,22,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    // Camera viewport indicator
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + s.cameraX * scale, my, VIEW_W * scale, mh);

    // Flags
    for (const f of s.flags) {
      if (f.carrier) continue;
      ctx.fillStyle = f.team === "blue" ? "#3b82f6" : "#ef4444";
      ctx.beginPath();
      ctx.arc(mx + f.x * scale, my + mh / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players
    for (const p of s.players) {
      if (!p.alive || p.inHouse) continue;
      if (p.inBush && p.id !== "me") continue;
      // Underground players are drawn as hollow/dimmer dots with a "↓" marker
      // so you can tell who's on the lower layer (IMPROVEMENT_TODO #7).
      const px = mx + p.x * scale;
      const py = my + mh / 2;
      if (p.id === "me") {
        if (p.underground) {
          ctx.fillStyle = "rgba(253,224,71,0.5)";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Direction indicator
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + p.facing * 6, py);
        ctx.stroke();
      } else if (p.team === "blue") {
        ctx.fillStyle = p.underground ? "rgba(96,165,250,0.45)" : "#60a5fa";
        ctx.beginPath();
        ctx.arc(px, py, p.underground ? 1.6 : 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Only show enemies if not in bush
        if (!p.inBush) {
          ctx.fillStyle = p.underground ? "rgba(248,113,113,0.45)" : "#f87171";
          ctx.beginPath();
          ctx.arc(px, py, p.underground ? 1.6 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // "↓" marker for underground players
      if (p.underground && (p.id === "me" || p.team === myTeam || !p.inBush)) {
        ctx.fillStyle = "#a78bfa";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("\u2193", px, py - 5);
        ctx.textAlign = "left";
      }
    }
  }

  function drawKillFeed(ctx, feed) {
    if (feed.length === 0) return;
    const x = VIEW_W - 200;
    let y = 55;
    ctx.textAlign = "left";
    for (let i = feed.length - 1; i >= 0; i--) {
      const kf = feed[i];
      const alpha = Math.min(1, kf.life / 1000);
      ctx.globalAlpha = alpha;
      const kCol = kf.team === "blue" ? "#60a5fa" : "#f87171";
      // Background
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x - 5, y - 12, 195, 18);
      ctx.font = "10px monospace";
      ctx.fillStyle = kCol;
      ctx.fillText(kf.killer, x, y);
      const killerW = ctx.measureText(kf.killer).width;
      ctx.fillStyle = "#888";
      ctx.fillText(" ⚔ ", x + killerW, y);
      const midW = ctx.measureText(" ⚔ ").width;
      ctx.fillStyle = kf.team === "blue" ? "#f87171" : "#60a5fa";
      ctx.fillText(kf.victim, x + killerW + midW, y);
      const victimW = ctx.measureText(kf.victim).width;
      // Underground tag (IMPROVEMENT_TODO #17)
      if (kf.underground) {
        ctx.fillStyle = "#a78bfa";
        ctx.font = "9px monospace";
        ctx.fillText(" ↓", x + killerW + midW + victimW, y);
        ctx.font = "10px monospace";
      }
      y += 22;
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD(ctx, me, s) {
    // Score bar (top center) — gradient glass panel with team-coloured edges
    const scoreBar = ctx.createLinearGradient(0, 8, 0, 48);
    scoreBar.addColorStop(0, "rgba(22, 30, 14, 0.92)");
    scoreBar.addColorStop(0.5, "rgba(8, 12, 8, 0.82)");
    scoreBar.addColorStop(1, "rgba(20, 28, 12, 0.92)");
    ctx.fillStyle = scoreBar;
    ctx.fillRect(VIEW_W / 2 - 150, 8, 300, 40);
    // team-tinted inner edges
    const edgeL = ctx.createLinearGradient(
      VIEW_W / 2 - 150,
      0,
      VIEW_W / 2 - 30,
      0,
    );
    edgeL.addColorStop(0, "rgba(96,165,250,0.22)");
    edgeL.addColorStop(1, "rgba(96,165,250,0)");
    ctx.fillStyle = edgeL;
    ctx.fillRect(VIEW_W / 2 - 150, 8, 120, 40);
    const edgeR = ctx.createLinearGradient(
      VIEW_W / 2 + 30,
      0,
      VIEW_W / 2 + 150,
      0,
    );
    edgeR.addColorStop(0, "rgba(248,113,113,0)");
    edgeR.addColorStop(1, "rgba(248,113,113,0.22)");
    ctx.fillStyle = edgeR;
    ctx.fillRect(VIEW_W / 2 + 30, 8, 120, 40);
    // top highlight line + neon border
    ctx.fillStyle = "rgba(190, 242, 100, 0.35)";
    ctx.fillRect(VIEW_W / 2 - 150, 8, 300, 1);
    ctx.strokeStyle = "#84cc16";
    ctx.lineWidth = 1;
    ctx.shadowColor = "rgba(132, 204, 22, 0.5)";
    ctx.shadowBlur = 6;
    ctx.strokeRect(VIEW_W / 2 - 150, 8, 300, 40);
    ctx.shadowBlur = 0;
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("★ " + s.score.blue, VIEW_W / 2 - 70, 37);
    ctx.fillStyle = "#ddd";
    ctx.fillText("vs", VIEW_W / 2, 37);
    ctx.fillStyle = "#f87171";
    ctx.fillText("★ " + s.score.red, VIEW_W / 2 + 70, 37);
    // Round counter badge (top-left of the score bar)
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#84cc16";
    ctx.textAlign = "left";
    ctx.fillText(
      "ROUND " + (s.roundState.roundNumber || 1),
      VIEW_W / 2 - 146,
      18,
    );
    ctx.textAlign = "left";
    if (performance.now() < s.score.msgUntil) {
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s.score.msg, VIEW_W / 2, 68);
      ctx.textAlign = "left";
    }

    // Player info panel (top left) — glass panel, corner brackets, low-opacity
    // scanlines so it reads as a tactical HUD rather than a black rectangle.
    const panelG = ctx.createLinearGradient(8, 8, 183, 123);
    panelG.addColorStop(0, "rgba(12, 18, 10, 0.88)");
    panelG.addColorStop(1, "rgba(4, 8, 6, 0.72)");
    ctx.fillStyle = panelG;
    ctx.fillRect(8, 8, 175, 115);
    ctx.fillStyle = "rgba(132,204,22,0.04)";
    for (let sy = 14; sy < 120; sy += 4) ctx.fillRect(8, sy, 175, 1);
    ctx.strokeStyle = "rgba(132,204,22,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 175, 115);
    ctx.strokeStyle = "rgba(190,242,100,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 26);
    ctx.lineTo(8, 8);
    ctx.lineTo(26, 8);
    ctx.moveTo(183, 105);
    ctx.lineTo(183, 123);
    ctx.lineTo(165, 123);
    ctx.stroke();
    ctx.fillStyle = "#84cc16";
    ctx.font = "bold 11px monospace";
    ctx.fillText(profileRef.current.name, 14, 26);
    ctx.fillStyle = me.hp > 50 ? "#86efac" : me.hp > 25 ? "#fde68a" : "#fca5a5";
    ctx.fillText("HP: " + Math.ceil(me.hp) + "/100", 14, 44);
    // Health bar: recessed track, gradient fill, segment ticks, hot leading edge
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(14, 48, 155, 6);
    const hpGrad = ctx.createLinearGradient(14, 0, 169, 0);
    const hpColor =
      me.hp > 50 ? ["#34d399", "#86efac"] : me.hp > 25 ? ["#d97706", "#fde68a"] : ["#dc2626", "#fca5a5"];
    hpGrad.addColorStop(0, hpColor[0]);
    hpGrad.addColorStop(1, hpColor[1]);
    ctx.fillStyle = hpGrad;
    ctx.fillRect(14, 48, (155 * Math.max(0, me.hp)) / 100, 6);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(14, 48, (155 * Math.max(0, me.hp)) / 100, 1.5);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    for (let seg = 1; seg < 10; seg++) ctx.fillRect(14 + seg * 15.5, 48, 1, 6);
    if (me.hp > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(14 + (155 * Math.min(100, me.hp)) / 100 - 1, 48, 1, 6);
    }
    ctx.fillStyle = "#ddd";
    ctx.font = "10px monospace";
    const w = weaponById(me.primaryWeaponId);
    ctx.fillText(
      me.slot === 0
        ? `[1] ${w?.name.slice(0, 13) ?? "GUN"}`
        : me.slot === 1
          ? "[2] KNIFE"
          : "[3] GRENADE",
      14,
      66,
    );
    if (me.slot === 0) {
      const ammoColor = me.reloading
        ? "#fca5a5"
        : me.ammo <= w?.magazine * 0.25
          ? "#fde047"
          : "#ddd";
      ctx.fillStyle = ammoColor;
      ctx.fillText(
        me.reloading ? "RELOADING..." : `AMMO: ${me.ammo}/${w?.magazine ?? 30}`,
        14,
        80,
      );
    }
    if (me.grenadeCount > 0) {
      ctx.fillStyle = "#fde047";
      ctx.fillText(`GRENADES: ${me.grenadeCount}`, 14, me.slot === 0 ? 94 : 80);
    }
    // Weapon-swap progress indicator (gun-change animation feedback).
    if (me.weaponSwapTimer > 0) {
      const swapT = 1 - me.weaponSwapTimer / me.weaponSwapDur;
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 9px monospace";
      ctx.fillText("SWAPPING...", 14, me.slot === 0 ? 108 : 94);
      // progress bar
      ctx.fillStyle = "rgba(253,224,71,0.25)";
      ctx.fillRect(14, me.slot === 0 ? 112 : 98, 70, 3);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(14, me.slot === 0 ? 112 : 98, 70 * swapT, 3);
    }
    ctx.fillStyle = "#aaa";
    ctx.fillText(`K:${me.kills}  D:${me.deaths}`, 14, 122);

    // Status indicators (bottom center)
    if (me.inBush) {
      ctx.fillStyle = "rgba(34,100,34,0.85)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🌿 HIDDEN IN BUSH", VIEW_W / 2, VIEW_H - 68);
      ctx.textAlign = "left";
    }
    if (me.lootWeaponId) {
      ctx.fillStyle = "rgba(253,224,71,0.75)";
      ctx.fillRect(VIEW_W / 2 - 90, VIEW_H - 52, 180, 22);
      ctx.fillStyle = "#000";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "LOOT: " + (weaponById(me.lootWeaponId)?.name ?? "?"),
        VIEW_W / 2,
        VIEW_H - 36,
      );
      ctx.textAlign = "left";
    }
    if (me.nearDoor && !me.inHouse) {
      ctx.fillStyle = "rgba(253,224,71,0.9)";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("[E] ENTER ARMORY", VIEW_W / 2, VIEW_H - 68);
      ctx.textAlign = "left";
    }
    if (me.inHouse) {
      ctx.fillStyle = "rgba(132,204,22,0.9)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "INSIDE ARMORY  •  Go near door + [E] to exit",
        VIEW_W / 2,
        VIEW_H - 50,
      );
      ctx.textAlign = "left";
    }

    // Flag carrier indicator
    if (me.hasFlag) {
      ctx.fillStyle = "rgba(253,224,71,0.9)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      const baseDir = me.team === "blue" ? "◄ RETURN TO BASE" : "RETURN TO BASE ►";
      ctx.fillText("⚑ CARRYING FLAG — " + baseDir, VIEW_W / 2, VIEW_H - 90);
      ctx.textAlign = "left";
    }

    // Controls hint
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "8px monospace";
    ctx.fillText(
      "[WASD] Move  [Click] Fire  [1/2/3] Slots  [G] Grenade  [R] Reload  [E] Interact  [Tab] Scoreboard",
      8,
      VIEW_H - 8,
    );

    // Death / respawn screen
    if (!me.alive) {
      ctx.fillStyle = "rgba(239,68,68,0.75)";
      ctx.font = "bold 30px monospace";
      ctx.textAlign = "center";
      ctx.fillText("KILLED IN ACTION", VIEW_W / 2, VIEW_H / 2 - 22);
      ctx.fillStyle = "#ddd";
      ctx.font = "13px monospace";
      ctx.fillText(
        "Respawning... Loot lost, returning to loadout.",
        VIEW_W / 2,
        VIEW_H / 2 + 12,
      );
      // Respawn timer
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 18px monospace";
      ctx.fillText(
        `${Math.ceil(me.respawnTimer / 60)}s`,
        VIEW_W / 2,
        VIEW_H / 2 + 40,
      );
      ctx.textAlign = "left";
    }

    // Ammo low warning
    if (me.alive && me.slot === 0 && !me.reloading) {
      const w2 = weaponById(me.primaryWeaponId);
      if (w2 && me.ammo <= Math.ceil(w2.magazine * 0.2) && me.ammo > 0) {
        ctx.fillStyle = "rgba(253,224,71,0.6)";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚠ LOW AMMO — PRESS R", VIEW_W / 2, VIEW_H - 110);
        ctx.textAlign = "left";
      }
    }
  
    // One-time underground tutorial hint (IMPROVEMENT_TODO #11).
    try {
      const HINT_KEY = "com_underground_hint_seen";
      if (!localStorage.getItem(HINT_KEY)) {
        if (s._hintStart === undefined) s._hintStart = performance.now();
        const elapsed = performance.now() - s._hintStart;
        if (elapsed < 9000) {
          const alpha = elapsed < 7000 ? 0.9 : 0.9 * (1 - (elapsed - 7000) / 2000);
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.fillStyle = "rgba(10,12,5,0.92)";
          ctx.fillRect(VIEW_W / 2 - 230, 56, 460, 54);
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(VIEW_W / 2 - 230, 56, 460, 54);
          ctx.fillStyle = "#a78bfa";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText("\u2191 UNDERGROUND BATTLEFIELD \u2014 NEW MECHANICS \u2193", VIEW_W / 2, 74);
          ctx.fillStyle = "#cbb6ff";
          ctx.font = "10px monospace";
          ctx.fillText("Ladders: W/\u2191 climb up  \u2022  S/\u2193 climb down", VIEW_W / 2, 89);
          ctx.fillText("Walk over manholes/pits to drop into the underground layer", VIEW_W / 2, 102);
          ctx.textAlign = "left";
          ctx.globalAlpha = 1;
        } else {
          localStorage.setItem(HINT_KEY, "1");
        }
      }
    } catch (_) {}
}

  // ──── Scoreboard (hold Tab) ────
  function drawScoreboard(ctx, s) {
    // Dim background
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const panelW = 560;
    const panelH = 360;
    const px = (VIEW_W - panelW) / 2;
    const py = (VIEW_H - panelH) / 2;

    // Panel background
    ctx.fillStyle = "rgba(12,16,12,0.95)";
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = "rgba(132,204,22,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    // Title
    ctx.fillStyle = "#84cc16";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TACTICAL SCOREBOARD", VIEW_W / 2, py + 28);
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("Hold [TAB] to view", VIEW_W / 2, py + 44);

    // Score summary
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("★ " + s.score.blue, px + 100, py + 80);
    ctx.fillStyle = "#ddd";
    ctx.font = "bold 14px monospace";
    ctx.fillText("vs", VIEW_W / 2, py + 78);
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#f87171";
    ctx.fillText("★ " + s.score.red, px + panelW - 100, py + 80);

    // Match time
    const elapsed = Math.floor((performance.now() - s.matchStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText(
      `MATCH TIME ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      VIEW_W / 2,
      py + 98,
    );

    // Column headers
    const colX = { name: px + 30, k: px + 340, d: px + 400, hp: px + 460, status: px + 510 };
    ctx.fillStyle = "rgba(132,204,22,0.6)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("OPERATOR", colX.name, py + 120);
    ctx.fillText("KILLS", colX.k, py + 120);
    ctx.fillText("DEATHS", colX.d, py + 120);
    ctx.fillText("HP", colX.hp, py + 120);
    ctx.fillText("STATUS", colX.status, py + 120);

    // Separator line
    ctx.strokeStyle = "rgba(132,204,22,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 20, py + 126);
    ctx.lineTo(px + panelW - 20, py + 126);
    ctx.stroke();

    // Blue team
    const bluePlayers = s.players.filter((p) => p.team === "blue");
    const redPlayers = s.players.filter((p) => p.team === "red");

    let rowY = py + 142;
    ctx.font = "11px monospace";

    // Blue team label
    ctx.fillStyle = "#60a5fa";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("BLUE TEAM", px + 20, rowY);
    rowY += 16;

    ctx.font = "11px monospace";
    for (const p of bluePlayers) {
      const isMe = p.id === "me";
      ctx.fillStyle = isMe ? "#fde047" : "#cbd5e1";
      const displayName = p.name.slice(0, 16) + (isMe ? " (YOU)" : "");
      ctx.fillText(displayName, colX.name, rowY);
      ctx.fillStyle = "#86efac";
      ctx.fillText(String(p.kills || 0), colX.k, rowY);
      ctx.fillStyle = "#fca5a5";
      ctx.fillText(String(p.deaths || 0), colX.d, rowY);
      ctx.fillStyle = p.alive ? "#86efac" : "#666";
      const hpText = p.alive ? Math.ceil(p.hp) + "/100" : "DEAD";
      ctx.fillText(hpText, colX.hp, rowY);
      ctx.fillStyle = p.alive ? "#86efac" : "#ef4444";
      ctx.fillText(p.alive ? "ACTIVE" : "RESPAWN", colX.status, rowY);
      rowY += 16;
    }

    rowY += 8;

    // Red team label
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("RED TEAM", px + 20, rowY);
    rowY += 16;

    ctx.font = "11px monospace";
    for (const p of redPlayers) {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(p.name.slice(0, 16), colX.name, rowY);
      ctx.fillStyle = "#86efac";
      ctx.fillText(String(p.kills || 0), colX.k, rowY);
      ctx.fillStyle = "#fca5a5";
      ctx.fillText(String(p.deaths || 0), colX.d, rowY);
      ctx.fillStyle = p.alive ? "#86efac" : "#666";
      const hpText = p.alive ? Math.ceil(p.hp) + "/100" : "DEAD";
      ctx.fillText(hpText, colX.hp, rowY);
      ctx.fillStyle = p.alive ? "#86efac" : "#ef4444";
      ctx.fillText(p.alive ? "ACTIVE" : "RESPAWN", colX.status, rowY);
      rowY += 16;
    }

    ctx.textAlign = "left";
  }

  // ──── Event setup ────
  useEffect(() => {
    init();
    lastTimeRef.current = 0;
    const canvas = canvasRef.current;

    const onKeyDown = (e) => {
      ensureAudioUnlocked();
      const s = stateRef.current;
      if (!s) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setPaused((v) => !v);
        return;
      }
      if (s.keys) s.keys.add(e.key.toLowerCase());
      if (e.key === "Tab") {
        e.preventDefault();
        s.showScoreboard = true;
        return;
      }
      const me = s.players.find((p) => p.id === "me");
      if (!me || !me.alive) return;
      if (e.key === "1" && me.slot !== 0) { me.slot = 0; triggerWeaponSwap(me); }
      if (e.key === "2" && me.meleeWeaponId && me.slot !== 1) { me.slot = 1; triggerWeaponSwap(me); }
      if (e.key === "3" && me.grenadeCount > 0 && me.slot !== 2) { me.slot = 2; triggerWeaponSwap(me); }
      if (e.key.toLowerCase() === "e") performInteract(me, s);
      if (e.key.toLowerCase() === "q" && me.inHouse)
        s.houseWeaponIndex =
          (s.houseWeaponIndex - 1 + s.availHouseWeapons.length) %
          s.availHouseWeapons.length;
      if (e.key.toLowerCase() === "f" && me.inHouse)
        s.houseWeaponIndex =
          (s.houseWeaponIndex + 1) % s.availHouseWeapons.length;
      if (e.key.toLowerCase() === "g" && me.grenadeCount > 0 && !me.inHouse)
        throwGrenade(me, s);
      if (e.key.toLowerCase() === "r" && me.slot === 0 && !me.inHouse)
        startReload(me);
    };
    const onKeyUp = (e) => {
      const s = stateRef.current;
      if (!s) return;
      s.keys.delete(e.key.toLowerCase());
      if (e.key === "Tab") s.showScoreboard = false;
    };
    const onMouseMove = (e) => {
      const s = stateRef.current;
      if (!s) return;
      const rect = canvas.getBoundingClientRect();
      s.mouse.x = (e.clientX - rect.left) * (VIEW_W / rect.width);
      s.mouse.y = (e.clientY - rect.top) * (VIEW_H / rect.height);
    };
    const onMouseDown = (e) => {
      ensureAudioUnlocked();
      const s = stateRef.current;
      if (!s) return;
      s.mouse.down = true;
      if (e.button === 0) {
        const me = s.players.find((p) => p.id === "me");
        if (me && me.alive && !me.inHouse) fire(me, s);
      }
    };
    const onMouseUp = () => {
      if (stateRef.current) stateRef.current.mouse.down = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);

    rafRef.current = requestAnimationFrame(function loop() {
      update();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      setPressedControls({});
    };
  }, []);

  useEffect(() => {
    const session = networkSession;
    const channel = session?.channel;
    if (!channel || !session.userId) return undefined;

    const reportFailure = () => {
      if (networkFailureReportedRef.current) return;
      networkFailureReportedRef.current = true;
      onNetworkError?.({
        message: "Realtime connection interrupted; match state may be delayed.",
        type: "error",
      });
    };
    const handleInput = ({ payload }) => {
      if (session.role !== "host" || !payload?.userId || !payload.input) {
        return;
      }
      const player = stateRef.current?.players.find(
        (candidate) =>
          candidate.id === payload.userId && !candidate.isAI,
      );
      if (!player) return;

      const input = payload.input;
      const allowedKeys = new Set([
        "a",
        "d",
        "arrowleft",
        "arrowright",
        "s",
        "arrowdown",
        "w",
        "arrowup",
        " ",
        "1",
        "2",
        "3",
        "r",
        "e",
        "g",
      ]);
      const moveX = Number(input.mobile?.moveX);
      remoteInputsRef.current.set(payload.userId, {
        keys: Array.isArray(input.keys)
          ? input.keys.slice(0, 20).filter((key) => allowedKeys.has(key))
          : [],
        mobile: {
          left: Boolean(input.mobile?.left),
          right: Boolean(input.mobile?.right),
          down: Boolean(input.mobile?.down),
          jump: Boolean(input.mobile?.jump),
          fire: Boolean(input.mobile?.fire),
          moveX: Number.isFinite(moveX)
            ? Math.max(-1, Math.min(1, moveX))
            : 0,
        },
        aimAngle: Number.isFinite(input.aimAngle)
          ? Math.max(-Math.PI, Math.min(Math.PI, input.aimAngle))
          : player.aimAngle,
        fire: Boolean(input.fire),
        reload: Boolean(input.reload),
        interact: Boolean(input.interact),
        grenade: Boolean(input.grenade),
        slot:
          Number.isInteger(input.slot) && input.slot >= 0 && input.slot <= 2
            ? input.slot
            : player.slot,
      });
    };
    const handleState = ({ payload }) => {
      if (session.role !== "guest" || !payload?.state) return;
      // Marks the host as alive so the watchdog below can detect a dead room.
      lastNetworkStateRef.current = performance.now();
      const current = stateRef.current;
      if (!current) return;

      const localControls = {
        keys: current.keys,
        mouse: current.mouse,
        mobile: current.mobile,
        cameraX: current.cameraX,
        showScoreboard: current.showScoreboard,
        inHouse: current.inHouse,
      };
      const normalizeId = (id) => {
        if (id === session.userId) return "me";
        if (id === "me" && session.hostUserId !== session.userId) {
          return session.hostUserId;
        }
        return id;
      };
      const snapshot = payload.state;
      const previousPlayers = new Map(
        current.players.map((player) => [player.id, player]),
      );
      const players = snapshot.players.map((player) => {
        const id = normalizeId(player.id);
        const previous = previousPlayers.get(id);
        networkTargetsRef.current.set(id, { x: player.x, y: player.y });
        if (!previous) return { ...player, id };

        const localPrediction =
          id === "me"
            ? {
                vx: previous.vx,
                vy: previous.vy,
                onGround: previous.onGround,
                facing: previous.facing,
                aimAngle: previous.aimAngle,
                inHouse: previous.inHouse,
                onLadder: previous.onLadder,
                climbing: previous.climbing,
                underground: previous.underground,
                fallingIntoPit: previous.fallingIntoPit,
              }
            : {};
        return {
          ...player,
          id,
          x: previous.x,
          y: previous.y,
          ...localPrediction,
        };
      });
      const bullets = snapshot.bullets.map((bullet) => ({
        ...bullet,
        ownerId: normalizeId(bullet.ownerId),
      }));
      const flags = snapshot.flags.map((flag) => ({
        ...flag,
        carrier: flag.carrier ? normalizeId(flag.carrier) : null,
      }));
      Object.assign(current, snapshot, {
        players,
        bullets,
        flags,
        ...localControls,
      });
      if (snapshot.over) {
        const me = players.find((player) => player.id === "me");
        if (me && !networkResultRecordedRef.current) {
          const winnerTeam =
            snapshot.winnerTeam ||
            (snapshot.score.blue >= 5 ? "blue" : "red");
          const won = winnerTeam === me.team;
          const record = {
            id: Date.now().toString(),
            date: Date.now(),
            mode,
            mapId,
            result: won ? "victory" : "defeat",
            stars: snapshot.score[me.team],
            enemyStars: snapshot.score[me.team === "blue" ? "red" : "blue"],
            kills: me.kills,
            deaths: me.deaths,
            weaponId: me.primaryWeaponId,
            coinsEarned: (won ? 350 : 80) + me.kills * 25,
          };
          networkResultRecordedRef.current = true;
          const newProfile = addMatch(profileRef.current, record);
          onMatchEndRef.current?.(record);
          setTimeout(() => {
            onProfileChange(newProfile);
            setOver({ result: record.result, record });
          }, 500);
        }
      }
    };
    const handleLeave = ({ payload }) => {
      if (session.role !== "host" || !payload?.userId) return;
      remoteInputsRef.current.delete(payload.userId);
      const player = stateRef.current?.players.find(
        (candidate) => candidate.id === payload.userId,
      );
      if (player) {
        player.isAI = true;
        player.networkInput = null;
      }
    };
    const handleSurrender = ({ payload }) => {
      if (session.role !== "host" || !payload?.userId) return;
      const current = stateRef.current;
      const surrenderingPlayer = current?.players.find(
        (player) => player.id === payload.userId,
      );
      if (!current || !surrenderingPlayer) return;
      finishMatch(
        current,
        surrenderingPlayer.team === "blue" ? "red" : "blue",
      );
    };

    // @supabase/realtime-js 2.119 removed RealtimeChannel.off(), so listeners
    // cannot be detached one by one any more. The channel itself is unsubscribed
    // and removed by useOnlineMatch when the room closes, so register each
    // handler only once per channel/role to stop re-runs stacking duplicates.
    const attachedNetworkHandlers = attachedNetworkHandlersRef.current;
    if (attachedNetworkHandlers.get(channel) !== session.role) {
      attachedNetworkHandlers.set(channel, session.role);
      channel.on("broadcast", { event: "input" }, handleInput);
      channel.on("broadcast", { event: "state" }, handleState);
      channel.on("broadcast", { event: "leave" }, handleLeave);
      channel.on("broadcast", { event: "surrender" }, handleSurrender);
    }

    // Guests depend on the host for every frame of state. If the host leaves
    // without announcing it (closed tab, lost connection) the guest would be
    // stuck on a dead, black match screen forever, so bail out to the lobby.
    const sessionStartedAt = performance.now();
    const hostWatchdog = window.setInterval(() => {
      if (session.role !== "guest") return;
      if (stateRef.current?.over) return;
      const lastSeen = lastNetworkStateRef.current || sessionStartedAt;
      if (performance.now() - lastSeen < 8000) return;
      lastNetworkStateRef.current = 0;
      onConnectionLostRef.current?.();
    }, 1000);

    const interval = window.setInterval(() => {
      const current = stateRef.current;
      if (!current) return;

      if (session.role === "host") {
        const encodePlayerId = (id) =>
          id === "me" ? session.userId : id;
        const state = {
          players: current.players.map(({ networkInput, ...player }) => ({
            ...player,
            id: encodePlayerId(player.id),
          })),
          bullets: current.bullets.map((bullet) => ({
            ...bullet,
            ownerId: encodePlayerId(bullet.ownerId),
          })),
          loot: current.loot,
          explosions: current.explosions,
          healthKits: current.healthKits,
          flags: current.flags.map((flag) => ({
            ...flag,
            carrier: flag.carrier
              ? encodePlayerId(flag.carrier)
              : null,
          })),
          score: current.score,
          over: current.over,
          winnerTeam: current.winnerTeam,
          houseWeaponIndex: current.houseWeaponIndex,
          matchStartTime: current.matchStartTime,
          damageNumbers: current.damageNumbers,
          killFeed: current.killFeed,
          shake: current.shake,
          hitMarker: current.hitMarker,
          hitMarkerHeadshot: current.hitMarkerHeadshot,
          lowHealthPulse: current.lowHealthPulse,
          matchTimer: current.matchTimer,
          roundState: current.roundState,
        };
        void channel
          .send({
            type: "broadcast",
            event: "state",
            payload: { state },
          })
          .then((status) => {
            if (status === "ok") networkFailureReportedRef.current = false;
          })
          .catch(reportFailure);
        return;
      }

      const me = current.players.find((player) => player.id === "me");
      if (!me) return;
      const keys = Array.from(current.keys || []);
      const input = {
        keys,
        mobile: { ...current.mobile },
        aimAngle: me.aimAngle,
        slot: me.slot,
        fire: Boolean(current.mouse.down || current.mobile.fire),
        reload:
          keys.includes("r") ||
          pendingNetworkActionsRef.current.has("reload"),
        interact:
          keys.includes("e") ||
          pendingNetworkActionsRef.current.has("interact"),
        grenade:
          keys.includes("g") ||
          pendingNetworkActionsRef.current.has("grenade"),
      };
      pendingNetworkActionsRef.current.clear();
      void channel
        .send({
          type: "broadcast",
          event: "input",
          payload: { userId: session.userId, input },
        })
        .then((status) => {
          if (status !== "ok") reportFailure();
          else networkFailureReportedRef.current = false;
        })
        .catch(reportFailure);
    }, session.role === "host" ? 100 : 50);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(hostWatchdog);
      remoteInputsRef.current.clear();
      networkTargetsRef.current.clear();
    };
  }, [
    networkSession?.channel,
    networkSession?.role,
    networkSession?.userId,
    mapId,
    mode,
    onNetworkError,
  ]);

  const runPlayerAction = useCallback((action) => {
    const s = stateRef.current;
    if (!s) return;
    const me = s.players.find((p) => p.id === "me");
    if (!me || !me.alive) return;
    action(me, s);
  }, []);

  const holdControl = useCallback(
    (key, pressed) => {
      ensureAudioUnlocked();
      void requestImmersiveMode();
      setMobilePressed(key, pressed);
    },
    [ensureAudioUnlocked, requestImmersiveMode, setMobilePressed],
  );

  // Stick maths works off a plain rect so the same code serves the on-screen
  // widget and the pointer router below.
  const stickDrag = (rect, clientX, clientY) => {
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2 - 20);
    let x = clientX - (rect.left + rect.width / 2);
    let y = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > radius) {
      x = (x / distance) * radius;
      y = (y / distance) * radius;
    }
    return { x, y, radius };
  };

  const updateMoveStick = useCallback((rect, clientX, clientY) => {
    const { x, y, radius } = stickDrag(rect, clientX, clientY);
    const moveX = x / radius;
    const s = stateRef.current;
    if (s) s.mobile.moveX = moveX;
    setMoveStick({ x, y, active: true });
  }, []);

  const releaseMoveStick = useCallback(() => {
    const s = stateRef.current;
    if (s) s.mobile.moveX = 0;
    setMoveStick({ x: 0, y: 0, active: false });
  }, []);

  const updateAimStick = useCallback((rect, clientX, clientY) => {
    const { x, y, radius } = stickDrag(rect, clientX, clientY);
    const aimX = x / radius;
    const aimY = y / radius;
    const active = Math.hypot(aimX, aimY) > 0.18;
    const s = stateRef.current;
    if (s) {
      s.mobile.aimX = aimX;
      s.mobile.aimY = aimY;
      s.mobile.fire = active;
    }
    setAimStick({ x, y, active: true });
  }, []);

  const releaseAimStick = useCallback(() => {
    const s = stateRef.current;
    if (s) {
      s.mobile.aimX = 0;
      s.mobile.aimY = 0;
      s.mobile.fire = false;
    }
    setAimStick({ x: 0, y: 0, active: false });
  }, []);

  // Briefly light up a tapped button so single-press controls (swap, reload,
  // grenade, use) confirm the touch the same way the held ones do.
  const flashControl = useCallback((id) => {
    setPressedControls((previous) => ({ ...previous, [id]: true }));
    window.setTimeout(() => {
      setPressedControls((previous) => ({ ...previous, [id]: false }));
    }, 130);
  }, []);

  const tapAction = useCallback(
    (action) => {
      ensureAudioUnlocked();
      void requestImmersiveMode();
      flashControl(action === "interact" ? "use" : action);
      if (networkSessionRef.current?.role === "guest") {
        pendingNetworkActionsRef.current.add(action);
      }
      runPlayerAction((me, s) => {
        if (action === "reload" && me.slot === 0 && !me.inHouse)
          startReload(me);
        if (action === "grenade" && me.grenadeCount > 0 && !me.inHouse)
          throwGrenade(me, s);
        if (action === "interact") performInteract(me, s);
        if (action === "swap") cycleWeaponSlot(me);
      });
    },
    [ensureAudioUnlocked, requestImmersiveMode, runPlayerAction, flashControl],
  );

  // ── Touch pointer router ───────────────────────────────────────────────
  // Every control is driven from one window-level listener set instead of
  // per-element handlers. Element handlers stop receiving a pointer once
  // another finger is already down on a captured element or the browser turns
  // the touches into a gesture, which is why a third simultaneous button (e.g.
  // jump while moving and firing) never registered. Routing all pointers here
  // and hit-testing the widgets by rect keeps any number of fingers working.
  const touchLayerRef = useRef(null);

  useEffect(() => {
    if (!showTouchControls) return undefined;
    const layer = touchLayerRef.current;
    if (!layer) return undefined;

    const IDS = [
      "move",
      "aim",
      "jump",
      "down",
      "swap",
      "reload",
      "grenade",
      "use",
    ];
    const HIT_SLOP = 14; // extra grace around each widget for thumb accuracy
    const held = new Map(); // pointerId -> { id, rect }

    const rectFor = (id) => {
      const element = layer.querySelector(`[data-control-id="${id}"]`);
      return element ? element.getBoundingClientRect() : null;
    };

    const hitTest = (x, y) => {
      let best = null;
      let bestDistance = Infinity;
      for (const id of IDS) {
        const rect = rectFor(id);
        if (!rect || !rect.width || !rect.height) continue;
        if (
          x < rect.left - HIT_SLOP ||
          x > rect.right + HIT_SLOP ||
          y < rect.top - HIT_SLOP ||
          y > rect.bottom + HIT_SLOP
        ) {
          continue;
        }
        const distance = Math.hypot(
          x - (rect.left + rect.width / 2),
          y - (rect.top + rect.height / 2),
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { id, rect };
        }
      }
      return best;
    };

    const press = (id, rect, x, y) => {
      if (id === "move") updateMoveStick(rect, x, y);
      else if (id === "aim") updateAimStick(rect, x, y);
      else if (id === "jump" || id === "down") holdControl(id, true);
      else if (id === "swap") tapAction("swap");
      else if (id === "reload") tapAction("reload");
      else if (id === "grenade") tapAction("grenade");
      else if (id === "use") tapAction("interact");
    };

    const release = (id) => {
      if (id === "move") releaseMoveStick();
      else if (id === "aim") releaseAimStick();
      else if (id === "jump" || id === "down") holdControl(id, false);
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (pausedRef.current) return;
      // Let real UI buttons (pause/exit/overlays) keep their own clicks.
      const target = event.target;
      if (target instanceof Element) {
        const uiButton = target.closest(
          "button:not(.touch-button):not(.touch-stick)",
        );
        if (uiButton && !layer.contains(uiButton)) return;
      }
      const hit = hitTest(event.clientX, event.clientY);
      if (!hit) return;
      event.preventDefault();
      ensureAudioUnlocked();
      void requestImmersiveMode();
      held.set(event.pointerId, { id: hit.id, rect: hit.rect });
      press(hit.id, hit.rect, event.clientX, event.clientY);
    };

    const onPointerMove = (event) => {
      const entry = held.get(event.pointerId);
      if (!entry) return;
      if (entry.id === "move") {
        event.preventDefault();
        updateMoveStick(entry.rect, event.clientX, event.clientY);
      } else if (entry.id === "aim") {
        event.preventDefault();
        updateAimStick(entry.rect, event.clientX, event.clientY);
      }
    };

    const onPointerRelease = (event) => {
      const entry = held.get(event.pointerId);
      if (!entry) return;
      held.delete(event.pointerId);
      release(entry.id);
    };

    const releaseAll = () => {
      for (const entry of held.values()) release(entry.id);
      held.clear();
    };

    // A long press on a control would otherwise open the native text-selection
    // / copy callout on top of the match.
    const onContextMenu = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".game-stage")) {
        event.preventDefault();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerRelease);
    window.addEventListener("pointercancel", onPointerRelease);
    window.addEventListener("blur", releaseAll);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerRelease);
      window.removeEventListener("pointercancel", onPointerRelease);
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("contextmenu", onContextMenu);
      releaseAll();
    };
  }, [
    showTouchControls,
    updateMoveStick,
    updateAimStick,
    releaseMoveStick,
    releaseAimStick,
    holdControl,
    tapAction,
    ensureAudioUnlocked,
    requestImmersiveMode,
  ]);

  // Each control can carry its own size on top of the global scale.
  const controlScale = (id) => getTouchControlScale(touchLayout, id);

  const touchControlStyle = (id) => {
    const position = touchLayout.positions[id] || { x: 0, y: 0 };
    const controlPosition = getTouchControlPosition(id, position);
    return {
      left: `${controlPosition.x * 100}%`,
      top: `${controlPosition.y * 100}%`,
      "--touch-control-scale": String(controlScale(id)),
    };
  };

  return (
    <div className="game-frame">
      <div
        className="game-toolbar flex items-center justify-end gap-2 px-3 py-2 text-xs"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => void requestImmersiveMode(true)}
            className="game-toolbar-button game-toolbar-button--primary"
          >
            {isFullscreen ? "Arena" : "Fullscreen"}
          </button>
          <button
            onClick={() => setPaused((v) => !v)}
            className="game-toolbar-button"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={onExit} className="game-toolbar-button">
            Exit
          </button>
        </div>
      </div>
      <div className="game-stage">
        <canvas
          ref={canvasRef}
          width={VIEW_W * RENDER_SCALE}
          height={VIEW_H * RENDER_SCALE}
          className="scanline game-canvas"
          style={{ cursor: showTouchControls ? "default" : "crosshair" }}
        />

        {showTouchControls && (
          <div className="touch-controls" ref={touchLayerRef}>
            <div className="touch-controls__cluster">
              <button
                type="button"
                data-control-id="move"
                aria-label="Movement joystick"
                className={`touch-stick touch-stick--move ${moveStick.active ? "is-active" : ""}`}
                style={touchControlStyle("move")}
              >
                <span className="touch-stick__label">
                  <Move size={13} strokeWidth={3} />
                </span>
                <span
                  className="touch-stick__thumb"
                  style={{
                    transform: `translate(${moveStick.x / controlScale("move")}px, ${moveStick.y / controlScale("move")}px)`,
                  }}
                />
              </button>
              <div className="touch-controls__stack">
                <button
                  type="button"
                  data-control-id="jump"
                  aria-label="Jump"
                  className={`touch-button touch-button--wide ${pressedControls.jump ? "is-active" : ""}`}
                  style={touchControlStyle("jump")}
                >
                  <ArrowUp size={22} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  data-control-id="down"
                  aria-label="Drop down or climb down"
                  className={`touch-button touch-button--wide ${pressedControls.down ? "is-active" : ""}`}
                  style={touchControlStyle("down")}
                >
                  <ArrowDown size={22} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  data-control-id="swap"
                  aria-label="Swap weapon"
                  className={`touch-button touch-button--wide ${pressedControls.swap ? "is-active" : ""}`}
                  style={touchControlStyle("swap")}
                >
                  <SwapIcon size={21} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            <div className="touch-controls__cluster">
              <div className="touch-controls__stack">
                <button
                  type="button"
                  data-control-id="reload"
                  aria-label="Reload"
                  className={`touch-button touch-button--wide ${pressedControls.reload ? "is-active" : ""}`}
                  style={touchControlStyle("reload")}
                >
                  <RotateCw size={20} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  data-control-id="grenade"
                  aria-label="Throw grenade"
                  className={`touch-button touch-button--wide ${pressedControls.grenade ? "is-active" : ""}`}
                  style={touchControlStyle("grenade")}
                >
                  <Bomb size={20} strokeWidth={3} />
                </button>
              </div>
              <button
                type="button"
                data-control-id="aim"
                aria-label="Aim and fire joystick"
                className={`touch-stick touch-stick--aim ${aimStick.active ? "is-active" : ""}`}
                style={touchControlStyle("aim")}
              >
                <span className="touch-stick__label">
                  <Crosshair size={13} strokeWidth={3} />
                </span>
                <span
                  className="touch-stick__thumb"
                  style={{
                    transform: `translate(${aimStick.x / controlScale("aim")}px, ${aimStick.y / controlScale("aim")}px)`,
                  }}
                />
              </button>
              <button
                type="button"
                data-control-id="use"
                aria-label="Use"
                className={`touch-button touch-button--wide ${pressedControls.use ? "is-active" : ""}`}
                style={touchControlStyle("use")}
              >
                <Hand size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
        {showRotatePrompt && (
          <div
            className="rotate-device-overlay"
            style={{ position: "absolute", inset: 0, zIndex: 44 }}
          >
            <div className="rotate-device-card">
              <div className="display text-xl text-[#76a035]">
                Rotate To Fight
              </div>
              <p className="mt-2 text-sm text-stone-300">
                Combat is built for landscape play on phones and tablets.
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Round score animation overlay */}
      {roundAnim && !over && (
        <div
          className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.72)" }}
        >
          <div
            style={{
              border: `2px solid ${roundAnim.event === "flag" ? "#fde047" : "#84cc16"}`,
              background: "rgba(5,8,3,0.97)",
              padding: "36px 64px",
              textAlign: "center",
              minWidth: 320,
              animation:
                "roundAnimIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: 4,
                color: roundAnim.event === "flag" ? "#fde047" : "#84cc16",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              {roundAnim.event === "flag"
                ? "⚑ Flag Captured"
                : "☠ Team Eliminated"}
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 2,
                color: roundAnim.msg.startsWith("BLUE") ? "#60a5fa" : "#f87171",
                marginBottom: 20,
                textShadow: roundAnim.msg.startsWith("BLUE")
                  ? "0 0 24px rgba(96,165,250,0.7)"
                  : "0 0 24px rgba(248,113,113,0.7)",
              }}
            >
              {roundAnim.msg.replace(" ★", "")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: "#60a5fa",
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  BLUE
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 52,
                    fontWeight: 900,
                    color: "#60a5fa",
                    lineHeight: 1,
                  }}
                >
                  {roundAnim.blue}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 22,
                  color: "#555",
                  marginTop: 14,
                }}
              >
                vs
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: "#f87171",
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  RED
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 52,
                    fontWeight: 900,
                    color: "#f87171",
                    lineHeight: 1,
                  }}
                >
                  {roundAnim.red}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                fontFamily: "monospace",
                fontSize: 9,
                color: "#444",
                letterSpacing: 2,
              }}
            >
              FIRST TO 5 WINS THE MATCH
            </div>
          </div>
        </div>
      )}

      {/* New Round overlay — shown during the brief freeze after everyone respawns at base */}
      {roundStart && !over && (
        <div
          className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            style={{
              textAlign: "center",
              animation:
                "roundAnimIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                letterSpacing: 6,
                color: "#84cc16",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              ⚙ Deploying
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 38,
                fontWeight: 900,
                letterSpacing: 3,
                color: "#d6f54e",
                textShadow: "0 0 24px rgba(134,197,44,0.7)",
              }}
            >
              NEW ROUND {roundStart.round}
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: "monospace",
                fontSize: 10,
                color: "#888",
                letterSpacing: 2,
              }}
            >
              FIRST TO 5 WINS THE MATCH
            </div>
          </div>
        </div>
      )}

      {paused && !over && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="tactical-panel p-8 text-center max-w-sm w-full mx-4">
            <div
              className="display text-3xl mb-2"
              style={{ color: "oklch(0.70 0.18 130)" }}
            >
              ⏸ PAUSED
            </div>
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-6"
              style={{ color: "oklch(0.62 0.03 95)" }}
            >
              Combat suspended — press ESC to resume
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setPaused(false)}
                className="px-6 py-3 display text-lg uppercase tracking-widest transition-transform active:scale-95"
                style={{
                  background: "oklch(0.70 0.18 130)",
                  color: "oklch(0.12 0.015 120)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ▶ Resume
              </button>
              <button
                onClick={() => void requestImmersiveMode()}
                className="px-6 py-2.5 font-mono text-sm uppercase tracking-widest border transition-colors hover:bg-white/5"
                style={{
                  borderColor: "oklch(0.40 0.04 130)",
                  color: "oklch(0.62 0.03 95)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {isFullscreen ? "⛶ Windowed" : "⛶ Fullscreen"}
              </button>
              <button
                onClick={() => {
                  setPaused(false);
                  init();
                  lastTimeRef.current = 0;
                }}
                className="px-6 py-2.5 font-mono text-sm uppercase tracking-widest border transition-colors hover:bg-white/5"
                style={{
                  borderColor: "oklch(0.45 0.08 70)",
                  color: "oklch(0.62 0.03 95)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                ↻ Restart Match
              </button>
              <button
                onClick={surrenderMatch}
                className="px-6 py-2.5 font-mono text-sm uppercase tracking-widest border transition-colors hover:bg-red-900/30"
                style={{
                  borderColor: "oklch(0.45 0.18 25)",
                  color: "oklch(0.65 0.18 25)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                ⚑ Surrender Match
              </button>
              <button
                onClick={onExit}
                className="px-6 py-2.5 font-mono text-sm uppercase tracking-widest border transition-colors hover:bg-red-900/30"
                style={{
                  borderColor: "oklch(0.45 0.18 25)",
                  color: "oklch(0.65 0.18 25)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                ✕ Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50">
          <div className="tactical-panel p-8 text-center max-w-md">
            <div
              className="display text-4xl mb-4"
              style={{
                color:
                  over.result === "victory"
                    ? "oklch(0.68 0.18 145)"
                    : "oklch(0.58 0.22 25)",
              }}
            >
              {over.result === "victory" ? "VICTORY" : "DEFEAT"}
            </div>
            <div
              className="text-sm space-y-1 mb-6"
              style={{ color: "oklch(0.62 0.03 95)" }}
            >
              <div>
                Score:{" "}
                <span style={{ color: "oklch(0.70 0.18 130)" }}>
                  {over.record.stars}
                </span>{" "}
                —{" "}
                <span style={{ color: "oklch(0.58 0.22 25)" }}>
                  {over.record.enemyStars}
                </span>
              </div>
              <div>
                Kills: {over.record.kills} · Deaths: {over.record.deaths}
              </div>
              <div style={{ color: "oklch(0.60 0.16 55)" }}>
                +{over.record.coinsEarned} coins earned
              </div>
              {mode === "rank" && (
                <div style={{ color: "oklch(0.70 0.18 130)" }}>
                  RP: {over.result === "victory" ? "+25" : "-10"}
                </div>
              )}
            </div>
            <button
              onClick={onExit}
              className="px-8 py-3 display"
              style={{
                background: "oklch(0.70 0.18 130)",
                color: "oklch(0.12 0.015 120)",
                border: "none",
                cursor: "pointer",
              }}
            >
              RETURN TO LOBBY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
