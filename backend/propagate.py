import json
from datetime import datetime, timezone, timedelta
from sgp4.api import Satrec
from sgp4.conveniences import jday

# Load orbital data
with open("data/objects.json", "r", encoding="utf-8") as file:
    objects = json.load(file)

# Test first object
obj = objects[0]

print("Object:", obj["OBJECT_NAME"])
print("NORAD ID:", obj["NORAD_CAT_ID"])

# Create satellite from TLE
satellite = Satrec.twoline2rv(
    obj["TLE_LINE1"],
    obj["TLE_LINE2"]
)

# Current UTC time
now = datetime.now(timezone.utc)

# Calculate position at current time
jd, fr = jday(
    now.year,
    now.month,
    now.day,
    now.hour,
    now.minute,
    now.second + now.microsecond / 1_000_000
)

error, position, velocity = satellite.sgp4(jd, fr)

if error == 0:
    print("\nCurrent Position (km):")
    print("X:", position[0])
    print("Y:", position[1])
    print("Z:", position[2])

    print("\nCurrent Velocity (km/s):")
    print("VX:", velocity[0])
    print("VY:", velocity[1])
    print("VZ:", velocity[2])
else:
    print("\nSGP4 error code:", error)