import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {batchWheels} from './industrial/wheelInstancing.js';

test('shared wheels retain vehicle movement, wheel rotation and departure visibility',()=>{
  const scene=new T.Scene(),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshBasicMaterial();
  const vehicles=[],parts=[],instances=[];
  for(const x of [5,30]){
    const vehicle=new T.Group();vehicle.position.x=x;scene.add(vehicle);vehicles.push(vehicle);
    const wheel=new T.Group();wheel.userData={dynamic:true,wheelKey:'matching-wheel'};wheel.position.y=2;vehicle.add(wheel);
    const part=new T.Mesh(geometry,material);wheel.add(part);parts.push(part);
  }
  const update=batchWheels({scene,tablet:true,instances(g,m,count){const o=new T.InstancedMesh(g,m,count);scene.add(o);instances.push(o);return o;}});
  update();assert.equal(instances.length,1);assert.equal(instances[0].count,2);
  const matrix=new T.Matrix4();instances[0].getMatrixAt(0,matrix);assert.equal(matrix.elements[12],5);
  vehicles[0].position.x=12;parts[0].parent.rotation.z=Math.PI/2;update();instances[0].getMatrixAt(0,matrix);
  assert.equal(matrix.elements[12],12);assert.ok(Math.abs(matrix.elements[1]-1)<1e-6);
  vehicles[0].visible=false;update();assert.equal(instances[0].count,1);instances[0].getMatrixAt(0,matrix);assert.equal(matrix.elements[12],30);
  vehicles[0].visible=true;update();assert.equal(instances[0].count,2);
  geometry.dispose();material.dispose();instances.forEach(o=>o.dispose());
});
