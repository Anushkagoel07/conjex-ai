"""Propellant/fuel estimates for the simulated avoidance maneuver.

This is a screening estimate, not a spacecraft flight-dynamics solution.
Defaults are configurable so the hackathon demo can make its assumptions explicit.
"""

from __future__ import annotations

import math
import os

G0_M_S2 = 9.80665


def estimate_propellant(
    delta_v_m_s: float,
    spacecraft_mass_kg: float | None = None,
    specific_impulse_s: float | None = None,
    propellant_cost_usd_per_kg: float | None = None,
) -> dict:
    """Estimate propellant consumed with the Tsiolkovsky rocket equation."""
    mass = float(spacecraft_mass_kg or os.getenv("SPACECRAFT_MASS_KG", "500"))
    isp = float(specific_impulse_s or os.getenv("SPECIFIC_IMPULSE_S", "220"))
    cost_per_kg = float(
        propellant_cost_usd_per_kg
        if propellant_cost_usd_per_kg is not None
        else os.getenv("PROPELLANT_COST_USD_PER_KG", "1000")
    )

    if mass <= 0 or isp <= 0 or delta_v_m_s < 0:
        raise ValueError("Mass and specific impulse must be positive; delta-v cannot be negative.")

    mass_ratio = math.exp(float(delta_v_m_s) / (isp * G0_M_S2))
    propellant_mass = mass * (1.0 - 1.0 / mass_ratio)

    return {
        "spacecraft_mass_kg": round(mass, 3),
        "specific_impulse_s": round(isp, 3),
        "delta_v_m_s": round(float(delta_v_m_s), 3),
        "propellant_mass_kg": round(propellant_mass, 6),
        "propellant_cost_usd_per_kg": round(cost_per_kg, 2),
        "estimated_propellant_cost_usd": round(propellant_mass * cost_per_kg, 2),
        "method": "Tsiolkovsky rocket equation",
        "assumption_note": "Screening estimate using configurable spacecraft mass, Isp and propellant cost; not a flight-certified fuel budget.",
    }
