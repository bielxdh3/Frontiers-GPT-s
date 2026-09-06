import { AU, DAY, G, C, EPOCH, START, MIN_DATE, MAX_DATE, ELEMENTS, bodies, byId } from './data.js';
export const TAU=Math.PI*2, RAD=Math.PI/180;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const length=v=>Math.hypot(...v);
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const multiply=(v,s)=>v.map(x=>x*s);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function solveKepler(M,e,maxIterations=32){
  if(!Number.isFinite(M)||!Number.isFinite(e)||e<0||e>=1)throw new RangeError('Bound elliptic orbits require 0 ≤ e < 1');
  M=((M+Math.PI)%TAU+TAU)%TAU-Math.PI;
  let E=e<.8?M:Math.sign(M||1)*Math.PI;
  for(let n=0;n<maxIterations;n++){const step=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=step;if(Math.abs(step)<1e-12)return E;}
  throw new Error('Kepler solver did not converge');
}
export function orbitPoint(a,e,inclination,node,argument,M){
  const E=solveKepler(M,e),x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(argument),sw=Math.sin(argument),cn=Math.cos(node),sn=Math.sin(node),ci=Math.cos(inclination),si=Math.sin(inclination);
  return [(cw*cn-sw*sn*ci)*x+(-sw*cn-cw*sn*ci)*y,(cw*sn+sw*cn*ci)*x+(-sw*sn+cw*cn*ci)*y,sw*si*x+cw*si*y];
}
export function elementsAt(id,time){
  if(!byId[id]||byId[id].type==='region')throw Error('Unsupported body');
  const T=(time-EPOCH)/(DAY*1000*36525),b=byId[id];
  if(ELEMENTS[id]){const [start,rate]=ELEMENTS[id],[a,e,i,L,p,n]=start.map((v,k)=>v+rate[k]*T);return {a:a*AU,e,i:i*RAD,node:n*RAD,argument:(p-n)*RAD,M:(L-p)*RAD};}
  const index=bodies.findIndex(x=>x.id===id);
  return {a:b.a||0,e:b.e||0,i:(b.i||0)*RAD,node:id==='moon'?125.08*RAD:(index*43%360)*RAD,argument:id==='moon'?318.15*RAD:(index*61%360)*RAD,M:((id==='moon'?135.27: index*137.508)*RAD)+(time-EPOCH)/(DAY*1000*(b.period||1))*TAU};
}
export function localPosition(id,time,anomaly){const b=byId[id];if(!b||b.type==='region')throw Error('Unsupported position');if(id==='sun')return [0,0,0];const el=elementsAt(id,time);let p=orbitPoint(el.a,el.e,el.i,el.node,el.argument,anomaly??el.M);
  if(b.type==='moon'&&id!=='moon'){const tilt=(byId[b.parent].tilt||0)*RAD; const [x,y,z]=p;p=[x,y*Math.cos(tilt)-z*Math.sin(tilt),y*Math.sin(tilt)+z*Math.cos(tilt)];}
  return p;
}
export function positionsAt(time){
  if(!Number.isFinite(time)||time<MIN_DATE||time>MAX_DATE)throw new RangeError('Supported dates: 1800-01-01 to 2050-01-01 UTC');
  const positions={sun:[0,0,0]}, local={sun:[0,0,0]};
  for(const b of bodies.filter(b=>b.parent==='sun'))positions[b.id]=local[b.id]=localPosition(b.id,time);
  for(const b of bodies.filter(b=>b.type==='moon')){local[b.id]=localPosition(b.id,time);positions[b.id]=add(positions[b.parent],local[b.id]);}
  return {positions,local};
}
// Ecliptic J2000 (x,y,z) -> render (x,z,-y); +Y is ecliptic north.
export const toWorld=([x,y,z])=>[x,z,-y];
export function displayRadius(body,scale='explore'){return scale==='relative'?body.radius/AU*4:body.id==='sun'?9:body.type==='moon'?Math.max(.26,.85*Math.sqrt(body.radius/1737.4)):body.type==='comet'?.6:1.1+1.4*Math.sqrt(body.radius/6371.0084);}
export function displayLocal(body,local,scale='explore'){
  if(scale==='relative')return toWorld(multiply(local,4/AU));
  const r=length(local);if(!r)return [0,0,0];let d;
  if(body.type==='moon'){const parentRadius=displayRadius(byId[body.parent]);d=parentRadius*2.9+3.4*Math.log1p(r/Math.max(5000,byId[body.parent].radius));}
  else d=18+28*Math.log1p(r/AU*1.8);
  return toWorld(multiply(local,d/r));
}
export function displayPositions(state,scale){const out={sun:[0,0,0]};for(const b of bodies.filter(b=>b.parent==='sun'))out[b.id]=displayLocal(b,state.local[b.id],scale);for(const b of bodies.filter(b=>b.type==='moon'))out[b.id]=add(out[b.parent],displayLocal(b,state.local[b.id],scale));return out;}
export function distanceAt(a,b,time){const p=positionsAt(time).positions;if(!p[a]||!p[b])throw Error('Unsupported measurement endpoint');const km=length(sub(p[a],p[b]));return {km,au:km/AU,seconds:km/C,time,a,b};}
export function angularSeparation(a,b,observer,time){const p=positionsAt(time).positions;if(!p[a]||!p[b]||!p[observer])return null;const u=sub(p[a],p[observer]),v=sub(p[b],p[observer]);if(!length(u)||!length(v))return null;return Math.acos(clamp(dot(u,v)/(length(u)*length(v)),-1,1))/RAD;}
export function velocityAt(id,time){const h=1e3,t1=clamp(time-h,MIN_DATE,MAX_DATE),t2=clamp(time+h,MIN_DATE,MAX_DATE);return multiply(sub(positionsAt(t2).positions[id],positionsAt(t1).positions[id]),1000/(t2-t1));}
export function gravity(mass,radiusKm){if(!(mass>0)||!(radiusKm>0)||!Number.isFinite(mass+radiusKm))throw new RangeError('Positive finite mass and radius required');return G*mass/(radiusKm*1000)**2;}
export function orbitExperiment(massSolar,aAU,e,testMass=70){if(![massSolar,aAU,e,testMass].every(Number.isFinite)||massSolar<.1||massSolar>5||aAU<.1||aAU>10||e<0||e>.9||testMass<=0||testMass>10000)throw new RangeError('Invalid experiment');const mu=G*byId.sun.mass*massSolar,a=aAU*AU*1000,T=TAU*Math.sqrt(a**3/mu);return {period:T,perihelion:aAU*(1-e),aphelion:aAU*(1+e),vPeri:Math.sqrt(mu*(1+e)/(a*(1-e)))/1000,vApo:Math.sqrt(mu*(1-e)/(a*(1+e)))/1000,testMass};}
export function daylight(tilt,latitude,phase){const delta=Math.asin(Math.sin(tilt*RAD)*Math.sin(phase*RAD));const phi=latitude*RAD;const s=Math.sin(phi)*Math.sin(delta),c=Math.cos(phi)*Math.cos(delta);let hours;if(Math.abs(c)<1e-12)hours=Math.abs(s)<1e-12?12:s>0?24:0;else{const q=-s/c;hours=q<=-1?24:q>=1?0:24*Math.acos(q)/Math.PI;}return {declination:delta/RAD,hours,north:delta>1e-6?'summer':delta< -1e-6?'winter':'equinox',south:delta>1e-6?'winter':delta< -1e-6?'summer':'equinox'};}
export function lunarPhase(angle){const a=((angle%360)+360)%360;return {fraction:(1-Math.cos(a*RAD))/2,waxing:a<180,index:Math.round(a/45)%8};}
export function apparentDiameter(radius,distance){return distance>radius?2*Math.asin(radius/distance)/RAD:null;}
export function parseRate(value){if(typeof value==='string'){if(!value.trim())throw Error('Enter a finite rate');value=Number(value.replace(',','.'));}if(!Number.isFinite(value)||Math.abs(value)>31557600)throw new RangeError('Rate must be within ±31,557,600×');return value;}
export class Clock {
  constructor(time=START){this.start=time;this.time=time;this.speed=DAY;this.direction=1;this.paused=false;this.hidden=false;this.boundary=false;}
  advance(elapsed){if(this.paused||this.hidden||!Number.isFinite(elapsed))return;const next=this.time+clamp(elapsed,0,.25)*1000*this.speed*this.direction;this.time=clamp(next,MIN_DATE,MAX_DATE);this.boundary=next<MIN_DATE||next>MAX_DATE;if(this.boundary)this.paused=true;}
  rate(value){const rate=parseRate(value);if(rate===0){this.paused=true;return;}this.speed=Math.abs(rate);this.direction=Math.sign(rate);}
  step(seconds){if(!Number.isFinite(seconds))throw Error('Invalid step');this.time=clamp(this.time+seconds*1000,MIN_DATE,MAX_DATE);this.paused=true;}
  jump(time){if(!Number.isFinite(time)||time<MIN_DATE||time>MAX_DATE)throw Error('Date outside supported interval');this.time=time;this.boundary=false;}
  reset(){this.time=this.start;this.speed=DAY;this.direction=1;this.paused=false;this.boundary=false;}
}
