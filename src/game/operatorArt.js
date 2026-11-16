// operatorArt.js — procedural high-resolution pixel-art rendering for the
// in-match operator bodies and weapons.
//
// The game used to blit two small PNGs (stand/run) and let CSS-scale them, which
// is why characters looked blurry and moved without real animation. Everything
// here is drawn on the pixel grid at 2 device pixels per art pixel, with layered
// limbs, shading, rim light and a per-state pose so each animation state reads
// as its own frame rather than a nudged picture.
//
// The silhouette follows the reference art: a stocky side-view soldier with a
// big rounded helmet + goggles, olive field uniform, tan webbing pouches, short
// chunky legs and a two-handed rifle grip.
//
// Coordinate system: the caller draws with the origin at the operator's FEET and
// the character facing +x (GameCanvas flips the context for facing left). Shapes
// are authored in art units and scaled by UNIT, so the operator ends up ~55px
// tall on screen.

export const UNIT = 2;
export const OPERATOR_HEIGHT = 56;

const PALETTES = {
  blue: {
    outline: "#0a0e07",
    // olive-drab uniform
    uniform: "#4d6b3c",
    uniformDark: "#3b5430",
    uniformLight: "#6a8a4f",
    camo: "#394d2c",
    // webbing / plate carrier
    vest: "#38452a",
    vestLight: "#4f5f38",
    pouch: "#8f7440",
    pouchDark: "#6d5730",
    pack: "#2f3a24",
    strap: "#232b1b",
    // helmet + head
    helmet: "#33412a",
    helmetLight: "#54663c",
    helmetDark: "#25301e",
    boot: "#22281d",
    bootSole: "#14180f",
    skin: "#f0c9a1",
    skinShade: "#c99e78",
    goggles: "#20262b",
    goggleStrap: "#2a3226",
    // team identification
    visor: "#7fd4ff",
    trim: "#3b82f6",
    rim: "#9ad0ff",
  },
  red: {
    outline: "#0f0b06",
    // khaki-drab uniform (reads as the opposing force, same soldier build)
    uniform: "#6a5f3e",
    uniformDark: "#544a30",
    uniformLight: "#8a7c55",
    camo: "#4d4429",
    vest: "#3d3626",
    vestLight: "#5b5238",
    pouch: "#8a7040",
    pouchDark: "#66512c",
    pack: "#332c1f",
    strap: "#241f16",
    helmet: "#40382a",
    helmetLight: "#6a6046",
    helmetDark: "#2e2819",
    boot: "#241f17",
    bootSole: "#15120c",
    skin: "#eec59c",
    skinShade: "#c29673",
    goggles: "#241f19",
    goggleStrap: "#2e281d",
    visor: "#ffb4a8",
    trim: "#ef4444",
    rim: "#ffc3b8",
  },
};

// A flat, all-outline palette per team, used for the silhouette pass.
const MONO = {};
for (const teamKey of Object.keys(PALETTES)) {
  MONO[teamKey] = Object.fromEntries(
    Object.keys(PALETTES[teamKey]).map((k) => [k, PALETTES[teamKey].outline]),
  );
}

// Map a weapon id onto the small set of silhouettes we draw.
export function weaponClassFor(weaponId) {
  if (!weaponId) return "rifle";
  const id = String(weaponId);
  if (id === "knife" || id === "grenade") return id;
  if (id === "awp" || id === "barrett") return "sniper";
  if (id === "dmr" || id === "scout") return "dmr";
  if (id === "shotgun") return "shotgun";
  if (id.includes("smg") || id === "mpd" || id === "mp5") return "smg";
  if (id.includes("pistol") || id === "mk23" || id === "deagle") return "pistol";
  return "rifle";
}

/**
 * Decide which animation the operator is playing. Kept here so the renderer and
 * the gameplay code agree on a single list of states.
 */
