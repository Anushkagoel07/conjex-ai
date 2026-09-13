import { CLOSE_APPROACH_WINDOW_MIN } from "../lib/api";
import {
  formatDeltaV,
  formatKm,
  formatUtc,
} from "../lib/format";
import "./CloseApproachChart.css";

const W = 920;
const H = 560;
const M = { top: 26, right: 26, bottom: 40, left: 64 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/**
 * The modeled separation improvement (km-scale) is invisible next to the
 * tens-of-thousands-km encounter geometry, so the post-maneuver track is
 * drawn with its offset exaggerated by this factor. The exaggeration is
 * stated on the plot; the underlying values are never altered.
 */
const OFFSET_EXAGGERATION = 250;

/** Round tick step (1/2/5 × 10^k) for a span. */
function tickStep(span, target = 5) {
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return step * mag;
}

function buildTicks(min, max) {
  const step = tickStep(max - min);
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step / 2; v += step) {
    ticks.push(v);
  }
  return ticks;
}

function pathFrom(points, x, y) {
  return points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`,
    )
    .join(" ");
}

/**
 * Local close-approach view around TCA, drawn from the backend's SGP4
 * ephemeris in the encounter plane (x along the satellite's velocity).
 * Solid amber = original track, dashed = post-maneuver track, red =
 * debris, X = true closest approach, circle = maneuver point.
 *
 * The post-maneuver track is the recorded trajectory from the burn epoch
 * onward, displaced by the backend's modeled separation improvement along
 * the burn-epoch direction of flight (Δv × lead time) — no trajectory is
 * invented.
 */
export default function CloseApproachChart({ geometry, avoidance }) {
  if (!geometry) return null;

  const { bounds, satSeries, debSeries, closestApproach } = geometry;
  const x = (v) =>
    M.left + ((v - bounds.minX) / (bounds.maxX - bounds.minX)) * PLOT_W;
  const y = (v) =>
    M.top + PLOT_H - ((v - bounds.minY) / (bounds.maxY - bounds.minY)) * PLOT_H;

  const xTicks = buildTicks(bounds.minX, bounds.maxX);
  const yTicks = buildTicks(bounds.minY, bounds.maxY);

  const dvLabel = `${formatDeltaV(avoidance?.delta_v_m_s)} m/s`;
  const tcaMs = closestApproach.epoch;
  const maneuverEpoch = geometry.maneuverEpoch;
  const minutesLabel =
    maneuverEpoch != null
      ? `${maneuverEpoch <= tcaMs ? "−" : "+"}${Math.round(
          Math.abs(maneuverEpoch - tcaMs) / 60000,
        )} min`
      : null;

  // Post-maneuver track: original samples after the burn, displaced by the
  // modeled separation change along the direction of flight at the burn.
  let postPoints = null;
  if (maneuverEpoch != null && avoidance?.miss_distance_improvement_km != null) {
    const burnIdx = satSeries.epochs.indexOf(maneuverEpoch);
    if (burnIdx >= 0 && burnIdx < satSeries.points.length - 1) {
      const dir = [
        closestApproach.satellite[0] - geometry.maneuverPoint[0],
        closestApproach.satellite[1] - geometry.maneuverPoint[1],
      ];
      const len = Math.hypot(dir[0], dir[1]);
      if (len > 0) {
        const offset = [
          (dir[0] / len) *
            Number(avoidance.miss_distance_improvement_km) *
            OFFSET_EXAGGERATION,
          (dir[1] / len) *
            Number(avoidance.miss_distance_improvement_km) *
            OFFSET_EXAGGERATION,
        ];
        postPoints = satSeries.points
          .slice(burnIdx + 1)
          .map((p) => [p[0] + offset[0], p[1] + offset[1]]);
      }
    }
  }

  return (
    <figure className="ca-chart">
      <div className="ca-chart-head">
        <div>
          <h4 className="ca-chart-title">
            Relative Trajectories (Close Approach View)
          </h4>
          <p className="ca-chart-sub mono">
            Time window: ±{CLOSE_APPROACH_WINDOW_MIN} minutes around TCA
          </p>
        </div>
        <span className="ca-projection mono">
          encounter plane · x along velocity
        </span>
      </div>

      <div className="ca-chart-frame">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Close approach geometry chart"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid + axes */}
          {xTicks.map((v) => (
            <g key={`gx${v}`}>
              <line
                x1={x(v)}
                x2={x(v)}
                y1={M.top}
                y2={M.top + PLOT_H}
                className="ca-grid"
              />
              <text
                x={x(v)}
                y={M.top + PLOT_H + 24}
                className="ca-axis-label mono"
                textAnchor="middle"
              >
                {v.toFixed(0)}
              </text>
            </g>
          ))}
          {yTicks.map((v) => (
            <g key={`gy${v}`}>
              <line
                x1={M.left}
                x2={M.left + PLOT_W}
                y1={y(v)}
                y2={y(v)}
                className="ca-grid"
              />
              <text
                x={M.left - 9}
                y={y(v) + 3.5}
                className="ca-axis-label mono"
                textAnchor="end"
              >
                {v.toFixed(0)}
                <tspan className="ca-axis-unit"> km</tspan>
              </text>
            </g>
          ))}
          <line
            x1={M.left}
            x2={M.left + PLOT_W}
            y1={M.top + PLOT_H}
            y2={M.top + PLOT_H}
            className="ca-axis-line"
          />

          {/* Post-maneuver track (dashed) behind the original */}
          {postPoints && (
            <path
              d={pathFrom(postPoints, x, y)}
              className="ca-line post"
              fill="none"
            />
          )}

          {/* Debris track */}
          <path
            d={pathFrom(debSeries.points, x, y)}
            className="ca-line debris"
            fill="none"
          />

          {/* Original satellite track */}
          <path
            d={pathFrom(satSeries.points, x, y)}
            className="ca-line original"
            fill="none"
          />

          {/* Closest approach: TCA separation line + X marker */}
          <line
            x1={x(closestApproach.satellite[0])}
            y1={y(closestApproach.satellite[1])}
            x2={x(closestApproach.debris[0])}
            y2={y(closestApproach.debris[1])}
            className="ca-ca-line"
          />
          <g
            transform={`translate(${x(closestApproach.satellite[0])}, ${y(
              closestApproach.satellite[1],
            )})`}
          >
            <line x1={-6} y1={-6} x2={6} y2={6} className="ca-marker-x" />
            <line x1={-6} y1={6} x2={6} y2={-6} className="ca-marker-x" />
            <text x={12} y={22} className="ca-annot ca-annot-strong">
              Closest Approach
            </text>
            <text x={12} y={36} className="ca-annot mono">
              {formatKm(closestApproach.distance)} km
            </text>
            <text x={12} y={50} className="ca-annot mono">
              {formatUtc(closestApproach.epoch, { seconds: false })}
            </text>
          </g>

          {/* Maneuver point */}
          {geometry.maneuverPoint && (
            <g
              transform={`translate(${x(geometry.maneuverPoint[0])}, ${y(
                geometry.maneuverPoint[1],
              )})`}
            >
              <circle r={5.5} className="ca-marker-maneuver" />
              <text
                x={0}
                y={-18}
                className="ca-annot ca-annot-strong"
                textAnchor="middle"
              >
                Maneuver
              </text>
              <text
                x={0}
                y={-5}
                className="ca-annot mono"
                textAnchor="middle"
              >
                {`Δv = ${dvLabel}`}
              </text>
              {minutesLabel && (
                <text x={0} y={22} className="ca-annot mono" textAnchor="middle">
                  {minutesLabel}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <figcaption className="ca-legend">
        <span className="ca-legend-item">
          <span className="legend-line original" aria-hidden="true" />
          Original satellite
        </span>
        <span className="ca-legend-item">
          <span className="legend-line post" aria-hidden="true" />
          {`After ${dvLabel} avoidance`}
        </span>
        <span className="ca-legend-item">
          <span className="legend-line debris" aria-hidden="true" />
          Debris
        </span>
        <span className="ca-legend-item">
          <span className="legend-x" aria-hidden="true">✕</span>
          Closest approach
        </span>
        <span className="ca-legend-item">
          <span className="legend-dot" aria-hidden="true" />
          Maneuver point
        </span>
        {avoidance?.miss_distance_improvement_km != null && (
          <span className="ca-legend-note mono">
            post-maneuver offset ×{OFFSET_EXAGGERATION} for visibility ·
            modeled improvement {formatKm(avoidance.miss_distance_improvement_km)} km
          </span>
        )}
      </figcaption>
    </figure>
  );
}
