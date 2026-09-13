export const API_BASE =
  import.meta.env?.VITE_API_BASE || "http://127.0.0.1:8000";

export async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** Backend-generated collision avoidance chart (existing static route). */
export const AVOIDANCE_CHART_URL = `${API_BASE}/data/avoidance_visualization.png`;

/**
 * Backend-generated SGP4 ephemeris for the 65 propagated catalog objects
 * (24 h at 1-minute resolution). Served from the existing static /data
 * mount — read-only, no backend logic involved.
 */
export const CANDIDATE_TRAJECTORIES_URL = `${API_BASE}/data/candidate_trajectories.json`;

/** Window (minutes each side of TCA) shown in the close-approach view. */
export const CLOSE_APPROACH_WINDOW_MIN = 60;
