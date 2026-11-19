import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "@tauri-apps/api/core";

export type UpdateProgress = {
  downloaded: number;
  total: number | null;
};

export function isUpdaterEnabled() {
  return isTauri() && import.meta.env.VITE_JAYVER_UPDATER_ENABLED === "true";
}

export async function checkForJayverUpdate(): Promise<Update | null> {
  if (!isUpdaterEnabled()) return null;
  return check({ timeout: 20_000 });
}

export async function installJayverUpdate(
  update: Update,
  onProgress: (progress: UpdateProgress) => void,
) {
  let downloaded = 0;
  let total: number | null = null;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? null;
      onProgress({ downloaded, total });
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      onProgress({ downloaded, total });
    }
  });

  await relaunch();
}
