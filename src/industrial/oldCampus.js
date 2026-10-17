import * as T from 'three';
import {createSolarPanels,buildOldFrontParking} from './oldCampusDetails.js';
import {buildOldGardenPavilion} from './oldGardenPavilion.js';
import {buildOldWarehouseCourt} from './oldWarehouseCourt.js';
import {buildOldFrontCourt} from './oldFrontCourt.js';
import {buildOldSideLoading} from './oldSideLoading.js';
import {buildOldRearBoundary} from './oldRearBoundary.js';
import {OLD_LEFT_CAMPUS as LEFT,OLD_SIDE_LOADING as LOADING,OLD_RAW_SILOS} from './siteLayout.js';

// Proportions and facade details follow the user's close aerial photograph.
// These are visual estimates; the site has not been surveyed.
export function buildOldCampus(k,plants){
  const {m,box,cyl,rod,ring,group,mesh,material,textPlate}=k;
  const wall=material('#dfe2db',.04,.86),base=material('#a7aaa2',0,.94),roof=material('#699780',.27,.58),roofShade=material('#4f8069',.23,.67),seamMat=material('#87a994',.27,.64),trim=material('#c1d0c7',.44,.53),glass=material('#36545d',.38,.27),dark=material('#3c4c50',.46,.6),paving=material('#8b908d',0,.96),door=material('#718e82',.22,.65);
  const glassPanes=[glass,material('#46636d',.38,.28),material('#304b55',.38,.29)];
  const solarPanel=createSolarPanels(k);
  box(128,.14,79,[36,-.20,-110.5],paving,k.scene,2.5);
  function ridgeHall(x,z,w,d,h,bays=1,frontLoading=true,sideLoading=null){
    const g=group([x,0,z]);
    const openingX=sideLoading?sideLoading.x-x:0,openingWidth=sideLoading?.interiorWidth||0;
    if(sideLoading){
      // Leave a full-height vehicle passage in the south wall, with actual interior depth.
      const west=openingX-openingWidth/2,east=openingX+openingWidth/2;
      for(const [a,b] of [[-w/2,west],[east,w/2]]){
        box(b-a,h,d,[(a+b)/2,h/2,0],wall,g);
        box(b-a,.45,d+.1,[(a+b)/2,.225,0],base,g);
      }
      const backDepth=d-sideLoading.interiorDepth,insideZ=d/2-sideLoading.interiorDepth/2;
      box(openingWidth,h,backDepth,[openingX,h/2,-sideLoading.interiorDepth/2],wall,g);
      box(openingWidth,.45,backDepth,[openingX,.225,-sideLoading.interiorDepth/2],base,g);
      box(openingWidth,h-sideLoading.clearHeight,sideLoading.interiorDepth,[openingX,(h+sideLoading.clearHeight)/2,insideZ],wall,g);
    }else{
      box(w,h,d,[0,h/2,0],wall,g);box(w+.1,.45,d+.1,[0,.225,0],base,g);
    }
    const bay=d/bays,rise=1.05;
    for(let b=0;b<bays;b++){
      const zz=-d/2+bay*(b+.5),slope=Math.atan2(rise,bay/2),length=Math.hypot(bay/2,rise)+.42;
      for(const side of [-1,1]){const r=box(w+.8,.12,length,[0,h+rise/2,zz+side*bay/4],side===1?roof:roofShade,g);r.rotation.x=side*slope;
        for(let xx=-w/2;xx<w/2+.1;xx+=.63){const seam=box(.025,.045,length,[xx,h+rise/2+.09,zz+side*bay/4],seamMat,g);seam.rotation.x=side*slope;}
        for(const xx of [-w/2-.38,w/2+.38]){const verge=box(.095,.16,length,[xx,h+rise/2+.06,zz+side*bay/4],trim,g);verge.rotation.x=side*slope;}
      }
      box(w+.85,.14,.22,[0,h+rise+.05,zz],trim,g);
      // Triangular gable ends close the roof instead of leaving a floating sheet.
      const shape=new T.Shape();shape.moveTo(-bay/2,0);shape.lineTo(bay/2,0);shape.lineTo(0,rise);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false});
      for(const side of [-1,1]){const end=mesh(geo,wall,[side*w/2,h,zz],g);end.rotation.y=Math.PI/2;}
      for(const xx of [-w*.25,w*.28]){box(1.2,.30,.65,[xx,h+rise+.20,zz],wall,g);box(1.5,.10,.9,[xx,h+rise+.40,zz],roofShade,g);for(let y=0;y<3;y++)box(1.06,.025,.04,[xx,h+rise+.10+y*.07,zz+.35],dark,g);}
    }
    for(const side of [-1,1]){
      const zz=side*(d/2+.12);box(w+.6,.18,.20,[0,h+.01,zz],trim,g);
      for(let xx=-w/2+3;xx<w/2;xx+=8){if(sideLoading&&side===1&&Math.abs(xx-openingX)<openingWidth/2+.4)continue;cyl(.07,h,[xx,h/2,zz+.15*side],trim,g,undefined,16);box(.25,.15,.32,[xx,.2,zz+.22*side],base,g);}
      // Continuous clerestory strips with the closely spaced panes in the photo.
      box(w-1.1,.76,.045,[0,h-.68,zz],glass,g);
      for(let xx=-w/2+.55;xx<=w/2-.5;xx+=.62)box(.055,.83,.085,[xx,h-.68,zz+.035*side],wall,g);
      for(const y of [h-1.1,h-.26])box(w-1,.07,.13,[0,y,zz+.045*side],trim,g);
      for(let xx=-w/2+1;xx<w/2;xx+=1.1){if(sideLoading&&side===1&&Math.abs(xx-openingX)<openingWidth/2+.1)continue;box(.015,h-.6,.012,[xx,h/2+.25,side*(d/2+.015)],base,g);}
    }
    box(.04,.65,d-1.2,[-w/2-.075,h-.63,0],glass,g);
    for(let zz=-d/2+.6;zz<d/2-.4;zz+=.62)box(.07,.73,.055,[-w/2-.11,h-.63,zz],wall,g);
    if(frontLoading)for(const zz of [-d*.26,d*.26]){
      box(.06,3.95,4.15,[-w/2-.07,2.06,zz],dark,g);box(.075,3.76,3.85,[-w/2-.12,2.05,zz],door,g);
      for(let y=.3;y<3.9;y+=.18)box(.025,.025,3.85,[-w/2-.17,y,zz],trim,g);
      box(.45,.13,4.4,[-w/2-.08,4.12,zz],trim,g);box(5,.16,5,[-w/2-2.5,-.02,zz],m.concrete,g);
      for(const dz of [-2.25,2.25]){cyl(.075,.9,[-w/2-.55,.45,zz+dz],m.yellow,g,undefined,16);box(.01,.17,.12,[-w/2-.63,.65,zz+dz],dark,g);}
    }
    return g;
  }
  ridgeHall(31,-102,76,30,6.2,3,false,LOADING);
  buildOldSideLoading(k);
  // The front gable has small personnel doors facing the landscaped court.
  for(const z of [-112,-107.4]){
    box(.055,2.45,1.05,[-7.06,1.3,z],door);
    box(.035,.60,.80,[-7.10,1.91,z],glass);
    box(.12,.12,1.22,[-7.09,2.58,z],trim);
    rod([-7.15,.98,z+.35],[-7.15,1.27,z+.35],.018,trim);
    box(3.7,.08,1.65,[-8.85,.01,z],m.concrete);
  }
  const warehouse=LEFT.warehouse;
  ridgeHall(warehouse.x,warehouse.z,warehouse.width,warehouse.depth,warehouse.height,1,false);
  const warehouseSign=textPlate('AMMAR BINASY',5.6,.36,[-7.14,6.10,warehouse.z],k.scene,'#917627','#dfe2db');warehouseSign.rotation.y=-Math.PI/2;
  // Loading openings along the separate long shed's yard-facing wall.
  for(const x of [4,24,49]){
    box(4.8,3.8,.065,[x,1.98,-131.93],dark);
    box(5.1,.3,.18,[x,4.04,-131.84],wall);
    box(5.6,.12,3.8,[x,.02,-130.1],m.concrete);
    for(const dx of [-2.55,2.55])cyl(.06,.85,[x+dx,.43,-131.4],m.yellow);
    // A partially raised roller shutter leaves a dark, readable loading bay.
    for(let y=3.05;y<3.9;y+=.17)box(4.7,.12,.08,[x,y,-131.84],door);
  }
  function curtainWall(x,y,z,width,height,yaw=0){
    const g=group([x,y,z]);g.rotation.y=yaw;
    const columns=Math.ceil(width/1.15),rows=Math.ceil(height/1.15),cw=width/columns,ch=height/rows;
    for(let col=0;col<columns;col++)for(let row=0;row<rows;row++)box(cw-.035,ch-.035,.045,[-width/2+cw*(col+.5),ch*(row+.5),0],glassPanes[(col+row*2)%3],g);
    for(let col=0;col<=columns;col++)box(.055,height+.09,.11,[-width/2+cw*col,height/2,.04],trim,g);
    for(let row=0;row<=rows;row++)box(width+.09,.055,.11,[0,ch*row,.045],trim,g);
    box(width+.18,.18,.18,[0,height+.11,.02],wall,g);
    return g;
  }
  // Two-storey glazed corner: the glazing wraps from the front onto the long wall.
  const office=group([-10,0,-96.2]);
  box(7.4,5.35,18.4,[0,2.675,0],wall,office);
  box(7.7,.28,18.7,[0,5.49,0],wall,office);
  box(7.2,.07,18.2,[0,5.67,0],roof,office);
  box(7.6,.30,18.6,[0,.15,0],base,office);
  curtainWall(-13.76,.34,-96.2,18.4,4.76,-Math.PI/2);
  curtainWall(0,.34,-86.94,27.4,4.76);
  box(27.8,.26,.42,[0,5.44,-86.87],wall);
  box(27.8,.10,1.05,[0,5.62,-86.65],roof);
  const entry=group([-13.87,0,-98.5]);
  box(.075,2.4,2.2,[0,1.38,0],glass,entry);
  for(const zz of [-1.1,0,1.1])box(.13,2.46,.055,[-.03,1.38,zz],trim,entry);
  for(const zz of [-.15,.15])rod([-.13,1.1,zz],[-.13,1.55,zz],.025,m.steel,entry);
  box(2.8,.15,4.2,[-1.05,2.95,0],trim,entry);
  box(2.66,.055,4.04,[-1.05,3.06,0],roof,entry);
  for(const zz of [-1.9,1.9])rod([-2.25,.1,zz],[-2.25,2.94,zz],.045,trim,entry);
  for(let i=0;i<3;i++)box(.55,.12*(3-i),3.1,[-.55-i*.5,.06*(3-i),0],m.concrete,entry);
  box(4.3,.1,3.1,[-16.25,-.01,-98.5],m.concrete);
  const sign=textPlate('AK BULUT',4.5,.65,[-13.91,5.26,-96.2],k.scene,'#234c67','#dfe2db');sign.rotation.y=-Math.PI/2;
  // The raised process block is broad, with a shallow green roof and a high window band.
  const annex=group([54,0,-106]);box(16,10.8,12,[0,5.4,0],wall,annex);
  const capRise=1.15,capSlope=Math.atan2(capRise,6),capLength=Math.hypot(6,capRise)+.28;
  for(const side of [-1,1]){
    const cap=box(16.6,.12,capLength,[0,10.8+capRise/2,side*3],side>0?roof:roofShade,annex);cap.rotation.x=side*capSlope;
    for(let x=-8;x<=8;x+=.65){const seam=box(.025,.035,capLength,[x,10.9+capRise/2,side*3],seamMat,annex);seam.rotation.x=cap.rotation.x;}
    box(15,.85,.05,[0,9.15,side*6.035],glass,annex);
    for(let x=-7.5;x<7.6;x+=.6)box(.055,.93,.09,[x,9.15,side*6.07],wall,annex);
    box(16.6,.18,.22,[0,10.78,side*6.12],trim,annex);
  }
  const capEnd=new T.Shape();capEnd.moveTo(-6,0);capEnd.lineTo(6,0);capEnd.lineTo(0,capRise);capEnd.closePath();
  const capEndGeometry=new T.ExtrudeGeometry(capEnd,{depth:.12,bevelEnabled:false});
  for(const x of [-8,8]){const end=mesh(capEndGeometry,wall,[x,10.8,0],annex);end.rotation.y=Math.PI/2;}
  box(16.65,.15,.23,[0,11.99,0],trim,annex);
  for(const x of [-7.6,7.6])cyl(.075,10.8,[x,5.4,6.18],trim,annex);
  const annexSign=textPlate('AK BULUT',5.1,.95,[-8.08,9.3,0],annex,'#234c67','#dfe2db');annexSign.rotation.y=-Math.PI/2;
  for(const x of [-3.4,3.4]){box(1.4,.55,1.2,[x,12.25,0],wall,annex);box(1.7,.13,1.5,[x,12.6,0],trim,annex);}
  k.ladder(10.8,7.3,6.35,annex,true);
  // Keep the factory court empty: the silo assembly sits on the quarry side of the wall.
  const services=group([OLD_RAW_SILOS.x,0,OLD_RAW_SILOS.z]);
  services.name='old-plant-exterior-silos';
  box(OLD_RAW_SILOS.width,.18,OLD_RAW_SILOS.depth,[0,.06,0],m.concrete,services);
  for(const z of [-4,3]){
    const silo=group([0,0,z],services);k.frame(3.4,3.4,2.6,silo);
    cyl(1.65,5.2,[0,5.5,0],wall,silo,undefined,48);cyl(.3,1.5,[0,2.15,0],trim,silo,1.65,40);cyl(1.7,.16,[0,8.18,0],trim,silo,undefined,48);
    for(const y of [3,5,7.7])ring(1.67,.035,[0,y,0],trim,silo);k.ladder(8.2,-1.9,0,silo);
    // Local discharge drops into the service pad instead of spanning the factory court.
    k.pipe([[0,1.4,0],[2.7,1.4,0],[3.2,.7,0],[3.2,-.16,0]],.23,trim,silo);
    ring(.33,.055,[1.5,1.4,0],trim,silo,'x');
  }
  box(5,3.7,4,[0,1.95,-10],wall,services);box(5.4,.18,4.4,[0,3.91,-10],roof,services);
  function glazedPavilion(x,z,w){
    ridgeHall(x,z,w,6,3.3);
    curtainWall(x,.34,z+3.06,w-1,2.43);
    curtainWall(x-w/2-.07,.34,z,5.4,2.43,-Math.PI/2);
    box(w+.8,.20,1.85,[x,3.12,z+3.5],wall);
    box(w+.6,.065,1.65,[x,3.26,z+3.5],roofShade);
    for(let xx=x-w/2+.4;xx<=x+w/2;xx+=1.1)rod([xx,3.95,z+2.35],[xx,3.35,z+4.3],.04,trim);
    for(const xx of [x-w/2+.5,x+w/2-.5])rod([xx,.1,z+4.25],[xx,3.12,z+4.25],.05,trim);
    box(2.1,.10,.08,[x,2.75,z+3.16],trim);
    box(.055,2.4,.085,[x,1.54,z+3.17],trim);
  }
  buildOldGardenPavilion(k,plants,solarPanel);
  glazedPavilion(78,-70,17);
  buildOldFrontCourt(k,plants);
  buildOldFrontParking(k,solarPanel);
  buildOldWarehouseCourt(k,plants);
  buildOldRearBoundary(k);
  // Yard equipment, transformer bay and planted entrances give the older site depth.
  box(12,.23,7,[82,.10,-139],m.concrete);for(const x of [79,85]){box(2.7,2.0,2.1,[x,1.18,-139],base);for(let z=-139.9;z<-138;z+=.17)box(2.84,1.55,.045,[x,1.18,z],dark);for(const dx of [-.7,0,.7])cyl(.09,.5,[x+dx,2.4,-139],trim);}
  for(const x of [12,35,60]){box(4,.18,2.4,[x,-.03,-129],m.concrete);for(let i=0;i<5;i++)box(2.8,.11,1.8,[x,.18+i*.14,-129],wall);}
  plants.garden(47,-69.3,9,5);
  plants.row(98,-83,98,-153,5);
  // Rail-side boundary, with breaks at service entrances. The two photographed
  // entrance structures are built together on the pond-side approach.
  for(const [a,b] of [[[42,-74],[65,-74]],[[91,-73],[101,-73]]]){
    const A=new T.Vector3(a[0],0,a[1]),B=new T.Vector3(b[0],0,b[1]),d=A.distanceTo(B),g=group(A.clone().add(B).multiplyScalar(.5).toArray());g.rotation.y=-Math.atan2(B.z-A.z,B.x-A.x);box(d,.48,.25,[0,.24,0],wall,g);for(let x=-d/2;x<d/2;x+=3.5)box(.22,1.75,.22,[x,.87,0],wall,g);for(const y of [.65,1.65])box(d,.045,.045,[0,y,0],trim,g);for(let x=-d/2;x<d/2;x+=.22)box(.018,1.0,.018,[x,1.15,0],trim,g);
  }
  for(const [x,z] of [[93,-87],[93,-122],[95,-135]]){cyl(.055,6,[x,3,z],trim);rod([x,5.9,z],[x+1,6.15,z],.045,trim);box(.8,.10,.30,[x+1,6.15,z],m.light);}
}
