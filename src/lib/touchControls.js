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
];
export const DEFAULT_TOUCH_LAYOUT = { scale: 1, positions: {} };

export function clampTouchOffset(value) {
  return Math.max(-0.45, Math.min(0.45, value));
}

export function loadTouchLayout() {
  if (typeof window === "undefined") return DEFAULT_TOUCH_LAYOUT;
  try {
    const saved = JSON.parse(localStorage.getItem(TOUCH_LAYOUT_KEY));
    if (!saved || typeof saved !== "object") return DEFAULT_TOUCH_LAYOUT;
    const scale = Number(saved.scale);
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
    };
  } catch {
    return DEFAULT_TOUCH_LAYOUT;
  }
}

export function saveTouchLayout(layout) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUCH_LAYOUT_KEY, JSON.stringify(layout));
}
