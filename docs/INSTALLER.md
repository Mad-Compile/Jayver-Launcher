# Jayver Windows installer

Jayver uses Tauri 2's custom NSIS template hook so the Windows setup is branded and maintained in-repository.

## Design

- Dark graphite welcome and finish surfaces with high-contrast text.
- Native Windows controls and keyboard navigation.
- Current-user installation by default; no elevation required for the default location.
- Tauri's standard directory selection, progress, shortcut, upgrade, uninstall, and silent-install behavior is retained.
- NSIS details remain available during installation for diagnostics.

## Build

The Windows installer workflow builds the NSIS bundle from `src-tauri/tauri.conf.json` and the template at `src-tauri/windows/installer.nsi`.

The template is based on the upstream Tauri 2 NSIS template. When upgrading Tauri's bundler, compare this file with the upstream template and port upstream installer fixes before release.

## Branding assets

The standalone Mad Compile mark and mascot supplied in the project conversation are the approved brand references. The NSIS wizard currently uses the branded dark theme; bitmap sidebar/header artwork can be added as generated BMP assets in a follow-up without altering the installer flow.
