import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Bomb,
  Crosshair,
  Hand,
  Move,
  RotateCw,
} from "lucide-react";
import {
  DEFAULT_TOUCH_LAYOUT,
  MAX_TOUCH_SIZE,
  MIN_TOUCH_SIZE,
  TOUCH_CONTROL_ANCHORS,
  TOUCH_CONTROL_IDS,
  clampTouchOffset,
  clampTouchSize,
  getTouchControlPosition,
  loadTouchLayout,
  saveTouchLayout,
} from "@/lib/touchControls";

const CONTROL_LABELS = {
  move: "MOVE",
  jump: "JUMP",
  down: "DOWN",
  swap: "SWAP",
  reload: "RELOAD",
  grenade: "GRENADE",
  aim: "AIM / FIRE",
  use: "USE",
};

// Same glyphs the match uses, so the editor and the pad look identical.
const CONTROL_ICONS = {
  move: Move,
  jump: ArrowUp,
  down: ArrowDown,
  swap: ArrowLeftRight,
  reload: RotateCw,
  grenade: Bomb,
  aim: Crosshair,
  use: Hand,
};

/**
 * Touch controller editor.
 *
 * The preview deliberately reuses the real in-match widget classes
 * (touch-stick / touch-button) at the real anchors and scale, so what you drag
 * here is exactly what you get when the match starts.
 *
 * Tapping a control selects it; the selected control gets its own size slider
 * on top of the global pad size.
 */
export default function ControllerSettingsModal({ onClose }) {
  const [layout, setLayout] = useState(loadTouchLayout);
  const [selected, setSelected] = useState("jump");
  // The arena is 960x540. Widgets keep their in-game pixel size, so the whole
  // pad is scaled by the ratio between the preview and a real match screen.
  const [stageScale, setStageScale] = useState(0.6);
  const previewRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    saveTouchLayout(layout);
  }, [layout]);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return undefined;
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setStageScale(width / 960);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const sizeOf = (id) => layout.sizes?.[id] ?? 1;
  const setSize = (id, value) =>
    setLayout((current) => ({
      ...current,
      sizes: { ...current.sizes, [id]: clampTouchSize(value) },
    }));

  const startDrag = (event) => {
    const target = event.target.closest("[data-control-id]");
    if (!target || !event.currentTarget.contains(target)) return;
    event.preventDefault();
    event.stopPropagation();
    const id = target.dataset.controlId;
    setSelected(id); // tapping a control selects it for resizing
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: layout.positions[id] || { x: 0, y: 0 },
    };
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !rect) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = TOUCH_CONTROL_ANCHORS[drag.id];
    const position = {
      x: clampTouchOffset(
        Math.max(
          0.06,
          Math.min(
            0.94,
            anchor.x +
              drag.origin.x +
              (event.clientX - drag.startX) / rect.width,
          ),
        ) - anchor.x,
      ),
      y: clampTouchOffset(
        Math.max(
          0.1,
          Math.min(
            0.9,
            anchor.y +
              drag.origin.y +
              (event.clientY - drag.startY) / rect.height,
          ),
        ) - anchor.y,
      ),
    };
    setLayout((current) => ({
      ...current,
      positions: { ...current.positions, [drag.id]: position },
    }));
  };

  const finishDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
  };

  const selectedSize = sizeOf(selected);

  return (
    <div
      className="controller-settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="controller-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="controller-settings-title"
      >
        <div className="controller-settings-header">
          <div>
            <div className="controller-settings-eyebrow">TOUCH CONTROLLER</div>
            <h2 id="controller-settings-title">Match controller</h2>
          </div>
          <button
            type="button"
            className="controller-settings-close"
            aria-label="Close controller settings"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="controller-settings-help">
          This is the live match screen. Drag any control to move it, tap one to
          select it, then use its size slider to resize that button on its own.
          The preview uses the same positions and sizes the match will use.
        </p>

        <div
          ref={previewRef}
          className="controller-settings-preview"
          onPointerDownCapture={startDrag}
          onPointerMoveCapture={moveDrag}
          onPointerUpCapture={finishDrag}
          onPointerCancelCapture={finishDrag}
        >
          <span className="controller-settings-preview__title">
            LIVE MATCH LAYOUT
          </span>

          {/* Static mock of the in-match HUD so the layout is judged in context */}
          <div className="controller-settings-hud" aria-hidden="true">
            <div className="controller-settings-hud__panel">
              <span className="controller-settings-hud__name">CALLSIGN</span>
              <span className="controller-settings-hud__bar">
                <i />
              </span>
              <span className="controller-settings-hud__meta">AR-15 · 30/30</span>
            </div>
            <div className="controller-settings-hud__score">
              <span>★ 0</span>
              <b>VS</b>
              <span>★ 0</span>
            </div>
          </div>

          {TOUCH_CONTROL_IDS.map((id) => {
            const position = layout.positions[id] || { x: 0, y: 0 };
            const controlPosition = getTouchControlPosition(id, position);
            const isStick = id === "move" || id === "aim";
            const Icon = CONTROL_ICONS[id];
            const className = [
              isStick ? "touch-stick" : "touch-button touch-button--wide",
              id === "move" ? "touch-stick--move" : "",
              id === "aim" ? "touch-stick--aim" : "",
              "controller-settings-ghost",
              id === selected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={id}
                type="button"
                data-control-id={id}
                aria-label={`${CONTROL_LABELS[id]} control — drag to reposition${id === selected ? " (selected)" : ""}`}
                className={className}
                style={{
                  left: `${controlPosition.x * 100}%`,
                  top: `${controlPosition.y * 100}%`,
                  "--touch-control-scale": String(
                    layout.scale * sizeOf(id) * stageScale,
                  ),
                }}
              >
                {isStick ? (
                  <>
                    <span className="touch-stick__label">
                      <Icon size={13} strokeWidth={3} />
                    </span>
                    <span className="touch-stick__thumb" />
                  </>
                ) : (
                  <Icon size={20} strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>

        <div className="controller-settings-size-row">
          <label className="controller-settings-size">
            <span>{CONTROL_LABELS[selected]} size</span>
            <input
              type="range"
              min={MIN_TOUCH_SIZE}
              max={MAX_TOUCH_SIZE}
              step="0.05"
              value={selectedSize}
              onChange={(event) => setSize(selected, Number(event.target.value))}
            />
            <span>{Math.round(selectedSize * 100)}%</span>
          </label>
          <button
            type="button"
            className="controller-settings-button controller-settings-button--small"
            onClick={() => setSize(selected, 1)}
          >
            Reset this control
          </button>
        </div>

        <div className="controller-settings-actions">
          <label className="controller-settings-size">
            <span>All controls</span>
            <input
              type="range"
              min="0.65"
              max="1.5"
              step="0.05"
              value={layout.scale}
              onChange={(event) =>
                setLayout((current) => ({
                  ...current,
                  scale: Number(event.target.value),
                }))
              }
            />
            <span>{Math.round(layout.scale * 100)}%</span>
          </label>
          <div className="controller-settings-buttons">
            <button
              type="button"
              className="controller-settings-button"
              onClick={() =>
                setLayout({ ...DEFAULT_TOUCH_LAYOUT, positions: {} })
              }
            >
              Reset layout
            </button>
            <button
              type="button"
              className="controller-settings-button controller-settings-button--primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
