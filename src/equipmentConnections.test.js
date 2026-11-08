import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {createEquipmentModels} from './industrial/equipmentModels.js';
import {createEquipmentConnections,machinePort} from './industrial/equipmentConnections.js';
import {buildProduction} from './industrial/production.js';
import {CALCITE_FEED_END,CALCITE_INTAKE,PROCESS_LINES} from './industrial/processPlan.js';

test('screw drive couplings clear the pipe and its elbow for a complete revolution',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
      const root=k.group([13,2,-7]);root.rotation.y=yaw;
      const rotors=[],equipment=createEquipmentModels(k,rotors),network=createEquipmentConnections(k,root,equipment,rotors);
      const inlet=k.group([0,3,0],root),outlet=k.group([6,7,0],root);
      const from=machinePort(k,inlet,'out',[0,0,0],[1,0,0],.22,'solid');
      const to=machinePort(k,outlet,'in',[0,0,0],[0,-1,0],.22,'solid');
      const path=network.connect(from,to,{via:[[6,3,0]],kind:'mechanical'});
      const pipe=path.getSpacedPoints(Math.ceil(path.getLength()/.02));
      assert.ok(rotors.length>0,'the drive still rotates');
      for(let step=0;step<=24;step++){
        for(const rotor of rotors)rotor.object.rotation[rotor.axis]=step*Math.PI/12;
        scene.updateMatrixWorld(true);
        for(const {object} of rotors)object.traverse(mesh=>{
          if(!mesh.isMesh)return;
          const matrix=new T.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
          const vertices=mesh.geometry.attributes.position;
          for(let i=0;i<vertices.count;i++){
            const p=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix);
            assert.ok(pipe.every(q=>p.distanceTo(q)>.24),'rotating coupling penetrates the pipe');
          }
        });
      }
    }
  }finally{k.dispose();globalThis.document=previous;}
});

test('calcite rock follows connected equipment from the receiving belt through TY-001 to the dry-mix bin',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(k),connections=new Set();
    production.root.traverse(object=>{
      const connection=object.userData.connection;
      if(connection)connections.add(`${connection.fromMachine} → ${connection.toMachine}`);
    });
    for(const pair of [
      'interior-twin-roll-feed → interior-transfer-weigher',
      'interior-transfer-weigher → interior-hammer-mill',
      'interior-hammer-mill → machine-TY',
      'machine-TY → interior-calcite-hopper',
      'interior-calcite-hopper → interior-calcite-elevator',
      'interior-calcite-elevator → interior-calcite-screen',
      'interior-calcite-screen → interior-drymix-day-bin',
    ])assert.ok(connections.has(pair),`missing ${pair}`);
    assert.ok(production.root.getObjectByName('machine-TY').userData.ports.in.connected);
    assert.ok(production.root.getObjectByName('machine-TY').userData.ports.out.connected);
    const route=PROCESS_LINES.find(line=>line.id==='calcite').points;
    assert.deepEqual(route[0],CALCITE_INTAKE);
    assert.deepEqual(route[1],CALCITE_FEED_END);
    assert.deepEqual(route.at(-1),[-50.2,6.8,-18]);
  }finally{k.dispose();globalThis.document=previous;}
});
