#!/usr/bin/env bash
# Zero-CI test of the self-update path: builds the app twice locally (an
# "old" build pointed at a throwaway local HTTP server instead of GitHub,
# and a "new" build — one patch version up — whose signed artifact that
# server serves), then launches the old build so you can click through a
# real update against it. Verifies the Finished-vs-installed race fix
# (.claude/knowledge/desktop-tauri.md) without cutting a canary release.
#
# Needs the same TAURI_SIGNING_PRIVATE_KEY(_PASSWORD) in .env that a normal
# `npm run desktop:build:mac` uses.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-4873}"
TARGET="${TARGET:-aarch64-apple-darwin}"
BUNDLE_DIR="src-tauri/target/$TARGET/release/bundle/macos"
OVERLAY_OLD="src-tauri/local-update-test-old.conf.json"
OVERLAY_NEW="src-tauri/local-update-test-new.conf.json"

CURRENT_VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version")
# ponytail: naive X.Y.Z patch-bump, good enough for a throwaway test payload.
NEW_VERSION="$(node -e "
  const [maj, min, patch] = '$CURRENT_VERSION'.split('.').map(Number);
  console.log(\`\${maj}.\${min}.\${patch + 1}\`);
")"

SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  rm -f "$OVERLAY_OLD" "$OVERLAY_NEW"
  [ -n "${SERVE_DIR:-}" ] && rm -rf "$SERVE_DIR"
}
trap cleanup EXIT

echo "==> current=$CURRENT_VERSION  new(payload)=$NEW_VERSION  port=$PORT  target=$TARGET"

# Distinct identifier so this never touches the real installed app's
# $APPDATA (app.db, logs) — same isolation reasoning as the canary channel.
# It still binds the same hardcoded port 3009 as the real app, so quit any
# running Udaan.app/Udaan Canary.app before launching the test build below.
#
# dangerousInsecureTransportProtocol is required for a plain http:// local
# endpoint: tauri-plugin-updater's release-build config validation rejects
# any non-https endpoint outright (Error::InsecureTransportProtocol) — the
# app fails during plugin init and never opens a window, silently, unless
# run from a terminal that shows stderr. Fine here since this build only
# ever talks to our own throwaway localhost server.
cat > "$OVERLAY_NEW" <<JSON
{ "version": "$NEW_VERSION", "identifier": "com.resumebuilder.localtest", "productName": "Udaan Local Test" }
JSON
cat > "$OVERLAY_OLD" <<JSON
{
  "identifier": "com.resumebuilder.localtest",
  "productName": "Udaan Local Test",
  "plugins": {
    "updater": {
      "endpoints": ["http://127.0.0.1:$PORT/update.json"],
      "dangerousInsecureTransportProtocol": true
    }
  }
}
JSON

SERVE_DIR=$(mktemp -d)

# Wipe any stale bundle output first — otherwise a leftover Udaan.app /
# *.app.tar.gz from an earlier `desktop:build:mac` run makes the `find`
# globs below ambiguous.
rm -rf "$BUNDLE_DIR"

# Build NEW first and grab its signed artifact — OLD's build reuses the same
# $BUNDLE_DIR (same product/target) and would otherwise overwrite it.
echo "==> Building NEW ($NEW_VERSION) — becomes the update payload"
npm run tauri -- build --target "$TARGET" --bundles app --config "$OVERLAY_NEW"

ARCHIVE=$(find "$BUNDLE_DIR" -name "*.app.tar.gz" | head -1)
[ -n "$ARCHIVE" ] || { echo "no .app.tar.gz produced" >&2; exit 1; }
cp "$ARCHIVE" "$SERVE_DIR/app.tar.gz"
SIGNATURE=$(cat "$ARCHIVE.sig")

rm -rf "$BUNDLE_DIR"
echo "==> Building OLD ($CURRENT_VERSION, local update endpoint) — this is what you'll launch"
echo "    (quit any running Udaan.app / Udaan Canary.app first — this shares port 3009)"
npm run tauri -- build --target "$TARGET" --bundles app --config "$OVERLAY_OLD"

APP_PATH=$(find "$BUNDLE_DIR" -maxdepth 1 -name "*.app" | head -1)
[ -n "$APP_PATH" ] || { echo "no .app bundle produced" >&2; exit 1; }

DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq -n \
  --arg version "$NEW_VERSION" \
  --arg notes "Local test payload." \
  --arg pub_date "$DATE" \
  --arg url "http://127.0.0.1:$PORT/app.tar.gz" \
  --arg sig "$SIGNATURE" \
  '{version: $version, notes: $notes, pub_date: $pub_date, platforms: {"darwin-aarch64": {url: $url, signature: $sig}}}' \
  > "$SERVE_DIR/update.json"

echo "==> Serving $SERVE_DIR on http://127.0.0.1:$PORT"
python3 -m http.server "$PORT" --directory "$SERVE_DIR" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 0.5

echo "==> Launching the OLD build (from $APP_PATH, not /Applications — nothing real gets touched)"
open "$APP_PATH"

cat <<EOF

Watch for:
  1. Within ~5s: "Update available" modal (version $NEW_VERSION).
  2. Click "Update now" -> "Downloading" -> "Installing update" — the
     Restart button must NOT appear during "Installing" (that's the bug
     this is testing for).
  3. Once "Update ready" appears, click "Restart now".
  4. After relaunch, confirm:
     /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP_PATH/Contents/Info.plist"
     -> should print $NEW_VERSION

Rust-side updater log (tauri_plugin_log):
  ~/Library/Logs/com.resumebuilder.localtest/rust.log
Client-side updater log:
  ~/Library/Application Support/com.resumebuilder.localtest/logs/client.log

Press Enter when done testing to stop the local server and clean up.
EOF
read -r _
