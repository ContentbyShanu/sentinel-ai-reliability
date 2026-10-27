# Example data

`sample_events.jsonl` is synthetic data created for testing and demonstration. It contains a short checkout-service failure cluster, repeated database timeout messages, and a slow catalog request.

Run:

```bash
sentinel analyze examples/sample_events.jsonl --pretty --output reports/sample-report.json
```

Do not interpret this synthetic fixture as a production benchmark or real incident.
