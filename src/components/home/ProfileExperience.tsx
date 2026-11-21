import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, ChevronDown, ChevronLeft, CircleUserRound, Copy, ImagePlus, Link2, LogOut, MoreHorizontal, Pencil, RotateCcw, Search, ShieldCheck, Users, X } from "lucide-react";
import { IdleAnimation, SkinViewer } from "skinview3d";
import { DEFAULT_SKIN_URL } from "@/lib/skin";
import { DEFAULT_PLAYER_PROFILE, getPlayerProfile, updatePlayerProfile, usePlayerProfile } from "@/lib/player-profile";
import FluidParticlesBackground from "./FluidParticlesBackground";

function formatUuid(uuid: string) {
  const clean = uuid.replace(/-/g, "");
  return /^[a-f0-9]{32}$/i.test(clean)
    ? clean.replace(/^(........)(....)(....)(....)(............)$/, "$1-$2-$3-$4-$5")
    : "";
}

type MinecraftProfileLookup = {
  name: string;
  uuid: string;
  skin: string | null;
  model: "classic" | "slim";
};

async function resolveMinecraftProfile(name: string): Promise<import("@/lib/player-profile").PlayerProfile> {
  const resolved = await invoke<MinecraftProfileLookup>("lookup_minecraft_profile", { username: name.trim() });
  return {
    name: resolved.name,
    uuid: formatUuid(resolved.uuid),
    skin: resolved.skin || DEFAULT_SKIN_URL,
    model: resolved.model === "slim" ? "slim" : "classic",
  };
}

function SkinStage({ skin, model }: { skin: string; model: "classic" | "slim" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<SkinViewer | null>(null);
  const [skinError, setSkinError] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let active = true;
    let instance: SkinViewer | null = null;
    try {
      instance = new SkinViewer({ canvas: element, width: 520, height: 620, skin, model: model === "slim" ? "slim" : "default", zoom: 0.86, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), enableControls: true });
      viewer.current = instance;
      instance.background = null;
      // Keep skinview3d's own zoom-derived camera distance. Overriding Z here
      // bypasses its zoom calculation and makes the avatar unexpectedly large.
      instance.playerObject.position.set(0, 0, 0);
      instance.autoRotate = true;
      instance.autoRotateSpeed = 0.34;
      instance.globalLight.intensity = 2.1;
      instance.cameraLight.intensity = 0.48;
      instance.animation = new IdleAnimation();
      instance.loadSkin(skin, { model: model === "slim" ? "slim" : "default" }).catch(() => { if (active) setSkinError(true); });
      const resize = () => {
        if (!instance) return;
        const rect = element.getBoundingClientRect();
        instance.width = Math.max(1, Math.floor(rect.width));
        instance.height = Math.max(1, Math.floor(rect.height));
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      resize();

      // Apply a small horizontal camera translation only. Move camera and
      // orbit target together so distance/zoom and character scale stay intact.
      const stageRect = element.getBoundingClientRect();
      const aspect = Math.max(1, stageRect.width) / Math.max(1, stageRect.height);
      const distance = instance.camera.position.distanceTo(instance.controls.target);
      const halfFov = (instance.camera.fov * Math.PI) / 360;
      const visibleWidth = 2 * distance * Math.tan(halfFov) * aspect;
      const horizontalOffset = visibleWidth * 0.035;
      instance.camera.position.x += horizontalOffset;
      instance.controls.target.x += horizontalOffset;
      instance.controls.update();
      return () => { active = false; observer.disconnect(); instance?.dispose(); viewer.current = null; };
    } catch {
      instance?.dispose();
      return;
    }
  }, []);

  useEffect(() => {
    const instance = viewer.current;
    if (!instance) return;
    setSkinError(false);
    instance.loadSkin(skin, { model: model === "slim" ? "slim" : "default" }).catch(() => setSkinError(true));
  }, [skin, model]);

  return <div className="jayver-profile-skin-stage">
    <FluidParticlesBackground particleCount={560} />
    <canvas ref={canvas} className="jayver-profile-skin-canvas" aria-label="Rotating 3D Minecraft character preview" />
    {skinError && <span className="jayver-profile-skin-error">Skin preview unavailable</span>}
    <span className="jayver-profile-skin-floor" aria-hidden="true" />
  </div>;
}

