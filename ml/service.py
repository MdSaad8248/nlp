"""
Academic Notice Classifier - Local Inference Microservice
=========================================================
Lightweight FastAPI service for low-latency in-memory model inference.
"""

import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.predict import predict, DEFAULT_CONFIDENCE_THRESHOLD

app = FastAPI(
    title="Academic Notice Classifier Service",
    description="NLP Model Inference for Academic Intelligence Platform",
    version="1.0.0"
)


class PredictRequest(BaseModel):
    text: str = Field(..., description="Academic notice text to classify")
    model: Optional[str] = Field("transformer", description="Model architecture: 'transformer' or 'baseline'")
    threshold: Optional[float] = Field(DEFAULT_CONFIDENCE_THRESHOLD, description="Confidence threshold [0, 1]")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "academic-notice-classifier"}


@app.post("/predict")
def classify_notice(req: PredictRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Notice text cannot be empty")

    result = predict(req.text, model_type=req.model, threshold=req.threshold)
    return {"success": True, **result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.service:app", host="127.0.0.1", port=8001, reload=False)
