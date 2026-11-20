import { useEffect, useRef } from "react";

export type SingularityQuality = "auto" | "ultra" | "high" | "balanced" | "low";

type Props = {
  progress: number;
  quality?: SingularityQuality;
  paused?: boolean;
  mouseInfluence?: number;
  intensity?: number;
};

const FULLSCREEN_VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main(){ vUv=aPosition*.5+.5; gl_Position=vec4(aPosition,0.,1.); }
`;

const SCENE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform float uIntensity;
uniform vec2 uMouse;
uniform sampler2D uTrail;
uniform float uUseTrail;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
void main(){
 vec2 uv=vUv;
 vec2 p=(uv-.5)*vec2(uResolution.x/uResolution.y,1.);
 p-=uMouse*.012;
 float t=uTime;
 float r=length(p);
 float a=atan(p.y,p.x);
 vec2 flow=vec2(fbm(p*3.+vec2(t*.07,1.3)),fbm(p*3.-vec2(2.1,t*.05)))-.5;
 vec2 q=p+flow*.025;
 float ang=atan(q.y,q.x), rad=length(q);
 float lens=1.0/(rad*rad+0.025);
 vec2 lensed=q+normalize(q+vec2(.0001))*min(lens*.0025,.055);
 float lr=length(lensed), la=atan(lensed.y,lensed.x);
 float horizon=1.-smoothstep(.105,.125,lr);
 float eventHorizon=1.-smoothstep(.115,.13,lr);
 float discY=abs(lensed.y + .012*sin(la*2.+t*.12));
 float disc=exp(-discY*42.)*smoothstep(.13,.19,lr)*(1.-smoothstep(.58,.78,lr));
 float disc2=exp(-abs(lensed.y-.028*sin(la*3.-t*.08))*105.)*smoothstep(.19,.25,lr)*(1.-smoothstep(.46,.6,lr));
 float rings=0.;
 for(int i=0;i<5;i++){
   float fi=float(i);
   float rr=.19+fi*.064 + .009*sin(la*(3.+fi)+t*(.14-fi*.012));
   rings+=exp(-abs(lr-rr)*190.)*(.12+fi*.025);
 }
 float filaments=0.;
 for(int i=0;i<54;i++){
   float fi=float(i);
   float phase=fi*6.2831853/54.;
   float twist=la-phase - .24*sin(lr*12.-t*.22+fi);
   float line=abs(sin(twist*1.45));
   float envelope=exp(-abs(lr-(.24+.18*sin(phase*3.+t*.07)))*7.);
   filaments+=exp(-line*55.)*envelope*.014;
 }
 float jetAxis=abs(lensed.x-.018*sin(lensed.y*10.+t*.3));
 float jets=exp(-jetAxis*75.)*smoothstep(.2,.42,abs(lensed.y))*(1.-smoothstep(.72,.95,abs(lensed.y)));
 float jetNoise=.35+.65*fbm(vec2(lensed.y*15.,t*.24));
 float halo=exp(-abs(lr-.29)*7.)*.08;
 float pulse=exp(-pow((fract(t*.075)-.5)*2.,2.)*24.)*smoothstep(.12, .8, uProgress/100.);
 vec3 col=vec3(0.);
 col+=vec3(.8,.82,.86)*(disc*.13+disc2*.22+rings*.11);
 col+=vec3(.56,.59,.64)*(filaments*1.4+halo);
 col+=vec3(.7,.73,.78)*(jets*jetNoise*.22);
 col+=vec3(.8)*pulse*exp(-abs(lr-(.2+fract(t*.075)*.52))*35.)*.16;
 col*=uIntensity;
 col*=1.-horizon*.98;
 float vignette=1.-smoothstep(.58,1.05,length(p*vec2(.9,1.)));
 col*=vignette;
 float grain=(hash(gl_FragCoord.xy+floor(t*12.))-.5)*.009;
 col+=grain;
 vec3 trail=texture(uTrail,uv).rgb*uUseTrail;
 col+=trail;
 outColor=vec4(col,1.);
}
`;

