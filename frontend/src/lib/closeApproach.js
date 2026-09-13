import { useMemo } from "react";
import { CLOSE_APPROACH_WINDOW_MIN } from "./api";

/**
 * Close-approach geometry, computed entirely from the backend's own SGP4
 * ephemeris (candidate_trajectories.json, served read-only from its static
 * /data mount). No physics is recomputed here — positions are sampled as
 * recorded; the encounter-plane projection is only a rotation for drawing.
 */

function parseTime(value) {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function buildTimeIndex(timestamps) {
  return timestamps.map((t) => parseTime(t));
}

function findEntry(trajectories, noradId) {
  const id = Number(noradId);
  return Array.isArray(trajectories)
    ? trajectories.find((entry) => Number(entry.NORAD_CAT_ID) === id)
    : undefined;
}

/**
 * Orthonormal encounter-plane basis from the two velocity vectors:
 * x along the satellite's motion, debris velocity defines the plane
 * (its out-of-plane component is folded into the y axis).
 */
function encounterBasis(vSat, vDeb) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => Math.sqrt(dot(a, a));
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  const xAxis = scale(vSat, 1 / norm(vSat));
  const planeNormalRaw = cross(xAxis, vDeb);
  const normalNorm = norm(planeNormalRaw);

  // Nearly collinear velocities: fall back to a stable arbitrary normal.
  const planeNormal =
    normalNorm < 1e-6
      ? cross(xAxis, Math.abs(xAxis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])
      : planeNormalRaw;
  const normal = scale(planeNormal, 1 / norm(planeNormal));
  const yAxis = cross(normal, xAxis);

  const project = (p) => [dot(p, xAxis), dot(p, yAxis)];
  return { project };
}

/** Piecewise-linear sample of position at an arbitrary epoch. */
function sampleAt(times, positions, epoch) {
  const n = times.length;
  if (n === 0) return null;
  if (epoch <= times[0]) return positions[0];
  if (epoch >= times[n - 1]) return positions[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= epoch) lo = mid;
    else hi = mid;
  }
  const t0 = times[lo];
  const t1 = times[hi];
  const f = t1 === t0 ? 0 : (epoch - t0) / (t1 - t0);
  const p0 = positions[lo];
  const p1 = positions[hi];
  return [
    p0[0] + (p1[0] - p0[0]) * f,
    p0[1] + (p1[1] - p0[1]) * f,
    p0[2] + (p1[2] - p0[2]) * f,
  ];
}

function separationKm(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Local view of the encounter. Returns null when either object lacks
 * ephemeris or the ±60 min window is not fully covered by the dataset.
 */
export function useCloseApproachGeometry({
  trajectories,
  satelliteNorad,
  debrisNorad,
  tca,
  maneuverTime,
}) {
  return useMemo(() => {
    const tcaMs = parseTime(tca);
    if (tcaMs == null || !trajectories) return null;

    const sat = findEntry(trajectories, satelliteNorad);
    const deb = findEntry(trajectories, debrisNorad);
    if (!sat || !deb) return null;

    const satTimes = buildTimeIndex(sat.timestamps);
    const debTimes = buildTimeIndex(deb.timestamps);
    const first = Math.max(satTimes[0], debTimes[0]);
    const last = Math.min(
      satTimes[satTimes.length - 1],
      debTimes[debTimes.length - 1],
    );

    const halfWindowMs = CLOSE_APPROACH_WINDOW_MIN * 60000;
    const winStart = tcaMs - halfWindowMs;
    const winEnd = tcaMs + halfWindowMs;
    if (winStart < first || winEnd > last) return null;

    // Encounter-plane basis from the velocity vectors at TCA.
    const { project } = encounterBasis(
      sampleAt(satTimes, sat.velocities_km_s, tcaMs),
      sampleAt(debTimes, deb.velocities_km_s, tcaMs),
    );

    const step = 60_000;
    const collect = (entry, times) => {
      const points = [];
      const epochs = [];
      for (let ms = winStart; ms <= winEnd; ms += step) {
        const p = sampleAt(times, entry.positions_km, ms);
        if (!p) continue;
        points.push(project(p));
        epochs.push(ms);
      }
      return { points, epochs };
    };

    const satSeries = collect(sat, satTimes);
    const debSeries = collect(deb, debTimes);
    if (!satSeries.points.length || !debSeries.points.length) return null;

    // Closest approach: true minimum separation across the window, from
    // the recorded ephemeris samples.
    let ca = { distance: Infinity, epoch: null };
    for (let i = 0; i < satSeries.epochs.length; i++) {
      const a = sampleAt(satTimes, sat.positions_km, satSeries.epochs[i]);
      const b = sampleAt(debTimes, deb.positions_km, satSeries.epochs[i]);
      if (!a || !b) continue;
      const d = separationKm(a, b);
      if (d < ca.distance) {
        ca = { distance: d, epoch: satSeries.epochs[i] };
      }
    }
    if (ca.epoch == null) return null;

    const satellite = project(
      sampleAt(satTimes, sat.positions_km, ca.epoch),
    );
    const debris = project(sampleAt(debTimes, deb.positions_km, ca.epoch));

    const maneuverMs = maneuverTime ? parseTime(maneuverTime) : null;
    const maneuverPoint =
      maneuverMs != null && maneuverMs >= winStart && maneuverMs <= winEnd
        ? project(sampleAt(satTimes, sat.positions_km, maneuverMs))
        : null;

    // Equal-aspect view framed on the encounter so the closest approach is
    // visually obvious. The window's full ±60 min tracks extend beyond the
    // frame and clip at its edges — nothing about the data changes.
    const center = [
      (satellite[0] + debris[0]) / 2,
      (satellite[1] + debris[1]) / 2,
    ];
    const maneuverDist = maneuverPoint
      ? Math.hypot(
          maneuverPoint[0] - satellite[0],
          maneuverPoint[1] - satellite[1],
        )
      : null;
    const halfExtent = Math.max(
      6 * ca.distance,
      maneuverDist != null ? maneuverDist * 1.3 : 0,
    );
    const bounds = {
      minX: center[0] - halfExtent,
      maxX: center[0] + halfExtent,
      minY: center[1] - halfExtent,
      maxY: center[1] + halfExtent,
    };

    const separation = satSeries.epochs.map((ms) => {
      const a = sampleAt(satTimes, sat.positions_km, ms);
      const b = sampleAt(debTimes, deb.positions_km, ms);
      return {
        epoch: ms,
        distance: a && b ? separationKm(a, b) : null,
      };
    });

    return {
      windowStart: winStart,
      windowEnd: winEnd,
      satSeries,
      debSeries,
      separation,
      closestApproach: { epoch: ca.epoch, distance: ca.distance, satellite, debris },
      maneuverPoint,
      maneuverEpoch: maneuverPoint ? maneuverMs : null,
      bounds,
    };
  }, [trajectories, satelliteNorad, debrisNorad, tca, maneuverTime]);
}
