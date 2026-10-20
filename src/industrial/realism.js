import * as T from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';

// Photographic lighting and surfaces (CC0 assets from Poly Haven, see
// public/textures/pbr and public/env). Everything degrades to the original flat
// look if a file fails to load.
const BASE=import.meta.env?.BASE_URL??'/';
const PBR_SETS={
  // The plant is new: fresh pit-lane tarmac and clean concrete, no cracks or stains.
  asphalt:'asphalt_pit_lane',concrete:'rough_concrete',metal:'corrugated_iron_02',grass:'aerial_grass_rock',
};
// Average linear colour of each photo. Dividing by it leaves only the detail,
// so every surface keeps its own colour and brightness.
const PHOTO_MEAN={
  asphalt:[.055,.045,.036],concrete:[.483,.464,.336],metal:[.099,.098,.083],grass:[.169,.121,.025],
};

// Sky image for reflections and ambient light. Returns the equirectangular
// texture for use as a background, or null when it cannot be loaded.
export function loadSkyEnvironment(renderer,scene,onReady){
  new HDRLoader().load(`${BASE}env/sky_2k.hdr`,hdr=>{
    hdr.mapping=T.EquirectangularReflectionMapping;
    const pmrem=new T.PMREMGenerator(renderer);
    const previous=scene.environment;
    scene.environment=pmrem.fromEquirectangular(hdr).texture;pmrem.dispose();
    previous?.dispose?.();
    onReady?.(hdr);
  },undefined,()=>onReady?.(null));
}

function loadSet(loader,name,tablet){
  const load=(suffix,srgb)=>{
    const t=loader.load(`${BASE}textures/pbr/${name}_${suffix}.jpg`);
    t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=tablet?2:8;
    if(srgb)t.colorSpace=T.SRGBColorSpace;
    return t;
  };
  // Normal maps are left out: from aerial cameras they only brightened the surfaces.
  return {map:load('diff',true),roughnessMap:load('rough',false)};
}

// Ground slabs and roofs are huge boxes with 0..1 UVs, so sample the textures
// from world X/Z instead: one tile covers `size` metres on every surface.
function projectFromAbove(material,set,{size,mean,detail=.6}){
  // The material keeps its own colour; the photo only adds detail around it.
  Object.assign(material,set);
  material.onBeforeCompile=shader=>{
    shader.uniforms.worldTile={value:1/size};shader.uniforms.detail={value:detail};shader.uniforms.photoMean={value:new T.Vector3(...mean)};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec2 vWorldXZ;')
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 projectedWorld=modelMatrix*vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        projectedWorld=modelMatrix*instanceMatrix*vec4(transformed,1.0);
      #endif
      #ifdef USE_BATCHING
        projectedWorld=modelMatrix*batchingMatrix*vec4(transformed,1.0);
      #endif
      vWorldXZ=projectedWorld.xz;`);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform float worldTile;\nuniform float detail;\nuniform vec3 photoMean;\nvarying vec2 vWorldXZ;')
      .replace('#include <map_fragment>','vec2 worldUv=vWorldXZ*worldTile;\nvec3 photo=texture2D(map,worldUv).rgb;\ndiffuseColor.rgb*=mix(vec3(1.0),photo/photoMean,detail);')
      .replace('#include <roughnessmap_fragment>','float roughnessFactor=clamp(roughness*(.85+.3*texture2D(roughnessMap,worldUv).g),.6,1.0);');
  };
  material.customProgramCacheKey=()=>`world-projected-${size}-${detail}`;
  material.needsUpdate=true;
}

// Replace the procedural grain on the kit's shared ground materials and on the
// given roof materials with real asphalt, concrete, grass and corrugated metal.
export function applyPhotographicSurfaces(k,{roofs=[],paving=[]}={}){
  const loader=new T.TextureLoader(),tablet=!!k.tablet,sets={};
  for(const [key,name] of Object.entries(PBR_SETS))sets[key]=loadSet(loader,name,tablet);
  const M=PHOTO_MEAN;
  k.m.road.color.set('#575d61');
  projectFromAbove(k.m.road,sets.asphalt,{size:4,mean:M.asphalt,detail:.5});
  projectFromAbove(k.m.concrete,sets.concrete,{size:7,mean:M.concrete,detail:.45});
  projectFromAbove(k.m.grass,sets.grass,{size:12,mean:M.grass,detail:.35});
  for(const mat of paving)projectFromAbove(mat,sets.concrete,{size:7,mean:M.concrete,detail:.45});
  for(const mat of roofs)projectFromAbove(mat,sets.metal,{size:2.4,mean:M.metal,detail:.4});
  return sets;
}
