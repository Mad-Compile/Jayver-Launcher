import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, ShieldCheck, X } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";

type Props = { update: Update; currentVersion: string; onLater: () => void; onInstall: () => void; error?: string; errorMode?: boolean; };

function parseVersion(value: string) {
  const match = value.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match.slice(1).map(Number) : null;
}
function buildsBehind(current: string, latest: string): number | null {
  const a = parseVersion(current), b = parseVersion(latest);
  if (!a || !b || a[0] !== b[0] || a[1] !== b[1] || b[2] < a[2]) return null;
  return b[2] - a[2];
}

/** A small, self-contained WebGL material study. It degrades to the CSS-lit disc if WebGL is unavailable. */
function UpdateMaterial() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vertexSource = `
      attribute vec2 position;
      varying vec2 uv;
      void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec2 uv;
      uniform float time;
      uniform vec2 pointer;
      uniform vec2 resolution;
      void main(){
        vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.0);
        vec2 m=(pointer-.5)*vec2(resolution.x/resolution.y,1.0);
        float r=length(p);
        float ring=sin(r*34.0-time*.32)*.5+.5;
        float ripple=exp(-abs(r-.34-ring*.012)*42.0)*.10;
        float edge=exp(-length(p-m)*8.0)*.10;
        float core=exp(-r*r*8.0)*.12;
        float grain=fract(sin(dot(gl_FragCoord.xy+time,vec2(12.9898,78.233)))*43758.5453)*.012;
        float vignette=1.0-smoothstep(.12,.78,r);
        vec3 silver=vec3(.72,.77,.81)*(ripple+edge+core)*vignette;
        gl_FragColor=vec4(silver+grain*vignette, (ripple+edge+core+grain)*.78*vignette);
      }
    `;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertexSource), fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const timeLocation = gl.getUniformLocation(program, "time");
    const pointerLocation = gl.getUniformLocation(program, "pointer");
    const resolutionLocation = gl.getUniformLocation(program, "resolution");
    let pointer = [0.5, 0.5], start = performance.now(), last = 0, disposed = false;
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(rect.width*dpr)), height = Math.max(1, Math.floor(rect.height*dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width=width; canvas.height=height; gl.viewport(0,0,width,height); }
    };
    const move = (event: PointerEvent) => {
      const rect=canvas.getBoundingClientRect();
      pointer=[(event.clientX-rect.left)/rect.width,1-(event.clientY-rect.top)/rect.height];
    };
    const leave = () => { pointer=[.5,.5]; };
    canvas.addEventListener("pointermove",move); canvas.addEventListener("pointerleave",leave);
    const draw = (now: number) => {
      if (disposed) return;
      if (!reduced && now-last < 30) { frameRef.current=requestAnimationFrame(draw); return; }
      last=now; resize();
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation,reduced?0:(now-start)/1000);
      gl.uniform2f(pointerLocation,pointer[0],pointer[1]);
      gl.uniform2f(resolutionLocation,canvas.width,canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if (!reduced) frameRef.current=requestAnimationFrame(draw);
    };
    frameRef.current=requestAnimationFrame(draw);
    return () => {
      disposed=true;
      if(frameRef.current!==null) cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("pointermove",move); canvas.removeEventListener("pointerleave",leave);
      gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, []);
  return <canvas ref={canvasRef} className="jayver-update-webgl" aria-hidden="true" />;
}

