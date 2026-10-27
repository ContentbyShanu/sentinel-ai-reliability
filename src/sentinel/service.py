"""Application service functions shared by the CLI and HTTP API."""
from __future__ import annotations

from pathlib import Path

from sentinel.analysis import analyze_events
from sentinel.ingest import load_events
from sentinel.models import AnalysisReport
from sentinel.storage import ReportStore


def analyze_file(
    path: str | Path,
    *,
    skip_invalid: bool = False,
    database_path: str | Path | None = None,
) -> AnalysisReport:
    source = Path(path)
    events = load_events(source, skip_invalid=skip_invalid)
    report = analyze_events(events, source=source.name)
    if database_path is not None:
        ReportStore(database_path).save(report)
    return report
