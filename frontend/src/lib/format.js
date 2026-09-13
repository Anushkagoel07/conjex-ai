const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

/** "07 SEP 14:32:05Z" — always UTC, operations-console style. */
export function formatUtc(value, { seconds = true } = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const base = `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}`;
  return seconds ? `${base}:${pad(date.getUTCSeconds())}Z` : `${base}Z`;
}

/** "12 SEP 2026 · 18:36Z" — year included, for headline events. */
export function formatUtcLong(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}Z`;
}

/** Split a UTC timestamp into { date: "10 SEP", time: "17:54Z" } parts. */
export function formatUtcParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
  return {
    date: `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`,
  };
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Distance in km, precision adapted to magnitude (sub-km misses matter). */
export function formatKm(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  const abs = Math.abs(parsed);
  const digits = abs >= 100 ? 1 : abs >= 1 ? 2 : 3;
  return parsed.toFixed(digits);
}

/** Δv in m/s. */
export function formatDeltaV(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toFixed(2);
}

/** Relative velocity in km/s. */
export function formatVelocity(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toFixed(2);
}

/** Percent values such as the separation improvement. */
export function formatPercent(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toFixed(1);
}

/** Risk score on the 0–100 screening scale, one decimal. */
export function formatScore(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toFixed(1);
}

/** Propellant mass in kg, two decimals. */
export function formatMass(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toFixed(2);
}

/** USD cost — compact above $1,000, cents below. */
export function formatUsd(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: parsed >= 1000 ? 0 : 2,
  });
}

/**
 * Mission-style countdown to a UTC instant: "T-04:26" when it is ahead of
 * `now`, "T+00:12" once it has passed. Minute resolution.
 */
export function formatTMinus(value, now = new Date()) {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  const diffMinutes = Math.round((target - now.getTime()) / 60000);
  const sign = diffMinutes < 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  return `T${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Stable identity for a conjunction (pair of NORAD IDs). */
export function eventKey(event) {
  if (!event) return "";
  return `${event.satellite_norad}::${event.debris_norad}`;
}

export const RISK_ORDER = { high: 0, medium: 1, low: 2 };

export function riskLevel(event) {
  return String(event?.risk_level ?? "").toLowerCase();
}

/**
 * Match the backend's single simulated avoidance scenario to its source
 * conjunction: the maneuver epoch is `maneuver_minutes_before_tca` ahead of
 * the event's TCA. Returns the matching conjunction or null.
 */
export function matchAvoidanceEvent(avoidance, conjunctions) {
  if (!avoidance?.maneuver_time || !Array.isArray(conjunctions)) return null;
  const leadMinutes = Number(avoidance.maneuver_minutes_before_tca);
  const burn = new Date(avoidance.maneuver_time).getTime();
  if (Number.isNaN(burn)) return null;
  const tcaMs = burn + (Number.isFinite(leadMinutes) ? leadMinutes : 30) * 60000;
  return (
    conjunctions.find((event) => {
      if (event.satellite_name !== avoidance.satellite) return false;
      const eventMs = new Date(event.time).getTime();
      return Number.isFinite(eventMs) && Math.abs(eventMs - tcaMs) < 90000;
    }) || null
  );
}
