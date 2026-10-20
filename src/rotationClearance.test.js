import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {createEquipmentModels} from './industrial/equipmentModels.js';
import {createArchiveEquipment} from './industrial/archiveEquipment.js';
import {buildProduction} from './industrial/production.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true}),rotors=[];
  const equipment=createEquipmentModels(kit,rotors),archive=createArchiveEquipment(kit,equipment);
  try{run({scene,kit,equipment,archive,rotors});}finally{kit.dispose();globalThis.document=previous;}
}
function dynamics(root){const result=[];root.traverse(o=>{if(o.userData.dynamic)result.push(o);});return result;}
function sweep(object,axis,reference,check){
  const angle=object.rotation[axis];
  for(let step=0;step<72;step++){
    object.rotation[axis]=step*Math.PI/36;reference.updateWorldMatrix(true,true);
    object.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const matrix=new T.Matrix4().copy(reference.matrixWorld).invert().multiply(mesh.matrixWorld);
      const vertices=mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++)check(new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix));
    });
  }
  object.rotation[axis]=angle;
}

test('open screws and both mixer types keep a full revolution above their floors and inside walls',()=>fixture(({kit,archive})=>{
  for(const [kind,options,floor,side,ceiling] of [['screw',{},1.06,.405,1.85],['mixer',{},1.065,.85,2.65],['mixer',{pan:true},1.17,1.5,2.3]]){
    const g=kit.group();archive.builders[kind](g,'BS',options);
    const rotor=dynamics(g)[0];assert.ok(rotor);
    sweep(rotor,options.pan?'y':'x',g,p=>{
      assert.ok(p.y>floor+.025,`${kind}: rotating part crosses floor at ${p.y}`);
      assert.ok(p.y<ceiling-.025,`${kind}: rotating part reaches inlet pipe`);
      assert.ok(options.pan?Math.hypot(p.x,p.z)<side-.025:Math.abs(p.z)<side-.025,`${kind}: rotating part crosses side wall`);
    });
    if(options.pan){
      const outlet=g.children.find(o=>o.isMesh&&o.geometry.type==='CylinderGeometry'&&Math.abs(o.position.y-1.4)<.001);
      outlet.geometry.computeBoundingBox();outlet.updateMatrix();
      const bounds=outlet.geometry.boundingBox.clone().applyMatrix4(outlet.matrix);
      assert.ok(bounds.min.x>=1.5-1e-6,'pan outlet must start outside the paddle chamber');
    }
  }
}));

test('fan impellers turn behind the stationary inlet face and duct',()=>fixture(({kit,archive})=>{
  for(const blower of [false,true]){
    const g=kit.group();archive.builders.fan(g,'BS',{blower});const rotor=dynamics(g)[0];
    sweep(rotor,'z',g,p=>{
      assert.ok(p.z>-.295&&p.z<.32,'impeller crosses a volute face');
      assert.ok(p.z<g.userData.ports.in.position.z-.1,'impeller crosses the intake pipe');
      assert.ok(Math.hypot(p.x+.4,p.y-1.1)<.82,'impeller crosses volute perimeter');
    });
  }
}));

test('mill flywheel details face outwards and clear both housing faces',()=>fixture(({kit,archive})=>{
  const g=kit.group();archive.builders.mill(g,'TY');
  for(const rotor of dynamics(g))sweep(rotor,'z',g,p=>assert.ok(Math.abs(p.z)>1.15,'flywheel enters housing or inspection cover'));
}));

test('archive drum seals and radial ducts are beyond its rotating end faces',()=>fixture(({kit,archive})=>{
  for(const length of [8,12]){
    const g=kit.group();archive.builders.drum(g,'BS',{length});const rotor=dynamics(g)[0];
    sweep(rotor,'x',g,p=>assert.ok(Math.abs(p.x)<=length/2+.001));
    for(const mesh of g.children.filter(o=>o.isMesh&&o.geometry.type==='TubeGeometry')){
      const bounds=new T.Box3().setFromObject(mesh);
      assert.ok(bounds.min.x>length/2+.1,'radial duct cuts into rotating shell');
    }
    assert.ok(g.userData.ports.in.position.x<-length/2-.4);
    assert.ok(g.userData.ports.out.position.x>length/2+.4);
    for(const mesh of g.children.filter(o=>o.isMesh&&o.geometry.type==='CylinderGeometry'&&o.geometry.parameters.radiusBottom>=.55)){
      const bounds=new T.Box3().setFromObject(mesh);
      assert.ok(bounds.min.x>length/2+.025||bounds.max.x<-length/2-.025,'stationary drum cap crosses rotating end');
    }
  }
}));

