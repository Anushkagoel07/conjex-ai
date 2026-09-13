"""Fetch, validate, deduplicate and normalize public TLE data."""

import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta

from sgp4.api import Satrec


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


# ---------------------------------------------------------------------------
# CelesTrak sources
# ---------------------------------------------------------------------------
#
# We intentionally use multiple real public groups instead of relying only
# on the stations group. Some groups may be unavailable depending on
# CelesTrak/server access, so failed sources are skipped safely.
#
SOURCES = {
    "active_satellites": {
        "url": (
            "https://celestrak.org/NORAD/elements/gp.php"
            "?GROUP=active&FORMAT=TLE"
        ),
        "type": "satellite",
    },
    "cosmos_2251_debris": {
        "url": (
            "https://celestrak.org/NORAD/elements/gp.php"
            "?NAME=COSMOS%202251%20DEB&FORMAT=TLE"
        ),
        "type": "debris",
    },
    "fengyun_1c_debris": {
        "url": (
            "https://celestrak.org/NORAD/elements/gp.php"
            "?NAME=FENGYUN%201C%20DEB&FORMAT=TLE"
        ),
        "type": "debris",
    },
    "iridium_33_debris": {
        "url": (
            "https://celestrak.org/NORAD/elements/gp.php"
            "?NAME=IRIDIUM%2033%20DEB&FORMAT=TLE"
        ),
        "type": "debris",
    },
    "stations": {
        "url": (
            "https://celestrak.org/NORAD/elements/gp.php"
            "?GROUP=stations&FORMAT=TLE"
        ),
        "type": "satellite",
    },
}


# TLEs older than this are reported as stale.
# They are not silently discarded.
STALE_DAYS = 30


# ---------------------------------------------------------------------------
# TLE validation
# ---------------------------------------------------------------------------

def tle_checksum_valid(line):
    """Validate the standard TLE checksum."""

    if len(line) < 69:
        return False

    checksum_char = line[68]

    if not checksum_char.isdigit():
        return False

    total = 0

    for char in line[:68]:
        if char.isdigit():
            total += int(char)
        elif char == "-":
            total += 1

    return total % 10 == int(checksum_char)


def parse_tle_epoch(line1):
    """Return TLE epoch as a timezone-aware datetime."""

    try:
        year_short = int(line1[18:20])
        day_of_year = float(line1[20:32])

        # TLE convention:
        # 57-99 => 1957-1999
        # 00-56 => 2000-2056
        year = (
            1900 + year_short
            if year_short >= 57
            else 2000 + year_short
        )

        day_int = int(day_of_year)
        fraction = day_of_year - day_int

        return (
            datetime(year, 1, 1, tzinfo=timezone.utc)
            + timedelta(days=day_int - 1)
            + timedelta(seconds=fraction * 86400)
        )

    except (ValueError, IndexError):
        return None


def validate_tle(line1, line2):
    """Validate TLE format, checksum and SGP4 parsing."""

    if not line1.startswith("1 ") or not line2.startswith("2 "):
        return False, "invalid_format"

    if len(line1) < 69 or len(line2) < 69:
        return False, "invalid_length"

    if not tle_checksum_valid(line1):
        return False, "line1_checksum"

    if not tle_checksum_valid(line2):
        return False, "line2_checksum"

    try:
        sat = Satrec.twoline2rv(line1, line2)

        # SGP4 error code 0 means successful initialization.
        if getattr(sat, "error", 0) not in (0, None):
            return False, f"sgp4_error_{sat.error}"

    except Exception:
        return False, "sgp4_parse_error"

    return True, None


# ---------------------------------------------------------------------------
# Fetch / parse
# ---------------------------------------------------------------------------

def fetch_tle(url):
    """Fetch TLE text from CelesTrak and parse name/line1/line2."""

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "OrbitalGuard/1.0",
            "Accept": "text/plain",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8")

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    objects = []

    # Expected CelesTrak TLE format:
    #
    # OBJECT NAME
    # LINE 1
    # LINE 2
    #
    for i in range(0, len(lines) - 2, 3):

        name, line1, line2 = lines[i:i + 3]

        if not (
            line1.startswith("1 ")
            and line2.startswith("2 ")
        ):
            continue

        try:
            norad_id = int(line1[2:7])
        except ValueError:
            continue

        objects.append(
            {
                "OBJECT_NAME": name,
                "NORAD_CAT_ID": norad_id,
                "TLE_LINE1": line1,
                "TLE_LINE2": line2,
            }
        )

    return objects


# ---------------------------------------------------------------------------
# Main ingestion pipeline
# ---------------------------------------------------------------------------

