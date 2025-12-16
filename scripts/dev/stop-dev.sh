#!/bin/bash

# Stop development server script

PID_FILE=".dev-server.pid"
PORT=3000

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")

  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping development server (PID: $PID)..."
    kill "$PID"

    # Wait for process to terminate
    for i in {1..10}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        echo "Server stopped successfully"
        rm -f "$PID_FILE"
        exit 0
      fi
      sleep 1
    done

    # If still running, force kill
    echo "Server did not stop gracefully, forcing shutdown..."
    kill -9 "$PID" 2>/dev/null
    rm -f "$PID_FILE"
    echo "Server force stopped"
  else
    echo "Server is not running (stale PID file)"
    rm -f "$PID_FILE"
  fi
else
  echo "No PID file found. Checking for processes on port $PORT..."

  # Check if anything is using the port
  PIDS=$(lsof -ti:$PORT 2>/dev/null)

  if [ -n "$PIDS" ]; then
    echo "Found processes using port $PORT: $PIDS"
    echo "Killing processes..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "Processes killed"
  else
    echo "No development server running"
  fi
fi
