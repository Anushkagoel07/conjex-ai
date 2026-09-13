import Panel from "./Panel";
import {
  formatDeltaV,
  formatKm,
  formatMass,
  formatPercent,
  formatUsd,
  formatUtc,
} from "../lib/format";
import "./AvoidancePanel.css";

/**
 * Avoidance recommendation. Everything shown comes from
 * /api/dashboard.avoidance: the recommended burn, fuel estimate
 * (Tsiolkovsky screening estimate) and the maneuver trade-off ladder.
 */
export default function AvoidancePanel({ avoidance }) {
  if (!avoidance) return null;

  const original = Number(avoidance.original_miss_distance_km) || 0;
  const improved = Number(avoidance.new_miss_distance_km) || original;
  const scale = Math.max(original, improved) || 1;
  const fuel = avoidance.fuel;
  const candidates = Array.isArray(avoidance.tradeoff_candidates)
    ? avoidance.tradeoff_candidates
    : [];

  return (
    <Panel
      id="section-avoidance"
      eyebrow="Recommended action"
      title="Avoidance maneuver"
      className="avoid-panel"
      headerExtra={
        <span className="avoid-context mono">
          {avoidance.satellite} ↔ {avoidance.debris}
        </span>
      }
      tag={
        <span className="simulated-tag">
          <span className="simulated-dot" aria-hidden="true" />
          SIMULATED
        </span>
      }
    >
      <div className="avoid-body">
        <div className="avoid-primary">
          <div className="avoid-dv">
            <span className="metric-label">Recommended Δv</span>
            <strong className="avoid-dv-value">
              {formatDeltaV(avoidance.delta_v_m_s)}
              <small> m/s</small>
            </strong>
            {avoidance.selection_reason && (
              <span className="avoid-dv-note">{avoidance.selection_reason}</span>
            )}
          </div>

          <div className="avoid-rows">
            {avoidance.maneuver_direction && (
              <div className="avoid-row">
                <span>Maneuver direction</span>
                <strong className="mono">{avoidance.maneuver_direction}</strong>
              </div>
            )}
            {avoidance.maneuver_time && (
              <div className="avoid-row">
                <span>Burn epoch</span>
                <strong className="mono">
                  {formatUtc(avoidance.maneuver_time, { seconds: false })}
                  {avoidance.maneuver_minutes_before_tca != null && (
                    <small>
                      {" "}
                      · {avoidance.maneuver_minutes_before_tca} min before TCA
                    </small>
                  )}
                </strong>
              </div>
            )}
            {avoidance.target_miss_distance_km != null && (
              <div className="avoid-row">
                <span>Separation target</span>
                <strong className="mono">
                  {formatKm(avoidance.target_miss_distance_km)} km
                  <small>{avoidance.target_reached ? " · reached" : " · not reached"}</small>
                </strong>
              </div>
            )}

            <div className="sep-bar">
              <div className="sep-bar-track" aria-hidden="true">
                <div
                  className="sep-bar-fill before"
                  style={{ width: `${(original / scale) * 100}%` }}
                />
                <div
                  className="sep-bar-fill after"
                  style={{ width: `${(improved / scale) * 100}%` }}
                />
              </div>
              <div className="sep-bar-labels">
                <span>
                  Before <strong className="mono">{formatKm(original)} km</strong>
                </span>
                <span>
                  After <strong className="mono">{formatKm(improved)} km</strong>
                </span>
              </div>
            </div>

            <div className="improvement-box">
              <div>
                <span className="metric-label">Separation improvement</span>
                <strong className="improvement-value">
                  +{formatKm(avoidance.miss_distance_improvement_km)} km
                </strong>
              </div>
              <span className="improvement-percent">
                +{formatPercent(avoidance.improvement_percent)}%
              </span>
            </div>
          </div>
        </div>

        {fuel && (
          <div className="avoid-fuel">
            <span className="metric-label">Propellant estimate</span>
            <div className="fuel-stats">
              <div className="fuel-stat">
                <span className="metric-label">Propellant mass</span>
                <strong className="mono">
                  {formatMass(fuel.propellant_mass_kg)}
                  <small> kg</small>
                </strong>
              </div>
              <div className="fuel-stat">
                <span className="metric-label">Estimated cost</span>
                <strong className="mono">{formatUsd(fuel.estimated_propellant_cost_usd)}</strong>
              </div>
            </div>
            <p className="fuel-note">
              {fuel.method}. {fuel.assumption_note}
            </p>
          </div>
        )}

        {candidates.length > 0 && (
          <div className="avoid-tradeoff">
            <span className="metric-label">Maneuver trade-off</span>
            <div className="tradeoff-scroll">
              <table className="tradeoff-table">
                <thead>
                  <tr>
                    <th>Δv</th>
                    <th className="num">Predicted separation</th>
                    <th className="num">Improvement</th>
                    <th className="num">Propellant</th>
                    <th className="num">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((option) => {
                    const recommended =
                      Number(option.delta_v_m_s) === Number(avoidance.delta_v_m_s);
                    return (
                      <tr
                        key={option.delta_v_m_s}
                        className={recommended ? "recommended" : ""}
                      >
                        <td>
                          <span className="mono">{formatDeltaV(option.delta_v_m_s)} m/s</span>
                          {recommended && <span className="rec-badge">Recommended</span>}
                        </td>
                        <td className="num mono">{formatKm(option.new_miss_distance_km)} km</td>
                        <td className="num mono">
                          +{formatPercent(option.improvement_percent)}%
                        </td>
                        <td className="num mono">
                          {formatMass(option.propellant_mass_kg)} kg
                        </td>
                        <td className="num mono">
                          {formatUsd(option.estimated_propellant_cost_usd)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {candidates.some((option) => option.target_reached === false) && (
              <p className="tradeoff-note">
                Options marked below the separation target did not reach{" "}
                {formatKm(avoidance.target_miss_distance_km)} km.
              </p>
            )}
          </div>
        )}

        {avoidance.limitation && (
          <p className="avoid-limit">{avoidance.limitation}</p>
        )}
      </div>
    </Panel>
  );
}
