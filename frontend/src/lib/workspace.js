import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { matchAvoidanceEvent } from "./format";
import { fetchJson } from "./api";

export const WorkspaceContext = createContext(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function toErrorMessage(err) {
  return err instanceof Error
    ? err.message
    : "Unable to reach the Conjex AI API.";
}

/**
 * Core payload (dashboard + conjunctions) is required; metadata and health
 * enrich the Data Status panel when the backend provides them.
 */
export function loadWorkspaceData() {
  return Promise.allSettled([
    fetchJson("/api/dashboard"),
    fetchJson("/api/conjunctions"),
    fetchJson("/api/metadata"),
    fetchJson("/api/health"),
  ]).then(([dashboard, conjunctions, metadata, health]) => {
    if (dashboard.status !== "fulfilled" || conjunctions.status !== "fulfilled") {
      const rejected = [dashboard, conjunctions].find(
        (result) => result.status === "rejected",
      );
      throw rejected?.reason instanceof Error
        ? rejected.reason
        : new Error("Unable to reach the Conjex AI API.");
    }
    return {
      dashboard: dashboard.value,
      conjunctions: conjunctions.value.conjunctions || [],
      metadata: metadata.status === "fulfilled" ? metadata.value : null,
      health: health.status === "fulfilled" ? health.value : null,
    };
  });
}

/** Look a conjunction up by its NORAD pair (used by the detail route). */
export function findEventByNorad(conjunctions, satNorad, debNorad) {
  if (!Array.isArray(conjunctions)) return null;
  const sat = Number(satNorad);
  const deb = Number(debNorad);
  return (
    conjunctions.find(
      (event) =>
        Number(event.satellite_norad) === sat &&
        Number(event.debris_norad) === deb,
    ) || null
  );
}

/** Deep-linkable route for a conjunction event. */
export function eventRoute(event) {
  if (!event) return "/conjunctions";
  return `/conjunctions/${event.satellite_norad}/${event.debris_norad}`;
}

/**
 * One live data connection shared by every route. Survives page
 * navigation — switching pages never refetches.
 */
export function useWorkspaceData() {
  const [dashboard, setDashboard] = useState(null);
  const [conjunctions, setConjunctions] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const applyData = useCallback((data) => {
    setDashboard(data.dashboard);
    setConjunctions(data.conjunctions);
    setMetadata(data.metadata);
    setHealth(data.health);
    setError(null);
    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadWorkspaceData()
      .then((data) => {
        if (!cancelled) applyData(data);
      })
      .catch((err) => {
        console.error("API error:", err);
        if (!cancelled) {
          setError(toErrorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyData]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadWorkspaceData()
      .then(applyData)
      .catch((err) => {
        console.error("API error:", err);
        setError(toErrorMessage(err));
        setRefreshing(false);
      });
  }, [applyData]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    loadWorkspaceData()
      .then(applyData)
      .catch((err) => {
        console.error("API error:", err);
        setError(toErrorMessage(err));
        setLoading(false);
      });
  }, [applyData]);

  const avoidance = dashboard?.avoidance;

  // The backend's simulated avoidance scenario refers to one specific
  // conjunction; derived once here and matched per event where needed.
  const avoidanceEvent = useMemo(
    () => matchAvoidanceEvent(avoidance, conjunctions),
    [avoidance, conjunctions],
  );

  const status = error ? (dashboard ? "degraded" : "offline") : "live";

  return {
    dashboard,
    conjunctions,
    metadata,
    health,
    loading,
    refreshing,
    error,
    updatedAt,
    avoidance,
    avoidanceEvent,
    status,
    refresh,
    retry,
  };
}
