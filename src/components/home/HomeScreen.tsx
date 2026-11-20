import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Home, LibraryBig, Puzzle, Server, Palette, Settings, ChevronDown, Download, UserRound, LogOut, Users } from "lucide-react";
import ObsidianScene from "./ObsidianScene";
import SkinHero from "./SkinHero";
import ProfileExperience from "./ProfileExperience";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [openSwitcherOnProfile, setOpenSwitcherOnProfile] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState("Local profile");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("jayver.player-profile.v1");
      if (stored) {
        const profile = JSON.parse(stored) as { name?: string };
        if (profile.name) setProfileName(profile.name);
      }
    } catch { /* Keep the local profile label if stored data is unavailable. */ }
  }, [profileOpen]);

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
          <div className="home-account-menu-wrap">
            <button className="home-account-trigger" type="button" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(value => !value)}>
              <span className="home-account-avatar"><UserRound size={17} strokeWidth={1.7} /></span>
              <span className="home-account-name">{profileName}</span>
              <ChevronDown size={14} className={`home-account-chevron ${accountMenuOpen ? "is-open" : ""}`} />
            </button>
            {accountMenuOpen && <div className="home-account-dropdown" aria-label="Account actions">
              <div className="home-account-dropdown-heading"><span>PLAYER ACCOUNT</span><strong>{profileName}</strong></div>
              <button type="button"  onClick={() => { setProfileOpen(true); setAccountMenuOpen(false); }}><UserRound size={15} /> View profile</button>
              <button type="button"  onClick={() => { setOpenSwitcherOnProfile(true); setProfileOpen(true); setAccountMenuOpen(false); }}><Users size={15} /> Switch account</button>
              <div className="home-account-dropdown-rule" />
              <button type="button" role="menuitem" disabled title="No Microsoft account is connected"><LogOut size={15} /> Log out <small>No account connected</small></button>
            </div>}
          </div>
        </div>
      </header>

      {profileOpen && <ProfileExperience initialSwitcher={openSwitcherOnProfile} onClose={() => { setProfileOpen(false); setOpenSwitcherOnProfile(false); }} />}

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
          <DownloadAtmosphere />
          <div className="jayver-download-progress-panel">
            {updatePhase !== "error" ? (
              <div className="jayver-loader-wrap" role="img" aria-label={`Downloading update: ${Math.round(percent)} percent`}>
                <div className="jayver-loader-core" style={{ width: 180, height: 180 }}>
                  <span className="jayver-loader-letters" aria-hidden="true">
                    {`${Math.round(percent)}%`.split("").map((letter, index) => (
                      <span key={index} style={{ animationDelay: `${index * 0.1}s` }}>{letter}</span>
                    ))}
                  </span>
                  <span className="jayver-loader-circle" aria-hidden="true" />
                </div>
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
