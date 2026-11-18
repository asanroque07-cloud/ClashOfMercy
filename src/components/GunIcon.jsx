import { gunArtFor } from "@/lib/gunArt";

// Small picture of a gun, sized by the caller. Purely decorative: the gun name
// is always printed next to it, so the image is hidden from screen readers.
export default function GunIcon({ id, className = "h-6" }) {
  return (
    <img
      src={gunArtFor(id)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block w-auto object-contain select-none align-middle ${className}`}
    />
  );
}
