import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Panel from "../components/Panel";
import {
  eventKey,
  formatKm,
  formatUtc,
  formatVelocity,
  RISK_ORDER,
} from "../lib/format";
import { eventRoute, useWorkspace } from "../lib/workspace";
import "./ConjunctionsPage.css";

const RISK_FILTERS = ["all", "high", "medium", "low"];

const COLUMNS = [
  { id: "pair", label: "Satellite", sortable: true },
  { id: "time", label: "Time of Approach (UTC)", sortable: true },
  { id: "distance", label: "Closest Distance", sortable: true, numeric: true },
  { id: "velocity", label: "Rel. Velocity", sortable: true, numeric: true },
  { id: "risk", label: "Risk Level", sortable: true },
];

function sortValue(event, column) {
  switch (column) {
    case "time":
      return new Date(event.time).getTime() || 0;
    case "distance":
      return Number(event.minimum_distance_km) || 0;
    case "velocity":
      return Number(event.relative_velocity_km_s) || 0;
    case "risk": {
      const score = Number(event.risk_score);
      if (Number.isFinite(score) && score > 0) return score;
      const level = event.risk_level?.toLowerCase();
      return level in RISK_ORDER ? -RISK_ORDER[level] : 0;
    }
    case "pair":
    default:
      return `${event.satellite_name} ${event.debris_name}`.toLowerCase();
  }
}

function RiskPill({ level, label }) {
  return (
    <span className={`severity-pill ${level}`}>
      <span className="severity-dot" />
      {label || level}
    </span>
  );
}

/**
 * The full conjunction catalog. Rows navigate to the event's detail route;
 * on narrow screens the table collapses into stacked event cards.
 */
export default function ConjunctionsPage() {
  const { conjunctions } = useWorkspace();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("risk");
  const [sortDirection, setSortDirection] = useState("desc");

  const counts = useMemo(() => {
    const base = { high: 0, medium: 0, low: 0 };
    conjunctions.forEach((event) => {
      const level = event.risk_level?.toLowerCase();
      if (level in base) base[level] += 1;
    });
    return base;
  }, [conjunctions]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = conjunctions.filter((event) => {
      if (filter !== "all" && event.risk_level?.toLowerCase() !== filter) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        event.satellite_name,
        event.satellite_norad,
        event.debris_name,
        event.debris_norad,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const valueA = sortValue(a, sortColumn);
      const valueB = sortValue(b, sortColumn);
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return (
        (new Date(a.time).getTime() || 0) - (new Date(b.time).getTime() || 0) ||
        eventKey(a).localeCompare(eventKey(b))
      );
    });
  }, [conjunctions, filter, query, sortColumn, sortDirection]);

  const handleSort = (columnId) => {
    if (sortColumn === columnId) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnId);
      setSortDirection(columnId === "pair" ? "asc" : "desc");
    }
  };

  return (
    <main className="page">
      <div className="ops-section-head">
        <div>
          <p className="ops-eyebrow">Event catalog</p>
          <h2>Conjunctions</h2>
        </div>
        <p className="ops-lede">
          All detected close approaches in the current screening window.
        </p>
      </div>

      <Panel
        title="Detected close approaches"
        eyebrow="SCREENING RESULTS"
        tag={`${rows.length} of ${conjunctions.length} shown`}
      >
        <div className="catalog-tools">
          <label className="catalog-search">
            <span className="metric-label">Search</span>
            <input
              type="search"
              value={query}
              placeholder="Name or NORAD ID"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search conjunctions by name or NORAD ID"
            />
          </label>
          <div className="risk-filter" role="group" aria-label="Filter by risk">
            {RISK_FILTERS.map((level) => (
              <button
                key={level}
                type="button"
                className={`risk-chip ${level} ${filter === level ? "active" : ""}`}
                onClick={() => setFilter(level)}
              >
                {level === "all" ? "All" : level}
                {level !== "all" && (
                  <span className="chip-count">{counts[level]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop / laptop: data table. Mobile: stacked event cards. */}
        <div className="table-wrapper">
          <table className="conj-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const isActive = sortColumn === column.id;
                  return (
                    <th
                      key={column.id}
                      className={`${column.numeric ? "num" : ""} ${isActive ? "sorted" : ""}`}
                      aria-sort={
                        isActive
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => handleSort(column.id)}
                      >
                        {column.label}
                        <span className="sort-arrow" aria-hidden="true">
                          {isActive ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => {
                const key = eventKey(event);
                const level = event.risk_level?.toLowerCase() || "low";
                return (
                  <tr key={key} className="conj-row">
                    <td className="col-objects">
                      <div className="pair-cell">
                        <span className="pair-spacecraft">
                          {event.satellite_name}
                          <small>NORAD {event.satellite_norad}</small>
                        </span>
                        <span className="pair-sep" aria-hidden="true">↔</span>
                        <span className="pair-debris">
                          {event.debris_name}
                          <small>NORAD {event.debris_norad}</small>
                        </span>
                      </div>
                    </td>
                    <td className="mono tca-cell">{formatUtc(event.time)}</td>
                    <td className="num mono dist-cell">
                      {formatKm(event.minimum_distance_km)}
                      <small> km</small>
                    </td>
                    <td className="num mono">
                      {formatVelocity(event.relative_velocity_km_s)}
                      <small> km/s</small>
                    </td>
                    <td>
                      <RiskPill level={level} label={event.risk_level} />
                    </td>
                    <td className="col-action">
                      <Link className="row-link" to={eventRoute(event)}>
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>
                    No conjunctions match the current search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile card list mirrors the same data */}
          <ul className="conj-cards">
            {rows.map((event) => {
              const level = event.risk_level?.toLowerCase() || "low";
              return (
                <li key={eventKey(event)}>
                  <Link
                    to={eventRoute(event)}
                    className={`conj-card risk-${level}`}
                  >
                    <div className="conj-card-top">
                      <span className="conj-card-pair">
                        {event.satellite_name} ↔ {event.debris_name}
                      </span>
                      <RiskPill level={level} label={event.risk_level} />
                    </div>
                    <div className="conj-card-metrics mono">
                      <span>
                        {formatKm(event.minimum_distance_km)} km
                      </span>
                      <span>
                        {formatVelocity(event.relative_velocity_km_s)} km/s
                      </span>
                      <span>{formatUtc(event.time, { seconds: false })}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="conj-cards-empty">
                No conjunctions match the current search or filter.
              </li>
            )}
          </ul>
        </div>

        <div className="table-hint">
          <span className="hint-key">Select</span> an event to open its detail
          view
        </div>
      </Panel>
    </main>
  );
}
