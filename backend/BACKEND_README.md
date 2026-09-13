# OrbitalGuard AI — Backend

## What is included

- Public TLE ingestion from CelesTrak
- SGP4 24-hour trajectory propagation
- Orbital candidate filtering and conjunction screening
- Isolation Forest anomaly/risk layer
- Prototype Random Forest risk classifier artifact (`models/risk_model.joblib`)
- Simulated avoidance maneuver with before/after miss distance
- Propellant estimate using the Tsiolkovsky rocket equation
- Delta-v / separation / propellant trade-off table
- FastAPI endpoints for dashboard, conjunctions, avoidance and metadata

## Run the complete pipeline

From the backend directory:

```bash
pip install -r requirements.txt
python run_pipeline.py
```

The pipeline order is:

`fetch_data -> select_objects -> filter_candidates -> generate_candidate_trajectories -> detect_candidate_conjunctions -> train_risk_model -> ai_risk_model -> avoidance_maneuver -> create_visualization`

## Run the API

```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Useful endpoints:

- `/api/health`
- `/api/metadata`
- `/api/dashboard`
- `/api/conjunctions`
- `/api/conjunctions/high-risk`
- `/api/conjunctions/top`
- `/api/avoidance`
- `/api/avoidance/tradeoff`

The generated chart is available at `/data/avoidance_visualization.png`.

## Fuel assumptions

The demo uses configurable defaults:

- spacecraft mass: 500 kg
- specific impulse: 220 s
- propellant cost assumption: $1,000/kg
- maneuver candidates: 5, 10, 15 and 20 m/s
- maneuver timing: 30 minutes before the predicted TCA
- target separation: 50 km

Override them with environment variables such as `SPACECRAFT_MASS_KG`, `SPECIFIC_IMPULSE_S`, `PROPELLANT_COST_USD_PER_KG`, `MANEUVER_MINUTES_BEFORE_TCA` and `TARGET_MISS_DISTANCE_KM`.

## Important scientific limitation

This is a hackathon screening prototype. The risk score is **not** a calibrated probability of collision. The Random Forest labels are physics-informed prototype labels, not historical collision outcomes. The avoidance result is a simplified simulation and is **not** a flight command. A real probability-of-collision calculation would require uncertainty/covariance data and a higher-fidelity conjunction assessment.
