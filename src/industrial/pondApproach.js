import {POND,POND_APPROACH as ROAD,VISITOR_PARK as PARK,OLD_FRONT_COURT,OLD_ENTRANCE,OLD_LEFT_CAMPUS} from './siteLayout.js';
import {buildOldEntrance} from './oldEntrance.js';
import {createParkedCarBuilder} from './parkedCars.js';
import {buildRoadMedian} from './roadMedian.js';

// Broad visitor forecourt and the divided pond-side entrance in the aerials.
export function buildPondApproach(k,plants){
  const {box,cyl,rod,group,material,m}=k;
  const paving=material('#969487',0,.97),curb=material('#c5c4b7',0,.92),paint=material('#d8d7c8',0,.9);
  const width=PARK.east-PARK.west,depth=PARK.south-PARK.north,cx=(PARK.west+PARK.east)/2,cz=(PARK.north+PARK.south)/2;
  box(width,.16,depth,[cx,-.08,cz],paving);
  // Sparse expansion joints, leaving most of the large apron open as pictured.
  for(let x=PARK.west+8;x<PARK.east;x+=12)box(.025,.006,depth,[x,.004,cz],m.concrete);
  for(let z=PARK.north+8;z<PARK.south;z+=12)box(width,.006,.025,[cx,.004,z],m.concrete);
  for(const z of [PARK.north,PARK.south]){
    if(z===PARK.north)box(width,.22,.35,[cx,.06,z],curb);
    else for(const [a,b] of [[PARK.west,PARK.entryX-PARK.entryWidth/2],[PARK.entryX+PARK.entryWidth/2,PARK.east]])box(b-a,.22,.35,[(a+b)/2,.06,z],curb);
  }
  for(const x of [PARK.west,PARK.east])box(.35,.22,depth,[x,.06,cz],curb);

  // Lawn fills the bare L-shaped margin between the parking kerb and road edges.
  const parkingEast=PARK.east+.175,parkingSouth=PARK.south+.175;
  const vergeEast=OLD_LEFT_CAMPUS.frontRoadX-3.5-1.3;
  const vergeSouth=ROAD.z-ROAD.width/2-1-.775;
  const entrySidewalkEast=PARK.entryX+PARK.entryWidth/2+1+.775;
  for(const [west,east,north,south] of [
    [parkingEast,vergeEast,PARK.north-.175,vergeSouth],
    [entrySidewalkEast,parkingEast,parkingSouth,vergeSouth]
  ]){
    const lawn=box(east-west,.15,south-north,[(west+east)/2,-.10,(north+south)/2],m.grass);
    lawn.name='visitor-parking-verge';lawn.castShadow=false;
  }

  const car=createParkedCarBuilder(k);
  let index=0;
  for(let z=PARK.north+41;z>=PARK.north+8;z-=3){
    car(PARK.east-8,z,Math.PI,index++);
    for(const dz of [-1.45,1.45])box(5.5,.008,.065,[PARK.east-8,.014,z+dz],paint);
    box(.17,.13,1.65,[PARK.east-5.5,.075,z],curb);
  }
  for(let x=-86;x<=PARK.east-16;x+=3){
    if(Math.abs(x-PARK.entryX)<8)continue;
    car(x,PARK.south-8,Math.PI/2,index++);
    for(const dx of [-1.45,1.45])box(.065,.008,5.5,[x+dx,.014,PARK.south-8],paint);
    box(1.65,.13,.17,[x,.075,PARK.south-5.5],curb);
  }

  // The entrance median is continuous; later strips leave the parking access open.
  buildRoadMedian(k,plants,{west:-200,east:OLD_ENTRANCE.outerX-12,z:ROAD.z,lit:true,name:'pond-approach-continuous-median'});
  buildRoadMedian(k,plants,{west:OLD_ENTRANCE.outerX+8,east:PARK.entryX-PARK.entryWidth/2-2,z:ROAD.z});
  buildRoadMedian(k,plants,{west:PARK.entryX+PARK.entryWidth/2+2,east:OLD_LEFT_CAMPUS.frontRoadX-7,z:ROAD.z});
  for(const x of [-194,-160,-126,-108]){
    cyl(.065,7,[x,3.5,ROAD.z-7.6],curb,undefined,undefined,12);
    rod([x,6.8,ROAD.z-7.6],[x,7.1,ROAD.z-5.7],.045,m.steel);box(.32,.12,.85,[x,7.1,ROAD.z-5.6],m.light);
  }
  for(const [x,z] of [[-92,PARK.north+8],[-92,PARK.south-12],[-71,PARK.north+7],[PARK.east-4,PARK.north+19]]){
    box(.65,.3,.65,[x,.15,z],curb);cyl(.08,9,[x,4.5,z],m.steel,undefined,undefined,12);
    for(const side of [-1,1]){rod([x,8.7,z],[x+side*1.3,9,z],.055,m.steel);box(.8,.12,.3,[x+side*1.3,9,z],m.light);}
  }
  buildOldEntrance(k);
  plants.row(-198,ROAD.z+10.2,-154,ROAD.z+10.2,4);
  plants.row(-131,ROAD.z+10.2,-87,ROAD.z+10.2,4);
  // Dense woodland east of the pond, with no road along the railway, as in the aerial photo.
  const orchard=OLD_FRONT_COURT.orchard;
  // Fill the whole block, from the pond road down to the railway, so no bare earth strip remains.
  const north=ROAD.z+6.4,south=-56.5,east=orchard.east+1;
  plants.grove((orchard.west+east)/2,(north+south)/2,east-orchard.west,south-north,3.0);
  // Join the orchard lawn to the pond-side woodland across the exposed ground
  // beside the blue-roofed pump hut.
  const seamWest=POND.x+POND.width/2-.5;
  const seam=box(orchard.west-seamWest,.15,south-north,
    [(seamWest+orchard.west)/2,-.10,(north+south)/2],m.grass);
  seam.castShadow=false;
}
