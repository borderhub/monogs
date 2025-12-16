#!/bin/bash

# Development server management script
# Tracks PID and handles graceful shutdown

PID_FILE=".dev-server.pid"
PORT=3000

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down development server..."
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID"
      echo "Server stopped (PID: $PID)"
    fi
    rm -f "$PID_FILE"
  fi
  exit 0
}

# Check if server is already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Development server is already running (PID: $OLD_PID)"
    echo "Run 'npm run stop' to stop it first"
    exit 1
  else
    # Stale PID file, remove it
    rm -f "$PID_FILE"
  fi
fi

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Killing existing process..."
  lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "Starting Next.js development server..."

# Start the server and save its PID
npm run dev:next &
SERVER_PID=$!

# Save PID to file
echo "$SERVER_PID" > "$PID_FILE"

echo "Development server started (PID: $SERVER_PID)"
echo "Press Ctrl+C to stop the server"

# Wait for the server process
wait $SERVER_PID

# Cleanup when server exits
cleanup
