"""Create a before/after local conjunction visualization matching the selected maneuver."""

import json
import os

import matplotlib.pyplot as plt
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as file:
        return json.load(file)


conjunctions = load_json("risk_scored_conjunctions.json")
trajectories = load_json("candidate_trajectories.json")
avoidance = load_json("avoidance_result.json")

if not conjunctions:
    raise ValueError("No conjunctions available for visualization.")

event = conjunctions[0]
trajectory_map = {obj["NORAD_CAT_ID"]: obj for obj in trajectories}
sat = trajectory_map[event["satellite_norad"]]
debris = trajectory_map[event["debris_norad"]]

sat_positions = np.asarray(sat["positions_km"], dtype=float)
debris_positions = np.asarray(debris["positions_km"], dtype=float)

valid = np.isfinite(sat_positions).all(axis=1) & np.isfinite(debris_positions).all(axis=1)
distances = np.linalg.norm(sat_positions - debris_positions, axis=1)
distances[~valid] = np.inf
closest_index = int(np.argmin(distances))

# Recreate the same simplified maneuver used by avoidance_maneuver.py.
maneuver_time = avoidance.get("maneuver_time")
try:
    maneuver_index = sat["timestamps"].index(maneuver_time)
except ValueError:
    maneuver_index = max(0, closest_index - int(avoidance.get("maneuver_minutes_before_tca", 30)))

delta_v_km_s = float(avoidance.get("delta_v_m_s", 0.0)) / 1000.0
relative_position = sat_positions[closest_index] - debris_positions[closest_index]
direction = relative_position / np.linalg.norm(relative_position)
delta_velocity = direction * delta_v_km_s

maneuvered_positions = sat_positions.copy()
for i in range(maneuver_index + 1, len(maneuvered_positions)):
    elapsed_seconds = (i - maneuver_index) * 60.0
    maneuvered_positions[i] = sat_positions[i] + delta_velocity * elapsed_seconds

# Show a local window around TCA for readability.
window = 120
start = max(0, closest_index - window)
end = min(len(sat_positions), closest_index + window + 1)
center = sat_positions[closest_index]

original_local = sat_positions[start:end] - center
maneuvered_local = maneuvered_positions[start:end] - center
debris_local = debris_positions[start:end] - center

plt.figure(figsize=(11, 8))
plt.plot(original_local[:, 0], original_local[:, 1], linewidth=2, label="Original Satellite")
plt.plot(maneuvered_local[:, 0], maneuvered_local[:, 1], linestyle="--", linewidth=2, label=f"After {avoidance['delta_v_m_s']:.1f} m/s Avoidance")
plt.plot(debris_local[:, 0], debris_local[:, 1], linewidth=2, label="Debris")
plt.scatter(0, 0, marker="x", s=150, linewidth=3, label="Original Closest Approach")

maneuver_local_index = maneuver_index - start
if 0 <= maneuver_local_index < len(maneuvered_local):
    plt.scatter(
        maneuvered_local[maneuver_local_index, 0],
        maneuvered_local[maneuver_local_index, 1],
        marker="o",
        s=100,
        label="Maneuver Point",
    )

original_distance = avoidance["original_miss_distance_km"]
new_distance = avoidance["new_miss_distance_km"]

plt.annotate(
    f"Before: {original_distance:.2f} km\nAfter: {new_distance:.2f} km",
    xy=(0, 0),
    xytext=(40, 40),
    textcoords="offset points",
    fontsize=11,
    bbox=dict(boxstyle="round,pad=0.5", facecolor="white", edgecolor="gray"),
)

plt.xlabel("Relative X Position (km)")
plt.ylabel("Relative Y Position (km)")
plt.title("High-Risk Conjunction — Avoidance Maneuver Simulation")
plt.legend()
plt.grid(True, alpha=0.3)
plt.axis("equal")
plt.tight_layout()

output_path = os.path.join(DATA_DIR, "avoidance_visualization.png")
plt.savefig(output_path, dpi=250, bbox_inches="tight")
plt.close()
print(f"Avoidance visualization saved to {output_path}")
