import * as T from 'three';

// Wheel builders tag geometrically identical assemblies. Share their buffers
// and draw calls while retaining each wheel's independent animated transform.
export function batchWheels(k){
  if(!k.tablet)return ()=>{};
  const groups=new Map(),batches=[];
  k.scene.traverse(root=>{
    if(!root.userData.wheelKey||!root.userData.dynamic)return;
    for(const part of root.children){
      if(!part.isMesh||Array.isArray(part.material)||part.material.transparent)continue;
      const key=`${root.userData.wheelKey}:${part.material.uuid}:${part.geometry.attributes.position.count}:${part.geometry.index?.count}`;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(part);
    }
  });
  for(const parts of groups.values()){
    if(parts.length<2)continue;
    const instance=k.instances(parts[0].geometry,parts[0].material,parts.length);
    instance.instanceMatrix.setUsage(T.DynamicDrawUsage);instance.castShadow=false;
    // Wheels can travel hundreds of metres; only the visible assemblies are
    // included each frame. Their modest shared geometry needs no giant bounds.
    instance.frustumCulled=false;
    parts.forEach(part=>{part.visible=false;});batches.push({instance,parts});
  }
  return ()=>{
    k.scene.updateMatrixWorld();
    for(const {instance,parts} of batches){
      let count=0;
      for(const part of parts){
        let visible=true;for(let parent=part.parent;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}
        if(visible)instance.setMatrixAt(count++,part.matrixWorld);
      }
      instance.count=count;instance.instanceMatrix.needsUpdate=true;
    }
  };
}
