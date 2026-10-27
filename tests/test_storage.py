from sentinel.analysis import analyze_events
from sentinel.storage import ReportStore


def test_save_and_retrieve_report(tmp_path):
    db = tmp_path / "sentinel.db"
    report = analyze_events([], source="test")
    store = ReportStore(db)
    store.save(report)
    restored = store.get(report.report_id)
    assert restored is not None
    assert restored.report_id == report.report_id
    assert store.list_reports(10)[0]["source"] == "test"


def test_missing_report_returns_none(tmp_path):
    assert ReportStore(tmp_path / "sentinel.db").get("missing") is None
