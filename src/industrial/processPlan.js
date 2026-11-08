import * as T from 'three';
import {JOURNEY_STAGE as S} from '../journeyStages.js';

// Traced from the user's annotated plan, photo_2026-10-17_13-33-10.jpg.
// Heights and equipment spacing are illustrative; the image supplies the four
// line identities, their separate intakes and their plan-view connections.
export const planPoint=(x,z,y=1.3)=>[-58+(x-280)*132/810,y,-39.5+(z-183)*29/174];
const points=(list,y)=>list.map(([x,z])=>planPoint(x,z,y));
// The blue line enters the covered crushing hall at its right-hand end and
// runs west through the building before rising to the processing-block silo.
export const GYPSUM_INTAKE=[70,.85,34.8];
export const GYPSUM_CRUSHER=[60,0,34.8];
// October 26 markup: receiving hall (5) → outdoor silo (4) → transfer
// tower (3) → long process building (1). Tower and silo stand on the gravel pad.
export const GYPSUM_CORNER_SILO=[-3.6,0,32];
export const GYPSUM_SILO_TOWER={x:-4.5,z:26.3,width:3.8,depth:4.2,height:14.8};
export const GYPSUM_TRANSFER_HEIGHT=11.5;
// The twin silos fit the current rear block; the old centre (-25.6, 30.2)
// left their lift and upper distribution pipe beyond its stepped west facade.
export const GYPSUM_STORAGE={x:-20.75,z:26};
const storageJunction=[GYPSUM_STORAGE.x,GYPSUM_TRANSFER_HEIGHT,GYPSUM_SILO_TOWER.z];
const storageFeed=x=>[[x,11.5,GYPSUM_STORAGE.z],[x,10.13,GYPSUM_STORAGE.z]];
// The head clears the silo deck; material drops through its central inlet.
export const GYPSUM_LIFT=[[20,1.3,GYPSUM_CORNER_SILO[2]],[GYPSUM_CORNER_SILO[0],13.2,GYPSUM_CORNER_SILO[2]]];
export const GYPSUM_SILO_TRANSFER=[
  [GYPSUM_CORNER_SILO[0],1.3,GYPSUM_CORNER_SILO[2]],
  [GYPSUM_CORNER_SILO[0],1.3,GYPSUM_SILO_TOWER.z],
  [GYPSUM_SILO_TOWER.x,1.3,GYPSUM_SILO_TOWER.z],
  [GYPSUM_SILO_TOWER.x,GYPSUM_TRANSFER_HEIGHT,GYPSUM_SILO_TOWER.z],
  storageJunction,
];
const liftDirection=new T.Vector3(...GYPSUM_LIFT[1]).sub(new T.Vector3(...GYPSUM_LIFT[0])).setY(0).normalize();
const gypsumDrop=new T.Vector3(...GYPSUM_LIFT[1]).addScaledVector(liftDirection,.35);
export const CALCITE_INTAKE=planPoint(197,623,.85);
// The stockyard belt rises to the twin-roll receiver. The remaining material
// stays enclosed through the weigher, hammer mill, TY-001 and south annex.
export const CALCITE_FEED_END=[-49.5,2.85,34];
export const CALCITE_ROUTE=[
  CALCITE_INTAKE,CALCITE_FEED_END,[-44.4,1.3,34],[-39.5,3.5,34],
  [-45.5,4,25],[-45.5,.65,23.1],[-48.5,5.7,20],[-48.5,5.7,-7],[-50,3.1,-7],
  [-50,.5,-7],[-48,.55,-7],[-45.8,9.9,-7],[-43.5,2.25,-6],
  [-40.5,8,-6],[-40.5,8,-18],[-50.2,6.8,-18],
];
// The railway-side bay north of the dryer stays empty.
export const EMPTY_PRODUCTION_BAY={west:3,east:74,north:-39.5,south:-29.83};
// The bag palletizer stands at GP-001, between the process-building feed and
// the independent board finishing line.
export const BEUMER_LINE={west:-33,east:-23.5,z:-24};
// October 27 markup: the setting belt runs east along the south bay past the
// control room to the cutter; a wet transfer turns the boards into the middle
// bay and back west through the 31 m dryer. Its final packer is separate from
// the BEUMER bag palletizer at GP-001.
export const BOARD_LINE_Z=-13.8;
// IMG_6732: the setting belt runs a long, open stretch past the control-room
// glazing; the forming station stands well to the west.
export const BOARD_START=[-32.5,1.18,BOARD_LINE_Z];
export const BOARD_CUT_X=62;
export const BOARD_TRANSFER_X=66;
export const BOARD_DRYER_Z=-20.8;
// October 28 markup: shift the return, packer and wrapper 7 m toward the
// dryer (left in the reference view); their connected runs use this centre line.
export const BOARD_RETURN_X=-13.5;
export const BOARD_DRYER={x:26.5,z:BOARD_DRYER_Z,entryX:42,exitX:11,length:31,entryApron:6.2,exitApron:5,decks:5,deckPitch:.5,boardInterval:8};
export const BOARD_END=[BOARD_RETURN_X,1.18,-25.8];
export const BOARD_ROUTE=[
  BOARD_START,[BOARD_TRANSFER_X,1.18,BOARD_LINE_Z],[BOARD_TRANSFER_X,1.18,BOARD_DRYER_Z],
  [BOARD_RETURN_X,1.18,BOARD_DRYER_Z],BOARD_END,
];
export const PROCESS_AISLE_Z=-16.8;
// Filled bags leave through the level-six front service deck of the process
// tower. A short level transfer turns the bags onto the straight GP-001 feed.
export const BAG_FACTORY_OUTLET=[-30,6.55,-8];
export const BAG_TRANSFER=[BEUMER_LINE.west+1.5,6.55,BAG_FACTORY_OUTLET[2]];
// Receive only once the whole bag has passed through the stacker's front inlet.
export const BAG_ROUTE=[BAG_FACTORY_OUTLET,BAG_TRANSFER,[BAG_TRANSFER[0],3.45,BEUMER_LINE.z]];
export const PROCESS_LINES=[
  {id:'gypsum',zone:'CR',name:'Gips daşyny döwüji enjamlar toplumy',short:'Gips daşy',color:'#3158f5',stages:[S.infeed,S.crush,S.calcine],step:S.crush,
    points:[GYPSUM_INTAKE,[GYPSUM_INTAKE[0]-4.9,.85,GYPSUM_INTAKE[2]],[GYPSUM_CRUSHER[0],4.15,GYPSUM_CRUSHER[2]],[GYPSUM_CRUSHER[0],1.3,GYPSUM_CRUSHER[2]],[GYPSUM_CRUSHER[0]-3,1.3,GYPSUM_CRUSHER[2]],...GYPSUM_LIFT,[gypsumDrop.x,12.95,gypsumDrop.z],[gypsumDrop.x,10.9,gypsumDrop.z]],
    branches:[
      [...GYPSUM_SILO_TRANSFER,...storageFeed(GYPSUM_STORAGE.x-1.55)],
      [storageJunction,...storageFeed(GYPSUM_STORAGE.x+2.45)],
    ],
    label:[44,9,32],position:[79,37,82],target:[35,3,34]},
  {id:'calcite',zone:'TY',name:'Kalsit önümçilik liniýasy',short:'Kalsit',color:'#e8c532',stages:[S.crush,S.calcine,S.mix],step:S.crush,
    points:CALCITE_ROUTE,
    label:[-52,6,18],position:[-102,41,62],target:[-45,3,19]},
  {id:'drymix',zone:'GR',name:'Gury gurluşyk garyndylaryň önümçilik liniýasy',short:'Gury garyndy',color:'#15cbd4',stages:[S.mix,S.form,S.pack],step:S.mix,
    points:[...points([[466,583],[455,583],[455,375],[424,375]],4.6),[BAG_ROUTE[0][0],4.6,-7.5],...BAG_ROUTE],
    label:[-42,8,-23],position:[-80,31,-57],target:[-42,3,-22]},
  {id:'board',zone:'GK',name:'Gipsokarton önümçilik liniýasy',short:'Gipsokarton',color:'#d338d0',stages:[S.mix,S.form,S.pack],step:S.form,
    points:[...points([[454,600],[444,600],[444,383]],3.4),[BOARD_START[0],3.4,planPoint(376,383)[2]],...BOARD_ROUTE],
    label:[22,8,BOARD_START[2]],position:[50,65,-76],target:[7,2,-23]},
];
export const PROCESS_STATIONS=[
  {id:'CR',name:'Gips silolary',world:[GYPSUM_STORAGE.x,0,GYPSUM_STORAGE.z],height:11.3},
  {id:'TY',name:'Kalsit degirmeni',world:[-45.5,0,25],height:6.6},
  {id:'BS',name:'Gips taýýarlygy',world:[-29,0,8],height:6.3},
  {id:'GK',name:'Gipsokarton',world:[BOARD_DRYER.x,0,BOARD_DRYER.z],height:6.8},
  {id:'GP',name:'Paletleýji',world:[BEUMER_LINE.west+1.5,0,BEUMER_LINE.z],height:5.8},
];
export const localPoint=p=>[p[0]-8,p[1],p[2]+25];
export function routeCurve(points){const curve=new T.CurvePath();for(let i=1;i<points.length;i++)if(points[i].some((value,axis)=>value!==points[i-1][axis]))curve.add(new T.LineCurve3(new T.Vector3(...points[i-1]),new T.Vector3(...points[i])));return curve;}
// South-bay stations are viewed from the hall, not through the process blocks.
const southBay=s=>s.world[2]>-20.17&&s.world[2]<-10.5;
export const STATION_VIEWS=Object.fromEntries(PROCESS_STATIONS.map(s=>[s.id,{position:[s.world[0]-14,12,s.world[2]+(southBay(s)?-17:17)],target:[s.world[0],3,s.world[2]]}]));
STATION_VIEWS.BS={position:[-61,31,46],target:[-29,12,5]};
STATION_VIEWS.GK={position:[BOARD_DRYER.x+15,15,BOARD_DRYER.z+17],target:[BOARD_DRYER.x,3,BOARD_DRYER.z]};