function ButtonLight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas=canvasRef.current, button=canvas?.parentElement;
    if(!canvas||!button)return;
    const gl=canvas.getContext("webgl2",{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:"low-power"});
    if(!gl)return;
    const vs=gl.createShader(gl.VERTEX_SHADER),fs=gl.createShader(gl.FRAGMENT_SHADER);
    if(!vs||!fs)return;
    gl.shaderSource(vs,"#version 300 es\nin vec2 p; out vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}");
    gl.shaderSource(fs,`#version 300 es
precision highp float; in vec2 uv; out vec4 color; uniform vec2 res; uniform vec2 mouse; uniform float t; uniform float on; uniform float pulse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){vec2 p=(uv-.5)*vec2(res.x/max(res.y,1.),1.);vec2 mp=(mouse-.5)*vec2(res.x/max(res.y,1.),1.);float n=fbm(p*5.0+vec2(t*.18,-t*.12));vec2 warp=vec2(fbm(p*7.0+2.1+t*.12),fbm(p*7.0-3.4-t*.1))-.5;vec2 q=p+warp*.085+(mp-p)*.045;float angle=atan(q.y,q.x);float radius=length(q);float wave=sin(angle*2.0+t*.8+n*5.0)*.045+sin(angle*5.0-t*.45)*.018;float contour=radius-(.32+wave+(fbm(q*8.0+t*.16)-.5)*.11);float rim=exp(-abs(contour)*34.);float halo=exp(-abs(contour)*8.);float pointer=exp(-dot(uv-mouse,uv-mouse)*26.);float sweep=exp(-pow((uv.y-(.5+sin(t*.7)*.12+(uv.x-.5)*.1))*28.,2.));float ring=exp(-pow((length(uv-mouse)-(.72-pulse*.58))*46.,2.))*pulse;float alpha=(rim*.12+halo*.035+pointer*.09+sweep*.035+ring*.12)*on;vec3 silver=vec3(.72,.79,.86)*rim*.65+vec3(.58,.65,.72)*(halo*.35+pointer*.25)+vec3(.92,.95,.98)*(sweep*.45+ring*.55);color=vec4(silver*alpha,alpha);}`);
    for(const s of [vs,fs]){gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(vs);gl.deleteShader(fs);return;}}
    const program=gl.createProgram();if(!program)return;
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    const buffer=gl.createBuffer();if(!buffer)return;
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.useProgram(program);const loc=gl.getAttribLocation(program,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const res=gl.getUniformLocation(program,"res"),mouse=gl.getUniformLocation(program,"mouse"),time=gl.getUniformLocation(program,"t"),on=gl.getUniformLocation(program,"on"),pulseLoc=gl.getUniformLocation(program,"pulse");
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    let cursor:[number,number]=[.5,.5],active=false,raf=0,start=0,clickAt=0,dead=false;
    const resize=()=>{const r=button.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}};
    const move=(e:PointerEvent)=>{const r=button.getBoundingClientRect();cursor=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height];};
    const draw=(now:number)=>{if(dead||!active){raf=0;return;}resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(res,canvas.width,canvas.height);gl.uniform2f(mouse,cursor[0],cursor[1]);gl.uniform1f(time,(now-start)/1000);gl.uniform1f(on,1);gl.uniform1f(pulseLoc,clickAt?Math.max(0,1-(now-clickAt)/680):0);gl.drawArrays(gl.TRIANGLES,0,3);raf=requestAnimationFrame(draw);};
    const enter=()=>{active=true;start=performance.now();if(!raf)raf=requestAnimationFrame(draw);};
    const press=()=>{clickAt=performance.now();if(active&&!raf)raf=requestAnimationFrame(draw);};
    const leave=()=>{active=false;cancelAnimationFrame(raf);raf=0;gl.clear(gl.COLOR_BUFFER_BIT);};
    button.addEventListener("pointerenter",enter);button.addEventListener("pointermove",move);button.addEventListener("pointerleave",leave);button.addEventListener("pointerdown",press);
    const observer=new ResizeObserver(resize);observer.observe(button);resize();
    return()=>{dead=true;cancelAnimationFrame(raf);observer.disconnect();button.removeEventListener("pointerenter",enter);button.removeEventListener("pointermove",move);button.removeEventListener("pointerleave",leave);button.removeEventListener("pointerdown",press);gl.deleteBuffer(buffer);gl.deleteProgram(program);};
  },[]);
  return <canvas ref={canvasRef} className="jayver-button-webgl" aria-hidden="true" />;
}

function UpdateGlyph() {
  return (
    <svg className="jayver-update-glyph" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M61 29.5A23 23 0 0 0 20.2 21L15 27" />
      <path d="M15 15V27H27" />
      <path d="M19 50.5A23 23 0 0 0 59.8 59L65 53" />
      <path d="M65 65V53H53" />
      <path className="jayver-update-glyph-core" d="M29 40h22" />
    </svg>
  );
}

