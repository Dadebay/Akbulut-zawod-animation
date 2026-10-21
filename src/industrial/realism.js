import * as T from 'three';
import {assetUrl} from '../assets.js';
import {brightestSkyDirection,orientSkyToFront} from './lighting.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {Sky} from 'three/addons/objects/Sky.js';

// Bake a cloudless midday sky once; its visible sun and reflections share
// the same direction as the scene's direct light. No per-frame sky rendering.
export function createSunnyEnvironment(renderer){
  const sunDirection=new T.Vector3(-.38,.91,.21).normalize();
  const skyScene=new T.Scene(),sky=new Sky();sky.scale.setScalar(10000);skyScene.add(sky);
  const uniforms=sky.material.uniforms;
  uniforms.turbidity.value=1.5;uniforms.rayleigh.value=1;
  uniforms.mieCoefficient.value=.002;uniforms.mieDirectionalG.value=.8;
  uniforms.sunPosition.value.copy(sunDirection).multiplyScalar(450000);
  const background=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType});
  new T.CubeCamera(.1,20000,background).update(renderer,skyScene);
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromCubemap(background.texture);
  pmrem.dispose();sky.geometry.dispose();sky.material.dispose();
  return {background:background.texture,texture:environment.texture,sunDirection,
    dispose(){background.dispose();environment.dispose();}};
}

// Sky image for reflections and ambient light. Returns the equirectangular
// texture for use as a background, or null when it cannot be loaded.
export function loadSkyEnvironment(renderer,scene,onReady){
  let disposed=false,sky=null,target=null;
  new HDRLoader().load(assetUrl('env/sky_2k.hdr'),hdr=>{
    if(disposed){hdr.dispose();return;}
    sky=hdr;hdr.mapping=T.EquirectangularReflectionMapping;
    const pmrem=new T.PMREMGenerator(renderer);
    target=pmrem.fromEquirectangular(hdr);pmrem.dispose();scene.environment=target.texture;
    onReady?.(hdr,orientSkyToFront(scene,brightestSkyDirection(hdr.image,hdr.type)));
  },undefined,()=>{if(!disposed)onReady?.(null);});
  return ()=>{disposed=true;sky?.dispose();target?.dispose();};
}

// World-space box projection uses the transformed normal, including nonuniform
// instance scales and BatchedMesh transforms. No tangent-space normal map is
// sampled with an unrelated mesh UV/TBN. Detail only modulates the mean colour.
export function applyTriplanar(material,set,{size=1,mean=[1,1,1],detail=.6}={}){
  Object.assign(material,{map:set.map,roughnessMap:set.roughnessMap,bumpMap:null});
  const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    Object.assign(shader.uniforms,{worldTile:{value:1/size},surfaceDetail:{value:detail},photoMean:{value:new T.Vector3(...mean)}});
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vSurfaceWorld; varying vec3 vSurfaceNormal;')
      .replace('#include <project_vertex>',`#include <project_vertex>
        vec4 surfacePosition=vec4(transformed,1.0);
        #ifdef USE_BATCHING
          surfacePosition=batchingMatrix*surfacePosition;
        #endif
        #ifdef USE_INSTANCING
          surfacePosition=instanceMatrix*surfacePosition;
        #endif
        vSurfaceWorld=(modelMatrix*surfacePosition).xyz;
        vSurfaceNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform float worldTile; uniform float surfaceDetail; uniform vec3 photoMean;
        varying vec3 vSurfaceWorld; varying vec3 vSurfaceNormal;
        vec4 surfaceSample(sampler2D tex,vec3 p,vec3 weights){
          vec3 dx=dFdx(p),dy=dFdy(p);
          // Flat walls/roofs need one sample; retain blended box mapping on edges.
          // Explicit derivatives keep mip selection correct across branch edges.
          if(weights.x>.999)return textureGrad(tex,p.zy,dx.zy,dy.zy);
          if(weights.y>.999)return textureGrad(tex,p.xz,dx.xz,dy.xz);
          if(weights.z>.999)return textureGrad(tex,p.xy,dx.xy,dy.xy);
          return textureGrad(tex,p.zy,dx.zy,dy.zy)*weights.x+textureGrad(tex,p.xz,dx.xz,dy.xz)*weights.y+textureGrad(tex,p.xy,dx.xy,dy.xy)*weights.z;
        }`)
      .replace('#include <map_fragment>',`vec3 surfaceWeights=pow(abs(normalize(vSurfaceNormal)),vec3(4.0));
        surfaceWeights/=max(dot(surfaceWeights,vec3(1.0)),0.00001);
        vec3 surfaceUv=vSurfaceWorld*worldTile;
        vec4 sampledDiffuseColor=surfaceSample(map,surfaceUv,surfaceWeights);
        diffuseColor.rgb*=mix(vec3(1.0),sampledDiffuseColor.rgb/photoMean,surfaceDetail);`)
      .replace('#include <roughnessmap_fragment>',`float roughnessFactor=clamp(roughness*(.75+.5*surfaceSample(roughnessMap,surfaceUv,surfaceWeights).g),.04,1.0);`);
  };
  material.customProgramCacheKey=()=>`${cacheKey}:triplanar-v1:${size}:${detail}:${mean.join(',')}`;
  material.needsUpdate=true;
}
