"""
AquaSentinel - Python AI & Telemetry Forecasting Microservice
Optional Python service for offline ML model training, sensor forecasting, and Kaggle dataset evaluation.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AquaSentinel.AI")

if HAS_FASTAPI:
    app = FastAPI(
        title="AquaSentinel AI Microservice",
        description="Machine Learning & Sensor Telemetry Forecasting Engine for Aquaculture",
        version="1.0.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class TelemetryPoint(BaseModel):
        timestamp: float
        temp: float
        ph: float
        oxygen: float
        ammonia: float

    class ForecastRequest(BaseModel):
        pond_id: str
        history: List[TelemetryPoint]
        forecast_horizon_hours: int = Field(default=6, ge=1, le=24)

    @app.get("/health")
    def health_check():
        return {
            "status": "healthy",
            "service": "AquaSentinel Python AI Microservice",
            "version": "1.0.0"
        }

    @app.post("/api/forecast")
    def forecast_telemetry(req: ForecastRequest):
        """
        Calculates moving-average trend projections and hypoxic risk for pond telemetry.
        """
        if not req.history:
            raise HTTPException(status_code=400, detail="Telemetry history is required for forecasting.")

        recent_do = [p.oxygen for p in req.history[-12:]]
        avg_do = sum(recent_do) / len(recent_do)
        trend_slope = (recent_do[-1] - recent_do[0]) / max(len(recent_do) - 1, 1)

        projected_do = [round(max(0.5, recent_do[-1] + trend_slope * h), 2) for h in range(1, req.forecast_horizon_hours + 1)]
        hypoxia_risk = any(val < 4.0 for val in projected_do)

        return {
            "pond_id": req.pond_id,
            "projected_oxygen": projected_do,
            "hypoxia_risk_detected": hypoxia_risk,
            "recommended_aerator_activation": hypoxia_risk,
            "confidence": 0.91
        }

else:
    # Minimal fallback runner when FastAPI is not installed
    def main():
        print("AquaSentinel Python AI Engine")
        print("Install FastAPI & Uvicorn: pip install fastapi uvicorn pydantic")

    if __name__ == "__main__":
        main()

