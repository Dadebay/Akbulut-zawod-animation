import * as T from 'three';
import {applyTriplanar} from './realism.js';

// Metres, linear PBR parameters, and original clean procedural surface recipes.
// No wear, cracks, rust or baked directional lighting. Maps are shared by recipe.
export const MATERIALS={
  paintedSteel:{label:'Painted steel',color:'#18569c',metalness:.35,roughness:.36,pattern:'paint',tile:1,bevel:.02},
  galvanisedSteel:{label:'Galvanised steel',color:'#a9b4bb',metalness:.86,roughness:.4,pattern:'zinc',tile:1,bevel:.015},
  stainlessSteel:{label:'Stainless steel',color:'#c0c9cf',metalness:.92,roughness:.28,pattern:'brushed',tile:1,bevel:.015},
  aluminium:{label:'Aluminium',color:'#c5cbd0',metalness:.9,roughness:.34,pattern:'brushed',tile:1,bevel:.015},
  rubber:{label:'Rubber',color:'#20262a',metalness:0,roughness:.9,pattern:'rubber',tile:.5,bevel:.015},
  tyre:{label:'Tyre',color:'#181d21',metalness:0,roughness:.94,pattern:'tread',tile:.5},
  glass:{label:'Glass',color:'#a5bbc6',metalness:0,roughness:.14,physical:true,transmission:0,ior:1.5,envMapIntensity:1.1},
  sandwichPanel:{label:'Sandwich panel · 250 mm ribs',color:'#e1e4e8',metalness:.18,roughness:.5,pattern:'panel',tile:1,bevel:.015},
  roofSheet:{label:'Roof sheet · 250 mm pitch',color:'#8795a5',metalness:.3,roughness:.48,pattern:'roof',tile:1,bevel:.01},
  concrete:{label:'Smooth concrete',color:'#b1b5b3',metalness:0,roughness:.88,pattern:'concrete',tile:4},
  brushedConcrete:{label:'Brushed concrete',color:'#a8aca9',metalness:0,roughness:.94,pattern:'screed',tile:4},
  asphalt:{label:'Fresh asphalt',color:'#575d61',metalness:0,roughness:.96,pattern:'asphalt',tile:4},
  kerb:{label:'Kerb stone · 1 m',color:'#c9cdcb',metalness:0,roughness:.88,pattern:'kerb',tile:1,bevel:.02},
  paving:{label:'Paving stone · 600 mm',color:'#a2a8a8',metalness:0,roughness:.9,pattern:'paving',tile:.6},
  grass:{label:'Grass',color:'#667c49',metalness:0,roughness:1,pattern:'grass',tile:4},
  ballast:{label:'Rail ballast',color:'#8c8e87',metalness:0,roughness:.98,pattern:'gravel',tile:2},
  sand:{label:'Sand',color:'#c8bd9f',metalness:0,roughness:1,pattern:'sand',tile:4},
  timber:{label:'Timber pallet',color:'#a28b67',metalness:0,roughness:.84,pattern:'timber',tile:1,bevel:.015},
  cardboard:{label:'Cardboard',color:'#b9a481',metalness:0,roughness:.91,pattern:'paper',tile:1,bevel:.01},
  paper:{label:'Paper bags',color:'#ebe8de',metalness:0,roughness:.93,pattern:'paper',tile:1,bevel:.01},
  plasterboard:{label:'Plasterboard stacks',color:'#e4dfcf',metalness:0,roughness:.86,pattern:'plaster',tile:1,bevel:.01},
  plastic:{label:'Plastic',color:'#dce2e5',metalness:0,roughness:.44,pattern:'paint',tile:1,bevel:.02},
};

// Existing factory calls resolve here without changing colours or builder APIs.
// Explicit surface choices take priority; arbitrary custom/animated colours keep
// their supplied PBR values and remain eligible for finish pooling.
const LEGACY_SURFACES=new Map();
const legacy=(surface,swatches)=>swatches.forEach(([color,metal,rough])=>LEGACY_SURFACES.set(`${color}:${metal}:${rough}`,surface));
legacy('roofSheet',[['#8795a5',.22,.7],['#6f8092',.25,.65],['#699780',.27,.58],['#4f8069',.23,.67],['#376955',.28,.65]]);
legacy('sandwichPanel',[['#e1e4e8',.1,.64],['#dfe2db',.04,.86],['#d9dcdc',.1,.7]]);
legacy('paving',[['#7a838c',0,.95],['#8b908d',0,.96]]);
legacy('ballast',[['#8f897c',0,1],['#8b8981',0,1]]);
legacy('concrete',[['#777e7c',0,.94],['#a0a6a2',0,.9],['#a7aaa2',0,.94]]);
legacy('glass',[['#244950',.65,.25],['#315b68',.45,.29],['#436876',.48,.31],['#879697',.24,.37],['#879da8',.24,.37],['#2e4952',.35,.3],['#385663',.5,.18],['#213c49',.35,.2],['#14232c',.25,.26],['#15313e',.45,.16],['#36545d',.38,.27],['#2a4a5c',.55,.28],['#263f4b',.4,.27],['#344e59',.38,.3],['#9fbcb7',.12,.4],['#779eac',.15,.23],['#45616e',.48,.23],['#263e4c',.45,.24],['#3a5260',.42,.28],['#304a52',.45,.28],['#30464e',.4,.24]]);

const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;

