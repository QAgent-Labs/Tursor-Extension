#!/bin/bash
# Emits machine-readable lines: __TURSOR_STATUS__{json}
# VS Code extension parses these for the setup UI.

set -u

DIR="$HOME/.tursor"
AI_DIR="$HOME/.tursor-ai"
TURSOR_CLI_PREFIX="$HOME/.tursor/npm-global"
TURSOR_CLI_BIN="$TURSOR_CLI_PREFIX/bin/tursor"
TURSOR_AI_CLI_PREFIX="$HOME/.tursor-ai/npm-global"
TURSOR_AI_CLI_BIN="$TURSOR_AI_CLI_PREFIX/bin/tursorAI"

export_tursor_path() {
  export PATH="$TURSOR_CLI_PREFIX/bin:${PATH:-}"
}

export_tursor_ai_path() {
  export PATH="$TURSOR_AI_CLI_PREFIX/bin:${PATH:-}"
}

export_tursor_path
export_tursor_ai_path
REPO_URL="${TURSOR_BACKEND_REPO_URL:-https://github.com/QAgent-Labs/Tursor-Backend.git}"
AI_REPO_URL="${TURSOR_AI_REPO_URL:-https://github.com/QAgent-Labs/Tursor-AI.git}"

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

python_version_ok() {
  local py="$1"
  "$py" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null
}

