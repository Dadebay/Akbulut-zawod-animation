import * as T from 'three';
import {createVegetation} from './vegetation.js';
import {buildRoads} from './roads.js';
import {buildOldCampus} from './oldCampus.js';
import {buildNewFrontCourt} from './newFrontCourt.js';
import {buildNewFactoryEntrance} from './newFactoryEntrance.js';
import {buildProcessingBuildings} from './processingBuildings.js';
import {buildRawYard} from './rawYard.js';
import {buildFishPond} from './fishPond.js';
import {buildOuterRail} from './outerRail.js';
import {buildPondApproach} from './pondApproach.js';
import {buildCornerSilo} from './rawInfeed.js';
import {buildGypsumReceivingHall} from './gypsumReceivingHall.js';
import {buildBoulderPiles} from './rubble.js';
import {GYPSUM_STOCKYARD as STOCKYARD,GYPSUM_SILO_TOWER as SILO_TOWER,LOADER_STOCK,NEW_FACTORY_ENTRANCE as ENTRANCE} from './siteLayout.js';

// Proportions traced from user-supplied architectural renders 220–227.
// These presentation dimensions are not survey measurements.
export function buildSite(k){
  const {m,box,cyl,rod,group,mesh,material,textPlate}=k;
  const roofs=group([0,0,0],k.scene,true),structures=group([0,0,0],k.scene,true),plants=createVegetation(k);
  const white=material('#e1e4e8',.1,.64),roof=material('#8795a5',.22,.7),roofDark=material('#6f8092',.25,.65),glass=material('#244950',.65,.25),paving=material('#7a838c',0,.95),asphalt=material('#4f5963',0,.98),trim=material('#b9c1ca',.3,.65),greenRoof=material('#376955',.28,.65);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');let seed=5;const pixels=ctx.createImageData(512,512);for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=185+(seed%40);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const rough=k.trackTexture(new T.CanvasTexture(canvas));rough.wrapS=rough.wrapT=T.RepeatWrapping;rough.repeat.set(45,24);asphalt.map=rough;paving.map=rough;
  box(2400,.2,2200,[60,-.8,-28],material('#b4ad9d',0,1));box(234,.28,91,[-20,-.28,-5],paving);
  buildRoads(k);buildOuterRail(k);buildRawYard(k);
  for(let x=-136;x<98;x+=6)box(.025,.01,90,[x,-.13,-5],m.dark);
  for(let z=-50;z<41;z+=6)box(233,.01,.025,[-20,-.13,z],m.dark);
  function fence(a,b){const A=new T.Vector3(...a),B=new T.Vector3(...b),len=A.distanceTo(B),mid=A.clone().add(B).multiplyScalar(.5),g=group(mid.toArray());g.rotation.y=-Math.atan2(B.z-A.z,B.x-A.x);box(len,.55,.25,[0,.28,0],white,g);for(let x=-len/2;x<=len/2;x+=4){box(.3,1.85,.3,[x,.9,0],white,g);box(.43,.16,.43,[x,1.87,0],white,g);}for(const y of [.65,1.55])box(len,.08,.08,[0,y,0],white,g);for(let x=-len/2;x<len/2;x+=.4)box(.035,.85,.035,[x,1.1,0],white,g);}
  fence([-137,0,-50],[-33,0,-50]);fence([65,0,-50],[97,0,-50]);fence([-137,0,40],[97,0,40]);fence([97,0,-50],[97,0,3]);fence([97,0,20],[97,0,40]);fence([ENTRANCE.x,0,-50],[ENTRANCE.x,0,ENTRANCE.z+ENTRANCE.left]);fence([ENTRANCE.x,0,ENTRANCE.z+ENTRANCE.right],[ENTRANCE.x,0,40]);
  function cladding(x,z,w,d,h,parent=structures){const g=group([x,0,z],parent);box(w,h,d,[0,h/2,0],white,g);box(w+.25,.26,d+.25,[0,h+.13,0],white,g);for(let xx=-w/2;xx<=w/2;xx+=1)for(const zz of [-d/2-.02,d/2+.02])box(.024,h-.4,.022,[xx,h/2,zz],trim,g);for(let zz=-d/2;zz<=d/2;zz+=1)for(const xx of [-w/2-.02,w/2+.02])box(.022,h-.4,.024,[xx,h/2,zz],trim,g);return g;}
  function windows(g,w,d,h,vertical=false){if(vertical){for(let z=-d/2+2;z<d/2-1;z+=5){box(.04,h*.78,.55,[-w/2-.04,h*.49,z],glass,g);for(let y=2;y<h*.9;y+=2.5)box(.07,.08,.58,[-w/2-.07,y,z],white,g);}}else{for(let x=-w/2+2;x<w/2-1;x+=3.3)box(2.5,.65,.04,[x,h-1.1,d/2+.04],glass,g);}}
  // Long production hall: three shallow parallel ridges and repeated skylight strips.
  const hall=cladding(8,-25,132,29,8,structures);windows(hall,132,29,8);
  box(132,.15,29,[8,-.02,-25],m.floor);
  for(let x=-57;x<75;x+=6){for(const z of [-39,-11])box(.28,8,.34,[x,4,z],m.steel,structures);for(const z of [-34.67,-25,-15.33]){rod([x,8,z-4.83],[x,9.5,z],.06,m.steel,roofs);rod([x,9.5,z],[x,8,z+4.83],.06,m.steel,roofs);}}
  for(const z of [-34.67,-25,-15.33])for(const side of [-1,1]){
    const r=box(132,.14,5.05,[8,8.8,z+side*2.42],side>0?roof:roofDark,roofs);r.rotation.x=side*Math.atan(1.5/4.83);
    for(let x=-58;x<74;x+=6){const stripe=box(.32,.04,5.06,[x,8.90,z+side*2.42],glass,roofs);stripe.rotation.x=r.rotation.x;}
    for(let x=-58;x<74;x+=.8){const rib=box(.035,.035,5.05,[x,8.91,z+side*2.42],trim,roofs);rib.rotation.x=r.rotation.x;}
  }
  for(let x=8;x<44;x+=7){box(4.4,4,.12,[x,2.1,-39.58],glass,structures);box(4.8,.6,4,[x,.25,-42],m.concrete);for(const dx of [-2.7,2.7]){
    // The pallet transfer gap uses the neighbouring canopy columns so the
    // forklift can turn and enter between the two raised loading platforms.
    if(Math.abs(x+dx-12.3)>.01)box(.18,5.26,.18,[x+dx,2.63,-45],m.white);
  }}
  box(7.2,.20,.22,[14.2,5.15,-45],trim,roofs);
  box(40,.28,6.4,[25,5.4,-43],roof,roofs);box(40,.8,.18,[25,5.05,-46.2],white,roofs);
  for(const z of [-40,-10])for(let x=-50;x<75;x+=18)cyl(.06,7.6,[x,3.8,z],trim,structures);
  buildProcessingBuildings(k,roofs,structures);
  // Separate narrow tower visible beside the silo in the construction photo.
  // Its footprint leaves the inclined conveyor and silo access unobstructed.
  const auxiliary=cladding(SILO_TOWER.x,SILO_TOWER.z,SILO_TOWER.width,SILO_TOWER.depth,SILO_TOWER.height);
  auxiliary.name='gypsum-corner-silo-tower';
  const tw=SILO_TOWER.width,td=SILO_TOWER.depth,th=SILO_TOWER.height;
  box(tw+.4,.22,td+.2,[SILO_TOWER.x,.01,SILO_TOWER.z],m.concrete);
  box(tw-.30,.08,td-.30,[SILO_TOWER.x,th+.29,SILO_TOWER.z],roofDark,roofs);
  for(const z of [SILO_TOWER.z-td/2,SILO_TOWER.z+td/2])box(tw+.12,.34,.16,[SILO_TOWER.x,th+.43,z],white,structures);
  for(const x of [SILO_TOWER.x-tw/2,SILO_TOWER.x+tw/2])box(.16,.34,td+.12,[x,th+.43,SILO_TOWER.z],white,structures);
  const towerFront=SILO_TOWER.z+td/2,doorX=SILO_TOWER.x-.65;
  box(1.10,2.24,.08,[doorX,1.16,towerFront+.06],trim,structures);
  box(.89,2.05,.04,[doorX,1.13,towerFront+.12],m.dark,structures);
  box(.53,.43,.025,[doorX,1.76,towerFront+.15],glass,structures);
  rod([doorX+.30,.97,towerFront+.18],[doorX+.30,1.25,towerFront+.18],.018,m.steel,structures);
  box(1.6,.12,.70,[doorX,.06,towerFront+.46],m.concrete);
  box(.28,.11,.20,[doorX,2.55,towerFront+.20],m.light,structures);
  // Short upper access bridge joins the tower to the adjacent processing block.
  const bridge=group([SILO_TOWER.x,14.4,22],structures);
  box(1.5,.18,1.25,[0,0,0],m.steel,bridge);
  for(const x of [-.7,.7]){
    for(const z of [-.55,.55])rod([x,.08,z],[x,1.15,z],.035,m.steel,bridge);
    for(const y of [.60,1.15])rod([x,y,-.6],[x,y,.6],.03,m.steel,bridge);
  }
  for(const z of [21.54,SILO_TOWER.z-td/2-.04])box(.95,2.0,.045,[SILO_TOWER.x,15.47,z],m.dark,structures);
  // Photo proportions: two low wings flank a recessed, taller entrance.
  // Keep these envelopes independent of the production hall and its equipment.
  function office(x,z,w,d,h,entranceWidth,singleRoof=false){
    const g=group([x,0,z],structures),front=-w/2,wingDepth=(d-entranceWidth)/2;
    const roofFinish=singleRoof?material('#b4babc',.08,.85):roofDark;
    const roofWell=(cx,cz,width,depth,height)=>{
      box(width,.14,depth,[cx,height-.07,cz],white,g);
      box(width-.65,.06,depth-.65,[cx,height+.03,cz],roofFinish,g);
      for(const xx of [cx-width/2+.13,cx+width/2-.13])box(.26,.46,depth,[xx,height+.23,cz],white,g);
      for(const zz of [cz-depth/2+.13,cz+depth/2-.13])box(width,.46,.26,[cx,height+.23,zz],white,g);
      // Metal copings give each recessed roof its own finished edge.
      for(const xx of [cx-width/2+.13,cx+width/2-.13])box(.31,.045,depth+.06,[xx,height+.48,cz],trim,g);
    };
    box(w+.2,.22,d+.2,[0,.11,0],m.concrete,g);
    for(const side of [-1,1]){
      const cz=side*(entranceWidth/2+wingDepth/2);
      box(w,h,wingDepth,[0,h/2,cz],white,g);
      if(!singleRoof)roofWell(0,cz,w,wingDepth,h);
      // Deep white reveals and narrow vertical glazing, not a continuous curtain wall.
      const count=Math.max(3,Math.round(wingDepth/1.7)),pitch=(wingDepth-1.15)/count;
      for(let i=0;i<count;i++){
        const zz=cz-wingDepth/2+.575+pitch*(i+.5),paneWidth=Math.min(.82,pitch*.58),paneHeight=h-1.25;
        box(.07,paneHeight+.16,paneWidth+.18,[front-.025,.48+paneHeight/2,zz],trim,g);
        box(.085,paneHeight,paneWidth,[front-.075,.48+paneHeight/2,zz],glass,g);
        box(.23,.09,paneWidth+.28,[front-.11,.42,zz],white,g);
        box(.10,.045,paneWidth,[front-.13,1.25,zz],trim,g);
      }
      for(const zz of [cz-wingDepth/2+.22,cz+wingDepth/2-.22])box(.42,h+.25,.44,[front-.17,(h+.25)/2,zz],white,g);
      box(.46,.38,wingDepth,[front-.18,h-.07,cz],white,g);
      // The exposed side walls also have slender inset windows.
      for(let xx=front+1.6;xx<w/2-1;xx+=2.2){
        box(.72,h-1.6,.055,[xx,(h-.55)/2,side*(d/2+.03)],glass,g);
        box(.86,.07,.15,[xx,.48,side*(d/2+.08)],white,g);
      }
    }
    const recess=.85,entryHeight=h+(singleRoof?0:.8),entryFront=front+recess;
    box(w-recess,entryHeight,entranceWidth,[recess/2,entryHeight/2,0],white,g);
    if(singleRoof)roofWell(0,0,w,d,h);
    else roofWell(recess/2,0,w-recess,entranceWidth,entryHeight);
    box(.07,entryHeight-1.15,entranceWidth-1.2,[entryFront-.04,(entryHeight-1.15)/2+.28,0],glass,g);
    for(const zz of [-entranceWidth/2+.2,entranceWidth/2-.2])box(.58,entryHeight,.4,[front+.15,entryHeight/2,zz],white,g);
    box(1.05,.38,entranceWidth,[front+.35,entryHeight-.05,0],white,g);
    for(const zz of [-.95,0,.95])box(.09,2.45,.055,[entryFront-.10,1.48,zz],trim,g);
    box(.10,.06,2.1,[entryFront-.11,2.7,0],trim,g);
    box(1.6,.14,3.15,[front+.12,2.95,0],white,g);
    for(const zz of [-.14,.14])rod([entryFront-.19,1.15,zz],[entryFront-.19,1.62,zz],.024,m.steel,g);
    for(let i=0;i<3;i++)box(.62,.12*(3-i),entranceWidth-.8,[front+.55-i*.6,.06*(3-i),0],m.concrete,g);
    for(const zz of [-entranceWidth/2+.55,entranceWidth/2-.55])box(.12,.28,.14,[front-.19,2.15,zz],m.light,g);
    return g;
  }
  office(-61.2,-25,8.6,25.6,5.2,5.6);
  office(-60.9,12.8,10,16,4.05,4.4,true);
  // Entire heaps are fractured boulders, including their distant silhouette.
  const pileSpots=[];
  // The loader's selected heap is built separately so scooping can lower it.
  for(const [column,x] of STOCKYARD.columns.entries())for(const [row,z] of STOCKYARD.rows.entries()){
    if(x===LOADER_STOCK[0]&&z===LOADER_STOCK[2])continue;
    const variation=((column*3+row*2)%5-2)*.035;
    pileSpots.push([x,z,STOCKYARD.heapRadius*(1+variation),STOCKYARD.heapHeight*(1-variation)]);
  }
  for(let x=-67;x<-48;x+=4.5)for(let z=23;z<33;z+=4.5)pileSpots.push([x,z,1.45,.9]);
  const padWidth=STOCKYARD.east-STOCKYARD.west,padDepth=STOCKYARD.south-STOCKYARD.north;
  const hw=padWidth/2,hd=padDepth/2,r=STOCKYARD.radius,padShape=new T.Shape();
  padShape.moveTo(-hw+r,-hd);padShape.lineTo(hw-r,-hd);padShape.quadraticCurveTo(hw,-hd,hw,-hd+r);
  padShape.lineTo(hw,hd-r);padShape.quadraticCurveTo(hw,hd,hw-r,hd);padShape.lineTo(-hw+r,hd);
  padShape.quadraticCurveTo(-hw,hd,-hw,hd-r);padShape.lineTo(-hw,-hd+r);padShape.quadraticCurveTo(-hw,-hd,-hw+r,-hd);padShape.closePath();
  const padGeometry=new T.ExtrudeGeometry(padShape,{depth:.12,bevelEnabled:false,curveSegments:8});padGeometry.rotateX(-Math.PI/2);
  mesh(padGeometry,asphalt,[(STOCKYARD.west+STOCKYARD.east)/2,-.08,(STOCKYARD.north+STOCKYARD.south)/2]);
  box(25,.12,20,[-58,-.02,26],asphalt,k.scene,1);
  buildBoulderPiles(k,pileSpots);
  buildGypsumReceivingHall(k,roofs,structures);buildCornerSilo(k);
  // Landscaped office frontage, passenger bays and the separate truck court.
  buildNewFrontCourt(k,plants);
  buildNewFactoryEntrance(k);
  plants.grove(-110,21,47,33,2.8);plants.grove(-173,-5,48,88,3.0);plants.grove(-110,-106,54,72,3.0);plants.grove(-174,-113,47,103,3.1);
  // Small forecourt fountain shown beside the detached office in the reference.
  // Its entire basin stays south of the freight exit lane.
  const fountain=group([-78,0,7]);
  cyl(1.85,.18,[0,.09,0],m.concrete,fountain,undefined,48);
  cyl(1.58,.30,[0,.28,0],white,fountain,undefined,48);
  cyl(1.37,.035,[0,.445,0],material('#73949b',.25,.3),fountain,undefined,48);
  k.ring(1.49,.105,[0,.45,0],white,fountain);
  cyl(.20,.47,[0,.67,0],white,fountain,undefined,20);
  const water=material('#b7d9df',.12,.3);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,dx=Math.cos(a),dz=Math.sin(a);
    k.pipe([[0,.9,0],[dx*.26,1.24,dz*.26],[dx*.62,1.12,dz*.62],[dx*.94,.46,dz*.94]],.026,water,fountain);
  }
  plants.row(-133,38,92,38,5);plants.row(-135,-49,-36,-49,4.5);plants.row(88,-49,95,-49,4.5);plants.row(-151,-150,-151,36,5);
  buildOldCampus(k,plants);
  const pond=buildFishPond(k);
  buildPondApproach(k,plants);
  for(let x=-133;x<94;x+=15)for(const originalZ of [-47,38]){if((originalZ===-47&&x>=47&&x<=77)||(originalZ===38&&x>=-13&&x<=76))continue;
    // Put the loading-area lights beyond the opposite rail edge, leaving the
    // entire forklift aisle clear rather than driving through lamp posts.
    const z=originalZ===-47&&x>-26&&x<36?-56:originalZ;
    cyl(.055,5.2,[x,2.6,z],white);for(const dx of [-.6,.6]){rod([x,5,z],[x+dx,5.3,z],.035,white);box(.6,.08,.24,[x+dx,5.3,z],m.light);}}
  plants.finish();return {roofs,structures,update:pond.update};
}
