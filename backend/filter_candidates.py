"""Filter selected orbital objects into relevant conjunction candidates."""

import json
import math
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

INPUT_FILE = os.path.join(
    DATA_DIR,
    "selected_objects.json",
)

OUTPUT_FILE = os.path.join(
    DATA_DIR,
    "candidate_pairs.json",
)


# ---------------------------------------------------------------------------
# Candidate filtering parameters
# ---------------------------------------------------------------------------

MAX_CANDIDATES = 500

# Reasonable first-pass orbital similarity thresholds.
MAX_ALTITUDE_DIFFERENCE_KM = 500.0
MAX_INCLINATION_DIFFERENCE_DEG = 30.0
MAX_RAAN_DIFFERENCE_DEG = 90.0


# ---------------------------------------------------------------------------
# Load selected objects
# ---------------------------------------------------------------------------

if not os.path.exists(INPUT_FILE):
    raise FileNotFoundError(
        f"Selected object file not found: {INPUT_FILE}"
    )

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8",
) as file:
    objects = json.load(file)


satellites = [
    obj
    for obj in objects
    if obj.get("type") == "satellite"
]

debris = [
    obj
    for obj in objects
    if obj.get("type") == "debris"
]


# ---------------------------------------------------------------------------
# Orbital parameters
# ---------------------------------------------------------------------------

def get_orbit_data(obj):
    """Extract approximate orbital parameters from TLE line 2."""

    line2 = obj["TLE_LINE2"]

    try:
        inclination = float(line2[8:16])
        raan = float(line2[17:25])
        mean_motion = float(line2[52:63])

        # Mean motion: revolutions/day
        # Convert to radians/second.
        mean_motion_rad_s = (
            mean_motion * 2.0 * math.pi / 86400.0
        )

        if mean_motion_rad_s <= 0:
            return None

        # Earth's gravitational parameter, km^3/s^2
        mu = 398600.4418

        earth_radius_km = 6378.137

        semi_major_axis_km = (
            mu / (mean_motion_rad_s ** 2)
        ) ** (1.0 / 3.0)

        altitude_km = (
            semi_major_axis_km - earth_radius_km
        )

        return {
            "altitude_km": altitude_km,
            "inclination_deg": inclination,
            "raan_deg": raan,
        }

    except (ValueError, IndexError, KeyError):
        return None


def angle_difference(a, b):
    """Return smallest angular difference between two angles."""

    difference = abs(a - b)

    return min(
        difference,
        360.0 - difference,
    )


# ---------------------------------------------------------------------------
# Pre-compute orbital data
# ---------------------------------------------------------------------------

satellite_orbits = []
debris_orbits = []

invalid_satellites = 0
invalid_debris = 0


for satellite in satellites:

    orbit = get_orbit_data(satellite)

    if orbit is None:
        invalid_satellites += 1
        continue

    satellite_orbits.append(
        {
            "object": satellite,
            "orbit": orbit,
        }
    )


for debris_object in debris:

    orbit = get_orbit_data(debris_object)

    if orbit is None:
        invalid_debris += 1
        continue

    debris_orbits.append(
        {
            "object": debris_object,
            "orbit": orbit,
        }
    )


# ---------------------------------------------------------------------------
# Pair screening
# ---------------------------------------------------------------------------

strict_candidates = []
all_ranked_pairs = []

pairs_screened = 0


