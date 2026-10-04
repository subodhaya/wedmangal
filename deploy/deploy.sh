#!/usr/bin/env bash
# Production deploy for WedMangal. Run on the server as root:
#   bash deploy/deploy.sh                    deploy origin/main
#   bash deploy/deploy.sh --check-only REF   only run the isolated checks/tests on REF (never goes live)
#
# Order matters — nothing on the live site changes until every check has passed:
#   1. fetch origin/main and test it in an isolated git worktree (live code untouched)
#   2. manage.py check, makemigrations --check, the full Django test suite
#   3. build the React app into build_new (the live build keeps serving)
#   4. only then: back up the DB if migrations are pending, fast-forward, migrate,
#      swap the build, restart gunicorn, smoke-check
# Any failing step stops the script (set -e + explicit exit codes; output is never piped
# into a grep that could hide a failure).
set -euo pipefail

APP=/var/www/wedmangal
VENV=$APP/backend/venv/bin
TS=$(date +%Y%m%d-%H%M%S)
BACKUP=/root/backups/deploy-$TS
SITE=https://www.wedmangal.com

say() { printf '\n== %s\n' "$*"; }
fail() { printf '\n!! DEPLOY STOPPED: %s\n   The live site was not changed.\n' "$*" >&2; exit 1; }

MODE=deploy
[ "${1:-}" = "--check-only" ] && MODE=check
cd "$APP"
OLD=$(git rev-parse HEAD)
git fetch -q origin main
NEW=$(git rev-parse "${2:-origin/main}")
if [ "$MODE" = deploy ]; then
  [ "$OLD" != "$NEW" ] || { echo "Already at $NEW — nothing to deploy."; exit 0; }
  git merge-base --is-ancestor "$OLD" "$NEW" || fail "origin/main is not a fast-forward of the live commit"
fi

say "Incoming $OLD..$NEW"
git log --oneline "$OLD..$NEW"
git diff --name-only "$OLD" "$NEW"
# Server-only changes (React build, videos, verification file) must not collide with incoming files
CONFLICTS=$(comm -12 <(git diff --name-only "$OLD" "$NEW" | sort) <(git status --porcelain | cut -c4- | sort) || true)
[ -z "$CONFLICTS" ] || fail "incoming files overlap with uncommitted server changes: $CONFLICTS"

mkdir -p "$BACKUP"; chmod 700 "$BACKUP"
echo "rollback: git checkout $OLD; restore $BACKUP/db.sql.gz if a migration ran; build_prev_$TS" > "$BACKUP/rollback.txt"

say "1-2. Testing $NEW in an isolated worktree"
WT=$(mktemp -d /tmp/wm-release-XXXX)
cleanup() { cd "$APP"; git worktree remove --force "$WT" 2>/dev/null || true; rm -f /tmp/wm_test_settings.py; }
trap cleanup EXIT
git worktree add -q --detach "$WT" "$NEW"
cp "$APP/backend/backend/settings.py" "$WT/backend/backend/settings.py"     # untracked on the server
[ -f "$APP/backend/.env" ] && cp "$APP/backend/.env" "$WT/backend/.env"
mkdir -p "$WT/frontend" && ln -sfn "$APP/frontend/build" "$WT/frontend/build"  # SEO tests read index.html
cat > /tmp/wm_test_settings.py <<PY
from backend.settings import *
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PY
cd "$WT/backend"
"$VENV/python" manage.py check || fail "manage.py check"
"$VENV/python" manage.py makemigrations --check --dry-run || fail "model changes without a migration"
if ! PYTHONPATH=/tmp:. "$VENV/python" manage.py test base --settings=wm_test_settings > "$BACKUP/tests.log" 2>&1; then
  tail -40 "$BACKUP/tests.log"; fail "Django tests failed (full log: $BACKUP/tests.log)"
fi
tail -3 "$BACKUP/tests.log"
if [ "$MODE" = check ]; then echo "Checks passed for $NEW (check-only: nothing was deployed)"; exit 0; fi

say "3. Building the frontend (live build keeps serving)"
cd "$APP"
git merge -q --ff-only "$NEW"                       # code on disk only; gunicorn still runs the old code
cd "$APP/frontend"
rm -rf build_new
BUILD_PATH=build_new npx react-scripts build > "$BACKUP/build.log" 2>&1 || { tail -30 "$BACKUP/build.log"; git -C "$APP" reset -q --keep "$OLD"; fail "frontend build failed (code reset to $OLD)"; }
[ -f build_new/index.html ] || { git -C "$APP" reset -q --keep "$OLD"; fail "build produced no index.html"; }

say "4. Going live"
cd "$APP/backend"
PENDING=$("$VENV/python" manage.py showmigrations --plan 2>/dev/null | grep -c '^\[ \]' || true)
if [ "$PENDING" -gt 0 ]; then
  echo "$PENDING migration(s) pending — backing up the database first"
  "$VENV/python" - > "$BACKUP/my.cnf" 2>/dev/null <<'PY'
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings"); django.setup()
from django.conf import settings
d = settings.DATABASES["default"]
pw = d["PASSWORD"].replace("\\", "\\\\").replace('"', '\\"')
print(f'[client]\nuser={d["USER"]}\npassword="{pw}"\nhost={d.get("HOST") or "localhost"}\nport={d.get("PORT") or 3306}\n#DB={d["NAME"]}')
PY
  chmod 600 "$BACKUP/my.cnf"; DB=$(grep '^#DB=' "$BACKUP/my.cnf" | cut -d= -f2); sed -i '/^#DB=/d' "$BACKUP/my.cnf"
  mysqldump --defaults-extra-file="$BACKUP/my.cnf" --single-transaction --no-tablespaces "$DB" > "$BACKUP/db.sql" || { rm -f "$BACKUP/my.cnf"; git -C "$APP" reset -q --keep "$OLD"; fail "database backup failed"; }
  rm -f "$BACKUP/my.cnf"; gzip "$BACKUP/db.sql"
  "$VENV/python" manage.py showmigrations --plan | grep '^\[ \]'
  "$VENV/python" manage.py migrate --noinput
fi
cd "$APP/frontend"
cp -rn build/. build_new/ 2>/dev/null || true       # keep old hashed files for open tabs
mv build "build_prev_$TS"; mv build_new build
systemctl restart gunicorn; sleep 3
systemctl is-active --quiet gunicorn || fail "gunicorn did not start — roll back with $BACKUP/rollback.txt"

say "Smoke check"
for path in / /product/7 /api/search/?q=hall /sitemap.xml; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE$path"); echo "$code $path"
  [ "$code" = 200 ] || fail "$path returned $code after going live — roll back with $BACKUP/rollback.txt"
done
echo "Deployed $NEW (rollback notes: $BACKUP/rollback.txt)"
