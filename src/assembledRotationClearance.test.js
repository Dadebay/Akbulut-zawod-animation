import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';

// Test the assembled network as well as individual builders: a motor can clear
// its own pipe while a neighbouring route still crosses its swept volume.
// Segment projections reject the spherical end-cap false positives of a simple
// point-distance check. A 15 mm tolerance avoids reporting designed contacts.
test('all assembled rotating groups clear process pipe interiors over a full revolution',()=>{
const previous=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
const scene=new T.Scene(),kit=createKit(scene,{tablet:true}),production=buildProduction(kit),dynamic=[];
production.root.traverse(object=>{if(object.userData.dynamic)dynamic.push({object,angle:object.rotation.clone()});});
production.updateMotion(.5,{preview:true,active:new Map(['CR','TY','BS','GR','GK','GP'].map(z=>[z,{status:'running'}])),showInterior:true});
const rotors=dynamic.filter(r=>['x','y','z'].some(a=>r.object.rotation[a]!==r.angle[a]));
for(const r of rotors)r.axis=['x','y','z'].find(a=>r.object.rotation[a]!==r.angle[a]);
scene.updateMatrixWorld(true);
const pipes=[];
production.root.traverse(object=>{
  if(!object.userData.connection)return;
  const path=object.geometry.parameters.path,radius=object.geometry.parameters.radius;
  const samples=path.getSpacedPoints(Math.ceil(path.getLength()/.07)).map(q=>q.applyMatrix4(object.matrixWorld));
  const segments=[];
  for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    segments.push({x:a.x,y:a.y,z:a.z,dx,dy,dz,inv:1/(dx*dx+dy*dy+dz*dz),minX:Math.min(a.x,b.x)-radius,maxX:Math.max(a.x,b.x)+radius,minY:Math.min(a.y,b.y)-radius,maxY:Math.max(a.y,b.y)+radius,minZ:Math.min(a.z,b.z)-radius,maxZ:Math.max(a.z,b.z)+radius});
  }
  pipes.push({segments,radius,connection:object.userData.connection,bounds:new T.Box3().setFromObject(object)});
});
function ancestry(object){const names=[];for(let o=object;o;o=o.parent)if(o.name)names.push(o.name);return names;}
const hits=[],point=new T.Vector3();
try{
for(const {object,axis} of rotors){
  const initial=object.rotation[axis],meshpoints=[];object.updateWorldMatrix(true,true);
  object.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const matrix=new T.Matrix4().copy(object.matrixWorld).invert().multiply(mesh.matrixWorld),pos=mesh.geometry.attributes.position;
    for(let i=0;i<pos.count;i++)meshpoints.push(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(matrix));
  });
  const swept=new T.Box3(),poses=[];
  for(let step=0;step<24;step++){
    object.rotation[axis]=step*Math.PI/12;object.updateWorldMatrix(true,false);const pose=new Float64Array(meshpoints.length*3);
    meshpoints.forEach((q,i)=>{point.copy(q).applyMatrix4(object.matrixWorld);swept.expandByPoint(point);pose[i*3]=point.x;pose[i*3+1]=point.y;pose[i*3+2]=point.z;});poses.push(pose);
  }
  for(const pipe of pipes.filter(q=>q.bounds.intersectsBox(swept))){
    let min=Infinity,bad=null;
    for(const pose of poses)for(let i=0;i<pose.length;i+=3){
      const x=pose[i],y=pose[i+1],z=pose[i+2];
      for(const s of pipe.segments){
        if(x<s.minX||x>s.maxX||y<s.minY||y>s.maxY||z<s.minZ||z>s.maxZ)continue;
        const t=((x-s.x)*s.dx+(y-s.y)*s.dy+(z-s.z)*s.dz)*s.inv;
        if(t<0||t>1)continue;
        const dx=x-s.x-t*s.dx,dy=y-s.y-t*s.dy,dz=z-s.z-t*s.dz,dist=dx*dx+dy*dy+dz*dz;
        if(dist<min){min=dist;bad=[x,y,z];}
      }
    }
    if(Math.sqrt(min)<pipe.radius-.015)hits.push({rotor:ancestry(object),axis,pos:object.position.toArray(),pipe:pipe.connection,distance:Math.sqrt(min),radius:pipe.radius,at:bad});
  }
  object.rotation[axis]=initial;
}
assert.ok(rotors.length>100&&pipes.length>50,'complete production equipment and pipe network are present');
assert.deepEqual(hits,[],'rotating equipment penetrates an assembled process pipe');
}finally{kit.dispose();globalThis.document=previous;}

});
