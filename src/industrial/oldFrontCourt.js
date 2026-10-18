import * as T from 'three';
import {OLD_FRONT_COURT as C,OLD_FRONT_PARK as PARK,OLD_LEFT_CAMPUS as L,OLD_PAVILION,OLD_SIDE_LOADING as LOADING,POND_APPROACH as APPROACH} from './siteLayout.js';
import {createParkedCarBuilder} from './parkedCars.js';

// The old hall opens onto one pale concrete court behind a planted white fence.
export function buildOldFrontCourt(k,plants){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const concrete=material('#b9baae',0,.96),asphalt=m.road;
  const white=material('#e1e4da',.06,.78),metal=material('#b9c5bd',.48,.52);
  const grass=m.grass,soil=material('#77774e',0,1);
  function apron(west,east,north,south){
    box(east-west,.62,south-north,[(west+east)/2,-.335,(north+south)/2],asphalt);
  }
  apron(C.west,C.east,C.north,C.south);
  apron(C.east,C.drive.east,C.drive.north,C.drive.south);
  // The shed's through lane continues west and east along the hall wall and joins the courtyard drive.
  apron(C.east,C.drive.east,LOADING.wallZ-.1,C.drive.north);
  // Meet the driveway edge exactly: the garden starts 10 cm farther south,
  // which previously left a pale strip of the underlying ground exposed.
  const pavilionApronNorth=Math.min(OLD_PAVILION.garden.north,C.drive.south);
  apron(OLD_PAVILION.wallWest,OLD_PAVILION.wallEast,pavilionApronNorth,OLD_PAVILION.wallZ);
  // The secondary gate joins the outside road directly to the concrete apron.
  apron(L.frontRoadX-3.5,C.west,C.entryZ-C.entryWidth/2,C.entryZ+C.entryWidth/2);
  // Continue the asphalt across the bare gap between the gate and pavilion.
  apron(L.frontRoadX-3.5,C.west,C.entryZ+C.entryWidth/2,pavilionApronNorth);
  apron(L.frontRoadX-3.5,-33.6,pavilionApronNorth,OLD_PAVILION.garden.south);
  // Continue the parking access lane beyond both ends of the canopy, from
  // the northern forecourt to the secondary gate's transverse driveway.
  const laneWest=PARK.east+.25,laneEast=-16.6,laneNorth=C.north,laneSouth=C.entryZ;
  const parkingLane=box(laneEast-laneWest,.012,laneSouth-laneNorth,
    [(laneWest+laneEast)/2,-.012,(laneNorth+laneSouth)/2],asphalt);
  parkingLane.castShadow=false;

  function bed(west,east,north,south,{openSouth=false}={}){
    const w=east-west,d=south-north,x=(west+east)/2,z=(north+south)/2;
    function outline(inset){
      const a=-w/2+inset,b=w/2-inset,c=-d/2+inset,e=d/2-inset,r=Math.min(.85,(w-2*inset)/2,(d-2*inset)/2);
      const shape=new T.Shape();shape.moveTo(a+r,c);shape.lineTo(b-r,c);shape.quadraticCurveTo(b,c,b,c+r);
      shape.lineTo(b,e-r);shape.quadraticCurveTo(b,e,b-r,e);shape.lineTo(a+r,e);
      shape.quadraticCurveTo(a,e,a,e-r);shape.lineTo(a,c+r);shape.quadraticCurveTo(a,c,a+r,c);shape.closePath();return shape;
    }
    if(openSouth){
      // The planted strip joins the lawn beyond this end: keep its outer U
      // border and leave the shared green edge free of a white crossbar.
      const a=-w/2,b=w/2,c=-d/2,e=d/2,r=.85,inset=.14;
      const ai=a+inset,bi=b-inset,ci=c+inset,ri=r-inset;
      const rim=new T.Shape();rim.moveTo(a,e);rim.lineTo(a,c+r);
      rim.quadraticCurveTo(a,c,a+r,c);rim.lineTo(b-r,c);
      rim.quadraticCurveTo(b,c,b,c+r);rim.lineTo(b,e);
      rim.lineTo(bi,e);rim.lineTo(bi,ci+ri);
      rim.quadraticCurveTo(bi,ci,bi-ri,ci);rim.lineTo(ai+ri,ci);
      rim.quadraticCurveTo(ai,ci,ai,ci+ri);rim.lineTo(ai,e);rim.closePath();
      const curb=new T.ExtrudeGeometry(rim,{depth:.20,bevelEnabled:false,curveSegments:5});curb.rotateX(-Math.PI/2);
      mesh(curb,concrete,[x,-.07,z]);
      const turf=new T.Shape();turf.moveTo(ai+ri,ci);turf.lineTo(bi-ri,ci);
      turf.quadraticCurveTo(bi,ci,bi,ci+ri);turf.lineTo(bi,e+.12);
      turf.lineTo(ai,e+.12);turf.lineTo(ai,ci+ri);
      turf.quadraticCurveTo(ai,ci,ai+ri,ci);turf.closePath();
      const lawn=new T.ExtrudeGeometry(turf,{depth:.18,bevelEnabled:false,curveSegments:5});lawn.rotateX(-Math.PI/2);
      mesh(lawn,grass,[x,-.035,z]);
    }else{
      const curb=new T.ExtrudeGeometry(outline(0),{depth:.20,bevelEnabled:false,curveSegments:5});curb.rotateX(-Math.PI/2);
      mesh(curb,concrete,[x,-.07,z]);
      const lawn=new T.ExtrudeGeometry(outline(.14),{depth:.18,bevelEnabled:false,curveSegments:5});lawn.rotateX(-Math.PI/2);
      mesh(lawn,grass,[x,-.035,z]);
    }
    box(w-.3,.46,d-.3,[x,-.30,z],soil);
  }
  const entryNorth=C.entryZ-C.entryWidth/2,entrySouth=C.entryZ+C.entryWidth/2;
  // Cover the exposed soil beside the long planted strip, right up to the
  // approach road and fence. The sidewalk remains above it.
  const vergeWest=L.frontRoadX+3.5,vergeEast=L.fenceX-.02;
  const vergeNorth=APPROACH.z+APPROACH.width/2,vergeSouth=entryNorth;
  const verge=box(vergeEast-vergeWest,.12,vergeSouth-vergeNorth,
    [(vergeWest+vergeEast)/2,-.10,(vergeNorth+vergeSouth)/2],grass);
  verge.castShadow=false;
  // One continuous lawn replaces the raised island and its internal white rim.
  // Finish only the exposed outside edges; the fence already frames the east.
  const vergeMidX=(vergeWest+vergeEast)/2,vergeMidZ=(vergeNorth+vergeSouth)/2;
  box(.18,.16,vergeSouth-vergeNorth,[vergeWest,.025,vergeMidZ],white).castShadow=false;
  for(const z of [vergeNorth,vergeSouth])
    box(vergeEast-vergeWest,.16,.18,[vergeMidX,.025,z],white).castShadow=false;
  bed(-28.6,-26.3,-116.7,-102.3);
  bed(-33.6,-29.45,entrySouth+.25,OLD_PAVILION.garden.south);
  // Vary the small boundary trees; the open centre of the court remains paved.
  for(let i=0;i<9;i++){
    const z=-114.5+i*3.15;
    plants.plant(-31.5+(i%2?.18:-.12),z,.35+(i%3)*.045);
    plants.plant(-30.15,z+1.2,.26,{plantedBed:true});
  }
  for(let z=-116,i=0;z<-89;z+=2.6,i++)
    plants.plant(-32.85+(i%2)*.2,z,.31+(i%4)*.025,{plantedBed:true});
  for(let z=-112.5,i=0;z<-91;z+=3.9,i++)
    plants.plant(-30.75,z,.24+(i%3)*.025,{plantedBed:true});
  for(const z of [-113.5,-110.5,-107.5,-104.5])plants.plant(-27.5,z,.25);
  for(let i=0;i<5;i++)plants.plant(-31.5,-71.2+i*3.2,.33+(i%3)*.04);

  // Boundary wall along the railway: a solid white wall with a cap and regular pilasters.
  {
    const wz=OLD_PAVILION.wallZ,west=OLD_PAVILION.wallWest,east=OLD_PAVILION.wallEast,length=east-west,cx=(west+east)/2;
    box(length,1.15,.24,[cx,.575,wz],white);
    box(length+.1,.12,.36,[cx,1.21,wz],white);
    for(let x=west;x<=east+.01;x+=6)box(.42,1.35,.42,[x,.675,wz],white);
  }
  // A planted verge on the court side of the wall, left open where the hall stands.

  function fence(a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),g=group([(a[0]+b[0])/2,0,(a[1]+b[1])/2]);
    g.rotation.y=-Math.atan2(dz,dx);
    box(length,.30,.22,[0,.15,0],white,g);
    const count=Math.ceil(length/3.1);
    for(let i=0;i<=count;i++){
      const x=-length/2+length*i/count;
      box(.25,1.78,.28,[x,.89,0],white,g);box(.36,.12,.39,[x,1.82,0],white,g);
    }
    for(const y of [.45,1.52])box(length,.055,.055,[0,y,0],metal,g);
    for(let x=-length/2+.15;x<length/2;x+=.20)box(.025,1.18,.025,[x,1.02,0],metal,g);
  }
  fence([L.fenceX,-113],[L.fenceX,entryNorth]);
  fence([L.fenceX,entrySouth],[L.fenceX,OLD_PAVILION.garden.north]);
  // The garden-side leaf folds out over the asphalt, clear of the planting.
  for(const z of [entryNorth,entrySouth]){
    const direction=z===entrySouth?-1:1;
    box(.38,2.0,.38,[L.fenceX,1,z],white);
    box(.50,.13,.50,[L.fenceX,2.05,z],white);
    for(const y of [.28,1.57])box(4.3,.08,.07,[L.fenceX+direction*2.15,y,z],metal);
    for(let x=.15;x<4.3;x+=.20)rod([L.fenceX+direction*x,.28,z],[L.fenceX+direction*x,1.57,z],.018,white);
  }

  // Slim planting beds follow the white gable and wrap the glazed office corner.
  bed(-10,-7.3,-115.5,-113.0);
  bed(-10,-7.3,-111.0,-108.5);
  bed(-16.3,-14.1,-105.7,-100.6);
  bed(-16.3,-14.1,-96.3,-87.0,{openSouth:true});
  for(const z of [-114.2,-109.7])plants.plant(-8.7,z,.27);
  for(const z of [-104,-102,-94.8,-91.8,-88.8])plants.plant(-15.1,z,.25);
  for(const [x,z] of [[-11.2,-115],[-16.45,-104.7],[-16.45,-90],[-6,-82.9]]){
    cyl(.034,2.9,[x,1.45,z],metal,k.scene,undefined,10);
    cyl(.10,.20,[x,2.98,z],white,k.scene,undefined,12);
    box(.20,.06,.20,[x,3.11,z],m.light);
  }
  const mast=group([-30.5,0,-109]);
  for(const x of [-.18,.18])for(const z of [-.18,.18])rod([x,.1,z],[x*.55,5.8,z*.55],.023,metal,mast);
  for(let y=.5;y<5.4;y+=.7)for(const z of [-.15,.15]){
    rod([-.15,y,z],[.15,y+.6,z],.013,metal,mast);rod([.15,y,z],[-.15,y+.6,z],.013,metal,mast);
  }
  for(const x of [-.32,.32])box(.26,.17,.22,[x,5.85,0],white,mast);
  createParkedCarBuilder(k)(L.frontRoadX+2.1,-94,Math.PI/2,7);
}
