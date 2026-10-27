# Contributing

Thanks for considering a contribution.

## Development setup

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
```

## Before opening a pull request

1. Add or update tests for behavior changes.
2. Run `ruff check .`.
3. Run `pytest --cov=sentinel`.
4. Update the README if commands, API behavior, or limitations change.
5. Never include production logs, secrets, tokens, customer data, or personally identifying data in fixtures.

## Design principles

- Prefer deterministic analysis over opaque conclusions.
- Include evidence for every finding.
- Keep input validation explicit and fail safely.
- State limitations; never label a correlation as proven causality.
