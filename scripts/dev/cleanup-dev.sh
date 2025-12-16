#!/bin/bash

# Cleanup orphaned development server processes

PORT=3000

echo "Searching for orphaned processes on port $PORT..."

# Find all processes using the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$PIDS" ]; then
  echo "Found processes: $PIDS"

  for PID in $PIDS; do
    PROCESS_INFO=$(ps -p "$PID" -o comm= 2>/dev/null)
    echo "  PID $PID: $PROCESS_INFO"
  done

  read -p "Kill all these processes? (y/N) " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Killing processes..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "Cleanup complete"
  else
    echo "Cleanup cancelled"
  fi
else
  echo "No processes found on port $PORT"
fi

# Clean up PID file if it exists
if [ -f ".dev-server.pid" ]; then
  PID=$(cat ".dev-server.pid")
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "Removing stale PID file"
    rm -f ".dev-server.pid"
  fi
fi
