import * as T from 'three';
import {WALK_BUILDINGS,WALK_STARTS,portalPose} from './walkLayout.js';
import {createWalkPhysics,WALK_BODY} from './walkPhysics.js';
import {buildWalkDoor} from './doors.js';
import {loadingDeckHeight,RAIL_SIDE_LOADING,PROCESS_BUILDINGS,POND} from './siteLayout.js';

const vector=(x,y,z)=>new T.Vector3(x,y,z);
const box=(x0,y0,z0,x1,y1,z1)=>new T.Box3(vector(x0,y0,z0),vector(x1,y1,z1));
const dimensions=b=>b.getSize(new T.Vector3());
const hasAncestor=(o,roots)=>{for(let p=o;p;p=p.parent)if(roots.has(p))return true;return false;};

// Difference of axis-aligned construction boxes. Unlike hiding a whole wall,
// this leaves the jambs, lintel and remaining facade in their original places.
export function subtractWalkBox(source,hole){
  const hit=source.clone().intersect(hole);
  if(hit.isEmpty()||['x','y','z'].some(a=>hit.max[a]-hit.min[a]<.00001))return [source];
  const parts=[],core=source.clone();
  for(const axis of ['x','y','z']){
    if(hit.min[axis]>core.min[axis]+.00001){const p=core.clone();p.max[axis]=hit.min[axis];parts.push(p);core.min[axis]=hit.min[axis];}
    if(hit.max[axis]<core.max[axis]-.00001){const p=core.clone();p.min[axis]=hit.max[axis];parts.push(p);core.max[axis]=hit.max[axis];}
  }
  return parts;
}

