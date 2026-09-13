"""Select a manageable, orbitally relevant subset of objects."""

import json
import math
import os

from sgp4.api import Satrec


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

INPUT_FILE = os.path.join(DATA_DIR, "objects.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "selected_objects.json")


# ---------------------------------------------------------------------------
# Selection targets
# ---------------------------------------------------------------------------

MAX_SATELLITES = 500
MAX_DEBRIS = 500

# Maximum total number of selected objects.
MAX_TOTAL = MAX_SATELLITES + MAX_DEBRIS


# ---------------------------------------------------------------------------
# Orbital relevance parameters
# ---------------------------------------------------------------------------
#
# These values are used to prioritize objects that are more likely to be
# relevant to the satellite/debris conjunction screening problem.
#
# Lower altitude difference, inclination difference and eccentricity are
# generally preferred for near-Earth conjunction screening.
#

REFERENCE_ALTITUDE_KM = 500.0
REFERENCE_INCLINATION_DEG = 30.0


def get_orbital_parameters(obj):
    """Extract basic orbital parameters from a TLE using SGP4."""

    try:
        sat = Satrec.twoline2rv(
            obj["TLE_LINE1"],
            obj["TLE_LINE2"],
        )

        # SGP4 stores:
        # inclo      -> radians
        # ecco       -> eccentricity
        # no_kozai   -> radians/minute
        #
        # Convert mean motion to revolutions/day.
        mean_motion_rev_day = (
            sat.no_kozai * 1440.0 / (2.0 * math.pi)
        )

        # Approximate semi-major axis from mean motion.
        # Earth gravitational parameter in km^3/s^2.
        mu = 398600.4418

        mean_motion_rad_s = (
            mean_motion_rev_day * 2.0 * math.pi / 86400.0
        )

        if mean_motion_rad_s <= 0:
            return None

        semi_major_axis_km = (
            mu / (mean_motion_rad_s ** 2)
        ) ** (1.0 / 3.0)

        # Approximate perigee altitude.
        perigee_altitude_km = (
            semi_major_axis_km * (1.0 - sat.ecco)
        ) - 6378.137

        # Approximate apogee altitude.
        apogee_altitude_km = (
            semi_major_axis_km * (1.0 + sat.ecco)
        ) - 6378.137

        inclination_deg = math.degrees(sat.inclo)

        return {
            "inclination_deg": inclination_deg,
            "eccentricity": sat.ecco,
            "mean_motion_rev_day": mean_motion_rev_day,
            "semi_major_axis_km": semi_major_axis_km,
            "perigee_altitude_km": perigee_altitude_km,
            "apogee_altitude_km": apogee_altitude_km,
        }

    except Exception:
        return None


def relevance_score(obj, orbital):
    """
    Calculate an orbital relevance score.

    Higher score = more relevant for near-Earth conjunction screening.
    """

    if orbital is None:
        return -1.0

    perigee = orbital["perigee_altitude_km"]
    inclination = orbital["inclination_deg"]
    eccentricity = orbital["eccentricity"]

    # ---------------------------------------------------------------
    # Altitude relevance
    #
    # Prioritize objects whose perigee is reasonably close to the
    # main low-Earth-orbit screening region.
    # ---------------------------------------------------------------

    altitude_difference = abs(
        perigee - REFERENCE_ALTITUDE_KM
    )

    altitude_score = max(
        0.0,
        1.0 - altitude_difference / 1500.0,
    )

    # ---------------------------------------------------------------
    # Inclination relevance
    # ---------------------------------------------------------------

    inclination_difference = abs(
        inclination - REFERENCE_INCLINATION_DEG
    )

    inclination_score = max(
        0.0,
        1.0 - inclination_difference / 90.0,
    )

    # ---------------------------------------------------------------
    # Eccentricity relevance
    #
    # Lower eccentricity receives a small preference, but eccentricity
    # is deliberately not allowed to dominate the selection.
    # ---------------------------------------------------------------

    eccentricity_score = max(
        0.0,
        1.0 - min(eccentricity, 1.0),
    )

    # ---------------------------------------------------------------
    # Combined score
    # ---------------------------------------------------------------

    score = (
        altitude_score * 0.55
        + inclination_score * 0.30
        + eccentricity_score * 0.15
    )

    return score


def main():

    print("\n================================")
    print("ORBITAL OBJECT SELECTION")
    print("================================")

    # -----------------------------------------------------------------------
    # Load complete validated catalog
    # -----------------------------------------------------------------------

    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    with open(
        INPUT_FILE,
        "r",
        encoding="utf-8",
    ) as file:

        objects = json.load(file)

    print("Total available objects:", len(objects))

    # -----------------------------------------------------------------------
    # Separate satellites and debris
    # -----------------------------------------------------------------------

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

    print("Available satellites:", len(satellites))
    print("Available debris:", len(debris))

    # -----------------------------------------------------------------------
    # Score objects
    # -----------------------------------------------------------------------

    def score_objects(items):

        scored = []

        for obj in items:

            orbital = get_orbital_parameters(obj)

            if orbital is None:
                continue

            score = relevance_score(
                obj,
                orbital,
            )

            obj = dict(obj)

            obj["orbital_parameters"] = orbital
            obj["relevance_score"] = round(
                score,
                6,
            )

            scored.append(obj)

        return scored

    print("\nCalculating orbital relevance...")

    scored_satellites = score_objects(
        satellites
    )

    scored_debris = score_objects(
        debris
    )

    print(
        "Valid scored satellites:",
        len(scored_satellites),
    )

    print(
        "Valid scored debris:",
        len(scored_debris),
    )

    # -----------------------------------------------------------------------
    # Sort by relevance
    # -----------------------------------------------------------------------

    scored_satellites.sort(
        key=lambda obj: obj["relevance_score"],
        reverse=True,
    )

    scored_debris.sort(
        key=lambda obj: obj["relevance_score"],
        reverse=True,
    )

    # -----------------------------------------------------------------------
    # Select target population
    # -----------------------------------------------------------------------

    selected_satellites = scored_satellites[
        :MAX_SATELLITES
    ]

    selected_debris = scored_debris[
        :MAX_DEBRIS
    ]

    selected_objects = (
        selected_satellites
        + selected_debris
    )

    # Safety limit.
    selected_objects = selected_objects[
        :MAX_TOTAL
    ]

    # Stable ordering.
    selected_objects.sort(
        key=lambda obj: (
            obj.get("type", ""),
            obj.get("NORAD_CAT_ID", 0),
        )
    )

    # -----------------------------------------------------------------------
    # Save
    # -----------------------------------------------------------------------

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            selected_objects,
            file,
            indent=2,
        )

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------

    selected_satellite_count = sum(
        1
        for obj in selected_objects
        if obj.get("type") == "satellite"
    )

    selected_debris_count = sum(
        1
        for obj in selected_objects
        if obj.get("type") == "debris"
    )

    print("\n================================")
    print("SELECTION COMPLETE")
    print("================================")

    print(
        "Selected satellites:",
        selected_satellite_count,
    )

    print(
        "Selected debris:",
        selected_debris_count,
    )

    print(
        "Total selected:",
        len(selected_objects),
    )

    print(
        "Maximum allowed:",
        MAX_TOTAL,
    )

    print("\nSaved:")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    main()