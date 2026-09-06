import * as THREE from 'three';
export function seeded(seed=19){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function fallbackTexture(body){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d'),rand=seeded(body.id.split('').reduce((n,s)=>n+s.charCodeAt(0),0));
  c.fillStyle=body.color;c.fillRect(0,0,512,256);
  if(body.giant||body.id==='venus'||body.id==='titan'){
    for(let y=0;y<256;y++){const wave=Math.sin(y*.13)+.5*Math.sin(y*.42);c.fillStyle=`rgba(${wave>0?'255,230,198':'47,42,36'},${Math.abs(wave)*.12})`;c.fillRect(0,y,512,1);}
    if(body.id==='jupiter'){c.fillStyle='#a76448';c.beginPath();c.ellipse(340,159,30,12,-.14,0,Math.PI*2);c.fill();}
  }else{
    for(let n=0;n<1200;n++){const x=rand()*512,y=rand()*256,r=rand()*9+1;c.fillStyle=`rgba(${rand()>.45?'225,226,222':'30,28,26'},${rand()*.2})`;c.beginPath();c.ellipse(x,y,r*1.4,r,0,0,Math.PI*2);c.fill();if(n%3===0){c.strokeStyle='rgba(240,238,225,.16)';c.stroke();}}
    if(body.id==='earth'){c.fillStyle='#185482';c.fillRect(0,0,512,256);c.fillStyle='#71865c';const paths=[[[30,55],[70,32],[128,52],[107,86],[78,99],[65,120],[40,95]],[[98,120],[146,132],[149,173],[124,219],[109,180]],[[222,65],[257,50],[292,76],[277,120],[250,174],[223,125]],[[270,49],[334,24],[447,61],[420,103],[343,99],[308,84]],[[413,157],[462,158],[479,184],[441,196]]];for(const p of paths){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}c.fillStyle='#eee';c.fillRect(0,240,512,16);}
    if(body.id==='moon'){c.fillStyle='rgba(40,41,45,.32)';for(const[x,y,r]of[[155,94,27],[202,67,24],[235,112,35],[166,128,24]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}}
    if(body.id==='mars'){c.fillStyle='#e6d7c3';c.fillRect(0,0,512,11);c.fillRect(0,247,512,9);}
    if(body.id==='europa'){c.strokeStyle='#8a5d41';for(let n=0;n<28;n++){c.beginPath();c.moveTo(rand()*512,rand()*256);c.bezierCurveTo(rand()*512,rand()*256,rand()*512,rand()*256,rand()*512,rand()*256);c.stroke();}}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const vertex=`varying vec2 vUv;varying vec3 vNormalW;varying vec3 vPositionW;void main(){vUv=uv;vNormalW=normalize(mat3(modelMatrix)*normal);vPositionW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export function surfaceMaterial(body,texture){return new THREE.ShaderMaterial({uniforms:{map:{value:texture},lightDir:{value:new THREE.Vector3(1,0,0)},ambient:{value:.12},enhanced:{value:1},star:{value:body.id==='sun'?1:0},cloud:{value:0},ocean:{value:body.id==='earth'?1:0}},vertexShader:vertex,fragmentShader:`
uniform sampler2D map;uniform vec3 lightDir;uniform float ambient;uniform float enhanced;uniform float star;uniform float ocean;uniform float cloud;
varying vec2 vUv;varying vec3 vNormalW;varying vec3 vPositionW;
void main(){vec3 tex=texture2D(map,vUv).rgb;float grey=dot(tex,vec3(.2126,.7152,.0722));tex=mix(mix(vec3(grey),tex,.79),tex,enhanced);
vec3 n=normalize(vNormalW),l=normalize(lightDir);float day=max(0.,dot(n,l));vec3 color=tex*(ambient+day*1.35);
if(ocean>.5){float water=smoothstep(.02,.13,tex.b-tex.r);vec3 h=normalize(l+normalize(cameraPosition-vPositionW));color+=vec3(.46,.58,.67)*pow(max(0.,dot(n,h)),56.)*water*day*.55;}
if(star>.5)color=tex*1.15+vec3(.15,.055,.008);gl_FragColor=vec4(color,cloud>.5?clamp(dot(tex,vec3(.333))*.65,0.,.65):1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});}
export function atmosphereMaterial(color){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color(color)},lightDir:{value:new THREE.Vector3(1,0,0)}},vertexShader:vertex,fragmentShader:`uniform vec3 color;uniform vec3 lightDir;varying vec3 vNormalW;varying vec3 vPositionW;void main(){vec3 n=normalize(vNormalW);float f=pow(1.-abs(dot(n,normalize(cameraPosition-vPositionW))),3.);float lit=.15+.6*max(0.,dot(n,lightDir));gl_FragColor=vec4(color,f*lit*.5);}`});}
export function glowTexture(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createRadialGradient(128,128,4,128,128,128);g.addColorStop(0,'rgba(255,204,117,.8)');g.addColorStop(.18,'rgba(255,165,64,.2)');g.addColorStop(.45,'rgba(200,111,41,.04)');g.addColorStop(1,'rgba(200,90,20,0)');x.fillStyle=g;x.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);}
export function ringMaterial(body){return new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{color:{value:new THREE.Color(body.color)},lightDir:{value:new THREE.Vector3(1,0,0)},radius:{value:1},center:{value:new THREE.Vector3()},faint:{value:body.id==='saturn'?1:.15}},vertexShader:vertex,fragmentShader:`uniform vec3 color;uniform vec3 lightDir;uniform vec3 center;uniform float radius;uniform float faint;varying vec2 vUv;varying vec3 vNormalW;varying vec3 vPositionW;void main(){float r=length(vPositionW-center)/radius;float bands=.58+.12*sin(r*72.)+.06*sin(r*143.);float gap=1.-smoothstep(1.93,1.96,r)*(1.-smoothstep(2.04,2.07,r));float a=bands*gap*faint;
vec3 rel=vPositionW-center;float t=dot(-rel,lightDir);float shadow=t>0.&&length(rel+lightDir*t)<radius? .13:1.;float light=.4+.6*abs(dot(normalize(vNormalW),lightDir));gl_FragColor=vec4(color*light*shadow,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});}
