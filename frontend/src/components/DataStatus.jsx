import Panel from "./Panel";
import { formatUtc } from "../lib/format";
import "./DataStatus.css";

const METHODOLOGY = [
  "SGP4 propagation of cataloged objects from public GP/TLE elements",
  "Conjunction screening within a 200 km threshold",
  "AI-assisted risk ranking (screening index, not collision probability)",
];

/**
 * Data provenance + methodology. Every value comes from the backend's
 * /api/metadata or /api/health — nothing is invented or estimated here.
 */
export default function DataStatus({ metadata, health, updatedAt }) {
  if (!metadata && !health) return null;

  const files = health?.data_files ?? {};
  const fileNames = Object.keys(files);
  const okFiles = fileNames.filter((name) => files[name]).length;
  const limitations = Array.isArray(metadata?.limitations)
    ? metadata.limitations
    : [];

  return (
    <Panel
      eyebrow="PROVENANCE"
      title="Data Status"
      tag={
        health?.status ? (
          <span className={`ds-health ${health.status}`}>
            <span className="ds-health-dot" aria-hidden="true" />
            {health.status.toUpperCase()}
          </span>
        ) : null
      }
    >
      <div className="data-status-body">
        <dl className="ds-rows">
          {metadata?.data_source && (
            <div className="ds-row">
              <dt>Data source</dt>
              <dd>{metadata.data_source}</dd>
            </div>
          )}
          {metadata?.total_objects_ingested != null && (
            <div className="ds-row">
              <dt>Objects tracked</dt>
              <dd className="mono">
                {Number(metadata.total_objects_ingested).toLocaleString("en-US")}
              </dd>
            </div>
          )}
          {metadata?.candidate_pairs != null && (
            <div className="ds-row">
              <dt>Candidate pairs screened</dt>
              <dd className="mono">
                {Number(metadata.candidate_pairs).toLocaleString("en-US")}
              </dd>
            </div>
          )}
          {metadata?.propagated_objects != null && (
            <div className="ds-row">
              <dt>Propagated (24h)</dt>
              <dd className="mono">
                {Number(metadata.propagated_objects).toLocaleString("en-US")}
              </dd>
            </div>
          )}
          <div className="ds-row">
            <dt>Last synchronization</dt>
            <dd className="mono">
              {updatedAt ? formatUtc(updatedAt) : "—"}
            </dd>
          </div>
        </dl>

        {fileNames.length > 0 && (
          <p className="ds-footer mono">
            datasets {okFiles}/{fileNames.length} verified
            {health?.trained_model != null &&
              ` · risk model ${health.trained_model ? "loaded" : "unavailable"}`}
          </p>
        )}

        <div className="ds-method">
          <span className="metric-label">Methodology</span>
          <ul>
            {METHODOLOGY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {limitations.length > 0 && (
            <ul className="ds-limits">
              {limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
