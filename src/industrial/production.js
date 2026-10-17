import * as T from 'three';
import {JOURNEY_STAGE as S} from '../journey.js';
import {createEquipmentModels} from './equipmentModels.js';
import {PROCESS_STATIONS,PROCESS_LINES,BOARD_ROUTE,BOARD_START,BOARD_END,BAG_ROUTE,BOARD_PALLET_OUT,BAG_PALLET_OUT,GYPSUM_CRUSHER,localPoint,routeCurve} from './processPlan.js';

import {conveyorMotion,transferTable} from './conveyorTransfer.js';

export const STATIONS=PROCESS_STATIONS.map(s=>({...s,pos:localPoint(s.world)}));

export function buildProduction(k){
  const {m,box,cyl,ring,rod,pipe,group,frame,platform,ladder,bolts,motor,cabinet,textPlate,material,mesh}=k;
  const rotors=[],products=[],lamps=[],flows=[],operators=[],transfers=[];
  const equipment=createEquipmentModels(k,rotors);
  const root=group([0,0,0],k.scene,true),outdoor=group([8,0,-25],k.scene,true);
  function plinth(w,d,g){box(w,.22,d,[0,.11,0],m.concrete,g);for(const z of [-d/2,d/2])box(w,.018,.07,[0,.235,z],m.yellow,g);}
  function conveyor(x,z,length,width=2.3,zone='GK',kind='panel',parent=root){
    const g=group([x,0,z],parent);for(const zz of [-width/2,width/2]){box(length,.23,.12,[0,1.05,zz],m.blue,g);for(let xx=-length/2+.35;xx<length/2;xx+=2){box(.12,1.05,.12,[xx,.52,zz],m.dark,g);box(.3,.06,.3,[xx,.03,zz],m.steel,g);}}
    for(let xx=-length/2+.16;xx<length/2;xx+=.32){const roller=cyl(.075,width-.14,[xx,1.1,0],m.steel,g,undefined,16);roller.rotation.x=Math.PI/2;}
    // Roller axles, bearings, adjustable feet and a chain enclosure remain visible up close.
    for(let xx=-length/2+.16;xx<length/2;xx+=.64)for(const z of [-width/2,width/2]){
      box(.14,.16,.08,[xx,1.08,z],equipment.cast,g,.025);
      equipment.bolt([xx,1.08,z+(z>0?.055:-.055)],g,'z',.021);
    }
    for(let xx=-length/2+.35;xx<length/2;xx+=2)for(const z of [-width/2,width/2]){
      cyl(.035,.22,[xx,.15,z],m.polished,g);cyl(.13,.04,[xx,.03,z],m.dark,g);
    }
    box(length,.16,.16,[0,.82,-width/2-.05],equipment.enamel,g,.018);
    for(let xx=-length/2+.5;xx<length/2;xx+=3){
      box(.1,.14,.18,[xx,1.33,width/2+.05],m.dark,g,.015);cyl(.025,.018,[xx,1.4,width/2-.04],m.red,g);
    }
    if(length>3)equipment.gearmotor([length/2-.8,.35,width/2+.4],g,.6,Math.PI/2);
    if(kind==='bags'||kind==='bag-track'||kind==='raw')box(length,.035,width-.15,[0,1.17,0],m.rubber,g,.015);
    for(let i=0;i<(['track','bag-track'].includes(kind)?0:Math.floor(length/3.4));i++){const p=group([0,1.2,0],g,true);
      if(kind==='raw'){for(let n=0;n<7;n++){const stone=mesh(new T.DodecahedronGeometry(.12+(n%3)*.04),m.raw,[(n%3)*.3-.3,.16,Math.floor(n/3)*.3-.3],p);stone.rotation.set(n,n*.5,n*.7);}}
      else if(kind==='bags'){box(.75,.23,.46,[0,.12,0],m.paper,p,.10);box(.45,.012,.20,[0,.24,0],m.blue,p);}
      else if(kind==='tiles'){for(const zz of [-.36,.36]){box(.62,.025,.62,[0,.015,zz],m.paper,p,.006);for(let a=-.24;a<.3;a+=.12)for(let b=-.24;b<.3;b+=.12)cyl(.013,.003,[a,.03,zz+b],m.dark,p,undefined,6);}}
      else{box(2.4,.026,1.2,[0,.02,0],m.paper,p,.008);box(2.4,.007,.025,[0,.038,.59],m.blueLight,p);}
      products.push({object:p,length,offset:i*3.4,time:0,zone,kind});
    }return g;
  }
  STATIONS.forEach((s,index)=>{
    const g=group(s.pos,root);plinth(index===2?13:index===4?22:8,index===4?5:7,g);
    equipment[s.id](g);
    const control=cabinet([3.4,.25,3],g);
    for(const y of [.25,.32,.39,.46])box(.42,.014,.018,[0,y,.26],m.dark,control);
    for(const x of [-.33,.33])for(const y of [.22,1.37])box(.06,.11,.04,[x,y,.27],m.steel,control);
    const hmi=group([2.5,0,3.3],g);box(.38,.08,.4,[0,.3,0],m.dark,hmi);cyl(.055,1.15,[0,.88,0],m.steel,hmi);
    const console=group([0,1.55,0],hmi);console.rotation.x=-.22;box(.55,.38,.12,[0,0,0],equipment.enamel,console,.03);box(.37,.22,.018,[-.04,.025,.07],m.black,console,.012);box(.32,.17,.01,[-.04,.025,.083],m.blueLight,console);
    for(let n=0;n<3;n++)box(.2,.012,.008,[-.06,.07-n*.045,.091],m.white,console);
    const stop=cyl(.048,.045,[.2,-.1,.09],m.red,console);stop.rotation.x=Math.PI/2;
    pipe([[3.4,.45,2.85],[3.4,.28,2.4],[2,.28,2.4],[2,.4,1.5]],.035,m.black,g);
    operators.push({pos:[s.pos[0]+3,s.pos[1]+.25,s.pos[2]+4.4],zone:s.id,angle:Math.PI});
    const lm=material('#3ca878',.1,.3,{emissive:'#3ca878',emissiveIntensity:.3});const lamp=group([3.4,2.1,3],g,true);cyl(.055,.3,[0,0,0],m.dark,lamp);cyl(.07,.12,[0,.2,0],lm,lamp);lamps.push({mat:lm,zone:s.id});
  });
  // Jaw crusher: deep feed throat, steel cheek plates, eccentric flywheel and drive belt.
  const jaw=group(localPoint(GYPSUM_CRUSHER),outdoor);plinth(6,5,jaw);frame(5,3.7,1.1,jaw);
  for(const z of [-1.45,1.45]){box(3.8,2.5,.25,[0,2.3,z],m.blue,jaw);for(let x=-1.6;x<1.8;x+=.55)box(.13,2.45,.1,[x,2.3,z*1.12],m.steel,jaw);}
  box(3.7,.18,3.2,[0,1.15,0],m.dark,jaw);box(.25,2.3,2.6,[-1.6,2.3,0],m.steel,jaw);
  const plate=box(.3,2.35,2.6,[.8,2.3,0],m.steel,jaw);plate.rotation.z=-.28;
  for(let z=-1.15;z<1.2;z+=.19)box(.13,2.15,.08,[-1.42,2.4,z],m.dark,jaw);
  box(3.7,.18,3.5,[0,3.6,0],m.dark,jaw);equipment.hollowHopper(3.5,3.2,2.7,2.4,1.0,[0,3.65,0],jaw);
  for(const z of [-1.65,1.65]){const wheel=group([.5,2.4,z],jaw,true);const disk=cyl(1.15,.22,[0,0,0],m.steel,wheel);disk.rotation.x=Math.PI/2;k.ring(1.05,.1,[0,0,0],m.dark,wheel,'z');for(let n=0;n<8;n++){const a=n*Math.PI/4;rod([0,0,.14],[Math.cos(a)*.9,Math.sin(a)*.9,.14],.065,m.dark,wheel);}rotors.push({object:wheel,axis:'z',zone:'CR',speed:.5});}
  equipment.gearmotor([3,.4,0],jaw,1.55);for(const z of [-1.95,1.95])equipment.fence(3.3,2.8,[.5,.4,z],jaw);for(const x of [-1.6,1.6])for(const z of [-1.5,1.5])equipment.bolt([x,3.75,z],jaw);cabinet([-2.5,0,3],jaw);operators.push({pos:localPoint([GYPSUM_CRUSHER[0]-2,0,GYPSUM_CRUSHER[2]+4]),zone:'CR',angle:Math.PI});
  // Articulated palletising robot with servo housings, cable loom and a vacuum gripper.
  const robot=group(localPoint([.4,0,-29]),root);robot.rotation.y=Math.PI;plinth(6,5,robot);box(1.8,.25,1.8,[0,.4,0],equipment.cast,robot,.025);cyl(.75,.85,[0,.9,0],equipment.enamel,robot,.6,64);
  const pivot=group([0,1.4,0],robot,true);cyl(.62,.22,[0,0,0],equipment.blue,pivot,undefined,64);
  function robotLink(a,b,width,depth){const mid=new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5),dir=new T.Vector3(...b).sub(new T.Vector3(...a));const part=box(width,dir.length(),depth,mid.toArray(),equipment.enamel,pivot,.08);part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return part;}
  robotLink([0,.1,0],[.9,2.7,0],.48,.52);robotLink([.9,2.7,0],[3.1,1.9,0],.35,.4);
  rod([-.25,.3,-.34],[.56,2.7,-.34],.065,equipment.cast,pivot);rod([.56,2.7,-.34],[3.02,2.22,-.34],.055,equipment.cast,pivot);
  for(const p of [[0,.15,0],[.9,2.7,0],[3.1,1.9,0]]){equipment.cylinder(.34,.7,p,equipment.blue,pivot,'z');for(const z of [-.37,.37]){equipment.cylinder(.23,.05,[p[0],p[1],z],m.steel,pivot,'z');for(let n=0;n<8;n++){const a=n/8*Math.PI*2;equipment.bolt([p[0]+Math.sin(a)*.27,p[1]+Math.cos(a)*.27,z],pivot,'z');}}}
  pipe([[0,.1,.43],[.3,1.4,.43],[1,2.88,.43],[2.1,2.48,.35],[3.12,1.9,.35]],.065,m.black,pivot);pipe([[0,.3,.52],[.7,2.5,.52],[1.1,2.82,.52],[3.12,1.9,.46]],.025,equipment.blue,pivot);
  rod([3.1,1.9,0],[3.1,1.12,0],.13,m.steel,pivot);box(1.9,.14,1.3,[3.1,1.07,0],equipment.blue,pivot,.025);
  for(const x of [2.4,3.1,3.8])for(const z of [-.45,.45]){cyl(.05,.2,[x,.9,z],m.polished,pivot);cyl(.16,.07,[x,.75,z],m.rubber,pivot,.10);pipe([[3.1,1.3,0],[x,1.3,z],[x,.86,z]],.018,m.black,pivot);}
  rotors.push({object:pivot,axis:'swing',zone:'GP',speed:.4,base:0});cabinet([-2,0,2],robot);operators.push({pos:localPoint([3.4,0,-26]),zone:'GP',angle:Math.PI});
  equipment.fence(6,2.25,[.5,.25,-2.4],robot);equipment.fence(4.8,2.25,[4,.25,0],robot,Math.PI/2);
  // Board forming head, liner rolls and guillotine between drying and packing.
  const forming=group(localPoint([BOARD_START[0],0,BOARD_START[2]]),root);frame(3.5,3.4,2.7,forming);
  for(const x of [-1.6,1.6]){const roll=cyl(.52,2.6,[x,2.7,0],m.paper,forming);roll.rotation.x=Math.PI/2;for(const z of [-1.32,1.32]){equipment.cylinder(.18,.04,[x,2.7,z],m.wood,forming,'z');equipment.cylinder(.085,.06,[x,2.7,z],m.black,forming,'z');box(.18,1.5,.2,[x,1.8,z],equipment.cast,forming);}const axle=cyl(.10,3.4,[x,2.7,0],m.steel,forming);axle.rotation.x=Math.PI/2;}
  box(1.6,.55,3,[0,1.8,0],m.blue,forming);box(1.7,.12,2.6,[0,1.47,0],m.steel,forming);
  const cutter=group(localPoint([50,0,BOARD_START[2]]),root);frame(2,3.2,2.5,cutter);const blade=group([0,1.9,0],cutter,true);box(.1,.4,2.7,[0,0,0],m.steel,blade);box(.3,.12,3.1,[0,.25,0],m.blue,blade);rotors.push({object:blade,axis:'lift',zone:'GK',speed:1.5,base:1.9});
  for(const z of [-1.4,1.4]){cyl(.10,.8,[0,2.6,z],equipment.cast,cutter);cyl(.04,.7,[0,2.1,z],m.polished,cutter);pipe([[0,2.95,z],[.5,2.95,z],[.5,.4,z]],.025,m.black,cutter);}
  // The forming mouth covers the birth of each board; it feeds a real table.
  for(const z of [-1.42,1.42])box(3.4,.55,.10,[0,1.43,z],equipment.enamel,forming);
  box(3.4,.12,2.95,[0,1.77,0],equipment.enamel,forming);box(.12,.55,2.95,[-1.7,1.43,0],equipment.enamel,forming);
  function routedTrack(points,width,tableSize,kind){
    const half=tableSize/2;
    for(let i=1;i<points.length;i++){
      const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),d=b.clone().sub(a).normalize();
      if(i>1)a.addScaledVector(d,half);if(i<points.length-1)b.addScaledVector(d,-half);
      const length=a.distanceTo(b),mid=a.clone().lerp(b,.5);
      if(length<.24){box(width,.07,.24,localPoint([mid.x,1.14,mid.z]),m.steel,root);continue;}
      const table=conveyor(mid.x-8,mid.z+25,length,width,'GK',kind);table.rotation.y=-Math.atan2(d.z,d.x);
    }
  }
  function stream(points,kind,zone,interval,options){
    const motion=conveyorMotion(points.map(localPoint),options),count=Math.ceil((motion.duration+.6)/interval)+1;
    motion.turns.forEach(corner=>transfers.push({table:transferTable(k,corner,{parent:root,size:kind==='panel'?3:1.7,top:kind==='panel'?1.175:1.1875}),interval,kind}));
    for(let i=0;i<count;i++){
      const product=group([0,0,0],root,true);
      if(kind==='panel'){box(2.4,.03,1.2,[0,.02,0],m.paper,product,.006);box(2.4,.012,.025,[0,.04,.59],m.blueLight,product);}
      else{box(.75,.23,.46,[0,.12,0],m.paper,product,.10);box(.45,.012,.20,[0,.24,0],m.blue,product);}
      products.push({object:product,motion,delay:i*interval,period:count*interval,fillTime:options.startHold||0,kind,zone});
    }
  }
  routedTrack(BOARD_ROUTE,2.6,3,'track');stream(BOARD_ROUTE,'panel','GK',2.4,{speed:8,turnTime:.7});
  // The end of the return conveyor is a stacking receiver, not open floor.
  const boardReceiver=group(localPoint([BOARD_END[0],0,BOARD_END[2]]),root);
  for(const z of [-1.5,1.5])box(3.6,.72,.10,[0,1.53,z],equipment.enamel,boardReceiver);
  box(3.6,.12,3.1,[0,1.95,0],equipment.enamel,boardReceiver);box(.12,.72,3.1,[1.8,1.53,0],equipment.enamel,boardReceiver);
  for(const z of [-.5,0,.5])box(2.6,.1,.16,[0,.30,z],m.wood,boardReceiver);
  for(let n=0;n<26;n++)box(2.4,.024,1.2,[0,.5+n*.026,0],m.paper,boardReceiver);
  box(2.7,.18,3.9,localPoint([BOARD_END[0],.16,-31.2]),m.blue,root);
  // Dry construction mixtures have their own dosing, bagging and discharge.
  const baggingPosition=localPoint([-43,0,-32.5]),bg=group(baggingPosition,root);
  frame(5,4,3.5,bg);platform(5.5,4.5,3.5,bg);
  for(const x of [-1.3,1.3]){cyl(.9,2,[x,4.6,0],m.white,bg);cyl(.18,1.2,[x,3,0],m.steel,bg,.9);cyl(.12,.6,[x,2,0],m.dark,bg);}
  ladder(3.6,-3,2,bg);
  // Bags are filled directly below the spouts, then sealed and palletised.
  for(const x of [-1.3,1.3])cyl(.13,.30,[x,1.55,0],m.rubber,bg);
  routedTrack(BAG_ROUTE,1.3,1.7,'bag-track');stream(BAG_ROUTE,'bags','GR',1.8,{speed:2.8,turnTime:.32,startHold:.45});
  const sealer=group(localPoint([-40.2,0,-32.5]),root);frame(1.6,1.6,1.8,sealer);box(1.6,.55,1.6,[0,1.8,0],equipment.enamel,sealer,.04);box(.7,.24,1.5,[0,1.47,0],m.blue,sealer);
  const bagReceiver=group(localPoint([-32,0,-36]),root);frame(3.2,2.6,3.2,bagReceiver);
  for(const z of [-1.3,1.3])box(3.2,2.2,.12,[0,2,z],equipment.enamel,bagReceiver);
  box(3.4,.16,2.8,[0,3.3,0],m.blue,bagReceiver);box(.12,2.2,2.6,[1.6,2,0],equipment.enamel,bagReceiver);
  for(let z=-.55;z<.6;z+=.25){const roller=cyl(.07,3.1,[0,1.11,z],m.steel,bagReceiver,undefined,10);roller.rotation.z=Math.PI/2;}
  box(3.6,.18,1.7,localPoint([-30.2,.16,-36]),m.blue,root);
  // Loaded output pallets make both destinations legible from a close view.
  for(const [pos,kind] of [[BOARD_PALLET_OUT,'panel'],[BAG_PALLET_OUT,'bags']]){
    const pallet=group(localPoint(pos),root);
    for(const z of [-.5,0,.5])box(1.4,.10,.16,[0,.05,z],m.wood,pallet);
    for(const x of [-.5,0,.5])box(.16,.12,1.1,[x,.15,0],m.wood,pallet);
    if(kind==='panel')for(let n=0;n<20;n++)box(1.35,.025,1.08,[0,.25+n*.026,0],m.paper,pallet);
    else for(let n=0;n<4;n++)for(const x of [-.31,.31])for(const z of [-.27,.27])box(.58,.19,.48,[x,.32+n*.2,z],m.paper,pallet,.07);
  }
  operators.push({pos:localPoint([-39,0,-31]),zone:'GR',angle:Math.PI});textPlate('GURY GARYNDY',3,.5,[-51,5.8,-5.2],root);
  function flow(points,zone,stages){
    const local=points.map(localPoint),path=routeCurve(local);mesh(new T.TubeGeometry(path,Math.max(24,Math.ceil(path.getLength()/2)),.16,6,false),m.steel,[0,0,0],root);
    const dots=[];for(let i=0;i<8;i++){const g=group([0,0,0],root,true);mesh(new T.SphereGeometry(.20,8,6),m.blueLight,[0,0,0],g);dots.push(g);}flows.push({path,dots,zone,stages});
  }
  flow([[-25.6,2,30.2],[-25.6,5.5,22],[-35,5.5,22],[-35,3.8,8]],'BS',[S.calcine]);
  flow([[-23.5,4,8],[-23.5,5.5,16],[-29.6,5.5,16],[-29.6,3.4,30.3]],'BS',[S.calcine,S.mix]);
  flow(PROCESS_LINES.find(line=>line.id==='drymix').points,'GR',[S.mix,S.form,S.pack]);
  flow(PROCESS_LINES.find(line=>line.id==='board').points.slice(0,5),'GK',[S.mix,S.form,S.pack]);
  flow([[-44.1,2,-22.3],[-39.5,2,-22.3],[-39.5,6.3,-32.5],[-43,6.3,-32.5]],'GR',[S.mix,S.form,S.pack]);
  for(const [x,z] of [[-41,-9],[8,-9],[48,-9],[60,-19],[-18,-23],[-7,-34]])operators.push({pos:localPoint([x,0,z]),zone:x< -30?'GR':'GK',angle:Math.PI});
  return {root,outdoor,rotors,products,lamps,flows,operators,updateTransfers(boardTime,bagTime){transfers.forEach(({table,interval,kind})=>table.update(kind==='panel'?boardTime:bagTime,interval));}};
}
