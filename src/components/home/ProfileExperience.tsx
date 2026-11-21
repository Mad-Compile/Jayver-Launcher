import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, CircleUserRound, Copy, ImagePlus, Link2, LogOut, MoreHorizontal, Pencil, RotateCcw, Search, ShieldCheck, Users, X } from "lucide-react";
import { IdleAnimation, SkinViewer } from "skinview3d";
import { DEFAULT_SKIN_URL } from "@/lib/skin";
import { DEFAULT_PLAYER_PROFILE, updatePlayerProfile, usePlayerProfile } from "@/lib/player-profile";
import FluidParticlesBackground from "./FluidParticlesBackground";

function formatUuid(uuid: string) {
  const clean = uuid.replace(/-/g, "");
  return /^[a-f0-9]{32}$/i.test(clean)
    ? clean.replace(/^(........)(....)(....)(....)(............)$/, "$1-$2-$3-$4-$5")
    : "";
}

async function resolveMinecraftProfile(name: string) {
  const safeName = name.trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(safeName)) throw new Error("Enter a valid Java Edition username (3–16 letters, numbers or underscores).");
  let response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(safeName)}`);
  if (response.status === 403 || response.status === 404) {
    response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(safeName)}`);
  }
  if (response.status === 204 || response.status === 404) throw new Error("No Minecraft profile was found for that name.");
  if (!response.ok) throw new Error("Mojang's profile service is unavailable. Try again shortly.");
  const identity = await response.json() as { id?: string; name?: string };
  if (!identity.id || !identity.name) throw new Error("The profile response was incomplete.");
  const uuid = formatUuid(identity.id);
  if (!uuid) throw new Error("Minecraft returned an invalid profile ID.");
  let skin = DEFAULT_SKIN_URL;
  let model: "classic" | "slim" = "classic";
  try {
    const profileResponse = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${identity.id}`);
    if (profileResponse.ok) {
      const profile = await profileResponse.json() as { properties?: Array<{ name: string; value: string }> };
      const encoded = profile.properties?.find(property => property.name === "textures")?.value;
      if (encoded) {
        const textures = JSON.parse(atob(encoded)) as { textures?: { SKIN?: { url?: string; metadata?: { model?: string } } } };
        const skinUrl = textures.textures?.SKIN?.url;
        if (skinUrl?.startsWith("http")) skin = skinUrl;
        model = textures.textures?.SKIN?.metadata?.model === "slim" ? "slim" : "classic";
      }
    }
  } catch { /* A valid identity can still use the bundled fallback skin. */ }
  return { name: identity.name, uuid, skin, model } satisfies import("@/lib/player-profile").PlayerProfile;
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
      instance.camera.position.set(0, 0, 40);
      instance.camera.lookAt(0, 0, 0);
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
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        instance.width = width;
        instance.height = height;

        // Keep the avatar optically centered inside the visible card stage.
        // skinview3d's default framing leaves this narrow portrait composition
        // slightly right-heavy, so shift the camera target by 9% of the view width.
        const halfFov = (instance.camera.fov * Math.PI) / 360;
        const viewWidth = 2 * instance.camera.position.z * Math.tan(halfFov) * (width / height);
        const horizontalOffset = viewWidth * 0.09;
        instance.camera.position.x = horizontalOffset;
        instance.controls.target.set(horizontalOffset, 0, 0);
        instance.camera.lookAt(horizontalOffset, 0, 0);
        instance.controls.update();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      resize();
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

  const saveDisplayName = () => {
    const nextName = nameDraft.trim();
    if (!nextName) { setNameDraft(profile.name); setNameEditing(false); return; }
    updatePlayerProfile(current => ({ ...current, name: nextName.slice(0, 16) }));
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
