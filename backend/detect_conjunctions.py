import json
import numpy as np

# Load trajectories
with open("data/trajectories.json", "r", encoding="utf-8") as file:
    objects = json.load(file)

satellites = [obj for obj in objects if obj["type"] == "satellite"]
debris = [obj for obj in objects if obj["type"] == "debris"]

print(f"Satellites: {len(satellites)}")
print(f"Debris: {len(debris)}")
print("Checking close approaches...\n")

conjunctions = []

# Distance threshold for initial screening
THRESHOLD_KM = 100.0

for sat in satellites:
    sat_positions = np.array([
        [
            point["position_km"]["x"],
            point["position_km"]["y"],
            point["position_km"]["z"]
        ]
        for point in sat["trajectory"]
    ])

    for deb in debris:
        deb_positions = np.array([
            [
                point["position_km"]["x"],
                point["position_km"]["y"],
                point["position_km"]["z"]
            ]
            for point in deb["trajectory"]
        ])

        # Calculate distance at every timestamp
        distances = np.linalg.norm(
            sat_positions - deb_positions,
            axis=1
        )

        min_index = np.argmin(distances)
        min_distance = float(distances[min_index])

        # Only keep potentially interesting encounters
        if min_distance <= THRESHOLD_KM:

            sat_point = sat["trajectory"][min_index]
            deb_point = deb["trajectory"][min_index]

            # Relative velocity
            sat_velocity = np.array([
                sat_point["velocity_km_s"]["x"],
                sat_point["velocity_km_s"]["y"],
                sat_point["velocity_km_s"]["z"]
            ])

            deb_velocity = np.array([
                deb_point["velocity_km_s"]["x"],
                deb_point["velocity_km_s"]["y"],
                deb_point["velocity_km_s"]["z"]
            ])

            relative_velocity = float(
                np.linalg.norm(sat_velocity - deb_velocity)
            )

            conjunctions.append({
                "satellite": sat["name"],
                "satellite_norad_id": sat["norad_id"],
                "debris": deb["name"],
                "debris_norad_id": deb["norad_id"],
                "tca": sat_point["time"],
                "miss_distance_km": round(min_distance, 3),
                "relative_velocity_km_s": round(relative_velocity, 3)
            })


# Sort by closest approach
conjunctions.sort(
    key=lambda x: x["miss_distance_km"]
)

# Save results
with open("data/conjunctions.json", "w", encoding="utf-8") as file:
    json.dump(conjunctions, file, indent=2)


print("Conjunction detection complete!")
print("Potential conjunctions:", len(conjunctions))
print("Saved to: data/conjunctions.json")

print("\nClosest 10 approaches:\n")

for event in conjunctions[:10]:
    print(
        f"{event['satellite']} ↔ {event['debris']} | "
        f"{event['miss_distance_km']} km | "
        f"TCA: {event['tca']} | "
        f"Relative velocity: {event['relative_velocity_km_s']} km/s"
    )