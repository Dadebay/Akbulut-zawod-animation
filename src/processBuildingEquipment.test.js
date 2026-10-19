import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {PROCESS_BUILDINGS} from './industrial/siteLayout.js';

test('reference equipment fits both buildings, clears service aisles and has connected process ports',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    scene.updateMatrixWorld(true);
    const entries=production.interiorInventory.filter(e=>e.building),bounds=[];
    assert.ok(entries.some(e=>e.building==='main')&&entries.some(e=>e.building==='rear'));
    for(const entry of entries){
      const object=production.root.getObjectByName(`interior-${entry.id}`);
      const b=new T.Box3().setFromObject(object),shell=PROCESS_BUILDINGS[entry.building];
      assert.ok(b.min.x>shell.x-shell.width/2&&b.max.x<shell.x+shell.width/2,`${entry.id}: side walls`);
      assert.ok(b.min.z>shell.z-shell.depth/2&&b.max.z<shell.z+shell.depth/2,`${entry.id}: end walls`);
      assert.ok(b.min.y>=0&&b.max.y<shell.height,`${entry.id}: floor/roof`);
      // The main tower stair is south of z=15; the rear service walkway is
      // z=19.35..20.45 and its stair occupies x=2.7..3.8, z=10.3..20.
      const aisles=entry.building==='main'
        ? [new T.Box3(new T.Vector3(-36,0,15),new T.Vector3(-29,26,17.8))]
        : [new T.Box3(new T.Vector3(-17.5,6.5,19.35),new T.Vector3(2.5,13.3,20.45)),
          new T.Box3(new T.Vector3(2.7,0,10.3),new T.Vector3(3.8,13.3,20))];
      for(const aisle of aisles)assert.equal(b.intersectsBox(aisle),false,`${entry.id}: service access`);
      for(const [other,c] of bounds)assert.equal(b.intersectsBox(c),false,`${entry.id} overlaps ${other}`);
      bounds.push([entry.id,b]);
      const ports=object.userData.ports;
      if(['process-silo','hopper','filter','drum'].includes(entry.kind)){
        assert.ok(ports.in.connected,`${entry.id}: inlet`);
        assert.ok(ports.out.connected,`${entry.id}: outlet`);
      }
      assert.ok(entry.sourceFiles.every(file=>file.startsWith('photo_2026-10-20_')));
    }
    // Drives are part of the existing run/pause lifecycle, including after
    // scene batching: pausing must not keep the added valves/drum turning.
    const rotor=production.root.getObjectByName('interior-rear-thermal-drum').children.find(c=>c.userData.dynamic);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(zone=>[zone,{status:'running'}]));
    const angle=rotor.rotation.x;
    production.updateMotion(.5,{preview:true,active,showInterior:true});
    assert.notEqual(rotor.rotation.x,angle);
    const paused=rotor.rotation.x;
    production.updateMotion(0,{preview:true,active,showInterior:true});
    assert.equal(rotor.rotation.x,paused);
  }finally{kit.dispose();globalThis.document=previous;}
});
