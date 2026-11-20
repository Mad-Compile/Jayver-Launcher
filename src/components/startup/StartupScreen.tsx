import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import HomeScreen from "@/components/home/HomeScreen";
import { jayver } from "@/lib/jayver";
import type { Update } from "@tauri-apps/plugin-updater";
import { checkForJayverUpdate, installJayverUpdate } from "@/lib/updates";
import type { MinecraftInstance } from "@/lib/jayver";
import SingularityVortexBackground from "@/components/startup/SingularityVortexBackground";

type StartupState = "starting" | "ready" | "error" | "preview";

export default function StartupScreen() {
  const [state, setState] = useState<StartupState>("starting");
  const [progress, setProgress] = useState(4);
  const [status, setStatus] = useState("Starting Jayver");
  const [error, setError] = useState("");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState("");
  const [startupElapsed, setStartupElapsed] = useState(false);
  const [instances, setInstances] = useState<MinecraftInstance[]>([]);
  const [logoActivated, setLogoActivated] = useState(false);

  const initialize = useCallback(async () => {
    setState("starting");
    setProgress(4);
    setError("");
    setStatus("Preparing desktop services");

    if (!isTauri()) {
      setState("preview");
      setProgress(0);
      setStatus("Desktop runtime required");
      return;
    }

    try {
      await jayver.getAppInfo();
      setProgress(48);
      setStatus("Reading local instances");
      const localInstances = await jayver.listInstances();
      setInstances(localInstances);
      setProgress(82);
      setStatus("Checking for updates");
      try {
        const update = await checkForJayverUpdate();
        setAvailableUpdate(update);
      } catch {
        // Update checks are best-effort and must never block startup.
      }
      setProgress(100);
      setStatus("Ready");
      setState("ready");
    } catch (cause) {
      setState("error");
      setStatus("Startup could not complete");
      setError(cause instanceof Error ? cause.message : "An unexpected startup error occurred.");
    }
  }, []);

  useEffect(() => {
    const minimumDisplay = window.setTimeout(() => setStartupElapsed(true), 2600);
    void initialize();
    return () => window.clearTimeout(minimumDisplay);
  }, [initialize]);

  useEffect(() => {
    void getVersion().then(async (version) => {
      try { await getCurrentWindow().setTitle(`Jayver ${version}`); }
      catch (cause) { console.error("Could not set Jayver window title:", cause); }
    }).catch((cause) => console.error("Could not read Jayver version:", cause));
  }, []);

  if (state === "ready" && startupElapsed) {
    return <HomeScreen update={availableUpdate} onDismissUpdate={() => setAvailableUpdate(null)} instances={instances} />;
  }

  return (
    <main className="startup-screen">
      <SingularityVortexBackground intensity={0.9} activated={logoActivated} />
      <div className="startup-vignette" aria-hidden="true" />
      <section className="startup-mark" aria-label="Jayver startup" onPointerEnter={() => setLogoActivated(true)} onPointerLeave={() => setLogoActivated(false)} onFocus={() => setLogoActivated(true)} onBlur={() => setLogoActivated(false)} tabIndex={0}>
        <img src="/brand/jayver-mark.svg" alt="Jayver" draggable={false} />
      </section>

      <section className="startup-progress" aria-live="polite" aria-atomic="true">
        <div className="startup-percent">
          {state === "preview" ? "—" : String(progress).padStart(3, "0")}
          <span>{state === "preview" ? "" : "%"}</span>
        </div>
        <div className="startup-track" role="progressbar" aria-label="Jayver startup progress"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={state === "preview" ? undefined : progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="startup-status">{status}</p>
        {state === "error" && (
          <div className="startup-error">
            <p>{error}</p>
            <button type="button" onClick={() => void initialize()}>Retry</button>
          </div>
        )}
        {state === "preview" && <p className="startup-note">Open the desktop build to run startup checks.</p>}
      </section>

      {availableUpdate && (
        <section className="startup-update" aria-live="polite">
          <p className="startup-update-kicker">UPDATE AVAILABLE</p>
          <h1>Jayver {availableUpdate.version}</h1>
          <p>{availableUpdate.body || "A new version of Jayver is ready to install."}</p>
          {updateError && <p className="startup-update-error" role="alert">{updateError}</p>}
        {installingUpdate ? (
            <div className="startup-update-progress">
              <span style={{ width: `${updateProgress}%` }} />
              <small>{updateProgress > 0 ? `${updateProgress}% downloaded` : "Preparing update"}</small>
            </div>
          ) : (
            <div className="startup-update-actions">
              <button type="button" onClick={() => { void availableUpdate.close(); setAvailableUpdate(null); setUpdateError(""); }}>Later</button>
              <button type="button" onClick={() => {
                setInstallingUpdate(true);
                setUpdateError("");
                void installJayverUpdate(availableUpdate, ({ downloaded, total }) => {
                  setUpdateProgress(total ? Math.min(100, Math.round(downloaded / total * 100)) : 0);
                }).catch((cause) => {
                  setInstallingUpdate(false);
                  setUpdateError(cause instanceof Error ? cause.message : "Update installation failed.");
                });
              }}>Install & restart</button>
            </div>
          )}
        </section>
      )}

      <footer className="startup-copyright">© Mad Compile</footer>
    </main>
  );
}
