// operatorArt.js — procedural high-resolution pixel-art rendering for the
// in-match operator bodies and weapons.
//
// The game used to blit two small PNGs (stand/run) and let CSS-scale them, which
// is why characters looked blurry and moved without real animation. Everything
// here is drawn on the pixel grid at 2 device pixels per art pixel, with layered
// limbs, shading, rim light and a per-state pose so each animation state reads
// as its own frame rather than a nudged picture.
//
// Coordinate system: the caller draws with the origin at the operator's FEET and
// the character facing +x (GameCanvas flips the context for facing left). One
// art unit is UNIT device pixels, so the operator is 29 units (58px) tall.

export const UNIT = 2;
export const OPERATOR_HEIGHT = 58;

const PALETTES = {
  blue: {
    outline: "#04070b",
    boot: "#0e1b26",
    leg: "#22536f",
    legLight: "#2f6d8e",
    torso: "#2e6c92",
    torsoLight: "#4a93b8",
    torsoShade: "#1b4460",
    vest: "#153547",
    vestPlate: "#27566f",
    strap: "#0a1d28",
    skin: "#c9a07a",
    skinShade: "#a0795a",
    helmet: "#12303f",
    helmetLight: "#1f4f66",
    rim: "#7fd4ff",
    visor: "#67e8f9",
    accent: "#3f8f6e",
    teamMark: "#60a5fa",
  },
  red: {
    outline: "#0a0405",
    boot: "#2a0d12",
    leg: "#5e1c28",
    legLight: "#7d2a38",
    torso: "#7a2231",
    torsoLight: "#a63c4c",
    torsoShade: "#4d1420",
    vest: "#3a1019",
    vestPlate: "#6b1f2d",
    strap: "#1b0710",
    skin: "#d1a077",
    skinShade: "#a6785a",
    helmet: "#3d1620",
    helmetLight: "#662631",
    rim: "#ffa3ad",
    visor: "#fb7185",
    accent: "#8a4a2a",
    teamMark: "#f87171",
  },
};

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

function drawLimb(ctx, x0, y0, angle, length, width, color, shade) {
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(0, -width / 2, length, width);
  if (shade) {
    ctx.fillStyle = shade;
    ctx.fillRect(0, width / 2 - Math.max(1, width * 0.28), length, Math.max(1, width * 0.28));
  }
  ctx.restore();
}

