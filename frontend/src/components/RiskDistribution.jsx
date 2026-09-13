import Panel from "./Panel";
import "./RiskDistribution.css";

/**
 * Compact risk distribution: one bar per severity band, widths scaled to
 * the largest count. Values are the real /api/dashboard counts.
 */
export default function RiskDistribution({ dashboard }) {
  const bands = [
    { key: "high", label: "High", count: dashboard.high_risk, className: "high" },
    { key: "medium", label: "Medium", count: dashboard.medium_risk, className: "medium" },
    { key: "low", label: "Low", count: dashboard.low_risk, className: "low" },
  ];
  const max = Math.max(1, ...bands.map((band) => Number(band.count) || 0));
  const total = bands.reduce((sum, band) => sum + (Number(band.count) || 0), 0);

  return (
    <Panel
      eyebrow="Distribution"
      title="Risk distribution"
      tag={`${total} screened`}
    >
      <div className="risk-dist-body">
        {bands.map((band) => {
          const count = Number(band.count) || 0;
          return (
            <div key={band.key} className={`risk-dist-row ${band.className}`}>
              <span className="risk-dist-label">{band.label}</span>
              <span
                className="risk-dist-track"
                aria-hidden="true"
              >
                {count > 0 && (
                  <span
                    className="risk-dist-fill"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                )}
              </span>
              <span className="risk-dist-value mono">{count}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
