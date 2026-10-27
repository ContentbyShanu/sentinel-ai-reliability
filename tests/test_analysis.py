from sentinel.analysis import analyze_events, percentile
from sentinel.ingest import events_from_records


def make_event(timestamp, **kwargs):
    row = {"timestamp": timestamp, "service": "api", "level": "INFO", "message": "ok"}
    row.update(kwargs)
    return row


def test_percentile_handles_empty_and_interpolation():
    assert percentile([], 0.95) is None
    assert percentile([0, 10], 0.5) == 5
    assert percentile([1, 2, 3, 4], 0.95) == 3.85


def test_detects_error_spike_and_http_failures():
    records = [
        make_event("2026-01-01T00:00:00Z", status_code=200),
        make_event("2026-01-01T00:00:01Z", status_code=500, level="ERROR", message="db unavailable"),
        make_event("2026-01-01T00:00:02Z", status_code=503, level="ERROR", message="db unavailable"),
        make_event("2026-01-01T00:00:03Z", status_code=500, level="ERROR", message="db unavailable"),
    ]
    report = analyze_events(events_from_records(records))
    kinds = {finding.kind for finding in report.findings}
    assert "error_spike" in kinds
    assert "http_failure" in kinds
    assert "repeated_error" in kinds
    assert report.error_rate == 0.75


def test_latency_outlier_detection():
    values = [20, 21, 19, 22, 20, 21, 800]
    records = [
        make_event(f"2026-01-01T00:00:{i:02d}Z", latency_ms=value)
        for i, value in enumerate(values)
    ]
    report = analyze_events(events_from_records(records))
    assert any(f.kind == "latency_anomaly" for f in report.findings)


def test_empty_report_is_valid():
    report = analyze_events([])
    assert report.total_events == 0
    assert report.error_rate == 0
    assert report.p95_latency_ms is None
    assert report.findings == []