/**
 * Draw the operator's body. Origin = feet, +x = facing direction.
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
  const pal = PALETTES[team] ?? PALETTES.blue;
  const pose = poseFor(state, phase, time, {
    lean: leaning,
    reloadProgress: opts.reloadProgress,
    throwProgress: opts.throwProgress,
    swapProgress: opts.swapProgress,
  });

  const u = UNIT;
  const snap = (v) => Math.round(v * u) / u;

  const hipY = snap(pose.hipY + crouchShift);
  const chestY = snap(pose.chestY + crouchShift + (pose.bob || 0) * 0.4);
  const headY = snap(chestY - 6);

  // ── Dark separation outline ──
  // A slightly larger silhouette behind the body keeps the operator readable
  // against dark buildings and smoke without blurring the pixel edges.
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = pal.outline;
  const oOut = 0.7;
  // torso + hips
  ctx.fillRect(-3.4 - oOut, hipY - 9.4 - oOut, 6.8 + oOut * 2, 9.6 + oOut * 2);
  // head / helmet
  ctx.fillRect(-2.8 - oOut, hipY - 16.6 - oOut, 5.8 + oOut * 2, 6 + oOut * 2);
  // legs (a touch wider than the drawn limbs)
  ctx.fillRect(-2.4 - oOut, hipY, 2.6 + oOut, 13.4);
  ctx.fillRect(0 + 0.2, hipY, 2.6 + oOut, 13.4);
  ctx.restore();

  // ── Back leg (drawn first, darker) ──
  const backHipX = -1;
  const backKneeAngle = pose.backThigh;
  const backKneeLen = 6.5;
  const backShinAngle = pose.backThigh + pose.backShin;
  const backKneeX = backHipX + Math.sin(backKneeAngle) * backKneeLen;
  const backKneeY = hipY + Math.cos(backKneeAngle) * backKneeLen;
  ctx.save();
  ctx.translate(backHipX, hipY);
  ctx.rotate(backKneeAngle);
  ctx.fillStyle = pal.leg;
  ctx.fillRect(-1.2, 0, 2.4, backKneeLen);
  ctx.restore();
  ctx.save();
  ctx.translate(backKneeX, backKneeY);
  ctx.rotate(backShinAngle - backKneeAngle);
  ctx.fillStyle = pal.leg;
  ctx.fillRect(-1.1, 0, 2.2, 5.4);
  ctx.fillStyle = pal.boot;
  ctx.fillRect(-1.4, 4.6, 3.6, 1.9); // boot with a forward toe
  ctx.restore();

  // ── Front leg ──
  const frontHipX = 1.2;
  const frontKneeAngle = pose.frontThigh;
  const frontKneeLen = 6.5;
  const frontShinAngle = pose.frontThigh + pose.frontShin;
  const frontKneeX = frontHipX + Math.sin(frontKneeAngle) * frontKneeLen;
  const frontKneeY = hipY + Math.cos(frontKneeAngle) * frontKneeLen;
  ctx.save();
  ctx.translate(frontHipX, hipY);
  ctx.rotate(frontKneeAngle);
  ctx.fillStyle = pal.legLight;
  ctx.fillRect(-1.3, 0, 2.6, frontKneeLen);
  ctx.fillStyle = pal.leg;
  ctx.fillRect(0.5, 0, 1.1, frontKneeLen); // inner shading
  ctx.restore();
  ctx.save();
  ctx.translate(frontKneeX, frontKneeY);
  ctx.rotate(frontShinAngle - frontKneeAngle);
  ctx.fillStyle = pal.legLight;
  ctx.fillRect(-1.2, 0, 2.4, 5.6);
  ctx.fillStyle = pal.boot;
  ctx.fillRect(-1.5, 4.8, 3.9, 2);
  ctx.fillStyle = "#1b2630";
  ctx.fillRect(-1.5, 6.1, 3.9, 0.7); // sole
  ctx.restore();

  // ── Hips / belt ──
  ctx.fillStyle = pal.vest;
  ctx.fillRect(-2.6, hipY - 1.6, 5.4, 2.6);
  ctx.fillStyle = pal.vestPlate;
  ctx.fillRect(-0.6, hipY - 1.4, 1.4, 1.8); // buckle
  // thigh holster
  ctx.fillStyle = pal.strap;
  ctx.fillRect(1.4, hipY + 0.4, 1.6, 2.6);

  // ── Torso (lean + breathing) ──
  ctx.save();
  ctx.translate(0, hipY - 1.2);
  ctx.rotate(pose.chestLean * 0.55);
  const torsoH = 8.6 * (pose.torsoScale ?? 1);
  ctx.fillStyle = pal.torso;
  ctx.fillRect(-3.4, -torsoH, 6.8, torsoH);
  // side shading + highlight
  ctx.fillStyle = pal.torsoShade;
  ctx.fillRect(-3.4, -torsoH, 1.5, torsoH);
  ctx.fillStyle = pal.torsoLight;
  ctx.fillRect(1.9, -torsoH + 0.6, 1.5, torsoH - 1.2);
  // plate carrier
  ctx.fillStyle = pal.vest;
  ctx.fillRect(-2.6, -torsoH + 1.2, 5.2, 6.2);
  ctx.fillStyle = pal.vestPlate;
  ctx.fillRect(-2.2, -torsoH + 1.8, 2.1, 2.2);
  ctx.fillRect(0.2, -torsoH + 1.8, 1.8, 2.2);
  ctx.fillStyle = pal.strap;
  ctx.fillRect(-2.6, -torsoH + 0.9, 5.2, 0.7); // shoulder strap
  // magazine pouches
  ctx.fillStyle = pal.vestPlate;
  ctx.fillRect(-2.2, -torsoH + 4.6, 1.6, 1.8);
  ctx.fillRect(-0.2, -torsoH + 4.6, 1.6, 1.8);
  // team accent stripe
  ctx.fillStyle = pal.accent;
  ctx.fillRect(-3.2, -torsoH + 7.1, 4.4, 0.8);

  // ── Head + helmet ──
  ctx.save();
  ctx.translate(0.5, -torsoH);
  ctx.rotate(pose.headTilt * 0.5 + (opts.headTiltExtra ?? 0));
  // neck
  ctx.fillStyle = pal.skinShade;
  ctx.fillRect(-1.2, -1.4, 2.4, 1.6);
  // face
  ctx.fillStyle = pal.skin;
  ctx.fillRect(-1.6, -5.4, 3.6, 4);
  ctx.fillStyle = pal.skinShade;
  ctx.fillRect(-1.6, -2.2, 3.6, 0.9); // jaw shadow
  // helmet shell
  ctx.fillStyle = pal.helmet;
  ctx.fillRect(-2.2, -6.8, 4.8, 2.6);
  ctx.fillStyle = pal.helmetLight;
  ctx.fillRect(-1.4, -7, 3.4, 0.9);
  ctx.fillStyle = pal.helmet;
  ctx.fillRect(-2.6, -6.2, 1.6, 1.4); // rear brim
  ctx.fillStyle = pal.helmetLight;
  ctx.fillRect(1.4, -6.4, 1.4, 1.2); // brow
  // visor / goggles glow
  ctx.fillStyle = "#0a0f14";
  ctx.fillRect(0.2, -4.6, 2.2, 1.5);
  ctx.fillStyle = pal.visor;
  ctx.fillRect(0.5, -4.4, 1.7, 0.9);
  // breathing mask detail
  ctx.fillStyle = pal.helmet;
  ctx.fillRect(0.4, -3, 1.9, 1.2);
  ctx.restore();

  // ── Arms ──
  const shoulderY = -torsoH + 1.6;
  // rear arm
  ctx.save();
  ctx.translate(-1.6, shoulderY);
  ctx.rotate(pose.armBackAngle);
  ctx.fillStyle = pal.torsoShade;
  ctx.fillRect(-0.9, 0, 1.8, 5.4);
  ctx.fillStyle = pal.skinShade;
  ctx.fillRect(-0.8, 4.8, 1.6, 1.4);
  ctx.restore();
  // front arm — reaches toward the weapon grip
  ctx.save();
  ctx.translate(1.4, shoulderY);
  ctx.rotate(pose.armFrontAngle);
  ctx.fillStyle = pal.torsoLight;
  ctx.fillRect(-1, 0, 2, 5.8);
  ctx.fillStyle = pal.vestPlate;
  ctx.fillRect(-1, 1.4, 2, 1.2); // elbow pad
  ctx.fillStyle = pal.skin;
  ctx.fillRect(-0.9, 5.2, 1.8, 1.6); // glove
  ctx.restore();

  ctx.restore(); // torso

  // ── Rim light on the facing edge (sells the "HD" look) ──
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(140, 210, 255, 0.22)";
  ctx.fillRect(3.1, hipY - 8.4, 0.8, 7.4);
  ctx.fillRect(2.6, hipY - 15.6, 0.8, 3.2);
  ctx.restore();

  // ── Contact shadow already drawn by the caller; add ambient occlusion ──
  ctx.save();
  const ao = ctx.createLinearGradient(0, hipY - 2, 0, 1.5);
  ao.addColorStop(0, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = ao;
  ctx.fillRect(-4, hipY - 2, 8, 3.5);
  ctx.restore();

  return { shoulderX: 1.4, shoulderY: chestY - 6.4 };
}

/**
 * Draw a weapon silhouette centred on the hand anchor, pointing along `angle`.
 * Distinct shapes per class so players can read what the enemy carries.
 */
