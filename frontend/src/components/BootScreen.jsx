import { BrandMark } from "./BrandMark";
import "./BootScreen.css";

/**
 * Minimal boot state: a quiet loading line while fetching, or an
 * uplink-error card with a retry action if the API cannot be reached.
 */
export default function BootScreen({ error, onRetry }) {
  return (
    <div className="boot-screen">
      <div className="boot-card">
        <div className="boot-brand">
          <BrandMark />
          <span className="boot-title">CONJEX&nbsp;AI</span>
        </div>

        {error ? (
          <>
            <span className="boot-status boot-error">Data link unavailable</span>
            <p className="boot-detail mono">{error}</p>
            <button type="button" className="boot-retry" onClick={onRetry}>
              Retry connection
            </button>
          </>
        ) : (
          <>
            <span className="boot-status">Establishing data link…</span>
            <div className="boot-bar" aria-hidden="true">
              <span />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
