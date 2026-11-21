import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const cargoToml = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const template = readFileSync(new URL("../src-tauri/installer/jayver-installer.nsi", import.meta.url), "utf8").replace(/^\\uFEFF/, "");

const expected = {
  cli: "2.12.6",
  tauri: "=2.12.7",
  tauriBuild: "=2.7.6",
};

const failures = [];
if (packageJson.devDependencies?.["@tauri-apps/cli"] !== expected.cli) {
  failures.push(`@tauri-apps/cli must be pinned to ${expected.cli}`);
}
if (!cargoToml.includes('tauri = { version = "=2.12.7"')) {
  failures.push("Rust tauri must be pinned to =2.12.7");
}
if (!cargoToml.includes('tauri-build = { version = "=2.7.6"')) {
  failures.push("tauri-build must be pinned to =2.7.6");
}
if (!/^Unicode true\\r?\\n/m.test(template)) failures.push("NSIS Unicode directive must be the first compiler directive");
if (/^Target\\s*$/m.test(template) || template.includes("{{installer_target}}")) {
  failures.push("Incompatible empty NSIS Target directive detected");
}
if (!template.includes("Jayver template baseline: Tauri v2.12.7 / tauri-bundler v2.10.6.")) {
  failures.push("NSIS template provenance/version marker is missing");
}
for (const define of [
  '!define MUI_BGCOLOR "101518"',
  '!define MUI_TEXTCOLOR "E8ECEF"',
  '!define MUI_INSTFILESPAGE_COLORS "D7E0E6 101518"',
  '!define MUI_INSTALLCOLORS "A9C8D8 101518"',
  '!define MUI_INSTFILESPAGE_PROGRESSBAR "colored"',
]) {
  if (!template.includes(define)) failures.push(`Missing expected Jayver NSIS theme setting: ${define}`);
}

if (failures.length) {
  console.error("NSIS template compatibility check failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("NSIS template compatibility verified: Tauri CLI 2.12.6, Tauri 2.12.7, tauri-build 2.7.6.");
