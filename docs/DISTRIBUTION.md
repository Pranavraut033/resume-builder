# macOS Distribution Guide

This guide explains how to build, code-sign, and distribute Udaan as a macOS `.dmg` installer without registering with Apple.

---

## Prerequisites

- macOS 11 or later (for building)
- Xcode Command Line Tools: `xcode-select --install`
- Rust + Cargo: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 22 (pinned in `.nvmrc`): `brew install node` or `nvm install`

---

## 1. Generate a Self-Signed Code Signing Certificate

Run this once on your Mac. The certificate is stored in your login keychain.

```bash
# 1. Create a private key
openssl genrsa -out udaan-key.pem 2048

# 2. Create a self-signed certificate (valid for 10 years)
openssl req -new -x509 -key udaan-key.pem \
  -out udaan-cert.pem \
  -days 3650 \
  -subj "/CN=Udaan Self-Signed/O=Udaan/C=US"

# 3. Bundle key + cert into a .p12 file (you'll be prompted for a password)
openssl pkcs12 -export \
  -legacy \
  -inkey udaan-key.pem \
  -in udaan-cert.pem \
  -out udaan.p12 \
  -name "Udaan Self-Signed"

# 4. Import the .p12 into your login keychain
security import udaan.p12 \
  -k ~/Library/Keychains/login.keychain-db \
  -T /usr/bin/codesign

# 5. Clean up key files (keep udaan.p12 for CI/CD)
rm udaan-key.pem udaan-cert.pem
```

After import, verify the certificate is visible:

```bash
security find-identity -v -p codesigning
# Output should include: "Udaan Self-Signed"
```

### Set the signing identity in Tauri config

Edit `src-tauri/tauri.conf.json` and set the `signingIdentity` field:

```json
"macOS": {
  "signingIdentity": "Udaan Self-Signed"
}
```

> **Note**: `src-tauri/tauri.conf.json` currently ships with `signingIdentity` set to `"-"` (ad-hoc signing — no identity required but offers no user verification), which is what local builds and CI use by default. Leave it as `null` to build without code signing at all (useful for quick local tests), or set it to your own certificate's Common Name as above for a real signing identity.

---

## 2. Generate Tauri Update Signing Keys

The updater requires a separate Ed25519 key pair to verify update packages.

```bash
# Generate keys (save the output — the private key is shown only once)
npx tauri signer generate -w ~/.tauri/udaan-update.key

# This outputs:
#   Private key: (saved to ~/.tauri/udaan-update.key)
#   Public key:  (copy this into tauri.conf.json)
```

Copy the **public key** into `src-tauri/tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  }
}
```

---

## 3. Build Locally

```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Build and stage the bundled Next standalone server files
npm run build
npm run prepare:tauri-server

# Build the app (creates .dmg and .app in src-tauri/target/release/bundle/)
npm run tauri build
```

`npm run prepare:tauri-server` copies:

- `.next/standalone` into `src-tauri/resources/next`
- `.next/static` into `src-tauri/resources/next/.next/static`
- `public` into `src-tauri/resources/next/public`

This is required so the packaged app can run Next.js with Server Actions.

Output locations:

