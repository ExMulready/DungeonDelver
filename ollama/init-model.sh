#!/bin/sh
# Pulls the narrator model into the Ollama volume on first boot.
#
# Runs as a one-shot Compose service and exits. Safe to re-run: Ollama skips
# layers it already has, so subsequent `compose up` calls finish in milliseconds.
set -eu

MODEL="${OLLAMA_MODEL:-qwen3.5:2b}"

echo "==> Waiting for Ollama at ${OLLAMA_HOST}..."
i=0
until ollama list >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "!!! Ollama did not become reachable after 120s. Is the ollama service healthy?" >&2
    exit 1
  fi
  sleep 2
done

if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "$MODEL"; then
  echo "==> ${MODEL} is already present. Nothing to pull."
  exit 0
fi

echo "==> Pulling ${MODEL}. First run downloads ~1-3 GB and may take a while."
ollama pull "$MODEL"

echo "==> ${MODEL} ready. The narrator is awake."
