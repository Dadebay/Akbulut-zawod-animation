import * as T from 'three';
import {createVegetation} from './vegetation.js';
import {buildRoads} from './roads.js';
import {buildRoadMedian} from './roadMedian.js';
import {buildOldCampus} from './oldCampus.js';
import {buildNewFrontCourt} from './newFrontCourt.js';
import {buildNewFactoryEntrance} from './newFactoryEntrance.js';
import {buildProcessingBuildings} from './processingBuildings.js';
import {buildProductionEntrance} from './productionEntrance.js';
import {buildRawYard} from './rawYard.js';
import {buildFishPond} from './fishPond.js';
import {buildOuterRail} from './outerRail.js';
import {RAIL_LAYOUT} from './rail.js';
import {buildPondApproach} from './pondApproach.js';
import {buildCornerSilo} from './rawInfeed.js';
import {buildGypsumReceivingHall} from './gypsumReceivingHall.js';
import {buildBoulderPiles} from './rubble.js';
import {buildWeighbridge} from './weighbridge.js';
import {MAIN_ROAD_X} from './trafficLayout.js';
import {GYPSUM_STOCKYARD as STOCKYARD,GYPSUM_SILO_TOWER as SILO_TOWER,LOADER_STOCK,NEW_FACTORY_ENTRANCE as ENTRANCE,NEW_ENTRANCE_MEDIAN,OUTER_RAIL_Z,RAIL_ACCESS_CROSSING,RAIL_SIDE_LOADING as LOADING} from './siteLayout.js';

