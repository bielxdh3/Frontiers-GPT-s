import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bodies,byId,planets,children,AU,DAY,MIN_DATE,MAX_DATE } from './data.js';
import { positionsAt,displayPositions,displayRadius,displayLocal,localPosition,toWorld,velocityAt,clamp,length,sub,TAU,RAD } from './model.js';
import { seeded,fallbackTexture,surfaceMaterial,atmosphereMaterial,glowTexture,ringMaterial } from './materials.js';

const vector=a=>new THREE.Vector3(...a);
export class ObservatoryScene{
  constructor(host,labels,state,callbacks){
    this.host=host;this.labelHost=labels;this.state=state;this.cb=callbacks;this.objects={};this.paths={};this.labelElements={};this.assets={};this.failedAssets=[];this.mode='overview';this.targetId='sun';this.system=null;this.history=[];this.historyIndex=-1;this.transition=null;this.lastTarget=new THREE.Vector3();this.insets={left:0,right:0,top:0,bottom:0};this.lost=false;this.frames=[];this.fps=0;this.qualityFactor=1;this.lastQualityChange=0;this.assetPromises=[];
    try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch(error){this.failed=true;this.cb.error('webgl');return;}
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.setClearColor('#070b12');
    host.append(this.renderer.domElement);this.renderer.domElement.tabIndex=0;this.renderer.domElement.setAttribute('aria-label','Câmera 3D / 3D camera');
    this.world=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(42,1,.01,12000);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.maxDistance=1800;this.controls.enablePan=true;this.controls.zoomSpeed=.65;
    this.controls.addEventListener('start',()=>{this.transition=null;this.cb.manual();});this.controls.addEventListener('end',()=>this.recordHistory());
    this.geometries={high:new THREE.SphereGeometry(1,64,40),medium:new THREE.SphereGeometry(1,40,24),low:new THREE.SphereGeometry(1,24,16)};
    for(const body of bodies)this.makeBody(body);
    this.createBackdrop();this.createOverlays();this.bindPointer();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.cb.error('context');});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false;this.cb.recovered();});
    this.updatePositions();this.overview(false);this.resize();
  }
  makeBody(body){
    const group=new THREE.Group(),axis=new THREE.Group();axis.rotation.z=(body.tilt||0)*RAD;group.add(axis);this.world.add(group);
    const texture=fallbackTexture(body),material=surfaceMaterial(body,texture);this.assets[body.id]=texture;
    let geometry=this.geometries.high;
    if(['vesta','phobos','deimos','comet','haumea'].includes(body.id)){geometry=new THREE.IcosahedronGeometry(1,3);const p=geometry.attributes.position;const rand=seeded(body.id.length*741);for(let i=0;i<p.count;i++){const factor=body.shapeAxes?1:.94+rand()*.1;p.setXYZ(i,p.getX(i)*factor*(body.shapeAxes?.[0]||1.16),p.getY(i)*factor*(body.shapeAxes?.[1]||.83),p.getZ(i)*factor*(body.shapeAxes?.[2]||1));}geometry.computeVertexNormals();}
    const mesh=new THREE.Mesh(geometry,material);mesh.userData.body=body.id;axis.add(mesh);
    const obj={group,axis,mesh,material,body};this.objects[body.id]=obj;
    if(['earth','mars','venus','titan','neptune','uranus'].includes(body.id)){const atmosphere=new THREE.Mesh(this.geometries.medium,atmosphereMaterial(body.id==='earth'?'#619dff':body.color));atmosphere.scale.setScalar(1.035);axis.add(atmosphere);obj.atmosphere=atmosphere;}
    if(body.id==='sun'){const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.setScalar(85);group.add(glow);obj.glow=glow;}
    if(body.giant){const rings=new THREE.Mesh(new THREE.RingGeometry(1.24,body.id==='saturn'?2.33:1.95,192,3),ringMaterial(body));rings.rotation.x=-Math.PI/2;axis.add(rings);obj.rings=rings;}
    if(body.id==='earth'){
      const cloudTex=this.makeCloudFallback();const cloudMaterial=surfaceMaterial({...body,id:'cloud'},cloudTex);cloudMaterial.transparent=true;cloudMaterial.depthWrite=false;cloudMaterial.uniforms.cloud.value=1;const clouds=new THREE.Mesh(this.geometries.medium,cloudMaterial);clouds.scale.setScalar(1.008);axis.add(clouds);obj.clouds=clouds;
      const cp=new THREE.TextureLoader().loadAsync('/assets/earth_clouds.jpg').then(t=>{t.colorSpace=THREE.SRGBColorSpace;clouds.material.uniforms.map.value=t;cloudTex.dispose();clouds.material.needsUpdate=true;}).catch(()=>{});this.assetPromises.push(cp);
    }
    if(body.texture){const p=new THREE.TextureLoader().loadAsync(`/assets/${body.texture}.jpg`).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());texture.dispose();material.uniforms.map.value=t;this.assets[body.id]=t;}).catch(()=>{this.failedAssets.push(body.id);});this.assetPromises.push(p);}
    const label=document.createElement('span');label.className='planet-label';label.dataset.body=body.id;label.setAttribute('aria-hidden','true');this.labelHost.append(label);this.labelElements[body.id]=label;
    if(body.id!=='sun'){const line=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:body.type==='moon'?'#68808c':'#527080',transparent:true,opacity:.2,depthWrite:false}));this.world.add(line);this.paths[body.id]=line;}
  }
  async retryAssets(){if(this.failed)return;await Promise.all([...this.failedAssets].map(async id=>{try{const t=await new THREE.TextureLoader().loadAsync('/assets/'+byId[id].texture+'.jpg');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.assets[id].dispose();this.assets[id]=t;this.objects[id].material.uniforms.map.value=t;this.failedAssets=this.failedAssets.filter(x=>x!==id);}catch{}}));}
  makeCloudFallback(){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,256,128);x.fillStyle='#fff';const r=seeded(721);for(let i=0;i<50;i++){x.beginPath();x.ellipse(r()*256,r()*128,12+r()*22,1+r()*5,-.25,0,TAU);x.fill();}return new THREE.CanvasTexture(c);}
  createBackdrop(){
    const rand=seeded(91231),vertices=[],colors=[];for(let n=0;n<2600;n++){const y=rand()*2-1,a=rand()*TAU,s=Math.sqrt(1-y*y);vertices.push(Math.cos(a)*s*5000,y*5000,Math.sin(a)*s*5000);const b=.25+rand()*.65;colors.push(b*(.85+rand()*.15),b*(.9+rand()*.1),b);}
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.stars=new THREE.Points(geom,new THREE.PointsMaterial({size:1.05,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.6,depthWrite:false}));this.world.add(this.stars);
    this.belts={};for(const [id,low,high,count]of[['belt',2.1,3.3,1000],['kuiper',30,50,700]]){const a=[];for(let i=0;i<count;i++){const angle=rand()*TAU,r=low+rand()*(high-low);a.push(r*Math.cos(angle)*AU,r*Math.sin(angle)*AU,(rand()-.5)*r*AU*.07);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(a.length),3));const points=new THREE.Points(g,new THREE.PointsMaterial({color:id==='belt'?'#8c918f':'#628898',size:1.05,sizeAttenuation:false,transparent:true,opacity:.35}));this.world.add(points);this.belts[id]={points,physical:a};}
  }
  createOverlays(){
    this.grid=new THREE.GridHelper(340,20,'#527481','#233441');this.grid.material.transparent=true;this.grid.material.opacity=.18;this.grid.material.depthWrite=false;this.world.add(this.grid);
    this.axes=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),10,'#a1d7df',1,.5);this.world.add(this.axes);
    this.velocity=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),10,'#dab47b',1,.5);this.world.add(this.velocity);
    this.ruler=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:'#e6c288',dashSize:2,gapSize:1,transparent:true,opacity:.8}));this.world.add(this.ruler);
    this.trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#dbb572',transparent:true,opacity:.55,depthWrite:false}));this.world.add(this.trail);this.trailKey='';
    this.markers=['peri','apo','node'].map((type,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.6,10,6),new THREE.MeshBasicMaterial({color:i===0?'#e4bc7f':i===1?'#81c7dd':'#ddd'}));mesh.userData.marker=type;this.world.add(mesh);return mesh;});
    this.lockLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:'#8fe1d9',dashSize:1,gapSize:.5}));this.world.add(this.lockLine);
    this.cometTail=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3)),new THREE.LineBasicMaterial({color:'#83d5e8',transparent:true,opacity:.5}));this.world.add(this.cometTail);
    this.dustTail=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(75),3)),new THREE.LineBasicMaterial({color:'#d4c6a5',transparent:true,opacity:.5}));this.world.add(this.dustTail);
    this.pulse=new THREE.Mesh(new THREE.SphereGeometry(.8,12,8),new THREE.MeshBasicMaterial({color:'#fff1b3'}));this.world.add(this.pulse);this.pulse.visible=false;
  }
  bindPointer(){
    const canvas=this.renderer.domElement;let down=null;
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};});
    canvas.addEventListener('pointerup',e=>{if(!down||e.pointerId!==down.id||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7){down=null;return;}down=null;const hits=this.pick(e.clientX,e.clientY);if(hits.length)this.cb.select(hits,e.detail>1);});
    canvas.addEventListener('dblclick',e=>{const hits=this.pick(e.clientX,e.clientY);if(hits.length)this.cb.focus(hits[0]);});
    canvas.addEventListener('keydown',e=>{const angles={ArrowLeft:[.13,0],ArrowRight:[-.13,0],ArrowUp:[0,-.13],ArrowDown:[0,.13]};if(angles[e.key]){e.preventDefault();this.nudge(...angles[e.key]);}if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?1.2:.83);}});
  }
  pick(x,y){
    const rect=this.renderer.domElement.getBoundingClientRect(),nx=(x-rect.left)/rect.width*2-1,ny=-(y-rect.top)/rect.height*2+1,ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(nx,ny),this.camera);
    const exact=ray.intersectObjects(Object.values(this.objects).filter(o=>o.group.visible).flatMap(o=>o.rings?[o.mesh,o.rings]:[o.mesh]),false).map(h=>h.object.userData.body||h.object.parent.children[0]?.userData.body).filter(Boolean);
    const small=[];for(const b of bodies){if(!this.objects[b.id].group.visible)continue;const p=vector(this.display[b.id]).project(this.camera);if(p.z>1||p.z< -1)continue;const distance=Math.hypot((p.x-nx)*rect.width/2,(p.y-ny)*rect.height/2);if(distance<14)small.push({id:b.id,distance});}
    return [...new Set([...small.sort((a,b)=>a.distance-b.distance).map(x=>x.id),...exact])].slice(0,5);
  }
  updatePositions(){this.physical=positionsAt(this.state.clock.time);this.display=displayPositions(this.physical,this.state.prefs.scale);for(const b of bodies){const obj=this.objects[b.id],r=displayRadius(b,this.state.prefs.scale);obj.group.position.fromArray(this.display[b.id]);obj.axis.scale.setScalar(r);obj.material.uniforms.lightDir.value.fromArray(toWorld(this.physical.positions[b.id])).negate().normalize();if(obj.atmosphere)obj.atmosphere.material.uniforms.lightDir.value.copy(obj.material.uniforms.lightDir.value);if(obj.rings){obj.rings.material.uniforms.lightDir.value.copy(obj.material.uniforms.lightDir.value);obj.rings.material.uniforms.radius.value=r;obj.rings.material.uniforms.center.value.copy(obj.group.position);}if(obj.glow)obj.glow.scale.setScalar(r*9.5);}
  }
  refreshPaths(){
    const scale=this.state.prefs.scale,time=this.state.clock.time;
    for(const b of bodies){if(!this.paths[b.id])continue;const pts=[];for(let i=0;i<192;i++)pts.push(vector(displayLocal(b,localPosition(b.id,time,TAU*i/192),scale)));this.paths[b.id].geometry.dispose();this.paths[b.id].geometry=new THREE.BufferGeometry().setFromPoints(pts);}
    for(const [id,entry]of Object.entries(this.belts)){const a=entry.points.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=displayLocal({type:'region'},entry.physical.slice(i*3,i*3+3),scale);a.setXYZ(i,...p);}a.needsUpdate=true;entry.points.geometry.computeBoundingSphere();}
    this.pathDate=time;this.pathScale=scale;
  }
  tick(realDelta,now){
    if(this.failed||this.lost)return;
    this.updatePositions();const p=this.state.prefs,selected=this.state.selected,body=byId[selected];
    if(this.pathScale!==p.scale||!this.pathDate||Math.abs(this.state.clock.time-this.pathDate)>DAY*1000*7)this.refreshPaths();
    const localParent=this.system||((body?.type==='moon')?body.parent:null);
    for(const b of bodies){const o=this.objects[b.id];const localView=['focus','follow','system'].includes(this.mode);const visible=localView?(b.id===this.targetId||b.id===selected||b.parent===localParent||body?.type==='moon'&&b.id===body.parent):(b.type==='planet'||b.type==='star'||b.id===selected||b.parent===localParent||(p.smallBodies&&b.parent==='sun'));o.group.visible=visible;
      // Tilt encodes retrograde poles; absolute sidereal spin avoids applying reversal twice.
      o.mesh.rotation.y=((this.state.clock.time/(DAY*1000*Math.abs(b.rotation||1)))%1)*TAU;
      if(b.type==='moon'){const parent=vector(this.display[b.parent]);o.mesh.lookAt(parent);}
      o.material.uniforms.ambient.value=p.presentation==='enhanced'?.17:.055;o.material.uniforms.enhanced.value=p.presentation==='enhanced'?1:0;
      if(o.clouds){o.clouds.rotation.y=o.mesh.rotation.y+.11;o.clouds.material.uniforms.lightDir.value.copy(o.material.uniforms.lightDir.value);o.clouds.material.uniforms.ambient.value=o.material.uniforms.ambient.value;o.clouds.visible=p.quality!=='low';}
      if(this.paths[b.id]){const line=this.paths[b.id];line.visible=visible&&p.orbits!=='none'&&(p.orbits==='all'||p.orbits==='selected'&&b.id===selected||p.orbits==='system'&&(b.parent===(localParent||selected)||b.id===selected));line.material.opacity=b.id===selected?.38:.14;if(b.type==='moon')line.position.fromArray(this.display[b.parent]);}
    }
    const target=vector(this.display[this.targetId]||[0,0,0]);
    if(['focus','follow','system'].includes(this.mode)){const delta=target.clone().sub(this.lastTarget);this.camera.position.add(delta);this.controls.target.add(delta);}
    this.lastTarget.copy(target);
    if(this.transition){const t=clamp((now-this.transition.start)/this.transition.duration,0,1),e=t*t*(3-2*t);this.controls.target.lerpVectors(this.transition.fromTarget,target,e);const dest=target.clone().add(this.transition.offset);this.camera.position.lerpVectors(this.transition.fromCamera,dest,e);if(t===1){this.transition=null;this.cb.travel();}}
    this.controls.update();this.stars.position.copy(this.camera.position);this.stars.material.opacity=p.background;this.renderer.toneMappingExposure=p.exposure;this.grid.visible=p.grid;
    for(const [id,entry]of Object.entries(this.belts))entry.points.visible=!!p[id];
    this.axes.visible=p.axes&&!!body?.radius;this.velocity.visible=p.velocity&&!!body?.radius;
    if(body?.radius){const center=vector(this.display[selected]),r=displayRadius(body,p.scale);this.axes.position.copy(center);this.axes.setDirection(new THREE.Vector3(-Math.sin((body.tilt||0)*RAD),Math.cos((body.tilt||0)*RAD),0));this.axes.setLength(Math.max(r*2.3,p.scale==='relative'?.001:4),r*.3,r*.12);if(p.velocity){const v=vector(toWorld(velocityAt(selected,this.state.clock.time)));this.velocity.position.copy(center);this.velocity.setDirection(v.normalize());this.velocity.setLength(Math.max(r*2, p.scale==='relative'?.001:6),r*.3,r*.15);}}
    this.updateExtras(now);
    this.renderer.render(this.world,this.camera);this.updateLabels(now);this.measurePerformance(realDelta,now);
  }
  updateExtras(now){
    const p=this.state.prefs,b=byId[this.state.selected];
    this.ruler.visible=!!this.state.measurement;
    if(this.state.measurement){const m=this.state.measurement;let disp=this.display;if(m.frozen)disp=displayPositions(positionsAt(m.time),p.scale);const a=vector(disp[m.a]),z=vector(disp[m.b]);const attr=this.ruler.geometry.attributes.position;attr.setXYZ(0,...a.toArray());attr.setXYZ(1,...z.toArray());attr.needsUpdate=true;this.ruler.computeLineDistances();if(this.pulseStart){const progress=(now-this.pulseStart)/5000;this.pulse.visible=progress<=1;if(progress<=1)this.pulse.position.lerpVectors(a,z,progress);else this.pulseStart=0;}}else this.pulse.visible=false;
    this.lockLine.visible=!!(this.state.tidal&&b.type==='moon');if(this.lockLine.visible){const a=this.lockLine.geometry.attributes.position;a.setXYZ(0,...this.display[b.id]);a.setXYZ(1,...this.display[b.parent]);a.needsUpdate=true;this.lockLine.computeLineDistances();}
    const key=[b.id,p.trails,p.trailDays,p.scale,Math.floor(this.state.clock.time/(DAY*1000))].join('|');this.trail.visible=p.trails&&b.id!=='sun'&&b.type!=='region';if(this.trail.visible&&key!==this.trailKey){const points=[];for(let i=0;i<=100;i++){const time=clamp(this.state.clock.time-p.trailDays*DAY*1000*(1-i/100),MIN_DATE,MAX_DATE);points.push(vector(displayPositions(positionsAt(time),p.scale)[b.id]));}this.trail.geometry.dispose();this.trail.geometry=new THREE.BufferGeometry().setFromPoints(points);this.trailKey=key;}
    for(let i=0;i<this.markers.length;i++){const m=this.markers[i];m.visible=i<2&&p.nodes&&b.id!=='sun'&&b.type!=='region';if(m.visible){const a=i===0?0:i===1?Math.PI: -((b.i||0)*RAD);const pos=displayLocal(b,localPosition(b.id,this.state.clock.time,a),p.scale);m.position.fromArray(pos);if(b.type==='moon')m.position.add(vector(this.display[b.parent]));m.scale.setScalar(p.scale==='relative'?.01:1);}}
    const c=this.objects.comet;this.cometTail.visible=this.dustTail.visible=c.group.visible;if(c.group.visible){const origin=c.group.position,away=origin.clone().normalize(),activity=clamp(4/(length(this.physical.positions.comet)/AU)**2,.03,1),tail=16*activity*(p.scale==='relative'?.008:1),ion=this.cometTail.geometry.attributes.position,dust=this.dustTail.geometry.attributes.position;ion.setXYZ(0,origin.x,origin.y,origin.z);ion.setXYZ(1,origin.x+away.x*tail,origin.y+away.y*tail,origin.z+away.z*tail);for(let i=0;i<=24;i++){const f=i/24,along=tail*f*.8,curve=tail*f*f*.4;dust.setXYZ(i,origin.x+away.x*along-away.z*curve,origin.y+away.y*along,origin.z+away.z*along+away.x*curve);}ion.needsUpdate=dust.needsUpdate=true;this.cometTail.geometry.computeBoundingSphere();this.dustTail.geometry.computeBoundingSphere();}
  }
  updateLabels(now){
    if(now-(this.lastLabels||0)<80)return;this.lastLabels=now;const {width:w,height:h}=this.host.getBoundingClientRect(),p=this.state.prefs,selected=this.state.selected,boxes=[],prioritized=[...bodies].sort((a,b)=>(b.id===selected?100:b.parent===selected?50:b.type==='planet'?20:0)-(a.id===selected?100:a.parent===selected?50:a.type==='planet'?20:0));
    const blockers=[...document.querySelectorAll('#inspector,#navigator,#hero,#timebar,#view-controls,#photobar,#tourbar,#activitybar')].filter(el=>!el.hidden&&!el.classList.contains('hidden')&&el.offsetParent!==null&&getComputedStyle(el).visibility!=='hidden').map(el=>el.getBoundingClientRect());
    for(const b of prioritized){const el=this.labelElements[b.id],world=vector(this.display[b.id]),proj=world.clone().project(this.camera);let show=this.objects[b.id].group.visible&&proj.z>=-1&&proj.z<=1&&p.labels!=='none'&&(p.labels==='major'&&['planet','star'].includes(b.type)||p.labels==='selected'&&b.id===selected||p.labels==='system'&&(b.id===selected||b.parent===this.system||b.parent===selected)||p.labels==='favorites'&&this.state.data.favorites.includes(b.id)||b.id===selected);
      const rad=displayRadius(b,p.scale),distance=this.camera.position.distanceTo(world),screenR=rad/Math.max(distance,1e-9)*h/(2*Math.tan(this.camera.fov*RAD/2));const x=(proj.x+1)*w/2,y=(-proj.y+1)*h/2+screenR+10;const text=this.cb.name(b),bw=Math.min(180,text.length*7+24)/p.labelDensity;
      if(show){for(const other of bodies){if(other.id===b.id||!this.objects[other.id].group.visible)continue;const pos=vector(this.display[other.id]),v=world.clone().sub(this.camera.position),t=pos.clone().sub(this.camera.position).dot(v)/v.lengthSq();if(t>0&&t<1&&this.camera.position.clone().addScaledVector(v,t).distanceTo(pos)<displayRadius(other,p.scale)){show=false;break;}}}
      if(blockers.some(r=>x+bw/2>r.left&&x-bw/2<r.right&&y+24>r.top&&y<r.bottom)||x<25||x>w-25||y<85||y>h-100||boxes.some(r=>Math.abs(x-r.x)<(bw+r.w)/2&&Math.abs(y-r.y)<27))show=false;
      if(show){boxes.push({x,y,w:bw});el.style.transform=`translate(${x}px,${y}px) translateX(-50%)`;el.textContent=text;el.classList.toggle('selected',b.id===selected);el.classList.toggle('locator',screenR<2);el.style.setProperty('--body-color',b.color);}
      el.hidden=!show;
    }
  }
  measurePerformance(dt,now){if(dt>0&&dt<1)this.frames.push(dt*1000);if(this.frames.length>240)this.frames.shift();if(now-(this.lastSample||0)>2000){this.lastSample=now;this.fps=Math.round(1000/(this.frames.reduce((a,b)=>a+b,0)/(this.frames.length||1)));if(this.state.prefs.quality==='auto'&&this.frames.length>=100&&now-this.lastQualityChange>20000&&this.fps<28&&this.qualityFactor>.65){this.qualityFactor=Math.max(.65,this.qualityFactor-.15);this.lastQualityChange=now;this.resize();}}}
  fitMetric(){const w=this.host.clientWidth,h=this.host.clientHeight;return Math.max(h/Math.max(130,h-this.insets.top-this.insets.bottom),h/Math.max(160,w-this.insets.left-this.insets.right));}
  setInsets(insets){this.insets=insets;this.resize();}
  resize(){
    if(this.failed)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    const metric=this.fitMetric(),signature=[w,h,...Object.values(this.insets)].join('|'),changed=signature!==this.lastFitSignature;
    if(changed&&['focus','follow','system'].includes(this.mode)){
      const b=byId[this.targetId],r=displayRadius(b,this.state.prefs.scale);let bound=r*(b.giant?(b.id==='saturn'?2.5:2):Math.max(1.15,...(b.shapeAxes||[])));
      if(this.mode==='system'&&children(b.id).length)bound=Math.max(...children(b.id).map(c=>length(displayLocal(c,localPosition(c.id,this.state.clock.time),this.state.prefs.scale))+displayRadius(c,this.state.prefs.scale)))*1.05;
      const minimum=bound/Math.sin(this.camera.fov*RAD/2)*metric*1.16;
      if(this.transition)this.transition.offset.setLength(Math.max(minimum,this.transition.offset.length()*(this.lastFitMetric?metric/this.lastFitMetric:1)));
      else {const off=this.camera.position.clone().sub(this.controls.target);off.setLength(Math.max(minimum,off.length()*(this.lastFitMetric?metric/this.lastFitMetric:1)));this.camera.position.copy(this.controls.target).add(off);}
    }
    this.lastFitMetric=metric;this.lastFitSignature=signature;
    const quality=this.state.prefs.quality,ratio=quality==='low'?1:quality==='high'?2:1.5;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,ratio)*this.qualityFactor);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.setViewOffset(w,h,(this.insets.right-this.insets.left)/2,(this.insets.bottom-this.insets.top)/2,w,h);this.camera.updateProjectionMatrix();for(const o of Object.values(this.objects))if(Object.values(this.geometries).includes(o.mesh.geometry))o.mesh.geometry=this.geometries[quality==='low'?'low':quality==='high'?'high':'medium'];
  }
  focus(id,mode='focus',preset='default',animate=true){if(this.failed||!this.objects[id])return;this.recordHistory();this.targetId=id;this.mode=mode;this.system=mode==='system'?id:null;const b=byId[id],r=displayRadius(b,this.state.prefs.scale),ring=b.giant?(id==='saturn'?2.5:2):Math.max(1.15,...(b.shapeAxes||[]));let bound=r*ring;if(mode==='system'&&children(id).length)bound=Math.max(...children(id).map(c=>length(displayLocal(c,localPosition(c.id,this.state.clock.time),this.state.prefs.scale))+displayRadius(c,this.state.prefs.scale)))*1.05;
    let distance=bound/Math.sin(this.camera.fov*RAD/2)*this.fitMetric()*1.16;
    const pole=new THREE.Vector3(-Math.sin(b.tilt*RAD),Math.cos(b.tilt*RAD),0),sunward=vector(toWorld(this.physical.positions[id])).negate().normalize();if(sunward.lengthSq()<.1)sunward.set(1,.4,1).normalize();let direction;if(preset==='top')direction=new THREE.Vector3(.001,1,.001);else if(preset==='polar')direction=pole.clone();else if(preset==='equator')direction=sunward.clone().addScaledVector(pole,-sunward.dot(pole));else if(preset==='terminator')direction=sunward.clone().cross(pole).normalize().addScaledVector(sunward,.18).addScaledVector(pole,.12);else direction=sunward.clone().multiplyScalar(.85).addScaledVector(pole,(sunward.dot(pole)>=0?1:-1)*(b.giant?.8:.35));direction.normalize().multiplyScalar(distance);this.lastFitMetric=this.fitMetric();
    this.controls.minDistance=r*1.4;this.controls.maxDistance=Math.max(1800,distance*8);this.camera.near=Math.max(1e-9,r*.03);this.camera.far=12000;this.camera.updateProjectionMatrix();this.lastTarget.fromArray(this.display[id]);
    const target=this.lastTarget.clone();if(animate&&!this.cb.reduced())this.transition={start:performance.now(),duration:1250,fromCamera:this.camera.position.clone(),fromTarget:this.controls.target.clone(),offset:direction};else{this.transition=null;this.controls.target.copy(target);this.camera.position.copy(target).add(direction);this.controls.update();}
    this.cb.camera(mode);this.recordHistory();
  }
  overview(animate=true,preset='default'){if(this.failed)return;this.targetId='sun';this.mode='overview';this.system=null;this.transition=null;const scale=this.state.prefs.scale==='relative'?1:.99;const aspect=Math.max(.4,(this.host.clientWidth-this.insets.left-this.insets.right)/(this.host.clientHeight||800));const dist=(preset==='top'?330:315)*scale/Math.min(1,aspect*1.4);const direction=preset==='top'?new THREE.Vector3(.01,1,.01):preset==='low'?new THREE.Vector3(.6,.17,1):new THREE.Vector3(.55,.85,1);direction.normalize().multiplyScalar(dist);this.controls.target.set(0,0,0);this.camera.position.copy(direction);this.controls.minDistance=1;this.camera.near=.001;this.camera.far=12000;this.camera.updateProjectionMatrix();this.lastTarget.set(0,0,0);this.controls.update();this.cb.camera('overview');this.recordHistory();}
  free(){this.mode='free';this.transition=null;this.cb.camera('free');}
  nudge(horizontal,vertical){this.transition=null;this.cb.manual();const offset=this.camera.position.clone().sub(this.controls.target),s=new THREE.Spherical().setFromVector3(offset);s.theta+=horizontal;s.phi=clamp(s.phi+vertical,.02,Math.PI-.02);this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(s));this.controls.update();}
  pan(x,y){this.transition=null;this.cb.manual();const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrix,1),distance=this.camera.position.distanceTo(this.controls.target)*.05;const offset=right.multiplyScalar(x*distance).add(up.multiplyScalar(y*distance));this.controls.target.add(offset);this.camera.position.add(offset);}
  zoom(factor){this.transition=null;const off=this.camera.position.clone().sub(this.controls.target);off.multiplyScalar(factor);if(off.length()<this.controls.minDistance)off.setLength(this.controls.minDistance);this.camera.position.copy(this.controls.target).add(off);this.controls.update();}
  snapshot(){if(this.failed)return {target:'sun',scale:this.state.prefs.scale,time:this.state.clock.time,mode:'overview',offset:[100,150,220],targetOffset:[0,0,0],fov:42};const target=vector(this.display[this.targetId]||[0,0,0]);return {target:this.targetId,scale:this.state.prefs.scale,time:this.state.clock.time,mode:this.mode,offset:this.camera.position.clone().sub(target).toArray(),targetOffset:this.controls.target.clone().sub(target).toArray(),fov:this.camera.fov,system:this.system,labels:this.state.prefs.labels,orbits:this.state.prefs.orbits};}
  restore(view,restoreDate=false){if(restoreDate)this.state.clock.jump(view.time);this.state.prefs.scale=view.scale;if(view.labels)this.state.prefs.labels=view.labels;if(view.orbits)this.state.prefs.orbits=view.orbits;if(this.failed)return;this.updatePositions();this.targetId=view.target;this.mode=view.mode||'focus';this.system=view.system||null;this.transition=null;const target=vector(this.display[view.target]);this.lastTarget.copy(target);this.camera.position.copy(target).add(vector(view.offset));this.controls.target.copy(target).add(vector(view.targetOffset||[0,0,0]));this.camera.fov=view.fov||42;const r=displayRadius(byId[view.target],view.scale);this.camera.near=Math.max(1e-9,r*.02);this.controls.minDistance=r*1.4;this.camera.updateProjectionMatrix();this.controls.update();this.cb.camera(this.mode);}
  recordHistory(){if(this.failed||this.transition)return;const view=this.snapshot(),last=this.history[this.historyIndex];if(last&&last.target===view.target&&last.mode===view.mode&&length(sub(last.offset,view.offset))<.5)return;this.history.splice(this.historyIndex+1);this.history.push(view);if(this.history.length>20)this.history.shift();this.historyIndex=this.history.length-1;}
  historyMove(n){const i=this.historyIndex+n;if(i>=0&&i<this.history.length){this.historyIndex=i;this.restore(this.history[i]);}}
  setScale(){if(this.failed)return;this.pathScale=null;this.updatePositions();if(this.mode==='overview')this.overview(false);else this.focus(this.targetId,this.mode,'default',false);}
  async capture({labels=true,caption=true,scale=1,aspect='screen'}={}){if(this.failed||this.lost)throw Error('3D unavailable');const oldRatio=this.renderer.getPixelRatio(),oldW=this.host.clientWidth,oldH=this.host.clientHeight;const ratioLimit=4096/Math.max(oldW,oldH);this.renderer.setPixelRatio(Math.min(oldRatio*scale,ratioLimit));this.renderer.setSize(oldW,oldH,false);this.renderer.render(this.world,this.camera);const w=this.renderer.domElement.width,h=this.renderer.domElement.height,factor=1;const ratios={square:1,landscape:16/9,portrait:3/4};const ratio=ratios[aspect]||w/h;let cw=w,ch=w/ratio;if(ch>h){ch=h;cw=h*ratio;}const canvas=document.createElement('canvas');canvas.width=Math.round(cw*factor);canvas.height=Math.round(ch*factor);const c=canvas.getContext('2d');c.drawImage(this.renderer.domElement,(w-cw)/2,(h-ch)/2,cw,ch,0,0,canvas.width,canvas.height);
    if(labels){const cssW=this.host.clientWidth,cssH=this.host.clientHeight;c.font=`${Math.max(12,13*factor*w/cssW)}px system-ui`;c.fillStyle='#e5eef2';for(const b of bodies){const el=this.labelElements[b.id];if(el.hidden)continue;const rect=el.getBoundingClientRect(),host=this.host.getBoundingClientRect(),x=(rect.left-host.left)*w/cssW-(w-cw)/2,y=(rect.top-host.top+13)*h/cssH-(h-ch)/2;c.fillText(this.cb.name(b),x*factor,y*factor);}}
    if(caption){const fh=Math.max(12,canvas.width/90);c.fillStyle='rgba(5,9,16,.84)';c.fillRect(0,canvas.height-fh*4,canvas.width,fh*4);c.fillStyle='#d6e0e5';c.font=`${fh}px system-ui`;c.fillText(this.cb.captureCaption(),fh,canvas.height-fh*2.3);c.fillStyle='#a3b0b7';c.fillText('Solar System Scope / INOVE · CC BY 4.0 · NASA / JPL',fh,canvas.height-fh*.8);}
    this.renderer.setPixelRatio(oldRatio);this.renderer.setSize(oldW,oldH,false);this.renderer.render(this.world,this.camera);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Capture failed');return {blob,width:canvas.width,height:canvas.height};
  }
  diagnostics(){return this.failed?{webgl:false}:{webgl:true,fps:this.fps,frames:this.frames.length,p95ms:[...this.frames].sort((a,b)=>a-b)[Math.floor(this.frames.length*.95)]||0,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,textures:this.renderer.info.memory.textures,geometries:this.renderer.info.memory.geometries,pixelRatio:this.renderer.getPixelRatio(),resolution:[this.renderer.domElement.width,this.renderer.domElement.height],failedAssets:this.failedAssets,quality:this.state.prefs.quality,adaptiveFactor:this.qualityFactor,loops:1};}
}