export function createSurfaceMaps(pattern,{resolution=512,anisotropy=8}={}){
  const albedo=new Uint8Array(resolution**2*4),rough=new Uint8Array(albedo.length);let mean=0;
  for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const u=x/resolution,v=y/resolution,n=hash(x,y),coarse=hash(Math.floor(x/16),Math.floor(y/16));
    let detail=(n-.5)*.025,r=.5;
    if(pattern==='zinc')detail+=(coarse-.5)*.13;
    if(pattern==='brushed')detail+=(hash(x,0)-.5)*.06;
    if(pattern==='rubber')detail+=(n-.5)*.025;
    if(pattern==='tread'){const groove=(u*8)%1<.08;detail-=groove?.13:0;r=groove?.75:.5;}
    if(pattern==='panel'){const rib=(u*4)%1;detail-=rib<.045?.06:0;r=rib<.045?.65:.48;}
    // Broad folded seams remain legible at the site-view scale. The material
    // library normalizes the map mean, retaining each roof's original colour.
    if(pattern==='roof'){
      const rib=(u*2)%1;
      detail+=rib<.105?-.24:rib<.16?.09:0;
      r=rib<.105?.67:rib<.16?.36:.48;
    }
    if(['concrete','screed','asphalt','sand','plaster','paper'].includes(pattern))detail+=(n-.5)*(pattern==='asphalt'?.16:.07);
    if(pattern==='screed')detail+=Math.sin(y*2)*.02;
    if(pattern==='kerb')detail-=(u<.006||u>.994)?.1:0;
    if(pattern==='paving')detail-=(u<.008||v<.008)?.13:0;
    if(pattern==='grass')detail+=(n-.5)*.16+Math.sin(x*.51+y*.23)*.035;
    if(pattern==='gravel')detail+=(hash(Math.floor(x/7),Math.floor(y/7))-.5)*.28;
    if(pattern==='timber')detail+=Math.sin(u*135+Math.sin(v*9)*2)*.045+(hash(x,0)-.5)*.04;
    const value=Math.round(T.MathUtils.clamp(.72+detail,0,1)*255),at=(y*resolution+x)*4;
    albedo.set([value,value,value,255],at);mean+=linear(value/255);
    const rv=Math.round(T.MathUtils.clamp(r+(n-.5)*.15,0,1)*255);rough.set([rv,rv,rv,255],at);
  }
  function texture(data,srgb){const tex=new T.DataTexture(data,resolution,resolution);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.generateMipmaps=true;tex.anisotropy=anisotropy;if(srgb)tex.colorSpace=T.SRGBColorSpace;tex.needsUpdate=true;return tex;}
  mean/=resolution**2;
  return {map:texture(albedo,true),roughnessMap:texture(rough,false),mean:[mean,mean,mean]};
}

export function createMaterialLibrary({tablet=false,trackTexture}){
  const maps=new Map();let grainRoughness=null;
  function resolve(color,metalness,roughness,options={}){
    const {surface,physical=false,...more}=options;
    const name=surface||LEGACY_SURFACES.get(`${color}:${metalness}:${roughness}`),recipe=MATERIALS[name];
    if(surface&&!recipe)throw new Error(`Unknown surface: ${surface}`);
    const params={color,metalness,roughness,...more};
    if(recipe?.physical)Object.assign(params,{metalness:recipe.metalness,roughness:recipe.roughness,transmission:0,ior:recipe.ior,envMapIntensity:recipe.envMapIntensity});
    return {params,physical:physical||!!recipe?.physical,name,recipe};
  }
  function create(resolved){
    const {params,physical,name,recipe}=resolved,mat=physical?new T.MeshPhysicalMaterial(params):new T.MeshStandardMaterial(params);
    if(recipe){
      mat.userData.surface=name;mat.userData.edgeRadius=recipe.bevel||0;
      if(recipe.pattern&&!params.map&&!params.vertexColors){
        if(!maps.has(recipe.pattern)){
          const set=createSurfaceMaps(recipe.pattern,{anisotropy:tablet?2:8});
          if(!['tread','panel','roof'].includes(recipe.pattern)){
            if(grainRoughness){set.roughnessMap.dispose();set.roughnessMap=grainRoughness;}else grainRoughness=set.roughnessMap;
          }
          maps.set(recipe.pattern,set);trackTexture(set.map);trackTexture(set.roughnessMap);
        }
        const set=maps.get(recipe.pattern);applyTriplanar(mat,set,{size:recipe.tile,mean:set.mean,detail:.65});
      }
    }
    return mat;
  }
  return {resolve,create};
}

export function createPalette(material){
  const surface=(name,color=MATERIALS[name].color,extra={})=>{const r=MATERIALS[name];return material(color,r.metalness,r.roughness,{surface:name,...extra});};
  return {
    blue:surface('paintedSteel'),blueLight:surface('paintedSteel','#427fb5'),white:surface('paintedSteel','#dce2e5'),
    steel:surface('galvanisedSteel'),polished:surface('stainlessSteel'),dark:surface('paintedSteel','#33424c'),black:surface('plastic','#17212a'),
    rubber:surface('rubber'),tyre:surface('tyre'),floor:surface('brushedConcrete','#bbc2c7'),concrete:surface('concrete','#a8aca9'),road:surface('asphalt'),
    sand:surface('sand'),grass:surface('grass'),yellow:surface('paintedSteel','#e6bc39'),orange:surface('paintedSteel','#d88824'),
    wood:surface('timber'),paper:surface('paper'),skin:material('#c2a18b',0,.8),glass:surface('glass',undefined,{transparent:true,opacity:.72}),
    light:material('#f1ebc9',0,.3,{emissive:'#fff0bf',emissiveIntensity:.4}),red:surface('paintedSteel','#ab3b39'),raw:surface('sand','#c4bfac'),
  };
}
