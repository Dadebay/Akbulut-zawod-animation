import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assetUrl} from '../assets.js';
import {roundedConnection} from './equipmentConnections.js';
import catalog from './cadInteriorCatalog.json' with {type:'json'};

export {catalog as CAD_INTERIOR_CATALOG};

// Select shapes by equipment function. Board/ceiling tools, wet mixers, screws,
// cooling drums and their synchronized drives keep their existing mechanisms.
export function cadModelFor(kind,options={}){
  if(kind==='process-silo')return options.height>9?'tallSilo':'silo';
  if(kind==='hopper')return options.weigh?'weighHopper':'hopper';
  if(kind==='filter')return options.round?'roundFilter':'filter';
  if(kind==='cyclone')return 'cyclone';
  if(kind==='fan'&&!options.blower)return 'fan';
  if(kind==='elevator')return 'elevator';
  if(kind==='mill'&&!options.vertical)return 'hammerMill';
  if(kind==='mixer'&&!options.pan&&!options.wet)return 'mixer';
  if(kind==='burner')return 'burner';
  return null;
}

export function fitCadEquipment(size,bounds){
  const space=bounds.getSize(new T.Vector3());
  const fits=[0,Math.PI/2].map(yaw=>{
    const extent=yaw?[size[2],size[1],size[0]]:size;
    return {yaw,scale:Math.min(...extent.map((v,i)=>space.getComponent(i)/v))*.97};
  });
  const fit=fits.sort((a,b)=>b.scale-a.scale)[0];
  const center=bounds.getCenter(new T.Vector3());
  return {...fit,position:[center.x,bounds.min.y,center.z]};
}

function localBounds(object){
  object.updateWorldMatrix(true,true);
  const inverse=object.matrixWorld.clone().invert(),bounds=new T.Box3();
  object.traverse(part=>{
    if(!part.isMesh)return;
    part.geometry.computeBoundingBox();
    bounds.union(part.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,part.matrixWorld)));
  });
  return bounds;
}