resolve_python3() {
  if [ -n "${TURSOR_PYTHON:-}" ] && [ -x "${TURSOR_PYTHON}" ]; then
    if python_version_ok "${TURSOR_PYTHON}"; then
      printf '%s' "${TURSOR_PYTHON}"
      return 0
    fi
  fi

  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      local py
      py=$(command -v "$candidate")
      if python_version_ok "$py"; then
        printf '%s' "$py"
        return 0
      fi
    fi
  done

  for py in /opt/homebrew/bin/python3.13 /opt/homebrew/bin/python3.12 \
    /usr/local/bin/python3.12; do
    if [ -x "$py" ] && python_version_ok "$py"; then
      printf '%s' "$py"
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

# Update a git checkout used as an install target. Tolerates dirty trees from
# prior rsync installs or local edits by resetting to origin/main when needed.
git_update_install_repo() {
  local dir="$1"
  local branch="${2:-main}"

  if [ ! -d "$dir/.git" ]; then
    return 1
  fi

  if (cd "$dir" && git pull --ff-only 2>/dev/null); then
    return 0
  fi

  if (
    cd "$dir" &&
      git fetch origin "$branch" 2>/dev/null &&
      git reset --hard "origin/$branch" 2>/dev/null
  ); then
    return 0
  fi

  if (cd "$dir" && git reset --hard HEAD 2>/dev/null && git pull --ff-only 2>/dev/null); then
    return 0
  fi

  return 1
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

tursor_ai_cli_works() {
  export_tursor_ai_path
  if [ ! -x "$TURSOR_AI_CLI_BIN" ]; then
    return 1
  fi
  "$TURSOR_AI_CLI_BIN" version >/dev/null 2>&1
}

install_path_in_shell_profile() {
  local marker="# Tursor CLI (added by Tursor extension install)"
  local line='export PATH="$HOME/.tursor/npm-global/bin:$HOME/.tursor-ai/npm-global/bin:$PATH"'
  local home="${HOME:-}"
  [ -n "$home" ] || return 0
  for rc in "$home/.zshrc" "$home/.bashrc" "$home/.profile"; do
    if [ ! -f "$rc" ]; then
      continue
    fi
    if grep -qF '.tursor-ai/npm-global/bin' "$rc" 2>/dev/null; then
      continue
    fi
    if grep -qF '.tursor/npm-global/bin' "$rc" 2>/dev/null; then
      # Upgrade older installs that only added the backend CLI to PATH.
      sed -i '' \
        's|\$HOME/.tursor/npm-global/bin:\$PATH|$HOME/.tursor/npm-global/bin:$HOME/.tursor-ai/npm-global/bin:$PATH|g' \
        "$rc" 2>/dev/null || \
      sed -i \
        's|\$HOME/.tursor/npm-global/bin:\$PATH|$HOME/.tursor/npm-global/bin:$HOME/.tursor-ai/npm-global/bin:$PATH|g' \
        "$rc" 2>/dev/null || true
      if grep -qF '.tursor-ai/npm-global/bin' "$rc" 2>/dev/null; then
        continue
      fi
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

ai_repo_ready() {
  [ -f "$AI_DIR/run.py" ] && [ -f "$AI_DIR/requirements.txt" ]
}

ai_venv_ready() {
  [ -x "$AI_DIR/.venv/bin/python" ] || [ -x "$AI_DIR/.venv/Scripts/python.exe" ]
}

ai_venv_usable() {
  if ! ai_venv_ready; then
    return 1
  fi
  local vpy="$AI_DIR/.venv/bin/python"
  if [ ! -x "$vpy" ]; then
    vpy="$AI_DIR/.venv/Scripts/python.exe"
  fi
  python_version_ok "$vpy"
}

reset_backend_dir_if_corrupt() {
  if [ ! -d "$DIR" ]; then
    return 0
  fi
  if backend_repo_ready; then
    return 0
  fi
  if [ -d "$DIR/.git" ]; then
    if git_update_install_repo "$DIR" main 2>/dev/null && backend_repo_ready; then
      return 0
    fi
  fi
  rm -rf "$DIR"
}

reset_ai_dir_if_corrupt() {
  if [ ! -d "$AI_DIR" ]; then
    return 0
  fi
  if ai_repo_ready; then
    return 0
  fi
  if [ -d "$AI_DIR/.git" ]; then
    if git_update_install_repo "$AI_DIR" main 2>/dev/null && ai_repo_ready; then
      return 0
    fi
  fi
  rm -rf "$AI_DIR"
}

sync_backend_repo() {
  reset_backend_dir_if_corrupt

  if [ -d "$DIR/.git" ] && backend_repo_ready; then
    if git_update_install_repo "$DIR" main; then
      return 0
    fi
  fi

  if [ -d "$DIR" ]; then
    rm -rf "$DIR"
  fi

  if git clone "$REPO_URL" "$DIR"; then
    backend_repo_ready && return 0
    fail_phase "clone_repo" "clone succeeded but package.json is missing"
    return 1
  fi

  fail_phase "clone_repo" "git clone failed ($REPO_URL)"
  return 1
}

sync_ai_repo() {
  reset_ai_dir_if_corrupt

  if [ -d "$AI_DIR/.git" ] && ai_repo_ready; then
    if git_update_install_repo "$AI_DIR" main; then
      return 0
    fi
  fi

  if [ -d "$AI_DIR" ]; then
    rm -rf "$AI_DIR"
  fi

  if git clone "$AI_REPO_URL" "$AI_DIR"; then
    ai_repo_ready && return 0
    fail_phase "clone_ai_repo" "clone succeeded but run.py is missing"
    return 1
  fi

  fail_phase "clone_ai_repo" "git clone failed ($AI_REPO_URL)"
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

run_ai_setup() {
  if ! ai_repo_ready; then
    fail_phase "ai_setup" "missing ~/.tursor-ai/run.py — clone Tursor-AI first"
    return 1
  fi

  local py
  py=$(resolve_python3) || {
    fail_phase "ai_setup" "Python 3.10+ not found — install Python 3.12+ (Homebrew or pyenv)"
    return 1
  }

  if ai_venv_ready; then
    local existing_py="$AI_DIR/.venv/bin/python"
    if [ ! -x "$existing_py" ]; then
      existing_py="$AI_DIR/.venv/Scripts/python.exe"
    fi
    if [ ! -x "$existing_py" ] || ! python_version_ok "$existing_py"; then
      rm -rf "$AI_DIR/.venv"
    fi
  fi

  local log="$AI_DIR/.install-ai-setup.log"
  : >"$log"

  if ! ai_venv_ready; then
    if ! (cd "$AI_DIR" && "$py" -m venv .venv >>"$log" 2>&1); then
      fail_phase "ai_setup" "$(install_log_excerpt "$log" "python venv creation failed.")"
      return 1
    fi
  fi

  local vpy="$AI_DIR/.venv/bin/python"
  if [ ! -x "$vpy" ]; then
    vpy="$AI_DIR/.venv/Scripts/python.exe"
  fi
  if [ ! -x "$vpy" ]; then
    fail_phase "ai_setup" "venv python missing after venv creation"
    return 1
  fi

  if ! (cd "$AI_DIR" && "$vpy" -m pip install --upgrade pip >>"$log" 2>&1); then
    fail_phase "ai_setup" "$(install_log_excerpt "$log" "pip upgrade failed.")"
    return 1
  fi

  if ! (cd "$AI_DIR" && "$vpy" -m pip install -r requirements.txt >>"$log" 2>&1); then
    fail_phase "ai_setup" "$(install_log_excerpt "$log" "pip install -r requirements.txt failed.")"
    return 1
  fi

  if ai_venv_ready; then
    return 0
  fi
  fail_phase "ai_setup" "Tursor-AI venv setup finished but python is missing"
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

run_ai_cli_install() {
  if ! ai_repo_ready; then
    fail_phase "ai_cli_install" "missing ~/.tursor-ai/run.py"
    return 1
  fi
  local log="$AI_DIR/.install-ai-cli.log"
  : >"$log"
  mkdir -p "$TURSOR_AI_CLI_PREFIX"
  export_tursor_ai_path

  if ! (cd "$AI_DIR" && npm_run install -g --prefix "$TURSOR_AI_CLI_PREFIX" --no-audit --no-fund . >>"$log" 2>&1); then
    fail_phase "ai_cli_install" "$(install_log_excerpt "$log" "npm install -g failed (~/.tursor-ai/npm-global).")"
    return 1
  fi

  export_tursor_ai_path
  install_path_in_shell_profile

  if tursor_ai_cli_works; then
    return 0
  fi
  fail_phase "ai_cli_install" "CLI install finished but $TURSOR_AI_CLI_BIN is missing or not executable"
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

read_backend_port_json() {
  local json=""
  export_tursor_path
  if [ ! -x "$TURSOR_CLI_BIN" ]; then
    return 1
  fi
  json=$("$TURSOR_CLI_BIN" port --json 2>/dev/null || true)
  if [ -z "$json" ]; then
    return 1
  fi
  printf '%s' "$json" | sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n 1
}

read_ai_port_json() {
  local json=""
  export_tursor_ai_path
  if [ ! -x "$TURSOR_AI_CLI_BIN" ]; then
    return 1
  fi
  json=$("$TURSOR_AI_CLI_BIN" port --json 2>/dev/null || true)
  if [ -z "$json" ]; then
    return 1
  fi
  printf '%s' "$json" | sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n 1
}

emit_ensure_running_done() {
  local detail="$1"
  local port=""
  port=$(read_backend_port_json || true)
  if [ -n "$port" ]; then
    emit "{\"phase\":\"ensure_running\",\"state\":\"done\",\"ok\":true,\"detail\":\"${detail}\",\"port\":${port}}"
  else
    emit "{\"phase\":\"ensure_running\",\"state\":\"done\",\"ok\":true,\"detail\":\"${detail}\"}"
  fi
}

emit_ensure_ai_running_done() {
  local detail="$1"
  local aiPort=""
  aiPort=$(read_ai_port_json || true)
  if [ -n "$aiPort" ]; then
    emit "{\"phase\":\"ensure_ai_running\",\"state\":\"done\",\"ok\":true,\"detail\":\"${detail}\",\"aiPort\":${aiPort}}"
  else
    emit "{\"phase\":\"ensure_ai_running\",\"state\":\"done\",\"ok\":true,\"detail\":\"${detail}\"}"
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

  if (cd "$DIR" && "$TURSOR_CLI_BIN" start >>"$DIR/.install-start.log" 2>&1); then
    emit_ensure_running_done "started"
    return 0
  fi

  fail_phase "ensure_running" "tursor start failed (run from ~/.tursor; see npm output above)"
  return 1
}

run_ensure_ai_running() {
  if ! ai_repo_ready; then
    fail_phase "ensure_ai_running" "missing ~/.tursor-ai/run.py"
    return 1
  fi

  if ! tursor_ai_cli_works; then
    fail_phase "ensure_ai_running" "tursorAI CLI missing — run AI CLI install first"
    return 1
  fi

  if ! ai_venv_usable; then
    fail_phase "ensure_ai_running" "Tursor-AI venv missing or Python < 3.10 — re-run install"
    return 1
  fi

  export_tursor_ai_path

  set +e
  "$TURSOR_AI_CLI_BIN" status >/dev/null 2>&1
  local status_ec=$?
  set -e

  if [ "$status_ec" -eq 0 ]; then
    if [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
      "$TURSOR_AI_CLI_BIN" stop >/dev/null 2>&1 || true
    else
      emit_ensure_ai_running_done "already_running"
      return 0
    fi
  fi

  if (cd "$AI_DIR" && "$TURSOR_AI_CLI_BIN" start >>"$AI_DIR/.install-start.log" 2>&1); then
    local waited=0
    while [ "$waited" -lt 120 ]; do
      if "$TURSOR_AI_CLI_BIN" status >/dev/null 2>&1; then
        emit_ensure_ai_running_done "started"
        return 0
      fi
      sleep 2
      waited=$((waited + 2))
    done
    fail_phase "ensure_ai_running" "$(install_log_excerpt "$AI_DIR/.install-start.log" "tursorAI start did not become healthy — check Python 3.10+ venv under ~/.tursor-ai/.venv")"
    return 1
  fi

  fail_phase "ensure_ai_running" "tursorAI start failed (run from ~/.tursor-ai)"
  return 1
}

fully_installed() {
  tursor_cli_works && tursor_ai_cli_works && backend_repo_ready && backend_built && ai_repo_ready && ai_venv_usable
}

# Immediate UI feedback before local checks (extension shows first step loader).
emit '{"phase":"clone_repo","state":"start"}'

cli_ok=false
ai_cli_ok=false
repo_ok=false
ai_repo_ok=false
built_ok=false
ai_setup_ok=false
if tursor_cli_works; then cli_ok=true; fi
if tursor_ai_cli_works; then ai_cli_ok=true; fi
if backend_repo_ready; then repo_ok=true; fi
if ai_repo_ready; then ai_repo_ok=true; fi
if backend_built; then built_ok=true; fi
if ai_venv_usable; then ai_setup_ok=true; fi

if [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  :
elif fully_installed; then
  emit '{"phase":"clone_repo","state":"skipped"}'
  emit '{"phase":"clone_ai_repo","state":"skipped"}'
  emit '{"phase":"build","state":"skipped"}'
  emit '{"phase":"ai_setup","state":"skipped"}'
  emit '{"phase":"cli_install","state":"skipped"}'
  emit '{"phase":"ai_cli_install","state":"skipped"}'

  emit '{"phase":"ensure_running","state":"start"}'
  if ! run_ensure_running; then
    exit 1
  fi

  emit '{"phase":"ensure_ai_running","state":"start"}'
  if ! run_ensure_ai_running; then
    exit 1
  fi

  echo "Tursor CLI and Tursor-AI ready and successfully running"
  exit 0
fi

if ! sync_backend_repo; then
  exit 1
fi
emit '{"phase":"clone_repo","state":"done","ok":true}'

emit '{"phase":"clone_ai_repo","state":"start"}'
if ! sync_ai_repo; then
  exit 1
fi
emit '{"phase":"clone_ai_repo","state":"done","ok":true}'

if ! $built_ok || [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  emit '{"phase":"build","state":"start"}'
  if ! run_build; then
    exit 1
  fi
  emit '{"phase":"build","state":"done","ok":true}'
else
  emit '{"phase":"build","state":"skipped"}'
fi

if ! $ai_setup_ok || [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  emit '{"phase":"ai_setup","state":"start"}'
  if ! run_ai_setup; then
    exit 1
  fi
  emit '{"phase":"ai_setup","state":"done","ok":true}'
else
  emit '{"phase":"ai_setup","state":"skipped"}'
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

if ! $ai_cli_ok || [ "${TURSOR_FORCE_FULL_INSTALL:-}" = "1" ]; then
  emit '{"phase":"ai_cli_install","state":"start"}'
  if ! run_ai_cli_install; then
    exit 1
  fi
  emit '{"phase":"ai_cli_install","state":"done","ok":true}'
else
  emit '{"phase":"ai_cli_install","state":"skipped"}'
fi

emit '{"phase":"ensure_running","state":"start"}'
if ! run_ensure_running; then
  exit 1
fi

emit '{"phase":"ensure_ai_running","state":"start"}'
if ! run_ensure_ai_running; then
  exit 1
fi

echo "Tursor CLI and Tursor-AI ready and successfully running"