- `.dmg`: `src-tauri/target/release/bundle/dmg/Udaan_<version>_<arch>.dmg` (e.g. `_aarch64` on Apple Silicon, `_x64` on Intel; the release workflow instead builds a universal binary named `_universal.dmg`, see [Section 5](#5-github-actions-cicd-setup))
- `.app`: `src-tauri/target/release/bundle/macos/Udaan.app`

### Verify code signing

```bash
codesign -vv --deep "src-tauri/target/release/bundle/macos/Udaan.app"
# Should show: "satisfies its Designated Requirement"
```

---

## 4. Test the Installer

1. Double-click the `.dmg` to mount it
2. Drag **Udaan** → **Applications**
3. On first launch, macOS Gatekeeper will warn: _"Udaan cannot be verified"_
4. **To open**: Right-click → **Open** → **Open** in the dialog

This is a one-time step; subsequent launches open normally.

Alternatively, users can run:

```bash
xattr -d com.apple.quarantine /Applications/Udaan.app
```

---

## 5. GitHub Actions CI/CD Setup

### Required Secrets

Configure these in your GitHub repository under **Settings → Secrets and variables → Actions**:

| Secret                               | Description                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `APPLE_CERTIFICATE`                  | Base64-encoded `.p12` certificate file                                                                                   |
| `APPLE_CERTIFICATE_PASSWORD`         | Password set during `.p12` export                                                                                        |
| `APPLE_SIGNING_IDENTITY`             | Common Name from the certificate (e.g. `Udaan Self-Signed`) — if unset, both workflows fall back to ad-hoc signing (`-`) |
| `KEYCHAIN_PASSWORD`                  | Any strong random password for the temporary CI keychain                                                                 |
| `TAURI_SIGNING_PRIVATE_KEY`          | Contents of `~/.tauri/udaan-update.key`                                                                                  |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the update signing key (if set)                                                                             |

### Encode the certificate for GitHub Secrets

```bash
base64 -i udaan.p12 | pbcopy
# Paste the clipboard value into the APPLE_CERTIFICATE secret
```

### Workflows

| Workflow                   | File                            | Trigger                                                                                                                                                             |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build (manual smoke build) | `.github/workflows/build.yml`   | Manual (`workflow_dispatch`) — matrix builds macOS, Windows, and Linux                                                                                              |
| CI (type-check + lint)     | `.github/workflows/ci.yml`      | Push, pull requests — no build or signing, just `type-check`/`lint`                                                                                                 |
| Release                    | `.github/workflows/release.yml` | Push of a version tag (e.g. `v1.0.0`), or manual dispatch with a `tag` input                                                                                        |

### Publishing a Release

```bash
# Bump version in package.json and src-tauri/tauri.conf.json
# Then tag and push:
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically:

1. Create a draft GitHub release
2. Build macOS (arm64 + x64 `.dmg`), Windows (`.exe`/NSIS), and Linux (`.AppImage`) installers
3. Sign macOS with your certificate (or ad-hoc, if `APPLE_SIGNING_IDENTITY` isn't set)
4. Sign the update package with your Ed25519 key
5. Upload each platform's installer/`.app.tar.gz` and generated `update.json` to the release
6. Publish the release (undraft it)

---

## 6. Update Mechanism

The app checks for updates 5 seconds after launch by querying:

```
https://github.com/Pranavraut033/resume-builder/releases/latest/download/update.json
```

If a newer version is found, a banner appears in the top-right header allowing the user to update in-place and restart.

---

## Troubleshooting

### Build fails with "code signing failed"

Check that your certificate Common Name exactly matches `signingIdentity` in `tauri.conf.json`.

### "The application is damaged and can't be opened"

This happens when quarantine attributes are set. Run:

```bash
xattr -d com.apple.quarantine /Applications/Udaan.app
```

As of v1.11.0, the app clears `com.apple.quarantine` off its own bundle at launch and again right after `downloadAndInstall()` finishes (`clear_quarantine` in `src-tauri/src/lib.rs`), since the ad-hoc-signed build otherwise inherits and repropagates quarantine to the freshly-extracted update bundle every time. Users on v1.10 or earlier still need one manual reinstall to pick this up; after that, autoupdate is self-healing.

### App launches but shows a blank page / cannot connect

The packaged app starts a local Next server at `127.0.0.1:3009` (distinct from the `3008` used by `npm run dev`), using a Node runtime bundled into the app by `scripts/prepareTauriServer.mjs` — the end user does not need Node.js installed. Check `$APPDATA/logs/server.log` for the actual startup error (see the project's `CLAUDE.md` for the exact path per OS).

### Updater doesn't detect new versions

- Confirm `update.json` was uploaded to the GitHub release
- Confirm the `pubkey` in `tauri.conf.json` matches your Ed25519 public key
- Check the version in `update.json` is greater than the installed version

### CI build succeeds but `.dmg` is not signed

Verify `APPLE_SIGNING_IDENTITY` secret is set and matches the imported certificate's CN exactly.