function disposeAsset(asset){
  const geometries=new Set(),materials=new Set();
  asset.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

function nearestSurface(shape,worldPoint){
  const closest=new T.Vector3(),point=new T.Vector3(),triangle=new T.Triangle();
  let distance=Infinity,result=null;
  shape.traverse(part=>{
    if(!part.isMesh)return;
    const inverse=part.matrixWorld.clone().invert(),local=worldPoint.clone().applyMatrix4(inverse);
    const {position}=part.geometry.attributes,index=part.geometry.index,count=index?.count??position.count;
    for(let i=0;i<count;i+=3){
      triangle.a.fromBufferAttribute(position,index?index.getX(i):i);
      triangle.b.fromBufferAttribute(position,index?index.getX(i+1):i+1);
      triangle.c.fromBufferAttribute(position,index?index.getX(i+2):i+2);
      triangle.closestPointToPoint(local,closest);point.copy(closest).applyMatrix4(part.matrixWorld);
      const d=point.distanceToSquared(worldPoint);
      if(d<distance){distance=d;result=point.clone();}
    }
  });
  return result;
}

// Prepare before collision collection and static batching. Each fallback remains
// a visibility owner so it can be replaced atomically after the GLB is ready.
export function prepareCadInteriors(k,root){
  const slots=[],renderRoots=[];
  root.traverse(machine=>{
    const entry=machine.userData.equipment;
    if(!entry||!machine.name.startsWith('interior-')||entry.id==='twin-roll-feed')return;
    const model=cadModelFor(entry.kind,machine.userData.equipmentOptions);
    if(!model)return;
    const bounds=localBounds(machine),bodyBounds=bounds.clone();
    const out=machine.userData.ports?.out;
    if(out?.direction.y<-.5)bodyBounds.min.y=Math.max(bodyBounds.min.y,out.position.y);
    const fit=fitCadEquipment(catalog.models[model].size,bodyBounds);
    // Retain the illustrated equipment if its proportions cannot accommodate a
    // useful CAD replacement (especially very tall, narrow elevators).
    if(catalog.models[model].size[1]*fit.scale<bodyBounds.getSize(new T.Vector3()).y*.58)return;
    slots.push({machine,model,bounds,fit});
  });
  for(const slot of slots){
    const {machine,model,bounds,fit}=slot;
    machine.userData.dynamic=true;
    // Keep the site's supports and port flanges at their established positions.
    const retain=[];
    machine.traverse(o=>{if(o!==machine&&o.userData.cadRetain)retain.push(o);});
    for(const object of retain)machine.attach(object);
    const fallback=k.group([0,0,0],machine,true);fallback.name=`cad-fallback-${machine.userData.equipment.id}`;
    for(const child of [...machine.children])if(child!==fallback&&!child.userData.cadRetain)fallback.add(child);
    slot.fallback=fallback;
    const size=catalog.models[model].size;
    const extent=new T.Vector3(...(fit.yaw?[size[2],size[1],size[0]]:size)).multiplyScalar(fit.scale);
    const min=new T.Vector3(fit.position[0]-extent.x/2,fit.position[1],fit.position[2]-extent.z/2);
    machine.userData.cadCollision=new T.Box3(min,min.clone().add(extent));
    machine.userData.cadInterior={model,status:'fallback',sourceCode:catalog.models[model].code,adapted:true};
  }
  let cancelled=false,installed=false;
  function install(asset){
    if(cancelled||installed){disposeAsset(asset);return 0;}
    // Validate the complete library before hiding any existing equipment.
    const templates=new Map();
    for(const {model} of slots){
      const template=asset.scene.getObjectByName(model);
      if(!template)throw new Error(`Missing CAD template ${model}`);
      templates.set(model,template);
    }
    // Preserve the hard sheet-metal faces of the native CAD tessellation.
    asset.scene.traverse(o=>{if(o.isMesh){o.material.flatShading=true;o.material.metalness=.12;o.material.roughness=.66;}});
    k.trackObject(asset.scene);
    try{for(const {machine,model,fit,bounds} of slots){
      // Keep the GLB's internal dequantization transforms below our placement.
      const shape=k.group([0,0,0],machine,true);
      shape.add(templates.get(model).clone(true));
      shape.name=`cad-${machine.userData.equipment.id}`;
      shape.userData.dynamic=true;
      shape.position.set(...fit.position);shape.rotation.y=fit.yaw;shape.scale.setScalar(fit.scale);
      shape.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
      renderRoots.push(shape);machine.updateWorldMatrix(true,true);
      // Short adapters join existing circuit endpoints to the fitted CAD skin.
      // Source nozzles are reference geometry, not telemetry/asset identities.
      const center=new T.Box3().setFromObject(shape).getCenter(new T.Vector3());
      for(const port of Object.values(machine.userData.ports||{})){
        if(!port.connected)continue;
        const start=port.position.clone().applyMatrix4(machine.matrixWorld),direction=center.clone().sub(start).normalize();
        const hit=new T.Raycaster(start,direction,0,start.distanceTo(center)).intersectObject(shape,true)[0];
        const surface=hit?.point??nearestSurface(shape,start);
        if(!surface||surface.distanceTo(start)<.025)continue;
        const end=machine.worldToLocal(surface.clone());
        // Depart perpendicular to the retained flange before turning towards
        // the CAD nozzle. A diagonal cylinder would protrude beyond its rim.
        const lead=port.position.clone().addScaledVector(port.direction,-(port.radius*2+.08));
        lead.clamp(bounds.min.clone().addScalar(port.radius),bounds.max.clone().addScalar(-port.radius));
        const path=roundedConnection([port.position,lead,end],port.radius*.75);
        const adapter=k.mesh(new T.TubeGeometry(path,20,port.radius,k.tablet?8:12,false),k.m.steel,[0,0,0],machine);
        adapter.name=`cad-adapter-${port.name}`;adapter.castShadow=adapter.receiveShadow=false;
        renderRoots.push(adapter);
      }
    }}catch(error){renderRoots.forEach(o=>o.removeFromParent());renderRoots.length=0;throw error;}
    for(const {fallback,machine} of slots){fallback.visible=false;machine.userData.cadInterior.status='ready';}
    installed=true;return slots.length;
  }
  function load(onLoaded=()=>{},onError=()=>{}){
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(assetUrl(catalog.asset),asset=>{
      let count;
      try{count=install(asset);}
      catch(error){disposeAsset(asset);if(!cancelled)onError(error);return;}
      if(!cancelled)onLoaded(count);
    },undefined,error=>{if(!cancelled)onError(error);});
    return ()=>{cancelled=true;};
  }
  return {slots,renderRoots,install,load,cancel:()=>{cancelled=true;}};
}
