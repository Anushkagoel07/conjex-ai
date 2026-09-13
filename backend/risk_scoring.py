import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

with open(os.path.join(DATA_DIR, "conjunctions.json"), "r", encoding="utf-8") as file:
    conjunctions = json.load(file)


def calculate_risk(distance, relative_velocity):
    """Physics-informed screening score; this is not a probability of collision."""
    if distance <= 10:
        distance_score = 100
    elif distance <= 25:
        distance_score = 90
    elif distance <= 50:
        distance_score = 70
    elif distance <= 75:
        distance_score = 45
    else:
        distance_score = 20

    if relative_velocity >= 12:
        velocity_score = 100
    elif relative_velocity >= 10:
        velocity_score = 85
    elif relative_velocity >= 8:
        velocity_score = 70
    elif relative_velocity >= 5:
        velocity_score = 50
    else:
        velocity_score = 25

    return round(0.70 * distance_score + 0.30 * velocity_score, 2)


def distance_value(item):
    return item.get("minimum_distance_km", item.get("miss_distance_km"))

for item in conjunctions:
    distance = distance_value(item)
    velocity = item["relative_velocity_km_s"]
    if distance is None:
        continue

    score = calculate_risk(distance, velocity)
    item["risk_score"] = score
    item["risk_level"] = "HIGH" if score >= 75 else "MEDIUM" if score >= 45 else "LOW"

conjunctions.sort(key=lambda x: x["risk_score"], reverse=True)

with open(os.path.join(DATA_DIR, "risk_scored_conjunctions.json"), "w", encoding="utf-8") as file:
    json.dump(conjunctions, file, indent=2)

print("Physics risk scoring complete!")
print("Total conjunctions:", len(conjunctions))
