import { useMemo, useState } from "react";
import {
  eventKey,
  formatKm,
  formatUtc,
  formatVelocity,
  RISK_ORDER,
} from "../lib/format";
import "./ConjunctionTable.css";

const RISK_FILTERS = ["all", "high", "medium", "low"];

const COLUMNS = [
  { id: "pair", label: "Spacecraft / Debris", sortable: true },
  { id: "time", label: "TCA (UTC)", sortable: true },
  { id: "distance", label: "Miss Distance", sortable: true, numeric: true },
  { id: "velocity", label: "Rel. Velocity", sortable: true, numeric: true },
  { id: "risk", label: "Risk", sortable: true },
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

/**
 * Interactive conjunction catalog: text search, risk filters and sortable
 * columns. Clicking a row selects the event, which drives the inspector,
 * timeline, avoidance panel and trajectory sections.
 */
export default function ConjunctionTable({ conjunctions, selected, onSelect }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("risk");
  const [sortDirection, setSortDirection] = useState("desc");
  const selectedKey = eventKey(selected);

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
      if (
        filter !== "all" &&
        event.risk_level?.toLowerCase() !== filter
      ) {
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
      // Stable tiebreaker: time, then pair identity.
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
    <section
      id="section-catalog"
      className="panel catalog-panel"
      aria-label="Conjunction catalog"
    >
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-eyebrow">Conjunction Catalog</span>
          <h3>Detected Close Approaches</h3>
        </div>

        <div className="catalog-tools">
          <label className="catalog-search">
            <span className="metric-label" aria-hidden="true">Search</span>
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
      </div>

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
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => {
              const key = eventKey(event);
              const isSelected = key === selectedKey;
              const level = event.risk_level?.toLowerCase() || "low";

              return (
                <tr
                  key={key}
                  className={`conj-row ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelect(event)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(event);
                    }
                  }}
                  aria-selected={isSelected}
                >
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
                  <td className="mono tca-cell">
                    {formatUtc(event.time)}
                  </td>
                  <td className="num mono dist-cell">
                    {formatKm(event.minimum_distance_km)}
                    <small> km</small>
                  </td>
                  <td className="num mono">
                    {formatVelocity(event.relative_velocity_km_s)}
                    <small> km/s</small>
                  </td>
                  <td>
                    <span className={`risk-dot ${level}`} aria-hidden="true" />
                    <span className={`risk-label ${level}`}>
                      {event.risk_level}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={5}>
                  No conjunctions match the current search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-hint">
        <span className="hint-key">Click</span> a row to inspect the event ·{" "}
        <span className="hint-key">{rows.length}</span> of {conjunctions.length}{" "}
        events shown
      </div>
    </section>
  );
}
