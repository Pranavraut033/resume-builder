use base64::{engine::general_purpose::STANDARD, Engine};
use keyring::Entry;
use rand::RngCore;

/// Service name used to namespace the keychain entry. Matches the app
/// `identifier` in `tauri.conf.json`.
const SERVICE_NAME: &str = "com.resumebuilder.dev";

/// Fixed account/username under which the single per-install master key is
/// stored. There is only ever one master key per install, so this is a
/// constant rather than something derived per-user.
const ACCOUNT_NAME: &str = "master-key";

/// Number of random bytes to generate for a freshly created master key.
const MASTER_KEY_BYTES: usize = 32;

/// Returns the per-install master key used to derive the AES-256-GCM key
/// that encrypts locally-stored API keys, generating and persisting a new
/// random one in the OS keychain (macOS Keychain, Windows Credential
/// Manager, or Linux Secret Service) on first call.
///
/// The key is returned base64-encoded. Any keychain-access failure (e.g. the
/// user denies access, or no keychain backend is available such as in a
/// headless CI environment) is surfaced as a clear `Err` rather than a panic.
#[tauri::command]
pub fn get_or_create_master_key(_app: tauri::AppHandle) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|error| format!("Failed to access OS keychain: {error}"))?;

    match entry.get_password() {
        Ok(existing_key) => Ok(existing_key),
        Err(keyring::Error::NoEntry) => {
            let mut key_bytes = [0u8; MASTER_KEY_BYTES];
            rand::rng().fill_bytes(&mut key_bytes);
            let encoded_key = STANDARD.encode(key_bytes);

            entry
                .set_password(&encoded_key)
                .map_err(|error| format!("Failed to store master key in OS keychain: {error}"))?;

            Ok(encoded_key)
        }
        Err(error) => Err(format!(
            "Failed to read master key from OS keychain: {error}"
        )),
    }
}
