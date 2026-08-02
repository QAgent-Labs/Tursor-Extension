#!/bin/bash
# Emits machine-readable lines: __TURSOR_STATUS__{json}
# VS Code extension parses these for the setup UI.

set -u

DIR="$HOME/.tursor"
TURSOR_CLI_PREFIX="$HOME/.tursor/npm-global"
TURSOR_CLI_BIN="$TURSOR_CLI_PREFIX/bin/tursor"

export_tursor_path() {
  export PATH="$TURSOR_CLI_PREFIX/bin:${PATH:-}"
}

export_tursor_path
REPO_URL="${TURSOR_BACKEND_REPO_URL:-https://github.com/QAgent-Labs/Tursor-Backend.git}"

bootstrap_node_path() {
  if [ -n "${TURSOR_NPM:-}" ] && [ -f "$TURSOR_NPM" ]; then
    export PATH="$(cd "$(dirname "$TURSOR_NPM")" && pwd):${PATH:-}"
    return 0
  fi
  for d in /opt/homebrew/bin /usr/local/bin; do
    if [ -x "$d/npm" ]; then
      export PATH="$d:${PATH:-}"
      return 0
    fi
  done
  local home="${HOME:-}"
  if [ -n "$home" ] && [ -d "$home/.nvm/versions/node" ]; then
    local ver
    ver=$(ls -1 "$home/.nvm/versions/node" 2>/dev/null | sort -V | tail -n 1)
    if [ -n "$ver" ] && [ -x "$home/.nvm/versions/node/$ver/bin/npm" ]; then
      export PATH="$home/.nvm/versions/node/$ver/bin:${PATH:-}"
      return 0
    fi
  fi
  for d in "$home/.fnm/current/bin" "$home/.volta/bin"; do
    if [ -x "$d/npm" ]; then
      export PATH="$d:${PATH:-}"
      return 0
    fi
  done
  return 1
}

npm_run() {
  bootstrap_node_path || true
  if [ -n "${TURSOR_NPM:-}" ] && [ -f "$TURSOR_NPM" ]; then
    "$TURSOR_NPM" "$@"
    return $?
  fi
  if command -v npm >/dev/null 2>&1; then
    npm "$@"
    return $?
  fi
  echo "npm: command not found (install Node.js or launch Cursor from Terminal)" >&2
  return 127
}

