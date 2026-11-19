# Jayver update channels

Jayver uses Tauri's signed updater. Development updates are distributed from GitHub Releases; production distribution remains separate and will be connected to SAM.

## Development channel

When both signing values are configured, the Windows dev workflow:
1. Assigns a monotonically increasing SemVer patch version (`0.1.<GitHub run number>`).
2. Builds an NSIS installer and Tauri updater archive.
3. Publishes a GitHub pre-release tagged `jayver-dev-<run number>`.
4. Uploads the Tauri-generated `latest.json` manifest and signature files.
5. Copies that manifest to `latest-dev.json` on `main`, which is the app's configured update endpoint.

The manifest-only commit is excluded from re-triggering the installer workflow.

If signing is not configured, the workflow still publishes an ordinary unsigned testing installer, but compiles the app with in-app update checks disabled. It does not publish an update manifest.

## One-time signing setup

Tauri signatures are mandatory for updater installs. Keep the private key secret; never commit it or paste it into source files.

1. On a trusted local machine, generate a key pair:

   ```bash
   npm install
   npm run tauri signer generate -- -w ~/.tauri/jayver-dev.key
   ```

2. Copy the **private key file contents** into the repository Actions secret named `TAURI_SIGNING_PRIVATE_KEY`.
3. Copy the generated **public key** into the repository Actions variable named `TAURI_UPDATER_PUBLIC_KEY`.
4. If the private key is password-protected, add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as an Actions secret. If no password was set, this secret may be omitted.
5. Push to `main`. The workflow detects both values, configures the public key at build time, creates signed updater artifacts, and publishes the dev manifest.

To generate a passwordless key, omit the password option when generating it. Store a secure backup of the private key outside GitHub. Losing it means already-installed clients cannot trust future updates signed with a replacement key.

## Runtime behaviour

- The startup screen checks the dev endpoint after local app/instance initialization.
- A found update is presented to the user; it is never installed without consent.
- Download progress is reported by Tauri, then the app installs and relaunches.
- Update checks are best-effort and never block startup.
- The updater checks only the configured dev channel in these builds.
- Production/SAM should use its own signing key and update endpoint; never reuse the dev key for production.

## Current scope

The current workflow produces Windows NSIS releases. Other OS targets need their own runners/build jobs and matching update manifest entries before cross-platform auto-updates can be enabled.
