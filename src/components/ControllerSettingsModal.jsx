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

export default function ControllerSettingsModal({ onClose }) {
  const [layout, setLayout] = useState(loadTouchLayout);
  const [selected, setSelected] = useState("jump");
  const previewRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    saveTouchLayout(layout);
  }, [layout]);

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
    target.setPointerCapture(event.pointerId);
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
            <div className="controller-settings-eyebrow">TACTICAL SYSTEMS</div>
            <h2 id="controller-settings-title">Controller settings</h2>
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
          Drag a control to move it, then use the size slider to resize that
          button on its own. Changes apply to your next match and are saved on
          this device.
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
            TOUCH LAYOUT PREVIEW
          </span>
          {TOUCH_CONTROL_IDS.map((id) => {
            const position = layout.positions[id] || { x: 0, y: 0 };
            const controlPosition = getTouchControlPosition(id, position);
            const isStick = id === "move" || id === "aim";
            const Icon = CONTROL_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                data-control-id={id}
                aria-label={`${CONTROL_LABELS[id]} control${id === selected ? " (selected)" : ""}`}
                className={`controller-settings-control ${isStick ? "controller-settings-control--stick" : ""} ${id === "aim" ? "controller-settings-control--aim" : ""} ${id === selected ? "is-selected" : ""}`}
                style={{
                  left: `${controlPosition.x * 100}%`,
                  top: `${controlPosition.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${layout.scale * sizeOf(id)})`,
                }}
              >
                <Icon size={18} strokeWidth={3} />
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

        <div className="controller-settings-actions">
          <div className="controller-settings-buttons">
            <button
              type="button"
              className="controller-settings-button"
              onClick={() => setLayout(DEFAULT_TOUCH_LAYOUT)}
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
