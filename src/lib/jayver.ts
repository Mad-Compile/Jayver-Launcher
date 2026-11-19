import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  version: string;
  engine: string;
}

export interface MinecraftInstance {
  id: string;
  name: string;
  gameDirectory: string;
  minecraftVersion: string;
  loader: string | null;
}

export const jayver = {
  getAppInfo: () => invoke<AppInfo>("get_app_info"),
  listInstances: () => invoke<MinecraftInstance[]>("list_instances"),
};
