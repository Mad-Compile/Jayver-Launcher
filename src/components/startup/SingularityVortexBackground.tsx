import { useEffect, useRef } from "react";

type Props = { progress: number; quality?: "auto" | "ultra" | "high" | "balanced" | "low"; paused?: boolean; mouseInfluence?: number; intensity?: number };

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
uniform vec2 uMouse;
uniform float uIntensity;

float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p*=2.03;a*=.5;}return n;}
void main(){
 vec2 uv=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.);
 uv-=uMouse*.012;
 float t=uTime;
 vec3 ro=vec3(0.,0.,3.2);
 vec3 rd=normalize(vec3(uv*1.32,-1.85));
 vec3 col=vec3(.004,.005,.007);

 // Sparse, quiet star field.
 vec3 starCell=floor(rd*180.);
 float stars=step(.9978,hash(starCell))*pow(max(rd.y*.5+.5,0.),.3);
 col+=vec3(.55,.59,.64)*stars*.8;

 // Tilted ring plane, with a restrained slow precession.
 float tilt=.17+.025*sin(t*.12);
 vec3 normal=normalize(vec3(0.,cos(tilt),sin(tilt)));
 float denom=dot(rd,normal);
 float rt=-dot(ro,normal)/denom;
 vec3 hit=ro+rd*rt;
 float radius=length(hit);
 float ringMask=step(.79,radius)*(1.-step(1.48,radius))*step(.01,rt);
 float band= .5+.5*sin(radius*145.+sin(radius*21.)*2.);
 float fine=.5+.5*sin(radius*390.);
 float gap=1.-.88*exp(-pow((radius-1.13)*42.,2.));
 float rings=ringMask*(.22+.42*band+.12*fine)*gap;
 float ringGlow=exp(-abs(radius-.8)*20.)*.16+exp(-abs(radius-1.47)*18.)*.12;

 // Sphere intersection and physically ordered ring occlusion.
 float b=dot(ro,rd), c=dot(ro,ro)-.47*.47;
 float disc=b*b-c;
 float sphereT=-b-sqrt(max(disc,0.));
 float sphereHit=step(0.,disc)*step(0.,sphereT);
 vec3 sp=ro+rd*sphereT;
 vec3 n=normalize(sp);
 float longitude=atan(n.z,n.x), latitude=asin(clamp(n.y,-1.,1.));
 vec3 surface=vec3(longitude*2.2,latitude*3.4,0.);
 float clouds=fbm(surface+vec3(t*.025,0.,0.));
 float bands=sin(latitude*38.+clouds*3.)*.5+.5;
 float mottling=fbm(surface*2.1+vec3(0.,t*.012,0.));
 vec3 planet=mix(vec3(.12,.125,.14),vec3(.43,.44,.47),smoothstep(.25,.8,mottling));
 planet*=.72+.28*bands;
 vec3 lightDir=normalize(vec3(-.7,.55,1.));
 float diffuse=max(dot(n,lightDir),0.);
 float rim=pow(1.-max(dot(n,normalize(ro-sp)),0.),3.);
 planet*=.16+.94*diffuse;
 planet+=vec3(.24,.26,.3)*rim*.45;
 float sphereVisible=sphereHit;
 col=mix(col,planet,sphereVisible);

 // Ring is behind the planet where the sphere is in front of the plane.
 float ringBehind=sphereHit*step(sphereT,rt);
 float ringVisible=rings*(1.-ringBehind);
 col+=vec3(.56,.59,.64)*(ringVisible*.58+ringGlow*ringVisible*.25);

 // Foreground ring segment, gently illuminated and slightly translucent.
 float ringFront=sphereHit*step(rt,sphereT);
 float frontVisible=rings*ringFront;
 col+=vec3(.68,.71,.76)*frontVisible*.78;

 // A soft, narrow scattering glow follows the ring plane.
 col+=vec3(.16,.19,.23)*exp(-abs(denom)*24.)*exp(-abs(radius-1.08)*2.4)*.12;
 float vignette=1.-smoothstep(.48,1.0,length(uv*vec2(.92,1.)));
 col*=vignette*uIntensity;
 outColor=vec4(col,1.);
}
`;

export default function SingularityVortexBackground({ quality="auto", paused=false, mouseInfluence=.35, intensity=.9 }: Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const mouse=useRef({x:0,y:0});
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:"high-performance"});
  if(!gl)return;
  const compile=(type:number,source:string)=>{
   const s=gl.createShader(type);if(!s)throw new Error("Shader allocation failed");
   gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s)||"Shader compile failed";gl.deleteShader(s);throw new Error(e);}
   return s;
  };
  let p:WebGLProgram|null=null,b:WebGLBuffer|null=null,frame=0,visible=!document.hidden&&!paused,lost=false,start=performance.now();
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  try{
   p=gl.createProgram();if(!p)throw new Error("Program allocation failed");
   const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
   gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||"Program link failed");
   b=gl.createBuffer();if(!b)throw new Error("Buffer allocation failed");
   gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(p,"aPosition");
   const uRes=gl.getUniformLocation(p,"uResolution"),uTime=gl.getUniformLocation(p,"uTime"),uMouse=gl.getUniformLocation(p,"uMouse"),uIntensity=gl.getUniformLocation(p,"uIntensity");
   const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,quality==="low"?.8:quality==="ultra"?1.5:1.15);const w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}};
   const pointer=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();mouse.current.x=((e.clientX-r.left)/r.width-.5)*2*mouseInfluence;mouse.current.y=-((e.clientY-r.top)/r.height-.5)*2*mouseInfluence;};
   const draw=(now:number)=>{if(!visible||lost||reduced.matches)return;resize();gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);gl.uniform2f(uRes,canvas.width,canvas.height);gl.uniform1f(uTime,(now-start)*.001);gl.uniform2f(uMouse,mouse.current.x,mouse.current.y);gl.uniform1f(uIntensity,intensity);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);frame=requestAnimationFrame(draw);};
   const stop=()=>cancelAnimationFrame(frame);
   const onVisibility=()=>{visible=!document.hidden&&!paused;if(visible&&!reduced.matches)frame=requestAnimationFrame(draw);else stop();};
   const onMotion=()=>{if(reduced.matches)stop();else if(visible)frame=requestAnimationFrame(draw);};
   const onLost=(e:Event)=>{e.preventDefault();lost=true;stop();};
   const onRestored=()=>{lost=false;start=performance.now();if(visible&&!reduced.matches)frame=requestAnimationFrame(draw);};
   canvas.addEventListener("pointermove",pointer,{passive:true});canvas.addEventListener("webglcontextlost",onLost);canvas.addEventListener("webglcontextrestored",onRestored);
   document.addEventListener("visibilitychange",onVisibility);reduced.addEventListener("change",onMotion);
   const observer=new ResizeObserver(resize);observer.observe(canvas);
   if(visible&&!reduced.matches)frame=requestAnimationFrame(draw);
   return()=>{stop();observer.disconnect();canvas.removeEventListener("pointermove",pointer);canvas.removeEventListener("webglcontextlost",onLost);canvas.removeEventListener("webglcontextrestored",onRestored);document.removeEventListener("visibilitychange",onVisibility);reduced.removeEventListener("change",onMotion);if(b)gl.deleteBuffer(b);if(p)gl.deleteProgram(p);};
  }catch(error){console.error("Jayver loading scene unavailable:",error);if(b)gl.deleteBuffer(b);if(p)gl.deleteProgram(p);}
 },[quality,paused,mouseInfluence,intensity]);
 return <canvas ref={canvasRef} className="startup-particles singularity-vortex" aria-hidden="true"/>;
}
