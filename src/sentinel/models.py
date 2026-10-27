"""Typed domain models used across the analysis pipeline."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Event(BaseModel):
    """Normalized application event.

    Required fields are intentionally small so Sentinel can ingest common JSON logs.
    Unknown input fields are ignored to make ingestion resilient to vendor-specific logs.
    """

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    timestamp: datetime
    service: str = Field(min_length=1, max_length=120)
    level: str = Field(default="INFO", min_length=1, max_length=20)
    message: str = Field(default="", max_length=10_000)
    latency_ms: float | None = Field(default=None, ge=0, le=86_400_000)
    status_code: int | None = Field(default=None, ge=100, le=599)
    request_id: str | None = Field(default=None, max_length=200)
    endpoint: str | None = Field(default=None, max_length=500)
    environment: str = Field(default="unknown", max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("timestamp", mode="before")
    @classmethod
    def parse_timestamp(cls, value: Any) -> Any:
        if isinstance(value, str):
            candidate = value.strip().replace("Z", "+00:00")
            return datetime.fromisoformat(candidate)
        return value

    @field_validator("timestamp")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @field_validator("level")
    @classmethod
    def normalize_level(cls, value: str) -> str:
        return value.upper()


class Finding(BaseModel):
    """Evidence-backed issue detected in the event stream."""

    id: str
    kind: Literal["error_spike", "latency_anomaly", "http_failure", "repeated_error", "service_degradation"]
    severity: Literal["low", "medium", "high", "critical"]
    title: str
    summary: str
    service: str
    evidence: list[str] = Field(default_factory=list)
    event_count: int = 0
    confidence: float = Field(ge=0, le=1)
    recommended_actions: list[str] = Field(default_factory=list)


class AnalysisReport(BaseModel):
    """Serializable result of a Sentinel analysis run."""

    report_id: str
    generated_at: datetime
    source: str
    total_events: int
    services_analyzed: list[str]
    error_rate: float
    p50_latency_ms: float | None
    p95_latency_ms: float | None
    findings: list[Finding]
    summary: str
    limitations: list[str] = Field(default_factory=list)
