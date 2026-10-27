import json

import pytest

from sentinel.ingest import IngestionError, events_from_records, load_events


def test_aliases_and_timezone_normalization(tmp_path):
    path = tmp_path / "events.jsonl"
    path.write_text(json.dumps({
        "time": "2026-01-01T12:00:00+05:30",
        "service_name": "payments",
        "duration_ms": 20,
        "status": 200,
    }) + "\n", encoding="utf-8")
    events = load_events(path)
    assert len(events) == 1
    assert events[0].service == "payments"
    assert events[0].latency_ms == 20
    assert events[0].timestamp.isoformat() == "2026-01-01T06:30:00+00:00"


def test_invalid_json_fails_fast(tmp_path):
    path = tmp_path / "bad.jsonl"
    path.write_text('{"timestamp":\n', encoding="utf-8")
    with pytest.raises(IngestionError):
        load_events(path)


def test_skip_invalid_records(tmp_path):
    path = tmp_path / "mixed.jsonl"
    path.write_text(
        '{"timestamp":"2026-01-01T00:00:00Z","service":"api"}\nnot-json\n',
        encoding="utf-8",
    )
    assert len(load_events(path, skip_invalid=True)) == 1


def test_in_memory_records_validate():
    events = events_from_records([{"timestamp": "2026-01-01T00:00:00Z", "service": "api"}])
    assert events[0].service == "api"
