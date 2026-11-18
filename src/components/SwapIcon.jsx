// Two opposing arrows — the SWAP control glyph, inlined so it can be tinted by
// the button (an <img> could not inherit the cream stroke colour).
export default function SwapIcon({ size = 20, strokeWidth = 2, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 7.5L8 7.5M21 7.5L16.6667 3M21 7.5L16.6667 12" />
      <path d="M4 16.5L17 16.5M4 16.5L8.33333 21M4 16.5L8.33333 12" />
    </svg>
  );
}
