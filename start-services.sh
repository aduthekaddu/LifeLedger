#!/usr/bin/env bash
set -euo pipefail

echo "Starting LifeLedger containers"
docker compose up --build -d

echo "Waiting for API health"
for _ in {1..30}; do
  if curl -fsS http://localhost:5000/api/v1/health >/dev/null; then
    echo "API is healthy"
    break
  fi
  sleep 2
done

echo "Seeding demo data"
docker compose exec backend npm run seed:prod

echo "LifeLedger is running"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000/api/v1/health"
