import json
from datetime import datetime, timezone, timedelta

from sgp4.api import Satrec
from sgp4.conveniences import jday


# Load selected objects
with open("data/selected_objects.json", "r", encoding="utf-8") as file:
    objects = json.load(file)

start_time = datetime.now(timezone.utc)

all_trajectories = []

print(f"Generating trajectories for {len(objects)} objects...\n")

for index, obj in enumerate(objects, start=1):

    satellite = Satrec.twoline2rv(
        obj["TLE_LINE1"],
        obj["TLE_LINE2"]
    )

    points = []

    # 24 hours, one point per minute
    for minute in range(24 * 60 + 1):

        current_time = start_time + timedelta(minutes=minute)

        jd, fr = jday(
            current_time.year,
            current_time.month,
            current_time.day,
            current_time.hour,
            current_time.minute,
            current_time.second +
            current_time.microsecond / 1_000_000
        )

        error, position, velocity = satellite.sgp4(jd, fr)

        if error != 0:
            continue

        points.append({
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

    all_trajectories.append({
        "name": obj["OBJECT_NAME"],
        "norad_id": obj["NORAD_CAT_ID"],
        "type": obj["type"],
        "trajectory": points
    })

    print(f"[{index}/{len(objects)}] {obj['OBJECT_NAME']}")


with open("data/trajectories.json", "w", encoding="utf-8") as file:
    json.dump(all_trajectories, file)

print("\nTrajectory generation complete!")
print("Objects processed:", len(all_trajectories))
print("Saved to: data/trajectories.json")