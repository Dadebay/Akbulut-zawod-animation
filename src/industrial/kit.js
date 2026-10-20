import * as T from 'three';
import {createMaterialLibrary,createPalette} from './materials.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Dimensions are in metres. These are original illustrative models, not vendor CAD.
export function createKit(scene,{tablet=false}={}) {
  const geometries=new Set(), textures=new Set(), materials=new Set(),detailChunks=[],materialEffects=new Set(),vehicleLights=[],detailUpdaters=[],materialCache=new Map(),windTime={value:0};
  function registerMaterial(mat){if(!materials.has(mat)){materials.add(mat);materialEffects.forEach(effect=>effect(mat));}}
  function addMaterialEffect(effect){materialEffects.add(effect);materials.forEach(effect);}
  const library=createMaterialLibrary({tablet,trackTexture:t=>{textures.add(t);return t;}});
  function material(color,metalness=0,roughness=.7,{unique=false,physical=false,...more}={}){
    const resolved=library.resolve(color,metalness,roughness,{physical,...more}),params=resolved.params;
    const key=resolved.physical+String(resolved.name)+JSON.stringify(Object.keys(params).sort().map(key=>[key,params[key]?.uuid??params[key]]));
    if(!unique&&materialCache.has(key))return materialCache.get(key);
    const mat=library.create(resolved);mat.userData.independent=unique;registerMaterial(mat);
    if(!unique)materialCache.set(key,mat);return mat;
  }
  function onDetailUpdate(update){detailUpdaters.push(update);}

  const m=createPalette(material);
  const geoCache=new Map();
  function cached(key,fn){if(!geoCache.has(key)){const g=fn();geometries.add(g);geoCache.set(key,g);}return geoCache.get(key);}
  // Asphalt receives building/tree shadows; overlapping ground slabs must
  // not cast stripes or seam shadows onto one another.
  function mesh(geo,mat,pos=[0,0,0],parent=scene){geometries.add(geo);const o=new T.Mesh(geo,mat);o.position.set(...pos);o.castShadow=mat!==m.road;o.receiveShadow=true;parent.add(o);return o;}
  function instances(geo,mat,count,parent=scene){geometries.add(geo);const o=new T.InstancedMesh(geo,mat,count);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function trackGeometry(g){geometries.add(g);return g;}
  function trackTexture(t){textures.add(t);return t;}
  function trackObject(root){root.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){registerMaterial(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}});return root;}
  function box(w,h,d,pos,mat=m.white,parent=scene,bevel){
    bevel=bevel??(Math.min(w,h,d)>=.25&&Math.max(w,h,d)<=8?mat.userData.edgeRadius||0:0);
    const segments=1;
    const geo=cached(`b${w},${h},${d},${bevel},${segments}`,()=>bevel?mergeVertices(new RoundedBoxGeometry(w,h,d,segments,Math.min(bevel,w/4,h/4,d/4))):new T.BoxGeometry(w,h,d));return mesh(geo,mat,pos,parent);
  }
  // Subpixel fasteners/rim beads receive light/AO but do not need their own
  // shadow-map draw. Structural posts and tyre silhouettes still cast shadows.
  function cyl(r,h,pos,mat=m.steel,parent=scene,rt=r,segments=32){segments=Math.min(segments,r<.15?(tablet?8:12):(tablet?12:24));const o=mesh(cached(`c${r},${h},${rt},${segments}`,()=>new T.CylinderGeometry(rt,r,h,segments)),mat,pos,parent);o.castShadow&&=Math.max(r,rt)>=.08;return o;}
  function sphere(r,pos,mat=m.steel,parent=scene){return mesh(cached(`s${r}`,()=>new T.SphereGeometry(r,tablet?10:16,tablet?6:10)),mat,pos,parent);}
  function ring(r,t,pos,mat=m.steel,parent=scene,axis='y'){const o=mesh(cached(`t${r},${t}`,()=>new T.TorusGeometry(r,t,tablet?4:8,tablet?(r<.16?12:16):(r<.16?16:32))),mat,pos,parent);if(axis==='y')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.y=Math.PI/2;o.castShadow&&=t>=.05;return o;}
  function rod(a,b,r=.04,mat=m.steel,parent=scene){const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);const o=cyl(r,dir.length(),start.clone().add(end).multiplyScalar(.5).toArray(),mat,parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;}
  function pipe(points,r=.15,mat=m.steel,parent=scene){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),tablet?24:40,r,tablet?8:12,false),mat,[0,0,0],parent);}
  function group(pos=[0,0,0],parent=scene,dynamic=false){const g=new T.Group();g.position.set(...pos);g.userData.dynamic=dynamic;parent.add(g);return g;}
  function beam(h,pos,parent=scene){box(.32,h,.06,pos,m.dark,parent);for(const z of [-.16,.16])box(.34,h,.055,[pos[0],pos[1],pos[2]+z],m.dark,parent);}
  function frame(w,d,h,parent=scene){for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){beam(h,[x,h/2,z],parent);box(.6,.12,.6,[x,.06,z],m.dark,parent);for(const xx of [-.2,.2])for(const zz of [-.2,.2])cyl(.038,.13,[x+xx,.15,z+zz],m.steel,parent,undefined,6);}
    for(const z of [-d/2,d/2]){box(w,.28,.18,[0,h,z],m.dark,parent);rod([-w/2,.3,z],[w/2,h-.2,z],.045,m.steel,parent);}for(const x of [-w/2,w/2])box(.18,.28,d,[x,h,0],m.dark,parent);}
  function railing(w,d,y,parent=scene){
    for(const z of [-d/2,d/2]){for(let x=-w/2;x<=w/2+.1;x+=w/Math.ceil(w/1.5))rod([x,y,z],[x,y+1.05,z],.035,m.yellow,parent);for(const yy of [.5,1.05])rod([-w/2,y+yy,z],[w/2,y+yy,z],.035,m.yellow,parent);box(w,.12,.025,[0,y+.09,z],m.yellow,parent);}
    for(const x of [-w/2,w/2])for(const yy of [.5,1.05])rod([x,y+yy,-d/2],[x,y+yy,d/2],.035,m.yellow,parent);
  }
  function platform(w,d,y,parent=scene){box(w,.12,d,[0,y,0],m.dark,parent);for(let x=-w/2;x<w/2;x+=.22)box(.04,.02,d,[x,y+.07,0],m.steel,parent);railing(w,d,y+.07,parent);}
  function ladder(h,x,z,parent=scene,cage=false){for(const dx of [-.25,.25])rod([x+dx,.15,z],[x+dx,h+.8,z],.035,m.steel,parent);for(let y=.2;y<h+.5;y+=.28)rod([x-.25,y,z],[x+.25,y,z],.026,m.steel,parent);if(cage){for(let y=2;y<h+.6;y+=1.2)ring(.42,.023,[x,y,z+.32],m.steel,parent);for(const a of [-1,0,1])rod([x+Math.sin(a)*.42,2,z+.32+Math.cos(a)*.42],[x+Math.sin(a)*.42,h+.6,z+.32+Math.cos(a)*.42],.018,m.steel,parent);}}
  function bolts(r,pos,parent=scene,axis='y',count=12){for(let i=0;i<count;i++){const a=i/count*Math.PI*2;let p=axis==='x'?[pos[0],pos[1]+Math.sin(a)*r,pos[2]+Math.cos(a)*r]:[pos[0]+Math.sin(a)*r,pos[1],pos[2]+Math.cos(a)*r];const b=cyl(.045,.07,p,m.dark,parent,undefined,6);if(axis==='x')b.rotation.z=Math.PI/2;}}
  function motor(pos,parent=scene,scale=1){const g=group(pos,parent);g.scale.setScalar(scale);const b=cyl(.35,.9,[0,.45,0],m.blue,g);b.rotation.z=Math.PI/2;for(let x=-.4;x<=.4;x+=.1){const f=cyl(.39,.025,[x,.45,0],m.blue,g);f.rotation.z=Math.PI/2;}box(.28,.18,.32,[0,.88,0],m.dark,g,.025);box(1,.1,.6,[0,.05,0],m.dark,g);const cap=cyl(.35,.08,[.5,.45,0],m.dark,g);cap.rotation.z=Math.PI/2;bolts(.25,[.55,.45,0],g,'x',8);return g;}
  function cabinet(pos,parent=scene){const g=group(pos,parent);box(.8,1.6,.46,[0,.8,0],m.white,g,.025);box(.71,1.45,.012,[0,.8,.24],m.steel,g);box(.30,.21,.018,[0,1.27,.26],m.black,g);box(.24,.15,.01,[0,1.28,.275],m.blueLight,g);for(let i=0;i<3;i++)sphere(.033,[-.18+i*.18,.94,.27],i===0?m.red:m.dark,g);box(.035,.22,.02,[.24,.6,.27],m.dark,g);return g;}
  const textTiles=new Map(),atlases=[];
  function textPlate(text,w,h,pos,parent=scene,color='#194f86',bg='#e8ecee'){
    const key=JSON.stringify([text,color,bg]);
    if(!textTiles.has(key)){
      let atlas=atlases.at(-1);
      if(!atlas||atlas.count===64){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
        const map=trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
        atlas={canvas,map,count:0,mat:material('#ffffff',.05,.6,{map})};atlases.push(atlas);
      }
      const index=atlas.count++,x=index%4*256,y=Math.floor(index/4)*64,c=atlas.canvas.getContext('2d');
      c.fillStyle=bg;c.fillRect(x,y,256,64);c.fillStyle=color;c.font='600 34px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x+128,y+34,248);atlas.map.needsUpdate=true;
      textTiles.set(key,{atlas,x,y});
    }
    const {atlas,x,y}=textTiles.get(key),geo=new T.BoxGeometry(w,h,.015),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(x+2+uv.getX(i)*252)/1024,1-(y+2+(1-uv.getY(i))*60)/1024);
    return mesh(geo,atlas.mat,pos,parent);
  }

  // Batch fixed parts within each moving assembly, preserving its local coordinates.
  function optimize({preserveRepeated=false}={}){
    const repeats=new Map();
    if(preserveRepeated)scene.traverse(o=>{if(o.isMesh)repeats.set(o.geometry,(repeats.get(o.geometry)||0)+1);});
    scene.updateMatrixWorld(true);const roots=[scene];scene.traverse(o=>{if(o.userData.dynamic)roots.push(o);});
    for(const root of roots){
      const groups=new Map(),inverse=root.matrixWorld.clone().invert();
      function collect(o){
        if(o!==root&&o.userData.dynamic)return;
        if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&!o.material.transparent&&!(preserveRepeated&&repeats.get(o.geometry)>2)){
          const layout=Object.entries(o.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join('|');
          const cell=root===scene?`${Math.floor(o.matrixWorld.elements[12]/60)},${Math.floor(o.matrixWorld.elements[14]/60)}`:'assembly';
          const key=`${cell}:${o.material.uuid}:${o.castShadow}:${o.receiveShadow}:${layout}`;
          if(!groups.has(key))groups.set(key,{mat:o.material,castShadow:o.castShadow,receiveShadow:o.receiveShadow,parts:[],originals:[]});
          // Keep shared vertices; expanding every triangle tripled many buffers.
          const g=o.geometry.clone();
          if(!g.index)g.setIndex(new T.Uint32BufferAttribute(Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),1));
          g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
          groups.get(key).parts.push(g);groups.get(key).originals.push(o);
        }
        o.children.forEach(collect);
      }
      collect(root);
      for(const {mat,castShadow,receiveShadow,parts,originals} of groups.values()){
        if(parts.length>1){const merged=mergeGeometries(parts,false);if(merged){const batched=mesh(merged,mat,[0,0,0],root);batched.castShadow=castShadow;batched.receiveShadow=receiveShadow;originals.forEach(o=>o.removeFromParent());}}
        parts.forEach(p=>p.dispose());
      }
    }
    {
      // Independent bounds let the GPU skip groves and stone fields outside the
      // camera. One instance batch for the entire site defeats that culling.
      const fields=[];scene.traverse(o=>{if(o.isInstancedMesh&&o.count>500&&!o.userData.preserveInstances)fields.push(o);});
      const transform=new T.Matrix4();
      for(const field of fields){
        const cells=new Map();
        for(let i=0;i<field.count;i++){field.getMatrixAt(i,transform);const key=`${Math.floor(transform.elements[12]/64)},${Math.floor(transform.elements[14]/64)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push({matrix:transform.clone(),color:field.instanceColor?new T.Color().fromBufferAttribute(field.instanceColor,i):null});}
        for(const matrices of cells.values()){
          const chunk=instances(field.geometry,field.material,matrices.length,field.parent);chunk.position.copy(field.position);chunk.quaternion.copy(field.quaternion);chunk.scale.copy(field.scale);
          chunk.castShadow=field.castShadow;chunk.receiveShadow=field.receiveShadow;
          chunk.customDepthMaterial=field.customDepthMaterial;
          matrices.forEach(({matrix,color},i)=>{chunk.setMatrixAt(i,matrix);if(color)chunk.setColorAt(i,color);});chunk.instanceMatrix.needsUpdate=true;if(chunk.instanceColor)chunk.instanceColor.needsUpdate=true;chunk.computeBoundingSphere();
          if(field.userData.detailDistance){chunk.updateWorldMatrix(true,false);const sphere=chunk.boundingSphere.clone().applyMatrix4(chunk.matrixWorld);detailChunks.push({chunk,sphere,distance:field.userData.detailDistance});}
        }
        field.removeFromParent();field.dispose();
      }
    }
    // Moving roots keep their transforms editable; fixed children need no
    // repeated matrix composition, including the large architectural hierarchy.
    scene.traverse(o=>{if(!o.userData.dynamic){o.updateMatrix();o.matrixAutoUpdate=false;}});
    // The batch owns its buffers now. Discard unused construction geometry.
    pruneGeometries();
  }
  function pruneGeometries(){
    const used=new Set();scene.traverse(o=>{if(o.geometry)used.add(o.geometry);});
    for(const g of geometries)if(!used.has(g)){g.dispose();geometries.delete(g);}
    geoCache.clear();
  }
  function updateDetailVisibility(camera){detailUpdaters.forEach(update=>update(camera));for(const {chunk,sphere,distance} of detailChunks)chunk.visible=camera.position.distanceTo(sphere.center)<distance+sphere.radius;}
  function dispose(){
    // Instance transforms/colors own GPU buffers separately from geometry.
    scene.traverse(o=>{if(o.isInstancedMesh||o.isBatchedMesh)o.dispose();});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    geometries.clear();materials.clear();textures.clear();geoCache.clear();
    textTiles.clear();atlases.length=0;materialCache.clear();detailUpdaters.length=0;detailChunks.length=0;materialEffects.clear();vehicleLights.length=0;
  }
  function getTextures(){const all=new Set(textures);materials.forEach(mat=>Object.values(mat).forEach(v=>{if(v?.isTexture)all.add(v);}));return all;}
  return {m,scene,tablet,windTime,getTextures,trackMaterial:registerMaterial,onDetailUpdate,pruneGeometries,vehicleLights,addMaterialEffect,mesh,instances,trackGeometry,trackTexture,trackObject,box,cyl,sphere,ring,rod,pipe,group,beam,frame,railing,platform,ladder,bolts,motor,cabinet,textPlate,material,optimize,updateDetailVisibility,dispose};
}
