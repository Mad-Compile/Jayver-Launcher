import { useEffect, useRef } from "react";
import { IdleAnimation, SkinViewer } from "skinview3d";
import { DEFAULT_SKIN_URL } from "@/lib/skin";

export default function SkinHero(){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  let viewer:SkinViewer|undefined;let disposed=false;
  try{
   viewer=new SkinViewer({canvas:element,width:520,height:650,skin:DEFAULT_SKIN_URL,alpha:true,zoom:0.86,pixelRatio:1.25,enableControls:true});
   viewer.background=null;viewer.autoRotate=true;viewer.autoRotateSpeed=.42;
   viewer.globalLight.intensity=2.1;viewer.cameraLight.intensity=.55;
   viewer.animation=new IdleAnimation();
   const resize=()=>{if(!viewer)return;const rect=element.getBoundingClientRect();viewer.width=Math.max(1,Math.floor(rect.width));viewer.height=Math.max(1,Math.floor(rect.height));};
   const observer=new ResizeObserver(resize);observer.observe(element);resize();
   return()=>{disposed=true;observer.disconnect();viewer?.dispose();};
  }catch{if(!disposed)viewer?.dispose();}
 },[]);
 return <div className="skin-hero" aria-label="3D Minecraft character preview"><canvas ref={canvas}/><div className="skin-hero-floor" aria-hidden="true"/></div>;
}
