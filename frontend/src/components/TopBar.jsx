import { NavLink, Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import ThemeToggle from "./ThemeToggle";
import { useUtcClock, formatClock } from "../hooks/useUtcClock";
import { useWorkspace } from "../lib/workspace";
import "./TopBar.css";

/** Route-first navigation: every entry is a real page. */
const NAV_ROUTES = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/conjunctions", label: "Conjunctions" },
  { to: "/avoidance", label: "Avoidance" },
  { to: "/visualization", label: "Visualization" },
  { to: "/prediction", label: "Prediction" },
];

const STATUS_TEXT = {
  live: { label: "DATA LIVE", className: "ok" },
  degraded: { label: "LINK DEGRADED", className: "warn" },
  offline: { label: "LINK OFFLINE", className: "bad" },
};

/**
 * Persistent mission-control top bar: brand, page navigation with an active
 * route highlight, system/data status, live UTC clock and theme toggle.
 */
export default function TopBar({ theme, onToggleTheme }) {
  const now = useUtcClock();
  const { status, updatedAt, refresh, refreshing } = useWorkspace();
  const statusInfo = STATUS_TEXT[status] ?? STATUS_TEXT.offline;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link className="brand" to="/dashboard">
          <BrandMark />
          <span className="brand-text">
            <span className="brand-name">CONJEX&nbsp;AI</span>
            <span className="brand-sub">Orbital Conjunction Intelligence</span>
          </span>
        </Link>

        <nav className="topbar-nav" aria-label="Pages">
          {NAV_ROUTES.map((route) => (
            <NavLink
              key={route.to}
              to={route.to}
              className={({ isActive }) =>
                isActive ? "active" : undefined
              }
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="topbar-right">
        <span
          className={`sys-status ${statusInfo.className}`}
          title={
            status === "live"
              ? "All backend endpoints responding"
              : "Backend data partially unavailable"
          }
        >
          <span className="sys-dot" />
          {statusInfo.label}
        </span>

        <span className="utc-clock" title="Current UTC time">
          <span className="utc-label">UTC</span>
          {formatClock(now)}
        </span>

        <button
          type="button"
          className="refresh-btn"
          onClick={refresh}
          disabled={refreshing}
          title="Re-sync data from the backend"
        >
          <span
            className={`refresh-icon ${refreshing ? "spinning" : ""}`}
            aria-hidden="true"
          >
            ⟳
          </span>
          {refreshing ? "Syncing" : "Sync"}
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      {updatedAt && (
        <span className="topbar-sync mono" title="Last successful data sync">
          SYNC {updatedAt.toISOString().slice(11, 19)}Z
        </span>
      )}
    </header>
  );
}
