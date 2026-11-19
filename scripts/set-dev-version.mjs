import { readFile, writeFile } from "node:fs/promises";

const runNumber = process.argv[2];
if (!/^\d+$/.test(runNumber ?? "")) {
  throw new Error("Pass the GitHub Actions run number as the only argument.");
}

const version = `0.1.${runNumber}`;
const configPath = "src-tauri/tauri.conf.json";
const cargoPath = "src-tauri/Cargo.toml";
const packagePath = "package.json";

const config = JSON.parse(await readFile(configPath, "utf8"));
config.version = version;
config.bundle.createUpdaterArtifacts = false;

const publicKey = process.env.TAURI_UPDATER_PUBLIC_KEY?.trim();
if (publicKey) {
  config.plugins ??= {};
  config.plugins.updater ??= {};
  config.plugins.updater.pubkey = publicKey;
  config.bundle.createUpdaterArtifacts = true;
}
await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");

let cargo = await readFile(cargoPath, "utf8");
cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${version}"`);
await writeFile(cargoPath, cargo);

const pkg = JSON.parse(await readFile(packagePath, "utf8"));
pkg.version = version;
await writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Building Jayver ${version}; updater signing ${publicKey ? "enabled" : "disabled"}.`);
