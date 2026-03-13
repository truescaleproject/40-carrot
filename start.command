#!/bin/bash
cd "$(dirname "$0")"

echo "==========================="
echo "  Starting 40 Carrot 🥕"
echo "==========================="
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Start dev server
npm run dev &
DEV_PID=$!

# Wait for server to be ready, then open browser
sleep 3
if command -v open &> /dev/null; then
  open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
  start http://localhost:3000
else
  echo "Open http://localhost:3000 in your browser"
fi

echo ""
echo "Server running at http://localhost:3000"
echo "Press Ctrl+C to stop."
echo ""

wait $DEV_PID
