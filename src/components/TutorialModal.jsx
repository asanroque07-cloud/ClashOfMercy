import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Set once the recruit sees (or skips) the tutorial. Replaying it from the
// settings menu never removes the flag, it only reopens this component.
export const TUTORIAL_KEY = "clash_of_mercy_tutorial_done_v1";

const STEPS = [
  {
    tag: "WELCOME",
    title: "Welcome to Clash of Mercy",
    lead: "You are a fresh recruit: Bronze rank, tier 1, no diamonds in the bank. Everything you earn from here is yours.",
    points: [
      "Win matches to climb from Bronze toward Silver, Gold and beyond.",
      "Coins and diamonds come from matches — you start with nothing to spend.",
      "This walkthrough takes about a minute and only appears once.",
    ],
  },
  {
    tag: "STEP 1 / 4",
    title: "Move and climb",
    lead: "Your left thumb drives everything movement related.",
    points: [
      "Drag the MOVE stick left or right to run.",
      "Tap JUMP to hop crates and gaps, DOWN to drop through a ledge.",
      "Press USE at a ladder to climb, or at loot and health kits to grab them.",
    ],
  },
  {
    tag: "STEP 2 / 4",
    title: "Aim and fire",
    lead: "The red stick on the right shoots in the direction you push it.",
    points: [
      "Drag AIM / FIRE to aim and open fire — release to stop shooting.",
      "RELOAD tops up your magazine; it also happens automatically when empty.",
      "GRENADE lobs an explosive and SWAP checks your knife or second slot.",
    ],
  },
  {
    tag: "STEP 3 / 4",
    title: "Win the round",
    lead: "Each round is won by wiping the enemy squad or capturing the flag.",
    points: [
      "Grab the flag in the middle of the map and carry it to your base.",
      "Dead teammates respawn at the start of the next round.",
      "Use walls, bunkers and rooftops for cover — ladders reach the high ground.",
    ],
  },
  {
    tag: "STEP 4 / 4",
    title: "Make it yours",
    lead: "The controller, loadout and settings are all adjustable.",
    points: [
      "Settings → Controller layout lets you drag every button where you want it.",
      "Loadout swaps your weapon, attachments and role (Core, Marksman, Sniper).",
      "Your progress, rank and currency save on this device automatically.",
    ],
  },
];

export default function TutorialModal({ onClose }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // Private mode: the tutorial simply shows again next visit.
    }
    onClose();
  }, [onClose]);

  return (
    <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <section className="tutorial-card">
        <button
          type="button"
          className="tutorial-card__close"
          aria-label="Close tutorial"
          onClick={finish}
        >
          <X size={16} />
        </button>

        <div className="tutorial-card__tag">{step.tag}</div>
        <h2 id="tutorial-title" className="tutorial-card__title">
          {step.title}
        </h2>
        <p className="tutorial-card__lead">{step.lead}</p>

        <ul className="tutorial-card__points">
          {step.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <div className="tutorial-card__dots" aria-hidden="true">
          {STEPS.map((entry, dotIndex) => (
            <span
              key={entry.tag}
              className={`tutorial-card__dot ${dotIndex === index ? "is-active" : ""}`}
            />
          ))}
        </div>

        <div className="tutorial-card__actions">
          <button
            type="button"
            className="tutorial-card__ghost"
            onClick={finish}
          >
            Skip
          </button>
          <div className="tutorial-card__nav">
            <button
              type="button"
              className="tutorial-card__button"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              <ChevronLeft size={14} />
              Back
            </button>
            <button
              type="button"
              className="tutorial-card__button tutorial-card__button--primary"
              onClick={() => (isLast ? finish() : setIndex((value) => value + 1))}
            >
              {isLast ? "Start playing" : "Next"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
