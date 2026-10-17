import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PARKED_TRUCKS,DISPATCH_PAVEMENT,DISPATCH_EXIT_LANE_X,dispatchPose,truckFootprint,trafficClearance} from './industrial/trafficLayout.js';
import {createVegetation} from './industrial/vegetation.js';

const rectangle=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
function overlaps(a,b){
  for(const poly of [a,b])for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],axis=[p[1]-q[1],q[0]-p[0]];
    const pa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),pb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);
    if(Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa))return false;
  }
  return true;
}

test('the articulated truck keeps a 35 cm margin from pavement edges, planters, docks, gate and kerbs',()=>{
  const obstacles=[[-69,-31,6.5,10.5],[-69,-16,7.5,9.5],[-84,-29.5,2.5,25.5],[-137,-11.5,1.4,1.5],[-137,7.5,1.4,1.5]].map(r=>rectangle(...r));
  // The boundary fence and the main-road kerbs resume outside the gate opening.
  obstacles.push(rectangle(-137,-30.75,.43,38.5),rectangle(-137,23.75,.43,32.5));
  for(const x of [-147.82,-138.18])obstacles.push(rectangle(x,110.5,.25,181));
  for(let x=8;x<44;x+=7){obstacles.push(rectangle(x,-42,4.8,4));for(const dx of [-2.7,2.7])obstacles.push(rectangle(x+dx,-45,.18,.18));}
  let previous;
  for(let i=0;i<=1200;i++){
    const pose=dispatchPose(i/1200),footprint=truckFootprint(pose,.35);
    const articulation=Math.atan2(Math.sin(pose.yaw-pose.trailerYaw),Math.cos(pose.yaw-pose.trailerYaw));
    assert.ok(Math.abs(articulation)<Math.PI/3,'no jackknifing at a corner');
    if(previous)assert.ok(Math.abs(Math.atan2(Math.sin(pose.trailerYaw-previous.trailerYaw),Math.cos(pose.trailerYaw-previous.trailerYaw)))<.1,'continuous trailer steering');
    for(const polygon of footprint){
      for(let edge=0;edge<4;edge++)for(let t=0;t<=1;t+=.1){const a=polygon[edge],b=polygon[(edge+1)%4],x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.ok(trafficClearance(x,z)<.02,`off asphalt at ${x},${z}`);}
      for(const obstacle of obstacles)assert.equal(overlaps(polygon,obstacle),false,`collision at ${i/1200}`);
    }
    previous=pose;
  }
  assert.equal(dispatchPose(0).x,64);assert.equal(dispatchPose(0).z,-43);
  assert.ok(Math.abs(dispatchPose(1).x-DISPATCH_EXIT_LANE_X)<1e-6);
});

test('freight roads have straight axis-aligned edges instead of a curved swept outline',()=>{
  for(const polygon of DISPATCH_PAVEMENT)for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    assert.ok((a[0]===b[0])!==(a[1]===b[1]),'each boundary is a horizontal or vertical segment');
  }
});

test('smaller waiting trucks fit wholly inside their parking area and do not overlap',()=>{
  const footprints=[];
  for(const {position:[x,,z],angle,scale} of PARKED_TRUCKS){
    assert.ok(scale<1&&scale>=.8);
    const corners=rectangle(-6.2,0,17.6,2.7).map(([along,side])=>[x+scale*(along*Math.cos(angle)+side*Math.sin(angle)),z+scale*(-along*Math.sin(angle)+side*Math.cos(angle))]);
    for(const [px,pz] of corners){assert.ok(px>-133&&px<-85);assert.ok(pz>-44&&pz<-8);}
    for(const other of footprints)assert.equal(overlaps(corners,other),false);
    footprints.push(corners);
  }
});

test('planting excludes the full conifer crown from both traffic lanes and trailer turns',()=>{
  const meshes=[];
  const kit={tablet:true,box(){},m:{},material:()=>new T.MeshBasicMaterial(),instances(geometry,material,count){const mesh=new T.InstancedMesh(geometry,material,count);meshes.push(mesh);return mesh;}};
  const plants=createVegetation(kit);
  plants.row(-147,-150,-147,36,5); // Old row intruded on the main road.
  plants.row(-151,-150,-151,36,5); // Relocated row retains the planted boundary.
  plants.grove(-173,-5,48,88,4.2);plants.grove(-110,21,47,33,3.8);
  plants.garden(-69,-31,6,10);plants.garden(-69,-16,7,9);plants.garden(-84,-29.5,2,25);
  plants.finish();
  assert.ok(meshes[0].count>20,'keep landscaping outside traffic');
  const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
  for(let i=0;i<meshes[0].count;i++){meshes[0].getMatrixAt(i,matrix);matrix.decompose(p,q,scale);assert.ok(trafficClearance(p.x,p.z)>=2.5*scale.x+.499);}
  for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
});
