<div align="center">

# 🛰️ CONJEX AI

**AI-Assisted Orbital Conjunction Detection & Collision Avoidance**

**Detect • Assess • Decide • Protect**

![SSA](https://img.shields.io/badge/Space%20Situational%20Awareness-0B1020?style=for-the-badge&logo=spacex&logoColor=white)
![AI](https://img.shields.io/badge/AI%20Risk%20Analysis-7C3AED?style=for-the-badge&logo=python&logoColor=white)
![SGP4](https://img.shields.io/badge/SGP4-Orbit%20Propagation-059669?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-0891B2?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-2563EB?style=for-the-badge&logo=react&logoColor=white)

CONJEX AI is an end-to-end space situational awareness prototype that processes real orbital data, identifies potential close approaches, evaluates risk with an AI-assisted scoring engine, and simulates collision-avoidance maneuvers with fuel trade-off analysis.

</div>

---

## 🚀 What is CONJEX AI?

Space around Earth is becoming increasingly crowded with active satellites, rocket bodies, and debris.

CONJEX AI provides a practical pipeline for:

- 🛰️ Collecting real orbital TLE data
- 🎯 Selecting relevant satellites and debris
- 🔎 Screening potentially similar orbital pairs
- 🌍 Propagating trajectories using SGP4
- ⚠️ Detecting close approaches
- 🤖 Assigning AI-assisted risk scores
- 🛡️ Simulating avoidance maneuvers
- ⛽ Estimating Δv, fuel usage, and cost
- 📊 Visualizing the results through a web dashboard

> **Important:** CONJEX AI is a research/hackathon prototype and **not** a flight-certified collision-avoidance system.

---

## 🧠 End-to-End Architecture

```
🛰️ CelesTrak (TLE Data)
        ↓
🎯 Selection (Relevant Objects)
        ↓
🔎 Screening (Candidate Pairs)
        ↓
🌍 SGP4 (Trajectories)
        ↓
⚠️ Conjunction (Close Approaches)
        ↓
🤖 AI (Risk Engine)
        ↓
🛡️ Maneuver (Δv Simulation)
        ↓
📈 Dashboard (Insights)
```

---

## 📊 Current Pipeline Results

| Stage | Result |
|---|---|
| 🌐 Orbital objects fetched | **18,683** valid unique objects |
| 🛰️ Satellites available | **16,021** |
| 🧩 Debris available | **2,662** |
| 🎯 Objects selected | **1,000** |
| 🔎 Candidate pairs screened | **250,000** |
| 📌 Final candidate pairs | **500** |
| 🌍 Objects with generated trajectories | **266** |
| ⏱️ Trajectory resolution | **1 minute** |
| 🕐 Propagation window | **24 hours** |
| ⚠️ Conjunctions detected | **43** |

---

## ⚙️ How It Works

### 1. 🛰️ Real Orbital Data

CONJEX AI collects orbital data from multiple CelesTrak datasets, including:

- Active satellites
- Cosmos 2251 debris
- Fengyun 1C debris
- Iridium 33 debris
- Space stations

Each TLE is validated for:

- Format
- Checksum
- SGP4 compatibility
- Duplicate NORAD IDs
- Staleness

### 2. 🎯 Intelligent Object Selection

Instead of propagating every object against every other object, the system first reduces the search space.

Objects are ranked using orbital characteristics such as:

- Altitude
- Inclination
- RAAN
- Object type
- Orbital relevance

The current pipeline selects:

```
500 satellites + 500 debris = 1,000 objects
```

### 3. 🔎 Candidate Pair Screening

The system performs scalable orbital similarity screening.

Current thresholds:

```
Altitude difference    ≤ 500 km
Inclination difference ≤ 30°
RAAN difference        ≤ 90°
```

For 500 satellites and 500 debris:

```
500 × 500 = 250,000 possible pairs
```

The system then ranks the most relevant pairs for detailed trajectory analysis.

> The candidate-ranking fallback does not mean those pairs are already conjunctions — they are candidates for further SGP4 screening.

### 4. 🌍 SGP4 Trajectory Propagation

Selected objects are propagated using the SGP4 orbital model.

Current output:

```
Time step: 1 minute
Duration:  24 hours
Position:  km
Velocity:  km/s
```

This creates an ephemeris-like trajectory dataset for subsequent close-approach analysis.

### 5. ⚠️ Conjunction Detection

Candidate satellite/debris pairs are compared across their propagated trajectories.

The system identifies close approaches and records:

- Satellite
- Debris
- Time of closest approach
- Miss distance
- Relative velocity

Current run detected: **43 conjunctions**

#### 🏆 Closest Detected Approach

| Object | Value |
|---|---|
| Satellite | STARLINK-31148 |
| Debris | COSMOS 2251 DEB |
| Miss distance | 12.239 km |
| Relative velocity | 4.1448 km/s |
| TCA | 2026-09-13 03:07 UTC |

---

## 🤖 AI Risk Engine

CONJEX AI includes a Random Forest-based risk scoring component.

The model evaluates conjunction-related features and produces:

- Risk score
- Risk level
- Relative severity
- Priority for further analysis

**Example:**

```
Risk Score: 59.92
Risk Level: MEDIUM
```

> ⚠️ **Risk Model Interpretation:** The current score is a screening/ranking index, not a calibrated probability of collision. A production system would additionally require state covariance, sensor uncertainty, probability of collision, maneuverability constraints, operational constraints, and validated orbital uncertainty models.

---

## 🛡️ Collision Avoidance & Maneuver Analysis

For a selected conjunction, CONJEX AI simulates an avoidance maneuver and compares the result with the original close approach.

**Example:**

| Parameter | Value |
|---|---|
| Satellite | STARLINK-36589 |
| Debris | COSMOS 2251 DEB |
| Risk score | 59.92 |
| Risk level | MEDIUM |
| Original miss distance | 27.292 km |
| Simulated miss distance | 39.4 km |
| Improvement | 12.109 km |
| Improvement % | 44.37% |
| Δv | 10 m/s |
| Maneuver timing | 30 minutes before TCA |
| Target miss distance | 50 km |
| Target reached | No |

The system selects the best tested maneuver when the requested target separation is not reached.

> This is a simulated separation maneuver. It does not model full spacecraft dynamics, covariance, thrust-direction constraints, attitude control, or flight-certified collision probability.

---

## ⛽ Fuel & Cost Trade-off

Fuel estimation uses the Tsiolkovsky rocket equation.

**Current example assumptions:**

| Parameter | Value |
|---|---|
| Spacecraft mass | 500 kg |
| Specific impulse (Isp) | 220 s |
| Δv | 10 m/s |
| Propellant cost | $1,000/kg |

**Estimated result:**

| Metric | Value |
|---|---|
| Propellant required | 2.31 kg |
| Estimated cost | $2,312 |

> This is a configurable screening estimate, not a flight-certified fuel budget.

---

## 📈 Dashboard

The frontend presents the analysis through a space-operations-style dashboard.

**Dashboard includes:**

- ⚠️ Conjunction risk overview
- 🔴 High / 🟠 Medium / 🟢 Low risk distribution
- 🛰️ Satellite and debris information
- 📍 Closest approach details
- ⏱️ TCA information
- 🤖 AI risk score
- 🛡️ Avoidance recommendation
- ⛽ Fuel and cost trade-off
- 📈 Close-approach visualization
- 🔄 Backend data refresh

---

## 🗂️ Project Structure

```
conjex-ai/
├── backend/                              # Backend, data pipeline & analysis
│   ├── app.py                            # FastAPI REST API
│   ├── fetch_data.py                     # Fetch & validate orbital TLE data
│   ├── select_objects.py                 # Select relevant satellites & debris
│   ├── filter_candidates.py              # Screen orbital candidate pairs
│   ├── generate_candidate_trajectories.py# Generate SGP4 trajectories
│   ├── detect_candidate_conjunctions.py  # Detect close approaches
│   ├── ai_risk_model.py                  # AI-assisted risk scoring
│   ├── avoidance_maneuver.py             # Δv, separation & fuel analysis
│   ├── create_visualization.py           # Generate conjunction visualization
│   └── data/                             # Generated analysis datasets
│       ├── orbital_objects.json          # Validated orbital objects
│       ├── selected_objects.json         # Selected objects
│       ├── candidate_pairs.json          # Candidate pairs
│       ├── candidate_trajectories.json   # Propagated trajectories
│       ├── conjunctions.json             # Detected conjunctions
│       ├── risk_scored_conjunctions.json # Risk-scored results
│       ├── avoidance_result.json         # Maneuver & fuel analysis
│       └── avoidance_visualization.png   # Generated visualization
│
├── frontend/                             # React dashboard
│   ├── src/
│   │   ├── App.jsx                       # Main application UI
│   │   └── lib/api.js                    # Backend API integration
│   ├── package.json                      # Frontend dependencies & scripts
│   └── ...                               # Other frontend configuration
│
└── README.md                             # Project documentation
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| 🖥️ Frontend | React |
| ⚡ Backend | FastAPI |
| 🚀 Server | Uvicorn |
| 🐍 Core Language | Python |
| 🛰️ Orbital Propagation | SGP4 |
| 🤖 ML | Random Forest |
| 📡 Orbital Data | CelesTrak TLE |
| 📊 Visualization | Matplotlib |
| 🔌 API Communication | REST / JSON |

---

## 🔄 Complete Data Pipeline

```
CelesTrak
   │
   ▼
fetch_data.py            →  18,683 Valid Objects
   │
   ▼
select_objects.py        →  1,000 Selected Objects
   │
   ▼
filter_candidates.py     →  250,000 Pairs Screened → 500 Candidate Pairs
   │
   ▼
generate_candidate_trajectories.py  →  24h SGP4 Trajectories
   │
   ▼
detect_candidate_conjunctions.py    →  43 Conjunctions
   │
   ▼
ai_risk_model.py          →  Risk Scoring
   │
   ▼
avoidance_maneuver.py     →  Δv + Separation + Fuel + Cost
   │
   ▼
FastAPI  →  React Dashboard
```

---

## 🔌 API

**Backend base URL:** `http://127.0.0.1:8000`

| Endpoint | Description |
|---|---|
| `GET /` | Health / Root |
| `GET /api/conjunctions` | All conjunctions |
| `GET /api/conjunctions/high-risk` | High-risk conjunctions |
| `GET /api/conjunctions/top` | Top conjunctions |
| `GET /api/avoidance` | Avoidance analysis |
| `GET /api/dashboard` | Dashboard summary |
| `GET /data/avoidance_visualization.png` | Visualization image |

---

## 💻 Installation

### 1. Clone Repository

```bash
git clone https://github.com/Anushkagoel07/conjex-ai.git
cd conjex-ai
```

### 2. Create Python Environment

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Run Data Pipeline

```bash
python fetch_data.py
python select_objects.py
python filter_candidates.py
python generate_candidate_trajectories.py
python detect_candidate_conjunctions.py
python ai_risk_model.py
python avoidance_maneuver.py
python create_visualization.py
```

### 5. Start Backend

```bash
uvicorn app:app --reload
```

Backend runs at: `http://127.0.0.1:8000`

### 6. Start Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

Do not commit API keys, credentials, or private configuration.

**Recommended `.env` pattern:**

```
API_BASE_URL=http://127.0.0.1:8000
```

**Add secrets to `.gitignore`:**

```
.env
.env.*
!.env.example
```

---

## 🔄 Refreshing Orbital Data

To refresh the analysis with new orbital data:

```bash
cd backend

python fetch_data.py
python select_objects.py
python filter_candidates.py
python generate_candidate_trajectories.py
python detect_candidate_conjunctions.py
python ai_risk_model.py
python avoidance_maneuver.py
python create_visualization.py
```

Then restart/reload the API if required.

---

## 📦 Generated Data

The backend generates structured JSON artifacts for each stage:

| File | Purpose |
|---|---|
| `orbital_objects.json` | Validated orbital objects |
| `selected_objects.json` | Selected satellites + debris |
| `candidate_pairs.json` | Orbital candidate pairs |
| `candidate_trajectories.json` | SGP4 propagated trajectories |
| `conjunctions.json` | Detected close approaches |
| `risk_scored_conjunctions.json` | AI-assisted risk results |
| `avoidance_result.json` | Maneuver + fuel analysis |
| `avoidance_visualization.png` | Close-approach visualization |

---

## 📐 Scientific Methodology

- **Orbital Data** — Two-Line Element sets are used as the input orbital representation.
- **Propagation** — SGP4 is used to propagate satellite states from TLE data.
- **Screening** — Orbital similarity reduces the number of pairs requiring detailed analysis.
- **Conjunction Detection** — Propagated positions are compared over time to identify close approaches.
- **Risk Assessment** — A Random Forest model provides a prioritization score for candidate encounters.
- **Maneuver Analysis** — Parameterized Δv simulations estimate potential separation improvements and associated propellant requirements.

---

## ⚠️ Limitations

CONJEX AI is intentionally a prototype and has important limitations.

- **Orbital Accuracy** — TLE/SGP4 propagation is not equivalent to high-precision operational orbit determination.
- **Covariance** — The current pipeline does not perform full covariance propagation.
- **Collision Probability** — Risk score should not be interpreted as a true probability of collision.
- **Maneuver Model** — Avoidance simulation does not represent a flight-certified maneuver solution.
- **Spacecraft Constraints** — The current model does not fully account for:
  - Thruster configuration
  - Attitude constraints
  - Available propellant
  - Power constraints
  - Communication windows
  - Mission objectives
  - No-fly zones
  - Operational rules
- **Fuel Estimate** — Fuel calculations are based on simplified assumptions and the Tsiolkovsky rocket equation.

---

## 🔮 Future Scope

**🛰️ Better Orbital Intelligence**
- Higher precision orbit determination
- Covariance-aware conjunction analysis
- Multi-source tracking data
- Continuous orbital updates

**🤖 Advanced AI**
- Calibrated probability-of-collision estimation
- Temporal models
- Anomaly detection
- Learned maneuver ranking
- Uncertainty-aware risk prediction

**🛡️ Advanced Maneuver Planning**
- Multi-directional Δv search
- Fuel-optimal maneuver selection
- Mission constraint optimization
- Multi-burn planning
- Post-maneuver re-screening

**🌐 Production Platform**
- Real-time ingestion
- Authentication
- Multi-user workspaces
- Alerting
- Historical conjunction database
- Cloud deployment
- Scalable distributed screening

---

## 🏆 Why CONJEX AI?

| Capability | CONJEX AI |
|---|:---:|
| Real orbital data | ✅ |
| Multi-source TLE ingestion | ✅ |
| SGP4 propagation | ✅ |
| Orbital candidate screening | ✅ |
| Conjunction detection | ✅ |
| AI-assisted risk scoring | ✅ |
| Avoidance simulation | ✅ |
| Fuel estimation | ✅ |
| Cost estimation | ✅ |
| Visualization | ✅ |
| REST API | ✅ |
| Interactive dashboard | ✅ |

---

## 🎯 Project Vision

Make orbital safety more intelligent, explainable, and accessible.

CONJEX AI aims to transform raw orbital data into a decision-support workflow:

```
Raw Space Data
      ↓
Orbital Intelligence
      ↓
Conjunction Detection
      ↓
AI Risk Assessment
      ↓
Avoidance Analysis
      ↓
Actionable Insight
```

---

## ⚠️ Disclaimer

CONJEX AI is an educational, research, and hackathon prototype.

It is **not** intended for direct operational spacecraft control, autonomous maneuver execution, or flight-certified collision avoidance.

Any real-world maneuver decision must use validated operational tracking data, uncertainty/covariance information, mission constraints, qualified flight dynamics software, and appropriate human/organizational review.

---

<div align="center">

### 🛰️ CONJEX AI

**Detect • Assess • Decide • Protect**

Built for intelligent space situational awareness and collision-risk analysis.

⭐ If you find the project interesting, consider starring the repository.

</div>
