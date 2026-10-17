import {POND_APPROACH as ROAD,VISITOR_PARK as PARK,OLD_FRONT_COURT} from './siteLayout.js';
import {buildOldEntrance} from './oldEntrance.js';
import {createParkedCarBuilder} from './parkedCars.js';

// Broad visitor forecourt and the divided pond-side entrance in the aerials.
export function buildPondApproach(k,plants){
  const {box,cyl,rod,material,m}=k;
  const paving=material('#969487',0,.97),curb=material('#c5c4b7',0,.92),paint=material('#d8d7c8',0,.9),hedge=material('#536847',0,.95);
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

  const car=createParkedCarBuilder(k);
  let index=0;
  for(let z=-181;z>=-214;z-=3){
    car(-39,z,Math.PI,index++);
    for(const dz of [-1.45,1.45])box(5.5,.008,.065,[-39,.014,z+dz],paint);
    box(.17,.13,1.65,[-36.5,.075,z],curb);
  }
  for(let x=-86;x<=-47;x+=3){
    if(Math.abs(x-PARK.entryX)<8)continue;
    car(x,-171,Math.PI/2,index++);
    for(const dx of [-1.45,1.45])box(.065,.008,5.5,[x+dx,.014,-171],paint);
    box(1.65,.13,.17,[x,.075,-168.5],curb);
  }

  // Straight divided carriageway, with clear openings at every junction.
  for(const [a,b] of [[-237,-155],[-131,-100],[-82,-44]]){
    box(b-a,.15,1.05,[(a+b)/2,.025,ROAD.z],curb);
    box(b-a-.4,.06,.72,[(a+b)/2,.13,ROAD.z],m.grass);
    for(let x=a+2;x<b-1;x+=3.5){const shrub=k.sphere(.36,[x,.43,ROAD.z],hedge);shrub.scale.set(1,.8,.8);}
  }
  for(const x of [-228,-194,-160,-126,-108]){
    cyl(.065,7,[x,3.5,ROAD.z-7.6],curb,undefined,undefined,12);
    rod([x,6.8,ROAD.z-7.6],[x,7.1,ROAD.z-5.7],.045,m.steel);box(.32,.12,.85,[x,7.1,ROAD.z-5.6],m.light);
  }
  for(const [x,z] of [[-126,-214],[-126,-175],[-71,-215],[-35,-203]]){
    box(.65,.3,.65,[x,.15,z],curb);cyl(.08,9,[x,4.5,z],m.steel,undefined,undefined,12);
    for(const side of [-1,1]){rod([x,8.7,z],[x+side*1.3,9,z],.055,m.steel);box(.8,.12,.3,[x+side*1.3,9,z],m.light);}
  }
  buildOldEntrance(k);
  plants.row(-234,ROAD.z+10.2,-154,ROAD.z+10.2,4);
  plants.row(-131,ROAD.z+10.2,-87,ROAD.z+10.2,4);
  plants.row(-130,PARK.north-5,-35,PARK.north-5,4);
  plants.row(PARK.east+5,-216,PARK.east+5,-174,4);
  // One orchard faces the old factory's outside road, as in the aerial photo.
  // Bare ground remains visible between trees of different sizes and spacing.
  const orchard=OLD_FRONT_COURT.orchard;
  const earth=material('#aaa78c',0,1),rootSoil=material('#8b8d6c',0,1);
  box(orchard.east-orchard.west,.52,orchard.south-orchard.north,[(orchard.west+orchard.east)/2,-.29,(orchard.north+orchard.south)/2],earth);
  let row=0;
  for(let z=orchard.north+3.4;z<orchard.south-2.8;z+=4.8,row++){
    let col=0;
    for(let x=orchard.west+3.0;x<orchard.east-2.5;x+=4.6,col++){
      const phase=(col+1)*13.13+(row+1)*23.47;
      const xx=x+Math.sin(phase)*.85,zz=z+Math.cos(phase*1.27)*.85,size=.34+(Math.sin(phase*.71)+1)*.12;
      if(plants.plant(xx,zz,size))cyl(.60,.025,[xx,-.012,zz],rootSoil,k.scene,undefined,12).castShadow=false;
    }
  }
}
