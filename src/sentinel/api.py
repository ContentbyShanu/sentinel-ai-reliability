"""FastAPI interface for programmatic analysis and report retrieval."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from sentinel.analysis import analyze_events
from sentinel.ingest import IngestionError, events_from_records
from sentinel.models import AnalysisReport
from sentinel.storage import ReportStore

app = FastAPI(
    title="Sentinel Reliability API",
    description="Local-first analysis of application events. Findings are evidence-backed hypotheses.",
    version="0.1.0",
)
DB_PATH = Path(os.getenv("SENTINEL_DB_PATH", "./sentinel.db"))


class AnalyzeRequest(BaseModel):
    events: list[dict] = Field(min_length=1, max_length=20_000)
    source: str = Field(default="api-request", min_length=1, max_length=200)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness endpoint; does not inspect downstream services."""
    return {"status": "ok", "service": "sentinel"}


@app.post("/v1/analyze", response_model=AnalysisReport)
def analyze(request: AnalyzeRequest) -> AnalysisReport:
    """Analyze event records supplied as JSON."""
    try:
        events = events_from_records(request.events)
    except (IngestionError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    report = analyze_events(events, source=request.source)
    ReportStore(DB_PATH).save(report)
    return report


@app.get("/v1/reports")
def list_reports(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, object]]:
    """List metadata for saved reports."""
    return ReportStore(DB_PATH).list_reports(limit)


@app.get("/v1/reports/{report_id}", response_model=AnalysisReport)
def get_report(report_id: str) -> AnalysisReport:
    """Retrieve one saved report by its report ID."""
    report = ReportStore(DB_PATH).get(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
