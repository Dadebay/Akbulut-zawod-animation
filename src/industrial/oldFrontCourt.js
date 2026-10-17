import * as T from 'three';
import {OLD_FRONT_COURT as C,OLD_LEFT_CAMPUS as L,OLD_PAVILION,OLD_SIDE_LOADING as LOADING} from './siteLayout.js';
import {createParkedCarBuilder} from './parkedCars.js';

// The old hall opens onto one pale concrete court behind a planted white fence.
export function buildOldFrontCourt(k,plants){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const concrete=material('#b9baae',0,.96),joint=material('#a5a89b',0,.98);
  const white=material('#e1e4da',.06,.78),metal=material('#b9c5bd',.48,.52);
  const grass=material('#667c49',0,.98),soil=material('#77774e',0,1);
  function apron(west,east,north,south){
    box(east-west,.62,south-north,[(west+east)/2,-.335,(north+south)/2],concrete);
    for(let x=west+5;x<east;x+=5)box(.016,.006,south-north,[x,-.019,(north+south)/2],joint).castShadow=false;
    for(let z=north+5;z<south;z+=5)box(east-west,.006,.016,[(west+east)/2,-.019,z],joint).castShadow=false;
  }
  apron(C.west,C.east,C.north,C.south);
  apron(C.east,C.drive.east,C.drive.north,C.drive.south);
  // The secondary gate joins the outside road directly to the concrete apron.
  apron(L.frontRoadX-3.5,C.west,C.entryZ-C.entryWidth/2,C.entryZ+C.entryWidth/2);

  function bed(west,east,north,south){
    const w=east-west,d=south-north,x=(west+east)/2,z=(north+south)/2;
    function outline(inset){
      const a=-w/2+inset,b=w/2-inset,c=-d/2+inset,e=d/2-inset,r=Math.min(.85,(w-2*inset)/2,(d-2*inset)/2);
      const shape=new T.Shape();shape.moveTo(a+r,c);shape.lineTo(b-r,c);shape.quadraticCurveTo(b,c,b,c+r);
      shape.lineTo(b,e-r);shape.quadraticCurveTo(b,e,b-r,e);shape.lineTo(a+r,e);
      shape.quadraticCurveTo(a,e,a,e-r);shape.lineTo(a,c+r);shape.quadraticCurveTo(a,c,a+r,c);shape.closePath();return shape;
    }
    const curb=new T.ExtrudeGeometry(outline(0),{depth:.20,bevelEnabled:false,curveSegments:5});curb.rotateX(-Math.PI/2);
    mesh(curb,concrete,[x,-.07,z]);
    const lawn=new T.ExtrudeGeometry(outline(.14),{depth:.18,bevelEnabled:false,curveSegments:5});lawn.rotateX(-Math.PI/2);
    mesh(lawn,grass,[x,-.035,z]);
    box(w-.3,.46,d-.3,[x,-.30,z],soil);
  }
  const entryNorth=C.entryZ-C.entryWidth/2,entrySouth=C.entryZ+C.entryWidth/2;
  bed(-33.6,-29.45,-116.7,entryNorth-1.0);
  bed(-28.6,-26.3,-116.7,-102.3);
  bed(-28.6,-27.6,-101.7,-86.4);
  bed(-33.6,-29.45,OLD_PAVILION.garden.north,OLD_PAVILION.garden.south);
  // Vary the small boundary trees; the open centre of the court remains paved.
  for(let i=0;i<9;i++){
    const z=-114.5+i*3.15;
    plants.plant(-31.5+(i%2?.18:-.12),z,.35+(i%3)*.045);
    const shrub=k.sphere(.28,[-30.15,.31,z+1.2],grass);shrub.scale.set(1,.6,1.5);
  }
  for(const z of [-113.5,-110.5,-107.5,-104.5])plants.plant(-27.5,z,.25);
  for(let i=0;i<5;i++){
    const shrub=k.sphere(.24,[-28.1,.30,-100+i*2.7],grass);shrub.scale.set(1,1.25,1.4);
  }
  for(let i=0;i<5;i++)plants.plant(-31.5,-71.2+i*3.2,.33+(i%3)*.04);

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
  // Open white gate leaves fold into the yard, beside the vehicle opening.
  for(const z of [entryNorth,entrySouth]){
    box(.38,2.0,.38,[L.fenceX,1,z],white);
    box(.50,.13,.50,[L.fenceX,2.05,z],white);
    for(const y of [.28,1.57])box(4.3,.08,.07,[L.fenceX+2.15,y,z],metal);
    for(let x=.15;x<4.3;x+=.20)rod([L.fenceX+x,.28,z],[L.fenceX+x,1.57,z],.018,white);
  }

  // Slim planting beds follow the white gable and wrap the glazed office corner.
  bed(-10,-7.3,-115.5,-113.0);
  bed(-10,-7.3,-111.0,-108.5);
  bed(-16.3,-14.1,-105.7,-100.6);
  bed(-16.3,-14.1,-96.3,-87.0);
  bed(-13.0,LOADING.apron.west-.5,-86.0,-83.7);
  bed(LOADING.apron.east+.5,64.5,-86.0,-83.7);
  for(const z of [-114.2,-109.7])plants.plant(-8.7,z,.27);
  for(const z of [-104,-102,-94.8,-91.8,-88.8])plants.plant(-15.1,z,.25);
  for(let x=-10;x<64;x+=3.8){if(x>LOADING.apron.west-1.5&&x<LOADING.apron.east+1.5)continue;plants.plant(x,-84.9,.24+((Math.round(x)+12)%3)*.035);}
  for(const [x,z] of [[-11.2,-115],[-17,-104.7],[-17,-90],[-6,-82.9],[26,-82.9],[65,-82.9]]){
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
