import "./ThemeToggle.css";

/**
 * Moon/sun pill toggle. Swaps the knob to the current target and moves the
 * accent ring, so the control itself communicates the next state.
 */
export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      className={`theme-toggle ${theme}`}
      onClick={onToggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      <svg viewBox="0 0 24 24" className="tt-sun" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        {[
          [12, 2.5, 12, 5],
          [12, 19, 12, 21.5],
          [2.5, 12, 5, 12],
          [19, 12, 21.5, 12],
          [5.3, 5.3, 7, 7],
          [17, 17, 18.7, 18.7],
          [18.7, 5.3, 17, 7],
          [7, 17, 5.3, 18.7],
        ].map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </svg>
      <svg viewBox="0 0 24 24" className="tt-moon" aria-hidden="true">
        <path d="M20.2 14.1A8.3 8.3 0 0 1 9.9 3.8a8.3 8.3 0 1 0 10.3 10.3Z" />
      </svg>
      <span className="tt-knob" />
    </button>
  );
}
