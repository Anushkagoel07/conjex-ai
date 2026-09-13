import Panel from "./Panel";
import { useUtcClock, formatClock } from "../hooks/useUtcClock";
import {
  formatKm,
  formatTMinus,
  formatUtc,
  riskLevel,
} from "../lib/format";
import "./EventTimeline.css";

const EARLY_MINUTES = 30;

/**
 * Mission-style sequence for the selected conjunction:
 * detection → current state → TCA → recommended maneuver.
 * Only timestamps that exist in the data are shown; the "now" node ticks
 * live so operators can see where the event stands.
 */
export default function EventTimeline({ event, avoidance, maneuverMatched }) {
  const now = useUtcClock();
  if (!event) return null;

  const tcaMs = new Date(event.time).getTime();
  const nowMs = now.getTime();
  const validTca = !Number.isNaN(tcaMs);
  const minutesToTca = validTca ? (tcaMs - nowMs) / 60000 : null;
  const tMinus = validTca ? formatTMinus(event.time, now) : null;
  const passed = typeof minutesToTca === "number" && minutesToTca <= 0;
  const level = riskLevel(event) || "low";

  // Burn epoch exists only when the backend's simulated avoidance scenario
  // refers to this specific event.
  const maneuverTime =
    maneuverMatched && avoidance?.maneuver_time ? avoidance.maneuver_time : null;

  const nodes = [
    {
      key: "detect",
      label: "Detection",
      value: "Catalog screening pass",
      detail: `${formatKm(event.minimum_distance_km)} km miss inside the screening threshold`,
    },
    {
      key: "now",
      label: "Current state",
      value: `Now · ${formatClock(now)}Z`,
      detail: passed
        ? "Closest approach has passed"
        : minutesToTca != null && minutesToTca < EARLY_MINUTES
          ? `TCA in ${Math.round(minutesToTca)} min — inside maneuver decision window`
          : "Tracking nominal",
    },
    {
      key: "tca",
      label: "Time of approach",
      value: validTca ? formatUtc(event.time, { seconds: false }) : "—",
      detail: tMinus ? `Event epoch ${tMinus}` : "Forecast epoch unavailable",
    },
    {
      key: "maneuver",
      label: "Recommended maneuver",
      value: maneuverTime ? formatUtc(maneuverTime, { seconds: false }) : "None for this event",
      detail: maneuverTime
        ? `${avoidance.delta_v_m_s} m/s simulated burn`
        : "Simulated maneuver covers a different event",
    },
  ];

  // Step progress: how far the live clock has advanced through the sequence.
  const currentIndex = passed ? 2 : 1;

  return (
    <Panel eyebrow="Sequence" title="Event timeline" tag={event.risk_level || "—"}>
      <ol className={`timeline risk-${level}`}>
        {nodes.map((node, index) => (
          <li
            key={node.key}
            className={`timeline-node ${index <= currentIndex ? "reached" : ""} ${index === currentIndex ? "current" : ""}`}
          >
            <span className="timeline-marker" aria-hidden="true" />
            <div className="timeline-content">
              <span className="timeline-label">{node.label}</span>
              <strong className="timeline-value mono">{node.value}</strong>
              <span className="timeline-detail">{node.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
