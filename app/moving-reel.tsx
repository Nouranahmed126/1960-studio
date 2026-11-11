"use client";
import {ReactNode,useEffect,useRef,useState} from "react";
export default function MovingReel({children,direction,label}:{children:ReactNode;direction:"left"|"right";label:string}){
 const viewport=useRef<HTMLDivElement>(null),track=useRef<HTMLDivElement>(null),first=useRef<HTMLDivElement>(null);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  const el=track.current,group=first.current,container=viewport.current;if(!el||!group||!container)return;
  let frame=0,last=0,offset=0,unit=0;const speed=direction==="left"?28:25;
  const measure=()=>{unit=group.getBoundingClientRect().width; if(unit>0)offset=((offset%unit)+unit)%unit;};
  const observer=new ResizeObserver(measure);observer.observe(group);observer.observe(container);measure();
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
  const tick=(time:number)=>{const dt=last?Math.min((time-last)/1000,.05):0;last=time;
   if(unit>0&&!paused&&!reduce.matches&&!document.hidden){offset=(offset+speed*dt)%unit;el.style.transform=direction==="left"?`translate3d(${-offset}px,0,0)`:`translate3d(${offset-unit}px,0,0)`;}
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();el.style.transform=""};
 },[children,direction,paused]);
 return <div ref={viewport} className="marquee-wrapper cinema-loop-window js-reel" dir="ltr" aria-label={label} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
  <div ref={track} className="marquee-track js-reel-track" dir="ltr"><div ref={first} className="cinema-loop-group js-reel-group">{children}</div><div className="cinema-loop-group js-reel-group" aria-hidden="true">{children}</div><div className="cinema-loop-group js-reel-group" aria-hidden="true">{children}</div></div>
 </div>;
}