export function operatorStateFor(p) {
  if (p.hp <= 0 || p.alive === false) return "dead";
  if (p.throwTimer > 0) return "throw";
  if (p.reloading) return "reload";
  if (p.weaponSwapTimer > 0) return "swap";
  if (p.onLadder) return "climb";
  if (!p.onGround) return (p.vy ?? 0) < 0 ? "jump" : "fall";
  if (p.crouching) return "crouch";
  const speed = Math.abs(p.vx ?? 0);
  if (speed > 3.2) return "run";
  if (speed > 0.35) return "walk";
  if (p.recoil > 0.35) return "shoot";
  return "idle";
}

/** Joint layout for one animation frame, in art units. */
function poseFor(state, phase, time, opts) {
  const lean = opts.lean ?? 0;
  const base = {
    hipY: -13,
    hipX: 0,
    chestY: -22,
    chestLean: 0,
    headTilt: 0,
    frontThigh: 0.18,
    frontShin: -0.12,
    backThigh: -0.18,
    backShin: 0.12,
    armFrontAngle: -0.55,
    armBackAngle: -0.85,
    bob: 0,
    torsoScale: 1,
  };

  switch (state) {
    case "walk":
    case "run": {
      const fast = state === "run";
      const amp = fast ? 0.62 : 0.4;
      const stride = Math.sin(phase);
      const lift = Math.cos(phase);
      return {
        ...base,
        hipY: base.hipY + Math.abs(stride) * (fast ? 1.1 : 0.7),
        chestLean: lean + (fast ? 0.08 : 0.03),
        frontThigh: stride * amp + 0.08,
        frontShin: Math.max(0, lift) * -amp * 1.1 - 0.05,
        backThigh: -stride * amp - 0.08,
        backShin: Math.max(0, -lift) * -amp * 1.1 - 0.05,
        armFrontAngle: -0.5 - stride * 0.18,
        armBackAngle: -0.9 + stride * 0.14,
        headTilt: stride * (fast ? 0.05 : 0.03),
      };
    }
    case "idle":
    case "aim":
    case "shoot": {
      const breathe = Math.sin(time * 1.9) * 0.5;
      return {
        ...base,
        hipY: base.hipY + breathe * 0.35,
        chestY: base.chestY + breathe * 0.35,
        bob: breathe * 0.4,
        armFrontAngle: state === "idle" ? -0.62 : -0.1,
        armBackAngle: -0.95,
        headTilt: Math.sin(time * 1.3) * 0.02,
      };
    }
    case "jump":
      return {
        ...base,
        hipY: -14,
        frontThigh: 0.85,
        frontShin: -1.15,
        backThigh: 0.55,
        backShin: -0.9,
        armFrontAngle: -1.2,
        armBackAngle: -1.35,
        chestLean: 0.12,
      };
    case "fall":
      return {
        ...base,
        hipY: -13,
        frontThigh: 0.35,
        frontShin: -0.25,
        backThigh: -0.4,
        backShin: 0.15,
        armFrontAngle: -1.05,
        armBackAngle: -1.25,
        chestLean: -0.06,
      };
    case "crouch":
      return {
        ...base,
        hipY: -8,
        chestY: -17,
        frontThigh: 0.95,
        frontShin: -1.5,
        backThigh: 0.6,
        backShin: -1.25,
        armFrontAngle: -0.35,
        armBackAngle: -0.9,
        chestLean: 0.14,
        torsoScale: 0.92,
      };
    case "reload": {
      const t = opts.reloadProgress ?? 0;
      const punch = Math.sin(t * Math.PI);
      return {
        ...base,
        hipY: base.hipY - 0.3 * punch,
        chestLean: 0.05,
        armFrontAngle: -0.35 + Math.sin(t * Math.PI * 2) * 0.55,
        armBackAngle: -0.6 - punch * 0.5,
        headTilt: 0.06,
      };
    }
    case "throw": {
      const t = opts.throwProgress ?? 0;
      // wind up, then release
      const swing = t < 0.45 ? -1.4 * (t / 0.45) : -1.4 + 3.2 * ((t - 0.45) / 0.55);
      return {
        ...base,
        armBackAngle: -1.2 + swing,
        armFrontAngle: -0.4,
        chestLean: 0.05 - swing * 0.06,
      };
    }
    case "swap": {
      const t = opts.swapProgress ?? 0;
      const dip = Math.sin(Math.min(1, t) * Math.PI);
      return {
        ...base,
        hipY: base.hipY + dip * 0.6,
        armFrontAngle: -0.5 + dip * 1.1,
        armBackAngle: -0.9 + dip * 0.8,
        chestLean: dip * 0.08,
      };
    }
    case "climb": {
      const swing = Math.sin(phase);
      return {
        ...base,
        hipY: -13,
        frontThigh: 0.5 + swing * 0.4,
        frontShin: -0.8,
        backThigh: 0.3 - swing * 0.4,
        backShin: -0.6,
        armFrontAngle: -1.9 + swing * 0.5,
        armBackAngle: -1.9 - swing * 0.5,
        chestLean: 0,
      };
    }
    case "dead":
      return { ...base, hipY: -4, chestLean: 0.5, armFrontAngle: 0.6, armBackAngle: 0.2 };
    default:
      return base;
  }
}

