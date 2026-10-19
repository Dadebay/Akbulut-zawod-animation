import * as T from 'three';
import {createSolarPanels,buildOldFrontParking} from './oldCampusDetails.js';
import {buildOldGardenPavilion} from './oldGardenPavilion.js';
import {buildOldWarehouseCourt} from './oldWarehouseCourt.js';
import {buildOldFrontCourt} from './oldFrontCourt.js';
import {buildOldSideLoading} from './oldSideLoading.js';
import {buildOldRearBoundary} from './oldRearBoundary.js';
import {OLD_LEFT_CAMPUS as LEFT,OLD_SIDE_LOADING as LOADING,OLD_PAVILION,OLD_REAR_BOUNDARY,RAIL_ACCESS_CROSSING} from './siteLayout.js';

// Proportions and facade details follow the user's close aerial photograph.
// These are visual estimates; the site has not been surveyed.
export const OLD_SOUTH_GARDENS=[[36,-64.25,9,8.5],[53.3,-61.6,25.4,3.2]];
export function buildOldCampus(k,plants){
  const {m,box,cyl,rod,ring,group,mesh,material,textPlate}=k,shells=[];
  const wall=material('#dfe2db',.04,.86),base=material('#a7aaa2',0,.94),roof=material('#699780',.27,.58),roofShade=material('#4f8069',.23,.67),seamMat=material('#87a994',.27,.64),trim=material('#c1d0c7',.44,.53),glass=material('#36545d',.38,.27),dark=material('#3c4c50',.46,.6),paving=material('#8b908d',0,.96),door=material('#718e82',.22,.65);
  const glassPanes=[glass,material('#46636d',.38,.28),material('#304b55',.38,.29)];
  const solarPanel=createSolarPanels(k);
  // Run the court paving beneath the rear boundary wall so no soil strip shows.
  const courtWest=-28,courtEast=OLD_REAR_BOUNDARY.x+.2;
  box(courtEast-courtWest,.14,79,[(courtWest+courtEast)/2,-.20,-110.5],paving,k.scene,2.5);
  function ridgeHall(x,z,w,d,h,bays=1,frontLoading=true,sideLoading=null){
    const g=group([x,0,z],k.scene,true);shells.push(g);
    const openingX=sideLoading?sideLoading.x-x:0,openingWidth=sideLoading?.interiorWidth||0;
    box(w,.12,d,[x,-.03,z],m.floor);
    for(const side of [-1,1])box(.24,h,d,[side*w/2,h/2,0],wall,g);
    box(w,h,.24,[0,h/2,-d/2],wall,g);
    if(sideLoading){
      for(const [a,b] of [[-w/2,openingX-openingWidth/2],[openingX+openingWidth/2,w/2]])box(b-a,h,.24,[(a+b)/2,h/2,d/2],wall,g);
      box(openingWidth,h-sideLoading.clearHeight,.24,[openingX,(h+sideLoading.clearHeight)/2,d/2],wall,g);
    }else box(w,h,.24,[0,h/2,d/2],wall,g);
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
  // End the glazing at the main hall: its white wall must stay ungridded.
  const glazedCornerWest=-13.7,glazedCornerEast=-7.15;
  curtainWall((glazedCornerWest+glazedCornerEast)/2,.34,-86.94,glazedCornerEast-glazedCornerWest,4.76);
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
  box(2.5,.1,3.1,[-15.35,-.01,-98.5],m.concrete);
  const sign=textPlate('AK BULUT',4.5,.65,[-13.91,5.26,-96.2],k.scene,'#234c67','#dfe2db');sign.rotation.y=-Math.PI/2;
  // The raised process block is broad, with a shallow green roof and a high window band.
  const annex=group([54,0,-106]);shells.push(annex);box(16,10.8,12,[0,5.4,0],wall,annex);
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
  function glazedPavilion(x,z,w){
    ridgeHall(x,z,w,6,3.3);
    // The rear eave meets the rail-side wall; doors and canopy face the court.
    curtainWall(x,.34,z-3.06,w-1,2.43,Math.PI);
    curtainWall(x-w/2-.07,.34,z,5.4,2.43,-Math.PI/2);
    box(w+.8,.20,1.85,[x,3.12,z-3.5],wall);
    box(w+.6,.065,1.65,[x,3.26,z-3.5],roofShade);
    for(let xx=x-w/2+.4;xx<=x+w/2;xx+=1.1)rod([xx,3.95,z-2.35],[xx,3.35,z-4.3],.04,trim);
    for(const xx of [x-w/2+.5,x+w/2-.5])rod([xx,.1,z-4.25],[xx,3.12,z-4.25],.05,trim);
    box(2.1,.10,.08,[x,2.75,z-3.16],trim);
    box(.055,2.4,.085,[x,1.54,z-3.17],trim);
  }
  buildOldGardenPavilion(k,plants,solarPanel);
  glazedPavilion(78,OLD_PAVILION.wallZ-3.35,17);
  buildOldFrontCourt(k,plants);
  // Plant only the lawn west of the covered truck entrance. Its east side
  // is an open asphalt apron, without the former two rows of conifers.
  const hallVergeNorth=-86.5,hallVergeSouth=-83.15;
  {
    const west=-4,east=32;
    const verge=box(east-west,.17,hallVergeSouth-hallVergeNorth,
      [(west+east)/2,-.055,(hallVergeNorth+hallVergeSouth)/2],m.grass);
    verge.castShadow=false;
    box(east-west,.16,.18,[(west+east)/2,.025,hallVergeSouth],wall).castShadow=false;
    for(let x=west+1.5,i=0;x<east-1;x+=3,i++){
      plants.plant(x,-84.95,.38+(i%3)*.025,{plantedBed:true});
      if(x+1.4<east-1)plants.plant(x+1.4,-84.05,.25+(i%2)*.025,{plantedBed:true});
    }
  }
  // Join the hall verge to the rounded planted bed at the glazed corner.
  // Step around the office facade instead of covering its front edge.
  const cornerLawnOutline=[
    [-16.18,-87.12],[-13.78,-87.12],[-13.78,hallVergeNorth],
    [-4,hallVergeNorth],[-4,hallVergeSouth],[-16.18,hallVergeSouth]
  ];
  const cornerLawnShape=new T.Shape();
  cornerLawnOutline.forEach(([x,z],i)=>i?cornerLawnShape.lineTo(x,-z):cornerLawnShape.moveTo(x,-z));
  cornerLawnShape.closePath();
  const cornerLawnGeometry=new T.ShapeGeometry(cornerLawnShape);
  cornerLawnGeometry.rotateX(-Math.PI/2);
  mesh(cornerLawnGeometry,m.grass,[0,.035,0]).castShadow=false;
  box(12.18,.16,.18,[-10.09,.025,hallVergeSouth],wall).castShadow=false;
  // Frame the exposed left edge; the joined edge beside the older bed stays green.
  box(.18,.16,hallVergeSouth+87.12,[-16.18,.025,(-87.12+hallVergeSouth)/2],wall).castShadow=false;
  for(const [x,z,size] of [
    [-14.7,-84.45,.31],[-13.2,-85.45,.25],[-11,-84.8,.30],
    [-9.7,-85.55,.25],[-8,-84.8,.30],[-6.5,-85.5,.25],[-5.1,-84.8,.29]
  ])plants.plant(x,z,size,{plantedBed:true});
  buildOldFrontParking(k,solarPanel);
  buildOldWarehouseCourt(k,plants);
  buildOldRearBoundary(k);
  // Yard equipment, transformer bay and planted entrances give the older site depth.
  box(12,.23,7,[82,.10,-139],m.concrete);for(const x of [79,85]){box(2.7,2.0,2.1,[x,1.18,-139],base);for(let z=-139.9;z<-138;z+=.17)box(2.84,1.55,.045,[x,1.18,z],dark);for(const dx of [-.7,0,.7])cyl(.09,.5,[x+dx,2.4,-139],trim);}
  for(const x of [12,35,60]){box(4,.18,2.4,[x,-.03,-129],m.concrete);for(let i=0;i<5;i++)box(2.8,.11,1.8,[x,.18+i*.14,-129],wall);}
  // Asphalt and a straight white wall east of the pavilion, continuing the wall on its west side.
  {
    const wallZ=()=>OLD_PAVILION.wallZ,x0=43.5,x1=OLD_REAR_BOUNDARY.x,step=3.5,pts=[];
    for(let x=x0;x<x1;x+=step)pts.push([x,wallZ(x)]);pts.push([x1,wallZ(x1)]);
    const courtAsphalt=m.road,whiteWall=k.material('#e2e4db',.05,.79);
    // Cover the former recessed corner as well; otherwise the pale base and
    // natural soil show through between this court and the parked vehicles.
    const shape=new T.Shape();shape.moveTo(x0,86.5);shape.lineTo(x1,86.5);
    for(let i=pts.length-1;i>=0;i--)shape.lineTo(pts[i][0],-pts[i][1]);
    shape.closePath();
    const geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
    k.mesh(geo,courtAsphalt,[0,.12,0]).castShadow=false;
    // The pale paving beside the shed reaches the wall without a dark seam.
    const palePaving=k.material('#8c8e8d',0,.95);
    const paleEast=OLD_REAR_BOUNDARY.x;
    const pale=k.box(paleEast-69,.01,-77.5+88.2,
      [(paleEast+69)/2,.13,(-77.5-88.2)/2],palePaving);pale.castShadow=false;
    const crossingWest=RAIL_ACCESS_CROSSING.x-RAIL_ACCESS_CROSSING.width/2;
    const crossingEast=RAIL_ACCESS_CROSSING.x+RAIL_ACCESS_CROSSING.width/2;
    for(const [start,end] of [[x0,crossingWest],[crossingEast,x1]]){
      const len=end-start,cx=(start+end)/2;
      box(len,1.15,.24,[cx,.575,OLD_PAVILION.wallZ],whiteWall);
      box(len+.1,.12,.36,[cx,1.21,OLD_PAVILION.wallZ],whiteWall);
      for(let x=start;x<end-.01;x+=step)box(.42,1.35,.42,[x,.675,OLD_PAVILION.wallZ],whiteWall);
      box(.42,1.35,.42,[end,.675,OLD_PAVILION.wallZ],whiteWall);
    }
  }
  // Dense conifer planting around the hall and its solar annex.
  {
    const houseBed={x:81,z:-70.15,width:10,depth:3.9};
    const pairedWest=houseBed.x-houseBed.width*1.5;
    const pairedEast=houseBed.x-houseBed.width/2;
    const pairedNorth=houseBed.z-houseBed.depth/2;
    const pairedSouth=houseBed.z+houseBed.depth/2;
    const houseSideEdge=69.3,houseSideSouth=-60.4;
    const hallBedWest=7.5,hallBedEast=31;
    // Extend the rail-side lawn into the recessed asphalt between the green
    // hall and the small glazed building. The two beds behind the house now
    // have the same footprint; the strip beside its left wall is planted too.
    const lawnRim=[
      [31.5,-72.2],[35,-72.2],[38,-70.7],[40.5,-68.5],
      [41.5,-65],[65,-65],[pairedWest,pairedSouth],
      [pairedWest,pairedNorth],[pairedEast,pairedNorth]
    ];
    // One outline replaces the raised rectangular beds and overlapping bridge.
    // Only the exterior kerb remains; there are no bevels, height steps or
    // shadow-casting edges between the hall strip and the rail-side gardens.
    const lawnOutline=[[hallBedWest,-73.9],[hallBedEast,-73.9],...lawnRim,
      [houseBed.x+houseBed.width/2,pairedNorth],[houseBed.x+houseBed.width/2,pairedSouth],
      [houseSideEdge,pairedSouth],[houseSideEdge,-60.1],
      [30.25,-60.1],[30.25,-71.3],[hallBedWest,-71.3]];
    const lawnShape=new T.Shape();
    lawnOutline.forEach(([x,z],i)=>i?lawnShape.lineTo(x,-z):lawnShape.moveTo(x,-z));
    lawnShape.closePath();
    const lawnGeometry=new T.ShapeGeometry(lawnShape);
    lawnGeometry.rotateX(-Math.PI/2);
    const connectedLawn=mesh(lawnGeometry,m.grass,[0,.20,0]);
    connectedLawn.name='old-campus-connected-lawn';connectedLawn.castShadow=false;
    const lawnCurb=material('#e2e4db',.05,.79);
    for(let i=0;i<lawnRim.length-1;i++){
      const [ax,az]=lawnRim[i],[bx,bz]=lawnRim[i+1];
      const length=Math.hypot(bx-ax,bz-az);
      const edge=box(length+.08,.17,.23,[(ax+bx)/2,.18,(az+bz)/2],lawnCurb);
      edge.rotation.y=-Math.atan2(bz-az,bx-ax);
    }
    box(pairedEast-houseSideEdge,.17,.23,[(pairedEast+houseSideEdge)/2,.18,pairedSouth],lawnCurb);
    box(.23,.17,houseSideSouth-pairedSouth,
      [houseSideEdge,.18,(pairedSouth+houseSideSouth)/2],lawnCurb);
    for(const [x,z,size] of [
      [33.4,-70.4,.32],[36.1,-70.5,.30],[38.6,-68.6,.31],
      [42.5,-64.1,.27],[45.5,-64.1,.30],[48.5,-64.0,.28],
      [51.5,-64.1,.31],[54.5,-64.0,.28],[57.5,-64.1,.30],
      [60.5,-64.0,.29],[63.5,-64.1,.30],
      [67.3,-70.9,.30],[69.7,-70.9,.29],[72.1,-70.9,.32],[74.5,-70.9,.29],
      [68.4,-69.2,.28],[71,-69.2,.31],[73.6,-69.2,.29],
      [67.2,-66.3,.29],[67.3,-63.8,.28],[67.2,-61.5,.27]
    ])plants.plant(x,z,size,{plantedBed:true});
    // Stagger smaller yolka through the visible gaps without covering curbs.
    for(const [x,z] of [
      [34.5,-67.8],[37.1,-67.8],[34.6,-65.3],[37.2,-65.3],
      [34.5,-62.9],[37.1,-62.9],
      [68.3,-70.0],[71.2,-70.0],[74.1,-70.0]
    ])plants.plant(x,z,.24,{plantedBed:true});
    plants.garden(-9.5,-67.2,19.5,13.5,{curb:false,surface:false});plants.grove(-9.5,-67.2,17,11.5,2.6,{surface:false});
    for(const bed of OLD_SOUTH_GARDENS)plants.garden(...bed,{curb:false,surface:false});
    // Frame only the outside of the adjoining bed, leaving their shared edge green.
    plants.garden(houseBed.x,houseBed.z,houseBed.width,houseBed.depth,{curb:false,surface:false});
    for(const z of [pairedNorth,pairedSouth])
      box(houseBed.width,.17,.23,[houseBed.x,.18,z],lawnCurb);
    box(.23,.17,houseBed.depth,[houseBed.x+houseBed.width/2,.18,houseBed.z],lawnCurb);
    const yolkaRow=(west,east,z,spacing,size,offset=0)=>{
      for(let x=west+offset,i=0;x<=east;x+=spacing,i++)
        plants.plant(x,z,size+(i%3)*.025,{plantedBed:true});
    };
    // The narrow planting joins the pavilion lawn without a dividing curb.
    yolkaRow(-27.3,1.3,-76.15,2.15,.29);
    yolkaRow(-27.3,1.3,-74.95,2.15,.28,1.07);
    yolkaRow(-27.3,1.3,-73.55,2.15,.28,.54);
    // Keep the outside white rim, but omit the east curb between the joined lawns.
    plants.garden(19.25,-72.6,23.5,2.6,{curb:false,surface:false});
    for(const z of [-73.9-.12,-71.3+.12])
      box(hallBedEast-hallBedWest+.12,.16,.24,
        [(hallBedWest+hallBedEast)/2-.06,.16,z],lawnCurb);
    box(.24,.16,2.84,[hallBedWest-.12,.16,-72.6],lawnCurb);
    const outerJoinStart=[hallBedEast,-74.02],outerJoinEnd=lawnRim[0];
    const outerJoinLength=Math.hypot(outerJoinEnd[0]-outerJoinStart[0],outerJoinEnd[1]-outerJoinStart[1]);
    const outerJoin=box(outerJoinLength+.08,.17,.23,
      [(outerJoinStart[0]+outerJoinEnd[0])/2,.18,(outerJoinStart[1]+outerJoinEnd[1])/2],lawnCurb);
    outerJoin.rotation.y=-Math.atan2(outerJoinEnd[1]-outerJoinStart[1],outerJoinEnd[0]-outerJoinStart[0]);
    for(const z of [-67.5,-64.6,-62.0])
      plants.plant(32.15,z,.24,{plantedBed:true});
    // Keep the hall's service-door path above the lawn and free of trees.
    box(1.8,.08,2.1,[22,.22,-71.2],k.material('#b4b6a9',0,.95));
    yolkaRow(8.5,30.5,-73.2,2.1,.29);
    yolkaRow(8.5,20.5,-71.95,2.1,.27,1.05);
    yolkaRow(23.2,30.5,-71.95,2.1,.27,1.05);
    yolkaRow(8.8,19.5,-72.55,2.0,.22,.7);
    yolkaRow(25.4,29.8,-72.55,2.0,.22,.5);
    yolkaRow(33,39,-69.1,2.1,.31);
    yolkaRow(33,39,-66.6,2.1,.30,1.05);
    yolkaRow(33,39,-64.1,2.1,.30);
    yolkaRow(33,39,-61.9,2.1,.29,1.05);
    yolkaRow(42,66,-62.8,2.0,.30);
    yolkaRow(42,66,-61.45,2.0,.27,1.0);
    yolkaRow(42.5,64.5,-63.45,2.05,.24,.9);
    // Low planting fills the small rectangular bed without reaching the roof.
    const bedYolka=[
      [77.4,-70.9,.31],[79.8,-70.8,.34],[82.3,-70.9,.30],[84.6,-70.8,.33],
      [78.5,-69.15,.29],[81.1,-69.2,.32],[83.6,-69.1,.30],
      [77.0,-70.0,.23],[80.0,-70.0,.24],[83.0,-70.0,.23]
    ];
    for(const [x,z,size] of bedYolka)plants.plant(x,z,size,{plantedBed:true});
  }
  for(const [x,z] of [[93,-87],[93,-122],[95,-135]]){cyl(.055,6,[x,3,z],trim);rod([x,5.9,z],[x+1,6.15,z],.045,trim);box(.8,.10,.30,[x+1,6.15,z],m.light);}
  return {shells};
}
