import { useState } from "react";
import { Box, ChevronDown, CircleHelp, Download, Gamepad2, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import ObsidianScene from "./ObsidianScene";
import SkinHero from "./SkinHero";
import type { Update } from "@tauri-apps/plugin-updater";
import { installJayverUpdate } from "@/lib/updates";

interface Props { update: Update | null; onDismissUpdate: () => void; }
export default function HomeScreen({update,onDismissUpdate}:Props){
 const [tab,setTab]=useState<"play"|"instances"|"settings">("play");
 const [installing,setInstalling]=useState(false);
 const [percent,setPercent]=useState(0);
 const [updateError,setUpdateError]=useState("");
 return <main className="home-screen">
  <ObsidianScene/>
  <div className="home-grain" aria-hidden="true"/>
  <header className="home-topbar">
   <a className="home-brand" href="#" aria-label="Jayver home"><img src="/brand/jayver-mark.svg" alt=""/> <span>JAYVER</span></a>
   <nav className="home-nav" aria-label="Main navigation">
    <button className={tab==="play"?"active":""} onClick={()=>setTab("play")}><Gamepad2 size={15}/> Play</button>
    <button className={tab==="instances"?"active":""} onClick={()=>setTab("instances")}><Box size={15}/> Instances</button>
    <button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}><Settings2 size={15}/> Settings</button>
   </nav>
   <div className="home-build"><span className="status-dot"/> DESKTOP CLIENT</div>
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
  {update&&<div className="update-shade"><section className="update-panel" role="dialog" aria-modal="true" aria-labelledby="update-title"><p className="card-kicker">JAYVER UPDATE</p><h2 id="update-title">A new build awaits.</h2><p>{update.body||`Version ${update.version} is ready to install.`}</p>{updateError&&<p role="alert" className="update-error">{updateError}</p>}{installing?<div className="update-progress"><span style={{width:`${percent}%`}}/></div>:<div className="update-actions"><button onClick={()=>{void update.close();onDismissUpdate();}}>Later</button><button onClick={()=>{setInstalling(true);void installJayverUpdate(update,({downloaded,total})=>setPercent(total?Math.min(100,Math.round(downloaded/total*100)):0)).catch(e=>{setInstalling(false);setUpdateError(e instanceof Error?e.message:"Update failed.");});}}>Install & restart <Download size={14}/></button></div>}</section></div>}
 </main>;
}
