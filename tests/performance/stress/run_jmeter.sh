#!/usr/bin/env bash
# This file was created by ChatGPT
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DOCKER_STATS_SCRIPT="$PROJECT_ROOT/docker-stats-to-csv.sh"
DOCKER_STATS_INTERVAL="${DOCKER_STATS_INTERVAL:-1}"
DOCKER_STATS_CONTAINER="${DOCKER_STATS_CONTAINER:-cs4218-2510-ecom-project-team018-backend-1}"

start_docker_stats() {
  local output_path="$1"
  if [[ ! -x "$DOCKER_STATS_SCRIPT" ]]; then
    echo "Docker stats script not found or not executable at $DOCKER_STATS_SCRIPT" >&2
    exit 1
  fi
  "$DOCKER_STATS_SCRIPT" "$output_path" "$DOCKER_STATS_INTERVAL" "$DOCKER_STATS_CONTAINER" &
  DOCKER_STATS_PID=$!
}

stop_docker_stats() {
  if [[ -n "${DOCKER_STATS_PID:-}" ]]; then
    kill "$DOCKER_STATS_PID" 2>/dev/null || true
    wait "$DOCKER_STATS_PID" 2>/dev/null || true
    unset DOCKER_STATS_PID
  fi
}

run_single_test() {
  local jmx_relative="$1"
  if [[ ! -f "$jmx_relative" ]]; then
    echo "JMX file not found: $jmx_relative" >&2
    exit 1
  fi

  local filename parent_dir raw_dir csv_path stats_csv abs_stats_path
  filename="$(basename "$jmx_relative" .jmx)"
  parent_dir="$(dirname "$jmx_relative")"
  raw_dir="$parent_dir/results/raw"
  mkdir -p "$raw_dir"
  csv_path="$raw_dir/jmeter-$filename.csv"
  stats_csv="$raw_dir/docker-stats-$filename.csv"
  abs_stats_path="$SCRIPT_DIR/${stats_csv#./}"

  if [[ -f "$csv_path" ]]; then
    echo "Removing existing CSV: $csv_path"
    rm -f "$csv_path"
  fi
  if [[ -f "$stats_csv" ]]; then
    echo "Removing existing docker stats CSV: $stats_csv"
    rm -f "$stats_csv"
  fi

  echo "Starting docker stats capture: $stats_csv"
  start_docker_stats "$abs_stats_path"

  echo "Running JMeter test: $jmx_relative"
  echo "Results will be stored at: $csv_path"
  set +e
  jmeter -n -t "$jmx_relative" -l "$csv_path"
  local jmeter_status=$?
  set -e

  echo "Stopping docker stats capture"
  stop_docker_stats

  if [[ $jmeter_status -ne 0 ]]; then
    echo "JMeter exited with status $jmeter_status" >&2
    exit "$jmeter_status"
  fi
}

run_all_tests() {
  local targets=()
  for area in ./category ./product ./auth; do
    [[ -d "$area" ]] || continue
    while IFS= read -r -d '' file; do
      targets+=("$file")
    done < <(find "$area" -type f -name "*.jmx" -print0)
  done

  if [[ ${#targets[@]} -eq 0 ]]; then
    echo "No JMX files found under ./category, ./product, or ./auth." >&2
    exit 1
  fi

  for jmx_file in "${targets[@]}"; do
    run_single_test "$jmx_file"
  done
}

if [[ $# -eq 0 ]]; then
  run_all_tests
elif [[ $# -eq 1 ]]; then
  run_single_test "$1"
else
  echo "Usage: $(basename "$0") [relative-path-to-jmx]" >&2
  exit 1
fi
