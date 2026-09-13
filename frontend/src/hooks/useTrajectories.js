import { useCallback, useEffect, useState } from "react";
import { CANDIDATE_TRAJECTORIES_URL } from "../lib/api";

/**
 * Loads the backend's SGP4 ephemeris dataset (read-only static export).
 * Status: "loading" → "ready" | "error". The dataset is large (tens of MB),
 * so it is fetched only by the Visualization page and shared via a
 * module-level cache for the session. Every fetch revalidates, because the
 * backend regenerates this export on each pipeline run.
 */
let cache = null;

function load() {
  return fetch(CANDIDATE_TRAJECTORIES_URL, { cache: "reload" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `trajectory data failed: ${response.status} ${response.statusText}`,
        );
      }
      return response.json();
    })
    .then((data) => {
      cache = data;
      return data;
    })
    .catch((err) => {
      console.error("Trajectory data error:", err);
      return null;
    });
}

export function useTrajectories() {
  const [state, setState] = useState(
    cache
      ? { status: "ready", trajectories: cache }
      : { status: "loading", trajectories: null },
  );

  useEffect(() => {
    if (cache) return undefined;
    let cancelled = false;
    load().then((data) => {
      if (!cancelled) {
        setState(
          data
            ? { status: "ready", trajectories: data }
            : { status: "error", trajectories: null },
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Drop the cached copy and refetch (stale-data recovery). */
  const retry = useCallback(() => {
    cache = null;
    setState({ status: "loading", trajectories: null });
    load().then((data) => {
      setState(
        data
          ? { status: "ready", trajectories: data }
          : { status: "error", trajectories: null },
      );
    });
  }, []);

  return { ...state, retry };
}
