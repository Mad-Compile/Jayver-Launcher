import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import HomeScreen from "@/components/home/HomeScreen";
import { jayver } from "@/lib/jayver";
import type { Update } from "@tauri-apps/plugin-updater";
import { checkForJayverUpdate, installJayverUpdate } from "@/lib/updates";

type StartupState = "starting" | "ready" | "error" | "preview";

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec3 aParticle;
uniform float uTime;
uniform vec2 uResolution;
uniform float uReducedMotion;
out float vAlpha;
out float vShade;

void main() {
  float seed = aParticle.x;
  float t = aParticle.y * 6.2831853 + (uReducedMotion > 0.5 ? 0.0 : uTime * (0.10 + seed * 0.08));
  float radius = 0.22 + aParticle.z * 0.20 + sin(t * 2.0 + seed * 8.0) * 0.025;
  float warp = sin(t * 3.0 + seed * 12.0) * 0.035 + cos(t * 5.0 - seed * 7.0) * 0.018;
  float x = cos(t) * (radius + warp) + sin(t * 2.0 + seed * 9.0) * 0.025;
  float y = sin(t) * (radius * 0.78 + warp) + cos(t * 3.0 + seed * 5.0) * 0.025;
  vec2 pos = vec2(x, y);
  pos.x *= uResolution.y / uResolution.x;
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = (1.0 + seed * 2.1) * (0.72 + aParticle.z * 0.7);
  vAlpha = 0.16 + seed * 0.48;
  vShade = 0.56 + seed * 0.38;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in float vAlpha;
in float vShade;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float alpha = (1.0 - smoothstep(0.12, 0.5, d)) * vAlpha;
  float shade = vShade;
  outColor = vec4(vec3(shade), alpha);
}`;


const BACKGROUND_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 aPosition;
void main(){ gl_Position=vec4(aPosition,0.0,1.0); }`;

const BACKGROUND_FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uReducedMotion;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;} return v; }
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution;
 vec2 p=(uv-vec2(.5,.54))*vec2(uResolution.x/uResolution.y,1.0);
 float t=uTime*(1.0-uReducedMotion);
 vec2 flow=vec2(fbm(p*3.0+vec2(t*.10,1.7)),fbm(p*3.0-vec2(2.3,t*.08)))-.5;
 vec2 q=p+flow*.16;
 float a=atan(q.y,q.x);
 float r=length(q);
 float distortion=sin(a*3.0+t*.18)*.035+sin(a*7.0-t*.12)*.012+(fbm(q*5.0+t*.06)-.5)*.075;
 float d=r-(.355+distortion);
 float core=exp(-abs(d)*34.0);
 float halo=exp(-abs(d)*9.0);
 float outer=1.0-smoothstep(.48,.82,r);
 float grain=hash(gl_FragCoord.xy+floor(t*9.0))*.018;
 vec3 silver=vec3(.78,.80,.84);
 vec3 c=(silver*core*.20+vec3(.37,.40,.46)*halo*.18)*outer;
 c+=grain*.20;
 float vignette=1.0-smoothstep(.42,1.0,length(p*vec2(.9,1.0)));
 c*=vignette;
 outColor=vec4(c,1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let start = performance.now();
    let visible = !document.hidden;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const count = Math.min(2400, Math.max(900, Math.floor((window.innerWidth * window.innerHeight) / 500)));
    const particles = new Float32Array(count * 3);
    let seed = 934857;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      particles[i * 3] = random();
      particles[i * 3 + 1] = random();
      particles[i * 3 + 2] = random();
    }

    try {
      const bgVertex = compileShader(gl, gl.VERTEX_SHADER, BACKGROUND_VERTEX_SHADER);\n      const bgFragment = compileShader(gl, gl.FRAGMENT_SHADER, BACKGROUND_FRAGMENT_SHADER);\n      backgroundProgram = gl.createProgram();\n      if (!backgroundProgram) throw new Error("Unable to create fluid shader program");\n      gl.attachShader(backgroundProgram, bgVertex);\n      gl.attachShader(backgroundProgram, bgFragment);\n      gl.linkProgram(backgroundProgram);\n      gl.deleteShader(bgVertex);\n      gl.deleteShader(bgFragment);\n      if (!gl.getProgramParameter(backgroundProgram, gl.LINK_STATUS)) throw new Error("Unable to link fluid shader program");\n      quadBuffer = gl.createBuffer();\n      if (!quadBuffer) throw new Error("Unable to create fluid quad");\n      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);\n      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);\n\n      const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      if (!program) throw new Error("Unable to create WebGL program");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Unable to link WebGL program");
      const activeProgram = program;
      buffer = gl.createBuffer();
      if (!buffer) throw new Error("Unable to create particle buffer");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);
      gl.useProgram(activeProgram);
      const location = gl.getAttribLocation(activeProgram, "aParticle");
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(activeProgram, "uResolution"), canvas.clientWidth, canvas.clientHeight);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.clearColor(0.018, 0.019, 0.021, 1);

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(activeProgram);
        gl.uniform2f(gl.getUniformLocation(activeProgram, "uResolution"), canvas.clientWidth, canvas.clientHeight);
        draw(performance.now());
      };

      const draw = (now: number) => {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(activeProgram);
        gl.uniform1f(gl.getUniformLocation(activeProgram, "uTime"), (now - start) / 1000);
        gl.uniform1f(gl.getUniformLocation(activeProgram, "uReducedMotion"), reduced.matches ? 1 : 0);
        gl.drawArrays(gl.POINTS, 0, count);
      };

      const tick = (now: number) => {
        if (!visible) return;
        draw(now);
        if (!reduced.matches) frame = requestAnimationFrame(tick);
      };
      const onVisibility = () => {
        visible = !document.hidden;
        if (visible && !reduced.matches) frame = requestAnimationFrame(tick);
        else cancelAnimationFrame(frame);
      };
      const onMotion = () => {
        cancelAnimationFrame(frame);
        draw(performance.now());
        if (!reduced.matches && visible) frame = requestAnimationFrame(tick);
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      document.addEventListener("visibilitychange", onVisibility);
      reduced.addEventListener("change", onMotion);
      resize();
      if (!reduced.matches) frame = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        reduced.removeEventListener("change", onMotion);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      };
    } catch {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      return;
    }
  }, []);

  return <canvas ref={canvasRef} className="startup-particles" aria-hidden="true" />;
}

export default function StartupScreen() {
  const [state, setState] = useState<StartupState>("starting");
  const [progress, setProgress] = useState(4);
  const [status, setStatus] = useState("Starting Jayver");
  const [error, setError] = useState("");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState("");

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
      await jayver.listInstances();
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
    void initialize();
    void getVersion().then((version) => getCurrentWindow().setTitle(`Jayver ${version}`)).catch(() => undefined);
  }, [initialize]);

  if (state === "ready") {
    return <HomeScreen update={availableUpdate} onDismissUpdate={() => setAvailableUpdate(null)} />;
  }

  return (
    <main className="startup-screen">
      <ParticleField />
      <div className="startup-vignette" aria-hidden="true" />
      <section className="startup-mark" aria-label="Jayver startup">
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