export default function UpdateDialog({ update, currentVersion, onLater, onInstall, error, errorMode = false }: Props) {
  const [notesOpen, setNotesOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const onLaterRef = useRef(onLater);
  const behind = useMemo(() => buildsBehind(currentVersion, update.version), [currentVersion, update.version]);
  const notes = update.body?.trim() ?? "";
  useEffect(() => { onLaterRef.current = onLater; }, [onLater]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onLaterRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, []);
  return (
    <div className="jayver-dialog-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onLater(); }}>
      <section className="jayver-update-dialog" role="dialog" aria-modal="true" aria-labelledby="jayver-update-title" aria-describedby="jayver-update-description" ref={dialogRef}>
        <div className="jayver-dialog-topline">
          <div className="jayver-dialog-brand">
            <img className="jayver-dialog-brand-mark" src="/brand/jayver-mark.svg" alt="Jayver" />
            <span>JAYVER</span>
            <span className="jayver-dialog-context">SYSTEM UPDATE</span>
          </div>
          <button className="jayver-dialog-close" type="button" aria-label="Close update dialog" onClick={onLater}><X size={16} /></button>
        </div>
        <div className={"jayver-update-visual" + (errorMode ? " is-error" : "")} aria-hidden="true">
          <div className="jayver-update-visual-halo" />
          <UpdateMaterial />
          <div className="jayver-update-visual-disc">{errorMode ? <ShieldCheck size={48} strokeWidth={1.15} /> : <UpdateGlyph />}</div>
          <span className="jayver-update-orbit jayver-update-orbit-a" /><span className="jayver-update-orbit jayver-update-orbit-b" />
        </div>
        <div className="jayver-dialog-heading">
          <h2 id="jayver-update-title">{errorMode ? "The update wasn't completed." : "A newer version is ready."}</h2>
          <p id="jayver-update-description">{errorMode ? "Jayver couldn't finish installing this release. Your current installation remains unchanged." : "A signed Jayver release is available. Review the version before installing."}</p>
        </div>
        {errorMode ? <div className="jayver-dialog-error" role="alert">{error}</div> : <>
          <div className="jayver-version-comparison" aria-label={"Installed version " + currentVersion + "; available version " + update.version}>
            <div className="jayver-version-cell"><span>INSTALLED VERSION</span><strong>{currentVersion}</strong></div>
            <span className="jayver-version-divider" aria-hidden="true">→</span>
            <div className="jayver-version-cell is-latest"><span>AVAILABLE VERSION</span><strong>{update.version}</strong></div>
          </div>
          <div className="jayver-update-meta">
            <span className="jayver-signed-note"><ShieldCheck size={14} /> Signed release</span>
            {behind !== null && behind > 0 && <span>{behind} {behind === 1 ? "build" : "builds"} behind</span>}
          </div>
          {notes && <div className={"jayver-release-notes" + (notesOpen ? " is-open" : "")}>
            <button type="button" onClick={() => setNotesOpen(value => !value)} aria-expanded={notesOpen}><span>Release notes</span><ChevronDown size={15} /></button>
            {notesOpen && <p>{notes}</p>}
          </div>}
          <p className="jayver-preservation-note"><Check size={14} /> Your launcher data and settings stay in place.</p>
        </>}
        <div className="jayver-dialog-actions">
          <button className="jayver-button-secondary" type="button" onPointerMove={(event) => { const r=event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${event.clientX-r.left}px`); event.currentTarget.style.setProperty("--pointer-y", `${event.clientY-r.top}px`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x","50%"); event.currentTarget.style.setProperty("--pointer-y","50%"); }} onClick={onLater}><ButtonLight /><span>{errorMode ? "Close" : "Not now"}</span></button>
          <button className="jayver-button-primary" type="button" onPointerMove={(event) => { const r=event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${event.clientX-r.left}px`); event.currentTarget.style.setProperty("--pointer-y", `${event.clientY-r.top}px`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x","50%"); event.currentTarget.style.setProperty("--pointer-y","50%"); }} onClick={onInstall}><ButtonLight /><span>{errorMode ? "Try again" : "Install update"}</span>{!errorMode && <ArrowDownToLine size={16} />}</button>
        </div>
      </section>
    </div>
  );
}
