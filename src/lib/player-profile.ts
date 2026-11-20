import { useSyncExternalStore } from "react";
import { DEFAULT_SKIN_URL } from "@/lib/skin";

export type PlayerProfile = {
  name: string;
  uuid: string;
  skin: string;
  model: "classic" | "slim";
};

const STORAGE_KEY = "jayver.player-profile.v1";
export const DEFAULT_PLAYER_PROFILE: PlayerProfile = {
  name: "Local profile",
  uuid: "",
  skin: DEFAULT_SKIN_URL,
  model: "classic",
};

function readStoredProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAYER_PROFILE;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : DEFAULT_PLAYER_PROFILE.name,
      uuid: typeof parsed.uuid === "string" ? parsed.uuid : "",
      skin: typeof parsed.skin === "string" && parsed.skin && parsed.skin !== "/skins/default.png" ? parsed.skin : DEFAULT_PLAYER_PROFILE.skin,
      model: parsed.model === "slim" ? "slim" : "classic",
    };
  } catch {
    return DEFAULT_PLAYER_PROFILE;
  }
}

let snapshot = readStoredProfile();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    snapshot = readStoredProfile();
    emit();
  });
}

export function getPlayerProfile() {
  return snapshot;
}

export function subscribePlayerProfile(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updatePlayerProfile(
  update: Partial<PlayerProfile> | ((current: PlayerProfile) => PlayerProfile),
) {
  const next = typeof update === "function" ? update(snapshot) : { ...snapshot, ...update };
  snapshot = {
    name: next.name.trim() || DEFAULT_PLAYER_PROFILE.name,
    uuid: next.uuid,
    skin: next.skin || DEFAULT_PLAYER_PROFILE.skin,
    model: next.model === "slim" ? "slim" : "classic",
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Keep the in-memory profile usable if local storage is unavailable.
  }
  emit();
}

export function usePlayerProfile() {
  return useSyncExternalStore(subscribePlayerProfile, getPlayerProfile, () => DEFAULT_PLAYER_PROFILE);
}
