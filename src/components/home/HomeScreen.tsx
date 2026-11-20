import { useMemo, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect } from "react";
import { Home, LibraryBig, Puzzle, Server, Palette, Settings, Download, ChevronDown, Box, Gamepad2, Settings2, ShieldCheck, Clock3, Folder, HardDrive, AlertCircle } from "lucide-react";
import SkinHero from "./SkinHero";
import type { Update } from "@tauri-apps/plugin-updater";
import type { MinecraftInstance } from "@/lib/jayver";
import { downloadJayverUpdate, installDownloadedJayverUpdate } from "@/lib/updates";
import UpdateReactor from "./UpdateReactor";
import UpdateDialog from "./UpdateDialog";

interface Props { update: Update | null; onDismissUpdate: () => void; instances: MinecraftInstance[]; }
type Tab = "play" | "instances" | "settings";

export default function HomeScreen({update,onDismissUpdate,instances}:Props){
 const [tab,setTab]=useState<Tab>("play");
 const [selectedId,setSelectedId]=useState(instances[0]?.id ?? "");
 const selected=useMemo(()=>instances.find(item=>item.id===selectedId)??instances[0]??null,[instances,selectedId]);
 const [percent,setPercent]=useState(0);
 const [currentVersion,setCurrentVersion]=useState("—");
 useEffect(()=>{void getVersion().then(setCurrentVersion).catch(()=>setCurrentVersion("Unknown"));},[]);
 const [updateError,setUpdateError]=useState("");
 const [updatePhase,setUpdatePhase]=useState<"idle"|"charging"|"ready"|"installing"|"error">("idle");
 const [instanceMenu,setInstanceMenu]=useState(false);
 return <main className="home-screen home-workspace">
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
  <section className="workspace-main"><div className="workspace-content">
   {tab==="play"&&<>
    <div className="workspace-heading"><div><span className="section-index">01 / PLAY</span><h1>Game session</h1></div><span className="runtime-state"><i/> Desktop runtime connected</span></div>
    <div className="selected-instance">
     <div className="instance-icon"><Box size={23}/></div>
     <div className="instance-details"><span className="field-label">SELECTED INSTANCE</span><h2>{selected?.name ?? "No instance selected"}</h2><div className="instance-meta"><span>{selected ? "Minecraft "+selected.minecraftVersion : "Create an instance to get started"}</span>{selected?.loader&&<><b>·</b><span>{selected.loader}</span></>}</div></div>
     {instances.length>1&&<div className="instance-picker-wrap"><button className="instance-picker" onClick={()=>setInstanceMenu(v=>!v)} aria-expanded={instanceMenu}>Switch instance <ChevronDown size={15}/></button>{instanceMenu&&<div className="instance-menu">{instances.map(item=><button key={item.id} onClick={()=>{setSelectedId(item.id);setInstanceMenu(false);}}>{item.name}<small>{"Minecraft "+item.minecraftVersion+(item.loader?" · "+item.loader:"")}</small></button>)}</div>}</div>}
    </div>
    <div className="play-workspace">
     <div className="character-stage"><div className="stage-topline"><span>PLAYER PREVIEW</span><span>DRAG TO ROTATE</span></div><SkinHero/><div className="stage-floor"/><div className="stage-caption"><span>DEFAULT SKIN</span><span>LOCAL PREVIEW</span></div></div>
     <aside className="session-panel"><div className="session-panel-head"><span className="field-label">INSTANCE DETAILS</span><span className={selected?"state-pill":"state-pill muted"}>{selected?"CONFIGURED":"EMPTY"}</span></div>
      <dl className="instance-facts">
       <div><dt><Box size={14}/> Game version</dt><dd>{selected?.minecraftVersion??"—"}</dd></div>
       <div><dt><HardDrive size={14}/> Loader</dt><dd>{selected?.loader??"Not set"}</dd></div>
       <div><dt><Folder size={14}/> Game directory</dt><dd title={selected?.gameDirectory}>{selected?.gameDirectory??"No directory"}</dd></div>
       <div><dt><Clock3 size={14}/> Last played</dt><dd>Not recorded</dd></div>
      </dl>
      <div className="play-controls"><button className="launch-button" disabled title="Game launching is not available in this build"><Gamepad2 size={18}/> PLAY <span>UNAVAILABLE</span></button><button className="configure-button" onClick={()=>setTab("instances")} aria-label="Manage instances"><Settings2 size={19}/></button></div>
      <p className="launch-note"><AlertCircle size={13}/> Game installation and launching are not available yet.</p>
     </aside>
    </div>
   </>}
   {tab==="instances"&&<>
    <div className="workspace-heading"><div><span className="section-index">02 / LIBRARY</span><h1>Instances</h1></div><span className="runtime-state">{instances.length} configured</span></div>
    {instances.length?<div className="instance-list">{instances.map(item=><button className="instance-list-row" key={item.id} onClick={()=>{setSelectedId(item.id);setTab("play");}}><span className="instance-icon small"><Box size={18}/></span><span className="instance-list-name"><strong>{item.name}</strong><small>{"Minecraft "+item.minecraftVersion+(item.loader?" · "+item.loader:"")}</small></span><span className="instance-list-path">{item.gameDirectory}</span><ChevronDown size={16}/></button>)}</div>:<div className="empty-library"><Box size={26}/><h2>No instances yet</h2><p>Your Minecraft instances will appear here once instance creation and installation are available.</p><span>INSTANCE MANAGEMENT · IN DEVELOPMENT</span></div>}
   </>}
   {tab==="settings"&&<>
    <div className="workspace-heading"><div><span className="section-index">03 / PREFERENCES</span><h1>Settings</h1></div></div>
    <div className="settings-list"><div><span><strong>Appearance</strong><small>Interface colour scheme</small></span><b>Obsidian · Monochrome</b></div><div><span><strong>Desktop runtime</strong><small>Native application environment</small></span><b className="settings-connected"><i/> Connected</b></div><div><span><strong>Application updates</strong><small>Signed updates are checked at startup</small></span><b>Automatic check</b></div></div>
   </>}
  </div></section>
  <section className="workspace-dashboard" aria-label="Launcher dashboard">
   <div className="dashboard-playtime"><div className="dashboard-title"><span>PLAYTIME</span><small>SESSION HISTORY</small></div><div className="playtime-value">—<small>hours</small></div><p>Playtime tracking is not available yet.</p></div>
   <div className="dashboard-recent"><div className="dashboard-title"><span>RECENT INSTANCES</span><small>{instances.length} TOTAL</small></div>
    {instances.length?<div className="recent-instance-list">{instances.slice(0,3).map(item=><button key={item.id} onClick={()=>{setSelectedId(item.id);setTab("play");}}><span className="recent-icon"><Box size={16}/></span><span><strong>{item.name}</strong><small>{"Minecraft "+item.minecraftVersion+(item.loader?" · "+item.loader:"")}</small></span><ChevronDown size={14}/></button>)}</div>:<div className="recent-empty"><span>No recent instances</span><small>Configured game profiles will appear here.</small></div>}
   </div>
   <div className="dashboard-runtime"><div className="dashboard-title"><span>LAUNCHER</span><small>STATUS</small></div><div className="runtime-line"><ShieldCheck size={15}/><span>Desktop runtime</span><b>Connected</b></div><div className="runtime-line"><Download size={15}/><span>Updater</span><b>Ready</b></div></div>
  </section>
  <footer className="home-footer"><span>© MAD COMPILE</span><span>JAYVER LAUNCHER</span><span>DEVELOPMENT BUILD</span></footer>
  {update&&updatePhase==="idle"&&<UpdateDialog update={update} currentVersion={currentVersion} onLater={()=>{void update.close();onDismissUpdate();}} onInstall={()=>{setPercent(0);setUpdateError("");setUpdatePhase("charging");void downloadJayverUpdate(update,({downloaded,total})=>setPercent(total?Math.min(100,downloaded/total*100):0)).then(()=>setUpdatePhase("ready")).catch(e=>{setUpdatePhase("error");setUpdateError(e instanceof Error?e.message:"Update download failed.");});}}/>}
  {update&&["charging","ready","installing"].includes(updatePhase)&&<div className="update-cinematic"><UpdateReactor progress={percent} ready={updatePhase==="ready"} onWhiteoutComplete={()=>{setUpdatePhase("installing");void installDownloadedJayverUpdate(update).catch(e=>{setUpdatePhase("error");setUpdateError(e instanceof Error?e.message:"Update installation failed.");});}}/>{updatePhase==="installing"&&<div className="update-install-status"><span>JAYVER · UPDATE</span><strong>Preparing installation</strong><small>PACKAGE DOWNLOADED · SIGNATURE CHECKED</small></div>}</div>}
  {update&&updatePhase==="error"&&<UpdateDialog update={update} currentVersion={currentVersion} error={updateError} errorMode onLater={()=>{void update.close();onDismissUpdate();}} onInstall={()=>{setUpdateError("");setUpdatePhase("idle");}}/>}
 </main>;
}
