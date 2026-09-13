from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

app = FastAPI(
    title="OrbitalGuard AI",
    description="Space Debris Detection & Collision Avoidance API",
    version="1.0.0",
)

app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


class PredictionInput(BaseModel):
    """Manual conjunction scenario sent by the Prediction Lab."""
    satellite_name: str | None = None
    satellite_norad: int | None = Field(default=None, ge=1)
    debris_name: str | None = None
    debris_norad: int | None = Field(default=None, ge=1)
    minimum_distance_km: float = Field(..., ge=0)
    relative_velocity_km_s: float = Field(..., ge=0)


def load_risk_model():
    model_path = os.path.join(MODEL_DIR, "risk_model.joblib")
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=503,
            detail="Risk model is not available. Train the model with train_risk_model.py first.",
        )
    try:
        return joblib.load(model_path)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Unable to load risk model: {exc}") from exc


@app.post("/api/predict")
def predict(payload: PredictionInput):
    """Run the trained Random Forest on a manually entered conjunction."""
    model = load_risk_model()
    values = pd.DataFrame([{
        "minimum_distance_km": payload.minimum_distance_km,
        "relative_velocity_km_s": payload.relative_velocity_km_s,
    }])

    label = str(model.predict(values)[0])
    confidence = None
    score = None

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(values)[0]
        confidence = round(float(np.max(probabilities)) * 100, 2)
        # Convert class probabilities into a readable 0–100 screening index.
        severity = {
            "LOW": 20.0,
            "MEDIUM": 55.0,
            "HIGH": 80.0,
            "CRITICAL": 100.0,
        }
        score = round(
            float(sum(
                probability * severity.get(str(cls).upper(), 50.0)
                for cls, probability in zip(model.classes_, probabilities)
            )),
            2,
        )

    if score is None:
        score = {
            "LOW": 20.0,
            "MEDIUM": 55.0,
            "HIGH": 80.0,
            "CRITICAL": 100.0,
        }.get(label.upper(), 50.0)

    interpretation = {
        "LOW": "Low-priority encounter under the trained prototype classifier.",
        "MEDIUM": "Moderate-priority encounter; review the conjunction and monitor the scenario.",
        "HIGH": "High-priority encounter; investigate the conjunction and consider avoidance analysis.",
        "CRITICAL": "Critical-priority encounter; requires immediate expert review in an operational workflow.",
    }.get(label.upper(), "Review the model output with the conjunction context.")

    return {
        "risk_label": label,
        "risk_score": score,
        "confidence": confidence,
        "model": "RandomForestClassifier",
        "features": ["minimum_distance_km", "relative_velocity_km_s"],
        "training_samples": load_json(os.path.join("..", "models", "risk_model_metadata.json")).get("training_samples"),
        "inputs": {
            "satellite_name": payload.satellite_name,
            "satellite_norad": payload.satellite_norad,
            "debris_name": payload.debris_name,
            "debris_norad": payload.debris_norad,
            "minimum_distance_km": payload.minimum_distance_km,
            "relative_velocity_km_s": payload.relative_velocity_km_s,
        },
        "interpretation": interpretation,
        "warning": "Prototype screening only; this is not a calibrated probability of collision or a flight command.",
    }


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "OrbitalGuard AI",
        "message": "Collision avoidance API is running",
    }


@app.get("/api/health")
def health():
    required = [
        "objects.json",
        "candidate_pairs.json",
        "candidate_trajectories.json",
        "conjunctions.json",
        "risk_scored_conjunctions.json",
        "avoidance_result.json",
        "avoidance_visualization.png",
    ]
    files = {name: os.path.exists(os.path.join(DATA_DIR, name)) for name in required}
    return {
        "status": "healthy" if all(files.values()) else "degraded",
        "data_files": files,
        "trained_model": os.path.exists(os.path.join(MODEL_DIR, "risk_model.joblib")),
    }


@app.get("/api/metadata")
def metadata():
    objects = load_json("objects.json") or []
    selected = load_json("selected_objects.json") or []
    candidates = load_json("candidate_pairs.json") or []
    trajectories = load_json("candidate_trajectories.json") or []
    conjunctions = load_json("risk_scored_conjunctions.json") or []
    model_metadata = load_json(os.path.join("..", "models", "risk_model_metadata.json")) or {}

    return {
        "data_source": "CelesTrak public GP/TLE data",
        "total_objects_ingested": len(objects),
        "selected_objects": len(selected),
        "candidate_pairs": len(candidates),
        "propagated_objects": len(trajectories),
        "conjunctions": len(conjunctions),
        "model": model_metadata,
        "limitations": [
            "TLE/SGP4 screening is an approximation of future state.",
            "Risk score is a screening index, not collision probability.",
            "Avoidance output is a simulated maneuver, not a flight command.",
        ],
    }


@app.get("/api/conjunctions")
def get_conjunctions():
    data = load_json("risk_scored_conjunctions.json") or []
    return {"count": len(data), "conjunctions": data}


@app.get("/api/conjunctions/high-risk")
def get_high_risk():
    data = load_json("risk_scored_conjunctions.json") or []
    high_risk = [item for item in data if item.get("risk_level") == "HIGH"]
    return {"count": len(high_risk), "conjunctions": high_risk}


@app.get("/api/conjunctions/top")
def get_top_conjunction():
    data = load_json("risk_scored_conjunctions.json") or []
    return data[0] if data else {}


@app.get("/api/avoidance")
def get_avoidance():
    return load_json("avoidance_result.json") or {}


@app.get("/api/avoidance/tradeoff")
def get_avoidance_tradeoff():
    avoidance = load_json("avoidance_result.json") or {}
    return {
        "satellite": avoidance.get("satellite"),
        "debris": avoidance.get("debris"),
        "original_miss_distance_km": avoidance.get("original_miss_distance_km"),
        "selected": avoidance.get("fuel"),
        "risk_reduction_percent": avoidance.get("risk_reduction_percent"),
        "candidates": avoidance.get("tradeoff_candidates", []),
        "note": "Fuel values are screening estimates based on the configured mass, Isp and propellant cost assumptions.",
    }


@app.get("/api/dashboard")
def get_dashboard():
    conjunctions = load_json("risk_scored_conjunctions.json") or []
    avoidance = load_json("avoidance_result.json") or {}
    objects = load_json("objects.json") or []
    high = sum(1 for item in conjunctions if item.get("risk_level") == "HIGH")
    medium = sum(1 for item in conjunctions if item.get("risk_level") == "MEDIUM")
    low = sum(1 for item in conjunctions if item.get("risk_level") == "LOW")

    return {
        "total_objects": len(objects),
        "total_conjunctions": len(conjunctions),
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "highest_risk": conjunctions[0] if conjunctions else None,
        "avoidance": avoidance,
    }