const SIM_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outPosition;
layout(location=1) out vec4 outVelocity;
uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform float uTime;
uniform float uDelta;
uniform float uProgress;
uniform float uIntensity;
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
void main(){
 ivec2 cell=ivec2(gl_FragCoord.xy);
 vec4 state=texelFetch(uPosition,cell,0);
 vec4 velState=texelFetch(uVelocity,cell,0);
 vec3 p=state.xyz;
 vec3 v=velState.xyz;
 float seed=velState.w;
 float dt=clamp(uDelta,0.,.025);
 float r2=dot(p,p)+.035;
 vec3 gravity=-p*(.018/pow(r2,1.5));
 vec3 tangent=normalize(vec3(-p.z,0.,p.x)+vec3(.0001,0.,.0001));
 float orbit=1.0/(.35+length(p.xz));
 vec3 orbital=tangent*(.0008+orbit*.00055);
 vec3 turbulence=vec3(sin(p.y*8.+uTime*.7+seed*9.),cos(p.z*7.-uTime*.5+seed*4.),sin(p.x*9.+uTime*.6))*0.00045;
 vec3 confinement=vec3(0.,-p.y*.012,0.);
 vec3 jet=vec3(0.,sign(p.y)*max(0.,abs(p.y)-.38)*.004,0.);
 v+=(gravity+orbital+turbulence+confinement+jet)*dt*60.;
 v*=pow(.994,dt*60.);
 p+=v*dt*60.;
 float age=state.w+dt*(.05+seed*.08);
 if(length(p)>1.55 || age>22.){
   float a=seed*6.2831853+uTime*.01;
   float radius=.22+hash(seed*17.)*.42;
   p=vec3(cos(a)*radius,(hash(seed*31.)-.5)*.12,sin(a)*radius);
   v=normalize(vec3(-sin(a),0.,cos(a)))*(.0015+hash(seed*9.)*.001);
   age=0.;
 }
 outPosition=vec4(p,age);
 outVelocity=vec4(v,seed);
}
`;

const PARTICLE_VERTEX = `#version 300 es
precision highp float;
uniform sampler2D uPosition;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uProgress;
uniform float uPointScale;
out float vAlpha;
out float vSeed;
void main(){
 ivec2 size=textureSize(uPosition,0);
 int id=gl_VertexID;
 ivec2 coord=ivec2(id%size.x,id/size.x);
 vec4 state=texelFetch(uPosition,coord,0);
 vec3 p=state.xyz;
 float seed=fract(float(id)*.61803398875);
 float age=state.w;
 float lens=1./(dot(p,p)+.08);
 p.xz*=1.+min(lens*.012,.08);
 float ca=cos(.12*sin(uTime*.12)),sa=sin(.12*sin(uTime*.12));
 p.xz=mat2(ca,-sa,sa,ca)*p.xz;
 vec3 camera=vec3(0.,.05,2.65);
 vec3 view=p-camera;
 float z=max(.25,-view.z);
 vec2 projected=vec2(view.x,view.y)*1.7/z;
 projected.x*=uResolution.y/uResolution.x;
 gl_Position=vec4(projected,0.,1.);
 float depth=clamp(1.5/z,.45,2.8);
 gl_PointSize=clamp((.7+seed*2.1)*depth*uPointScale,1.,5.5);
 vAlpha=(.14+seed*.44)*exp(-age*.025)*uIntensity;
 vSeed=seed;
}
`;

const PARTICLE_FRAGMENT = `#version 300 es
precision highp float;
in float vAlpha;
in float vSeed;
out vec4 outColor;
void main(){
 vec2 q=gl_PointCoord-.5;
 float d=length(q);
 float a=(1.-smoothstep(.12,.5,d))*vAlpha;
 float core=exp(-d*18.)*(.2+vSeed*.8);
 outColor=vec4(vec3(.72+core*.28),a);
}
`;

function shader(gl: WebGL2RenderingContext, type: number, source: string) {
  const value = gl.createShader(type);
  if (!value) throw new Error("WebGL shader allocation failed");
  gl.shaderSource(value, source);
  gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(value) || "Shader compilation failed";
    gl.deleteShader(value);
    throw new Error(message);
  }
  return value;
}

function program(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const p = gl.createProgram();
  if (!p) throw new Error("WebGL program allocation failed");
  const vs = shader(gl, gl.VERTEX_SHADER, vertex);
  const fs = shader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(p) || "WebGL program link failed";
    gl.deleteProgram(p);
    throw new Error(message);
  }
  return p;
}

function makeTexture(gl: WebGL2RenderingContext, size: number, data?: Float32Array) {
  const texture = gl.createTexture();
  if (!texture) throw new Error("WebGL texture allocation failed");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, data ?? null);
  return texture;
}

function SingularityVortexBackground({ progress, quality = "auto", paused = false, mouseInfluence = 1, intensity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const mouseRef = useRef({ x: 0, y: 0 });
  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) return;

    const floatSupport = gl.getExtension("EXT_color_buffer_float");
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const chosen: SingularityQuality = quality === "auto" ? (floatSupport && maxTexture >= 8192 ? "high" : "balanced") : quality;
    const requestedSize = chosen === "ultra" ? 1024 : chosen === "high" ? 768 : chosen === "low" ? 256 : 512;
    const size = Math.min(requestedSize, maxTexture, floatSupport ? requestedSize : 256);
    const count = size * size;
    let simulationEnabled = Boolean(floatSupport);
    let simProgram: WebGLProgram | null = null;
    let particleProgram: WebGLProgram | null = null;
    let sceneProgram: WebGLProgram | null = null;
    let quad: WebGLBuffer | null = null;
    let particleFbo: WebGLFramebuffer[] = [];
    let positionTextures: WebGLTexture[] = [];
    let velocityTextures: WebGLTexture[] = [];
    let current = 0;
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    let visible = !document.hidden && !paused;
    let lost = false;
    let renderScale = chosen === "ultra" ? 1 : chosen === "high" ? .9 : chosen === "low" ? .62 : .78;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width - .5) * 2 * mouseInfluence;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height - .5) * 2 * mouseInfluence;
    };
    const stop = () => { cancelAnimationFrame(frame); };
    let tick: (now: number) => void = () => undefined;
    const start = () => { if (visible && !reduced.matches && !lost) frame = requestAnimationFrame(tick); };

    try {
      sceneProgram = program(gl, FULLSCREEN_VERTEX, SCENE_FRAGMENT);
      particleProgram = program(gl, PARTICLE_VERTEX, PARTICLE_FRAGMENT);
      quad = gl.createBuffer();
      if (!quad) throw new Error("WebGL quad allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

      if (simulationEnabled) {
        simProgram = program(gl, FULLSCREEN_VERTEX, SIM_FRAGMENT);
        const positions = new Float32Array(count * 4);
        const velocities = new Float32Array(count * 4);
        let seed = 739391;
        const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (let i = 0; i < count; i++) {
          const a = random() * Math.PI * 2;
          const radius = .19 + Math.pow(random(), .72) * .57;
          positions[i * 4] = Math.cos(a) * radius;
          positions[i * 4 + 1] = (random() - .5) * .12;
          positions[i * 4 + 2] = Math.sin(a) * radius;
          positions[i * 4 + 3] = random() * 22;
          velocities[i * 4] = -Math.sin(a) * (.001 + random() * .001);
          velocities[i * 4 + 1] = (random() - .5) * .0004;
          velocities[i * 4 + 2] = Math.cos(a) * (.001 + random() * .001);
          velocities[i * 4 + 3] = random();
        }
        for (let i = 0; i < 2; i++) {
          positionTextures.push(makeTexture(gl, size, positions));
          velocityTextures.push(makeTexture(gl, size, velocities));
          const fbo = gl.createFramebuffer();
          if (!fbo) throw new Error("WebGL simulation framebuffer allocation failed");
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, positionTextures[i], 0);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, velocityTextures[i], 0);
          gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Float simulation framebuffer is unsupported");
          particleFbo.push(fbo);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      const activeSceneProgram = sceneProgram;
      const activeParticleProgram = particleProgram;
      if (!activeSceneProgram || !activeParticleProgram) throw new Error("WebGL renderer setup did not complete");
      const uniform = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);
      const sceneUniforms = {
        resolution: uniform(activeSceneProgram, "uResolution"), time: uniform(sceneProgram, "uTime"),
        progress: uniform(sceneProgram, "uProgress"), intensity: uniform(sceneProgram, "uIntensity"),
        mouse: uniform(sceneProgram, "uMouse"), trail: uniform(sceneProgram, "uTrail"), useTrail: uniform(sceneProgram, "uUseTrail"),
      };
      const simUniforms = simProgram ? {
        position: uniform(simProgram, "uPosition"), velocity: uniform(simProgram, "uVelocity"),
        time: uniform(simProgram, "uTime"), delta: uniform(simProgram, "uDelta"),
        progress: uniform(simProgram, "uProgress"), intensity: uniform(simProgram, "uIntensity"),
      } : null;
      const particleUniforms = {
        position: uniform(activeParticleProgram, "uPosition"), resolution: uniform(particleProgram, "uResolution"),
        time: uniform(particleProgram, "uTime"), intensity: uniform(particleProgram, "uIntensity"),
        progress: uniform(particleProgram, "uProgress"), scale: uniform(particleProgram, "uPointScale"),
      };

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * renderScale;
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      tick = (now: number) => {
        if (!visible || lost) return;
        const rawDelta = (now - last) / 1000;
        last = now;
        const dt = Math.min(.025, Math.max(.001, rawDelta));
        elapsed += dt;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.useProgram(activeSceneProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        const scenePos = gl.getAttribLocation(activeSceneProgram, "aPosition");
        gl.enableVertexAttribArray(scenePos);
        gl.vertexAttribPointer(scenePos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(sceneUniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(sceneUniforms.time, elapsed);
        gl.uniform1f(sceneUniforms.progress, progressRef.current);
        gl.uniform1f(sceneUniforms.intensity, intensity);
        gl.uniform2f(sceneUniforms.mouse, mouseRef.current.x, mouseRef.current.y);
        gl.uniform1f(sceneUniforms.useTrail, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (simulationEnabled && simProgram && simUniforms && activeParticleProgram && positionTextures.length === 2) {
          const next = 1 - current;
          gl.bindFramebuffer(gl.FRAMEBUFFER, particleFbo[next]);
          gl.viewport(0, 0, size, size);
          gl.useProgram(simProgram);
          gl.bindBuffer(gl.ARRAY_BUFFER, quad);
          const simPos = gl.getAttribLocation(simProgram, "aPosition");
          gl.enableVertexAttribArray(simPos);
          gl.vertexAttribPointer(simPos, 2, gl.FLOAT, false, 0, 0);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, positionTextures[current]);
          gl.uniform1i(simUniforms.position, 0);
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, velocityTextures[current]);
          gl.uniform1i(simUniforms.velocity, 1);
          gl.uniform1f(simUniforms.time, elapsed);
          gl.uniform1f(simUniforms.delta, dt);
          gl.uniform1f(simUniforms.progress, progressRef.current);
          gl.uniform1f(simUniforms.intensity, intensity);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          current = next;

          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          gl.useProgram(activeParticleProgram);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, positionTextures[current]);
          gl.uniform1i(particleUniforms.position, 0);
          gl.uniform2f(particleUniforms.resolution, canvas.width, canvas.height);
          gl.uniform1f(particleUniforms.time, elapsed);
          gl.uniform1f(particleUniforms.intensity, intensity);
          gl.uniform1f(particleUniforms.progress, progressRef.current);
          gl.uniform1f(particleUniforms.scale, chosen === "ultra" ? 1.3 : chosen === "low" ? .8 : 1.);
          gl.drawArrays(gl.POINTS, 0, count);
          gl.disable(gl.BLEND);
        }
        frame = requestAnimationFrame(tick);
      };

      const onVisibility = () => { visible = !document.hidden && !paused; if (visible) { last = performance.now(); start(); } else stop(); };
      const onMotion = () => { if (reduced.matches) stop(); else start(); };
      const onContextLost = (event: Event) => { event.preventDefault(); lost = true; stop(); };
      const onContextRestored = () => { lost = false; window.location.reload(); };
      canvas.addEventListener("pointermove", pointer, { passive: true });
      canvas.addEventListener("webglcontextlost", onContextLost);
      canvas.addEventListener("webglcontextrestored", onContextRestored);
      document.addEventListener("visibilitychange", onVisibility);
      reduced.addEventListener("change", onMotion);
      if (visible && !reduced.matches) start();

      return () => {
        stop(); observer.disconnect();
        canvas.removeEventListener("pointermove", pointer);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
        document.removeEventListener("visibilitychange", onVisibility);
        reduced.removeEventListener("change", onMotion);
        particleFbo.forEach((f) => gl.deleteFramebuffer(f));
        positionTextures.forEach((t) => gl.deleteTexture(t));
        velocityTextures.forEach((t) => gl.deleteTexture(t));
        if (quad) gl.deleteBuffer(quad);
        if (simProgram) gl.deleteProgram(simProgram);
        if (particleProgram) gl.deleteProgram(particleProgram);
        if (sceneProgram) gl.deleteProgram(sceneProgram);
      };
    } catch (error) {
      console.error("Jayver singularity renderer unavailable:", error);
      particleFbo.forEach((f) => gl.deleteFramebuffer(f));
      positionTextures.forEach((t) => gl.deleteTexture(t));
      velocityTextures.forEach((t) => gl.deleteTexture(t));
      if (quad) gl.deleteBuffer(quad);
      if (simProgram) gl.deleteProgram(simProgram);
      if (particleProgram) gl.deleteProgram(particleProgram);
      if (sceneProgram) gl.deleteProgram(sceneProgram);
      return;
    }
  }, [quality, paused, mouseInfluence, intensity]);

  return <canvas ref={canvasRef} className="startup-particles singularity-vortex" aria-hidden="true" />;
}

export default SingularityVortexBackground;
