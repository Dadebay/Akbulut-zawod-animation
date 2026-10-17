import * as T from 'three';
import {JOURNEY_STAGE as S} from '../journey.js';

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
export const GYPSUM_LIFT=[[16,1.3,34.8],[-10,11.95,31]];
export const CALCITE_INTAKE=planPoint(197,623,.85);
export const BOARD_START=planPoint(376,346,1.18);
export const BOARD_END=planPoint(607,246,1.18);
export const DRYMIX_END=planPoint(365,271,3.8);
export const BOARD_ROUTE=points([[376,346],[1004,346],[1004,327],[528,327],[528,246],[607,246]],1.18);
export const BAG_ROUTE=[[-44.3,1.19,-32.5],[-37.5,1.19,-32.5],[-37.5,1.19,-36],[-32,1.19,-36]];
export const BOARD_PALLET_OUT=[BOARD_END[0],.27,-33.2];
export const BAG_PALLET_OUT=[-29.4,.27,-36];
export const PROCESS_LINES=[
  {id:'gypsum',zone:'CR',name:'Gips daşyny döwüji enjamlar toplumy',short:'Gips daşy',color:'#3158f5',stages:[S.infeed,S.crush,S.calcine],step:S.crush,
    points:[GYPSUM_INTAKE,[GYPSUM_INTAKE[0]-4.9,.85,GYPSUM_INTAKE[2]],[GYPSUM_CRUSHER[0],4.15,GYPSUM_CRUSHER[2]],[GYPSUM_CRUSHER[0],1.3,GYPSUM_CRUSHER[2]],[GYPSUM_CRUSHER[0]-3,1.3,GYPSUM_CRUSHER[2]],...GYPSUM_LIFT,[-10,10.9,31]],
    branches:[
      [[-10,1.3,31],[-14,1.3,31],[-14,1.3,27.5],[-29.6,1.3,27.5],[-29.6,9.8,27.5],[-27.6,9.8,30.2],[-27.6,8.2,30.2]],
      [[-29.6,9.8,27.5],[-23.6,9.8,27.5],[-23.6,9.8,30.2],[-23.6,8.2,30.2]],
    ],
    label:[44,9,32],position:[79,37,82],target:[35,3,34]},
  {id:'calcite',zone:'TY',name:'Kalsit önümçilik liniýasy',short:'Kalsit',color:'#e8c532',stages:[S.crush,S.calcine,S.mix],step:S.crush,
    points:[CALCITE_INTAKE,planPoint(357,623),[-45.45,4,29],[-45.45,4,25],...points([[357,535],[423,535],[423,399]],1.3)],
    label:[-52,6,18],position:[-102,41,62],target:[-45,3,19]},
  {id:'drymix',zone:'GR',name:'Gury gurluşyk garyndylaryň önümçilik liniýasy',short:'Gury garyndy',color:'#15cbd4',stages:[S.mix,S.form,S.pack],step:S.mix,
    points:[...points([[466,583],[455,583],[455,375],[424,375],[424,271]],4.6),DRYMIX_END],
    label:[-44,8,-30],position:[-80,31,-57],target:[-42,3,-25]},
  {id:'board',zone:'GK',name:'Gipsokarton önümçilik liniýasy',short:'Gipsokarton',color:'#d338d0',stages:[S.mix,S.form,S.pack],step:S.form,
    points:[...points([[454,600],[444,600],[444,383],[376,383]],3.4),...BOARD_ROUTE],
    label:[22,8,-23],position:[50,65,-76],target:[7,2,-19]},
];
export const PROCESS_STATIONS=[
  {id:'CR',name:'Gips silolary',world:[-25.6,0,30.2],height:11.3},
  {id:'TY',name:'Kalsit degirmeni',world:[-45.5,0,25],height:6.6},
  {id:'BS',name:'Gips taýýarlygy',world:[-29,0,8],height:6.3},
  {id:'GR',name:'Gury garyndy',world:[-44.1,0,-24.8],height:6.9},
  {id:'GK',name:'Gipsokarton',world:[28,0,-12.33],height:6.8},
  {id:'GP',name:'Paletleýji',world:[-4.7,0,-29],height:5.8},
];
export const localPoint=p=>[p[0]-8,p[1],p[2]+25];
export function routeCurve(points){const curve=new T.CurvePath();for(let i=1;i<points.length;i++)if(points[i].some((value,axis)=>value!==points[i-1][axis]))curve.add(new T.LineCurve3(new T.Vector3(...points[i-1]),new T.Vector3(...points[i])));return curve;}
export const STATION_VIEWS=Object.fromEntries(PROCESS_STATIONS.map(s=>[s.id,{position:[s.world[0]-14,12,s.world[2]+17],target:[s.world[0],3,s.world[2]]}]));
STATION_VIEWS.GK={position:[43,15,2],target:[28,3,-12.33]};
STATION_VIEWS.robot={position:[13,10,-20],target:[1.5,2,-29]};
