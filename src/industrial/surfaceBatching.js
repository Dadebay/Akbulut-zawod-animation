import * as T from 'three';

// Preserve the original colour and surface finish per vertex while sharing one
// shader/material for opaque, untextured construction parts. Lamps, glass and
// other independently animated materials keep their own state.
export function poolSurfaces(k){
  const families=new Map(),geometryCache=new WeakMap();
  k.scene.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.isBatchedMesh||Array.isArray(o.material))return;
    const mat=o.material;
    if(!mat.isMeshStandardMaterial||mat.userData.independent||mat.transparent||mat.vertexColors||mat.emissive.getHex()!==0||Object.values(mat).some(v=>v?.isTexture)||mat.onBeforeCompile.toString().includes('terrainBlend'))return;
    const key=[mat.side,mat.flatShading,mat.depthTest,mat.depthWrite,mat.polygonOffset,mat.polygonOffsetFactor,mat.polygonOffsetUnits].join(':');
    if(!families.has(key)){
      const shared=k.material('#ffffff',1,1,{unique:true,vertexColors:true,side:mat.side,flatShading:mat.flatShading,depthTest:mat.depthTest,depthWrite:mat.depthWrite,polygonOffset:mat.polygonOffset,polygonOffsetFactor:mat.polygonOffsetFactor,polygonOffsetUnits:mat.polygonOffsetUnits});
      const previous=shared.onBeforeCompile,cacheKey=shared.customProgramCacheKey();
      shared.onBeforeCompile=(shader,renderer)=>{
        previous.call(shared,shader,renderer);
        shader.vertexShader='attribute vec2 surfaceFinish; varying vec2 vSurfaceFinish;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceFinish=surfaceFinish;');
        shader.fragmentShader='varying vec2 vSurfaceFinish;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=vSurfaceFinish.y;').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=vSurfaceFinish.x;');
      };
      shared.customProgramCacheKey=()=>cacheKey+':surface-finish-v1';families.set(key,shared);
    }
    let copies=geometryCache.get(o.geometry);if(!copies){copies=new Map();geometryCache.set(o.geometry,copies);}
    if(copies.has(mat)){o.geometry=copies.get(mat);o.material=families.get(key);return;}
    const original=o.geometry,geo=original.clone(),count=geo.attributes.position.count,colors=new Float32Array(count*3),finish=new Float32Array(count*2);
    for(let i=0;i<count;i++){colors.set([mat.color.r,mat.color.g,mat.color.b],i*3);finish.set([mat.metalness,mat.roughness],i*2);}
    geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.setAttribute('surfaceFinish',new T.BufferAttribute(finish,2));
    copies.set(mat,geo);k.trackGeometry(geo);o.geometry=geo;o.material=families.get(key);
  });
}

// Keep each cell/assembly as an independently culled submesh, submitted in one
// multi-draw per material. Transform handles stay in the original hierarchy.
export function batchAssemblies(k){
  // optimize() creates assembly-local meshes; resolve their world transforms before baking.
  k.scene.updateMatrixWorld(true);
  const groups=new Map(),batches=[],empty=k.trackGeometry(new T.BufferGeometry());
  k.scene.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.isBatchedMesh||Array.isArray(o.material)||o.material.transparent)return;
    const layout=Object.entries(o.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([n,a])=>`${n}:${a.itemSize}`).join('|');
    const key=`${o.material.uuid}:${o.castShadow}:${o.receiveShadow}:${o.renderOrder}:${layout}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
  });
  for(const parts of groups.values()){
    if(parts.length<2)continue;
    const unique=new Map(),canonical=new Map();
    for(const part of parts){
      const g=part.geometry;if(canonical.has(g))continue;
      let h=2166136261;
      const buffers=[...Object.keys(g.attributes).sort().map(n=>g.attributes[n].array),g.index?.array].filter(Boolean);
      for(const buffer of buffers){const bytes=new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength);for(let i=0;i<bytes.length;i++)h=Math.imul(h^bytes[i],16777619);}
      const key=`${h}:${buffers.map(b=>b.byteLength).join(',')}`;
      const candidates=unique.get(key)||[];
      const equal=candidates.find(c=>buffers.every((a,i)=>{const b=c.buffers[i];return a.length===b.length&&a.every((v,j)=>v===b[j]);}));
      if(equal)canonical.set(g,equal.g);else{canonical.set(g,g);candidates.push({g,buffers});unique.set(key,candidates);}
    }
    const geos=[...new Set(canonical.values())];
    const vertices=geos.reduce((n,g)=>n+g.attributes.position.count,0),indices=geos.reduce((n,g)=>n+(g.index?.count||g.attributes.position.count),0);
    const batch=new T.BatchedMesh(parts.length,vertices,indices,parts[0].material),ids=new Map();
    for(const g of geos){if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));ids.set(g,batch.addGeometry(g));}
    batch.renderOrder=parts[0].renderOrder;batch.castShadow=parts[0].castShadow;batch.receiveShadow=parts[0].receiveShadow;batch.frustumCulled=false;
    const owners=new Map();
    for(const part of parts){
      const id=batch.addInstance(ids.get(canonical.get(part.geometry)));let owner=null,visible=true;
      for(let p=part;p;p=p.parent){if(!owner&&p.userData.dynamic)owner=p;visible&&=p.visible;}
      batch.setMatrixAt(id,part.matrixWorld);batch.setVisibleAt(id,visible);
      if(owner){
        if(!owners.has(owner))owners.set(owner,{owner,records:[],last:new T.Matrix4().makeScale(0,0,0),visible:null});
        const local=new T.Matrix4().copy(owner.matrixWorld).invert().multiply(part.matrixWorld);
        owners.get(owner).records.push({local,id,visible:owner===part?true:part.visible});
      }
      if(owner===part){part.geometry=empty;part.layers.disable(0);}else part.removeFromParent();
    }

    k.scene.add(batch);k.trackGeometry(batch.geometry);batches.push({batch,owners});
  }
  // Construction meshes must not survive in the animation closure. Only the
  // compact transform records above are needed after uploading each batch.
  groups.clear();k.pruneGeometries();
  const chains=new Set(),matrix=new T.Matrix4();
  const include=o=>{if(chains.has(o))return;if(o.parent)include(o.parent);chains.add(o);};
  batches.forEach(({owners})=>owners.forEach(({owner})=>include(owner)));
  return ()=>{
    for(const node of chains)node.updateWorldMatrix(false,false);
    for(const {batch,owners} of batches)for(const state of owners.values()){
      const {owner,records,last}=state;
      let visible=true;for(let p=owner;p;p=p.parent)if(!p.visible){visible=false;break;}
      if(visible!==state.visible){records.forEach(r=>batch.setVisibleAt(r.id,visible&&r.visible));state.visible=visible;}
      if(visible&&!last.equals(owner.matrixWorld)){
        for(const {id,local} of records)batch.setMatrixAt(id,matrix.multiplyMatrices(owner.matrixWorld,local));
        last.copy(owner.matrixWorld);
      }
    }
  };
}
