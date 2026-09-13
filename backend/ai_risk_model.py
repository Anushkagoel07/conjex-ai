"""AI-assisted risk ranking: Isolation Forest + optional Random Forest label."""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_PATH = os.path.join(BASE_DIR, "models", "risk_model.joblib")


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as file:
        return json.load(file)


candidates = load_json("candidate_pairs.json")
trajectories = load_json("candidate_trajectories.json")
trajectory_map = {obj["NORAD_CAT_ID"]: obj for obj in trajectories}

events = []
features = []

for pair in candidates:
    sat_id = pair["satellite"]["NORAD_CAT_ID"]
    debris_id = pair["debris"]["NORAD_CAT_ID"]
    sat = trajectory_map.get(sat_id)
    debris = trajectory_map.get(debris_id)
    if sat is None or debris is None:
        continue

    sat_positions = np.asarray(sat["positions_km"], dtype=float)
    debris_positions = np.asarray(debris["positions_km"], dtype=float)
    sat_velocities = np.asarray(sat["velocities_km_s"], dtype=float)
    debris_velocities = np.asarray(debris["velocities_km_s"], dtype=float)

    valid = (
        np.isfinite(sat_positions).all(axis=1)
        & np.isfinite(debris_positions).all(axis=1)
        & np.isfinite(sat_velocities).all(axis=1)
        & np.isfinite(debris_velocities).all(axis=1)
    )
    if not np.any(valid):
        continue

    distances = np.linalg.norm(sat_positions - debris_positions, axis=1)
    distances[~valid] = np.inf
    closest_index = int(np.argmin(distances))
    minimum_distance = float(distances[closest_index])
    relative_velocity = float(np.linalg.norm(
        sat_velocities[closest_index] - debris_velocities[closest_index]
    ))

    altitude_difference = pair["altitude_difference_km"]
    inclination_difference = pair["inclination_difference_deg"]
    raan_difference = pair["raan_difference_deg"]

    features.append([
        minimum_distance,
        relative_velocity,
        altitude_difference,
        inclination_difference,
        raan_difference,
    ])
    events.append({
        "satellite_name": sat["OBJECT_NAME"],
        "satellite_norad": sat_id,
        "debris_name": debris["OBJECT_NAME"],
        "debris_norad": debris_id,
        "time": sat["timestamps"][closest_index],
        "minimum_distance_km": minimum_distance,
        "relative_velocity_km_s": relative_velocity,
        "altitude_difference_km": altitude_difference,
        "inclination_difference_deg": inclination_difference,
        "raan_difference_deg": raan_difference,
    })

if not features:
    raise ValueError("No valid candidate encounters were available for AI risk analysis.")

features = np.asarray(features, dtype=float)

# Unsupervised anomaly detector: identifies unusual encounter feature combinations.
model = IsolationForest(n_estimators=200, contamination=0.10, random_state=42)
model.fit(features)
anomaly_score = -model.decision_function(features)
ai_scores = MinMaxScaler().fit_transform(anomaly_score.reshape(-1, 1)).flatten() * 100

# Optional supervised prototype model trained by train_risk_model.py.
rf_model = None
if os.path.exists(MODEL_PATH):
    rf_model = joblib.load(MODEL_PATH)

for event, ai_score in zip(events, ai_scores):
    distance = event["minimum_distance_km"]
    velocity = event["relative_velocity_km_s"]

    proximity_score = max(
    0.0,
    min(100.0, ((200.0 - distance) / 200.0) * 100.0)
)
    velocity_score = max(0.0, min(100.0, (velocity / 15.0) * 100.0))

    final_score = 0.45 * float(ai_score) + 0.40 * proximity_score + 0.15 * velocity_score

    event["ai_anomaly_score"] = round(float(ai_score), 2)
    event["risk_score"] = round(float(final_score), 2)
    event["risk_level"] = "HIGH" if final_score >= 70 else "MEDIUM" if final_score >= 40 else "LOW"

    if rf_model is not None:
        rf_input = pd.DataFrame([{
            "minimum_distance_km": distance,
            "relative_velocity_km_s": velocity,
        }])
        event["ml_risk_label"] = str(rf_model.predict(rf_input)[0])
        if hasattr(rf_model, "predict_proba"):
            event["ml_confidence"] = round(float(np.max(rf_model.predict_proba(rf_input)[0])) * 100, 2)

# Only close approaches are exposed as conjunction events.
CONJUNCTION_THRESHOLD_KM = 200.0

conjunctions = [
    e for e in events
    if e["minimum_distance_km"] <= CONJUNCTION_THRESHOLD_KM
]
conjunctions.sort(key=lambda x: x["risk_score"], reverse=True)

with open(os.path.join(DATA_DIR, "risk_scored_conjunctions.json"), "w", encoding="utf-8") as file:
    json.dump(conjunctions, file, indent=2)

print("AI risk model complete!")
print("Candidate encounters analyzed:", len(events))
print(f"Conjunction threshold: {CONJUNCTION_THRESHOLD_KM} km")
print("Actual conjunctions:", len(conjunctions))
print("Random Forest artifact used:", bool(rf_model))