test('belt rollers remain tangent to the belt and compressor fans clear the louvers',()=>fixture(({kit,archive})=>{
  const belt=kit.group();archive.builders.belt(belt,'GK');
  for(const rotor of dynamics(belt).filter(o=>o.children[0].geometry.type==='CylinderGeometry'))sweep(rotor,'z',belt,p=>{
    assert.ok(p.y<=1.16+1e-6,'roller penetrates belt underside');
    assert.ok(Math.abs(p.z)<.6-.05,'roller penetrates side frame');
  });
  const compressor=kit.group();archive.builders.compressor(compressor,'BS');
  sweep(dynamics(compressor)[0],'z',compressor,p=>assert.ok(p.z>.87,'fan cuts through fixed vent slats'));
}));

test('calciner support rollers clear pedestals and keep raised details away from the tire contact',()=>fixture(({kit,equipment,rotors})=>{
  const g=kit.group();equipment.BS(g);
  for(const {object,axis} of rotors.filter(r=>r.object.children[0]?.geometry.parameters.radiusBottom===.43)){
    sweep(object,axis,g,p=>{
      assert.ok(p.y>.63+.025,'roller cuts through pedestal');
      assert.ok(Math.hypot(p.y-object.position.y,p.z-object.position.z)<=.43+1e-6,'roller detail clips rotating tire');
    });
  }
  const drum=rotors.find(r=>r.object.children[0]?.geometry.parameters.radiusBottom===1.5).object;
  sweep(drum,'x',g,p=>assert.ok(Math.abs(p.x)<5.215,'rotating drum enters fixed end seal'));
}));

test('assembled jaw flywheels clear cheek ribs, hopper and guards for a complete revolution',()=>fixture(({kit})=>{
  const production=buildProduction(kit);
  const wheels=production.rotors.filter(r=>r.zone==='CR'&&r.object.children[0]?.geometry.parameters.radiusBottom===1.15);
  assert.equal(wheels.length,2);
  for(const {object,axis} of wheels)sweep(object,axis,object.parent,p=>{
    assert.ok(Math.abs(p.z)>1.775,'jaw flywheel cuts into cheek ribs or hopper');
    assert.ok(Math.abs(p.z)<2.16,'jaw flywheel cuts into safety guard');
  });
}));

test('all archive rotary mechanisms keep their angles when simulation time is paused',()=>fixture(({kit,archive})=>{
  const all=kit.group();
  for(const [kind,options] of [['screw',{}],['screw',{closed:true}],['valve',{}],['fan',{}],['elevator',{}],['mixer',{}],['mixer',{pan:true}],['mill',{}],['mill',{vertical:true}],['drum',{}],['belt',{}],['bagStation',{rotary:true}],['table',{synchronized:true}],['compressor',{}],['pump',{}]])archive.builders[kind](kit.group([0,0,0],all),'BS',options);
  archive.update(.5,()=>true);
  const moving=dynamics(all),before=moving.map(o=>o.rotation.toArray());
  assert.ok(moving.some(o=>Math.abs(o.rotation.x)+Math.abs(o.rotation.y)+Math.abs(o.rotation.z)>.01));
  archive.update(0,()=>true);
  assert.deepEqual(moving.map(o=>o.rotation.toArray()),before);
}));

// The internal disc may turn through its own air chamber, but must never reach
// the external reducers where connected pipe diameters can become much smaller.
test('butterfly damper stays between its flange planes throughout its travel',()=>fixture(({kit,archive})=>{
  const g=kit.group();archive.builders.butterfly(g,'BS');
  sweep(dynamics(g)[0],'y',g,p=>{
    assert.ok(Math.abs(p.x)<g.userData.ports.in.position.x-.05,'damper disc reaches a pipe reducer');
    assert.ok(Math.hypot(p.y-.8,p.z)<.6-.025,'damper disc penetrates its casing');
  });
}));
