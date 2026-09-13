import json
from datetime import datetime, timezone, timedelta

from sgp4.api import Satrec
from sgp4.conveniences import jday


# Load TLE data
with open("data/objects.json", "r", encoding="utf-8") as file:
    objects = json.load(file)

obj = objects[0]

print("Generating trajectory for:", obj["OBJECT_NAME"])
print("NORAD ID:", obj["NORAD_CAT_ID"])


# Create SGP4 satellite
satellite = Satrec.twoline2rv(
    obj["TLE_LINE1"],
    obj["TLE_LINE2"]
)


# Start time
start_time = datetime.now(timezone.utc)

trajectory = []

# Generate one position every minute for 24 hours
for minute in range(24 * 60 + 1):

    current_time = start_time + timedelta(minutes=minute)

    jd, fr = jday(
        current_time.year,
        current_time.month,
        current_time.day,
        current_time.hour,
        current_time.minute,
        current_time.second + current_time.microsecond / 1_000_000
    )

    error, position, velocity = satellite.sgp4(jd, fr)

    if error != 0:
        print(
            f"SGP4 error at {current_time.isoformat()}: {error}"
        )
        continue

    trajectory.append({
        "time": current_time.isoformat(),
        "position_km": {
            "x": position[0],
            "y": position[1],
            "z": position[2]
        },
        "velocity_km_s": {
            "x": velocity[0],
            "y": velocity[1],
            "z": velocity[2]
        }
    })


# Save trajectory
with open("data/trajectory.json", "w", encoding="utf-8") as file:
    json.dump(trajectory, file, indent=2)


print("\nTrajectory generated successfully!")
print("Total points:", len(trajectory))
print("Saved to: data/trajectory.json")