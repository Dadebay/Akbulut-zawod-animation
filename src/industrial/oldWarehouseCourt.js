import * as T from 'three';
import {OLD_LEFT_CAMPUS as L,OLD_ENTRANCE,OLD_ENTRANCE_YAW} from './siteLayout.js';
import {createParkedCarBuilder} from './parkedCars.js';

// Warehouse-side court from the user's close aerial: sheltered cars on the
// left, an open concrete apron, planted boundary and a long central garden.
export function buildOldWarehouseCourt(k,plants){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const concrete=material('#bbbcb0',0,.96),asphalt=m.road,joint=material('#4b5155',0,.94);
  const white=material('#e0e3da',.08,.73),metal=material('#b8c2bb',.52,.44);
  const roofMat=material('#52685d',.24,.64),roofRib=material('#809084',.35,.54);
  const lawn=m.grass,soil=material('#77784e',0,1),paint=material('#d6d6c8',0,.93);
  const court=L.forecourt,park=L.parking;
  box(court.east-court.west,.68,court.south-court.north,[(court.east+court.west)/2,-.36,(court.south+court.north)/2],asphalt);
  // Keep the checkpoint's approach continuous with the concrete court.
  const entranceApron=box(10,.035,9.0,[L.fenceX-3.3,-.041,OLD_ENTRANCE.innerZ],asphalt);
  entranceApron.castShadow=false;

  const cx=(park.west+park.east)/2,cz=(park.north+park.south)/2;
  const width=park.east-park.west,depth=park.south-park.north;
  box(width+.4,.12,depth+.4,[cx,-.05,cz],concrete);
  const shelter=group([cx,0,cz]);shelter.name='warehouse-front-car-shelter';
  const roof=group([0,3.36,0],shelter);roof.rotation.x=.07;
  box(width+.3,.075,depth+.2,[0,0,0],roofMat,roof);
  for(let x=-width/2;x<=width/2;x+=.26)box(.018,.025,depth+.2,[x,.055,0],roofRib,roof);
  for(const z of [-depth/2,depth/2])box(width+.40,.14,.10,[0,-.03,z],metal,roof);
  for(const x of [-width/2,width/2])box(.10,.14,depth+.30,[x,-.03,0],metal,roof);
  // Rear columns and roof stays leave the parking bays open towards the apron.
  const bays=5,pitch=width/bays;
  for(let i=0;i<=bays;i++){
    const x=-width/2+i*pitch;
    box(.40,.17,.40,[x,.085,-depth/2+.23],concrete,shelter);
    box(.12,4.55,.12,[x,2.36,-depth/2+.23],white,shelter);
    rod([x,4.55,-depth/2+.23],[x,3.15,depth/2-.12],.034,white,shelter);
    const rafter=box(.095,.16,depth,[x,-.13,0],metal,roof);
    rafter.castShadow=true;
    box(.07,.008,5.4,[x,.018,.10],paint,shelter);
  }
  for(let i=0;i<bays;i++){
    const x=-width/2+pitch*(i+.5);
    box(1.65,.10,.15,[x,.065,-1.55],concrete,shelter);
  }
  const car=createParkedCarBuilder(k);
  for(const [bay,index] of [[0,1],[1,7],[2,5],[4,1]])
    car(park.west+pitch*(bay+.5),cz+.10,Math.PI/2,index);
  // Gutter and downpipe at the low end of the cantilevered roof.
  box(width+.4,.10,.13,[0,3.13,depth/2+.03],metal,shelter);
  cyl(.055,3.1,[-width/2,1.55,depth/2+.04],metal,shelter,undefined,12);

  function roundedBed(w,d,x,z,radius=1){
    function shape(width,depth,r){
      const s=new T.Shape(),a=-width/2,b=width/2,c=-depth/2,e=depth/2;
      s.moveTo(a+r,c);s.lineTo(b-r,c);s.quadraticCurveTo(b,c,b,c+r);
      s.lineTo(b,e-r);s.quadraticCurveTo(b,e,b-r,e);
      s.lineTo(a+r,e);s.quadraticCurveTo(a,e,a,e-r);
      s.lineTo(a,c+r);s.quadraticCurveTo(a,c,a+r,c);s.closePath();return s;
    }
    const curb=new T.ExtrudeGeometry(shape(w,d,radius),{depth:.23,bevelEnabled:false,curveSegments:5});curb.rotateX(-Math.PI/2);
    mesh(curb,concrete,[x,-.08,z]);
    const grass=new T.ExtrudeGeometry(shape(w-.27,d-.27,Math.max(.15,radius-.14)),{depth:.20,bevelEnabled:false,curveSegments:5});grass.rotateX(-Math.PI/2);
    mesh(grass,lawn,[x,-.035,z]);
    box(w-.3,.58,d-.3,[x,-.39,z],concrete);
  }
  // Continue the outside lawn from the road to the fence and the gate paving.
  // Its former rounded curb sat inside the planting and left bare margins.
  const stripWest=L.frontRoadX+3.5,stripEast=L.fenceX;
  const stripNorth=L.sideFenceZ,stripSouth=OLD_ENTRANCE.innerZ-6.2;
  const stripMidX=(stripWest+stripEast)/2,stripMidZ=(stripNorth+stripSouth)/2;
  const outsideLawn=box(stripEast-stripWest,.15,stripSouth-stripNorth,
    [stripMidX,-.04,stripMidZ],lawn);
  outsideLawn.castShadow=false;
  for(const x of [stripWest,stripEast])
    box(.18,.16,stripSouth-stripNorth,[x,.06,stripMidZ],white).castShadow=false;
  for(const z of [stripNorth,stripSouth])
    box(stripEast-stripWest,.16,.18,[stripMidX,.06,z],white).castShadow=false;
  // The smaller bed remains on the other side of the fence.
  roundedBed(2.4,17.1,-27.55,-141.1,.65);
  for(let i=0;i<5;i++){
    const z=-147.5+i*3.1;
    plants.plant(-31.55+(i%2?.18:-.12),z,.39+(i%3)*.045);
    plants.plant(-27.6,z+.35,.26+(i%2)*.055);
    plants.plant(-30.3,z+1.35,.28,{plantedBed:true});
  }

  const island=L.median,ix=(island.west+island.east)/2,iz=(island.north+island.south)/2;
  roundedBed(island.east-island.west,island.south-island.north,ix,iz,2.15);
  for(let i=0;i<14;i++){
    const x=island.west+3.5+i*3.85;
    for(const side of [-1,1]){
      const z=iz+side*(1.15+(i%3)*.08),size=.32+((i+(side>0?1:0))%4)*.04;
      plants.plant(x+(side>0?.45:0),z,size);
      const root=cyl(.40,.025,[x,.18,z],soil,k.scene,undefined,12);root.castShadow=false;
    }
  }
  // White metal boundary, including the return beside the narrow outside lane.
  function fence(a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const g=group([(a[0]+b[0])/2,0,(a[1]+b[1])/2]);g.rotation.y=-Math.atan2(dz,dx);
    box(length,.30,.22,[0,.15,0],white,g);
    const count=Math.ceil(length/3.1);
    for(let i=0;i<=count;i++){
      const x=-length/2+length*i/count;
      box(.25,1.78,.28,[x,.89,0],white,g);box(.36,.12,.39,[x,1.82,0],white,g);
    }
    for(const y of [.45,1.52])box(length,.055,.055,[0,y,0],metal,g);
    for(let x=-length/2+.15;x<length/2;x+=.20)box(.025,1.18,.025,[x,1.02,0],metal,g);
  }
  const gateEnd=side=>[OLD_ENTRANCE.innerX+Math.sin(OLD_ENTRANCE_YAW)*side*7.75,OLD_ENTRANCE.innerZ+Math.cos(OLD_ENTRANCE_YAW)*side*7.75];
  const northEnd=gateEnd(-1),southEnd=gateEnd(1);
  fence([L.fenceX,L.sideFenceZ],[L.fenceX,northEnd[1]]);
  fence([L.fenceX,northEnd[1]],northEnd);
  fence([L.fenceX,L.sideFenceZ],[100,L.sideFenceZ]);
  fence(southEnd,[L.fenceX,-113]);

  function latticeLamp(x,z,h){
    const g=group([x,0,z]);box(.6,.16,.6,[0,.08,0],concrete,g);
    for(const xx of [-.21,.21])for(const zz of [-.21,.21])rod([xx,.12,zz],[xx*.5,h,zz*.5],.025,metal,g);
    for(let y=.5;y<h-.5;y+=.75){
      const half=.21*(1-y/(h*2));
      for(const zz of [-half,half]){rod([-half,y,zz],[half,y+.6,zz],.014,metal,g);rod([half,y,zz],[-half,y+.6,zz],.014,metal,g);}
    }
    for(const xx of [-.4,.4]){box(.30,.18,.22,[xx,h+.07,0],white,g);box(.27,.14,.025,[xx,h+.07,.13],m.light,g);}
  }
  latticeLamp(-26.3,-148.9,6.1);
  for(const x of [12,35,58])latticeLamp(x,island.south-.30,5.5);
  for(const z of [-145,-136]){cyl(.045,2.8,[-25.1,1.4,z],metal);box(.20,.09,.20,[-25.1,2.84,z],m.light);}
  // The photographed roadside has simple utility poles and an open earth verge.
  for(const x of [-24,15,54,93]){
    cyl(.065,6.4,[x,3.2,L.sideRoadZ-3.3],joint,k.scene,undefined,12);
    rod([x,6.1,L.sideRoadZ-3.3],[x,6.35,L.sideRoadZ-2.5],.035,metal);
  }
}
