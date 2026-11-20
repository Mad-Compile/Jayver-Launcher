import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Home, LibraryBig, Puzzle, Server, Palette, Settings, ChevronDown, Download } from "lucide-react";
import ObsidianScene from "./ObsidianScene";
import SkinHero from "./SkinHero";
import type { Update } from "@tauri-apps/plugin-updater";
import { downloadJayverUpdate, installDownloadedJayverUpdate } from "@/lib/updates";
import UpdateDialog from "./UpdateDialog";
import type { MinecraftInstance } from "@/lib/jayver";

interface Props { update: Update | null; onDismissUpdate: () => void; instances: MinecraftInstance[]; }

export default function HomeScreen({ update, onDismissUpdate }: Props) {
  const [currentVersion, setCurrentVersion] = useState("—");
  const [percent, setPercent] = useState(0);
  const [updateError, setUpdateError] = useState("");
  const [updatePhase, setUpdatePhase] = useState<"idle" | "charging" | "installing" | "error">("idle");

  useEffect(() => {
    void getVersion().then(setCurrentVersion).catch(() => setCurrentVersion("Unknown"));
  }, []);

  return (
    <main className="home-screen">
      <ObsidianScene />
      <div className="home-grain" aria-hidden="true" />
      <header className="home-topbar">
        <a className="home-brand" href="#" aria-label="Jayver home">
          <img src="/brand/jayver-mark.svg" alt="" />
          <span>JAYVER</span>
        </a>
        <nav className="home-nav" aria-label="Main navigation">
          <button className="active" type="button" aria-current="page"><Home size={20} strokeWidth={1.8} /><span>Home</span></button>
          <button type="button"><LibraryBig size={20} strokeWidth={1.8} /><span>Library</span></button>
          <button type="button" disabled aria-label="Addons coming soon"><Puzzle size={20} strokeWidth={1.8} /><span>Addons</span></button>
          <button type="button" disabled aria-label="Servers coming soon"><Server size={20} strokeWidth={1.8} /><span>Servers</span></button>
          <button type="button" disabled aria-label="Customization coming soon"><Palette size={20} strokeWidth={1.8} /><span>Customization</span></button>
          <button type="button"><Settings size={20} strokeWidth={1.8} /><span>Settings</span></button>
        </nav>
        <div className="home-account">
          <span className="home-updater-indicator" title={update ? "Update available" : "Updater ready"}><Download size={21} strokeWidth={1.8} /></span>
          <span className="home-account-divider" />
          <span className="account-avatar">J</span>
          <span className="home-account-name">Local profile</span>
          <ChevronDown size={14} className="home-account-chevron" />
        </div>
      </header>

      <section className="home-hero home-skin-stage" aria-label="Player skin">
        <div className="home-character"><SkinHero /></div>
      </section>

      {update && updatePhase === "idle" && (
        <UpdateDialog
          update={update}
          currentVersion={currentVersion}
          onLater={() => { void update.close(); onDismissUpdate(); }}
          onInstall={() => {
            setPercent(0);
            setUpdateError("");
            setUpdatePhase("charging");
            void downloadJayverUpdate(update, ({ downloaded, total }) => setPercent(total ? Math.min(100, downloaded / total * 100) : 0))
              .then(() => {
                setUpdatePhase("installing");
                void installDownloadedJayverUpdate(update).catch(error => {
                  setUpdatePhase("error");
                  setUpdateError(error instanceof Error ? error.message : "Update installation failed.");
                });
              })
              .catch(error => {
                setUpdatePhase("error");
                setUpdateError(error instanceof Error ? error.message : "Update download failed.");
              });
          }}
        />
      )}

      {update && (updatePhase === "charging" || updatePhase === "installing") && (
        <div className="jayver-download-progress" role="status" aria-live="polite">
          <div className="jayver-download-progress-panel">
            <span className="jayver-download-kicker">JAYVER · UPDATE</span>
            <strong>{updatePhase === "charging" ? "Downloading update" : "Preparing installation"}</strong>
            {updatePhase === "charging" ? (
              <>
                <div className="jayver-download-track"><span style={{ width: `${percent}%` }} /></div>
                <small>{Math.round(percent)}% · Downloading signed package</small>
              </>
            ) : <small>Download complete · Installing update</small>}
          </div>
        </div>
      )}

      {update && updatePhase === "error" && (
        <UpdateDialog
          update={update}
          currentVersion={currentVersion}
          error={updateError}
          errorMode
          onLater={() => { void update.close(); onDismissUpdate(); }}
          onInstall={() => { setUpdateError(""); setUpdatePhase("idle"); }}
        />
      )}
    </main>
  );
}
