import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PARKED_TRUCKS,DISPATCH_PAVEMENT,DISPATCH_EXIT_ROAD_X,DISPATCH_EXIT_ROAD_Z,dispatchPose,truckFootprint,trafficClearance} from './industrial/trafficLayout.js';
import {NEW_ENTRANCE_MEDIAN,VISITOR_PARK,RAIL_SIDE_LOADING as LOADING} from './industrial/siteLayout.js';
import {SERVICE_ROUTE_BOUNDS,serviceMotion} from './industrial/serviceTraffic.js';
import {OLD_SOUTH_GARDENS} from './industrial/oldCampus.js';
import {RAIL_CROSSINGS,RAIL_CROSSING_POSTS} from './industrial/outerRail.js';
import {WALK_ROUTES,pedestrianMotion} from './industrial/pedestrianMotion.js';
import {createVegetation} from './industrial/vegetation.js';
import {FORKLIFT_JOBS,sampleForklift,forkliftFootprint} from './industrial/forkliftMotion.js';
import {QUARRY,QUARRY_LOAD_POINT,EXCAVATOR_LAYOUT,excavatorLoadingPose} from './industrial/quarryLayout.js';
import {TRUCK_SCALE} from './industrial/trucks.js';

const rectangle=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
test('both outer railway crossings have opposing barrier and sign posts',()=>{
  for(const x of [-143,-205]){assert.ok(RAIL_CROSSINGS.includes(x));assert.equal(RAIL_CROSSING_POSTS.filter(p=>Math.abs(p.x-x)<6).length,2);}
});
test('the pond-side pedestrian stays entirely behind the road kerb',()=>{
  const sample=pedestrianMotion(WALK_ROUTES[3]);
  for(let t=0;t<120;t+=.1)assert.ok(sample(t).position.z+.3<-129.7);
});
test('adjoining old-campus lawns have no overlapping coplanar surfaces',()=>{
  assert.equal(overlaps(...OLD_SOUTH_GARDENS.map(bed=>rectangle(...bed))),false);
});
test('service car stays inside the resized visitor park without heading flips',()=>{
  const [west,east,,,radius]=SERVICE_ROUTE_BOUNDS,route=serviceMotion();
  assert.ok(east-west>=2*radius+6);
  let previous;
  for(let t=0;t<120;t+=.1){
    const p=route.sample(t);
    if(previous)assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-previous.yaw),Math.cos(p.yaw-previous.yaw)))<.5);
    for(const [x,z] of rectangle(0,0,4.7,2).map(([a,b])=>[p.x+a*Math.cos(p.yaw)+b*Math.sin(p.yaw),p.z-a*Math.sin(p.yaw)+b*Math.cos(p.yaw)])){
      assert.ok(x>VISITOR_PARK.west&&x<VISITOR_PARK.east-11);
      assert.ok(z>VISITOR_PARK.north&&z<VISITOR_PARK.south-12);
    }
    previous=p;
  }
});
test('finished forklifts park clear of the departing articulated truck',()=>{
  const parked=FORKLIFT_JOBS.map(job=>sampleForklift(job,job.duration));
  for(const pose of parked)assert.ok(pose.z>-44);
  for(let i=0;i<=1500;i++)for(const truck of truckFootprint(dispatchPose(i/1500),.35))
    for(const pose of parked)assert.equal(overlaps(truck,forkliftFootprint(pose)),false,`forklift collision at ${i/1500}`);
});
test('quarry excavator clears the truck by 60 cm while its bucket reaches the load point',()=>{
  const {position:[x,y,z],yaw}=EXCAVATOR_LAYOUT;
  const body=rectangle(0,0,5.2,3.5).map(([a,b])=>[x+a*Math.cos(yaw)+b*Math.sin(yaw),z-a*Math.sin(yaw)+b*Math.cos(yaw)]);
  assert.equal(overlaps(body,rectangle(QUARRY.x-1.7,QUARRY.z,9.8+1.2,2.8+1.2)),false);
  const pose=excavatorLoadingPose(),p=new T.Vector3(1.3,-.85,0).applyAxisAngle(new T.Vector3(0,0,1),pose.bucket).add(new T.Vector3(2.25,-2.5,0));
  p.applyAxisAngle(new T.Vector3(0,0,1),pose.stick).add(new T.Vector3(2.8,3.55,0));
  p.applyAxisAngle(new T.Vector3(0,0,1),pose.boom).add(new T.Vector3(.95,2.15,.43));
  p.applyAxisAngle(new T.Vector3(0,1,0),yaw+pose.slew).add(new T.Vector3(x,y,z));
  assert.ok(p.distanceTo(new T.Vector3(...QUARRY_LOAD_POINT))<1e-8);
});
function overlaps(a,b){
  for(const poly of [a,b])for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],axis=[p[1]-q[1],q[0]-p[0]];
    const pa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),pb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);
    if(Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa))return false;
  }
  return true;
}