/**
 * Draw the operator's body. Origin = feet, +x = facing direction.
 *
 * Build, top to bottom (art units, feet at 0):
 *   helmet        -8.0 .. -5.5 above the shoulders
 *   face/goggles  -5.7 .. -0.6
 *   torso        -18.0 .. -10.0
 *   legs + boots  -9.6 .. 0
 */
export function drawOperatorBody(ctx, opts) {
  const {
    team = "blue",
    state = "idle",
    phase = 0,
    time = 0,
    leaning = 0,
    crouchShift = 0,
  } = opts;
  const teamKey = team === "red" ? "red" : "blue";
  const pal = PALETTES[teamKey];
  const pose = poseFor(state, phase, time, {
    lean: leaning,
    reloadProgress: opts.reloadProgress,
    throwProgress: opts.throwProgress,
    swapProgress: opts.swapProgress,
  });

  const snap = (v) => Math.round(v * UNIT) / UNIT;

  const LEG = 9.6; // hip height
  const TORSO_H = 8.4;
  const THIGH = 5.0;
  const SHIN = 4.4;
  // pose.hipY is authored around -13; use it as a vertical offset.
  const hipY = snap(-LEG + (pose.hipY + 13) * 0.9 + crouchShift);
  const shoulderY = snap(hipY - TORSO_H);
  const tH = TORSO_H * (pose.torsoScale ?? 1);

  const backHipX = -1.5;
  const frontHipX = 1.4;
  const backKneeX = backHipX + Math.sin(pose.backThigh) * THIGH;
  const backKneeY = hipY + Math.cos(pose.backThigh) * THIGH;
  const frontKneeX = frontHipX + Math.sin(pose.frontThigh) * THIGH;
  const frontKneeY = hipY + Math.cos(pose.frontThigh) * THIGH;

  /**
   * One complete pass of the body. `grow` inflates every rect, so the first
   * pass with the mono palette produces a clean silhouette around the real
   * body instead of blocky boxes behind it.
   */
  const paint = (P, grow) => {
    const R = (x, y, w, h) =>
      ctx.fillRect(x - grow, y - grow, w + grow * 2, h + grow * 2);

    // ── Back leg (shadow side) ──
    ctx.save();
    ctx.translate(backHipX, hipY);
    ctx.rotate(pose.backThigh);
    ctx.fillStyle = P.uniformDark;
    R(-1.5, 0, 3.0, THIGH + 0.4);
    ctx.restore();
    ctx.save();
    ctx.translate(backKneeX, backKneeY);
    ctx.rotate(pose.backShin);
    ctx.fillStyle = P.uniformDark;
    R(-1.35, 0, 2.7, SHIN);
    ctx.fillStyle = P.boot;
    R(-1.6, SHIN - 0.7, 4.1, 1.9);
    ctx.fillStyle = P.bootSole;
    R(-1.6, SHIN + 1.0, 4.1, 0.6);
    ctx.restore();

    // ── Front leg (lit) ──
    ctx.save();
    ctx.translate(frontHipX, hipY);
    ctx.rotate(pose.frontThigh);
    ctx.fillStyle = P.uniform;
    R(-1.5, 0, 3.1, THIGH + 0.4);
    ctx.fillStyle = P.camo;
    R(-0.9, 1.0, 1.3, 1.5); // camo patch
    ctx.fillStyle = P.uniformLight;
    R(0.7, 0.2, 0.9, THIGH - 0.6); // lit edge
    ctx.restore();
    ctx.save();
    ctx.translate(frontKneeX, frontKneeY);
    ctx.rotate(pose.frontShin);
    ctx.fillStyle = P.uniform;
    R(-1.4, 0, 2.8, SHIN);
    ctx.fillStyle = P.uniformLight;
    R(0.6, 0.2, 0.8, SHIN - 1.0);
    ctx.fillStyle = P.boot;
    R(-1.7, SHIN - 0.7, 4.4, 2.0);
    ctx.fillStyle = P.bootSole;
    R(-1.7, SHIN + 1.1, 4.4, 0.6);
    ctx.restore();

    // ── Hips / belt ──
    ctx.fillStyle = P.vest;
    R(-3.0, hipY - 1.6, 6.2, 2.6);
    ctx.fillStyle = P.strap;
    R(-3.0, hipY - 1.6, 6.2, 0.7);
    ctx.fillStyle = P.pouch;
    R(-1.8, hipY - 1.2, 1.5, 1.7);
    R(0.5, hipY - 1.2, 1.4, 1.7);

    // ── Torso ──
    ctx.save();
    ctx.translate(0, hipY - 1.0);
    ctx.rotate(pose.chestLean * 0.5);

    // field uniform
    ctx.fillStyle = P.uniform;
    R(-3.6, -tH, 7.2, tH);
    // camo blotches (deterministic, so they do not shimmer)
    ctx.fillStyle = P.camo;
    R(-2.8, -tH + 0.8, 1.5, 1.3);
    R(0.4, -tH + 2.4, 1.6, 1.2);
    R(-1.6, -tH + 4.0, 1.2, 1.1);
    // top light + underside shadow
    ctx.fillStyle = P.uniformLight;
    R(-3.6, -tH, 7.2, 0.8);
    ctx.fillStyle = P.uniformDark;
    R(-3.6, -1.2, 7.2, 1.2);
    R(-3.6, -tH + 0.8, 0.9, tH - 2.0);

    // webbing with tan pouches
    ctx.fillStyle = P.vest;
    R(-3.0, -tH + 1.4, 6.0, 5.4);
    ctx.fillStyle = P.vestLight;
    R(-3.0, -tH + 1.4, 6.0, 0.6);
    ctx.fillStyle = P.pouch;
    R(-2.5, -tH + 2.2, 2.0, 2.2);
    R(0.2, -tH + 2.2, 2.0, 2.2);
    ctx.fillStyle = P.pouchDark;
    R(-2.5, -tH + 3.9, 2.0, 0.5);
    R(0.2, -tH + 3.9, 2.0, 0.5);
    ctx.fillStyle = P.strap;
    R(-3.0, -tH + 5.2, 6.0, 0.7);
    // team armband
    ctx.fillStyle = P.trim;
    R(2.1, -tH + 2.0, 1.3, 1.1);

    // backpack
    ctx.fillStyle = P.pack;
    R(-4.8, -tH + 1.8, 1.8, 4.6);

    // ── Head, goggles, helmet ──
    ctx.save();
    ctx.translate(0.5, -tH);
    ctx.rotate(pose.headTilt * 0.5);

    // neck
    ctx.fillStyle = P.skinShade;
    R(-1.1, -1.4, 2.4, 1.9);
    // face below the goggles
    ctx.fillStyle = P.skin;
    R(-1.8, -4.6, 3.8, 4.0);
    ctx.fillStyle = P.skinShade;
    R(-1.8, -1.8, 3.8, 0.7);
    // goggle strap + lenses (drawn before the helmet so they stay visible)
    ctx.fillStyle = P.goggleStrap;
    R(-2.4, -5.7, 4.9, 1.7);
    ctx.fillStyle = P.goggles;
    R(-0.2, -5.6, 2.6, 1.4);
    ctx.fillStyle = P.visor;
    R(0.2, -5.3, 1.8, 0.7);
    // helmet dome: stepped rows so it reads as a rounded shell
    ctx.fillStyle = P.helmet;
    R(-2.3, -9.3, 5.4, 1.3);
    R(-3.0, -8.0, 6.6, 1.4);
    R(-3.7, -6.6, 8.2, 1.2);
    ctx.fillStyle = P.helmetLight;
    R(-1.9, -9.1, 3.4, 0.8);
    R(-2.7, -7.9, 1.7, 0.6);
    ctx.fillStyle = P.helmetDark;
    R(2.4, -6.6, 2.1, 1.1);
    ctx.fillStyle = P.trim;
    R(1.4, -7.9, 1.6, 1.1); // team stripe
    ctx.restore();

    // ── Arms ──
    const armY = -tH + 2.0;
    ctx.save();
    ctx.translate(-2.2, armY);
    ctx.rotate(pose.armBackAngle);
    ctx.fillStyle = P.camo;
    R(-1.1, 0, 2.2, 5.2);
    ctx.fillStyle = P.vestLight;
    R(-1.1, 1.2, 2.2, 1.0);
    ctx.fillStyle = P.skinShade;
    R(-1.0, 5.0, 2.0, 1.5);
    ctx.restore();
    ctx.save();
    ctx.translate(2.2, armY);
    ctx.rotate(pose.armFrontAngle);
    ctx.fillStyle = P.uniformDark;
    R(-1.1, 0, 2.2, 5.4);
    ctx.fillStyle = P.uniformLight;
    R(0.4, 0.2, 0.7, 4.6);
    ctx.fillStyle = P.vestLight;
    R(-1.1, 1.4, 2.2, 1.0);
    ctx.fillStyle = P.skin;
    R(-1.0, 5.2, 2.0, 1.6);
    ctx.restore();

    ctx.restore(); // torso
  };

  // Everything is authored in art units; convert to the 2px art grid.
  ctx.save();
  ctx.scale(UNIT, UNIT);

  // 1) silhouette, 2) coloured body
  paint(MONO[teamKey], 0.62);
  paint(pal, 0);

  // ── Rim light down the facing edge ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(210, 235, 255, 0.16)";
  ctx.fillRect(3.4, shoulderY + 0.6, 0.9, TORSO_H - 1.6);
  ctx.fillRect(3.6, shoulderY + 0.2, 0.8, 3.0);
  ctx.restore();

  // ── Contact shadow at the boots ──
  ctx.save();
  const ao = ctx.createLinearGradient(0, hipY - 2, 0, 1.5);
  ao.addColorStop(0, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = ao;
  ctx.fillRect(-4.2, hipY - 2, 8.4, 3.5);
  ctx.restore();

  ctx.restore(); // art-unit scale
  return { shoulderX: 2.2 * UNIT, shoulderY: shoulderY * UNIT };
}

/**
 * Draw a weapon silhouette centred on the hand anchor, pointing along `angle`.
 * Distinct shapes per class so players can read what the enemy carries.
 */
export function drawWeaponSprite(ctx, x, y, angle, weaponClass, opts = {}) {
  const { alpha = 1, recoil = 0 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.scale(UNIT, UNIT); // same 2px art grid as the operator

  const metal = "#1c2126";
  const metalLight = "#39424a";
  const grip = "#12161a";
  const accent = "#5b666f";

  const kick = -recoil * 3; // muzzle pushed back on recoil

  if (weaponClass === "knife") {
    ctx.fillStyle = grip;
    ctx.fillRect(0, -1, 4, 2);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(4, -1.2, 7, 1.6);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(4, -1.2, 7, 0.6);
    ctx.restore();
    return;
  }
  if (weaponClass === "pistol") {
    ctx.fillStyle = metal;
    ctx.fillRect(0, -2, 11 + kick, 3);
    ctx.fillStyle = metalLight;
    ctx.fillRect(1, -3, 8 + kick, 1.4);
    ctx.fillStyle = grip;
    ctx.fillRect(1.5, 0.6, 3.2, 4.2);
    ctx.restore();
    return;
  }
  if (weaponClass === "shotgun") {
    ctx.fillStyle = metal;
    ctx.fillRect(-1, -2.0, 12 + kick, 3.4);
    ctx.fillStyle = metalLight;
    ctx.fillRect(1, -2.8, 7 + kick, 1.3);
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(1, 0.8, 4, 2.4); // wooden pump
    ctx.fillStyle = grip;
    ctx.fillRect(-4, -0.6, 3.4, 2.2);
    ctx.restore();
    return;
  }
  if (weaponClass === "sniper") {
    ctx.fillStyle = metal;
    ctx.fillRect(-1.6, -1.7, 15 + kick, 2.8);
    ctx.fillStyle = metalLight;
    ctx.fillRect(3, -2.4, 8, 1.1);
    ctx.fillStyle = "#0b0f12";
    ctx.fillRect(4.4, -5.0, 6.4, 2.4); // scope
    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(9.4, -4.5, 1.3, 1.4); // lens glint
    ctx.fillStyle = grip;
    ctx.fillRect(-1, 0.7, 3.4, 2.8);
    ctx.fillRect(7, 0.9, 2, 2.2);
    ctx.restore();
    return;
  }
  if (weaponClass === "dmr") {
    ctx.fillStyle = metal;
    ctx.fillRect(-1.2, -1.7, 12 + kick, 2.7);
    ctx.fillStyle = metalLight;
    ctx.fillRect(1.6, -2.4, 6, 1.1);
    ctx.fillStyle = "#0b0f12";
    ctx.fillRect(4.6, -4.0, 3.6, 1.7);
    ctx.fillStyle = grip;
    ctx.fillRect(-0.6, 0.7, 3.2, 2.8);
    ctx.restore();
    return;
  }
  if (weaponClass === "smg") {
    ctx.fillStyle = metal;
    ctx.fillRect(-1, -1.3, 11 + kick, 2.1);
    ctx.fillStyle = metalLight;
    ctx.fillRect(1, -1.9, 5, 0.9);
    ctx.fillStyle = grip;
    ctx.fillRect(1.6, 0.6, 2, 3.4); // magazine
    ctx.fillRect(-1.4, 0.4, 1.8, 1.6);
    ctx.restore();
    return;
  }

  // rifle (default) — chunky silhouette with a stock reaching back towards the
  // shoulder and a hand on the foregrip, so it reads as carried.
  ctx.fillStyle = grip;
  ctx.fillRect(-4.4, -1.0, 3.4, 2.1); // stock
  ctx.fillStyle = metal;
  ctx.fillRect(-1.4, -1.6, 12.4 + kick, 3.0); // receiver + barrel
  ctx.fillStyle = metalLight;
  ctx.fillRect(1.4, -2.3, 6.4, 1.0); // top rail
  ctx.fillStyle = accent;
  ctx.fillRect(9.8 + kick, -1.2, 2.0, 1.9); // muzzle brake
  ctx.fillStyle = "#0b0f12";
  ctx.fillRect(11.6 + kick, -0.8, 0.8, 1.1); // bore
  ctx.fillStyle = grip;
  ctx.fillRect(1, 1.0, 2.2, 3.4); // magazine
  ctx.fillRect(-1.2, 0.9, 2.2, 2.0); // pistol grip
  // leading hand around the foregrip
  ctx.fillStyle = "#c9a179";
  ctx.fillRect(4.2, 0.9, 2.6, 2.2);
  ctx.fillStyle = "#8f6f4e";
  ctx.fillRect(4.2, 2.6, 2.6, 0.6);
  ctx.restore();
}
