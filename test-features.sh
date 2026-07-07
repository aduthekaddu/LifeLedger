#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5000/api/v1}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "LifeLedger smoke test"

echo "1. Health"
curl -fsS "$API_URL/health" | python3 -m json.tool

echo "2. Login as seeded patient"
curl -fsS -c "$COOKIE_JAR" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@lifeledger.dev","password":"LifeLedgerDemo!2026"}' \
  | python3 -m json.tool

echo "3. Read profile"
curl -fsS -b "$COOKIE_JAR" "$API_URL/profile/me" | python3 -m json.tool

echo "4. Add a structured observation"
curl -fsS -b "$COOKIE_JAR" -X POST "$API_URL/clinical-entries" \
  -H "Content-Type: application/json" \
  -d '{"type":"observation","title":"Resting heart rate","valueText":"68","unit":"bpm","onsetDate":"2026-07-07","notes":"Smoke test entry"}' \
  | python3 -m json.tool

echo "5. Export FHIR bundle"
curl -fsS -b "$COOKIE_JAR" "$API_URL/fhir/export" | python3 -m json.tool

echo "6. Generate AI visit prep"
curl -fsS -b "$COOKIE_JAR" -X POST "$API_URL/ai/visit-prep" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -m json.tool

echo "7. Read audit ledger"
curl -fsS -b "$COOKIE_JAR" "$API_URL/audit" | python3 -m json.tool

echo "Smoke test complete"
