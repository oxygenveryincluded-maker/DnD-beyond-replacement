#!/usr/bin/env bash
# Create a restorable snapshot of the app (source + full git history).
#
#   scripts/backup.sh [destination]
#
# Default destination: ~/backups
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$HOME/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BASE="dnd-companion-$STAMP"

mkdir -p "$DEST"

# Source snapshot without dependencies or build output.
tar --exclude=./node_modules \
    --exclude=./.svelte-kit \
    --exclude=./build \
    -czf "$DEST/$BASE.tar.gz" -C "$ROOT" .

# Full git history in one file (restore with: git clone <file> repo).
git -C "$ROOT" bundle create "$DEST/$BASE.bundle" --all

( cd "$DEST" && sha256sum "$BASE.tar.gz" "$BASE.bundle" > "$BASE.sha256" )

echo "Backup written to $DEST:"
ls -lh "$DEST/$BASE".*
