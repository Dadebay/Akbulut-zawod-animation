import * as T from 'three';

// A once-only architectural bake. Bounding boxes are conservative occluders;
// a spatial grid bounds the five short rays per vertex. Moving assemblies and
// cutaway shells never occlude fixed geometry (no ghost roof/vehicle shadows).
export function bakeStaticAO(k,{radius=2.5}={}){
  k.scene.updateMatrixWorld(true);
  const meshes=[],cells=new Map(),bounds=new Map(),cellSize=4;
  k.scene.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.isBatchedMesh||Array.isArray(o.material)||o.material.transparent)return;
    for(let p=o;p;p=p.parent)if(p.userData.dynamic)return;
    const geo=o.geometry;if(!geo.attributes.normal||geo.attributes.position.count>300)return;
    geo.computeBoundingBox();const box=geo.boundingBox.clone().applyMatrix4(o.matrixWorld),size=box.getSize(new T.Vector3());
    if(Math.max(size.x,size.y,size.z)>300||Math.max(size.x,size.y,size.z)<.8)return;
    meshes.push(o);bounds.set(o,box);
    for(let x=Math.floor(box.min.x/cellSize);x<=Math.floor(box.max.x/cellSize);x++)for(let z=Math.floor(box.min.z/cellSize);z<=Math.floor(box.max.z/cellSize);z++){
      const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(o);
    }
  });
  const point=new T.Vector3(),normal=new T.Vector3(),tangent=new T.Vector3(),bitangent=new T.Vector3(),hit=new T.Vector3(),ray=new T.Ray(),up=new T.Vector3(0,1,0);
  for(const mesh of meshes){
    const geo=mesh.geometry.clone(),position=geo.attributes.position,normals=geo.attributes.normal,ao=new Float32Array(position.count),matrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);normal.fromBufferAttribute(normals,i).applyMatrix3(matrix).normalize();
      ray.origin.copy(point).addScaledVector(normal,.045);
      tangent.crossVectors(Math.abs(normal.y)>.9?new T.Vector3(1,0,0):up,normal).normalize();bitangent.crossVectors(normal,tangent);
      const nearby=new Set();
      for(let x=Math.floor((point.x-radius)/cellSize);x<=Math.floor((point.x+radius)/cellSize);x++)for(let z=Math.floor((point.z-radius)/cellSize);z<=Math.floor((point.z+radius)/cellSize);z++)for(const other of cells.get(`${x},${z}`)||[])if(other!==mesh)nearby.add(other);
      let occlusion=0;
      for(let sample=0;sample<5;sample++){
        const angle=sample*2.399963,spread=sample===0?0:.8;
        ray.direction.copy(normal).multiplyScalar(Math.sqrt(1-spread*spread)).addScaledVector(tangent,Math.cos(angle)*spread).addScaledVector(bitangent,Math.sin(angle)*spread);
        let closest=radius;
        for(const other of nearby)if(ray.intersectBox(bounds.get(other),hit))closest=Math.min(closest,hit.distanceTo(ray.origin));
        occlusion+=1-closest/radius;
      }
      ao[i]=occlusion/5*.48;
    }
    geo.setAttribute('staticOcclusion',new T.BufferAttribute(ao,1));mesh.geometry=k.trackGeometry(geo);
  }
  k.addMaterialEffect(mat=>{
    if(!mat.isMeshStandardMaterial)return;
    mat.defaultAttributeValues={...mat.defaultAttributeValues,staticOcclusion:[0]};
    const previous=mat.onBeforeCompile,key=mat.customProgramCacheKey();
    mat.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);
      shader.vertexShader='attribute float staticOcclusion; varying float vStaticOcclusion;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStaticOcclusion=staticOcclusion;');
      shader.fragmentShader='varying float vStaticOcclusion;\n'+shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= 1.0-vStaticOcclusion;');
    };
    mat.customProgramCacheKey=()=>`${key}:static-ao-v1`;mat.needsUpdate=true;
  });
  return {meshes:meshes.length,vertices:meshes.reduce((sum,o)=>sum+o.geometry.attributes.position.count,0)};
}
