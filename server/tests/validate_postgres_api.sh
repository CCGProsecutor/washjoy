#!/usr/bin/env bash
set -euo pipefail

# Runs only against an independently created PostgreSQL database and loopback API.
# The production URL is read from its protected environment file and never printed.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="$(date +%Y%m%d%H%M%S)"
VERIFY_DB="washjoy_verify_${STAMP}"
WORK_DIR="/root/scratch/washjoy-backend-validation-${STAMP}"
PORT="${WASHJOY_VERIFY_PORT:-3875}"
API="http://127.0.0.1:${PORT}"
BIN="${WASHJOY_VERIFY_BIN:-$ROOT/target/release/washjoy-api}"
BACKUP_DIR="/root/backups/washjoy-${STAMP}"
PID=""
RESTORE_DB=""

cleanup() {
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then kill "$PID"; wait "$PID" || true; fi
  if [[ -n "${VERIFY_URL:-}" ]]; then dropdb --if-exists --maintenance-db="$DATABASE_URL" "$VERIFY_DB" || true; fi
  if [[ -n "$RESTORE_DB" ]]; then dropdb --if-exists --maintenance-db="$DATABASE_URL" "$RESTORE_DB" || true; fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
need() { command -v "$1" >/dev/null || fail "missing command: $1"; }
for tool in curl jq createdb dropdb pg_dump pg_restore psql; do need "$tool"; done
[[ -x "$BIN" ]] || fail "verification binary is missing: $BIN"

set -a
. /etc/washjoy-postgres.env
set +a
[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not configured"

# Replace only the database path portion; DATABASE_URL is never echoed or logged.
VERIFY_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#(/)[^/?]+(\?.*)?$#/${VERIFY_DB}\2#")"
[[ "$VERIFY_URL" != "$DATABASE_URL" ]] || fail "could not derive isolated verification database URL"

umask 077
mkdir -p "$WORK_DIR/stores" "$BACKUP_DIR"
printf '%s\n' '{"pois":[]}' > "$WORK_DIR/stores/nanjing.json"
printf '%s\n' '{"pois":[]}' > "$WORK_DIR/stores/yangzhou.json"
printf '%s\n' '{"pois":[]}' > "$WORK_DIR/stores/zhenjiang.json"

createdb --maintenance-db="$DATABASE_URL" "$VERIFY_DB"

WASHJOY_LISTEN_ADDR="127.0.0.1:${PORT}" \
WASHJOY_STORE_DIR="$WORK_DIR/stores" \
WASHJOY_UPLOAD_DIR="$WORK_DIR/uploads" \
WASHJOY_ADMIN_PHONE="13800000001" \
WASHJOY_COOKIE_SECURE=0 \
DATABASE_URL="$VERIFY_URL" \
"$BIN" >"$WORK_DIR/api.log" 2>&1 &
PID=$!

for _ in $(seq 1 40); do
  if curl -fsS "$API/health" > "$WORK_DIR/health.json"; then break; fi
  sleep 0.25
done
jq -e '.ok == true and .service == "washjoy-api-rust"' "$WORK_DIR/health.json" >/dev/null || fail "health endpoint did not become ready"

request() {
  local method="$1" path="$2" body="${3:-}" cookie="${4:-}" header="$WORK_DIR/headers"
  : > "$header"
  if [[ -n "$body" ]]; then
    curl -sS -D "$header" -X "$method" "$API$path" -H 'content-type: application/json' ${cookie:+-H "Cookie: $cookie"} --data "$body" > "$WORK_DIR/body.json"
  else
    curl -sS -D "$header" -X "$method" "$API$path" ${cookie:+-H "Cookie: $cookie"} > "$WORK_DIR/body.json"
  fi
}
status() { awk 'NR==1 {print $2}' "$WORK_DIR/headers"; }
cookie_from_response() { awk -F': ' 'tolower($1)=="set-cookie" {sub(/;.*/, "", $2); print $2; exit}' "$WORK_DIR/headers"; }
expect_status() { [[ "$(status)" == "$1" ]] || fail "expected HTTP $1, got $(status)"; }

request GET '/admin/places?city=nanjing'
expect_status 401
jq -e '.code == "unauthorized" and .message and .requestId and .error' "$WORK_DIR/body.json" >/dev/null || fail "unauthorized error contract failed"

request POST /auth/register '{"phone":"13900000001","password":"validation-pass-01","displayName":"验证用户"}'
expect_status 201
USER_COOKIE="$(cookie_from_response)"; [[ -n "$USER_COOKIE" ]] || fail "user registration did not issue a cookie"
jq -e '.user.role == "user"' "$WORK_DIR/body.json" >/dev/null || fail "user role is incorrect"

request POST /auth/register '{"phone":"13800000001","password":"validation-pass-02","displayName":"验证管理员"}'
expect_status 201
ADMIN_COOKIE="$(cookie_from_response)"; [[ -n "$ADMIN_COOKIE" ]] || fail "admin registration did not issue a cookie"
jq -e '.user.role == "admin"' "$WORK_DIR/body.json" >/dev/null || fail "admin role is incorrect"

PLACE='{ "city":"nanjing", "name":"验证洗浴中心", "category":"洗浴中心", "location":"118.7800,32.0400", "address":"验证路 1 号", "area":"鼓楼区", "phone":"025-00000000", "price":"88", "rating":"4.8", "openTime":"10:00-22:00", "description":"临时验证门店", "images":[], "techs":[], "services":"搓背", "recommended":false }'
request POST /admin/places "$PLACE" "$ADMIN_COOKIE"
expect_status 201
PLACE_ID="$(jq -r '.id // empty' "$WORK_DIR/body.json")"; [[ "$PLACE_ID" == manual-* ]] || fail "manual place was not created"

request POST /reviews "{\"placeId\":\"$PLACE_ID\",\"city\":\"nanjing\",\"rating\":5,\"text\":\"验证评价\"}" "$USER_COOKIE"
expect_status 200
REVIEW_ID="$(jq -r '.review.id // empty' "$WORK_DIR/body.json")"; [[ "$REVIEW_ID" =~ ^[0-9]+$ ]] || fail "review was not created"

request GET "/admin/reviews?city=nanjing" '' "$ADMIN_COOKIE"
expect_status 200
jq -e --argjson id "$REVIEW_ID" '.reviews | any(.id == $id)' "$WORK_DIR/body.json" >/dev/null || fail "admin cannot read created review"
request DELETE "/admin/reviews/$REVIEW_ID" '' "$ADMIN_COOKIE"
expect_status 200

request DELETE "/admin/places/$PLACE_ID?city=nanjing" '' "$ADMIN_COOKIE"
expect_status 200
request GET '/admin/trash?city=nanjing' '' "$ADMIN_COOKIE"
expect_status 200
jq -e --arg id "$PLACE_ID" '.places | any(.id == $id and .manual == true)' "$WORK_DIR/body.json" >/dev/null || fail "soft-deleted place is missing from trash"
request POST "/admin/places/$PLACE_ID/restore?city=nanjing" '' "$ADMIN_COOKIE"
expect_status 200

request POST /auth/logout '' "$USER_COOKIE"
expect_status 200
request GET /auth/me '' "$USER_COOKIE"
expect_status 200
jq -e '. == null' "$WORK_DIR/body.json" >/dev/null || fail "logout did not invalidate the session"
request POST /auth/login '{"phone":"13900000001","password":"validation-pass-01"}'
expect_status 200
USER_COOKIE="$(cookie_from_response)"; [[ -n "$USER_COOKIE" ]] || fail "login did not issue a cookie"

kill "$PID"; wait "$PID" || true; PID=""
WASHJOY_LISTEN_ADDR="127.0.0.1:${PORT}" WASHJOY_STORE_DIR="$WORK_DIR/stores" WASHJOY_UPLOAD_DIR="$WORK_DIR/uploads" WASHJOY_ADMIN_PHONE="13800000001" WASHJOY_COOKIE_SECURE=0 DATABASE_URL="$VERIFY_URL" "$BIN" >"$WORK_DIR/api-restart.log" 2>&1 &
PID=$!
for _ in $(seq 1 40); do curl -fsS "$API/health" >/dev/null && break; sleep 0.25; done
request GET /auth/me '' "$USER_COOKIE"
expect_status 200
jq -e '.phone == "13900000001"' "$WORK_DIR/body.json" >/dev/null || fail "login session did not persist through API restart"

# A production dump is produced without selecting or printing any user rows, then restored into a disposable database.
pg_dump --format=custom --no-owner --file="$BACKUP_DIR/production.dump" "$DATABASE_URL"
RESTORE_DB="${VERIFY_DB}_restore"
createdb --maintenance-db="$DATABASE_URL" "$RESTORE_DB"
pg_restore --exit-on-error --no-owner --dbname="$(printf '%s' "$VERIFY_URL" | sed -E "s#(/)[^/?]+(\?.*)?$#/${RESTORE_DB}\2#")" "$BACKUP_DIR/production.dump"
PROD_COUNTS="$(psql "$DATABASE_URL" -Atqc "SELECT (SELECT count(*) FROM users)::text || ',' || (SELECT count(*) FROM sessions)::text || ',' || (SELECT count(*) FROM reg_limit)::text || ',' || (SELECT count(*) FROM login_fail)::text || ',' || (SELECT count(*) FROM store_overrides)::text || ',' || (SELECT count(*) FROM reviews)::text")"
RESTORE_URL="$(printf '%s' "$VERIFY_URL" | sed -E "s#(/)[^/?]+(\?.*)?$#/${RESTORE_DB}\2#")"
RESTORE_COUNTS="$(psql "$RESTORE_URL" -Atqc "SELECT (SELECT count(*) FROM users)::text || ',' || (SELECT count(*) FROM sessions)::text || ',' || (SELECT count(*) FROM reg_limit)::text || ',' || (SELECT count(*) FROM login_fail)::text || ',' || (SELECT count(*) FROM store_overrides)::text || ',' || (SELECT count(*) FROM reviews)::text")"
[[ "$PROD_COUNTS" == "$RESTORE_COUNTS" ]] || fail "restored table counts differ from production"
dropdb --maintenance-db="$DATABASE_URL" "$RESTORE_DB"
RESTORE_DB=""

printf 'PASS: PostgreSQL API validation and backup restore verification completed\n'
