import { useEffect, useRef } from "react";

const vertex = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position=vec4(position,0.0,1.0); }`;

const fragment = `#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float time;
uniform vec2 pointer;
uniform float reduced;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
 vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);
}
float fbm(vec2 p){ float v=0.0,a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;} return v; }
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.0);
 float t=time*(1.0-reduced);
 float n=fbm(p*2.1+vec2(t*.12,-t*.08));
 vec2 warp=vec2(fbm(p*2.8+3.1+t*.09),fbm(p*2.8-4.7-t*.07))-.5;
 vec2 q=p+warp*.22;
 float angle=atan(q.y,q.x);
 float radius=length(q);
 float ripple=sin(angle*3.0+t*.22+n*4.0)*.035+sin(angle*7.0-t*.13)*.012;
 float contour=radius-(.37+ripple+(fbm(q*4.0+t*.08)-.5)*.08);
 float glow=exp(-abs(contour)*18.0);
 float halo=exp(-abs(contour)*5.0);
 float inner=1.0-smoothstep(.23,.42,radius);
 float outer=1.0-smoothstep(.52,.86,radius);
 float grain=hash(gl_FragCoord.xy+floor(t*12.0))*.025;
 vec3 silver=vec3(.72,.76,.82);
 vec3 deep=vec3(.16,.20,.29);
 vec3 c=deep*halo*.23+silver*glow*.32+vec3(.22,.28,.42)*halo*.25;
 c*=outer;
 c+=vec3(grain)*.35;
 float vignette=1.0-smoothstep(.35,1.0,length(p*vec2(.85,1.0)));
 c*=vignette;
 color=vec4(c,1.0);
}`;

const particleVertex = `#version 300 es
precision highp float;
in vec3 seed;
uniform float time;
uniform vec2 resolution;
uniform float reduced;
out float alpha;
void main(){
 float a=seed.x*6.2831853+time*(.11+seed.z*.11)*(1.0-reduced);
 float r=.30+seed.y*.27+sin(a*2.0+seed.z*8.0)*.025;
 vec2 p=vec2(cos(a)*r*resolution.y/resolution.x,sin(a)*r);
 p+=vec2(sin(a*2.3+seed.z*10.0),cos(a*1.7+seed.x*8.0))*.035;
 gl_Position=vec4(p,0.0,1.0);
 gl_PointSize=(1.0+seed.z*2.1)*(resolution.y/850.0);
 alpha=.12+seed.z*.58;
}`;
const particleFragment = `#version 300 es
precision highp float;
in float alpha;
out vec4 color;
void main(){ vec2 p=gl_PointCoord-.5; float d=length(p); float a=(1.0-smoothstep(.08,.5,d))*alpha; color=vec4(vec3(.86,.89,.94),a); }`;

function shader(gl: WebGL2RenderingContext, type: number, source: string) {
 const s=gl.createShader(type); if(!s) throw new Error("Shader allocation failed");
 gl.shaderSource(s,source); gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s)||"Shader compile failed";gl.deleteShader(s);throw new Error(e);}
 return s;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
 const p=gl.createProgram(); if(!p) throw new Error("Program allocation failed");
 const a=shader(gl,gl.VERTEX_SHADER,vs),b=shader(gl,gl.FRAGMENT_SHADER,fs);
 gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(p)||"Program link failed";gl.deleteProgram(p);throw new Error(e);}
 return p;
}

export default function ObsidianScene(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;
  const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,powerPreference:"low-power"});
  if(!gl)return;
  let bg:WebGLProgram|undefined,particlesProgram:WebGLProgram|undefined,quad:WebGLBuffer|null=null,particleBuffer:WebGLBuffer|null=null,raf=0,visible=!document.hidden;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const count=Math.min(1500,Math.max(650,Math.floor(innerWidth*innerHeight/1100)));
  const data=new Float32Array(count*3);let seed=7391;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){data[i*3]=rand();data[i*3+1]=rand();data[i*3+2]=rand();}
  try{
   bg=program(gl,vertex,fragment);particlesProgram=program(gl,particleVertex,particleFragment);
   quad=gl.createBuffer();particleBuffer=gl.createBuffer();if(!quad||!particleBuffer)throw new Error("Buffer allocation failed");
   gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.35);canvas.width=Math.max(1,Math.floor(canvas.clientWidth*dpr));canvas.height=Math.max(1,Math.floor(canvas.clientHeight*dpr));gl.viewport(0,0,canvas.width,canvas.height);draw(performance.now());};
   const draw=(now:number)=>{
    const t=now*.001;gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);gl.useProgram(bg!);gl.bindBuffer(gl.ARRAY_BUFFER,quad!);
    let loc=gl.getAttribLocation(bg!,"position");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.uniform2f(gl.getUniformLocation(bg!,"resolution"),canvas.width,canvas.height);gl.uniform1f(gl.getUniformLocation(bg!,"time"),t);gl.uniform2f(gl.getUniformLocation(bg!,"pointer"),.5,.5);gl.uniform1f(gl.getUniformLocation(bg!,"reduced"),reduced.matches?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(particlesProgram!);gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer!);
    loc=gl.getAttribLocation(particlesProgram!,"seed");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);
    gl.uniform1f(gl.getUniformLocation(particlesProgram!,"time"),t);gl.uniform2f(gl.getUniformLocation(particlesProgram!,"resolution"),canvas.width,canvas.height);gl.uniform1f(gl.getUniformLocation(particlesProgram!,"reduced"),reduced.matches?1:0);gl.drawArrays(gl.POINTS,0,count);
   };
   const tick=(now:number)=>{if(!visible)return;draw(now);if(!reduced.matches)raf=requestAnimationFrame(tick);};
   const onVisibility=()=>{visible=!document.hidden;cancelAnimationFrame(raf);if(visible&&!reduced.matches)raf=requestAnimationFrame(tick);};
   const onMotion=()=>{cancelAnimationFrame(raf);draw(performance.now());if(visible&&!reduced.matches)raf=requestAnimationFrame(tick);};
   const observer=new ResizeObserver(resize);observer.observe(canvas);document.addEventListener("visibilitychange",onVisibility);reduced.addEventListener("change",onMotion);resize();if(!reduced.matches)raf=requestAnimationFrame(tick);
   return()=>{cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener("visibilitychange",onVisibility);reduced.removeEventListener("change",onMotion);if(quad)gl.deleteBuffer(quad);if(particleBuffer)gl.deleteBuffer(particleBuffer);if(bg)gl.deleteProgram(bg);if(particlesProgram)gl.deleteProgram(particlesProgram);};
  }catch{if(quad)gl.deleteBuffer(quad);if(particleBuffer)gl.deleteBuffer(particleBuffer);if(bg)gl.deleteProgram(bg);if(particlesProgram)gl.deleteProgram(particlesProgram);}
 },[]);
 return <canvas ref={ref} className="obsidian-scene" aria-hidden="true"/>;
}