export function drawWeaponSprite(ctx, x, y, angle, weaponClass, opts = {}) {
  const { alpha = 1, recoil = 0 } = opts;
  const u = UNIT;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);

  const metal = "#1c2126";
  const metalLight = "#39424a";
  const grip = "#12161a";
  const accent = "#5b666f";

  const kick = -recoil * 3; // muzzle pushed back on recoil

  if (weaponClass === "knife") {
    ctx.fillStyle = grip;
    ctx.fillRect(0, -1, 4, 2);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(4, -1.2, 9, 1.6);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(4, -1.2, 9, 0.6);
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
    ctx.fillRect(0, -2.2, 26 + kick, 3.6);
    ctx.fillStyle = metalLight;
    ctx.fillRect(2, -3, 16 + kick, 1.4);
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(1, 1, 5, 2.6); // wooden pump
    ctx.fillStyle = grip;
    ctx.fillRect(-3, -0.4, 5, 2.4);
    ctx.restore();
    return;
  }
  if (weaponClass === "sniper") {
    ctx.fillStyle = metal;
    ctx.fillRect(-2, -1.8, 30 + kick, 3);
    ctx.fillStyle = metalLight;
    ctx.fillRect(6, -2.6, 12, 1.2);
    ctx.fillStyle = "#0b0f12";
    ctx.fillRect(9, -5.6, 9, 2.8); // scope
    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(16.4, -5, 1.6, 1.6); // lens glint
    ctx.fillStyle = grip;
    ctx.fillRect(-1, 0.8, 4, 3);
    ctx.fillRect(14, 1, 2, 2.4); // bipod-ish grip
    ctx.restore();
    return;
  }
  if (weaponClass === "dmr") {
    ctx.fillStyle = metal;
    ctx.fillRect(-1, -1.8, 24 + kick, 2.8);
    ctx.fillStyle = metalLight;
    ctx.fillRect(2, -2.6, 10, 1.2);
    ctx.fillStyle = "#0b0f12";
    ctx.fillRect(10, -4, 5, 1.8);
    ctx.fillStyle = grip;
    ctx.fillRect(0, 0.8, 3.4, 3);
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

  // rifle (default) — slimmer than the body so it reads as a held weapon
  ctx.fillStyle = metal;
  ctx.fillRect(-1.4, -1.4, 16 + kick, 2.4);
  ctx.fillStyle = metalLight;
  ctx.fillRect(1.6, -2.1, 8, 0.9);
  ctx.fillStyle = accent;
  ctx.fillRect(13.4 + kick, -1.1, 2, 1.5); // muzzle brake
  ctx.fillStyle = grip;
  ctx.fillRect(1, 0.8, 2, 3.4); // magazine
  ctx.fillRect(-1.2, 0.7, 2, 1.8); // stock/grip
  ctx.restore();
}
