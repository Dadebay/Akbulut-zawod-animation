import {OLD_WORK_OFFICE as O,OLD_PAVILION as P,OLD_RAIL_DORMITORY as D,OLD_REAR_BOUNDARY,OLD_WAREHOUSE_DOORS,PROCESS_BUILDINGS as L,PROCESS_SERVICE_DOOR_WIDTHS,GYPSUM_SILO_TOWER as S,GYPSUM_RECEIVING_HALL as R,TRUCK_WEIGHBRIDGE as W} from './siteLayout.js';
import {REAR_SERVICE_YARD} from './rearServiceYard.js';
import {NEW_ADMINISTRATION as A} from './siteLayout.js';

// Coordinates come from the existing construction modules. Missing room
// divisions and personnel doors are illustrative, like the existing interiors.
const door=(side,at=0,width=1.4,height=2.4,extra={})=>({side,at,width,height,...extra});
export const WALK_BUILDINGS=[
  {id:'new-production',label:'Täze zawod · Önümçilik',campus:'new',x:8,z:-25,width:132,depth:29,height:8,doors:[door('south',-63.6,3.88,2.7,{bottom:.49,type:'double'}),door('east',0,2),door('north',3.5,3,3.8,{type:'roller',open:true}),...[8,15,22,29,36,43].map(x=>door('north',x-8,4.45,3.95,{bottom:.7,type:'roller'})),door('west',0,1.6,2.4,{bottom:A.ground,type:'double'})]},
  {id:'new-administration',label:'Edara binasy · Iş ýerleri',campus:'new',x:(A.x-A.width/2+A.productionWallX)/2,z:A.z,width:A.productionWallX-(A.x-A.width/2),depth:A.depth,height:A.height,doors:[door('west',0,2.4,2.4,{bottom:A.ground,type:'double'}),door('east',0,1.6,2.4,{bottom:A.ground,type:'double'})]},
  {id:'old-production',label:'Köne zawod · Önümçilik',campus:'old',x:31,z:-102,width:76,depth:30,height:6.2,doors:[door('west',-10,1.05),door('west',-5.4,1.05),door('south',13,12.4,5,{type:'opening'})]},
  {id:'old-warehouse',label:'Köne zawod · Ammar',campus:'old',x:31,z:-138,width:76,depth:12,height:5.8,doors:[door('west',0,1.5),...OLD_WAREHOUSE_DOORS.map(d=>door('south',d.x-31,d.width,d.height,{bottom:d.bottom,type:'roller'}))]},
  {id:'old-raised-hall',label:'Köne zawod · Tehniki bölüm',campus:'old',x:54,z:-106,width:16,depth:12,height:10.8,doors:[door('south',0,2)],joined:true},
  {id:'old-office',label:'Köne zawod · Iş ofisi',campus:'old',...O,doors:[door('west',0,2.2,2.4,{bottom:.32,type:'double'})]},
  {id:'old-dining',label:'Naharhana',campus:'old',...P.hall,doors:[door('north',3,1.2,2.5,{bottom:.14})]},
  {id:'old-solar-office',label:'Bagdaky ofis',campus:'old',...P.annex,doors:[door('west',0,1.4,2.45,{bottom:.14})]},
  {id:'old-dormitory',label:'Ýatakhana · 4 otag',campus:'old',...D,doors:[door('north',0,1.5,2.4,{bottom:.08})]},
  {id:'old-rear-service',label:'Köne zawod · Hyzmat binasy',campus:'old',...OLD_REAR_BOUNDARY.building,doors:[door('south',0,1.4,2.4)]},
  ...['leftBase','leftCore','leftLink','rightCore','rightWing','outerWing','outerService'].map((id,i)=>({id:`new-${id}`,label:['Tehniki hyzmat','Önki proses diňi','Proses geçelgesi','Kalsit diňi','Kalsit bölümi','Kalsit döwüji binasy','Kömekçi otag'][i],campus:'new',...L[id],...(id==='leftCore'||id==='leftLink'?{bottom:L.leftBase.height,elevated:true}:{}),doors:id==='leftCore'?[door('east',-3,1.4,2.4,{bottom:3.24})]:id==='leftLink'?[door('west',0,1.4,2.4,{bottom:3.24})]:id==='leftBase'?[.16,.44,.84].map((f,j)=>door('south',L[id].width*(f-.5),PROCESS_SERVICE_DOOR_WIDTHS[j],2.65,{bottom:.14,type:'roller'})):id==='outerWing'?[door('west',0,1.68,3.2,{bottom:.15})]:[door('east',0,Math.min(1.4,L[id].depth-.4),2.4,{bottom:.06})],joined:['leftCore','leftLink'].includes(id)})),
  ...REAR_SERVICE_YARD.buildings.map((b,i)=>({...b,id:b.name,label:`Proses / hyzmat · ${i+1}`,campus:'new',doors:b.name==='rear-high-shaft'?[door('north',0,1.4)]:[door('east',b.name==='rear-south-block'?7.5:b.name==='process-front-roof-block'?-4:b.name==='rear-hall-return'?1.6:b.name==='process-high-roof-block'?.5:0,1.4),door('west',b.name==='process-front-roof-block'?-4:['rear-hall-link','process-high-roof-block'].includes(b.name)?.5:0,1.4),...(b.name==='rear-hall-link'?[door('north',0,1.4),door('south',0,1.4)]:[])]})),
  {id:'new-silo-tower',label:'Silo hyzmat binasy',campus:'new',...S,doors:[door('west',0,1.4)]},
  {id:'new-receiving',label:'Gips kabul ediş',campus:'new',x:(R.west+R.east)/2,z:(R.north+R.south)/2,width:R.east-R.west,depth:R.south-R.north,height:R.height,doors:[door('east',R.entryZ-(R.north+R.south)/2,R.entryWidth,R.entryHeight,{type:'roller',open:true}),...[27,46].map(x=>door('north',x-(R.west+R.east)/2,1.08,2.25))]},
  {id:'new-receiving-wing',label:'Kabul ediş · hyzmat',campus:'new',x:(R.wing.west+R.wing.east)/2,z:(R.wing.north+R.wing.south)/2,width:R.wing.east-R.wing.west,depth:R.wing.south-R.wing.north,height:R.wing.height,doors:[door('east',-3,.95,2.2)]},
  {id:'new-weighbridge',label:'Awtoulag terezisi',campus:'new',x:W.boothX,z:W.boothZ,width:W.boothWidth,depth:W.boothDepth,height:W.boothHeight,doors:[door('north',0,.9,2.1)]},
  {id:'old-inner-security',label:'Köne zawod · Gözegçilik',campus:'old',x:-29,z:-124.5,width:3,depth:2.55,height:2.65,bottom:.19,doors:[door('east',-.48,.94,2.1,{bottom:.27})]},
  {id:'old-outer-security',label:'Köne zawod · Daşky giriş',campus:'old',x:-94.35,z:-124.5,width:3.45,depth:2.8,height:2.9,bottom:.19,doors:[door('east',-.48,.94,2.1,{bottom:.27})]},
  {id:'new-security',label:'Täze zawod · Gözegçilik',campus:'new',x:-137.29,z:-9.98,width:3.2,depth:7.56,height:5.5,bottom:.13,doors:[door('east',2.66,1.12,2.2,{bottom:.13})]},
  {id:'new-yard-cabin',label:'Hyzmat meýdançasy · Otag',campus:'new',...REAR_SERVICE_YARD.cabin,doors:[door('south',0,1.2,2.1)]},
];

export const WALK_STARTS=[
  {id:'new',label:'Täze zawod · Giriş',position:[-131,.02,-2],yaw:-Math.PI/2},
  {id:'old',label:'Köne zawod · Giriş',position:[-22,.02,-124.5],yaw:-Math.PI/2},
  {id:'production',label:'Täze zawod · Önümçilik gapysy',position:[-55.6,.02,-6.8],yaw:0},
  {id:'services',label:'Täze zawod · Hyzmat otaglary',position:[-6,.02,-4.5],yaw:Math.PI/2},
  {id:'office',label:'Köne zawod · Ofis',position:[-17.2,.02,-96.2],yaw:-Math.PI/2},
  {id:'administration',label:'Edara binasy · Iş ýerleri',position:[-61.75,A.ground,-25],yaw:Math.PI/2},
];

export function portalPose(b,d){
  const side=d.side,x=b.x+(side==='east'?b.width/2:side==='west'?-b.width/2:d.at),z=b.z+(side==='south'?b.depth/2:side==='north'?-b.depth/2:d.at);
  return {x,z,y:d.bottom??Math.max(.06,b.bottom||0),yaw:side==='south'?0:side==='north'?Math.PI:side==='east'?Math.PI/2:-Math.PI/2};
}