emit() {
  printf '__TURSOR_STATUS__%s\n' "$1" >&2
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

install_log_excerpt() {
  local log="$1"
  local prefix="$2"
  if [ ! -f "$log" ]; then
    printf '%s' "$prefix"
    return
  fi
  local tail
  tail=$(tail -n 8 "$log" 2>/dev/null | tr '\n' ' ' | tr -s ' ')
  tail=${tail:0:380}
  if [ -n "$tail" ]; then
    printf '%s %s' "$prefix" "$tail"
  else
    printf '%s' "$prefix"
  fi
}

tursor_cli_on_path() {
  export_tursor_path
  [ -x "$TURSOR_CLI_BIN" ]
}

tursor_cli_works() {
  export_tursor_path
  if [ ! -x "$TURSOR_CLI_BIN" ]; then
    return 1
  fi
  "$TURSOR_CLI_BIN" version >/dev/null 2>&1
}

# Persist CLI on PATH for new terminal sessions (best-effort).
install_path_in_shell_profile() {
  local marker="# Tursor CLI (added by Tursor extension install)"
  local line='export PATH="$HOME/.tursor/npm-global/bin:$PATH"'
  local home="${HOME:-}"
  [ -n "$home" ] || return 0
  for rc in "$home/.zshrc" "$home/.bashrc" "$home/.profile"; do
    if [ ! -f "$rc" ]; then
      continue
    fi
    if grep -qF '.tursor/npm-global/bin' "$rc" 2>/dev/null; then
      continue
    fi
    {
      printf '\n%s\n%s\n' "$marker" "$line"
    } >>"$rc"
  done
}

backend_repo_ready() {
  [ -f "$DIR/package.json" ]
}

backend_built() {
  [ -f "$DIR/dist/main.js" ] && [ -d "$DIR/node_modules/@nestjs/common" ]
}

reset_backend_dir_if_corrupt() {
  if [ ! -d "$DIR" ]; then
    return 0
  fi
  if backend_repo_ready; then
    return 0
  fi
  if [ -d "$DIR/.git" ]; then
    if (cd "$DIR" && git pull --ff-only 2>/dev/null) && backend_repo_ready; then
      return 0
    fi
  fi
  rm -rf "$DIR"
}

sync_backend_repo() {
  reset_backend_dir_if_corrupt

  if [ -n "${TURSOR_BACKEND_SOURCE:-}" ] && [ -f "${TURSOR_BACKEND_SOURCE}/package.json" ]; then
    mkdir -p "$DIR"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete \
        --exclude node_modules \
        --exclude dist \
        --exclude .git \
        "${TURSOR_BACKEND_SOURCE}/" "$DIR/"
    else
      rm -rf "$DIR"
      mkdir -p "$DIR"
      cp -R "${TURSOR_BACKEND_SOURCE}/." "$DIR/"
      rm -rf "$DIR/node_modules" "$DIR/dist"
    fi
    backend_repo_ready && return 0
    fail_phase "clone_repo" "local backend copy missing package.json under ~/.tursor"
    return 1
  fi

  if [ -d "$DIR/.git" ] && backend_repo_ready; then
    if (cd "$DIR" && git pull --ff-only); then
      return 0
    fi
    fail_phase "clone_repo" "git pull failed in ~/.tursor"
    return 1
  fi

  if [ -d "$DIR" ]; then
    rm -rf "$DIR"
  fi

  if git clone "$REPO_URL" "$DIR"; then
    backend_repo_ready && return 0
    fail_phase "clone_repo" "clone succeeded but package.json is missing"
    return 1
  fi

  fail_phase "clone_repo" "git clone failed"
  return 1
}

run_build() {
  if ! backend_repo_ready; then
    fail_phase "build" "missing ~/.tursor/package.json — clone the backend repo first"
    return 1
  fi
  local log="$DIR/.install-build.log"
  : >"$log"

  if ! (cd "$DIR" && npm_run install --no-audit --no-fund >>"$log" 2>&1); then
    fail_phase "build" "$(install_log_excerpt "$log" "npm install failed (Node.js and network required).")"
    return 1
  fi

  if ! (cd "$DIR" && npm_run run build >>"$log" 2>&1); then
    fail_phase "build" "$(install_log_excerpt "$log" "npm run build failed.")"
    return 1
  fi

  if backend_built; then
    return 0
  fi
  fail_phase "build" "npm run build finished but dist/main.js is missing"
  return 1
}

run_cli_install() {
  if ! backend_repo_ready; then
    fail_phase "cli_install" "missing ~/.tursor/package.json"
    return 1
  fi
  local log="$DIR/.install-cli.log"
  : >"$log"
  mkdir -p "$TURSOR_CLI_PREFIX"
  export_tursor_path

  if ! (cd "$DIR" && npm_run install -g --prefix "$TURSOR_CLI_PREFIX" --no-audit --no-fund . >>"$log" 2>&1); then
    fail_phase "cli_install" "$(install_log_excerpt "$log" "npm install -g failed (~/.tursor/npm-global).")"
    return 1
  fi

  export_tursor_path
  install_path_in_shell_profile

  if tursor_cli_works; then
    return 0
  fi
  fail_phase "cli_install" "CLI install finished but $TURSOR_CLI_BIN is missing or not executable"
  return 1
}

install_cdp_browsers_silent() {
  if ! backend_repo_ready; then
    return 0
  fi
  if ! grep -q '"cdp:install-browsers"' "$DIR/package.json" 2>/dev/null; then
    return 0
  fi
  (cd "$DIR" && npm_run run cdp:install-browsers >/dev/null 2>&1) || true
}

emit_ensure_running_done() {
  local detail="$1"
  local port=""
  export_tursor_path
  if [ -x "$TURSOR_CLI_BIN" ]; then
    port=$("$TURSOR_CLI_BIN" port 2>/dev/null || true)
  fi
  if [ -n "$port" ]; then
    emit "{\"phase\":\"ensure_running\",\"state\":\"done\",\"ok\":true,\"detail\":\"${detail}\",\"port\":${port}}"
  else
    emit "{\"phase\":\"ensure_running\",\"state\":\"done\",\"ok\":true,\"detail\":\"${detail}\"}"
  fi
}

run_ensure_running() {
  if ! backend_repo_ready; then
    fail_phase "ensure_running" "missing ~/.tursor/package.json"
    return 1
  fi

  if ! tursor_cli_works; then
    fail_phase "ensure_running" "tursor CLI missing — run CLI install first"
    return 1
  fi

  export_tursor_path
  install_cdp_browsers_silent

  set +e
  "$TURSOR_CLI_BIN" status >/dev/null 2>&1
  local status_ec=$?
  set -e

  if [ "$status_ec" -eq 0 ]; then
    if [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
      "$TURSOR_CLI_BIN" stop >/dev/null 2>&1 || true
    else
      emit_ensure_running_done "already_running"
      return 0
    fi
  fi

  if (cd "$DIR" && "$TURSOR_CLI_BIN" start); then
    emit_ensure_running_done "started"
    return 0
  fi

  fail_phase "ensure_running" "tursor start failed (run from ~/.tursor; see npm output above)"
  return 1
}

fully_installed() {
  tursor_cli_works && backend_repo_ready && backend_built
}

# Immediate UI feedback before local checks (extension shows first step loader).
emit '{"phase":"clone_repo","state":"start"}'

# Internal state for skip decisions (Setup page already ran tursor status before Install).
cli_ok=false
repo_ok=false
built_ok=false
if tursor_cli_works; then cli_ok=true; fi
if backend_repo_ready; then repo_ok=true; fi
if backend_built; then built_ok=true; fi

# User clicked Install — always run full/repair path (no skip-everything fast path).
if [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  :
elif fully_installed; then
  emit '{"phase":"clone_repo","state":"skipped"}'
  emit '{"phase":"build","state":"skipped"}'
  emit '{"phase":"cli_install","state":"skipped"}'

  emit '{"phase":"ensure_running","state":"start"}'
  if run_ensure_running; then
    echo "Tursor CLI ready and successfully running"
    exit 0
  fi
  exit 1
fi

# --- Full / repair install path ---
if ! sync_backend_repo; then
  exit 1
fi
emit '{"phase":"clone_repo","state":"done","ok":true}'

if ! $built_ok || [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  emit '{"phase":"build","state":"start"}'
  if ! run_build; then
    exit 1
  fi
  emit '{"phase":"build","state":"done","ok":true}'
else
  emit '{"phase":"build","state":"skipped"}'
fi

if ! $cli_ok || [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  emit '{"phase":"cli_install","state":"start"}'
  if ! run_cli_install; then
    exit 1
  fi
  emit '{"phase":"cli_install","state":"done","ok":true}'
else
  emit '{"phase":"cli_install","state":"skipped"}'
fi

emit '{"phase":"ensure_running","state":"start"}'
if ! run_ensure_running; then
  exit 1
fi

echo "Tursor CLI ready and successfully running"
