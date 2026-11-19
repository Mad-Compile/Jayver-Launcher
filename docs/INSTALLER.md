# Jayver Windows installer

## Stable baseline

Jayver currently uses Tauri 2's maintained built-in NSIS template. The project keeps only supported NSIS configuration in `src-tauri/tauri.conf.json`:

- Per-user installation by default
- English installer language
- LZMA compression
- Tauri-managed install, upgrade, shortcut, uninstall, and silent-install behavior

A custom NSIS template is intentionally not enabled until it can be pinned to and validated against the exact Tauri CLI/bundler version used by the build. Tauri's template is a Handlebars input, not a standalone NSIS script; compiling it directly with `makensis` is not a valid template test.

## Build verification

The authoritative check is the Windows workflow running:

```powershell
npm run tauri build -- --bundles nsis
```

A successful frontend build or Rust check alone does not prove that the Windows installer bundles successfully.

## Custom branding follow-up

The Mad Compile logo and mascot are approved brand references. They should be integrated as NSIS bitmap assets only after the stable baseline builds. Any future custom template must be copied from the exact upstream Tauri version resolved by the build, minimally patched, and validated by building the actual NSIS bundle on Windows.
