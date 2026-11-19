# Jayver architecture and developer guide

Jayver is a Tauri 2 desktop application. The frontend is React + TypeScript; the launcher engine is Rust. Keep that boundary strict.

## Quick start

Prerequisites:
- Node.js 22+
- Rust stable toolchain and Cargo
- Tauri platform prerequisites for your OS (WebView2 on Windows; WebKitGTK development packages on Linux; Xcode command-line tools on macOS)

Commands:
```bash
npm install
npm run tauri dev
npm run build
npm run tauri build
```

## Repository map

- src/: React UI, routes, features and typed IPC clients
- src/components/ui/: reusable shadcn-style primitives
- src-tauri/src/commands/: the only frontend IPC boundary
- src-tauri/src/core/: domain types and business concepts
- src-tauri/src/services/: replaceable implementations for Minecraft operations
- src-tauri/src/state.rs: shared application resources
- src-tauri/capabilities/: least-privilege Tauri permissions

## Vibe-coder rules

1. Add a feature in its own folder; don't build the entire launcher in App.tsx.
2. UI components never perform filesystem, network, process or Minecraft operations directly.
3. Add a Rust command only as a thin validated adapter to a service.
4. Keep Minecraft logic in services and domain types, not inside Tauri commands.
5. Give every long operation an operation ID and typed progress events.
6. Keep configuration in documented structs with defaults and validation.
7. Add tests for parsers, version rules, argument construction and path handling.
8. Never commit credentials, Microsoft tokens, signing keys or .env files.
9. Do not grant broad shell or filesystem capabilities to the webview.
10. Keep modules small and document public interfaces with examples.

## Fast-launch design

Fast launch is achieved by doing less work on the critical path:
- Load cached local profile and last-selected instance immediately.
- Fetch remote manifests in the background and use HTTP validators/cache age.
- Reuse shared, hash-verified libraries/assets across instances.
- Resolve only the selected instance's missing artifacts.
- Download independent artifacts concurrently with a bounded semaphore.
- Verify hashes and atomically move completed files into the shared store.
- Provision Java only when the selected version requires it.
- Build the classpath and JVM arguments from the actual version metadata.
- Start the JVM as soon as all required files are verified; don't wait for optional news, skins or mod catalogue requests.

No launcher should skip required integrity checks to appear faster. Cache validated artifacts, not assumptions.

## Planned launch service decomposition

- metadata: Mojang version manifest and version JSON resolution
- rules: OS/architecture/features evaluation for libraries and arguments
- artifacts: content-addressed library, native and asset store
- downloads: bounded concurrency, retries, resume where supported, SHA-1 verification
- java: runtime discovery, major-version matching and managed JRE installation
- loaders: Fabric, Quilt, Forge and NeoForge installation adapters
- planner: pure function producing a launch plan from instance + metadata + account
- process: Java process supervision, stdout/stderr logs, exit state and cancellation
- accounts: Microsoft device/browser auth and secure OS credential storage
- instances: isolated instance metadata, mods, configs, saves and options

## Data layout

Store mutable launcher data in the OS application-data directory, not beside the installed executable. Keep shared immutable artifacts (assets/libraries/runtimes/cache) separate from per-instance mutable data. Provide a portable mode only as an explicit opt-in.

Suggested layout:
```
JayverData/
  jayver.sqlite
  instances/<instance-id>/
    instance.json
    game/
    mods/
    config/
    saves/
  assets/
  libraries/
  runtimes/
  cache/
  logs/
```

## Security

- Keep access tokens in the OS credential manager/keychain.
- Use Tauri capabilities to grant only the permissions a specific window needs.
- Perform privileged filesystem/process operations in Rust with path validation.
- Never pass arbitrary shell commands from the frontend.
- Verify updater signatures and downloaded artifact hashes.
- Preserve user instances on application uninstall unless the user explicitly chooses data removal.

## Current implementation status

This branch establishes the Tauri host, configuration, minimal capabilities, IPC examples, domain contracts, bounded download gate and launch event bus. It does NOT yet implement Minecraft manifest resolution, downloads, Java installation, Microsoft auth, loader installation, process launch, persistence, updater signing or installers. Those are subsequent feature milestones.

## Default player skin

The bundled fallback Minecraft skin texture is stored at `public/skins/default.png` (64×64 RGBA). Frontend features that need a fallback texture should import `DEFAULT_SKIN_URL` from `src/lib/skin.ts`. Replace it with the authenticated player's skin only after that texture has loaded successfully; never treat the fallback as an account identity.
