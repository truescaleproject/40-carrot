#!/bin/bash
cd "$(dirname "$0")"
echo "Starting 40 Carrot..."
npm run dev &
sleep 2
open http://localhost:3000
wait