def main():

    os.makedirs(DATA_DIR, exist_ok=True)

    stats = {
        "fetched": 0,
        "invalid": 0,
        "duplicates_removed": 0,
        "stale_records": 0,
        "valid_unique": 0,
        "sources": {},
    }

    # NORAD ID -> newest valid object
    seen_norad = {}

    now = datetime.now(timezone.utc)

    print("\n================================")
    print("ORBITAL GUARD DATA INGESTION")
    print("================================")

    for category, config in SOURCES.items():

        url = config["url"]
        object_type = config["type"]

        print(f"\nFetching {category}...")

        source_stats = {
            "fetched": 0,
            "invalid": 0,
            "duplicates": 0,
            "stale": 0,
            "error": None,
        }

        try:
            objects = fetch_tle(url)

        except Exception as exc:

            source_stats["error"] = str(exc)
            stats["sources"][category] = source_stats

            print(f"  ERROR: {exc}")
            print("  Skipping this source.")

            continue

        source_stats["fetched"] = len(objects)

        print(f"  Found: {len(objects)}")

        for obj in objects:

            stats["fetched"] += 1

            line1 = obj["TLE_LINE1"]
            line2 = obj["TLE_LINE2"]

            # ---------------------------------------------------------------
            # Validate TLE
            # ---------------------------------------------------------------

            valid, reason = validate_tle(line1, line2)

            if not valid:

                stats["invalid"] += 1
                source_stats["invalid"] += 1

                continue

            # ---------------------------------------------------------------
            # Parse epoch
            # ---------------------------------------------------------------

            epoch = parse_tle_epoch(line1)

            if epoch is None:

                stats["invalid"] += 1
                source_stats["invalid"] += 1

                continue

            # ---------------------------------------------------------------
            # Calculate age
            # ---------------------------------------------------------------

            age_days = (
                now - epoch
            ).total_seconds() / 86400

            is_stale = age_days > STALE_DAYS

            if is_stale:

                stats["stale_records"] += 1
                source_stats["stale"] += 1

            # ---------------------------------------------------------------
            # Normalize metadata
            # ---------------------------------------------------------------

            obj["type"] = object_type
            obj["source"] = category
            obj["tle_epoch"] = epoch.isoformat()
            obj["tle_age_days"] = round(
                max(age_days, 0),
                2,
            )
            obj["is_stale"] = is_stale

            norad_id = obj["NORAD_CAT_ID"]

            # ---------------------------------------------------------------
            # Deduplicate by NORAD ID
            #
            # If the same object appears in multiple groups,
            # keep the newest valid TLE.
            # ---------------------------------------------------------------

            existing = seen_norad.get(norad_id)

            if existing is not None:

                existing_epoch = parse_tle_epoch(
                    existing["TLE_LINE1"]
                )

                if (
                    existing_epoch is None
                    or epoch > existing_epoch
                ):
                    seen_norad[norad_id] = obj

                stats["duplicates_removed"] += 1
                source_stats["duplicates"] += 1

            else:

                seen_norad[norad_id] = obj

        stats["sources"][category] = source_stats

        print(
            f"  Invalid: {source_stats['invalid']}"
        )
        print(
            f"  Duplicates: {source_stats['duplicates']}"
        )
        print(
            f"  Stale: {source_stats['stale']}"
        )

    # -----------------------------------------------------------------------
    # Final unique object list
    # -----------------------------------------------------------------------

    unique_objects = list(
        seen_norad.values()
    )

    stats["valid_unique"] = len(unique_objects)

    # Stable ordering for reproducible pipeline outputs.
    unique_objects.sort(
        key=lambda obj: (
            obj["type"],
            obj["NORAD_CAT_ID"],
        )
    )

    # -----------------------------------------------------------------------
    # Save objects.json
    # -----------------------------------------------------------------------

    objects_path = os.path.join(
        DATA_DIR,
        "objects.json",
    )

    with open(
        objects_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            unique_objects,
            file,
            indent=2,
        )

    # -----------------------------------------------------------------------
    # Save ingestion statistics
    # -----------------------------------------------------------------------

    stats["generated_at"] = now.isoformat()
    stats["output_file"] = "data/objects.json"

    stats_path = os.path.join(
        DATA_DIR,
        "ingestion_stats.json",
    )

    with open(
        stats_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            stats,
            file,
            indent=2,
        )

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------

    satellite_count = sum(
        1
        for obj in unique_objects
        if obj["type"] == "satellite"
    )

    debris_count = sum(
        1
        for obj in unique_objects
        if obj["type"] == "debris"
    )

    print("\n================================")
    print("DATA INGESTION COMPLETE")
    print("================================")

    print("Fetched:", stats["fetched"])
    print("Invalid:", stats["invalid"])
    print(
        "Duplicates removed:",
        stats["duplicates_removed"],
    )
    print(
        "Stale records:",
        stats["stale_records"],
    )
    print(
        "Valid unique objects:",
        stats["valid_unique"],
    )

    print("\nObject breakdown:")
    print("  Satellites:", satellite_count)
    print("  Debris:", debris_count)

    print("\nSaved:")
    print(objects_path)

    print("\nStats:")
    print(stats_path)


if __name__ == "__main__":
    main()