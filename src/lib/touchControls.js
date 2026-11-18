export const TOUCH_LAYOUT_KEY = "clash_of_mercy_touch_layout_v1";
export const TOUCH_CONTROL_IDS = [
  "move",
  "jump",
  "down",
  "swap",
  "reload",
  "grenade",
  "aim",
  "use",
  "skill",
];
export const TOUCH_CONTROL_ANCHORS = {
  move: { x: 0.07, y: 0.86 },
  jump: { x: 0.14, y: 0.62 },
  down: { x: 0.14, y: 0.76 },
  swap: { x: 0.14, y: 0.9 },
  reload: { x: 0.78, y: 0.76 },
  grenade: { x: 0.78, y: 0.9 },
  aim: { x: 0.87, y: 0.86 },
  use: { x: 0.94, y: 0.86 },
  skill: { x: 0.7, y: 0.72 },
};
export const DEFAULT_TOUCH_LAYOUT = { scale: 1, positions: {}, sizes: {} };

// Per-control size multiplier: each button can be tuned on its own, on top of
// the global control size.
export const MIN_TOUCH_SIZE = 0.6;
export const MAX_TOUCH_SIZE = 1.8;

export function clampTouchOffset(value) {
  return Math.max(-0.95, Math.min(0.95, value));
}

export function clampTouchSize(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(MIN_TOUCH_SIZE, Math.min(MAX_TOUCH_SIZE, value));
}

// Effective multiplier for one control (global scale × its own size).
export function getTouchControlScale(layout, id) {
  return layout.scale * clampTouchSize(layout.sizes?.[id] ?? 1);
}

export function getTouchControlPosition(id, offset = { x: 0, y: 0 }) {
  const anchor = TOUCH_CONTROL_ANCHORS[id];
  return {
    x: Math.max(0.06, Math.min(0.94, anchor.x + offset.x)),
    y: Math.max(0.1, Math.min(0.9, anchor.y + offset.y)),
  };
}

export function loadTouchLayout() {
  if (typeof window === "undefined") return DEFAULT_TOUCH_LAYOUT;
  try {
    const saved = JSON.parse(localStorage.getItem(TOUCH_LAYOUT_KEY));
    if (!saved || typeof saved !== "object") return DEFAULT_TOUCH_LAYOUT;
    const scale = Number(saved.scale);
    const sizes = {};
    for (const id of TOUCH_CONTROL_IDS) {
      const size = Number(saved.sizes?.[id]);
      if (Number.isFinite(size)) sizes[id] = clampTouchSize(size);
    }
    const positions = {};
    for (const id of TOUCH_CONTROL_IDS) {
      const position = saved.positions?.[id];
      if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
        positions[id] = {
          x: clampTouchOffset(position.x),
          y: clampTouchOffset(position.y),
        };
      }
    }
    return {
      scale: Number.isFinite(scale)
        ? Math.max(0.65, Math.min(1.5, scale))
        : DEFAULT_TOUCH_LAYOUT.scale,
      positions,
      sizes,
    };
  } catch {
    return DEFAULT_TOUCH_LAYOUT;
  }
}

export function saveTouchLayout(layout) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUCH_LAYOUT_KEY, JSON.stringify(layout));
}
