"""Run the complete OrbitalGuard data -> AI -> avoidance pipeline in order."""

import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STEPS = [
    "fetch_data.py",
    "select_objects.py",
    "filter_candidates.py",
    "generate_candidate_trajectories.py",
    "detect_candidate_conjunctions.py",
    "train_risk_model.py",
    "ai_risk_model.py",
    "avoidance_maneuver.py",
    "create_visualization.py",
]


def main():
    for step in STEPS:
        print("\n" + "=" * 72)
        print(f"RUNNING: {step}")
        print("=" * 72)
        subprocess.run([sys.executable, os.path.join(BASE_DIR, step)], check=True)

    print("\nPipeline completed successfully.")


if __name__ == "__main__":
    main()
