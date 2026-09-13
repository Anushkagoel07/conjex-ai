/** Mono-spaced glyph logo for Conjex AI — amber orbital mark. */
export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 32 32"
      role="img"
      aria-label="Conjex AI"
    >
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      <ellipse
        cx="16"
        cy="16"
        rx="12"
        ry="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(-24 16 16)"
      />
      <circle cx="16" cy="16" r="2.8" fill="currentColor" />
      <circle cx="25.4" cy="14.9" r="1.5" fill="currentColor" />
    </svg>
  );
}
