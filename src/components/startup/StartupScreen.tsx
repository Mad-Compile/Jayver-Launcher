import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import HomeScreen from "@/components/home/HomeScreen";
import { jayver } from "@/lib/jayver";
import type { Update } from "@tauri-apps/plugin-updater";
import { checkForJayverUpdate } from "@/lib/updates";
import type { MinecraftInstance } from "@/lib/jayver";

type StartupState = "starting" | "ready" | "error" | "preview";

export default function StartupScreen() {
  const [state, setState] = useState<StartupState>("starting");
  const [progress, setProgress] = useState(4);
  const [status, setStatus] = useState("Starting Jayver");
  const [error, setError] = useState("");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [startupElapsed, setStartupElapsed] = useState(false);
  const [instances, setInstances] = useState<MinecraftInstance[]>([]);

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
      <div className="startup-ambience" aria-hidden="true" />
      <div className="startup-vignette" aria-hidden="true" />
      <section className="startup-mark" aria-label="Jayver startup">
        <img src="/brand/jayver-mark.svg" alt="Jayver mark" draggable={false} />
        <div className="startup-brand-name">JAYVER</div>
        <div className="startup-brand-caption">A MAD COMPILE PRODUCT</div>
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



      <footer className="startup-copyright">© Mad Compile</footer>
    </main>
  );
}