test('loading canopy guards and low panel bundles leave forklift routes clear',()=>{
  const guards=LOADING.columnXs.map(x=>rectangle(x,LOADING.columnZ,LOADING.guardWidth,LOADING.guardWidth));
  const bundles=LOADING.panelBays.flatMap(({x,width})=>LOADING.panelRows.map(z=>rectangle(x,z,width,LOADING.panelDepth)));
  for(const [index,job] of FORKLIFT_JOBS.entries())for(let t=0;t<=job.duration;t+=.1){
    const pose=sampleForklift(job,t),full=forkliftFootprint(pose,.12);
    for(const guard of guards)assert.equal(overlaps(full,guard),false,`guard: forklift ${index} at ${t}`);
    // Raised tines can pass over the low stock; the chassis must always clear it.
    const body=rectangle(-.25,0,2.4,1.6).map(([along,side])=>[
      pose.x+along*Math.cos(pose.yaw)+side*Math.sin(pose.yaw),
      pose.z-along*Math.sin(pose.yaw)+side*Math.cos(pose.yaw),
    ]);
    const lowPart=pose.height-.15>LOADING.panelTop?body:forkliftFootprint(pose);
    for(const bundle of bundles)assert.equal(overlaps(lowPart,bundle),false,`panel: forklift ${index} at ${t}`);
  }
});

test('rail forklifts work on the raised deck; the truck forklift stays off it',()=>{
  const {platform,ramps}=LOADING;
  const box=d=>rectangle((d.west+d.east)/2,(d.north+d.south)/2,d.east-d.west,d.south-d.north);
  const raised=[platform,...ramps].map(box);
  const inside=([x,z])=>x>=platform.west&&x<=platform.east&&z>=platform.north&&z<=platform.south;
  // The deck edge sits just clear of the 3.2 m locomotive and the wagons.
  assert.ok(platform.north>-53-1.6&&platform.north<-53+1.6);
  for(const [index,job] of FORKLIFT_JOBS.entries()){
    const onDeck=index>0;
    assert.equal(job.base,onDeck?platform.height:0);
    for(let t=0;t<=job.duration;t+=.05){
      const pose=sampleForklift(job,t);
      const body=rectangle(-.25,0,2.4,1.6).map(([along,side])=>[
        pose.x+along*Math.cos(pose.yaw)+side*Math.sin(pose.yaw),
        pose.z-along*Math.sin(pose.yaw)+side*Math.cos(pose.yaw),
      ]);
      if(onDeck)for(const corner of body)assert.ok(inside(corner),`chassis leaves the deck: ${index} at ${t}`);
      else for(const r of raised)assert.equal(overlaps(body,r),false,`ground forklift hits the deck: ${index} at ${t}`);
    }
  }
});

