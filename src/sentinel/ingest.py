"""Safe and predictable ingestion of JSON Lines and JSON event files."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from pydantic import ValidationError

from sentinel.models import Event


class IngestionError(ValueError):
    """Raised when an input file cannot be read as supported event data."""


def _coerce_record(record: dict[str, Any], line_number: int) -> Event:
    """Normalize common aliases before validating an event."""
    data = dict(record)
    aliases = {
        "time": "timestamp",
        "@timestamp": "timestamp",
        "service_name": "service",
        "duration_ms": "latency_ms",
        "response_time_ms": "latency_ms",
        "http_status": "status_code",
        "status": "status_code",
        "route": "endpoint",
        "path": "endpoint",
    }
    for old, new in aliases.items():
        if old in data and new not in data:
            data[new] = data.pop(old)
    if "timestamp" not in data:
        raise IngestionError(f"Line {line_number}: missing required 'timestamp' field.")
    if "service" not in data:
        data["service"] = "unknown-service"
    if "metadata" not in data or not isinstance(data.get("metadata"), dict):
        reserved = {"timestamp", "service", "level", "message", "latency_ms",
                    "status_code", "request_id", "endpoint", "environment"}
        data["metadata"] = {k: v for k, v in data.items() if k not in reserved}
    try:
        return Event.model_validate(data)
    except ValidationError as exc:
        details = "; ".join(
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
            for err in exc.errors()
        )
        raise IngestionError(f"Line {line_number}: invalid event: {details}") from exc


def load_events(path: str | Path, *, skip_invalid: bool = False) -> list[Event]:
    """Load JSONL or JSON array/object input.

    JSONL is preferred for large files. A JSON document may contain an array of events
    or one event object. Invalid records fail fast unless skip_invalid=True.
    """
    source = Path(path)
    if not source.exists() or not source.is_file():
        raise IngestionError(f"Input file does not exist or is not a file: {source}")
    try:
        raw = source.read_text(encoding="utf-8")
    except OSError as exc:
        raise IngestionError(f"Could not read input file: {exc}") from exc
    if not raw.strip():
        return []

    records: list[tuple[int, dict[str, Any]]] = []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            if isinstance(parsed.get("events"), list):
                records = [(i + 1, row) for i, row in enumerate(parsed["events"]) if isinstance(row, dict)]
            else:
                records = [(1, parsed)]
        elif isinstance(parsed, list):
            records = [(i + 1, row) for i, row in enumerate(parsed) if isinstance(row, dict)]
        else:
            raise IngestionError("JSON input must be an object or an array of objects.")
    except json.JSONDecodeError:
        for line_number, line in enumerate(raw.splitlines(), start=1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                if skip_invalid:
                    continue
                raise IngestionError(f"Line {line_number}: invalid JSON: {exc.msg}") from exc
            if not isinstance(row, dict):
                if skip_invalid:
                    continue
                raise IngestionError(f"Line {line_number}: each JSONL record must be an object.")
            records.append((line_number, row))

    events: list[Event] = []
    for line_number, record in records:
        try:
            events.append(_coerce_record(record, line_number))
        except IngestionError:
            if not skip_invalid:
                raise
    return sorted(events, key=lambda event: event.timestamp)


def events_from_records(records: Iterable[dict[str, Any]]) -> list[Event]:
    """Validate in-memory records, useful for integrations and tests."""
    return [_coerce_record(row, index) for index, row in enumerate(records, start=1)]