for satellite_entry in satellite_orbits:

    satellite = satellite_entry["object"]
    satellite_orbit = satellite_entry["orbit"]

    sat_altitude = satellite_orbit["altitude_km"]
    sat_inclination = satellite_orbit["inclination_deg"]
    sat_raan = satellite_orbit["raan_deg"]

    for debris_entry in debris_orbits:

        debris_object = debris_entry["object"]
        debris_orbit = debris_entry["orbit"]

        deb_altitude = debris_orbit["altitude_km"]
        deb_inclination = debris_orbit["inclination_deg"]
        deb_raan = debris_orbit["raan_deg"]

        pairs_screened += 1

        # ---------------------------------------------------------------
        # Orbital differences
        # ---------------------------------------------------------------

        altitude_difference = abs(
            sat_altitude - deb_altitude
        )

        inclination_difference = abs(
            sat_inclination - deb_inclination
        )

        raan_difference = angle_difference(
            sat_raan,
            deb_raan,
        )

        # ---------------------------------------------------------------
        # Normalized orbital similarity score
        #
        # Lower = more orbitally similar.
        # ---------------------------------------------------------------

        altitude_component = (
            altitude_difference
            / MAX_ALTITUDE_DIFFERENCE_KM
        )

        inclination_component = (
            inclination_difference
            / MAX_INCLINATION_DIFFERENCE_DEG
        )

        raan_component = (
            raan_difference
            / MAX_RAAN_DIFFERENCE_DEG
        )

        candidate_score = (
            altitude_component * 0.50
            + inclination_component * 0.30
            + raan_component * 0.20
        )

        pair = {
            "satellite": satellite,
            "debris": debris_object,
            "altitude_difference_km": round(
                altitude_difference,
                2,
            ),
            "inclination_difference_deg": round(
                inclination_difference,
                2,
            ),
            "raan_difference_deg": round(
                raan_difference,
                2,
            ),
            "candidate_score": round(
                candidate_score,
                6,
            ),
        }

        # ---------------------------------------------------------------
        # Save every pair for fallback ranking.
        # ---------------------------------------------------------------

        all_ranked_pairs.append(pair)

        # ---------------------------------------------------------------
        # Normal strict filter.
        # ---------------------------------------------------------------

        if (
            altitude_difference
            <= MAX_ALTITUDE_DIFFERENCE_KM
            and inclination_difference
            <= MAX_INCLINATION_DIFFERENCE_DEG
            and raan_difference
            <= MAX_RAAN_DIFFERENCE_DEG
        ):
            strict_candidates.append(pair)


# ---------------------------------------------------------------------------
# Select final candidates
# ---------------------------------------------------------------------------

fallback_used = False

strict_candidates.sort(
    key=lambda item: item["candidate_score"]
)

all_ranked_pairs.sort(
    key=lambda item: item["candidate_score"]
)


if len(strict_candidates) >= MAX_CANDIDATES:

    # Enough candidates passed the physical/orbital filter.
    candidates = strict_candidates[:MAX_CANDIDATES]

else:

    # Not enough pairs passed all three thresholds.
    # Use orbital-similarity ranking to fill the candidate pool.
    #
    # This is NOT fake data: every fallback pair is still a real
    # satellite/debris pair from the selected catalog.
    fallback_used = True

    candidates = all_ranked_pairs[:MAX_CANDIDATES]


# ---------------------------------------------------------------------------
# Save candidates
# ---------------------------------------------------------------------------

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        candidates,
        file,
        indent=2,
    )


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print("\n================================")
print("CANDIDATE FILTERING COMPLETE")
print("================================")

print(
    "Selected objects:",
    len(objects),
)

print(
    "Satellite objects:",
    len(satellites),
)

print(
    "Debris objects:",
    len(debris),
)

print(
    "Valid satellite orbits:",
    len(satellite_orbits),
)

print(
    "Valid debris orbits:",
    len(debris_orbits),
)

print(
    "Invalid satellite orbits:",
    invalid_satellites,
)

print(
    "Invalid debris orbits:",
    invalid_debris,
)

print(
    "Possible pairs screened:",
    pairs_screened,
)

print(
    "Pairs passing orbital filter:",
    len(strict_candidates),
)

print(
    "Final candidate pairs:",
    len(candidates),
)

print(
    "Maximum candidates:",
    MAX_CANDIDATES,
)

print(
    "Fallback ranking used:",
    "YES" if fallback_used else "NO",
)

print("\nThresholds:")
print(
    "  Altitude difference:",
    MAX_ALTITUDE_DIFFERENCE_KM,
    "km",
)

print(
    "  Inclination difference:",
    MAX_INCLINATION_DIFFERENCE_DEG,
    "deg",
)

print(
    "  RAAN difference:",
    MAX_RAAN_DIFFERENCE_DEG,
    "deg",
)

print("\nSaved:")
print(OUTPUT_FILE)


# ---------------------------------------------------------------------------
# Top candidates
# ---------------------------------------------------------------------------

print("\nTop 10 candidate pairs:\n")

for index, pair in enumerate(
    candidates[:10],
    start=1,
):

    print(
        f"{index:02d}. "
        f"{pair['satellite']['OBJECT_NAME']} <-> "
        f"{pair['debris']['OBJECT_NAME']} | "
        f"Altitude Δ: "
        f"{pair['altitude_difference_km']} km | "
        f"Inclination Δ: "
        f"{pair['inclination_difference_deg']}° | "
        f"RAAN Δ: "
        f"{pair['raan_difference_deg']}° | "
        f"Score: "
        f"{pair['candidate_score']}"
    )