# macOS Distribution Guide

This guide explains how to build, code-sign, and distribute Resume Builder as a macOS `.dmg` installer without registering with Apple.

---

## Prerequisites

- macOS 11 or later (for building)
- Xcode Command Line Tools: `xcode-select --install`
- Rust + Cargo: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 20+: `brew install node`

---

## 1. Generate a Self-Signed Code Signing Certificate

Run this once on your Mac. The certificate is stored in your login keychain.
```bash
# 1. Create a private key
openssl genrsa -out resume-builder-key.pem 2048

# 2. Create a self-signed certificate (valid for 10 years)
openssl req -new -x509 -key resume-builder-key.pem \
  -out resume-builder-cert.pem \
  -days 3650 \
  -subj "/CN=Resume Builder Self-Signed/O=Resume Builder/C=US"

# 3. Bundle key + cert into a .p12 file (you'll be prompted for a password)
openssl pkcs12 -export \
  -legacy \
  -inkey resume-builder-key.pem \
  -in resume-builder-cert.pem \
  -out resume-builder.p12 \
  -name "Resume Builder Self-Signed"

# 4. Import the .p12 into your login keychain
security import resume-builder.p12 \
  -k ~/Library/Keychains/login.keychain-db \
  -T /usr/bin/codesign

# 5. Clean up key files (keep resume-builder.p12 for CI/CD)
rm resume-builder-key.pem resume-builder-cert.pem
```

After import, verify the certificate is visible:
```bash
security find-identity -v -p codesigning
# Output should include: "Resume Builder Self-Signed"
```

### Set the signing identity in Tauri config

Edit `src-tauri/tauri.conf.json` and set the `signingIdentity` field:

```json
"macOS": {
  "signingIdentity": "Resume Builder Self-Signed"
}
```

> **Note**: Leave `signingIdentity` as `null` to build without code signing (useful for quick local tests). Set to `"-"` for ad-hoc signing (no identity required but offers no user verification).

---

## 2. Generate Tauri Update Signing Keys

The updater requires a separate Ed25519 key pair to verify update packages.

```bash
# Generate keys (save the output — the private key is shown only once)
npx tauri signer generate -w ~/.tauri/resume-builder-update.key

# This outputs:
#   Private key: (saved to ~/.tauri/resume-builder-update.key)
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
- `.dmg`: `src-tauri/target/release/bundle/dmg/Resume Builder_0.1.0_x64.dmg`
- `.app`: `src-tauri/target/release/bundle/macos/Resume Builder.app`

### Verify code signing

```bash
codesign -vv --deep "src-tauri/target/release/bundle/macos/Resume Builder.app"
# Should show: "satisfies its Designated Requirement"
```

---

## 4. Test the Installer

1. Double-click the `.dmg` to mount it
2. Drag **Resume Builder** → **Applications**
3. On first launch, macOS Gatekeeper will warn: *"Resume Builder cannot be verified"*
4. **To open**: Right-click → **Open** → **Open** in the dialog

This is a one-time step; subsequent launches open normally.

Alternatively, users can run:
```bash
xattr -d com.apple.quarantine /Applications/Resume\ Builder.app
```

---

## 5. GitHub Actions CI/CD Setup

### Required Secrets

Configure these in your GitHub repository under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate file |
| `APPLE_CERTIFICATE_PASSWORD` | Password set during `.p12` export |
| `APPLE_SIGNING_IDENTITY` | Common Name from the certificate (e.g. `Resume Builder Self-Signed`) |
| `KEYCHAIN_PASSWORD` | Any strong random password for the temporary CI keychain |
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/resume-builder-update.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the update signing key (if set) |

### Encode the certificate for GitHub Secrets

```bash
base64 -i resume-builder.p12 | pbcopy
# Paste the clipboard value into the APPLE_CERTIFICATE secret
```

### Workflows

| Workflow | File | Trigger |
|---|---|---|
| Build (PR/main) | `.github/workflows/build-macos.yml` | Push to `main`, pull requests |
| Release | `.github/workflows/release.yml` | Push version tag (e.g. `v1.0.0`) |

### Publishing a Release

```bash
# Bump version in package.json and src-tauri/tauri.conf.json
# Then tag and push:
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically:
1. Build the `.dmg`
2. Sign with your certificate
3. Sign the update package with your Ed25519 key
4. Create a GitHub release with the `.dmg` and `update.json` artifacts
5. Publish the release

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
xattr -d com.apple.quarantine /Applications/Resume\ Builder.app
```

### App launches but shows a blank page / cannot connect

The packaged app starts a local Next server at `127.0.0.1:3008`.
Ensure Node.js is installed on the target machine (`node --version`).

### Updater doesn't detect new versions

- Confirm `update.json` was uploaded to the GitHub release
- Confirm the `pubkey` in `tauri.conf.json` matches your Ed25519 public key
- Check the version in `update.json` is greater than the installed version

### CI build succeeds but `.dmg` is not signed

Verify `APPLE_SIGNING_IDENTITY` secret is set and matches the imported certificate's CN exactly.
