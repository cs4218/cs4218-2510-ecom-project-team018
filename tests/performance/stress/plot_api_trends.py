#!/usr/bin/env python3
"""
Generate twin-axis trend charts for JMeter CSV exports.

For every CSV named jmeter-*.csv inside */results/raw folders under this script,
we aggregate metrics per thread count (using allThreads when available) and plot:
  • Average response time (ms)
  • 90th percentile response time (ms)
  • Error rate (%) based on response codes != 200/201

Each chart is saved beside the source CSV in the sibling charts directory with the
same base filename but a .png extension.
"""

from __future__ import annotations

import csv
import math
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

try:
    import matplotlib

    matplotlib.use("Agg")  # Use a non-interactive backend for headless environments.
    import matplotlib.pyplot as plt
except ImportError as exc:  # pragma: no cover - dependency guard
    raise SystemExit(
        "matplotlib is required to run this script. "
        "Install it with `pip install matplotlib`."
    ) from exc

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR_PATTERN = "*/results/raw"
CSV_PATTERN = "jmeter-*.csv"
OK_CODES = {"200", "201"}


def percentile(values: Iterable[float], percent: float = 90.0) -> float:
    """Return the percentile value from a sequence."""
    ordered = sorted(values)
    if not ordered:
        return 0.0
    if percent <= 0:
        return ordered[0]
    if percent >= 100:
        return ordered[-1]
    k = (len(ordered) - 1) * (percent / 100.0)
    floor = math.floor(k)
    ceil = math.ceil(k)
    if floor == ceil:
        return ordered[int(k)]
    d0 = ordered[floor] * (ceil - k)
    d1 = ordered[ceil] * (k - floor)
    return d0 + d1


def extract_thread_count(row: Dict[str, str]) -> int | None:
    """Prefer allThreads, but fall back to other numeric columns if needed."""
    candidates = ("allThreads", "grpThreads", "Threads", "threadCount")
    for key in candidates:
        value = row.get(key)
        if not value:
            continue
        try:
            return int(float(value))
        except ValueError:
            continue
    return None


def read_csv(csv_path: Path) -> Tuple[Dict[int, Dict[str, Any]], str | None]:
    """Collect elapsed times and error counts grouped by thread count."""
    groups: Dict[int, Dict[str, Any]] = defaultdict(
        lambda: {"elapsed": [], "total": 0, "errors": 0}
    )
    first_label: str | None = None
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if first_label is None:
                label = (row.get("label") or "").strip()
                if label:
                    first_label = label
            threads = extract_thread_count(row)
            if threads is None:
                continue
            elapsed_raw = row.get("elapsed")
            if not elapsed_raw:
                continue
            try:
                elapsed = float(elapsed_raw)
            except ValueError:
                continue
            response_code = (row.get("responseCode") or "").strip()
            entry = groups[threads]
            entry["elapsed"].append(elapsed)
            entry["total"] += 1
            if response_code not in OK_CODES:
                entry["errors"] += 1
    return dict(groups), first_label


def build_series(
    grouped_data: Dict[int, Dict[str, Any]]
) -> Tuple[List[int], List[float], List[float], List[float]]:
    """Transform grouped stats into sorted series for plotting."""
    if not grouped_data:
        return [], [], [], []
    threads_sorted = sorted(grouped_data.keys())
    avg_times: List[float] = []
    p90_times: List[float] = []
    error_rates: List[float] = []
    for threads in threads_sorted:
        stats = grouped_data[threads]
        elapsed_values = stats["elapsed"]
        total = stats["total"]
        errors = stats["errors"]
        if not elapsed_values or not total:
            avg_times.append(0.0)
            p90_times.append(0.0)
            error_rates.append(0.0)
            continue
        avg_times.append(sum(elapsed_values) / total)
        p90_times.append(percentile(elapsed_values, 90.0))
        error_rate = (errors / total) * 100.0
        error_rates.append(min(max(error_rate, 0.0), 100.0))
    return threads_sorted, avg_times, p90_times, error_rates


def plot_chart(
    csv_path: Path,
    threads: List[int],
    avg_times: List[float],
    p90_times: List[float],
    error_rates: List[float],
    label: str | None,
) -> None:
    """Produce and persist a twin-axis chart for a CSV."""
    fig, ax_left = plt.subplots(figsize=(10, 6))
    ax_right = ax_left.twinx()

    avg_line = ax_left.plot(
        threads,
        avg_times,
        marker="o",
        label="Average Response Time (ms)",
        color="#1f77b4",
    )
    p90_line = ax_left.plot(
        threads,
        p90_times,
        marker="s",
        label="90th Percentile (ms)",
        color="#ff7f0e",
    )
    error_line = ax_right.plot(
        threads,
        error_rates,
        marker="^",
        label="Error Rate (%)",
        color="#d62728",
        linestyle="--",
    )

    ax_left.set_xlabel("Threads")
    ax_left.set_ylabel("Response Time (ms)")
    ax_right.set_ylabel("Error Rate (%)")
    ax_right.set_ylim(0, 100)
    fallback = csv_path.stem.replace("jmeter-", "").replace("_", " ").title()
    title_label = label or fallback
    ax_left.set_title(f"Stress Test - {title_label}")

    lines = avg_line + p90_line + error_line
    labels = [line.get_label() for line in lines]
    ax_left.legend(lines, labels, loc="best")
    ax_left.grid(True, linestyle=":", linewidth=0.5, alpha=0.7)

    charts_dir = csv_path.parent.parent / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    output_path = charts_dir / f"{csv_path.stem}.png"
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print(f"Saved chart: {output_path}")


def find_csv_files(base_dir: Path) -> List[Path]:
    """Locate all jmeter-*.csv files under */results/raw subdirectories."""
    csv_files: List[Path] = []
    for raw_dir in sorted(base_dir.glob(RAW_DIR_PATTERN)):
        if not raw_dir.is_dir():
            continue
        csv_files.extend(sorted(raw_dir.glob(CSV_PATTERN)))
    return csv_files


def process_csv(csv_path: Path) -> None:
    """Read a CSV and emit its corresponding chart if data exists."""
    grouped, label = read_csv(csv_path)
    threads, avg_times, p90_times, error_rates = build_series(grouped)
    if not threads:
        print(f"No valid data in {csv_path}")
        return
    plot_chart(csv_path, threads, avg_times, p90_times, error_rates, label)


def main() -> None:
    csv_files = find_csv_files(BASE_DIR)
    if not csv_files:
        print("No CSV files found under */results/raw.")
        return
    for csv_file in csv_files:
        print(f"Processing {csv_file} ...")
        try:
            process_csv(csv_file)
        except Exception as exc:  # pragma: no cover
            print(f"  Failed to process {csv_file}: {exc}")


if __name__ == "__main__":
    main()
