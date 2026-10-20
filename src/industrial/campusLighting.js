import * as T from 'three';
import {POND,OLD_FRONT_COURT,pondAccessClearance} from './siteLayout.js';
import {RAIL_LAYOUT} from './rail.js';
import {createLocalLighting} from './localLighting.js';

export function buildCampusLighting(k,{logistics,loader,production,excavator}){
  const {m,group,box,cyl,material}=k,fixtures=[],vehicles=[],lenses=[],lampGroups=[];
  const warm=new T.Color('#ffdb9e'),cool=new T.Color('#dceaff');
  const visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
  const blockedRoots=new Set([logistics.train,loader.g,excavator.g,...k.vehicleLights.map(v=>v.root),...logistics.vehicles.map(v=>v.g)]);
  // Retain anchors before static geometry is batched. This includes the existing
  // road, visitor-court and interior lamps without adding duplicate poles.
  k.scene.updateMatrixWorld(true);
  const sources=[];k.scene.traverse(o=>{
    if(!o.isMesh||o.material!==m.light)return;
    for(let n=o;n;n=n.parent)if(blockedRoots.has(n))return;
    const p=o.getWorldPosition(new T.Vector3());
    sources.push({o,p});
  });
  for(const {o,p} of sources){
    const anchor=group(o.position.toArray(),o.parent,true);let interior=false;
    for(let n=o;n;n=n.parent)if(n===production.root)interior=true;
    const lighting=o.userData.lighting;
    fixtures.push({anchor,position:p,interior,radius:lighting?.radius??(interior?9:Math.max(4.5,p.y*1.8)),color:interior?cool:warm,
      intensity:lighting?.intensity,cone:lighting?.cone,
      direction:lighting?.direction?new T.Vector3(...lighting.direction).transformDirection(o.matrixWorld):undefined});
  }
  const lantern=material('#ffedc7',0,.35,{emissive:'#ffcf88',emissiveIntensity:0});
  // Low shielded lanterns sit between trees, along the pond and garden paths.
  const path=[];
  for(let z=POND.z-POND.depth/2+6;z<=POND.z+POND.depth/2-3;z+=8.6)path.push([POND.x+POND.width/2+1.8,z]);
  for(let x=POND.x-POND.width/2+2;x<=POND.x+POND.width/2-3;x+=9.25)path.push([x,POND.z+POND.depth/2+3.4]);
  for(let z=OLD_FRONT_COURT.orchard.north+7;z<=OLD_FRONT_COURT.orchard.south-2;z+=10.5)path.push([-44.8,z]);
  for(let x=-122;x<=-86;x+=9)path.push([x,4.5],[x,36.4]);
  for(let x=-24;x<=27;x+=8.5)path.push([x,-65.6]);
  for(const [x,z] of [[-70,-35],[-70,-18],[-70,7.5],[-70,18],[-84,-33],[-98,-33],[-32,-112],[-32,-103],[-32,-69],[-32,-59]])path.push([x,z]);
  for(const [x,z] of path){
    if(pondAccessClearance(x,z)<.7)continue;
    const g=group([x,.05,z]);box(.36,.10,.36,[0,.05,0],m.concrete,g);cyl(.07,1.05,[0,.62,0],m.dark,g);
    box(.28,.28,.28,[0,1.17,0],lantern,g,.025);box(.39,.07,.39,[0,1.35,0],m.dark,g,.018);
    for(const dx of [-.145,.145])for(const dz of [-.145,.145])box(.025,.30,.025,[dx,1.19,dz],m.dark,g);
    const anchor=group([0,1.19,0],g,true);
    fixtures.push({anchor,position:new T.Vector3(),radius:3.5,color:warm,interior:false});
  }
  const headlamp=material('#fff4d9',0,.3,{emissive:'#fff0cc',emissiveIntensity:6,toneMapped:false});
  const rearLamp=material('#e63a24',0,.3,{emissive:'#ff3020',emissiveIntensity:3,toneMapped:false});
  const amberLamp=material('#ffc054',0,.3,{emissive:'#ff970f',emissiveIntensity:3,toneMapped:false});
  function lens(parent,position,mat,size,color){
    const bulb=k.sphere(size,position,mat,parent);bulb.castShadow=false;
    // Keep the anchor separate from geometry batching, including parked cars.
    const anchor=group(position,parent,true);
    lenses.push({anchor,position:new T.Vector3(),size:size*5,color});
  }
  function vehicle({root,front,width,height,direction=1,rear=null,length=13,ground=.12,markers=[],markerWidth=width,markerHeight=height}){
    const lamps=group([0,0,0],root,true);lampGroups.push(lamps);
    if(front!==undefined){
      for(const side of [-1,1])lens(lamps,[front,height,side*width],headlamp,.11,cool);
      vehicles.push({root,front,height,direction,length,ground,position:new T.Vector3(),target:new T.Vector3()});
    }
    if(rear!==null)for(const side of [-1,1])lens(lamps,[rear,height,side*width],rearLamp,.085,new T.Color('#ff3020'));
    for(const x of markers)for(const side of [-1,1])lens(lamps,[x,markerHeight,side*markerWidth],amberLamp,.055,new T.Color('#ffb436'));
  }
  k.vehicleLights.forEach(vehicle);
  for(const fork of [logistics.truckFork,logistics.railForkA,logistics.railForkB])vehicle({root:fork.g,front:.64,width:.55,height:1.93,rear:-1.48,length:11});
  vehicle({root:loader.g,front:.59,width:.78,height:3.5,length:18});
  vehicle({root:loader.g,width:.94,height:1.17,rear:-3.35});
  vehicle({root:logistics.hauler.g,width:.87,height:.85,rear:-5.98});
  vehicle({root:excavator.upper,front:1.27,width:.72,height:2.2,length:16,ground:-1.23});
  // Anchor to the consist, so lights follow the locomotive through its journey.
  const trainCab=group([RAIL_LAYOUT.locomotiveX,0,RAIL_LAYOUT.z],logistics.train,true);
  vehicle({root:trainCab,front:-9.65,width:.86,height:2.33,direction:-1,length:42});
  const trainTail=group([RAIL_LAYOUT.wagonCentres.at(-1),0,RAIL_LAYOUT.z],logistics.train,true);
  vehicle({root:trainTail,rear:6.82,width:1.32,height:1.60});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,0.8)');gradient.addColorStop(.2,'rgba(255,255,255,0.35)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=k.trackTexture(new T.CanvasTexture(canvas));
  const glowMat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,opacity:.7});
  // Small camera-facing lens halos make the bulbs legible at campus zoom. They
  // do not control illumination: every world-space light below stays active.
  glowMat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float lampSize = length(instanceMatrix[0].xyz);
    float haloSize = lampSize > 0.0 ? max(lampSize, min(1.5, -mvPosition.z * 0.0015)) : 0.0;
    mvPosition.xy += position.xy * haloSize;
    gl_Position = projectionMatrix * mvPosition;`);};
  glowMat.customProgramCacheKey=()=> 'campus-lens-halos-v1';
  const halos=[...fixtures.map(f=>({...f,size:.7})),...lenses];
  const glows=k.instances(new T.PlaneGeometry(1,1),glowMat,halos.length);
  glows.userData.preserveInstances=true;
  k.trackObject(glows);glows.castShadow=false;glows.receiveShadow=false;glows.frustumCulled=false;glows.visible=false;
  const lights=[...fixtures.map(f=>({position:f.position,color:f.color,range:f.radius*2.2,intensity:f.intensity??f.radius*f.radius*(f.interior?1.8:1.4),direction:f.direction,cone:f.cone})),
    ...vehicles.map(v=>({position:v.position,color:cool,range:v.length*1.3,intensity:v.length*v.length*1.4,direction:new T.Vector3(),cone:Math.cos(.44)}))];
  const field=createLocalLighting(k,lights),pose=new T.Object3D();let night=false;
  function setNight(value){
    night=value;glows.visible=value;field.setNight(value);
    m.light.emissiveIntensity=value?4:0;lantern.emissiveIntensity=value?3:0;
    lampGroups.forEach(g=>{g.visible=value;});
    logistics.traffic.g.carRig.tailMaterial.emissiveIntensity=value?.40:0;
    logistics.traffic.g.carRig.brakeMaterial.emissiveIntensity=value?2:.7;
  }
  function update(){
    if(!night)return;
    for(const [i,f] of fixtures.entries()){
      f.anchor.getWorldPosition(f.position);lights[i].enabled=visible(f.anchor);
    }
    vehicles.forEach((v,i)=>{
      const light=lights[fixtures.length+i];
      v.root.updateWorldMatrix(true,false);v.position.set(v.front,v.height,0).applyMatrix4(v.root.matrixWorld);
      v.target.set(v.front+v.direction*v.length,v.ground,0).applyMatrix4(v.root.matrixWorld);
      light.direction.subVectors(v.target,v.position).normalize();light.enabled=visible(v.root);
    });
    halos.forEach((h,i)=>{
      h.anchor.getWorldPosition(h.position);pose.position.copy(h.position);pose.scale.setScalar(visible(h.anchor)?h.size:0);pose.updateMatrix();
      glows.setMatrixAt(i,pose.matrix);glows.setColorAt(i,h.color);
    });
    field.update();
    glows.instanceMatrix.needsUpdate=true;if(glows.instanceColor)glows.instanceColor.needsUpdate=true;
  }
  setNight(false);return {setNight,update};
}
