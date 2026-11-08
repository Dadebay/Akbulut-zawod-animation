import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {REAR_SERVICE_YARD} from './industrial/rearServiceYard.js';
import {WALK_BUILDINGS} from './industrial/walkLayout.js';

test('glazed control room faces the hall inside the rear return and keeps its doorways clear',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const p=buildProduction(k);p.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const room=REAR_SERVICE_YARD.buildings.find(b=>b.name==='rear-hall-return'),w=room.controlWindow;
    const g=p.root.getObjectByName('control-room'),b=new T.Box3().setFromObject(g);
    const shell=new T.Box3(new T.Vector3(room.x-room.width/2+.16,-.01,room.z-room.depth/2+.16),new T.Vector3(room.x+room.width/2-.16,room.height,room.z+room.depth/2-.16));
    assert.ok(shell.containsBox(b),`inside the return ${b.min.toArray()} / ${b.max.toArray()}`);
    const glazing=new T.Box3().setFromObject(g.getObjectByName('control-room-glazing'));
    assert.ok(glazing.min.z<room.z-room.depth/2+.35,'glass front on the hall side');
    // West, east and shaft doorways, up to head height.
    const doors=[
      new T.Box3(new T.Vector3(room.x-room.width/2,.1,room.z-.7),new T.Vector3(room.x-room.width/2+1.2,2.4,room.z+.7)),
      new T.Box3(new T.Vector3(room.x+room.width/2-2.6,.1,room.z+.9),new T.Vector3(room.x+room.width/2,2.4,room.z+2.3)),
      new T.Box3(new T.Vector3(room.x-.7,.1,room.z+room.depth/2-1.2),new T.Vector3(room.x+.7,2.4,room.z+room.depth/2)),
    ];
    g.traverse(o=>{
      if(!o.isMesh)return;const mb=new T.Box3().setFromObject(o);
      for(const d of doors)assert.equal(mb.intersectsBox(d),false,`${o.parent.name} blocks a doorway`);
    });
    const hall=WALK_BUILDINGS.find(b=>b.id==='new-production');
    const opening=hall.doors.find(d=>d.type==='opening'&&d.side==='south');
    assert.ok(opening,'hall wall is open to the glazing in walk mode');
    assert.equal(hall.x+opening.at-opening.width/2,w.west);assert.equal(opening.bottom,w.sill);
  }finally{k.dispose();globalThis.document=previous;}
});

test('control-room monitors do not overlap one another',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const p=buildProduction(k);p.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const bench=p.root.getObjectByName('control-room-console');
    // The screen panel is each monitor's largest mesh.
    const screens=bench.children.filter(g=>g.isGroup).map(g=>{
      const panel=g.children.filter(o=>o.isMesh).sort((a,b)=>b.geometry.parameters.width*b.geometry.parameters.height-a.geometry.parameters.width*a.geometry.parameters.height)[0];
      return new T.Box3().setFromObject(panel);
    });
    assert.equal(screens.length,9);
    for(let i=0;i<screens.length;i++)for(let j=i+1;j<screens.length;j++)
      assert.equal(screens[i].intersectsBox(screens[j]),false,`monitors ${i} and ${j} overlap`);
  }finally{k.dispose();globalThis.document=previous;}
});
