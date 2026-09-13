import json
from datetime import datetime, timedelta, timezone

import numpy as np
from sgp4.api import Satrec
from sgp4.conveniences import jday


with open("data/candidate_pairs.json", "r", encoding="utf-8") as file:
    candidates = json.load(file)


# Get unique objects from the 500 candidate pairs
objects = {}

for pair in candidates:
    satellite = pair["satellite"]
    debris = pair["debris"]

    objects[satellite["NORAD_CAT_ID"]] = satellite
    objects[debris["NORAD_CAT_ID"]] = debris


print("Unique objects:", len(objects))


# Time settings
start_time = datetime.now(timezone.utc).replace(second=0, microsecond=0)

duration_hours = 24
step_minutes = 1

total_steps = duration_hours * 60 // step_minutes + 1


trajectories = []


for index, obj in enumerate(objects.values(), start=1):

    satellite = Satrec.twoline2rv(
        obj["TLE_LINE1"],
        obj["TLE_LINE2"]
    )

    positions = []
    velocities = []
    timestamps = []

    for step in range(total_steps):

        current_time = start_time + timedelta(
            minutes=step * step_minutes
        )

        jd, fr = jday(
            current_time.year,
            current_time.month,
            current_time.day,
            current_time.hour,
            current_time.minute,
            current_time.second
            + current_time.microsecond / 1_000_000
        )

        error, position, velocity = satellite.sgp4(jd, fr)

        if error != 0:
            positions.append(None)
            velocities.append(None)
        else:
            positions.append([
                float(position[0]),
                float(position[1]),
                float(position[2])
            ])

            velocities.append([
                float(velocity[0]),
                float(velocity[1]),
                float(velocity[2])
            ])

        timestamps.append(current_time.isoformat())

    trajectories.append({
        "NORAD_CAT_ID": obj["NORAD_CAT_ID"],
        "OBJECT_NAME": obj["OBJECT_NAME"],
        "type": obj["type"],
        "timestamps": timestamps,
        "positions_km": positions,
        "velocities_km_s": velocities
    })

    if index % 50 == 0:
        print(f"Processed {index}/{len(objects)} objects")


with open(
    "data/candidate_trajectories.json",
    "w",
    encoding="utf-8"
) as file:
    json.dump(trajectories, file)


print("\nTrajectory generation complete!")
print("Objects processed:", len(trajectories))
print("Time points per object:", total_steps)
print("Saved to: data/candidate_trajectories.json")