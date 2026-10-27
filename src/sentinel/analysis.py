"""Deterministic reliability analysis: metrics, rules, anomaly detection, correlation."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha1
from statistics import median
from typing import Iterable

from sentinel.models import AnalysisReport, Event, Finding

ERROR_LEVELS = {"ERROR", "FATAL", "CRITICAL"}
FAILURE_STATUSES = {500, 501, 502, 503, 504, 505, 507, 508, 509, 510, 511}


def percentile(values: list[float], quantile: float) -> float | None:
    """Compute a linearly interpolated percentile without a heavy dependency."""
    if not values:
        return None
    if not 0 <= quantile <= 1:
        raise ValueError("quantile must be between 0 and 1")
    ordered = sorted(values)
    position = (len(ordered) - 1) * quantile
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return round(ordered[lower] * (1 - fraction) + ordered[upper] * fraction, 2)


def _finding_id(kind: str, service: str, title: str) -> str:
    token = sha1(f"{kind}|{service}|{title}".encode("utf-8")).hexdigest()[:10]
    return f"F-{token}"


def _make_finding(
    kind: str, severity: str, title: str, summary: str, service: str,
    evidence: list[str], event_count: int, confidence: float, actions: list[str],
) -> Finding:
    return Finding(
        id=_finding_id(kind, service, title), kind=kind, severity=severity,
        title=title, summary=summary, service=service, evidence=evidence,
        event_count=event_count, confidence=confidence,
        recommended_actions=actions,
    )


def analyze_events(events: Iterable[Event], source: str = "in-memory") -> AnalysisReport:
    """Analyze events with transparent rules and robust latency outlier detection.

    This is intentionally deterministic and offline. It does not claim causal certainty:
    findings are hypotheses supported by event-level evidence.
    """
    rows = sorted(list(events), key=lambda event: event.timestamp)
    services = sorted({event.service for event in rows})
    latencies = [event.latency_ms for event in rows if event.latency_ms is not None]
    error_events = [
        event for event in rows
        if event.level in ERROR_LEVELS or (event.status_code is not None and event.status_code >= 500)
    ]
    error_rate = (len(error_events) / len(rows)) if rows else 0.0
    findings: list[Finding] = []

    by_service: dict[str, list[Event]] = defaultdict(list)
    for event in rows:
        by_service[event.service].append(event)

    for service, service_events in sorted(by_service.items()):
        service_errors = [
            event for event in service_events
            if event.level in ERROR_LEVELS or (event.status_code is not None and event.status_code >= 500)
        ]
        rate = len(service_errors) / len(service_events)
        if len(service_events) >= 3 and rate >= 0.30:
            severity = "critical" if rate >= 0.70 else "high" if rate >= 0.50 else "medium"
            findings.append(_make_finding(
                "error_spike", severity, f"Elevated error rate in {service}",
                f"{len(service_errors)} of {len(service_events)} events ({rate:.1%}) for this service are errors.",
                service,
                [f"Observed {len(service_errors)} error-classified events out of {len(service_events)} total.",
                 f"Error rate threshold for this rule: 30%; observed: {rate:.1%}."],
                len(service_errors), min(0.98, 0.55 + rate / 2),
                ["Inspect the first error in the incident window and compare it with the last known healthy event.",
                 "Check recent deployments, upstream dependencies, and service-specific configuration.",
                 "Verify the pattern with request IDs and traces before making a production change."],
            ))

        failure_events = [e for e in service_events if e.status_code in FAILURE_STATUSES]
        if failure_events:
            codes = Counter(e.status_code for e in failure_events)
            top_codes = ", ".join(f"{code}×{count}" for code, count in codes.most_common(4))
            findings.append(_make_finding(
                "http_failure",
                "high" if len(failure_events) >= 3 else "medium",
                f"Server-side HTTP failures in {service}",
                f"Detected {len(failure_events)} server-side HTTP failure event(s).",
                service,
                [f"Status-code counts: {top_codes}.",
                 f"Sample endpoint: {next((e.endpoint for e in failure_events if e.endpoint), 'not supplied')}."],
                len(failure_events), 0.90,
                ["Group failures by endpoint and status code.",
                 "Inspect upstream timeouts, resource saturation, and recent release changes."],
            ))

        message_counts = Counter(
            e.message.strip().lower() for e in service_errors if e.message.strip()
        )
        repeated = [(message, count) for message, count in message_counts.items() if count >= 2]
        for message, count in sorted(repeated, key=lambda item: (-item[1], item[0]))[:3]:
            sample = next(e for e in service_errors if e.message.strip().lower() == message)
            findings.append(_make_finding(
                "repeated_error", "medium" if count < 5 else "high",
                f"Repeated error signature in {service}",
                f"The same normalized error message appeared {count} times.",
                service,
                [f"Signature: {message[:240]}",
                 f"First observed: {min(e.timestamp for e in service_errors if e.message.strip().lower() == message).isoformat()}",
                 f"Latest observed: {max(e.timestamp for e in service_errors if e.message.strip().lower() == message).isoformat()}",
                 f"Endpoint: {sample.endpoint or 'not supplied'}."],
                count, min(0.97, 0.65 + count * 0.04),
                ["Inspect the earliest occurrence to find the initiating failure.",
                 "Check whether the same request or dependency is involved across occurrences.",
                 "Add a regression test after the underlying cause is confirmed."],
            ))

        service_latencies = [e.latency_ms for e in service_events if e.latency_ms is not None]
        if len(service_latencies) >= 5:
            center = median(service_latencies)
            deviations = [abs(value - center) for value in service_latencies]
            mad = median(deviations)
            # MAD-based outliers are robust to a small number of extreme values.
            threshold = center + max(3.0 * 1.4826 * mad, center * 0.75, 100.0)
            outliers = [e for e in service_events if e.latency_ms is not None and e.latency_ms > threshold]
            if outliers:
                worst = sorted((e.latency_ms for e in outliers if e.latency_ms is not None), reverse=True)[:3]
                findings.append(_make_finding(
                    "latency_anomaly", "high" if len(outliers) >= 3 else "medium",
                    f"Unusually slow requests in {service}",
                    f"{len(outliers)} request(s) exceed the robust latency threshold of {threshold:.1f} ms.",
                    service,
                    [f"Service median latency: {center:.1f} ms.",
                     f"Median absolute deviation (MAD): {mad:.1f} ms.",
                     f"Threshold: {threshold:.1f} ms; slowest observed: {max(worst):.1f} ms.",
                     f"Outlier request IDs: {', '.join(e.request_id or 'n/a' for e in outliers[:5])}."],
                    len(outliers), 0.82,
                    ["Compare slow requests by endpoint, request ID, and time window.",
                     "Inspect database calls, upstream dependencies, and queue or connection-pool saturation.",
                     "Compare with a known-good time window before attributing causality."],
                ))

    # A lightweight temporal heuristic: the first observed error may precede later errors.
    if error_events and len(rows) >= 4:
        first_error = min(error_events, key=lambda event: event.timestamp)
        later_errors = [event for event in error_events if event.timestamp >= first_error.timestamp]
        if len(later_errors) >= 3:
            findings.append(_make_finding(
                "service_degradation", "high" if len(later_errors) >= 5 else "medium",
                f"Clustered failures after first error in {first_error.service}",
                f"The first error in the supplied window belongs to {first_error.service}; "
                f"{len(later_errors)} error-classified events occur at or after it.",
                first_error.service,
                [f"First observed error: {first_error.timestamp.isoformat()} — {first_error.message[:180]}",
                 f"Events after first error: {len(later_errors)}.",
                 "Temporal order is correlation, not proof of root cause."],
                len(later_errors), 0.60,
                ["Use distributed traces and dependency telemetry to validate the sequence.",
                 "Do not treat temporal ordering alone as proof that this service caused the incident."],
            ))

    findings.sort(key=lambda finding: (
        {"critical": 0, "high": 1, "medium": 2, "low": 3}[finding.severity],
        finding.service, finding.kind, finding.id,
    ))
    summary = (
        f"Analyzed {len(rows)} event(s) across {len(services)} service(s); "
        f"error rate {error_rate:.1%}; found {len(findings)} finding(s)."
    )
    return AnalysisReport(
        report_id=f"R-{sha1((source + str(len(rows)) + (rows[0].timestamp.isoformat() if rows else '')).encode()).hexdigest()[:12]}",
        generated_at=datetime.now(timezone.utc),
        source=source,
        total_events=len(rows),
        services_analyzed=services,
        error_rate=round(error_rate, 4),
        p50_latency_ms=percentile(latencies, 0.50),
        p95_latency_ms=percentile(latencies, 0.95),
        findings=findings,
        summary=summary,
        limitations=[
            "Findings are rule-based hypotheses, not proof of causality.",
            "Results depend on the completeness and quality of the supplied events.",
            "No external telemetry, traces, deployment metadata, or cloud services are queried.",
        ],
    )