// Proportions traced from user-supplied architectural renders 220–227.
// These presentation dimensions are not survey measurements.
export function buildSite(k){
  const {m,box,cyl,rod,group,mesh,material,textPlate}=k;
  const roofs=group([0,0,0],k.scene,true),structures=group([0,0,0],k.scene,true),plants=createVegetation(k);
  const white=material('#e1e4e8',.1,.64),roof=material('#8795a5',.22,.7),roofDark=material('#6f8092',.25,.65),glass=material('#244950',.65,.25),paving=material('#7a838c',0,.95),asphalt=m.road,trim=material('#b9c1ca',.3,.65),greenRoof=material('#376955',.28,.65);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');let seed=5;const pixels=ctx.createImageData(512,512);for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=185+(seed%40);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const rough=k.trackTexture(new T.CanvasTexture(canvas));rough.wrapS=rough.wrapT=T.RepeatWrapping;rough.repeat.set(45,24);paving.map=rough;
  box(2400,.2,2200,[60,-.8,-28],material('#b4ad9d',0,1));box(234,.28,91,[-20,-.28,-5],paving);
  buildRoads(k);buildOuterRail(k);buildRawYard(k);
  buildRoadMedian(k,plants,{...NEW_ENTRANCE_MEDIAN,lit:true,name:'gate-road-median'});
  for(let x=-136;x<98;x+=6)box(.025,.01,90,[x,-.13,-5],m.dark);
  for(let z=-50;z<41;z+=6)box(233,.01,.025,[-20,-.13,z],m.dark);
  function fence(a,b){const A=new T.Vector3(...a),B=new T.Vector3(...b),len=A.distanceTo(B),mid=A.clone().add(B).multiplyScalar(.5),g=group(mid.toArray());g.rotation.y=-Math.atan2(B.z-A.z,B.x-A.x);box(len,.55,.25,[0,.28,0],white,g);for(let x=-len/2;x<=len/2;x+=4){box(.3,1.85,.3,[x,.9,0],white,g);box(.43,.16,.43,[x,1.87,0],white,g);}for(const y of [.65,1.55])box(len,.08,.08,[0,y,0],white,g);for(let x=-len/2;x<len/2;x+=.4)box(.035,.85,.035,[x,1.1,0],white,g);}
  const southFenceX=ENTRANCE.southFenceX,southGateZ=ENTRANCE.z+ENTRANCE.left*ENTRANCE.widthScale;
  const railGateWest=RAIL_ACCESS_CROSSING.x-RAIL_ACCESS_CROSSING.width/2;
  const railGateEast=RAIL_ACCESS_CROSSING.x+RAIL_ACCESS_CROSSING.width/2;
  fence([southFenceX,0,-50],[-33,0,-50]);
  fence([65,0,-50],[railGateWest,0,-50]);fence([railGateEast,0,-50],[97,0,-50]);
  fence([-137,0,40],[97,0,40]);fence([97,0,-50],[97,0,3]);fence([97,0,20],[97,0,40]);
  fence([southFenceX,0,-50],[southFenceX,0,southGateZ]);
  // The open sliding leaf covers this stretch of the right boundary. Its
  // outer end meets the fixed fence without the old diagonal transition.
  const parkedLeafEndZ=ENTRANCE.z+21.05-(1-ENTRANCE.widthScale)*ENTRANCE.right+15.6/2;
  fence([ENTRANCE.fenceX,0,parkedLeafEndZ],[ENTRANCE.fenceX,0,40]);
  function cladding(x,z,w,d,h,parent=structures){const g=group([x,0,z],parent);box(w,h,d,[0,h/2,0],white,g);box(w+.25,.26,d+.25,[0,h+.13,0],white,g);for(let xx=-w/2;xx<=w/2;xx+=1)for(const zz of [-d/2-.02,d/2+.02])box(.024,h-.4,.022,[xx,h/2,zz],trim,g);for(let zz=-d/2;zz<=d/2;zz+=1)for(const xx of [-w/2-.02,w/2+.02])box(.022,h-.4,.024,[xx,h/2,zz],trim,g);return g;}
  // Long production hall: three shallow parallel ridges and repeated skylight strips.
  const hall=cladding(8,-25,132,29,8,structures);
  buildProductionEntrance(k,hall);
  // Keep five small extraction fans on each half of the facade. Their shallow
  // faces sit almost flush with the wall instead of projecting from it.
  const vents=group([0,0,0],hall);vents.name='production-hall-ventilation';
  const fanRotors=[];
  const fanWhite=material('#f6f7f4',.08,.72),fanInset=material('#e8ece9',.04,.86),fanDetail=material('#cbd3d0',.18,.72),fanRotorGrey=material('#818b8e',.28,.65);
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const fan=group([side*(7+i*12),6.5,29/2],vents);
    fan.name=`production-hall-fan-${side<0?'left':'right'}-${i+1}`;
    fan.scale.setScalar(.65);
    box(1.9,1.9,.016,[0,0,.020],fanWhite,fan);
    box(1.75,1.75,.012,[0,0,.042],fanInset,fan,.04);
    k.ring(.72,.045,[0,0,.075],fanWhite,fan,'z');
    const rotor=group([0,0,.065],fan,true);
    rotor.name=`${fan.name}-rotor`;fanRotors.push(rotor);
    const hub=cyl(.13,.08,[0,0,0],fanRotorGrey,rotor);hub.rotation.x=Math.PI/2;
    for(let blade=0;blade<6;blade++){
      const angle=blade*Math.PI/3;
      const part=box(.24,.59,.018,[Math.sin(angle)*.37,Math.cos(angle)*.37,0],fanRotorGrey,rotor,.01);
      part.rotation.z=-angle+.25;
    }
    for(const radius of [.26,.45,.61])k.ring(radius,.012,[0,0,.105],fanDetail,fan,'z');
    for(let spoke=0;spoke<8;spoke++){
      const angle=spoke*Math.PI/4;
      rod([0,0,.110],[Math.cos(angle)*.72,Math.sin(angle)*.72,.110],.012,fanDetail,fan);
    }
    textPlate('HOWA',1.15,.23,[0,-1.10,.042],fan);
  }
  box(132,.15,29,[8,-.02,-25],m.floor);
  for(let x=-57;x<75;x+=6){for(const z of [-39,-11])box(.28,8,.34,[x,4,z],m.steel,structures);for(const z of [-34.67,-25,-15.33]){rod([x,8,z-4.83],[x,9.5,z],.06,m.steel,roofs);rod([x,9.5,z],[x,8,z+4.83],.06,m.steel,roofs);}}
  for(const z of [-34.67,-25,-15.33])for(const side of [-1,1]){
    const r=box(132,.14,5.05,[8,8.8,z+side*2.42],side>0?roof:roofDark,roofs);r.rotation.x=side*Math.atan(1.5/4.83);
    for(let x=-58;x<74;x+=6){const stripe=box(.32,.04,5.06,[x,8.90,z+side*2.42],glass,roofs);stripe.rotation.x=r.rotation.x;}
    for(let x=-58;x<74;x+=.8){const rib=box(.035,.035,5.05,[x,8.91,z+side*2.42],trim,roofs);rib.rotation.x=r.rotation.x;}
  }
  // The railway loading face follows the supplied view: a white, deep
  // cantilever with a tall ribbed fascia, a single outer row of posts and
  // sectional loading doors against the factory wall. The clear slot at
  // x=11.5 remains open for the forklift that supplies the train.
  const loadingRoof=group([0,0,0],roofs);loadingRoof.name='rail-loading-canopy';
  const loadingFace=group([0,0,0],structures);loadingFace.name='rail-loading-bays';
  const fascia=material('#dfe3e1',.07,.76),soffit=material('#c4d0cb',.08,.84);
  const shutter=material('#d0d5d3',.12,.72),shutterLine=material('#aeb8b7',.22,.70);
  const steelPost=material('#d5dcda',.32,.58);
  // The sheltered stock sits on a raised concrete dock, with a visible
  // retaining face toward the railway and a real sloped entrance at the end.
  const dock=LOADING.platform;
  const loadingPlatform=group();loadingPlatform.name='rail-loading-platform';
  const dockConcrete=material('#777e7c',0,.94),dockEdge=material('#a0a6a2',0,.90);
  const deckWidth=dock.east-dock.west,deckDepth=dock.south-dock.north;
  const deckX=(dock.west+dock.east)/2,deckZ=(dock.north+dock.south)/2;
  box(deckWidth,dock.height+.06,deckDepth,[deckX,(dock.height-.18)/2,deckZ],dockConcrete,loadingPlatform);
  box(deckWidth,.06,deckDepth,[deckX,dock.height-.03,deckZ],paving,loadingPlatform);
  for(const d of LOADING.deckExtensions){
    const w=d.east-d.west,dd=d.south-d.north,cx=(d.west+d.east)/2,cz=(d.north+d.south)/2;
    box(w,dock.height+.06,dd,[cx,(dock.height-.18)/2,cz],dockConcrete,loadingPlatform);
    box(w,.06,dd,[cx,dock.height-.03,cz],paving,loadingPlatform);
  }
  box(deckWidth,.09,.12,[deckX,dock.height-.045,dock.north+.06],dockEdge,loadingPlatform);
  for(const x of [dock.west,dock.east])
    box(.12,.09,deckDepth,[x+(x===dock.west?.06:-.06),dock.height-.045,deckZ],dockEdge,loadingPlatform);
  for(let x=dock.west+5;x<dock.east;x+=5)
    box(.018,dock.height-.12,.009,[x,(dock.height-.12)/2,dock.north-.006],shutterLine,loadingPlatform);
  const loadingDoors=group([0,dock.height,0],loadingFace);
  for(let x=8;x<44;x+=7){
    // The reference has quiet, pale roller shutters instead of dark glazing.
    box(4.45,3.95,.06,[x,2.05,-39.61],shutter,loadingDoors);
    for(let y=.45;y<3.95;y+=.30)
      box(4.42,.015,.012,[x,y,-39.655],shutterLine,loadingDoors);
    for(const dx of [-2.26,2.26])
      box(.10,4.18,.12,[x+dx,2.09,-39.66],trim,loadingDoors);
    box(4.7,.18,.20,[x,4.13,-39.67],trim,loadingDoors);
  }
  // Six slender posts form one row. Each has the reference's small yellow
  // impact cage, with clear gaps for the working forklifts.
  const guardHalf=LOADING.guardWidth/2-.028;
  for(const x of LOADING.columnXs){
    const post=group([x,dock.height,LOADING.columnZ],loadingFace);post.name='rail-loading-column';
    box(.34,.12,.34,[0,.06,0],m.concrete,post);
    box(.22,6.10-dock.height,.22,[0,3.15-dock.height/2,0],steelPost,post);
    box(.30,.16,.30,[0,6.20-dock.height,0],trim,post);
    for(const sx of [-guardHalf,guardHalf])for(const sz of [-guardHalf,guardHalf])
      cyl(.028,.51,[sx,.255,sz],m.yellow,post,undefined,8);
    for(const side of [-guardHalf,guardHalf]){
      rod([-guardHalf,.47,side],[guardHalf,.47,side],.028,m.yellow,post);
      rod([side,.47,-guardHalf],[side,.47,guardHalf],.028,m.yellow,post);
    }
  }
  // Truck ramps at both ends: up from the east yard, down to the west lane.
  for(const access of LOADING.ramps){
    const ramp=group([0,0,0],k.scene);ramp.name='rail-loading-truck-ramp';
    const low=access.high==='east'?access.west:access.east,high=access.high==='east'?access.east:access.west;
    const rampProfile=new T.Shape();
    rampProfile.moveTo(low,-.12);rampProfile.lineTo(high,-.12);
    rampProfile.lineTo(high,dock.height);rampProfile.lineTo(low,0);rampProfile.closePath();
    mesh(new T.ExtrudeGeometry(rampProfile,{depth:access.south-access.north,bevelEnabled:false}),paving,[0,0,access.north],ramp);
    for(const z of [access.north,access.south]){
      const edgeProfile=new T.Shape();
      edgeProfile.moveTo(low,0);edgeProfile.lineTo(high,dock.height);
      edgeProfile.lineTo(high,dock.height+.12);edgeProfile.lineTo(low,.12);edgeProfile.closePath();
      mesh(new T.ExtrudeGeometry(edgeProfile,{depth:.14,bevelEnabled:false}),dockConcrete,[0,0,z-.07],ramp);
    }
  }
  // A long flat soffit gives the approaching viewer the sheltered depth in
  // the reference; roof and signage disappear together in the cutaway view.
  box(40,.24,6.55,[25,6.36,-43.05],soffit,loadingRoof);
  box(40,.14,6.45,[25,7.12,-43.05],fascia,loadingRoof);
  // The broad lettered face is the short entrance end of the long canopy.
  for(const x of [5.02,44.98])box(.20,1.45,6.62,[x,6.73,-43.05],fascia,loadingRoof);
  box(40,1.45,.20,[25,6.73,-46.38],fascia,loadingRoof);
  for(const y of [6.23,6.53,6.83,7.13])
    box(39.98,.016,.015,[25,y,-46.489],trim,loadingRoof);
  for(const x of [13,21,29,37])
    box(.014,1.40,.015,[x,6.73,-46.489],trim,loadingRoof);
  for(let y=6.28;y<7.39;y+=.13){
    for(const x of [4.90,45.10])
      box(.027,.018,6.35,[x,y,-43.05],trim,loadingRoof);
  }
  for(let x=5.5;x<45;x+=2.8)box(.08,.085,6.18,[x,6.20,-43.05],trim,loadingRoof);
  box(40,.15,.24,[25,7.49,-46.38],white,loadingRoof);
  for(const x of [5.02,44.98])box(.24,.10,6.65,[x,7.47,-43.05],trim,loadingRoof);
  box(.15,.12,6.7,[5.02,5.96,-43.05],trim,loadingRoof);
  const loadingSign=textPlate('YÜK YÜKLEME WE DÜŞÜRME NOKADY',6.10,.43,
    [4.892,6.93,-43.05],loadingRoof,'#9c7d22','#dfe3e1');
  loadingSign.rotation.y=-Math.PI/2;
  loadingSign.name='rail-loading-sign';
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
    const roofFinish=singleRoof?material('#d3d8d7',.08,.82):material('#858c92',.12,.81);
    const officeGlass=singleRoof?material('#315b68',.45,.29):material('#436876',.48,.31);
    const canteenFrame=singleRoof?material('#667075',.28,.48):trim;
    const reflectedGlass=material(singleRoof?'#879697':'#879da8',.24,.37);
    // End the office terraces at the hall facade, before its pitched roof begins.
    const terraceInset=singleRoof?0:1.15,terraceWidth=w-terraceInset;
    const roofWell=(cx,cz,width,depth,height)=>{
      box(width,.14,depth,[cx,height-.07,cz],white,g);
      box(width-.65,.06,depth-.65,[cx,height+.03,cz],roofFinish,g);
      for(const xx of [cx-width/2+.13,cx+width/2-.13])box(.26,.46,depth,[xx,height+.23,cz],white,g);
      for(const zz of [cz-depth/2+.13,cz+depth/2-.13])box(width,.46,.26,[cx,height+.23,zz],white,g);
      // Metal copings give each recessed roof its own finished edge.
      for(const xx of [cx-width/2+.13,cx+width/2-.13])box(.31,.045,depth+.06,[xx,height+.48,cz],trim,g);
    };
    box(w+.2,.22,d+.2,[0,.11,0],m.concrete,g);
    if(singleRoof){
      const roofRib=material('#e0e3e1',.12,.72);
      for(let zz=-d/2+.42;zz<d/2-.4;zz+=.19)
        box(w-.68,.012,.018,[0,h+.066,zz],roofRib,g);
    }
    // The office ends in open roof terraces, directly against the hall.
    for(const side of [-1,1]){
      const cz=side*(entranceWidth/2+wingDepth/2);
      box(w,h,wingDepth,[0,h/2,cz],white,g);
      if(!singleRoof)roofWell(-terraceInset/2,cz,terraceWidth,wingDepth,h);
      // Deep white reveals and narrow vertical glazing, not a continuous curtain wall.
      const count=4;
      const pitch=(wingDepth-1.15)/count;
      for(let i=0;i<count;i++){
        const zz=cz-wingDepth/2+.575+pitch*(i+.5),paneWidth=singleRoof?Math.min(.82,pitch*.58):Math.min(1.10,pitch*.58),paneHeight=h-1.25;
        box(.07,paneHeight+.16,paneWidth+.18,[front-.025,.48+paneHeight/2,zz],trim,g);
        box(.085,paneHeight,paneWidth,[front-.075,.48+paneHeight/2,zz],officeGlass,g);
        box(.015,paneHeight*.52,paneWidth-.02,
          [front-.13,.48+paneHeight*.74,zz],reflectedGlass,g);
        box(.23,.09,paneWidth+.28,[front-.11,.42,zz],white,g);
        if(singleRoof)for(const yy of [1.48,2.55])
          box(.10,.045,paneWidth,[front-.15,yy,zz],canteenFrame,g);
        else for(const yy of [1.4,2.4,3.4,4.4,5.4])if(yy<h-.52)
          box(.11,.045,paneWidth+.025,[front-.13,yy,zz],trim,g);
      }
      for(const zz of [cz-wingDepth/2+.22,cz+wingDepth/2-.22])box(.42,h+.25,.44,[front-.17,(h+.25)/2,zz],white,g);
      box(.46,.38,wingDepth,[front-.18,h-.07,cz],white,g);
      if(!singleRoof)box(.20,.12,wingDepth,[front-.21,.32,cz],white,g);
      if(!singleRoof){
        // Layered white parapets hide the hall roofs behind the office wings.
        box(.40,1.28,wingDepth,[front-.23,h+.57,cz],white,g);
        for(const offset of [.12,.55,.98])
          box(.46,.045,wingDepth+.04,[front-.28,h+offset,cz],trim,g);
        box(.56,.13,wingDepth+.16,[front-.28,h+1.24,cz],white,g);
      }
      // The cafeteria side elevation has only a small high service window.
      if(singleRoof){
        box(1.26,.52,.07,[1.7,2.92,side*(d/2+.035)],trim,g);
        box(1.13,.40,.055,[1.7,2.92,side*(d/2+.08)],officeGlass,g);
        continue;
      }
      // The main office side walls have slender inset windows.
      for(let xx=front+1.6;xx<w/2-1;xx+=2.2){
        if(!singleRoof)box(.85,h-1.48,.07,[xx,(h-.55)/2,side*(d/2+.02)],trim,g);
        box(.72,h-1.6,.055,[xx,(h-.55)/2,side*(d/2+.03)],officeGlass,g);
        box(.86,.07,.15,[xx,.48,side*(d/2+.08)],white,g);
        if(!singleRoof)for(const yy of [1.4,2.4,3.4,4.4,5.4])if(yy<h-.52)
          box(.75,.045,.075,[xx,yy,side*(d/2+.075)],trim,g);
      }
    }
    const recess=.85,entryHeight=h+(singleRoof?0:1.35),entryFront=front+recess;
    box(w-recess,entryHeight,entranceWidth,[recess/2,entryHeight/2,0],white,g);
    if(singleRoof)roofWell(0,0,w,d,h);
    else roofWell((recess-terraceInset)/2,0,terraceWidth-recess,entranceWidth,entryHeight);
    const glazingHeight=entryHeight-(singleRoof?.67:.87);
    const glazingY=singleRoof?.31+glazingHeight/2:.32+glazingHeight/2;
    box(.07,glazingHeight,entranceWidth-1.2,[entryFront-.04,glazingY,0],officeGlass,g);
    if(singleRoof)box(.015,1.65,entranceWidth-1.22,[entryFront-.095,2.84,0],reflectedGlass,g);
    else box(.015,glazingHeight*.62,entranceWidth-1.22,
      [entryFront-.095,.32+glazingHeight*.69,0],reflectedGlass,g);
    for(const zz of [-entranceWidth/2+.2,entranceWidth/2-.2])box(.58,entryHeight,.4,[front+.15,entryHeight/2,zz],white,g);
    box(1.05,.38,entranceWidth,[front+.35,entryHeight-.05,0],white,g);
    if(!singleRoof){
      // The entrance is one tall curtain wall with a door inside the lower bays.
      for(const zz of [-1.65,-.55,.55,1.65])
        box(.09,glazingHeight,.075,[entryFront-.105,glazingY,zz],trim,g);
      for(const yy of [2.42,3.72,4.94,6.16,7.38])
        box(.09,.055,entranceWidth-1.2,[entryFront-.11,yy,0],trim,g);
      box(.10,2.16,2.18,[entryFront-.13,1.30,0],material('#274a53',.45,.29),g);
      for(const zz of [-1.1,0,1.1])box(.11,2.2,.055,[entryFront-.20,1.30,zz],trim,g);
      box(.11,.07,2.2,[entryFront-.20,2.40,0],trim,g);
      for(const zz of [-.14,.14])rod([entryFront-.24,1.12,zz],[entryFront-.24,1.62,zz],.023,m.steel,g);
      const emblem=mesh(new T.CircleGeometry(.21,24,0,Math.PI),white,[entryFront-.17,entryHeight-1.35,0],g);
      emblem.rotation.y=-Math.PI/2;
      box(.72,.10,entranceWidth-.55,[front-.33,.05,0],m.concrete,g);
      // A raised, open rectangular parapet crowns the central terrace.
      for(const zz of [-entranceWidth/2+.17,entranceWidth/2-.17])
        box(terraceWidth-recess,.65,.28,[(recess-terraceInset)/2,entryHeight+.43,zz],white,g);
      box(.28,.65,entranceWidth,[w/2-terraceInset-.08,entryHeight+.43,0],white,g);
      box(.40,.78,entranceWidth,[front+.12,entryHeight+.40,0],white,g);
      box(.46,.09,entranceWidth+.12,[front+.12,entryHeight+.84,0],trim,g);
      const sign=textPlate('EDARA BINASY',entranceWidth-.58,.54,[front-.095,entryHeight+.43,0],g,'#a17b37','#e1e4e8');
      sign.rotation.y=-Math.PI/2;
    }else{
      // The dining hall entrance fills the centre bay instead of sitting below an awning.
      for(const zz of [-1.05,0,1.05])box(.09,glazingHeight,.065,[entryFront-.105,glazingY,zz],canteenFrame,g);
      for(const yy of [1.38,2.20,3.12])box(.09,.055,entranceWidth-1.2,[entryFront-.11,yy,0],canteenFrame,g);
      box(.09,2.03,2.06,[entryFront-.14,1.33,0],material('#294e58',.43,.30),g);
      for(const zz of [-1.03,0,1.03])box(.11,2.06,.055,[entryFront-.20,1.33,zz],canteenFrame,g);
      box(.11,.06,2.09,[entryFront-.20,2.38,0],canteenFrame,g);
      for(const zz of [-.14,.14])rod([entryFront-.25,1.12,zz],[entryFront-.25,1.62,zz],.022,m.steel,g);
      for(let i=0;i<3;i++){
        const height=.30-i*.10;
        box(.78,height,entranceWidth-.2,[front-.32-i*.57,height/2,0],m.concrete,g);
      }
      // The taller canopy and gold name read clearly from the street.
      for(const zz of [-entranceWidth/2+.2,entranceWidth/2-.2])
        box(.54,h+.59,.43,[front+.14,(h+.59)/2,zz],white,g);
      roofWell(front+1.23,0,2.46,entranceWidth+.34,h+.64);
      box(.42,.58,entranceWidth+.34,[front+.08,h+.81,0],white,g);
      const sign=textPlate('NAHARHANA',entranceWidth-.18,.44,[front-.145,h+.82,0],g,'#97712e','#e1e4e8');
      sign.rotation.y=-Math.PI/2;
    }
    for(const zz of [-entranceWidth/2+.55,entranceWidth/2-.55])box(.12,.28,.14,[front-.19,2.15,zz],m.light,g);
    return g;
  }
  office(-61.2,-25,8.6,25.6,7.5,5.6);
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
  buildGypsumReceivingHall(k,roofs,structures);buildCornerSilo(k);buildWeighbridge(k);
  // Landscaped office frontage, passenger bays and the separate truck court.
  buildNewFrontCourt(k,plants);
  buildNewFactoryEntrance(k);
  const frontWoodland={west:-133.5,east:-86.5,north:4.5,south:37.5};
  plants.grove(-110,21,47,33,2.8);
  // The dining street covers the eastern part of this lawn up to z=28.8.
  // Follow the exposed grass edge so the kerb does not cross the road.
  const woodlandKerb=material('#9da5a5',.03,.88);
  const woodlandOutline=[
    [frontWoodland.west,frontWoodland.north],[-91,frontWoodland.north],
    [-91,28.8],[frontWoodland.east,28.8],
    [frontWoodland.east,frontWoodland.south],[frontWoodland.west,frontWoodland.south]
  ];
  woodlandOutline.forEach(([ax,az],i)=>{
    const [bx,bz]=woodlandOutline[(i+1)%woodlandOutline.length];
    const kerb=box(Math.hypot(bx-ax,bz-az)+.22,.20,.22,
      [(ax+bx)/2,.055,(az+bz)/2],woodlandKerb);
    kerb.rotation.y=-Math.atan2(bz-az,bx-ax);kerb.castShadow=false;
  });
  // Bring the woodland lawn and canopy up to the avenue's outer sidewalk.
  plants.grove(-172.3,-9,49.4,96,3.0);
  // Replace the bare shoulder between the avenue sidewalk and woodland, up to the rail ballast.
  const avenueLawnNorth=4.475,avenueLawnSouth=45.5;
  const avenueLawn=box(2.525,.15,avenueLawnSouth-avenueLawnNorth,
    [-198.2625,-.10,(avenueLawnNorth+avenueLawnSouth)/2],m.grass);
  avenueLawn.castShadow=false;
  // Fill the matching northern shoulder, keeping the railway ballast exposed.
  for(const [north,south] of [[-57,RAIL_LAYOUT.z-2.025],[RAIL_LAYOUT.z+2.025,-8.475]]){
    const lawn=box(2.525,.15,south-north,[-198.2625,-.10,(north+south)/2],m.grass);
    lawn.name='outer-avenue-north-lawn';lawn.castShadow=false;
  }
  // Slim conifers fit beside the sidewalk and join the existing woodland.
  for(let z=RAIL_LAYOUT.z+5.5,i=0;z<=-11.5;z+=3.4,i++){
    plants.plant(-198+(i%2)*.18,z,.33+(i%3)*.02,{plantedBed:true});
  }
  // South of the gate road the open lawn margins round the woodland get the
  // same mix of slim conifers and small trees instead of an inner kerb.
  for(let z=7,i=0;z<=43;z+=3.2,i++)
    plants.plant(-198.1+(i%2)*.2,z,.32+(i%3)*.025,{plantedBed:true});
  for(let x=-194,i=0;x<=-153;x+=3.4,i++)
    plants.plant(x,41.2+(i%2)*.9,i%3?.34+(i%2)*.04:.5,{plantedBed:true});
  // Continue the woodland lawn to the outer railway's ballast edge.
  const railVergeSouth=OUTER_RAIL_Z-3.4;
  const railVerge=box(49.4,.15,railVergeSouth-39,
    [-172.3,-.10,(39+railVergeSouth)/2],m.grass);
  railVerge.castShadow=false;
  // Close the exposed ground along both sides of the road junction. The grass
  // meets the sidewalk while the crossing and the railway remain unobstructed.
  // The northern lawn ends at the woodland edge of the straight sidewalk.
  for(const [north,south,east] of [[-51,-8.475,MAIN_ROAD_X-5.375],[7,43,MAIN_ROAD_X-3.8]]){
    const west=-150.5;
    const verge=box(east-west,.15,south-north,[(west+east)/2,-.10,(north+south)/2],m.grass);
    verge.castShadow=false;
  }
  for(const [start,end] of [[-46,-11],[10,40]])for(let z=start,i=0;z<=end;z+=3.5,i++){
    plants.plant(-150.3-(i%3)*.22,z,.55+(i%4)*.035);
    plants.plant(-153.0+(i%2)*.3,z+1.65,.39+(i%3)*.025);
  }
  // Join the two woodland blocks across the bare strip marked in the reference.
  plants.grove(-110,-106,55,72,3.0);plants.grove(-168.25,-110.5,61.5,108,3.1);
  // Match the neighbouring woodland edges so no bare L-shaped seam remains.
  plants.grove(-168.25,-199,61.5,69,3.1);
  // Join these two woodland lawns to the avenue stones without moving the trees.
  // Keep this strip below the crossing asphalt, as with the grove surfaces.
  const woodlandSeamWest=-199.555,woodlandSeamEast=-199;
  const woodlandSeam=box(woodlandSeamEast-woodlandSeamWest,.15,177,
    [(woodlandSeamWest+woodlandSeamEast)/2,-.24,-145],m.grass);
  woodlandSeam.castShadow=false;
  // Carry the lawn and trees up to the visitor parking edge.
  plants.grove(-117.75,-166.25,39.5,59.5,3.1);
  // Extend this lawn to the western woodland and its neighbour to the north.
  plants.grove(-111.75,-214.75,51.5,37.5,3.1);
  // Bright planted lawn between the woodland and the freight-line ballast.
  // Overlap both neighbouring lawns so no pale ground remains at either end.
  const railLawnWest=-141.5,railLawnEast=-77.5;
  const railLawnNorth=-59.35,railLawnSouth=-68.6;
  const railLawn=box(railLawnEast-railLawnWest,.15,railLawnNorth-railLawnSouth,
    [(railLawnWest+railLawnEast)/2,-.10,(railLawnNorth+railLawnSouth)/2],m.grass);
  railLawn.castShadow=false;
  railLawn.receiveShadow=false;
  // Match the dense full-size conifers south of the pond. Stagger two rows
  // within the narrow lawn, clear of the pond bank and freight tracks.
  for(let i=0;i<21;i++){
    const x=-138+i*2.9;
    plants.plant(x,-63.3,.76+(i%4)*.045);
    plants.plant(x+1.35,-65.5,.72+(i%3)*.045);
  }
  // Continue smaller rail-side planting east of the pond, leaving the road
  // crossing at x=-62 clear.
  for(let i=0;i<13;i++){
    const x=-78+i*2.7;
    if(Math.abs(x+62)<7)continue;
    plants.plant(x+.45*Math.sin(i*2.1),-61.35,.22+(i%3)*.015);
    plants.plant(x+1.15,-63.7,.38+(i%4)*.025);
    plants.plant(x+.25,-66.4,.42+(i%3)*.025);
  }
  plants.row(-133,34,92,34,5,{bounds:{west:-131,east:-89,north:7,south:35}});
  plants.row(-135,-49,-36,-49,4.5);plants.row(88,-49,95,-49,4.5);plants.row(-151,-150,-151,36,5);
  const oldCampus=buildOldCampus(k,plants);
  const pond=buildFishPond(k);
  buildPondApproach(k,plants);
  plants.row(-196.3,7,-196.3,38,3.7);
  for(let z=9,i=0;z<38;z+=5.7,i++)plants.plant(-198.1+(i%2)*.18,z,.36+(i%3)*.025);
  plants.row(-194,41.3,-152.5,41.3,3.4);
  for(let x=-192,i=0;x<=-155;x+=4.1,i++)plants.plant(x,43.6+(i%2)*.3,.42+(i%3)*.025);
  // Cover the visible L-shaped join where the southern groves meet the parking lawn.
  for(const [width,depth,x,z] of [[1.8,37.5,-137.5,-214.75],[39.5,1.8,-117.75,-196]]){
    const join=box(width,.06,depth,[x,-.04,z],m.grass);
    join.castShadow=false;
  }
  // Fill the tree-free margins where the three woodland lawns meet.
  plants.row(-196,-165,-140,-165,3.2);
  plants.row(-137.5,-161,-137.5,-139,3.2);
  // Soften the former north-south gap with a dense, irregular conifer strip.
  plants.row(-137.5,-230,-137.5,-198,3.0);
  for(let z=-226,i=0;z<=-202;z+=6,i++){
    plants.plant(-140.7+(i%2)*.5,z,.65);
    plants.plant(-134.2-(i%2)*.5,z+2.7,.62);
  }
  plants.row(-134,-196,-104,-196,3.1);
  for(let x=-129,i=0;x<=-109;x+=5,i++)plants.plant(x,-192+(i%2)*1.1,.63);
  // Fill the empty woodland margin beside the single freight track.
  // Stagger three rows, with smaller conifers nearest the ballast.
  for(let i=0;i<15;i++){
    const x=-195+i*3;
    plants.plant(x,-62.2+.3*Math.sin(i*1.7),.72+(i%4)*.035);
    plants.plant(x+1.35,-60.2+.2*Math.cos(i*1.9),.61+(i%3)*.035);
    plants.plant(x+.35,-58.4+.12*Math.sin(i*2.3),.45+(i%3)*.025);
  }
  for(let x=-133;x<94;x+=15)for(const originalZ of [-47,38]){if((originalZ===-47&&x>=47&&x<=77)||(originalZ===38&&x>=-13&&x<=76))continue;
    if(originalZ===-47&&Math.abs(x-RAIL_ACCESS_CROSSING.x)<RAIL_ACCESS_CROSSING.width/2+.8)continue;
    // Put the loading-area lights beyond the opposite rail edge, leaving the
    // entire forklift aisle clear rather than driving through lamp posts.
    const z=originalZ===-47&&x>-26&&x<36?-56:originalZ;
    cyl(.055,5.2,[x,2.6,z],white);for(const dx of [-.6,.6]){rod([x,5,z],[x+dx,5.3,z],.035,white);box(.6,.08,.24,[x+dx,5.3,z],m.light);}}
  plants.finish();return {
    roofs,structures,oldShells:oldCampus.shells,update:pond.update,
    updateVentilation(dt){
      for(const rotor of fanRotors)rotor.rotation.z=(rotor.rotation.z-dt*4)%(2*Math.PI);
    },
  };
}
