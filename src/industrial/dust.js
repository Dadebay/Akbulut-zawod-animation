import * as T from 'three';

// One bounded particle cloud, reused when the timeline is replayed or scrubbed.
export function createDust(k,count=24){
  const positions=new Float32Array(count*3),geometry=k.trackGeometry(new T.BufferGeometry());geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const material=new T.PointsMaterial({color:'#b9b19d',size:.65,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});k.trackMaterial(material);
  const cloud=new T.Points(geometry,material);cloud.userData.dynamic=true;cloud.frustumCulled=false;k.scene.add(cloud);
  return {update(origin,time,strength){
    cloud.visible=strength>.005;if(!cloud.visible)return;
    cloud.position.copy(origin);material.opacity=Math.min(.3,strength*.28);
    for(let i=0;i<count;i++){
      const age=(time*.48+i/count)%1,angle=i*2.399;
      positions[i*3]=Math.cos(angle)*(.15+age*1.6);
      positions[i*3+1]=.12+age*1.3;
      positions[i*3+2]=Math.sin(angle)*(.15+age*1.25);
    }
    geometry.attributes.position.needsUpdate=true;
  }};
}
