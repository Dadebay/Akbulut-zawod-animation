import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../assets.js';

export const TRUCK_LAYOUT={
  kingpinX:-2.6,trailerOffsetX:-5.5,deckHeight:1.36,cargoZ:.40,
  cargoXs:[-5.2,-3.2,-1.2,.8,2.8,4.4],
};

export function createTruckBuilder(k,pallet){
  const {m,box,cyl,ring,rod,group,mesh,material,textPlate}=k,records=[];
  const paint=material('#f3f4f2',.2,.32),blue=paint,alloy=material('#aeb7bc',.82,.32),frame=material('#283039',.65,.6);
  const curtain=material('#f0f1ef',0,.87),curtainBlue=curtain,marker=material('#d69a40',.15,.38);
  function wheel(parent,x,z,r=.51,dual=false){
    const g=group([x,r,z],parent,true);g.userData.wheelKey=`truck:${r}:${Math.sign(z)}:${dual}`;
    const profile=[[r*.55,-.17],[r*.76,-.17],[r*.96,-.14],[r,-.095],[r,.095],[r*.96,.14],[r*.76,.17],[r*.55,.17]].map(([rr,z])=>new T.Vector2(rr,z));
    const tyre=mesh(new T.LatheGeometry(profile,k.tablet?24:64),m.rubber,[0,0,0],g);tyre.rotation.x=Math.PI/2;
    if(dual){const second=tyre.clone();second.position.z=z>0?-.29:.29;g.add(second);}
    const side=z>0?1:-1,hub=cyl(r*.58,.10,[0,0,side*.12],alloy,g,undefined,48);hub.rotation.x=Math.PI/2;
    ring(r*.64,.025,[0,0,side*.17],alloy,g,'z');
    const axle=cyl(.13,.14,[0,0,side*.18],frame,g);axle.rotation.x=Math.PI/2;
    for(let a=0;a<10;a++){
      const angle=a*Math.PI/5,xx=Math.sin(angle)*.23,yy=Math.cos(angle)*.23;
      const hole=cyl(.044,.012,[xx,yy,side*.177],m.black,g,undefined,12);hole.rotation.x=Math.PI/2;
      const bolt=cyl(.022,.025,[xx*.64,yy*.64,side*.21],alloy,g,undefined,6);bolt.rotation.x=Math.PI/2;
    }
    ring(r*.87,.005,[0,0,side*.154],m.black,g,'z');
    const treads=k.tablet?20:64;
    for(let a=0;a<treads;a++){const t=a/treads*Math.PI*2;const tread=box(.013,.005,.19,[Math.sin(t)*(r-.001),Math.cos(t)*(r-.001),0],m.black,g);tread.rotation.z=-t;}
    return g;
  }
  function fender(parent,x,z,r=.58){
    const cover=mesh(new T.TorusGeometry(r,.05,5,24,Math.PI),frame,[x,.51,z],parent);cover.scale.z=4;
    box(.10,.43,.44,[x-r,.34,z],m.rubber,parent);
  }
  function foldedCurtain(parent,z){
    const folded=group([5.68,2.67,z],parent);
    for(let i=0;i<15;i++){
      const leaf=box(.075,2.52,.11,[(i-7)*.067,0,(i%2?-.065:.065)],i%3?curtain:curtainBlue,folded,.02);
      leaf.rotation.y=i%2?.3:-.3;
    }
    for(const y of [-.85,.15])box(1.03,.045,.015,[0,y,z>0?.14:-.14],frame,folded);
  }
  function build(pos,angle=0,active=false){
    const g=group(pos,k.scene,true);g.rotation.y=angle;
    const ws=[];
    for(const z of [-1.07,1.07])ws.push(wheel(g,.55,z,.535));
    // The scanned cab is installed asynchronously. The chassis stays editable so
    // the fifth wheel, trailer and load can move as separate assemblies.
    for(const z of [-.42,.42])box(5.2,.22,.12,[-1.3,.74,z],frame,g);
    for(let x=-3.5;x<1.3;x+=.65)box(.12,.12,1,[x,.72,0],frame,g);
    for(const z of [-1.02,1.02]){
      ws.push(wheel(g,-2.85,z,.51,true));fender(g,-2.85,z);
      const tank=cyl(.37,1.5,[-1.1,.69,z*.75],alloy,g);tank.rotation.z=Math.PI/2;
      for(const x of [-1.65,-.55]){const strap=ring(.38,.032,[x,.69,z*.75],frame,g,'x');}
      box(2.0,.46,.06,[-1.4,.62,z*1.16],blue,g,.06);
    }
    box(1.35,.07,1.5,[-2.35,1.05,0],alloy,g);
    cyl(.55,.12,[TRUCK_LAYOUT.kingpinX,1.15,0],frame,g);
    // Coiled air hoses behind the sleeper cab.
    for(const [z,mat] of [[-.22,blue],[.15,m.red]])for(let i=0;i<9;i++)ring(.12,.022,[-.75-i*.085,1.55+Math.sin(i/9*Math.PI)*.23,z],mat,g,'x');
    const cabMount=group([0,0,0],g,true);

    const hinge=group([TRUCK_LAYOUT.kingpinX,0,0],g,true),trailer=group([TRUCK_LAYOUT.trailerOffsetX,0,0],hinge);
    box(13.6,.20,2.55,[0,1.18,0],frame,trailer);box(13.5,.12,2.48,[0,1.30,0],m.wood,trailer);
    for(const z of [-.68,.68])box(13.1,.28,.13,[0,.94,z],frame,trailer);
    for(let x=-6.6;x<6.7;x+=.55)box(.07,.10,2.4,[x,1.05,0],alloy,trailer);
    for(const z of [-1.28,1.28]){
      box(13.6,.15,.085,[0,1.32,z],alloy,trailer);box(13.6,.16,.10,[0,3.98,z],blue,trailer);
      for(const x of [-6.65,6.65])box(.09,2.6,.09,[x,2.67,z],alloy,trailer);
      foldedCurtain(trailer,z);
      // Edge lights, lashing hooks, and underside protection stay below the load.
      for(let x=-6.3;x<6.5;x+=1.55){box(.13,.055,.035,[x,1.15,z],marker,trailer);ring(.045,.013,[x,1.42,z],frame,trailer,'z');}
      for(const y of [.62,.84])box(5.6,.09,.06,[.8,y,z*.91],alloy,trailer);
      for(const x of [-1.3,2.7])box(.08,.64,.08,[x,.83,z*.91],frame,trailer);
    }
    // Taut roof with bows; open sides and folded curtains make every pallet visible.
    box(13.6,.07,2.55,[0,4.08,0],curtain,trailer,.025);
    for(let x=-6.4;x<6.6;x+=1.05)box(.045,.06,2.48,[x,3.96,0],alloy,trailer);
    box(.10,2.62,2.5,[6.7,2.69,0],paint,trailer);
    for(const z of [-.62,.62]){
      box(.10,2.58,1.22,[-6.75,2.68,z],paint,trailer);
      for(const zz of [-.22,.22])rod([-6.82,1.51,z+zz],[-6.82,3.85,z+zz],.023,alloy,trailer);
      box(.10,.16,.43,[-6.83,.99,z],m.red,trailer);
    }
    box(.10,.13,2.2,[-6.88,.49,0],alloy,trailer);
    for(const z of [-.86,.86]){box(.14,.53,.14,[3.8,.85,z],frame,trailer);box(.36,.06,.3,[3.8,.57,z],alloy,trailer);}
    for(const x of [-4.8,-3.55,-2.3])for(const z of [-1.09,1.09]){ws.push(wheel(trailer,x,z,.49));fender(trailer,x,z,.56);}
    textPlate('AK BULUT',1.2,.18,[1.4,1.16,1.33],trailer,'#f4f6f7','#174e8d');
    const cargo=TRUCK_LAYOUT.cargoXs.map((x,i)=>pallet(trailer,[x,TRUCK_LAYOUT.deckHeight,active?TRUCK_LAYOUT.cargoZ:0],i<3?'panel':'bags',active));
    if(k.tablet&&!active){
      // Parked wheels and trailers never animate; batch them with their chassis.
      ws.forEach(w=>{w.userData.dynamic=false;});hinge.userData.dynamic=false;
    }
    const record={g,ws,cargo,hinge,trailer,cabMount};records.push(record);return record;
  }
  function load(onLoaded){
    let cancelled=false;
    new GLTFLoader().load(assetUrl(k.tablet?'models/man-tractor-cab-tablet.glb':'models/man-tractor-cab.glb'),asset=>{
      if(cancelled){asset.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});return;}
      asset.scene.traverse(o=>{if(o.isMesh){
        const mat=o.material;mat.metalness=0;mat.roughness=.85;
        if(mat.map)mat.map.anisotropy=k.tablet?2:8;
        // Preserve the scan's UV detail, recolouring only its red paint. Glass,
        // grille, lamps, wheels and badges keep the original scanned texture.
        mat.onBeforeCompile=shader=>{
          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCabPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCabPosition = position;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCabPosition;').replace('#include <map_fragment>',`#include <map_fragment>
            #ifdef USE_MAP
              float vCabHeight = vCabPosition.y;
              float redPaint = smoothstep(0.025, 0.10, sampledDiffuseColor.r - max(sampledDiffuseColor.g, sampledDiffuseColor.b) * 1.6);
              float bright = max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b));
              bool sidePanel = abs(vCabPosition.z) > 1.01 && vCabHeight > 1.06 && vCabHeight < 2.13 && vCabPosition.x < 1.90;
              float cleanPaint = (vCabHeight > 3.12 || sidePanel) ? smoothstep(0.045, 0.12, bright) : 0.0;
              redPaint = max(redPaint, cleanPaint);
              vec3 bodyPaint = vec3(0.88, 0.90, 0.89);
              float scanShade = 0.90 + sampledDiffuseColor.r * 0.10;
              diffuseColor.rgb = mix(diffuseColor.rgb, bodyPaint * scanShade, redPaint);
              bool glazing = vCabHeight > 2.24 && vCabHeight < 2.99 && vCabPosition.x > 1.72 && abs(vCabPosition.z) < 0.98;
              if(glazing) diffuseColor.rgb = vec3(0.035, 0.055, 0.072);
            #endif`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
            #ifdef USE_MAP
              if(glazing) roughnessFactor = 0.20;
            #endif`);
        };
        mat.customProgramCacheKey=()=> 'akbulut-man-white-v7';
      }});
      k.trackObject(asset.scene);
      for(const record of records){
        let cab;
        if(k.tablet){
          cab=new T.LOD();cab.addLevel(asset.scene.getObjectByName('CabNear').clone(true),0);cab.addLevel(asset.scene.getObjectByName('CabFar').clone(true),45,.15);
        }else cab=asset.scene.clone(true);
        record.cabMount.add(cab);
        cab.traverse(o=>{if(o.isMesh){o.castShadow=!k.tablet;o.receiveShadow=true;}if(!o.isLOD){o.updateMatrix();o.matrixAutoUpdate=false;}});
      }
      onLoaded?.();
    },undefined,error=>console.error('TIR model could not be loaded',error));
    return()=>{cancelled=true;};
  }
  // Share the existing scan and materials with the quarry's rigid tipper.
  function mountCab(parent,pos=[0,0,0],scale=1){const cabMount=group(pos,parent,true);cabMount.scale.setScalar(scale);records.push({cabMount});return cabMount;}
  return {build,load,mountCab,wheel};
}
