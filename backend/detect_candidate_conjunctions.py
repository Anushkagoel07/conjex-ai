import json
import numpy as np

with open("data/candidate_pairs.json", "r", encoding="utf-8") as file:
    candidates = json.load(file)

with open("data/candidate_trajectories.json", "r", encoding="utf-8") as file:
    trajectories = json.load(file)


# Fast lookup by NORAD ID
trajectory_map = {
    obj["NORAD_CAT_ID"]: obj
    for obj in trajectories
}


THRESHOLD_KM = 200.0

conjunctions = []


for pair in candidates:

    sat_id = pair["satellite"]["NORAD_CAT_ID"]
    deb_id = pair["debris"]["NORAD_CAT_ID"]

    sat = trajectory_map.get(sat_id)
    deb = trajectory_map.get(deb_id)

    if sat is None or deb is None:
        continue

    sat_positions = np.array(sat["positions_km"], dtype=float)
    deb_positions = np.array(deb["positions_km"], dtype=float)

    # Skip invalid points
    valid = (
        np.isfinite(sat_positions).all(axis=1)
        & np.isfinite(deb_positions).all(axis=1)
    )

    if not np.any(valid):
        continue

    distances = np.linalg.norm(
        sat_positions - deb_positions,
        axis=1
    )

    distances[~valid] = np.inf

    min_index = int(np.argmin(distances))
    min_distance = float(distances[min_index])

    if min_distance <= THRESHOLD_KM:

        sat_velocity = np.array(
            sat["velocities_km_s"][min_index],
            dtype=float
        )

        deb_velocity = np.array(
            deb["velocities_km_s"][min_index],
            dtype=float
        )

        relative_velocity = float(
            np.linalg.norm(
                sat_velocity - deb_velocity
            )
        )

        conjunctions.append({
            "satellite_name": sat["OBJECT_NAME"],
            "satellite_norad": sat_id,
            "debris_name": deb["OBJECT_NAME"],
            "debris_norad": deb_id,

            "time": sat["timestamps"][min_index],

            "minimum_distance_km": round(
                min_distance, 3
            ),

            "relative_velocity_km_s": round(
                relative_velocity, 4
            ),

            "candidate_score": pair["candidate_score"]
        })


# Closest approaches first
conjunctions.sort(
    key=lambda x: x["minimum_distance_km"]
)


with open(
    "data/conjunctions.json",
    "w",
    encoding="utf-8"
) as file:
    json.dump(conjunctions, file, indent=2)


print("Conjunction detection complete!")
print("Candidate pairs checked:", len(candidates))
print("Conjunctions found:", len(conjunctions))
print("Saved to: data/conjunctions.json")


print("\nTop 10 closest approaches:\n")

for item in conjunctions[:10]:

    print(
        f"{item['satellite_name']} <-> "
        f"{item['debris_name']} | "
        f"Distance: "
        f"{item['minimum_distance_km']} km | "
        f"Relative velocity: "
        f"{item['relative_velocity_km_s']} km/s | "
        f"Time: {item['time']}"
    )