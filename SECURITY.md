# Security Policy

## Reporting a vulnerability

Please do not publish sensitive exploit details in a public issue. Contact the repository maintainer privately through the contact method listed on the GitHub profile.

## Data handling

- Sentinel is local-first and does not send telemetry to an external service.
- Input files may contain sensitive information. Use synthetic or sanitized data whenever possible.
- Reports store event-derived summaries and evidence in the configured SQLite database.
- Treat generated reports as potentially sensitive.
- Do not expose the API publicly without adding authentication, TLS termination, rate limits, and an appropriate deployment review.

## Scope

This project is an engineering prototype and is not a substitute for a security monitoring platform or incident response process.
