"""Simulated collision-avoidance maneuver and propellant trade-off analysis."""

import json
import os
import numpy as np

from fuel_estimation import estimate_propellant

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as file:
        return json.load(file)


conjunctions = load_json("risk_scored_conjunctions.json")
trajectories = load_json("candidate_trajectories.json")

if not conjunctions:
    raise ValueError("No risk-scored conjunctions available for maneuver simulation.")

event = conjunctions[0]
trajectory_map = {obj["NORAD_CAT_ID"]: obj for obj in trajectories}

sat_id = event["satellite_norad"]
debris_id = event["debris_norad"]
sat = trajectory_map.get(sat_id)
debris = trajectory_map.get(debris_id)

if sat is None or debris is None:
    raise ValueError("Selected conjunction objects are missing from candidate trajectories.")

sat_positions = np.asarray(sat["positions_km"], dtype=float)
sat_velocities = np.asarray(sat["velocities_km_s"], dtype=float)
debris_positions = np.asarray(debris["positions_km"], dtype=float)

valid = (
    np.isfinite(sat_positions).all(axis=1)
    & np.isfinite(sat_velocities).all(axis=1)
    & np.isfinite(debris_positions).all(axis=1)
)

if not np.any(valid):
    raise ValueError("No valid trajectory samples available for maneuver simulation.")

distances = np.linalg.norm(sat_positions - debris_positions, axis=1)
distances[~valid] = np.inf
closest_index = int(np.argmin(distances))
original_miss_distance = float(distances[closest_index])

# Maneuver before TCA. Keep configurable for the prototype.
maneuver_minutes_before = int(os.getenv("MANEUVER_MINUTES_BEFORE_TCA", "30"))
maneuver_index = max(0, closest_index - maneuver_minutes_before)

# Candidate impulses. Values are m/s, despite the historical comments in the old file.
delta_v_options = [0.005, 0.010, 0.015, 0.020]  # 5, 10, 15, 20 m/s
safety_target_km = float(os.getenv("TARGET_MISS_DISTANCE_KM", "50"))

relative_position = sat_positions[closest_index] - debris_positions[closest_index]
relative_norm = np.linalg.norm(relative_position)
if relative_norm == 0:
    raise ValueError("Relative position is zero at closest approach; maneuver direction is undefined.")

direction = relative_position / relative_norm

results = []

for delta_v_km_s in delta_v_options:
    delta_velocity = direction * delta_v_km_s
    maneuvered_positions = sat_positions.copy()

    for i in range(maneuver_index + 1, len(maneuvered_positions)):
        elapsed_seconds = (i - maneuver_index) * 60.0
        maneuvered_positions[i] = sat_positions[i] + delta_velocity * elapsed_seconds

    maneuvered_distances = np.linalg.norm(
        maneuvered_positions - debris_positions,
        axis=1,
    )
    maneuvered_distances[~valid] = np.inf
    new_miss_distance = float(np.min(maneuvered_distances))
    improvement_km = new_miss_distance - original_miss_distance
    improvement_percent = (
        improvement_km / original_miss_distance * 100
        if original_miss_distance > 0
        else 0.0
    )

    dv_m_s = delta_v_km_s * 1000.0
    fuel = estimate_propellant(dv_m_s)

    # A transparent screening-risk index: distance-only, not a collision probability.
    before_index = max(0.0, min(100.0, 100.0 - original_miss_distance))
    after_index = max(0.0, min(100.0, 100.0 - new_miss_distance))
    risk_reduction_percent = (
        max(0.0, (before_index - after_index) / before_index * 100.0)
        if before_index > 0
        else 0.0
    )

    results.append({
        "delta_v_m_s": dv_m_s,
        "delta_velocity_km_s": delta_velocity.tolist(),
        "new_miss_distance_km": new_miss_distance,
        "miss_distance_improvement_km": improvement_km,
        "improvement_percent": improvement_percent,
        "target_reached": new_miss_distance >= safety_target_km,
        "risk_reduction_percent": risk_reduction_percent,
        "propellant": fuel,
        "maneuvered_positions": maneuvered_positions,
    })

# Prefer the smallest impulse that reaches the configured target.
# If none reaches it, choose the candidate with the greatest separation improvement.
meeting_target = [r for r in results if r["target_reached"]]
if meeting_target:
    best_result = min(meeting_target, key=lambda r: r["delta_v_m_s"])
    selection_reason = f"Smallest tested delta-v reaching the {safety_target_km:g} km target separation."
else:
    best_result = max(results, key=lambda r: r["new_miss_distance_km"])
    selection_reason = "No tested delta-v reached the target; selected the largest simulated separation improvement."

result = {
    "satellite": event["satellite_name"],
    "debris": event["debris_name"],
    "risk_score": event["risk_score"],
    "risk_level": event["risk_level"],
    "original_miss_distance_km": round(original_miss_distance, 3),
    "delta_v_m_s": round(best_result["delta_v_m_s"], 3),
    "maneuver_direction": "Separation-directed",
    "maneuver_time": sat["timestamps"][maneuver_index],
    "maneuver_minutes_before_tca": maneuver_minutes_before,
    "target_miss_distance_km": round(safety_target_km, 3),
    "target_reached": bool(best_result["target_reached"]),
    "new_miss_distance_km": round(best_result["new_miss_distance_km"], 3),
    "miss_distance_improvement_km": round(best_result["miss_distance_improvement_km"], 3),
    "improvement_percent": round(best_result["improvement_percent"], 2),
    "risk_reduction_percent": round(best_result["risk_reduction_percent"], 2),
    "fuel": best_result["propellant"],
    "selection_reason": selection_reason,
    "tradeoff_candidates": [
        {
            "delta_v_m_s": round(r["delta_v_m_s"], 3),
            "new_miss_distance_km": round(r["new_miss_distance_km"], 3),
            "improvement_percent": round(r["improvement_percent"], 2),
            "propellant_mass_kg": r["propellant"]["propellant_mass_kg"],
            "estimated_propellant_cost_usd": r["propellant"]["estimated_propellant_cost_usd"],
            "target_reached": r["target_reached"],
        }
        for r in results
    ],
    "limitation": "Simulated separation maneuver. It does not model full spacecraft dynamics, covariance, thrust direction constraints, or a flight-certified collision probability.",
}

with open(os.path.join(DATA_DIR, "avoidance_result.json"), "w", encoding="utf-8") as file:
    json.dump(result, file, indent=2)

print("Avoidance + fuel trade-off analysis complete!")
print(json.dumps({k: v for k, v in result.items() if k != "tradeoff_candidates"}, indent=2))
