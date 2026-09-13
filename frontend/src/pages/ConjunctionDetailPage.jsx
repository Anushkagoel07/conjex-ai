import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import EventInspector from "../components/EventInspector";
import EventTimeline from "../components/EventTimeline";
import {
  formatKm,
  formatScore,
  formatUtc,
} from "../lib/format";
import { findEventByNorad, useWorkspace } from "../lib/workspace";

function TechnicalDetails({ event }) {
  const [open, setOpen] = useState(false);
  const details = [
    {
      label: "Altitude difference",
      value: `${formatKm(event.altitude_difference_km)} km`,
    },
    {
      label: "Inclination difference",
      value: `${formatKm(event.inclination_difference_deg)}°`,
    },
    {
      label: "RAAN difference",
      value: `${formatKm(event.raan_difference_deg)}°`,
    },
    {
      label: "AI anomaly score",
      value: formatScore(event.ai_anomaly_score),
    },
    {
      label: "ML risk label",
      value: `${event.ml_risk_label} (${formatScore(event.ml_confidence)}% confidence)`,
    },
    {
      label: "TCA (full precision)",
      value: formatUtc(event.time),
    },
  ];

  return (
    <section className="tech-details">
      <button
        type="button"
        className="tech-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className={`tech-chevron ${open ? "open" : ""}`} aria-hidden="true">
          ▸
        </span>
        Technical details
      </button>

      {open && (
        <dl className="tech-grid">
          {details.map((detail) => (
            <div key={detail.label} className="tech-row">
              <dt>{detail.label}</dt>
              <dd className="mono">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * Dedicated event page for /conjunctions/:satNorad/:debNorad. Primary
 * information stays simple; orbital-element differences and model internals
 * are progressive disclosure.
 */
export default function ConjunctionDetailPage() {
  const { satNorad, debNorad } = useParams();
  const { conjunctions, avoidance, avoidanceEvent } = useWorkspace();

  const event = findEventByNorad(conjunctions, satNorad, debNorad);

  if (!event) {
    return (
      <main className="page">
        <div className="ops-section-head">
          <div>
            <p className="ops-eyebrow">Event detail</p>
            <h2>Conjunction not found</h2>
          </div>
        </div>
        <div className="panel notfound-panel">
          <p>
            No conjunction with NORAD pair {satNorad} / {debNorad} exists in
            the current screening window.
          </p>
          <Link className="row-link" to="/conjunctions">
            ← Back to conjunctions
          </Link>
        </div>
      </main>
    );
  }

  const maneuverMatched =
    Boolean(avoidanceEvent) &&
    Number(avoidanceEvent.satellite_norad) === Number(event.satellite_norad) &&
    Number(avoidanceEvent.debris_norad) === Number(event.debris_norad);

  const backHref = `/conjunctions#${event.satellite_norad}-${event.debris_norad}`;

  return (
    <main className="page">
      <div className="detail-nav">
        <Link className="back-link" to={backHref}>
          ← All conjunctions
        </Link>
        <span className="detail-id mono">
          NORAD {event.satellite_norad} / {event.debris_norad}
        </span>
      </div>

      <div className="ops-grid">
        <div className="detail-main">
          <EventInspector event={event} />
          <TechnicalDetails event={event} />
        </div>
        <EventTimeline
          event={event}
          avoidance={avoidance}
          maneuverMatched={maneuverMatched}
        />
      </div>
    </main>
  );
}
