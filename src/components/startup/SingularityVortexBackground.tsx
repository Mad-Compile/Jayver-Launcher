import { useEffect, useRef } from "react";

type Props = { paused?: boolean; activated?: boolean; intensity?: number };

// A restrained, procedural energy field. All motion and lighting are evaluated in GLSL.
const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}
`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uActivation;
uniform float uIntensity;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p*=2.03;a*=.5;}return v;}
float filament(vec2 p,float phase,float width){
 float bend=sin(p.y*4.1+phase)*.075+sin(p.y*8.3-phase*.7)*.018;
 float d=abs(p.x-bend);
 return exp(-d*d/(width*width));
}
void main(){
 vec2 uv=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.);
 float t=uTime;
 float active=smoothstep(0.,1.,uActivation);
 vec2 p=uv;
 float warp=fbm(p*2.4+vec2(t*.035,-t*.022));
 p.x+= (warp-.5)*.11;
 p.y+=sin(p.x*3.2+t*.12)*.018;
 // Three loose, asymmetric energy strokes orbit the logo without forming a literal ring.
 float a=filament(vec2(p.x+.34,p.y-.02),t*.22,.018);
 float b=filament(vec2(p.x-.31,p.y+.08),-t*.18,.013);
 float c=filament(vec2(p.x+.02,p.y+.27),t*.14,.011);
 float arcs=a*.65+b*.52+c*.38;
 float haze=exp(-abs(length(vec2(p.x*1.0,p.y*.78))-.37)*8.)*.055;
 float slowPulse=.78+.22*sin(t*.8);
 float glow=(arcs*.38+haze)*slowPulse;
 // Dust is sparse and embedded in the flowing field, never a vertical particle column.
 vec2 grid=floor((uv+vec2(t*.006,0.))*vec2(190.,150.));
 float rnd=hash(grid);
 vec2 local=fract((uv+vec2(t*.006,0.))*vec2(190.,150.))-.5;
 float dust=step(.994,rnd)*exp(-dot(local,local)*75.)*smoothstep(.05,.42,arcs);
 float textureNoise=fbm(uv*vec2(8.,13.)+vec2(t*.025,-t*.018));
 float shimmer=pow(max(0.,sin((uv.x*17.+uv.y*11.)+textureNoise*4.+t*.45)),18.)*.018;
 float activationGlow=exp(-dot(uv,uv)*8.)*active*.22;
 vec3 col=vec3(.002,.0025,.0035);
 col+=vec3(.32,.35,.4)*glow*uIntensity;
 col+=vec3(.64,.68,.74)*(arcs*active*.42);
 col+=vec3(.72,.76,.82)*(dust*.28+shimmer);
 col+=vec3(.72,.77,.84)*activationGlow;
 // A soft halo only appears while the mark is being activated.
 float halo=exp(-abs(length(uv)-(.19+sin(t*.6)*.004))*34.)*active;
 col+=vec3(.38,.42,.48)*halo*.17;
 float vignette=1.-smoothstep(.48,1.05,length(uv*vec2(.9,1.)));
 col*=mix(.7,1.,vignette);
 outColor=vec4(col,1.);
}
`;

export default function SingularityVortexBackground({paused=false,activated=false,intensity=.9}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const activationRef=useRef(activated);
 activationRef.current=activated;
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:"high-performance"});
  if(!gl)return;
  const compile=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)throw Error("Shader allocation failed");gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s)||"Shader compile failed";gl.deleteShader(s);throw Error(e);}return s;};
  let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,frame=0,visible=!document.hidden&&!paused,lost=false,start=performance.now(),activation=0;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  try{
   program=gl.createProgram();if(!program)throw Error("Program allocation failed");
   const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||"Shader link failed");
   buffer=gl.createBuffer();if(!buffer)throw Error("Buffer allocation failed");
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,"aPosition"),resolution=gl.getUniformLocation(program,"uResolution"),time=gl.getUniformLocation(program,"uTime"),activationUniform=gl.getUniformLocation(program,"uActivation"),power=gl.getUniformLocation(program,"uIntensity");
   const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,1.2),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}};
   const draw=(now:number)=>{if(!visible||lost)return;resize();const target=activationRef.current?1:0;activation+=(target-activation)*.075;gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.uniform2f(resolution,canvas.width,canvas.height);gl.uniform1f(time,reduced.matches?0:(now-start)*.001);gl.uniform1f(activationUniform,activation);gl.uniform1f(power,intensity);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);frame=requestAnimationFrame(draw);};
   const stop=()=>cancelAnimationFrame(frame);
   const visibility=()=>{visible=!document.hidden&&!paused;if(visible&&!reduced.matches)frame=requestAnimationFrame(draw);else stop();};
   const motion=()=>{if(reduced.matches)stop();else if(visible)frame=requestAnimationFrame(draw);};
   const contextLost=(e:Event)=>{e.preventDefault();lost=true;stop();};
   const contextRestored=()=>{lost=false;start=performance.now();if(visible&&!reduced.matches)frame=requestAnimationFrame(draw);};
   canvas.addEventListener("webglcontextlost",contextLost);canvas.addEventListener("webglcontextrestored",contextRestored);document.addEventListener("visibilitychange",visibility);reduced.addEventListener("change",motion);
   const observer=new ResizeObserver(resize);observer.observe(canvas);if(visible&&!reduced.matches)frame=requestAnimationFrame(draw);
   return()=>{stop();observer.disconnect();canvas.removeEventListener("webglcontextlost",contextLost);canvas.removeEventListener("webglcontextrestored",contextRestored);document.removeEventListener("visibilitychange",visibility);reduced.removeEventListener("change",motion);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);};
  }catch(error){console.error("Jayver loading shader unavailable:",error);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);}
 },[paused,intensity]);
 return <canvas ref={canvasRef} className="startup-particles singularity-vortex" aria-hidden="true"/>;
}
