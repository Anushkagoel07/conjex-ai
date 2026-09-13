import { Link } from "react-router-dom";
import {
  formatKm,
  formatScore,
  formatTMinus,
  formatUtcLong,
  formatVelocity,
  riskLevel,
} from "../lib/format";
import { eventRoute } from "../lib/workspace";
import "./HighestRiskPanel.css";

/**
 * The dashboard's headline: the highest-risk conjunction from
 * /api/dashboard.highest_risk, visually first, linking to its detail page.
 */
export default function HighestRiskPanel({ event }) {
  if (!event) return null;

  const level = riskLevel(event) || "low";
  const tMinus = formatTMinus(event.time);

  return (
    <section
      className={`panel highest-panel risk-${level}`}
      aria-label="Priority conjunction"
    >
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-eyebrow">Priority event · closest approach</span>
          <h3>Highest-Risk Conjunction</h3>
        </div>
        <span className={`severity-pill ${level}`}>
          <span className="severity-dot" />
          {event.risk_level || "—"}
        </span>
      </div>

      <div className="highest-body">
        <div className="highest-pair">
          <div className="highest-object">
            <span className="object-role">Spacecraft</span>
            <strong className="object-name">{event.satellite_name}</strong>
            <span className="object-norad mono">NORAD {event.satellite_norad}</span>
          </div>
          <span className="highest-pair-sep" aria-hidden="true">
            <span className="sep-line" />
            <span className="sep-arrows">↕</span>
            <span className="sep-line" />
          </span>
          <div className="highest-object debris">
            <span className="object-role">Debris</span>
            <strong className="object-name">{event.debris_name}</strong>
            <span className="object-norad mono">NORAD {event.debris_norad}</span>
          </div>
        </div>

        <div className="highest-metrics">
          <div className="hmetric">
            <span className="metric-label">Closest distance</span>
            <strong className="mono">
              {formatKm(event.minimum_distance_km)}
              <small> km</small>
            </strong>
          </div>
          <div className="hmetric">
            <span className="metric-label">Relative velocity</span>
            <strong className="mono">
              {formatVelocity(event.relative_velocity_km_s)}
              <small> km/s</small>
            </strong>
          </div>
          <div className="hmetric">
            <span className="metric-label">Time of approach</span>
            <strong className="mono">{formatUtcLong(event.time)}</strong>
            {tMinus && <span className="hmetric-sub mono">{tMinus}</span>}
          </div>
          <div className="hmetric">
            <span className="metric-label">Screening risk</span>
            <strong className={`mono score-${level}`}>
              {formatScore(event.risk_score)}
              <small> /100</small>
            </strong>
          </div>
        </div>

        <Link
          to={eventRoute(event)}
          className={`primary-action ${level}`}
        >
          View event
        </Link>
      </div>
    </section>
  );
}
