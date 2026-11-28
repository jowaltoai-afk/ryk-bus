#!/usr/bin/env bash
# deploy.sh — RYK Bus website deploy with server-owned file protection.
#
# Standing lesson (2026-10-18, v102 incident): gh.py push replaces the whole
# repo with the staging dir. message.json + ticker.json are SERVER-OWNED
# (written by the ryk-admin-api Worker / admin app). Pushing staging's stale
# copies silently wipes the live message — users then see nothing (or an old
# test message) until someone re-sends it.
#
# This wrapper fetches the LIVE copies first and stages them, so every push
# preserves them automatically. Fail-safe: if the live files can't be read
# and validated, the deploy STOPS instead of pushing a possibly stale copy.
# Override only deliberately: ./deploy.sh --keep-local
set -euo pipefail

# 2026-10-23 fix: gh.py needs dynamic_credentials from the custom-connector
# bin dir. The 05:30 proxy pipeline invoked deploy.sh WITHOUT this path and
# died with ModuleNotFoundError before pushing. deploy.sh now sets it itself
# so EVERY caller (pipeline, manual, cron) works; a pre-set PYTHONPATH is kept.
export PYTHONPATH="/opt/muse/skills/custom-connector-setup/bin${PYTHONPATH:+:$PYTHONPATH}"

STAGING="$HOME/workspace/ryk-bus-ghpages"
LIVE="https://rykbus.dpdns.org"
GH_PY="$HOME/workspace/custom-connectors/custom.legacy-github/bin/gh.py"
REPO="ryk-bus"

KEEP_LOCAL=0
if [[ "${1:-}" == "--keep-local" ]]; then KEEP_LOCAL=1; fi

fetch_live() { # $1 = filename
  curl -fsSL --max-time 20 "$LIVE/$1"
}

if [[ "$KEEP_LOCAL" == "0" ]]; then
  echo "[deploy] fetching live server-owned files..."
  MSG="$(fetch_live message.json)" \
    || { echo "[deploy] ERROR: live message.json unreadable — deploy STOPPED (use --keep-local to override deliberately)."; exit 1; }
  TICK="$(fetch_live ticker.json)" \
    || { echo "[deploy] ERROR: live ticker.json unreadable — deploy STOPPED (use --keep-local to override deliberately)."; exit 1; }

  # validate before staging: message.json needs a numeric id; ticker.json an object
  echo "$MSG"  | python3 -c "import json,sys; d=json.load(sys.stdin); assert isinstance(d.get('id'), int), 'message.json has no numeric id'" \
    || { echo "[deploy] ERROR: live message.json failed validation — deploy STOPPED."; exit 1; }
  echo "$TICK" | python3 -c "import json,sys; d=json.load(sys.stdin); assert isinstance(d, dict), 'ticker.json is not an object'" \
    || { echo "[deploy] ERROR: live ticker.json failed validation — deploy STOPPED."; exit 1; }

  printf '%s' "$MSG"  > "$STAGING/message.json"
  printf '%s' "$TICK" > "$STAGING/ticker.json"
  echo "[deploy] staged live message.json (id $(echo "$MSG" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")) + ticker.json"
else
  echo "[deploy] --keep-local: staging copies used as-is (deliberate override)."
fi

echo "[deploy] pushing $STAGING -> github:$REPO ..."
PYTHONPATH="$HOME/workspace/custom-connectors/custom.legacy-github/bin:${PYTHONPATH:-}" \
  python3 "$GH_PY" push "$STAGING" "$REPO"
echo "[deploy] done."
