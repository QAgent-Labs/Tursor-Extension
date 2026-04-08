#!/bin/bash
# Emits machine-readable lines: __TURSOR_STATUS__{json}
# VS Code extension parses these for the setup UI.
# Keep in sync with install-tursor.sh at repo root (if anything copies root → here).

set -u

DIR="$HOME/.tursor"

emit() {
  printf '__TURSOR_STATUS__%s\n' "$1"
}

fail_phase() {
  local phase="$1"
  local msg="${2:-}"
  if [ -n "$msg" ]; then
    emit "{\"phase\":\"${phase}\",\"state\":\"done\",\"ok\":false,\"message\":\"${msg//\"/\\\"}\"}"
  else
    emit "{\"phase\":\"${phase}\",\"state\":\"done\",\"ok\":false}"
  fi
}

tursor_installed() {
  command -v tursor >/dev/null 2>&1 && tursor version >/dev/null 2>&1
}

# --- 1) Check if Tursor CLI is already installed ---
emit '{"phase":"check_install","state":"start"}'
if tursor_installed; then
  emit '{"phase":"check_install","state":"done","ok":true,"installed":true}'
else
  emit '{"phase":"check_install","state":"done","ok":true,"installed":false}'
fi

if tursor_installed; then
  emit '{"phase":"clone_repo","state":"skipped"}'
  emit '{"phase":"build","state":"skipped"}'
  emit '{"phase":"cli_install","state":"skipped"}'

  emit '{"phase":"ensure_running","state":"start"}'
  set +e
  tursor status >/dev/null 2>&1
  STATUS_EC=$?
  set -e

  if [ "$STATUS_EC" -eq 0 ]; then
    emit '{"phase":"ensure_running","state":"done","ok":true,"detail":"already_running"}'
  else
    if (cd "$DIR" && tursor start); then
      emit '{"phase":"ensure_running","state":"done","ok":true,"detail":"started"}'
    else
      fail_phase "ensure_running" "tursor start failed"
      exit 1
    fi
  fi

  echo "Tursor CLI ready and successfully running"
  exit 0
fi

# --- Fresh install path ---
emit '{"phase":"clone_repo","state":"start"}'
if [ -d "$DIR" ]; then
  if (cd "$DIR" && git pull); then
    emit '{"phase":"clone_repo","state":"done","ok":true}'
  else
    fail_phase "clone_repo" "git pull failed"
    exit 1
  fi
else
  if git clone https://github.com/QAgent-Labs/Tursor-Backend.git "$DIR"; then
    emit '{"phase":"clone_repo","state":"done","ok":true}'
  else
    fail_phase "clone_repo" "git clone failed"
    exit 1
  fi
fi

emit '{"phase":"build","state":"start"}'
if (cd "$DIR" && npm install && npm run build); then
  emit '{"phase":"build","state":"done","ok":true}'
else
  fail_phase "build" "npm install or build failed"
  exit 1
fi

emit '{"phase":"cli_install","state":"start"}'
if (cd "$DIR" && npm install -g .); then
  emit '{"phase":"cli_install","state":"done","ok":true}'
else
  fail_phase "cli_install" "npm install -g failed"
  exit 1
fi

# tursor start runs `npm run build` with cwd = process.cwd(); must be repo root.
emit '{"phase":"ensure_running","state":"start"}'
if (cd "$DIR" && tursor start); then
  emit '{"phase":"ensure_running","state":"done","ok":true,"detail":"started"}'
else
  fail_phase "ensure_running" "tursor start failed"
  exit 1
fi

echo "Tursor CLI ready and successfully running"
