// PadIcons.jsx — the battlefield pad glyphs.
//
// Arrow glyphs don't say what a combat button does, so the movement pad uses
// small operator pictograms instead: a trooper leaping with a rifle levelled
// for JUMP, and one dropping through a hatch for DOWN. Everything is line art
// in `currentColor` so the buttons keep their own active/idle colours.
const base = (size, strokeWidth) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
});

// A trooper in mid-leap: head, torso, legs tucked up, rifle out front, and a
// couple of speed lines behind to sell the jump.
export function JumpIcon({ size = 22, strokeWidth = 2.2, className }) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="10.5" cy="5" r="1.9" />
      <path d="M10.5 7.2 12 11.6" />
      <path d="M12 11.6 15.2 13.4" />
      <path d="M12 11.6 9 13.6 7 12.6" />
      <path d="M11.4 8.6h5.8" />
      <path d="M15.4 8.6v2" />
      <path d="M3.2 8.2h2.4" />
      <path d="M2.4 12.4h3" />
    </svg>
  );
}

// A trooper dropping away — head, torso, tucked legs, muzzle angled down and
// two chevrons underneath pointing at the lower level.
export function DropIcon({ size = 22, strokeWidth = 2.2, className }) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="12" cy="6" r="1.9" />
      <path d="M12 8.2v4.6" />
      <path d="M12 12.8 9.4 15.6" />
      <path d="M12 12.8 14.8 15" />
      <path d="M12.6 9.8 18 13.6" />
      <path d="M15.4 13.2 17.4 12.2" />
      <path d="M5.4 16.4 7.6 18.6 9.8 16.4" />
      <path d="M5.4 20 7.6 22.2 9.8 20" />
    </svg>
  );
}
