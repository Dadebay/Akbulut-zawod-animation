import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {brightestSkyDirection,fitSunShadow} from './industrial/lighting.js';
import {estimateTextureBytes} from './industrial/renderMetrics.js';
import {bakeStaticAO} from './industrial/staticAO.js';
import {createKit} from './industrial/kit.js';
import {applyTriplanar} from './industrial/realism.js';
import {createSurfaceMaps,MATERIALS} from './industrial/materials.js';
import {poolSurfaces} from './industrial/surfaceBatching.js';
import {profilePixelRatio} from './renderBudget.js';

test('large tablet and desktop displays keep postprocessing allocations bounded',()=>{
  for(const [w,h,tablet,limit] of [[2360,1640,true,900000],[3840,2160,false,3700000],[1280,720,true,900000]]){
    const ratio=profilePixelRatio(w,h,2,tablet);assert.ok(w*h*ratio*ratio<=limit+1);
    assert.equal(profilePixelRatio(w,h,2,tablet,.7),ratio*.7);
  }
});

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

test('triplanar detail composes with existing lighting effects and retains metal roughness',()=>{
  const mat=new T.MeshStandardMaterial({metalness:.92,roughness:.28});let called=0;
  mat.onBeforeCompile=shader=>{called++;shader.uniforms.existingLight={value:1};};
  applyTriplanar(mat,{map:new T.Texture(),roughnessMap:new T.Texture()},{size:2,mean:[.5,.5,.5]});
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
  mat.onBeforeCompile(shader);assert.equal(called,1);assert.equal(shader.uniforms.existingLight.value,1);
  assert.equal(shader.uniforms.worldTile.value,.5);assert.equal(mat.roughness,.28);
  assert.ok(shader.vertexShader.includes('inverseTransformDirection(transformedNormal,viewMatrix)'));
  assert.ok(shader.fragmentShader.includes('p.zy')&&shader.fragmentShader.includes('p.xz')&&shader.fragmentShader.includes('p.xy'));
  assert.equal(mat.bumpMap,null);mat.dispose();
});

test('surface-map normalization cannot brighten a constant factory colour on average',()=>{
  const set=createSurfaceMaps('concrete',{resolution:32}),data=set.map.image.data;let mean=0;
  for(let i=0;i<data.length;i+=4){const v=data[i]/255;mean+=v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}
  mean/=data.length/4;assert.ok(Math.abs(mean/set.mean[0]-1)<1e-10);assert.equal(set.map.colorSpace,T.SRGBColorSpace);assert.equal(set.roughnessMap.colorSpace,T.NoColorSpace);
  assert.ok(Object.values(MATERIALS).every(r=>r.roughness>=0&&r.roughness<=1&&r.metalness>=0&&r.metalness<=1));
  set.map.dispose();set.roughnessMap.dispose();
});

test('rounded construction preserves footprint and physical glass survives pooling',()=>{
  const k=createKit(new T.Scene());
  try{
    const box=k.box(2,3,4,[0,1.5,0],k.m.blue);box.geometry.computeBoundingBox();
    const bounds=box.geometry.boundingBox;assert.deepEqual(bounds.min.toArray(),[-1,-1.5,-2]);assert.deepEqual(bounds.max.toArray(),[1,1.5,2]);
    assert.ok(box.geometry.index.count>36);
    const glass=k.material('#244950',.65,.25),pane=k.box(1,1,.1,[3,1,0],glass);poolSurfaces(k);
    assert.equal(pane.material,glass);assert.ok(glass.isMeshPhysicalMaterial);assert.equal(glass.transmission,0);assert.equal(glass.metalness,0);
    assert.equal(k.m.blue.map,k.m.white.map,'factory paints share texture resources');
  }finally{k.dispose();}
});
