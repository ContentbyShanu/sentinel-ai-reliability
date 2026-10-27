"""Small SQLite persistence layer for local analysis reports."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from sentinel.models import AnalysisReport


class ReportStore:
    """Persist serialized reports locally; callers own the database path."""

    def __init__(self, path: str | Path = "sentinel.db") -> None:
        self.path = str(path)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS reports (
                    report_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    source TEXT NOT NULL,
                    total_events INTEGER NOT NULL,
                    payload_json TEXT NOT NULL
                )
            """)

    def save(self, report: AnalysisReport) -> None:
        payload = report.model_dump_json()
        with self._connect() as connection:
            connection.execute(
                """INSERT OR REPLACE INTO reports
                   (report_id, created_at, source, total_events, payload_json)
                   VALUES (?, ?, ?, ?, ?)""",
                (report.report_id, report.generated_at.isoformat(), report.source,
                 report.total_events, payload),
            )

    def get(self, report_id: str) -> AnalysisReport | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM reports WHERE report_id = ?", (report_id,)
            ).fetchone()
        return AnalysisReport.model_validate_json(row["payload_json"]) if row else None

    def list_reports(self, limit: int = 20) -> list[dict[str, object]]:
        if not 1 <= limit <= 100:
            raise ValueError("limit must be between 1 and 100")
        with self._connect() as connection:
            rows = connection.execute(
                """SELECT report_id, created_at, source, total_events
                   FROM reports ORDER BY created_at DESC LIMIT ?""", (limit,)
            ).fetchall()
        return [dict(row) for row in rows]
