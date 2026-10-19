import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildOldCampusInterior,OLD_CEILING_LINE} from './industrial/oldCampusInterior.js';
import {OLD_LEFT_CAMPUS} from './industrial/siteLayout.js';
import {OLD_HALL_WALKS,oldForkMotion} from './industrial/campusLife.js';
import {forkliftFootprint} from './industrial/forkliftMotion.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  // Conservative envelope of logistics.pallet, including its bindings/deck.
  const pallet=(parent,position)=>{
    const g=k.group(position,parent);k.box(1.3,1,1.1,[0,.5,0],k.m.paper,g);return g;
  };
  try{run(buildOldCampusInterior(k,pallet),scene);}finally{k.dispose();globalThis.document=previous;}
}
const rectangle=b=>[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]];
function overlap(a,b){
  for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
    const next=polygon[(i+1)%polygon.length],n=[polygon[i][1]-next[1],next[0]-polygon[i][0]];
    const aa=a.map(p=>p[0]*n[0]+p[1]*n[1]),bb=b.map(p=>p[0]*n[0]+p[1]*n[1]);
    if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;
  }return true;
}

test('old hangar stock stays within its walls and leaves the aisle and loading doors open',()=>fixture(interior=>{
  const h=OLD_LEFT_CAMPUS.warehouse,stock=interior.stock.filter(p=>p.parent===interior.warehouse);
  assert.ok(stock.length>=20);
  for(const load of stock){
    const b=new T.Box3().setFromObject(load);
    assert.ok(b.min.x>h.x-h.width/2+.3&&b.max.x<h.x+h.width/2-.3);
    assert.ok(b.min.z>h.z-h.depth/2+.3&&b.max.z<h.z+h.depth/2-.3);
    assert.ok(b.max.z<h.z-2.5||b.min.z>h.z+2.5,'5 m centre aisle');
    for(const x of [4,24,49])assert.equal(overlap(rectangle(b),[[x-2.5,h.z],[x+2.5,h.z],[x+2.5,-131],[x-2.5,-131]]),false,'loading door access');
  }
}));

test('old ceiling products remain supported and separated across repeated cutting/press cycles',()=>fixture(interior=>{
  const line=OLD_CEILING_LINE;let sawBlank=false,sawCut=false,sawHoles=false;
  const beds=interior.supports.map(g=>new T.Box3().setFromObject(g));
  const supported=(x,z)=>beds.some(b=>x>=b.min.x-.05&&x<=b.max.x+.05&&z>=b.min.z-.05&&z<=b.max.z+.05)||
    [[64,-108.5],[64,-96]].some(([cx,cz])=>Math.hypot(x-cx,z-cz)<=1.44);
  let sawReturn=false;
  for(let time=0;time<180;time+=.1){
    interior.update(time);
    const products=interior.products.filter(p=>p.object.visible).sort((a,b)=>a.object.position.x-b.object.position.x);
    for(let i=0;i<products.length;i++){
      const p=products[i],pos=p.object.position;
      assert.equal(pos.y,line.top);
      // Check all four sheet corners through both rotating transfers, not just
      // its centre or an assumed straight path.
      for(const x of [-.66,.66])for(const z of [-.66,.66]){
        const a=p.object.rotation.y;
        assert.ok(supported(pos.x+x*Math.cos(a)+z*Math.sin(a),pos.z-x*Math.sin(a)+z*Math.cos(a)),'sheet corner is supported');
      }
      for(let j=0;j<i;j++)assert.ok(pos.distanceTo(products[j].object.position)>1.5,'sheets cannot overlap while tools dwell');
      sawReturn||=pos.z>-97&&pos.x<62;
      sawBlank||=p.blank.visible;sawCut||=p.cut.visible;sawHoles||=p.cut.visible&&p.holes.visible;
    }
  }
  assert.ok(sawBlank&&sawCut&&sawHoles&&sawReturn);
}));

test('reference details fit the old hall and leave its loading entrance open',()=>fixture((interior,scene)=>{
  scene.updateMatrixWorld(true);
  let meshes=0;
  interior.details.traverse(o=>{
    if(!o.isMesh)return;meshes++;
    const b=new T.Box3().setFromObject(o);
    assert.ok(b.min.x>=-6&&b.max.x<=68&&b.min.z>=-116.5&&b.max.z<=-88,'old hall envelope');
    if(b.max.y>6.2)assert.ok(b.min.x>=46&&b.max.x<=62&&b.min.z>=-112&&b.max.z<=-100,'tall parts fit raised annex');
    if(b.min.y<5&&b.max.y>.25){
      assert.equal(overlap(rectangle(b),[[37.8,-99],[50.2,-99],[50.2,-87],[37.8,-87]]),false,'loading entrance');
    }
  });
  assert.ok(meshes>150,'photo-inspired detail is present');
}));

test('old hall pedestrian paths and forklift sweep clear the added machinery and stock',()=>fixture((interior,scene)=>{
  scene.updateMatrixWorld(true);const obstacles=[];
  interior.root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const b=new T.Box3().setFromObject(mesh);
    if(b.max.y>.25&&b.min.y<2.3)obstacles.push(rectangle(b));
  });
  for(const {bounds:[x0,x1,z0,z1]} of OLD_HALL_WALKS){
    const body=[[x0-.45,z0-.45],[x1+.45,z0-.45],[x1+.45,z1+.45],[x0-.45,z1+.45]];
    for(const obstacle of obstacles)assert.equal(overlap(body,obstacle),false,'pedestrian aisle');
  }
  const fork=oldForkMotion();
  for(let time=0;time<180;time+=.2){
    const body=forkliftFootprint(fork(time),.3);
    for(const obstacle of obstacles)assert.equal(overlap(body,obstacle),false,`forklift aisle at ${time}`);
  }
}));
