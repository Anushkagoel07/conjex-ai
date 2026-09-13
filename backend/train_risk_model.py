"""Train the ConjexAI prototype Random Forest risk classifier.

The labels are physics-informed screening labels, not historical collision
outcomes.  A balanced synthetic training set is generated around the defined
screening boundaries so the model learns the intended decision regions rather
than the accidental class imbalance in the small event history.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")
FEATURES = ["minimum_distance_km", "relative_velocity_km_s"]


def read_json(name):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def risk_label(distance, velocity):
    if distance <= 5.0 and velocity >= 7.0:
        return "CRITICAL"
    if distance <= 10.0:
        return "HIGH"
    if distance <= 25.0:
        return "MEDIUM"
    return "LOW"


# Build a balanced synthetic screening dataset. The actual conjunction data
# remains useful for reference/evaluation, but it is not allowed to dominate
# training because the current prototype history is strongly LOW-heavy.
rng = np.random.default_rng(42)

# Distances are concentrated around all decision boundaries plus the broader
# operational range. Velocities cover both low and high relative-speed cases.
n_per_region = 1400
regions = [
    (0.05, 4.95, 0.05, 20.0),   # <=5 km, velocity decides CRITICAL vs HIGH
    (5.05, 9.95, 0.05, 20.0),   # HIGH
    (10.05, 24.95, 0.05, 20.0), # MEDIUM
    (25.05, 200.0, 0.05, 20.0), # LOW
]

synthetic = []
for low_d, high_d, low_v, high_v in regions:
    distances = rng.uniform(low_d, high_d, n_per_region)
    velocities = rng.uniform(low_v, high_v, n_per_region)
    synthetic.extend(
        (float(d), float(v), risk_label(d, v))
        for d, v in zip(distances, velocities)
    )

# Explicitly add samples around the CRITICAL velocity boundary at <=5 km and
# around every distance boundary so the classifier sees sharp transitions.
for distance in [0.1, 1, 3, 4.9, 5.0, 5.1, 7.5, 9.9, 10.0, 10.1, 20, 24.9, 25.0, 25.1, 50, 100, 200]:
    for velocity in [0.1, 3, 6.9, 7.0, 7.1, 10, 15, 20]:
        synthetic.append((float(distance), float(velocity), risk_label(distance, velocity)))

# Keep a small set of real observations in the metadata/evaluation pool. They
# are labelled with the same deterministic screening policy for consistency.
real_reference = []
for filename in ("conjunctions.json", "risk_events.json"):
    for event in read_json(filename):
        distance = event.get("minimum_distance_km", event.get("miss_distance_km"))
        velocity = event.get("relative_velocity_km_s")
        if distance is not None and velocity is not None:
            real_reference.append((float(distance), float(velocity), risk_label(float(distance), float(velocity))))

# Deduplicate the synthetic points, then train/test split.
df = pd.DataFrame(synthetic, columns=FEATURES + ["risk_label"]).drop_duplicates()
X = df[FEATURES]
y = df["risk_label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=500,
    max_depth=14,
    min_samples_leaf=2,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1,
)
model.fit(X_train, y_train)

predictions = model.predict(X_test)
print("Training samples:", len(df))
print("Reference real events:", len(real_reference))
print("\nLabel distribution:\n", y.value_counts())
print("\nModel evaluation:\n")
print(classification_report(y_test, predictions, zero_division=0))

os.makedirs(MODEL_DIR, exist_ok=True)
model_path = os.path.join(MODEL_DIR, "risk_model.joblib")
joblib.dump(model, model_path)

metadata = {
    "model": "RandomForestClassifier",
    "features": FEATURES,
    "training_samples": int(len(df)),
    "training_sources": ["physics-informed synthetic screening scenarios"],
    "reference_sources": ["conjunctions.json", "risk_events.json"],
    "label_source": "physics-informed prototype thresholds",
    "thresholds": {
        "CRITICAL": "minimum_distance_km <= 5 AND relative_velocity_km_s >= 7",
        "HIGH": "minimum_distance_km <= 10",
        "MEDIUM": "minimum_distance_km <= 25",
        "LOW": "minimum_distance_km > 25",
    },
    "class_distribution": {str(k): int(v) for k, v in y.value_counts().items()},
    "warning": "Not trained on historical collision outcomes and not a calibrated collision-probability model. Confidence is model class confidence, not collision probability.",
}
with open(os.path.join(MODEL_DIR, "risk_model_metadata.json"), "w", encoding="utf-8") as file:
    json.dump(metadata, file, indent=2)

print(f"\nModel saved to: {model_path}")