test('the articulated truck keeps a 35 cm margin from pavement edges, planters, docks, gate and kerbs',()=>{
  const obstacles=[[-69,-31,6.5,10.5],[-69,-16,7.5,9.5],[-84,-29.5,2.5,25.5],[-137,-11.5,1.4,1.5],[-137,7.5,1.4,1.5]].map(r=>rectangle(...r));
  const median=NEW_ENTRANCE_MEDIAN;
  obstacles.push(rectangle((median.west+median.east)/2,median.z,median.east-median.west,median.width));
  // The boundary fence and the main-road kerbs resume outside the gate opening.
  obstacles.push(rectangle(-137,-30.75,.43,38.5),rectangle(-137,23.75,.43,32.5));
  for(const x of [-147.82,-138.18])obstacles.push(rectangle(x,110.5,.25,181));
  for(const x of LOADING.columnXs)obstacles.push(rectangle(x,LOADING.columnZ,LOADING.guardWidth,LOADING.guardWidth));
  for(const {x,width} of LOADING.panelBays)for(const z of LOADING.panelRows)obstacles.push(rectangle(x,z,width,LOADING.panelDepth));
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
  assert.ok(Math.abs(dispatchPose(1).x-DISPATCH_EXIT_ROAD_X)<1e-6);assert.ok(Math.abs(dispatchPose(1).z-DISPATCH_EXIT_ROAD_Z)<1e-6);
});

test('freight roads have straight axis-aligned edges instead of a curved swept outline',()=>{
  for(const polygon of DISPATCH_PAVEMENT)for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    assert.ok((a[0]===b[0])!==(a[1]===b[1]),'each boundary is a horizontal or vertical segment');
  }
});

test('scaled waiting trucks fit their bays and leave the dispatch route clear',()=>{
  const footprints=[];
  for(const {position:[x,,z],angle,scale} of PARKED_TRUCKS){
    const size=scale*TRUCK_SCALE;
    const corners=rectangle(-6.2,0,17.6,2.7).map(([along,side])=>[x+size*(along*Math.cos(angle)+side*Math.sin(angle)),z+size*(-along*Math.sin(angle)+side*Math.cos(angle))]);
    for(const [px,pz] of corners){assert.ok(px>-135.5&&px<-104.7);assert.ok(pz>-44&&pz<-8);}
    for(const other of footprints)assert.equal(overlaps(corners,other),false);
    footprints.push(corners);
  }
  for(let i=0;i<=1200;i++)for(const moving of truckFootprint(dispatchPose(i/1200),.35))
    for(const parked of footprints)assert.equal(overlaps(moving,parked),false,`parked TIR collision at ${i/1200}`);
});

test('planting excludes the full conifer crown from both traffic lanes and trailer turns',()=>{
  const meshes=[],updaters=[],previousDocument=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
  const kit={tablet:true,windTime:{value:0},trackMaterial(){},onDetailUpdate:fn=>updaters.push(fn),trackTexture:t=>t,box(){return {castShadow:true};},m:{},material:()=>new T.MeshBasicMaterial(),instances(geometry,material,count){const mesh=new T.InstancedMesh(geometry,material,count);meshes.push(mesh);return mesh;}};
  const plants=createVegetation(kit);
  plants.row(-147,-150,-147,36,5); // Old row intruded on the main road.
  plants.row(-151,-150,-151,36,5); // Relocated row retains the planted boundary.
  plants.grove(-173,-5,48,88,4.2);plants.grove(-110,21,47,33,3.8);
  plants.garden(-69,-31,6,10);plants.garden(-69,-16,7,9);plants.garden(-84,-29.5,2,25);
  plants.finish();
  updaters.forEach(fn=>fn({position:new T.Vector3(-500,50,0)}));
  globalThis.document=previousDocument;
  const active=meshes.filter(m=>m.count);
  assert.ok(active.reduce((sum,m)=>sum+m.count,0)>20,'keep landscaping outside traffic');
  const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
  for(const mesh of active)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);assert.ok(trafficClearance(p.x,p.z)>=2.5*scale.x+.499);}
  for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
});
