import * as T from 'three';
import {GYPSUM_INTAKE} from './processPlan.js';
import {quarryPoint} from './quarryLayout.js';
import {RAIL_LAYOUT} from './railLayout.js';

// Photo-based presentation coordinates, not a surveyed construction plan.
export const OUTER_RAIL_Z=49;
export function outerRailPath(){const path=new T.CurvePath();path.add(new T.LineCurve3(new T.Vector3(-700,0,OUTER_RAIL_Z),new T.Vector3(100,0,OUTER_RAIL_Z)));path.add(new T.CatmullRomCurve3([[100,0,OUTER_RAIL_Z],[150,1.2,OUTER_RAIL_Z],[205,4.6,OUTER_RAIL_Z+2],[250,5,OUTER_RAIL_Z+2],[330,6.5,OUTER_RAIL_Z+2],[450,10,OUTER_RAIL_Z+2],[560,13,OUTER_RAIL_Z+2]].map(p=>new T.Vector3(...p)),false,'catmullrom',.12));return path;}
// Turn the reservoir footprint beside the avenue, retaining its surface area
// and leaving the straight approach and the railway-side street clear.
export const POND={x:-108,z:-91,width:52,depth:42};
export const POND_APPROACH={west:-205,east:0,z:-124.5,width:10.4};
export const OLD_ENTRANCE={outerX:-94,innerX:-29,z:POND_APPROACH.z,innerZ:POND_APPROACH.z};
// One shared axis from the outside avenue through both gates into the court.
// The outer gateway moves sideways to the inner checkpoint, with no dogleg.
export const OLD_ENTRANCE_YAW=0;
export function oldEntranceRoadZ(){return POND_APPROACH.z;}
export const OLD_APPROACH={...POND_APPROACH};
// Bring the gateway footing to the road edge while retaining the fence line.
export const NEW_FACTORY_ENTRANCE={x:-138.25,fenceX:-137,southFenceX:-137,z:-2,left:-16.8,right:13,widthScale:.7};
// The road in front of the gate continues west across the avenue, as in the reference views.
export const NEW_ENTRANCE_ROAD={west:-205,east:-143,z:-2,width:9.4,outer:{x:-205,north:-232,south:201,width:7.4}};
export const NEW_ENTRANCE_MEDIAN={west:NEW_ENTRANCE_ROAD.west+9,east:NEW_ENTRANCE_ROAD.east-12,z:NEW_ENTRANCE_ROAD.z,width:1.05};
export function oldEntranceClearance(x,z){
  const c=Math.cos(OLD_ENTRANCE_YAW),s=Math.sin(OLD_ENTRANCE_YAW);
  const distance=(cx,cz,halfX,halfZ)=>{
    const dx=x-cx,dz=z-cz,along=c*dx-s*dz,across=s*dx+c*dz;
    return Math.hypot(Math.max(Math.abs(along)-halfX,0),Math.max(Math.abs(across)-halfZ,0));
  };
  return Math.min(distance(OLD_ENTRANCE.outerX,OLD_ENTRANCE.z,4.5,11.5),distance(OLD_ENTRANCE.innerX,OLD_ENTRANCE.innerZ,4.5,8.2));
}
export const VISITOR_PARK={west:-98,east:-46,north:POND_APPROACH.z-71,south:POND_APPROACH.z-12,entryX:-78,entryWidth:10};
// Covered parking sits against the front fence and opens onto the courtyard lane.
export const OLD_FRONT_PARK={west:-28.75,east:-21.6,north:-101.3,south:-89.7,canopyX:-25.8,z:-95.5,canopyWidth:11.4,canopyDepth:5.8};
export const OLD_LEFT_CAMPUS={
  warehouse:{x:31,z:-138,width:76,depth:12,height:5.8},
  frontRoadX:-38,sideRoadZ:-154,sideRoadWidth:4.6,
  fenceX:-29,sideFenceZ:-150,
  forecourt:{west:-29,east:4,north:-150,south:-117.6},
  parking:{west:-25.8,east:-7.4,north:-148.2,south:-141.8},
  median:{west:4,east:65,north:POND_APPROACH.z-2.7,south:POND_APPROACH.z+2.7}
};
export const OLD_FRONT_COURT={
  west:OLD_LEFT_CAMPUS.fenceX,east:1,north:-118,south:-73.4,
  entryZ:-81.6,entryWidth:9.4,
  drive:{west:OLD_LEFT_CAMPUS.fenceX,east:83,north:-82.5,south:-73.5},
  orchard:{west:POND.x+POND.width/2+3,east:-44,north:POND_APPROACH.z+10,south:-69}
};
export const OLD_SIDE_LOADING={
  x:44,wallZ:-87,width:22,depth:7.2,clearHeight:5,
  interiorWidth:12.4,interiorDepth:13,
  apron:{west:31,east:61,north:-87.25,south:-73.5}
};
// Rail-side canopy stock and column guards share the vehicle-clear layout.
// One raised deck runs from the hall right up to the wagons, so forklifts drive
// straight onto the train edge. The truck is loaded just east of the deck, then
// climbs the short east ramp, crosses the deck and leaves down the west ramp.
export const RAIL_SIDE_LOADING={
  // The deck covers only the wagons and the panel stock, inside the rail-side
  // fence opening (x -33..65). Short truck ramps sit on the truck lane.
  platform:{west:-5,east:50,north:-51.45,south:-39.55,height:.70},
  deckExtensions:[],
  ramps:[
    {west:-11,east:-5,north:-49.1,south:-46.3,high:'east'},
    {west:50,east:57,north:-49.1,south:-46.3,high:'west'},
  ],
  columnXs:[5.3,14,21.5,28,36,44],columnZ:-45.15,guardWidth:.62,
  panelBays:[{x:8,width:4.4},{x:15,width:4.4},{x:22,width:4.2},{x:29,width:4.4},{x:36,width:4.4},{x:42,width:3.8}],
  panelRows:[-42.7,-43.85],panelDepth:.94,panelTop:.34
};
// Ground height under the loading deck and its two ramps; zero elsewhere.
export function loadingDeckHeight(x,z){
  const {platform:p,deckExtensions,ramps}=RAIL_SIDE_LOADING;
  for(const d of [p,...deckExtensions])if(x>=d.west&&x<=d.east&&z>=d.north&&z<=d.south)return p.height;
  for(const r of ramps)if(x>=r.west&&x<=r.east&&z>=r.north&&z<=r.south)
    return p.height*(r.high==='east'?(x-r.west):(r.east-x))/(r.east-r.west);
  return 0;
}
export const OLD_PAVILION={
  // The hall now touches the boundary wall that runs along the railway (z=-60).
  hall:{x:19,z:-65.15,width:22,depth:10,height:3.5},
  annex:{x:5.8,z:-65.15,width:4.7,depth:10.4,height:3.15},
  garden:{west:OLD_LEFT_CAMPUS.fenceX,east:31,north:-73.4,south:-60.15},
  wallZ:-60,wallWest:-37,wallEast:43.5,
  serviceX:36
};
export const OLD_RAIL_DORMITORY={x:78,z:OLD_PAVILION.wallZ-3.35,width:17,depth:6,height:3.3,rooms:4,corridor:1.5};
export const OLD_WORK_OFFICE={x:-10,z:-96.2,width:7.4,depth:18.4,height:5.35,ground:.32,upper:2.92,entryZ:-96.2};
// One vehicle-width opening beside the dormitory, aligned through both fences.
export const RAIL_ACCESS_CROSSING={x:91,width:3.6,northFenceZ:-50,southWallZ:-60};
export function pondAccessClearance(x,z){
  const road=POND_APPROACH,park=VISITOR_PARK;
  const distance=(west,east,north,south)=>Math.hypot(Math.max(west-x,x-east,0),Math.max(north-z,z-south,0));
  return Math.min(distance(road.west,road.east,road.z-road.width/2,road.z+road.width/2),distance(park.west,park.east,park.north,park.south),distance(park.entryX-park.entryWidth/2,park.entryX+park.entryWidth/2,park.south,road.z));
}
export const RAW_YARD={west:101,east:238,north:-165,south:-65};
// The compact concrete apron and its rail connection share the same edges.
export const RAW_YARD_APRON={west:RAW_YARD.west+.34,east:160,north:-149,south:RAIL_LAYOUT.z-2.05};
// Keep the compact system beside the partition, with its wall-side belt
// north of the gateway and its receiving pile on the open side of the yard.
const yardHalfWidth=(RAW_YARD_APRON.east-RAW_YARD_APRON.west)/2,yardConveyorScale=.65;
export const RAW_YARD_CONVEYOR={
  x:RAW_YARD.west+.70+(yardHalfWidth-3)*yardConveyorScale,z:RAW_YARD_APRON.north+15.4,
  scale:yardConveyorScale,westReach:yardHalfWidth-3,stockOffsetX:yardHalfWidth-8,stockOffsetZ:9
};
export const OLD_REAR_BOUNDARY={
  x:RAW_YARD.west,north:RAW_YARD.north,south:RAW_YARD.south,
  height:2.2,gateZ:(OLD_LEFT_CAMPUS.median.north+OLD_LEFT_CAMPUS.median.south)/2,gateWidth:12,
  building:{x:91.5,z:-146,width:8,depth:6,height:3.25}
};
// Keep the rail-side silo in place; its neighbour sits directly beside it
// along the rear wall, toward the transfer conveyor.
export const OLD_RAW_SILOS={x:RAW_YARD.west+11.7,z:-78.8,width:10,depth:18};
export const RAW_STOCK=[
  RAW_YARD_CONVEYOR.x+RAW_YARD_CONVEYOR.stockOffsetX*RAW_YARD_CONVEYOR.scale,0,
  RAW_YARD_CONVEYOR.z+RAW_YARD_CONVEYOR.stockOffsetZ*RAW_YARD_CONVEYOR.scale
];
export const RAW_STOP=[RAW_STOCK[0]-5.5,0,RAW_STOCK[2]];
// Tall white auxiliary tower directly beside the exposed corner silo.
export const GYPSUM_SILO_TOWER={x:-13.6,z:25.3,width:5.2,depth:5.6,height:14.8};
// Main/courtyard volumes and illustrative interior envelopes. The rear exterior
// follows the October 21 photographs in rearServiceYard.js; its cutaway is separate.
export const PROCESS_BUILDINGS={
  main:{x:-29,z:5,width:17,depth:29,height:27},
  // The narrower tower and compact rear annex both sit on the same low base.
  // Keep the west facade fixed so the entrance-step passage remains clear.
  leftBase:{x:-44.05,z:-4.4,width:15.3,depth:11.8,height:3.2},
  leftCore:{x:-45.4,z:-6,width:12.6,depth:8.6,height:13.2},
  leftLink:{x:-38,z:-9,width:2.2,depth:2.6,height:10.7},
  rightCore:{x:-39.55,z:24,width:5.4,depth:7.5,height:20.5},
  // This short main-block link must not bridge the open passage beside the L wing.
  rightLink:{x:-29.35,z:21.7,width:3.3,depth:4.4,height:6.2},
  // Narrow L-shaped courtyard building traced from the four exterior views.
  rightWing:{x:-39.55,z:32.775,width:5.4,depth:10.05,height:10.2},
  outerWing:{x:-56.125,z:35.9,width:27.75,depth:3.8,height:10.2},
  outerService:{x:-64,z:38.4,width:8.2,depth:1.2,height:2.7},
  rear:{x:-9,z:11,width:23,depth:21,height:18.8},
  buffer:{x:-23,z:29,width:11,depth:9,height:11.8}
};
// South-facing entry in the exposed end of the long hall, beside the office.
export const PRODUCTION_ENTRANCE={x:-55.6,z:-10.40,width:4.6};
// The covered crushing building follows the outer edge of the stockyard.
export const GYPSUM_RECEIVING_HALL={
  west:20,east:75,north:30.4,south:39.2,height:7.2,ridgeRise:.65,
  entryZ:GYPSUM_INTAKE[2],entryWidth:6.2,entryHeight:5.7,
  wing:{west:71,east:75,north:20.8,south:30.4,height:5.9}
};
// Truck scale in the new plant's yard, along its east fence beside the hall.
export const TRUCK_WEIGHBRIDGE={
  x:92.5,z:-21.4,width:3.4,length:14,deckHeight:.2,rampLength:3.5,flare:2.6,
  boothX:95.6,boothZ:-21.4,boothWidth:1.6,boothDepth:1.8,boothHeight:2.5
};
export const GYPSUM_STOCKYARD={
  west:17,east:75.5,north:-4.5,south:30.1,radius:3.2,
  // Centre the three rows within the paving, clear of the receiving-hall wall.
  columns:[24,34.5,45,55.5,66],rows:[2.7,12.8,22.9],
  heapRadius:5.2,heapHeight:3.1
};
// The loader works from the right-hand heap beside the bunker, within this yard.
export const LOADER_STOCK=[66,0,GYPSUM_STOCKYARD.rows[1]];
export const LOADER_PARK=[81,0,LOADER_STOCK[2]];
// Only the bucket's cutting edge enters the heap; the axle and lift arms stay clear.
export const LOADER_SCOOP=[77.3,0,LOADER_STOCK[2]];
export const LOADER_GATE=[GYPSUM_RECEIVING_HALL.east+8,0,GYPSUM_INTAKE[2]];
export const LOADER_QUEUE=[GYPSUM_INTAKE[0]+10.2,0,GYPSUM_INTAKE[2]];
export const LOADER_STOP=[GYPSUM_INTAKE[0]+4.31,0,GYPSUM_INTAKE[2]];
export const LOADER_TRANSFER_POINTS=[LOADER_PARK,[83.5,0,18],[84,0,25],[84,0,31],LOADER_GATE,[81.8,0,GYPSUM_INTAKE[2]],LOADER_QUEUE];
export const LOADER_PAVEMENT=[[73,89,10,39],[16,85,29.5,39]];
export function loaderRoadClearance(x,z){return Math.min(...LOADER_PAVEMENT.map(([west,east,north,south])=>Math.hypot(Math.max(west-x,x-east,0),Math.max(north-z,z-south,0))));}
export const INCOMING_HAUL_POINTS=[quarryPoint(),quarryPoint(16,0,0),quarryPoint(28,-1,-26),[330,9,-139],[292,5,-143],[260,1,-133],[250,0,-116],[220,0,-120],[RAW_STOP[0]+13,0,RAW_STOP[2]+16],[RAW_STOP[0]+1,0,RAW_STOP[2]+10],[RAW_STOP[0]+2,0,RAW_STOP[2]+3],[RAW_STOP[0]+2,0,RAW_STOP[2]],RAW_STOP];
// A broad turn on the open apron keeps the long rear body clear of the belts.
const haulReturnTurn=Array.from({length:17},(_,i)=>{
  const angle=i*Math.PI/16,radius=12;
  return [RAW_STOP[0]-radius*Math.sin(angle),0,RAW_STOP[2]+radius*(1-Math.cos(angle))];
});
export const RETURN_HAUL_POINTS=[...haulReturnTurn,[177,0,-108],[205,0,-110],[235,0,-108],[253,0,-102],[270,2,-78],[288,7,-52],[319,12,-47],quarryPoint(21,0,16),quarryPoint(4,0,17),quarryPoint(-5,0,12),quarryPoint(-7,0,5),quarryPoint(-6,0,0),quarryPoint()];
const curve=points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'catmullrom',.12);
export const INCOMING_HAUL=curve(INCOMING_HAUL_POINTS),RETURN_HAUL=curve(RETURN_HAUL_POINTS);
export function haulRoad(){const path=new T.CurvePath();path.add(INCOMING_HAUL);path.add(RETURN_HAUL);return path;}
export const inRawYard=(x,z,padding=0)=>x>RAW_YARD.west-padding&&x<RAW_YARD.east+padding&&z>RAW_YARD.north-padding&&z<RAW_YARD.south+padding;