export function createWalkWorld(k,{site,production,oldInterior,logistics,materialFlow}){
  const physics=createWalkPhysics(),root=k.group([0,0,0],k.scene,true);root.name='walk-architecture';
  const shell=k.group([0,0,0],root,true);shell.name='walk-building-shells';
  const hidden=[],doors=[],records=[],dynamicBodies=[],equipmentTargets=[];
  const interiorRoots=new Set([production.root,production.outdoor,oldInterior.root,oldInterior.warehouse,site.administration.root]);
  const vehicleRoots=new Set([logistics.dispatchTruck.g,logistics.dispatchTruck.trailer,logistics.hauler.g,logistics.train,logistics.traffic.g,materialFlow.loader.g,...logistics.vehicles.map(v=>v.g),logistics.oldFork?.g].filter(Boolean));
  const parkedTractors=k.vehicleLights.filter(v=>v.length===24&&!vehicleRoots.has(v.root)).map(v=>v.root);
  parkedTractors.forEach(o=>vehicleRoots.add(o));
  const excluded=new Set([...interiorRoots,...vehicleRoots,...logistics.humans.map(h=>h.g)]);
  k.scene.updateMatrixWorld(true);
  const original=[];k.scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.isBatchedMesh){o.geometry.computeBoundingBox();original.push({o,b:o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)});}});
  function hide(o){if(hidden.includes(o))return;o.userData.dynamic=true;hidden.push(o);}
  function meshBox(bounds,mat,parent=shell){
    const s=dimensions(bounds),p=bounds.getCenter(new T.Vector3());
    if(Math.min(s.x,s.y,s.z)<.00001)return null;
    const mesh=k.box(s.x,s.y,s.z,p.toArray(),mat,parent,0);mesh.userData.walkConstruction=true;return mesh;
  }
  const portals=WALK_BUILDINGS.flatMap(building=>building.doors.map((d,i)=>{
    const p=portalPose(building,d),across=d.side==='north'||d.side==='south';
    return {...d,...p,id:`${building.id}-${i}`,label:building.label,building,
      hole:box(p.x-(across?d.width/2:.55),p.y-.025,p.z-(across?.55:d.width/2),p.x+(across?d.width/2:.55),p.y+d.height+.015,p.z+(across?.55:d.width/2))};
  }));
  const cavities=WALK_BUILDINGS.map(b=>({building:b,bounds:box(b.x-b.width/2+.18,(b.bottom||0)+.04,b.z-b.depth/2+.18,b.x+b.width/2-.18,b.height+(b.elevated?0:(b.bottom||0))-.14,b.z+b.depth/2-.18)}));
  const frontStairVoid=box(-50.9,2.9,-5.05,-49.3,3.45,-.05);
  for(const {o,b} of original){
    if(hasAncestor(o,excluded)||!['BoxGeometry','RoundedBoxGeometry'].includes(o.geometry.type)||Array.isArray(o.material))continue;
    const s=dimensions(b);
    const own=cavities.find(({building:d})=>s.x>d.width-.35&&s.x<d.width+1.1&&s.z>d.depth-.35&&s.z<d.depth+1.1&&s.y>.2&&Math.abs((b.min.x+b.max.x)/2-d.x)<.6&&Math.abs((b.min.z+b.max.z)/2-d.z)<.6);
    const cuts=portals.filter(p=>p.hole.intersectsBox(b)).map(p=>p.hole);
    if(frontStairVoid.intersectsBox(b))cuts.push(frontStairVoid);
    if(own)cuts.unshift(...cavities.filter(c=>c.bounds.intersectsBox(b)).map(c=>c.bounds));
    if(!cuts.length)continue;
    // Preserve angled roofs and ramps: entrances only cut vertical facade parts.
    const up=vector(0,1,0).transformDirection(o.matrixWorld);
    if(Math.abs(up.y)<.999||s.y<.005)continue;
    let parts=[b];for(const cut of cuts)parts=parts.flatMap(p=>subtractWalkBox(p,cut));
    if(parts.length===1&&parts[0].equals(b))continue;
    hide(o);parts.forEach(part=>meshBox(part,o.material));
  }
  // Adjacent volumes need a real, shared passage through both wall skins.
  // Door cutters above extend into the neighbouring shell wherever faces meet.
  for(const p of portals)if(p.type!=='opening'){
    const shared=doors.find(d=>d.point.distanceTo(vector(p.x,p.y+Math.min(1.3,p.height/2),p.z))<.2);
    if(shared){shared.ids.push(p.id);continue;}
    const d=buildWalkDoor(k,physics,p,root);d.ids=[p.id];doors.push(d);
  }
  // The smaller front tower starts above its service base. A real stairwell
  // links that shared ground floor to the tower and its upper connecting room.
  for(let i=0;i<16;i++){
    const y=.04+(i+1)*.2,z=-.1-(i+.5)*.31;
    k.box(1.25,.075,.34,[-50.1,y-.0375,z],k.m.steel,root);
    for(const x of [-50.76,-49.44]){
      if(i%3===0)k.rod([x,y,z],[x,y+1,z],.025,k.m.yellow,root);
      if(i<15)k.rod([x,y+1,z],[x,y+1.2,z-.31],.025,k.m.yellow,root);
    }
  }

  // Room partitions were deliberately cut low for the presentation. Complete
  // them in walk mode, and replace the fixed-open doors with operable leaves.
  const dorm=oldInterior.dormitory;
  dorm.root.traverse(o=>{
    if(!o.isMesh||o.geometry.parameters?.height!==1.45)return;
    const b=new T.Box3().setFromObject(o);b.min.y=b.max.y;b.max.y=3.08;meshBox(b,o.material);
  });
  for(const [i,r] of dorm.rooms.entries()){
    hide(r.door);
    const p=r.root.localToWorld(vector(0,.08,r.entry[1]));
    doors.push(buildWalkDoor(k,physics,{id:`dorm-room-${i+1}`,label:`Ýatakhana · ${i+1}-nji otag`,x:p.x,y:p.y,z:p.z,yaw:Math.PI,width:.96,height:2.04,open:true},root));
  }

  // Modest furniture in the previously solid service/security rooms. Their
  // layout is labelled illustrative and stays beside, not across, the entry.
  const furnished=['old-inner-security','old-outer-security','new-security','new-weighbridge','new-yard-cabin','new-outerService','rear-low-annex'];
  for(const b of WALK_BUILDINGS){
    if(furnished.includes(b.id)){
      const x=b.x-b.width/2+.5,z=b.z+b.depth/2-.65,y=(b.bottom||0)+.08;
      k.box(.65,.76,.85,[x,y+.38,z],k.m.white,root);
      k.box(.62,.03,.85,[x,y+.775,z],k.m.steel,root);
      k.box(.035,.36,.46,[x,y+.98,z],k.m.blue,root);
    }
    const p=portals.find(p=>p.building===b);if(p){
      const sign=k.textPlate(b.label,Math.min(3.4,b.width-.3),.24,[p.x,p.y+p.height+.23,p.z],root,'#254a5c','#e3eceb');sign.rotation.y=p.yaw;
    }
    records.push({...b,representative:true});
  }
  // Existing illustrative process galleries retain their original coordinates.
  // Identify their levels separately from the ground-floor building regions.
  const stairPoint=vector(PROCESS_BUILDINGS.main.x-6.4,.05,PROCESS_BUILDINGS.main.z+10.7);

  // Collect only inexpensive construction primitives, before batching removes
  // the original objects. Tiny fasteners, leaves and labels never become walls.
  k.scene.updateMatrixWorld(true);
  const hiddenSet=new Set(hidden),humanRoots=new Set(logistics.humans.map(h=>h.g));
  function addPrimitive(o){
    if(!o.isMesh||o.isInstancedMesh||hasAncestor(o,hiddenSet)||hasAncestor(o,vehicleRoots)||hasAncestor(o,humanRoots)||o.name.startsWith('walk-door-'))return;
    for(let p=o;p;p=p.parent)if(p.name.startsWith('walk-door-'))return;
    const g=o.geometry,params=g.parameters;
    if(!params||!['BoxGeometry','RoundedBoxGeometry','CylinderGeometry'].includes(g.type))return;
    g.computeBoundingBox();const b=g.boundingBox.clone().applyMatrix4(o.matrixWorld),s=dimensions(b);
    if(b.max.y<-.1||b.min.y>30||b.max.x< -215||b.min.x>250||b.max.z< -205||b.min.z>65||s.x>500||s.z>500)return;
    if(s.x*s.z<.008||Math.max(s.x,s.z)<.13||s.y<.04)return;
    const centre=b.getCenter(vector()),q=new T.Quaternion(),scale=vector();o.matrixWorld.decompose(vector(),q,scale);
    const e=new T.Euler().setFromQuaternion(q,'YXZ');
    const tilted=Math.abs(e.x)>.01||Math.abs(e.z)>.01;
    const localSize=dimensions(g.boundingBox).multiply(scale);
    const body={x:centre.x,z:centre.z,hx:(tilted?s.x:localSize.x)/2,hz:(tilted?s.z:localSize.z)/2,bottom:b.min.y,top:b.max.y,yaw:tilted?0:e.y,walkable:true};
    // Stair stringers remain side barriers; step treads are real support faces.
    if(tilted&&g.type==='BoxGeometry'&&s.y<1&&Math.max(s.x,s.z)>1){
      const normal=vector(0,1,0).transformDirection(o.matrixWorld);
      if(normal.y>.7){const top=vector(0,params.height/2,0).applyMatrix4(o.matrixWorld);body.heightAt=(x,z)=>top.y-((x-top.x)*normal.x+(z-top.z)*normal.z)/normal.y;body.solid=false;}
    }
    physics.add(body);
  }
  k.scene.traverse(addPrimitive);
  // CAD bodies arrive after construction/batching. Reserve their fitted local
  // envelope now so loading a detailed shell never leaves it walk-through.
  production.root.traverse(machine=>{
    const local=machine.userData.cadCollision;if(!local)return;
    const b=local.clone().applyMatrix4(machine.matrixWorld),centre=b.getCenter(vector());
    const scale=machine.getWorldScale(vector()),size=dimensions(local).multiply(scale);
    const yaw=new T.Euler().setFromQuaternion(machine.getWorldQuaternion(new T.Quaternion()),'YXZ').y;
    physics.add({x:centre.x,z:centre.z,hx:size.x/2,hz:size.z/2,bottom:b.min.y,top:b.max.y,yaw,walkable:false});
  });
  // The loading ramp is an extruded profile, not a construction box.
  for(const r of RAIL_SIDE_LOADING.ramps)physics.addSurface({x:(r.west+r.east)/2,z:(r.north+r.south)/2,hx:(r.east-r.west)/2,hz:(r.south-r.north)/2,top:.7,heightAt:loadingDeckHeight});
  // Prevent walking into the pond or beyond the virtual campus.
  physics.add({x:POND.x,z:POND.z,hx:POND.width/2-.7,hz:POND.depth/2-.7,bottom:-4,top:.5,walkable:false});

  function movingBody(object,size,offset=[0,0,0]){
    if(!object)return;
    const body=physics.add({x:0,z:0,hx:size[0]/2,hz:size[2]/2,bottom:0,top:size[1],dynamic:true,walkable:false});
    dynamicBodies.push({object,body,offset:vector(...offset),size,last:vector(),velocity:vector(),ready:false});
  }
  movingBody(logistics.dispatchTruck.g,[6.2,4.2,2.6],[-.8,0,0]);
  movingBody(logistics.dispatchTruck.trailer,[14,4,2.6]);
  for(const tractor of parkedTractors){
    movingBody(tractor,[6.2,4.2,2.6],[-.8,0,0]);
    const trailer=k.vehicleLights.find(v=>v.root!==tractor&&hasAncestor(v.root,new Set([tractor]))&&v.rear!==undefined)?.root;
    movingBody(trailer,[14,4.2,2.6]);
  }
  movingBody(logistics.traffic.g,[4.8,1.8,2.1]);
  for(const v of [logistics.truckFork,logistics.railForkA,logistics.railForkB,logistics.oldFork])movingBody(v?.g,[4.4,2.5,1.7],[.5,0,0]);
  movingBody(logistics.hauler.g,[10,4.1,3]);movingBody(materialFlow.loader.g,[8,4,3]);
  // Train moves on one axis. Its long proxy covers locomotive and all wagons.
  if(logistics.train){const b=new T.Box3().setFromObject(logistics.train),s=dimensions(b);movingBody(logistics.train,[s.x,s.y,s.z],b.getCenter(vector()).sub(logistics.train.getWorldPosition(vector())).toArray());}
  function syncVehicles(dt){
    for(const v of dynamicBodies){
      v.object.updateWorldMatrix(true,false);const p=v.offset.clone().applyMatrix4(v.object.matrixWorld),q=v.object.getWorldQuaternion(new T.Quaternion()),a=new T.Euler().setFromQuaternion(q,'YXZ').y;
      if(v.ready&&dt>0)v.velocity.copy(p).sub(v.last).divideScalar(dt);
      v.last.copy(p);v.ready=true;
      let enabled=true;for(let o=v.object;o;o=o.parent)enabled&&=o.visible;
      const scale=v.object.getWorldScale(vector());
      Object.assign(v.body,{x:p.x,z:p.z,hx:v.size[0]*Math.abs(scale.x)/2,hz:v.size[2]*Math.abs(scale.z)/2,bottom:p.y,top:p.y+v.size[1]*Math.abs(scale.y),yaw:a,enabled});
    }
  }
  function trafficBlocked(player){
    return dynamicBodies.some(v=>{
      if(!v.body.enabled)return false;
      const speed=v.velocity.length(),ahead=v.last.clone().addScaledVector(v.velocity,Math.min(.7,3/Math.max(speed,.001)));
      return speed>.02&&physics.overlap(player,{...v.body,x:ahead.x,z:ahead.z},WALK_BODY.radius+.6);
    });
  }
  syncVehicles(0);
  let enabled=false;
  function setActive(value){enabled=value;root.visible=value;hidden.forEach(o=>{o.visible=!value;});doors.forEach(d=>d.leaves.forEach(l=>{l.body.enabled=value;}));}
  // Cutaway changes only rendering; walking and door collision stay active.
  function setCutaway(value){shell.visible=!value;}
  setActive(false);
  function region(p){
    const b=records.filter(b=>Math.abs(p.x-b.x)<b.width/2&&Math.abs(p.z-b.z)<b.depth/2).sort((a,b)=>a.width*a.depth-b.width*b.depth)[0];
    if(b){const floor=b.id==='old-office'?(p.y>2?2:1):null;return `${b.label}${floor?` · ${floor}-nji gat`:''}`;}
    if(Math.abs(p.x-stairPoint.x)<12&&Math.abs(p.z-stairPoint.z)<27&&p.y>1)return `Proses platformasy · ${p.y.toFixed(1)} m`;
    return p.z< -58?'Köne zawod · Meýdança':'Täze zawod · Meýdança';
  }
  return {physics,root,doors,buildings:records,starts:WALK_STARTS,equipmentTargets,setActive,setCutaway,syncVehicles,trafficBlocked,region,
    updateDoors(dt,player){let changed=false;for(const d of doors)changed=d.update(dt,player,dynamicBodies.map(v=>v.body))||changed;return changed;},
    get active(){return enabled;},
    get inventory(){return {buildings:records.length,doors:doors.length,colliders:physics.count};},
  };
}
