import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {brightestSkyDirection,fitSunShadow} from './industrial/lighting.js';
import {estimateTextureBytes} from './industrial/renderMetrics.js';
import {bakeStaticAO} from './industrial/staticAO.js';
import {createKit} from './industrial/kit.js';

test('HDR sun matches the upper-hemisphere equirectangular texel',()=>{
  const width=8,height=4,data=new Float32Array(width*height*4);data.set([30,30,30,1],(1*width+4)*4);
  const direction=brightestSkyDirection({data,width,height},T.FloatType);
  assert.ok(Math.abs(direction.length()-1)<1e-8);assert.ok(direction.y>0);
  assert.ok(Math.abs(Math.atan2(direction.z,direction.x)/(2*Math.PI)+.5-4.5/8)<1e-8);
  assert.ok(Math.abs(.5-Math.asin(direction.y)/Math.PI-1.5/4)<1e-8);
});

test('close-view shadows meet the texel budget and sub-texel motion stays snapped',()=>{
  const camera=new T.PerspectiveCamera(36,16/9,.5,2800),sun=new T.DirectionalLight(),target=new T.Vector3(),direction=new T.Vector3(.5,.8,.3).normalize();camera.position.set(18,12,18);
  const {texel}=fitSunShadow(sun,camera,target,direction);assert.ok(texel>=.02&&texel<=.05);
  const before=sun.position.clone();target.x=.00001;fitSunShadow(sun,camera,target,direction);
  // Translation along the light axis is immaterial; the shadow grid stays fixed.
  const delta=sun.position.clone().sub(before);assert.ok(delta.clone().cross(direction).length()<1e-8);
  assert.equal(sun.shadow.normalBias,.03);
});

test('texture accounting includes mipmaps and half-float environment storage',()=>{
  const tex=new T.DataTexture(null,1024,1024,T.RGBAFormat,T.HalfFloatType);tex.generateMipmaps=false;
  assert.equal(estimateTextureBytes(tex),8*1024*1024);tex.generateMipmaps=true;assert.equal(estimateTextureBytes(tex),8*1024*1024*4/3);
});

test('tablet AO darkens static contacts without baking a moving assembly',()=>{
  const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})})})};
  const k=createKit(new T.Scene(),{tablet:true});
  try{
    k.box(12,.2,12,[0,-.1,0],k.m.concrete);const wall=k.box(3,4,.4,[0,2,0]);
    const moving=k.group([4,0,0],k.scene,true),vehicle=k.box(2,2,2,[0,1,0],k.m.white,moving);
    bakeStaticAO(k);assert.ok(Math.max(...wall.geometry.attributes.staticOcclusion.array)>.05);assert.equal(vehicle.geometry.attributes.staticOcclusion,undefined);
    assert.deepEqual(k.m.white.defaultAttributeValues.staticOcclusion,[0]);
  }finally{k.dispose();globalThis.document=old;}
});