export default function ProfileExperience({ onClose, initialSwitcher = false }: { onClose: () => void; initialSwitcher?: boolean }) {
  const profile = usePlayerProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(initialSwitcher);
  const [nameInput, setNameInput] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Resolve the displayed Java username automatically when the profile has
  // no valid UUID. Debouncing avoids duplicate requests while names are edited.
  useEffect(() => {
    const username = profile.name.trim();
    if (formatUuid(profile.uuid) || !/^[A-Za-z0-9_]{3,16}$/.test(username)) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const resolved = await resolveMinecraftProfile(username);
        if (cancelled) return;
        const current = getPlayerProfile();
        if (current.name !== username || formatUuid(current.uuid)) return;
        updatePlayerProfile(latest => ({
          ...latest,
          name: resolved.name,
          uuid: resolved.uuid,
          skin: latest.skin === DEFAULT_SKIN_URL && resolved.skin !== DEFAULT_SKIN_URL ? resolved.skin : latest.skin,
          model: latest.skin === DEFAULT_SKIN_URL && resolved.skin !== DEFAULT_SKIN_URL ? resolved.model : latest.model,
        }));
      } catch {
        // An unknown/offline/custom display name remains a local profile.
        // The explicit Find action below reports lookup failures to the user.
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profile.name, profile.uuid]);

  const saveDisplayName = () => {
    const nextName = nameDraft.trim();
    if (!nextName) { setNameDraft(profile.name); setNameEditing(false); return; }
    const identityChanged = profile.name.toLowerCase() !== nextName.slice(0, 16).toLowerCase();
    updatePlayerProfile(current => ({
      ...current,
      name: nextName.slice(0, 16),
      uuid: identityChanged ? "" : current.uuid,
    }));
    setNameEditing(false);
  };

  const updateSkin = async (source: string, model: "classic" | "slim" = profile.model) => {
    setBusy(true); setMessage(""); setMessageError(false);
    try {
      const probe = new Image();
      await new Promise<void>((resolve, reject) => {
        probe.onload = () => resolve();
        probe.onerror = () => reject(new Error("That image could not be loaded as a Minecraft skin."));
        probe.src = source;
      });
      if (probe.width !== 64 || (probe.height !== 64 && probe.height !== 32)) throw new Error("Use a standard Minecraft skin PNG (64×64 or legacy 64×32).");
      updatePlayerProfile(current => ({ ...current, skin: source, model }));
      setMessage("Skin preview updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load that skin.");
      setMessageError(true);
    } finally { setBusy(false); }
  };

  const onUpload = async (file?: File) => {
    if (!file) return;
    if (file.type !== "image/png") { setMessage("Choose a PNG skin file."); setMessageError(true); return; }
    if (file.size > 2_000_000) { setMessage("Skin PNG must be smaller than 2 MB."); setMessageError(true); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") void updateSkin(reader.result); };
    reader.onerror = () => { setMessage("Could not read that file."); setMessageError(true); };
    reader.readAsDataURL(file);
  };

  const lookupName = async () => {
    setBusy(true); setMessage(""); setMessageError(false);
    try {
      const next = await resolveMinecraftProfile(nameInput);
      updatePlayerProfile(next);
      setMessage(`Loaded ${next.name}'s Minecraft profile.`);
      setNameInput("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile lookup failed.");
      setMessageError(true);
    } finally { setBusy(false); }
  };

  const useSkinUrl = () => {
    const value = urlInput.trim();
    if (!/^https:\/\//i.test(value)) { setMessage("Use a direct HTTPS link to a PNG skin."); setMessageError(true); return; }
    void updateSkin(value);
  };

  const copyUuid = async () => {
    if (!profile.uuid) return;
    try { await navigator.clipboard.writeText(profile.uuid); setMessage("UUID copied."); setMessageError(false); }
    catch { setMessage("Clipboard access is unavailable."); setMessageError(true); }
  };

  const resetLocal = () => {
    updatePlayerProfile(DEFAULT_PLAYER_PROFILE);
    setEditing(false); setMenuOpen(false); setMessage("Local profile reset.");
  };

  return <div className="jayver-profile-overlay" role="dialog" aria-modal="true" aria-label="Player profile">
    <div className="jayver-profile-shell">
      <header className="jayver-profile-header">
        <button className="jayver-profile-back" onClick={onClose} type="button"><ChevronLeft size={16} /> Back to launcher</button>
        <span className="jayver-profile-header-label">Player profile</span>
        <button className="jayver-profile-exit" onClick={onClose} type="button" aria-label="Close profile"><X size={17} /></button>
      </header>

      <div className={`jayver-profile-layout ${editing ? "is-editing" : ""}`}>
        <section className="jayver-player-card">
          <div className="jayver-player-card-edge" aria-hidden="true" />
          <div className="jayver-player-card-top">
            <div className="jayver-profile-more-wrap">
              <button className="jayver-profile-more" type="button" aria-label="Profile options" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><MoreHorizontal size={21} /></button>
              {menuOpen && <div className="jayver-profile-menu">
                <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}><ImagePlus size={15} /> Change skin</button>
                <button type="button" onClick={() => { setSwitcherOpen(true); setMenuOpen(false); }}><Users size={15} /> Switch account</button>
                <button type="button" onClick={() => { void copyUuid(); setMenuOpen(false); }} disabled={!profile.uuid}><Copy size={15} /> Copy UUID</button>
                <div className="jayver-profile-menu-rule" />
                <button type="button" onClick={() => { resetLocal(); }}><LogOut size={15} /> Reset local profile</button>
              </div>}
            </div>
          </div>
          <SkinStage skin={profile.skin} model={profile.model} />
          <div className="jayver-player-card-info">
            <div className="jayver-player-name-row">
              {nameEditing ? <input className="jayver-player-name-input" autoFocus aria-label="Gamertag" value={nameDraft} maxLength={16} onChange={event => setNameDraft(event.target.value)} onBlur={saveDisplayName} onKeyDown={event => { if (event.key === "Enter") saveDisplayName(); if (event.key === "Escape") { setNameDraft(profile.name); setNameEditing(false); } }} /> : <button className="jayver-player-name-edit" type="button" onClick={() => { setNameDraft(profile.name); setNameEditing(true); }} aria-label="Change gamertag"><h1>{profile.name}</h1><Pencil size={14} /></button>}
              {profile.uuid && <span className="jayver-profile-verified" title="Resolved Minecraft profile"><ShieldCheck size={17} /></span>}
            </div>
            <div className="jayver-player-uuid-label">Minecraft UUID</div>
            <button className="jayver-player-uuid" type="button" onClick={() => void copyUuid()} disabled={!profile.uuid}>
              <span>{profile.uuid || "Not linked to a Minecraft account"}</span>
              {profile.uuid && <Copy size={13} />}
            </button>
            <div className="jayver-player-card-footer"><span>Java Edition profile</span><span>{profile.model === "slim" ? "Slim model" : "Classic model"}</span></div>
          </div>
        </section>

        <section className={`jayver-profile-editor ${editing ? "is-visible" : ""}`} aria-hidden={!editing}>
          <div className="jayver-profile-editor-heading">
            <div><span className="jayver-profile-eyebrow">APPEARANCE</span><h2>Change skin</h2><p>Choose the look your character wears in Jayver.</p></div>
            <button type="button" className="jayver-profile-editor-close" onClick={() => { setEditing(false); setMessage(""); }} aria-label="Close skin editor"><X size={17} /></button>
          </div>
          <div className="jayver-profile-editor-options">
            <button type="button" className="jayver-skin-option" onClick={() => fileInput.current?.click()} disabled={busy}>
              <span className="jayver-skin-option-icon"><ImagePlus size={18} /></span><span><strong>Upload skin</strong><small>PNG · 64×64 · up to 2 MB</small></span><ChevronDown size={15} className="jayver-skin-option-arrow" />
            </button>
            <input ref={fileInput} type="file" accept="image/png,.png" hidden onChange={event => { void onUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            <div className="jayver-profile-field"><label htmlFor="jayver-skin-url">SKIN IMAGE URL</label><div className="jayver-profile-input-row"><Link2 size={15} /><input id="jayver-skin-url" value={urlInput} onChange={event => setUrlInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") useSkinUrl(); }} placeholder="https://…/skin.png" /><button type="button" onClick={useSkinUrl} disabled={busy || !urlInput.trim()}>Load</button></div></div>
            <div className="jayver-profile-field"><label htmlFor="jayver-mojang-name">MOJANG PLAYER NAME</label><div className="jayver-profile-input-row"><Search size={15} /><input id="jayver-mojang-name" value={nameInput} onChange={event => setNameInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void lookupName(); }} placeholder="Minecraft username" maxLength={16} /><button type="button" onClick={() => void lookupName()} disabled={busy || !nameInput.trim()}>Find</button></div><small>Looks up the current Java Edition name, UUID and public skin.</small></div>
            <div className="jayver-profile-field"><label>SKIN MODEL</label><div className="jayver-skin-model"><button type="button" className={profile.model === "classic" ? "active" : ""} onClick={() => updatePlayerProfile(current => ({ ...current, model: "classic" }))}>Classic</button><button type="button" className={profile.model === "slim" ? "active" : ""} onClick={() => updatePlayerProfile(current => ({ ...current, model: "slim" }))}>Slim</button></div></div>
            <button type="button" className="jayver-skin-reset" onClick={() => { updatePlayerProfile(current => ({ ...current, skin: DEFAULT_SKIN_URL, model: "classic" })); setMessage("Bundled Jayver skin restored."); setMessageError(false); }}><RotateCcw size={14} /> Restore bundled default skin</button>
            {busy && <div className="jayver-profile-status"><span /> Loading skin…</div>}
            {message && <p className={`jayver-profile-message ${messageError ? "is-error" : ""}`}>{message}</p>}
          </div>
          <div className="jayver-profile-editor-foot"><span>SKIN CHANGES ARE STORED ON THIS DEVICE</span><Check size={14} /></div>
        </section>

        {switcherOpen && <div className="jayver-switcher-scrim" onClick={() => setSwitcherOpen(false)}>
          <section className="jayver-switcher-panel" onClick={event => event.stopPropagation()}>
            <div className="jayver-switcher-heading"><div><span className="jayver-profile-eyebrow">ACCOUNTS</span><h2>Switch account</h2></div><button type="button" onClick={() => setSwitcherOpen(false)} aria-label="Close account switcher"><X size={17} /></button></div>
            <div className="jayver-switcher-current"><CircleUserRound size={22} /><span><strong>{profile.name}</strong><small>Current local profile</small></span><Check size={16} /></div>
            <p className="jayver-switcher-note">Microsoft sign-in and authenticated account switching are not connected in this build. You can still preview skins and resolve public Minecraft profiles by name.</p>
            <button className="jayver-switcher-done" type="button" onClick={() => setSwitcherOpen(false)}>Done</button>
          </section>
        </div>}
      </div>
    </div>
  </div>;
}
