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
export const GYPSUM_CORNER_SILO=[-10,0,31];
// The twin silos fit the current rear block; the old centre (-25.6, 30.2)
// left their lift and upper distribution pipe beyond its stepped west facade.
export const GYPSUM_STORAGE={x:-20.75,z:26};
const storageLift=[GYPSUM_STORAGE.x-4,11.5,GYPSUM_STORAGE.z-2.7];
const storageFeed=x=>[[x,11.5,GYPSUM_STORAGE.z],[x,10.13,GYPSUM_STORAGE.z]];
// The head clears the silo deck; material drops through its central inlet.
export const GYPSUM_LIFT=[[16,1.3,34.8],[-10,13.05,31]];
const liftDirection=new T.Vector3(...GYPSUM_LIFT[1]).sub(new T.Vector3(...GYPSUM_LIFT[0])).setY(0).normalize();
const gypsumDrop=new T.Vector3(...GYPSUM_LIFT[1]).addScaledVector(liftDirection,.35);
export const CALCITE_INTAKE=planPoint(197,623,.85);
// From the user's front/roof view: the railway-side third bay stays empty.
// Preparation comes from the attached south buildings; two straight ceiling
// lines and the compact board/dryer cell use only the other two roof bays.
export const EMPTY_PRODUCTION_BAY={west:-58,east:74,north:-39.5,south:-29.83};
export const BOARD_START=[-23,1.18,-22.8];
export const BOARD_CUT_X=-14;
export const BOARD_DRYER={x:0,z:BOARD_START[2],entryX:-9.8,exitX:6.4};
export const BOARD_END=[12.5,1.18,BOARD_START[2]];
export const BOARD_ROUTE=[BOARD_START,BOARD_END];
export const CEILING_LINES=[
  {id:'panel',number:'01',z:-14.2,start:2,laminate:11,cut:22,press:35,inspect:49,pack:61,end:67},
  {id:'panel-2',number:'02',z:-24,start:29,laminate:35,cut:42,press:49,inspect:57,pack:64,end:69.5},
].map(line=>({...line,route:[[line.start,1.18,line.z-2.6],...[line.start,line.laminate,line.cut,line.press,line.inspect,line.pack,line.end].map(x=>[x,1.18,line.z])]}));
export const CEILING_LINE_Z=CEILING_LINES[0].z;
export const PROCESS_AISLE_Z=-19;
export const BAGGING_POSITION=[-35,0,-16];
export const BAG_ROUTE=[[-36.3,1.19,-16],[-29.5,1.19,-16],[-29.5,1.19,-20],[-24,1.19,-20]];
export const DRYMIX_END=[-24,3.8,-20];
export const BOARD_PALLET_OUT=[BOARD_END[0],.27,BOARD_END[2]-4.2];
export const PALLET_ROBOT_BASE=[BOARD_END[0]+4.3,0,BOARD_END[2]-2.1];
export const BAG_PALLET_OUT=[-21.4,.27,-20];
export const PROCESS_LINES=[
  {id:'gypsum',zone:'CR',name:'Gips daşyny döwüji enjamlar toplumy',short:'Gips daşy',color:'#3158f5',stages:[S.infeed,S.crush,S.calcine],step:S.crush,
    points:[GYPSUM_INTAKE,[GYPSUM_INTAKE[0]-4.9,.85,GYPSUM_INTAKE[2]],[GYPSUM_CRUSHER[0],4.15,GYPSUM_CRUSHER[2]],[GYPSUM_CRUSHER[0],1.3,GYPSUM_CRUSHER[2]],[GYPSUM_CRUSHER[0]-3,1.3,GYPSUM_CRUSHER[2]],...GYPSUM_LIFT,[gypsumDrop.x,12.95,gypsumDrop.z],[gypsumDrop.x,10.9,gypsumDrop.z]],
    branches:[
      [[-10,1.3,31],[-14,1.3,31],[-14,1.3,storageLift[2]],[storageLift[0],1.3,storageLift[2]],storageLift,...storageFeed(GYPSUM_STORAGE.x-1.55)],
      [storageLift,[GYPSUM_STORAGE.x+2.45,11.5,storageLift[2]],...storageFeed(GYPSUM_STORAGE.x+2.45)],
    ],
    label:[44,9,32],position:[79,37,82],target:[35,3,34]},
  {id:'calcite',zone:'TY',name:'Kalsit önümçilik liniýasy',short:'Kalsit',color:'#e8c532',stages:[S.crush,S.calcine,S.mix],step:S.crush,
    points:[CALCITE_INTAKE,planPoint(357,623),[-45.45,4,29],[-45.45,4,25],...points([[357,535],[423,535],[423,399]],1.3)],
    label:[-52,6,18],position:[-102,41,62],target:[-45,3,19]},
  {id:'drymix',zone:'GR',name:'Gury gurluşyk garyndylaryň önümçilik liniýasy',short:'Gury garyndy',color:'#15cbd4',stages:[S.mix,S.form,S.pack],step:S.mix,
    points:[...points([[466,583],[455,583],[455,375],[424,375]],4.6),[-35,4.6,-16],DRYMIX_END],
    label:[-42,8,-23],position:[-80,31,-57],target:[-42,3,-22]},
  {id:'board',zone:'GK',name:'Gipsokarton önümçilik liniýasy',short:'Gipsokarton',color:'#d338d0',stages:[S.mix,S.form,S.pack],step:S.form,
    points:[...points([[454,600],[444,600],[444,383]],3.4),[BOARD_START[0],3.4,planPoint(376,383)[2]],...BOARD_ROUTE],
    label:[22,8,BOARD_START[2]],position:[50,65,-76],target:[7,2,-23]},
];
export const PROCESS_STATIONS=[
  {id:'CR',name:'Gips silolary',world:[GYPSUM_STORAGE.x,0,GYPSUM_STORAGE.z],height:11.3},
  {id:'TY',name:'Kalsit degirmeni',world:[-45.5,0,25],height:6.6},
  {id:'BS',name:'Gips taýýarlygy',world:[-29,0,8],height:6.3},
  {id:'GR',name:'Gury garyndy',world:[-44.1,0,-24.8],height:6.9},
  {id:'GK',name:'Gipsokarton',world:[BOARD_DRYER.x,0,BOARD_DRYER.z],height:6.8},
  {id:'GP',name:'Paletleýji',world:[BOARD_END[0],0,BOARD_END[2]],height:5.8},
];
export const localPoint=p=>[p[0]-8,p[1],p[2]+25];
export function routeCurve(points){const curve=new T.CurvePath();for(let i=1;i<points.length;i++)if(points[i].some((value,axis)=>value!==points[i-1][axis]))curve.add(new T.LineCurve3(new T.Vector3(...points[i-1]),new T.Vector3(...points[i])));return curve;}
export const STATION_VIEWS=Object.fromEntries(PROCESS_STATIONS.map(s=>[s.id,{position:[s.world[0]-14,12,s.world[2]+17],target:[s.world[0],3,s.world[2]]}]));
STATION_VIEWS.BS={position:[-61,31,46],target:[-29,12,5]};
STATION_VIEWS.GK={position:[BOARD_DRYER.x+15,15,BOARD_DRYER.z+17],target:[BOARD_DRYER.x,3,BOARD_DRYER.z]};
STATION_VIEWS.robot={position:[BOARD_END[0]+7,23,BOARD_END[2]-10],target:[BOARD_END[0],1.5,BOARD_END[2]-3]};
