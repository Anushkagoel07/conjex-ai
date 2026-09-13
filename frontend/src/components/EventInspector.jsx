import Panel from "./Panel";
import { formatKm, formatUtc, formatVelocity } from "../lib/format";
import "./EventInspector.css";

/** Risk-band placement on a 0–100 AI risk score. */
function riskBand(score) {
  const value = Number(score) || 0;
  if (value >= 66) return "high";
  if (value >= 33) return "medium";
  return "low";
}

export default function EventInspector({ event }) {
  const level = event?.risk_level?.toLowerCase() || "low";
  const band = riskBand(event?.risk_score);

  return (
    <Panel
      eyebrow="Selected event"
      title="Conjunction assessment"
      tag={event?.risk_level || "—"}
      className={`inspector-panel risk-${level}`}
      headerExtra={
        <span className={`severity-pill ${level}`}>
          <span className="severity-dot" />
          {event?.risk_level || "—"}
        </span>
      }
    >
      {!event ? (
        <div className="inspector-empty">
          Select a conjunction from the catalog.
        </div>
      ) : (
        <div className="inspector-body">
          <div className="objects-duel">
            <div className="object-block primary">
              <span className="object-role">Spacecraft</span>
              <strong className="object-name">{event.satellite_name}</strong>
              <span className="object-norad">
                NORAD {event.satellite_norad}
              </span>
            </div>

            <div className="duel-link" aria-hidden="true">
              <span className="duel-line" />
              <span className="duel-arrow">⇄</span>
              <span className="duel-line" />
            </div>

            <div className="object-block debris">
              <span className="object-role">Debris object</span>
              <strong className="object-name">{event.debris_name}</strong>
              <span className="object-norad">NORAD {event.debris_norad}</span>
            </div>
          </div>

          <div className="risk-score-block">
            <div className="risk-score-head">
              <span className="metric-label">Screening risk score</span>
              <span className={`risk-score-value ${band}`}>
                {event.risk_score}
                <small>/100</small>
              </span>
            </div>
            <div className="risk-gauge">
              <div
                className={`risk-gauge-fill ${band}`}
                style={{ width: `${Math.max(2, Math.min(100, event.risk_score))}%` }}
              />
              <span className="gauge-tick t25" />
              <span className="gauge-tick t50" />
              <span className="gauge-tick t75" />
            </div>
            <p className="risk-score-note">
              AI-assisted screening index — not a collision probability.
            </p>
          </div>

          <div className="inspector-metrics">
            <div className="imetric">
              <span className="metric-label">Closest distance</span>
              <strong className="metric-value">
                {formatKm(event.minimum_distance_km)}
                <small> km</small>
              </strong>
            </div>
            <div className="imetric">
              <span className="metric-label">Relative velocity</span>
              <strong className="metric-value">
                {formatVelocity(event.relative_velocity_km_s)}
                <small> km/s</small>
              </strong>
            </div>
            <div className="imetric">
              <span className="metric-label">Time of approach</span>
              <strong className="metric-value metric-time">
                {formatUtc(event.time)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
