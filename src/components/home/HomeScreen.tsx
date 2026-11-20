import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Home, LibraryBig, Puzzle, Server, Palette, Settings, ChevronDown, Download, Box, Gamepad2, ShieldCheck, Sparkles, CircleHelp } from "lucide-react";
import ObsidianScene from "./ObsidianScene";
import SkinHero from "./SkinHero";
import type { Update } from "@tauri-apps/plugin-updater";
import { downloadJayverUpdate, installDownloadedJayverUpdate } from "@/lib/updates";
import UpdateReactor from "./UpdateReactor";
import UpdateDialog from "./UpdateDialog";
import type { MinecraftInstance } from "@/lib/jayver";

interface Props { update: Update | null; onDismissUpdate: () => void; instances: MinecraftInstance[]; }
export default function HomeScreen({update,onDismissUpdate}:Props){
 const [tab,setTab]=useState<"play"|"instances"|"settings">("play");

 const [percent,setPercent]=useState(0);
 const [currentVersion,setCurrentVersion]=useState("—");
 useEffect(()=>{void getVersion().then(setCurrentVersion).catch(()=>setCurrentVersion("Unknown"));},[]);
 const [updateError,setUpdateError]=useState("");
 const [updatePhase,setUpdatePhase]=useState<"idle"|"charging"|"ready"|"installing"|"error">("idle");
 return <main className="home-screen">
  <ObsidianScene/>
  <div className="home-grain" aria-hidden="true"/>
  <header className="home-topbar">
   <a className="home-brand" href="#" aria-label="Jayver home"><img src="/brand/jayver-mark.svg" alt=""/><span>JAYVER</span></a>
   <nav className="home-nav" aria-label="Main navigation">
    <button className={tab==="play"?"active":""} onClick={()=>setTab("play")}><Home size={20} strokeWidth={1.8}/><span>Home</span></button>
    <button className={tab==="instances"?"active":""} onClick={()=>setTab("instances")}><LibraryBig size={20} strokeWidth={1.8}/><span>Library</span></button>
    <button type="button" disabled aria-label="Addons coming soon"><Puzzle size={20} strokeWidth={1.8}/><span>Addons</span></button>
    <button type="button" disabled aria-label="Servers coming soon"><Server size={20} strokeWidth={1.8}/><span>Servers</span></button>
    <button type="button" disabled aria-label="Customization coming soon"><Palette size={20} strokeWidth={1.8}/><span>Customization</span></button>
    <button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}><Settings size={20} strokeWidth={1.8}/><span>Settings</span></button>
   </nav>
   <div className="home-account">
    <span className="home-updater-indicator" title={update ? "Update available" : "Updater ready"}><Download size={21} strokeWidth={1.8}/></span>
    <span className="home-account-divider"/>
    <span className="account-avatar">J</span><span className="home-account-name">Local profile</span><ChevronDown size={14} className="home-account-chevron"/>
   </div>
  </header>
  <section className="home-hero">
   <div className="home-copy">
    <p className="home-eyebrow"><Sparkles size={13}/> THE WORLD, REDEFINED</p>
    <h1>YOUR WORLD.<br/><span>YOUR RULES.</span></h1>
    <p className="home-description">A quieter kind of power. Your Minecraft worlds, instances and play sessions — brought together in one place.</p>
    <div className="home-actions">
     <button className="launch-button" disabled title="Game launching is not implemented yet"><Gamepad2 size={17}/> LAUNCH GAME <span>COMING SOON</span></button>
     <button className="secondary-button" onClick={()=>setTab("instances")}>EXPLORE INSTANCES <span>↗</span></button>
    </div>
    <div className="home-facts">
     <div><span>01</span><strong>ONE PLACE</strong><small>For every instance</small></div>
     <div><span>02</span><strong>YOUR IDENTITY</strong><small>Your skin, your style</small></div>
    </div>
   </div>
   <div className="home-character"><SkinHero/><div className="character-caption"><span>PLAYER MODEL</span><strong>DEFAULT PROFILE</strong></div></div>
   <aside className="home-sidecard">
    {tab==="play"&&<><p className="card-kicker">YOUR SPACE</p><h2>Ready when<br/>you are.</h2><p className="card-copy">Your launcher foundation is online. Instance management and game launching are still being built.</p><div className="card-rule"/><div className="card-row"><span><ShieldCheck size={15}/> DESKTOP RUNTIME</span><strong>CONNECTED</strong></div><div className="card-row"><span><Box size={15}/> INSTANCES</span><strong>NOT CONFIGURED</strong></div></>}
    {tab==="instances"&&<><p className="card-kicker">INSTANCE LIBRARY</p><h2>Your worlds,<br/>in one place.</h2><p className="card-copy">No Minecraft instances have been configured yet. Instance creation and installation are not available in this build.</p><div className="card-rule"/><div className="card-row"><span><Box size={15}/> LOCAL INSTANCES</span><strong>0 FOUND</strong></div></>}
    {tab==="settings"&&<><p className="card-kicker">PREFERENCES</p><h2>Make it<br/>yours.</h2><p className="card-copy">Jayver's appearance is set to the Obsidian monochrome theme. More launcher preferences will arrive with the settings system.</p><div className="card-rule"/><div className="card-row"><span><ShieldCheck size={15}/> THEME</span><strong>OBSIDIAN</strong></div></>}
    <div className="card-bottom"><span>© MAD COMPILE</span><CircleHelp size={15}/></div>
   </aside>
  </section>
  <footer className="home-footer"><span>JAYVER LAUNCHER</span><span>BUILT FOR THE WAY YOU PLAY.</span><span>v0.1.0 · DEVELOPMENT BUILD</span></footer>
  {update&&updatePhase==="idle"&&<UpdateDialog update={update} currentVersion={currentVersion} onLater={()=>{void update.close();onDismissUpdate();}} onInstall={()=>{setPercent(0);setUpdateError("");setUpdatePhase("charging");void downloadJayverUpdate(update,({downloaded,total})=>setPercent(total?Math.min(100,downloaded/total*100):0)).then(()=>setUpdatePhase("ready")).catch(e=>{setUpdatePhase("error");setUpdateError(e instanceof Error?e.message:"Update download failed.");});}}/>}
  {update&&["charging","ready","installing"].includes(updatePhase)&&<div className="update-cinematic"><UpdateReactor progress={percent} ready={updatePhase==="ready"} onWhiteoutComplete={()=>{setUpdatePhase("installing");void installDownloadedJayverUpdate(update).catch(e=>{setUpdatePhase("error");setUpdateError(e instanceof Error?e.message:"Update installation failed.");});}}/>{updatePhase==="installing"&&<div className="update-install-status"><span>JAYVER · UPDATE</span><strong>Preparing installation</strong><small>PACKAGE DOWNLOADED · SIGNATURE CHECKED</small></div>}</div>}
  {update&&updatePhase==="error"&&<UpdateDialog update={update} currentVersion={currentVersion} error={updateError} errorMode onLater={()=>{void update.close();onDismissUpdate();}} onInstall={()=>{setUpdateError("");setUpdatePhase("idle");}}/>}
 </main>;
}
