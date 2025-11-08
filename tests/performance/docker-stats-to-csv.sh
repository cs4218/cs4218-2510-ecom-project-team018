#!/bin/bash

# Docker Stats to CSV Converter
# Usage: ./docker-stats-to-csv.sh [output_file] [interval_seconds] [container_names...]
# Example: ./docker-stats-to-csv.sh reports/docker_stats.csv 1 backend frontend

OUTPUT_FILE="${1:-reports/docker_stats.csv}"
INTERVAL="${2:-1}"
CONTAINERS="${@:3}"

# If no containers specified, monitor all running containers
if [ -z "$CONTAINERS" ]; then
  CONTAINERS=$(docker ps --format "{{.Names}}" | tr '\n' ' ')
fi

# Create reports directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Write CSV header
echo "timestamp,container_id,container_name,cpu_percent,mem_usage,mem_limit,mem_percent,net_input,net_output,block_input,block_output,pids" > "$OUTPUT_FILE"

echo "Monitoring containers: $CONTAINERS"
echo "Output file: $OUTPUT_FILE"
echo "Interval: ${INTERVAL}s"
echo "Press Ctrl+C to stop"
echo ""

# Function to parse docker stats output
parse_stats() {
  local timestamp=$(date -Iseconds)
  docker stats --no-stream --format "{{.ID}},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}" $CONTAINERS | while IFS=',' read -r id name cpu mem_usage mem_percent net_io block_io pids; do
    # Parse memory usage (format: "87.8MiB / 2GiB")
    mem_used=$(echo "$mem_usage" | awk '{print $1}')
    mem_total=$(echo "$mem_usage" | awk '{print $3}')
    
    # Parse network I/O (format: "54MB / 41.4MB")
    net_input=$(echo "$net_io" | awk '{print $1}')
    net_output=$(echo "$net_io" | awk '{print $3}')
    
    # Parse block I/O (format: "0B / 0B")
    block_input=$(echo "$block_io" | awk '{print $1}')
    block_output=$(echo "$block_io" | awk '{print $3}')
    
    # Remove % sign from CPU and memory percent
    cpu=$(echo "$cpu" | tr -d '%')
    mem_percent=$(echo "$mem_percent" | tr -d '%')
    
    # Output CSV row
    echo "$timestamp,$id,$name,$cpu,$mem_used,$mem_total,$mem_percent,$net_input,$net_output,$block_input,$block_output,$pids"
  done
}

# Main loop
while true; do
  parse_stats >> "$OUTPUT_FILE"
  sleep "$INTERVAL"
done