"""Command-line interface for Sentinel."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sentinel import __version__
from sentinel.ingest import IngestionError
from sentinel.service import analyze_file
from sentinel.storage import ReportStore


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sentinel",
        description="Analyze application events and produce evidence-backed reliability findings.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    analyze = subparsers.add_parser("analyze", help="Analyze a JSON or JSONL event file.")
    analyze.add_argument("input", type=Path, help="Path to JSON or JSONL events.")
    analyze.add_argument("--output", "-o", type=Path, help="Write the full JSON report to this path.")
    analyze.add_argument("--database", type=Path, help="Persist the report in a local SQLite database.")
    analyze.add_argument("--skip-invalid", action="store_true",
                         help="Skip malformed records (use carefully; invalid rows are not reported).")
    analyze.add_argument("--pretty", action="store_true", help="Pretty-print JSON to stdout.")

    history = subparsers.add_parser("history", help="List previously saved reports.")
    history.add_argument("--database", type=Path, default=Path("sentinel.db"))
    history.add_argument("--limit", type=int, default=20)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        if args.command == "analyze":
            report = analyze_file(
                args.input, skip_invalid=args.skip_invalid, database_path=args.database
            )
            rendered = report.model_dump_json(indent=2 if args.pretty or args.output else None)
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(rendered + "\n", encoding="utf-8")
                print(f"Report written to {args.output}")
                print(report.summary)
            else:
                print(rendered)
        elif args.command == "history":
            store = ReportStore(args.database)
            print(json.dumps(store.list_reports(args.limit), indent=2))
    except (IngestionError, OSError, ValueError) as exc:
        print(f"sentinel: error: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    main()
