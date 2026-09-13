import { useMemo, useState } from "react";
import "./PredictionPage.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const INITIAL = {
  satellite_name: "",
  satellite_norad: "",
  debris_name: "",
  debris_norad: "",
  minimum_distance_km: "",
  relative_velocity_km_s: "",
};

function RiskBadge({ level }) {
  const normalized = String(level || "").toLowerCase();
  return <span className={`prediction-risk ${normalized}`}>{level}</span>;
}

export default function PredictionPage() {
  const [form, setForm] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canPredict = useMemo(
    () =>
      form.minimum_distance_km !== "" &&
      form.relative_velocity_km_s !== "" &&
      Number.isFinite(Number(form.minimum_distance_km)) &&
      Number.isFinite(Number(form.relative_velocity_km_s)),
    [form],
  );

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
  };

  async function predict(event) {
    event.preventDefault();
    if (!canPredict) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          satellite_norad:
            form.satellite_norad === "" ? null : Number(form.satellite_norad),
          debris_norad:
            form.debris_norad === "" ? null : Number(form.debris_norad),
          minimum_distance_km: Number(form.minimum_distance_km),
          relative_velocity_km_s: Number(form.relative_velocity_km_s),
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Prediction failed.");
      setResult(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the prediction API.",
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(INITIAL);
    setResult(null);
    setError("");
  }

  return (
    <main className="page prediction-page">
      <div className="ops-section-head">
        <div>
          <p className="ops-eyebrow">AI analysis</p>
          <h2>Prediction Lab</h2>
        </div>
        <p className="ops-lede">
          Enter conjunction measurements and get an on-demand risk assessment
          from the backend model.
        </p>
      </div>

      <div className="prediction-layout">
        <form className="panel prediction-form" onSubmit={predict}>
          <div className="prediction-panel-head">
            <div>
              <span className="metric-label">INPUT SCENARIO</span>
              <h3>Conjunction parameters</h3>
            </div>
            <span className="simulated-tag">
              <span className="simulated-dot" />
              SCREENING
            </span>
          </div>

          <div className="prediction-section">
            <p className="prediction-section-title">Object identity <span>optional</span></p>
            <div className="prediction-grid">
              <label>
                Satellite name
                <input value={form.satellite_name} onChange={update("satellite_name")} placeholder="e.g. STARLINK-36172" />
              </label>
              <label>
                Satellite NORAD ID
                <input type="number" min="1" value={form.satellite_norad} onChange={update("satellite_norad")} placeholder="e.g. 59123" />
              </label>
              <label>
                Debris name
                <input value={form.debris_name} onChange={update("debris_name")} placeholder="e.g. COSMOS 2251 DEB" />
              </label>
              <label>
                Debris NORAD ID
                <input type="number" min="1" value={form.debris_norad} onChange={update("debris_norad")} placeholder="e.g. 34036" />
              </label>
            </div>
          </div>

          <div className="prediction-section">
            <p className="prediction-section-title">Model inputs <span>required</span></p>
            <div className="prediction-grid">
              <label>
                Minimum separation
                <div className="input-unit">
                  <input required type="number" min="0" step="0.001" value={form.minimum_distance_km} onChange={update("minimum_distance_km")} placeholder="25.0" />
                  <b>km</b>
                </div>
              </label>
              <label>
                Relative velocity
                <div className="input-unit">
                  <input required type="number" min="0" step="0.001" value={form.relative_velocity_km_s} onChange={update("relative_velocity_km_s")} placeholder="7.5" />
                  <b>km/s</b>
                </div>
              </label>
            </div>
            <p className="prediction-help">
              These are the two features used by the trained Random Forest. Names and NORAD IDs are retained as scenario context.
            </p>
          </div>

          <div className="prediction-actions">
            <button className="primary-action" type="submit" disabled={!canPredict || loading}>
              {loading ? "Running model…" : "Run prediction"}
            </button>
            <button className="secondary-action" type="button" onClick={reset}>Clear</button>
          </div>

          {error && <div className="inline-error">{error}</div>}
        </form>

        <section className="panel prediction-result" aria-live="polite">
          {!result ? (
            <div className="prediction-empty">
              <div className="prediction-orbit">◎</div>
              <span className="metric-label">MODEL OUTPUT</span>
              <h3>Awaiting scenario</h3>
              <p>Enter the minimum separation and relative velocity, then run the prediction.</p>
            </div>
          ) : (
            <>
              <div className="prediction-panel-head">
                <div>
                  <span className="metric-label">MODEL OUTPUT</span>
                  <h3>Risk assessment</h3>
                </div>
                <RiskBadge level={result.risk_label} />
              </div>

              <div className="prediction-score">
                <span>Predicted risk</span>
                <strong>{result.risk_score}<small>/100</small></strong>
              </div>

              <div className="prediction-metrics">
                <div><span>RF confidence</span><b>{result.confidence == null ? "—" : `${result.confidence}%`}</b></div>
                <div><span>Separation</span><b>{result.inputs.minimum_distance_km} km</b></div>
                <div><span>Relative velocity</span><b>{result.inputs.relative_velocity_km_s} km/s</b></div>
              </div>

              <div className="prediction-note">
                <strong>{result.risk_label}</strong>
                <p>{result.interpretation}</p>
              </div>

              <details className="tech-details prediction-tech">
                <summary className="tech-toggle">Model details <span className="tech-chevron">›</span></summary>
                <dl className="tech-grid">
                  <div className="tech-row"><dt>Model</dt><dd>{result.model}</dd></div>
                  <div className="tech-row"><dt>Features</dt><dd>{result.features.join(", ")}</dd></div>
                  <div className="tech-row"><dt>Training samples</dt><dd>{result.training_samples}</dd></div>
                  <div className="tech-row"><dt>Prediction type</dt><dd>Prototype screening</dd></div>
                </dl>
              </details>
            </>
          )}
        </section>
      </div>

      <p className="ops-more">
        <span className="mono">NOTE</span> — The model is a physics-informed prototype and its score is a screening/ranking signal, not a calibrated probability of collision.
      </p>
    </main>
  );
}
