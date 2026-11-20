import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Home, LibraryBig, Puzzle, Server, Palette, Settings, ChevronDown, Download } from "lucide-react";
import ObsidianScene from "./ObsidianScene";
import SkinHero from "./SkinHero";
import type { Update } from "@tauri-apps/plugin-updater";
import { downloadJayverUpdate, installDownloadedJayverUpdate } from "@/lib/updates";
import UpdateDialog from "./UpdateDialog";
import DownloadAtmosphere from "./DownloadAtmosphere";
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
            // Commit the screen change first so the progress page is visible
            // before the updater starts any native download work.
            setPercent(0);
            setUpdateError("");
            setUpdatePhase("charging");
            window.setTimeout(() => {
              void downloadJayverUpdate(update, ({ downloaded, total }) => {
                setPercent(total ? Math.min(100, downloaded / total * 100) : 0);
              }).then(async () => {
                setUpdatePhase("installing");
                await installDownloadedJayverUpdate(update);
              }).catch(error => {
                setUpdateError(error instanceof Error ? error.message : "The update could not be downloaded or installed.");
                setUpdatePhase("error");
              });
            }, 0);
          }}
        />
      )}

      {update && updatePhase !== "idle" && (
        <div className="jayver-download-progress" role="status" aria-live="polite">
          <div className="jayver-download-progress-panel">
            {updatePhase !== "error" ? (
              <div className="jayver-progress-engine" role="img" aria-label={`Downloading update: ${Math.round(percent)} percent`}>
                <svg className="jayver-progress-svg" viewBox="0 0 180 180" aria-hidden="true">
                  <defs>
                    <linearGradient id="jayver-progress-metal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="48%" stopColor="#aeb4ba" />
                      <stop offset="100%" stopColor="#f5f6f7" />
                    </linearGradient>
                    <linearGradient id="jayver-progress-edge" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#555b61" stopOpacity=".08" />
                      <stop offset="50%" stopColor="#dce1e5" stopOpacity=".8" />
                      <stop offset="100%" stopColor="#555b61" stopOpacity=".08" />
                    </linearGradient>
                  </defs>
                  <circle className="jayver-progress-hairline" cx="90" cy="90" r="77" />
                  <circle className="jayver-progress-orbit" cx="90" cy="90" r="70" />
                  <circle className="jayver-progress-track" cx="90" cy="90" r="57" />
                  <circle className="jayver-progress-value" cx="90" cy="90" r="57"
                    strokeDasharray="358.14"
                    strokeDashoffset={358.14 * (1 - Math.min(100, Math.max(0, percent)) / 100)} />
                  <circle className="jayver-progress-inner" cx="90" cy="90" r="47" />
                  <circle className="jayver-progress-marker" cx="90" cy="33" r="2.1" />
                </svg>
                <div className="jayver-progress-core">
                  <span className="jayver-progress-number">{Math.round(percent)}<i>%</i></span>
                  <span className="jayver-progress-caption">DOWNLOADING</span>
                </div>
                <span className="jayver-progress-satellite" aria-hidden="true" />
              </div>
            ) : (
              <div className="jayver-download-error-mark" aria-hidden="true">!</div>
            )}
            <strong>
              {updatePhase === "charging" ? "Downloading your update..." :
               updatePhase === "installing" ? "Preparing installation..." :
               "Update couldn't complete"}
            </strong>
            <small>
              {updatePhase === "charging" ? `${Math.round(percent)}% · Secure download` :
               updatePhase === "installing" ? "Download complete · Installing update" :
               updateError}
            </small>
            {updatePhase === "error" && (
              <div className="jayver-download-error-actions">
                <button type="button" onClick={() => {
                  setUpdateError("");
                  setPercent(0);
                  setUpdatePhase("idle");
                }}>Back</button>
                <button type="button" onClick={() => {
                  setUpdateError("");
                  setPercent(0);
                  setUpdatePhase("charging");
                  window.setTimeout(() => {
                    void downloadJayverUpdate(update, ({ downloaded, total }) => {
                      setPercent(total ? Math.min(100, downloaded / total * 100) : 0);
                    }).then(async () => {
                      setUpdatePhase("installing");
                      await installDownloadedJayverUpdate(update);
                    }).catch(error => {
                      setUpdateError(error instanceof Error ? error.message : "The update could not be downloaded or installed.");
                      setUpdatePhase("error");
                    });
                  }, 0);
                }}>Retry update</button>
              </div>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
