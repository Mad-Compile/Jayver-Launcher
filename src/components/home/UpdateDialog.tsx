import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, ShieldCheck, X } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";

type Props = { update: Update; currentVersion: string; onLater: () => void; onInstall: () => void; error?: string; errorMode?: boolean; };

function parseVersion(value: string) {
  const match = value.trim().replace(/^v/i, "").match(/^(\d+)\\.(\d+)\\.(\d+)(?:[-+].*)?$/);
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

function UpdateGlyph() {
  return (
    <svg className="jayver-update-glyph" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M49 24A19 19 0 0 0 15.5 19L11 24" />
      <path d="M11 13v11h11" />
      <path d="M15 40a19 19 0 0 0 33.5 5L53 40" />
      <path d="M53 51V40H42" />
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
            <img className="jayver-dialog-brand-mark" src="/brand/jayver-mark.svg" alt="" />
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
          <button className="jayver-button-secondary" type="button" onPointerMove={(event) => { const r=event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${event.clientX-r.left}px`); event.currentTarget.style.setProperty("--pointer-y", `${event.clientY-r.top}px`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x","50%"); event.currentTarget.style.setProperty("--pointer-y","50%"); }} onClick={onLater}>{errorMode ? "Close" : "Not now"}</button>
          <button className="jayver-button-primary" type="button" onPointerMove={(event) => { const r=event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--pointer-x", `${event.clientX-r.left}px`); event.currentTarget.style.setProperty("--pointer-y", `${event.clientY-r.top}px`); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--pointer-x","50%"); event.currentTarget.style.setProperty("--pointer-y","50%"); }} onClick={onInstall}><span>{errorMode ? "Try again" : "Install update"}</span>{!errorMode && <ArrowDownToLine size={16} />}</button>
        </div>
      </section>
    </div>
  );
}
