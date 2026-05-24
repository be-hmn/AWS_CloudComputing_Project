#!/usr/bin/env bash
# 간단한 엔드투엔드 스모크 테스트
# 사용: bash scripts/smoketest.sh
set -euo pipefail

BASE=${BASE:-http://localhost:3000}

echo "== healthz =="
curl -s "$BASE/healthz"; echo

echo "== register mentee =="
curl -s -X POST "$BASE/auth/register" -H 'content-type: application/json' \
  -d '{"email":"mentee@example.com","password":"pw_12345","role":"MENTEE","name":"민수"}' || true
echo

echo "== register mentor =="
curl -s -X POST "$BASE/auth/register" -H 'content-type: application/json' \
  -d '{"email":"mentor@example.com","password":"pw_12345","role":"MENTOR","name":"박교수"}' || true
echo

login() {
  local email=$1 pw=$2
  curl -s -X POST "$BASE/auth/login" -H 'content-type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$pw\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])"
}

TM=$(login mentee@example.com pw_12345)
TT=$(login mentor@example.com pw_12345)
TA=$(login admin@example.com admin1234)

echo "tokens captured."

echo "== mentor profile =="
curl -s -X POST "$BASE/mentors/me" -H "authorization: Bearer $TT" \
  -H 'content-type: application/json' \
  -d '{"major":"CS","fields":["AI"],"availabilities":[{"start_at":"2030-01-01T10:00:00Z","end_at":"2030-01-01T18:00:00Z"}]}'
echo

echo "== application =="
APP=$(curl -s -X POST "$BASE/applications" -H "authorization: Bearer $TM" \
  -H 'content-type: application/json' \
  -d '{"interest_field":"AI","topic":"진로 상담","desired_at":"2030-01-01T14:00:00Z"}')
echo "$APP"
APP_ID=$(echo "$APP" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "== candidates =="
curl -s -H "authorization: Bearer $TA" "$BASE/admin/applications/$APP_ID/candidates"; echo

echo "== assign =="
ASS=$(curl -s -X POST "$BASE/admin/applications/$APP_ID/assign" \
  -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d '{"mentor_id":1}')
echo "$ASS"
ASS_ID=$(echo "$ASS" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "== approve =="
curl -s -X POST "$BASE/assignments/$ASS_ID/approve" \
  -H "authorization: Bearer $TT" -H 'content-type: application/json' \
  -d '{"scheduled_at":"2030-01-01T14:00:00Z"}'
echo

echo "== record =="
curl -s -X POST "$BASE/applications/$APP_ID/record" \
  -H "authorization: Bearer $TT" -H 'content-type: application/json' \
  -d '{"summary":"AI 진로에 대해 상담함","needs_next_consultation":true}'
echo

echo "== mentee /me/records =="
curl -s -H "authorization: Bearer $TM" "$BASE/me/records"
echo

echo "== admin stats =="
curl -s -H "authorization: Bearer $TA" "$BASE/admin/mentors/stats"
echo

echo "OK"
