import * as T from 'three';
import {GYPSUM_INTAKE} from './processPlan.js';

// Photo-based presentation coordinates, not a surveyed construction plan.
export const OUTER_RAIL_Z=46;
export function outerRailPath(){const path=new T.CurvePath();path.add(new T.LineCurve3(new T.Vector3(-700,0,46),new T.Vector3(100,0,46)));path.add(new T.CatmullRomCurve3([[100,0,46],[125,0,46],[175,1,80],[235,3,120],[330,6,142],[500,10,166]].map(p=>new T.Vector3(...p)),false,'catmullrom',.12));return path;}
export const POND={x:-106,z:-107,width:42,depth:52};
export const POND_APPROACH={west:-240,east:-38,z:-151,width:10.4};
export const OLD_ENTRANCE={outerX:-94,innerX:-28.5,z:POND_APPROACH.z,innerZ:-124.5};
export const NEW_FACTORY_ENTRANCE={x:-137,z:-2,left:-16.8,right:13};
export function oldEntranceClearance(x,z){
  const distance=(cx,cz,halfX,halfZ)=>Math.hypot(Math.max(Math.abs(x-cx)-halfX,0),Math.max(Math.abs(z-cz)-halfZ,0));
  return Math.min(distance(OLD_ENTRANCE.outerX,OLD_ENTRANCE.z,4.5,11.5),distance(OLD_ENTRANCE.innerX,OLD_ENTRANCE.innerZ,4.5,8.2));
}
export const VISITOR_PARK={west:-134,east:-31,north:-222,south:-163,entryX:-78,entryWidth:10};
// Covered parking inside the front fence, opening onto the concrete court.
export const OLD_FRONT_PARK={west:-27.4,east:-19.6,north:-101.3,south:-86.7,canopyX:-23.8,z:-94,canopyWidth:13.2,canopyDepth:5.8};
export const OLD_LEFT_CAMPUS={
  warehouse:{x:31,z:-138,width:76,depth:12,height:5.8},
  frontRoadX:-38,sideRoadZ:-154,sideRoadWidth:4.6,
  fenceX:-29,sideFenceZ:-150,
  forecourt:{west:-29,east:4,north:-150,south:-117.6},
  parking:{west:-25.8,east:-7.4,north:-148.2,south:-141.8},
  median:{west:4,east:65,north:-125.9,south:-120.5}
};
export const OLD_FRONT_COURT={
  west:OLD_LEFT_CAMPUS.fenceX,east:1,north:-118,south:-73.4,
  entryZ:-79.6,entryWidth:9.4,
  drive:{west:OLD_LEFT_CAMPUS.fenceX,east:83,north:-82.5,south:-73.5},
  orchard:{west:-82,east:-44,north:-141,south:-69}
};
export const OLD_SIDE_LOADING={
  x:44,wallZ:-87,width:15,depth:7.2,clearHeight:5,
  interiorWidth:12.4,interiorDepth:13,
  apron:{west:31,east:61,north:-87.25,south:-73.5}
};
export const OLD_PAVILION={
  hall:{x:19,z:-67,width:22,depth:10,height:3.5},
  annex:{x:5.8,z:-67,width:4.7,depth:10.4,height:3.15},
  garden:{west:OLD_LEFT_CAMPUS.fenceX,east:31,north:-73.4,south:-55.8},
  serviceX:36
};
export function pondAccessClearance(x,z){
  const road=POND_APPROACH,park=VISITOR_PARK;
  const distance=(west,east,north,south)=>Math.hypot(Math.max(west-x,x-east,0),Math.max(north-z,z-south,0));
  return Math.min(distance(road.west,road.east,road.z-road.width/2,road.z+road.width/2),distance(park.west,park.east,park.north,park.south),distance(park.entryX-park.entryWidth/2,park.entryX+park.entryWidth/2,park.south,road.z));
}
export const RAW_YARD={west:101,east:238,north:-165,south:-65};
export const OLD_REAR_BOUNDARY={
  x:RAW_YARD.west,north:RAW_YARD.north,south:RAW_YARD.south,
  height:2.2,gateZ:-108,gateWidth:12,
  building:{x:91.5,z:-146,width:8,depth:6,height:3.25}
};
// Both old-plant silos belong outside the partition, in the raw-material yard.
// The northern service pad leaves the gate and the storage stacks clear.
export const OLD_RAW_SILOS={x:RAW_YARD.west+11,z:-147,width:16,depth:26};
export const RAW_STOP=[183,0,-110];
export const RAW_STOCK=[188.5,0,-110];
// Tall white auxiliary tower directly beside the exposed corner silo.
export const GYPSUM_SILO_TOWER={x:-13.6,z:25.3,width:5.2,depth:5.6,height:19.8};
// Stepped processing volumes read from the architectural view of the new plant.
export const PROCESS_BUILDINGS={
  main:{x:-29,z:5,width:17,depth:29,height:27},
  leftBase:{x:-46.5,z:-5,width:13,depth:13,height:3.2},
  leftCore:{x:-48,z:-6,width:7.4,depth:8.6,height:13.2},
  leftLink:{x:-38.75,z:-5,width:2.5,depth:8,height:4.2},
  rightCore:{x:-38.5,z:25,width:7.5,depth:9.5,height:20.5},
  rightLink:{x:-32.6,z:21.7,width:9.8,depth:4.4,height:6.2},
  rightWing:{x:-36.5,z:33,width:16,depth:12.6,height:7.2},
  outerWing:{x:-57.25,z:37.8,width:25.5,depth:3,height:7.2},
  rear:{x:-8,z:11,width:25,depth:21,height:18.8},
  buffer:{x:-23,z:29,width:11,depth:9,height:11.8}
};
// The covered crushing building follows the outer edge of the stockyard.
export const GYPSUM_RECEIVING_HALL={
  west:20,east:75,north:30.4,south:39.2,height:7.2,ridgeRise:.65,
  entryZ:GYPSUM_INTAKE[2],entryWidth:6.2,entryHeight:5.7,
  wing:{west:71,east:75,north:20.8,south:30.4,height:5.9}
};
export const GYPSUM_STOCKYARD={
  west:17,east:75.5,north:-4.5,south:30.1,radius:3.2,
  columns:[24,34.5,45,55.5,66],rows:[3,14.5,26],
  heapRadius:4.5,heapHeight:2.65
};
// The loader works from the right-hand heap beside the bunker, within this yard.
export const LOADER_STOCK=[66,0,14.5];
export const LOADER_PARK=[81,0,14.5];
export const LOADER_SCOOP=[73.6,0,14.5];
export const LOADER_GATE=[GYPSUM_RECEIVING_HALL.east+8,0,GYPSUM_INTAKE[2]];
export const LOADER_QUEUE=[GYPSUM_INTAKE[0]+10.2,0,GYPSUM_INTAKE[2]];
export const LOADER_STOP=[GYPSUM_INTAKE[0]+4.31,0,GYPSUM_INTAKE[2]];
export const LOADER_TRANSFER_POINTS=[LOADER_PARK,[83.5,0,18],[84,0,25],[84,0,31],LOADER_GATE,[81.8,0,GYPSUM_INTAKE[2]],LOADER_QUEUE];
export const LOADER_PAVEMENT=[[73,89,10,39],[16,85,29.5,39]];
export function loaderRoadClearance(x,z){return Math.min(...LOADER_PAVEMENT.map(([west,east,north,south])=>Math.hypot(Math.max(west-x,x-east,0),Math.max(north-z,z-south,0))));}
export const INCOMING_HAUL_POINTS=[[226,5,39],[242,5,39],[254,4,13],[254,2,-45],[250,0,-95],[232,0,-110],[210,0,-110],RAW_STOP];
export const RETURN_HAUL_POINTS=[RAW_STOP,[164,0,-110],[155,0,-126],[169,0,-138],[207,0,-138],[225,0,-128],[235,0,-118],[253,0,-102],[266,2,-50],[268,5,16],[247,5,55],[218,5,56],[211,5,43],[215,5,39],[226,5,39]];
const curve=points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'catmullrom',.12);
export const INCOMING_HAUL=curve(INCOMING_HAUL_POINTS),RETURN_HAUL=curve(RETURN_HAUL_POINTS);
export function haulRoad(){const path=new T.CurvePath();path.add(INCOMING_HAUL);path.add(RETURN_HAUL);return path;}
export const inRawYard=(x,z,padding=0)=>x>RAW_YARD.west-padding&&x<RAW_YARD.east+padding&&z>RAW_YARD.north-padding&&z<RAW_YARD.south+padding;
