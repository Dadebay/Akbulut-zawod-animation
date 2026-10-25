import * as T from 'three';
import {JOURNEY_STAGE as S} from '../journey.js';
import {createEquipmentModels} from './equipmentModels.js';
import {buildInteriorEquipment} from './interiorEquipment.js';
import {PROCESS_STATIONS,BOARD_ROUTE,BOARD_START,BOARD_END,BOARD_CUT_X,BOARD_DRYER,CEILING_LINES,CEILING_LINE_Z,BAGGING_POSITION,BAG_ROUTE,BAG_PALLET_OUT,GYPSUM_CRUSHER,localPoint} from './processPlan.js';

import {createEquipmentConnections,machinePort} from './equipmentConnections.js';
import {conveyorMotion,transferTable} from './conveyorTransfer.js';
import {buildPalletizingCell} from './palletizingCell.js';
import {createCeilingPanelStyles,ceilingBatchType} from './ceilingPanelStyles.js';
import {PROCESS_PHYSICS as P,createDrive,createProcessPhysics,createBoardBatch,advanceBoard,boardReady,rpmToRadians,rollerAngularSpeed} from './processPhysics.js';

export const STATIONS=PROCESS_STATIONS.map(s=>({...s,pos:localPoint(s.world)}));

export function buildProduction(k){
  const {m,box,cyl,ring,rod,pipe,group,frame,platform,ladder,bolts,motor,cabinet,textPlate,material,mesh}=k;
  const rotors=[],products=[],lamps=[],flows=[],operators=[];
  const equipment=createEquipmentModels(k,rotors),machines={};
  const panelStyles=createCeilingPanelStyles(k);
  const root=group([0,0,0],k.scene,true),outdoor=group([8,0,-25],k.scene,true);
  const network=createEquipmentConnections(k,root,equipment,rotors);
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
    if(length>3){
      equipment.gearmotor([length/2-.8,.35,width/2+.4],g,.6,Math.PI/2);
      const drive=group([length/2-.8,.68,width/2+.72],g,true);
      equipment.cylinder(.18,.08,[0,0,0],m.dark,drive,'z');
      for(let i=0;i<4;i++){const a=i*Math.PI/2;rod([0,0,.05],[Math.cos(a)*.16,Math.sin(a)*.16,.05],.025,m.steel,drive);}
      rotors.push({object:drive,axis:'z',zone,speed:-rollerAngularSpeed(zone==='GR'?P.bagSpeed:P.boardSpeed,.18)});
    }
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
    const g=group(s.pos,root);g.name=`machine-${s.id}`;machines[s.id]=g;
    // The shared robot cell owns its receiver, controls and foundations.
    if(s.id==='GP')return;
    plinth(index===2?13:index===4?22:8,index===4?5:7,g);
    equipment[s.id](g);g.name=`machine-${s.id}`;machines[s.id]=g;
    const control=cabinet([3.4,.25,3],g);
    for(const y of [.25,.32,.39,.46])box(.42,.014,.018,[0,y,.26],m.dark,control);
    for(const x of [-.33,.33])for(const y of [.22,1.37])box(.06,.11,.04,[x,y,.27],m.steel,control);
    const hmi=group([2.5,0,3.3],g);box(.38,.08,.4,[0,.3,0],m.dark,hmi);cyl(.055,1.15,[0,.88,0],m.steel,hmi);
    const console=group([0,1.55,0],hmi);console.rotation.x=-.22;box(.55,.38,.12,[0,0,0],equipment.enamel,console,.03);box(.37,.22,.018,[-.04,.025,.07],m.black,console,.012);box(.32,.17,.01,[-.04,.025,.083],m.blueLight,console);
    for(let n=0;n<3;n++)box(.2,.012,.008,[-.06,.07-n*.045,.091],m.white,console);
    const stop=cyl(.048,.045,[.2,-.1,.09],m.red,console);stop.rotation.x=Math.PI/2;
    pipe([[3.4,.45,2.85],[3.4,.28,2.4],[2,.28,2.4],[2,.4,1.5]],.035,m.black,g);
    operators.push({pos:[s.pos[0]+(s.id==='GK'?-4:3),s.pos[1]+.25,s.pos[2]+4.4],zone:s.id,angle:Math.PI});
    const lm=material('#3ca878',.1,.3,{unique:true,emissive:'#3ca878',emissiveIntensity:.3});const lamp=group([3.4,2.1,3],g,true);cyl(.055,.3,[0,0,0],m.dark,lamp);cyl(.07,.12,[0,.2,0],lm,lamp);lamps.push({mat:lm,zone:s.id});
  });
  // Jaw crusher: deep feed throat, steel cheek plates, eccentric flywheel and drive belt.
  const jaw=group(localPoint(GYPSUM_CRUSHER),outdoor);plinth(6,5,jaw);frame(5,3.7,1.1,jaw);
  for(const z of [-1.45,1.45]){box(3.8,2.5,.25,[0,2.3,z],m.blue,jaw);for(let x=-1.6;x<1.8;x+=.55)box(.13,2.45,.1,[x,2.3,z*1.12],m.steel,jaw);}
  box(3.7,.18,3.2,[0,1.15,0],m.dark,jaw);box(.25,2.3,2.6,[-1.6,2.3,0],m.steel,jaw);
  const plate=box(.3,2.35,2.6,[.8,2.3,0],m.steel,jaw);plate.rotation.z=-.28;plate.userData.dynamic=true;
  for(let z=-1.15;z<1.2;z+=.19)box(.13,2.15,.08,[-1.42,2.4,z],m.dark,jaw);
  box(3.7,.18,3.5,[0,3.6,0],m.dark,jaw);equipment.hollowHopper(3.5,3.2,2.7,2.4,1.0,[0,3.65,0],jaw);
  for(const z of [-1.89,1.89]){const face=Math.sign(z);const wheel=group([.5,2.4,z],jaw,true);const disk=cyl(1.15,.22,[0,0,0],m.steel,wheel);disk.rotation.x=Math.PI/2;k.ring(1.05,.1,[0,0,0],m.dark,wheel,'z');for(let n=0;n<8;n++){const a=n*Math.PI/4;rod([0,0,face*.14],[Math.cos(a)*.9,Math.sin(a)*.9,face*.14],.065,m.dark,wheel);}rotors.push({object:wheel,axis:'z',zone:'CR',speed:rpmToRadians(P.jawRpm)});}
  equipment.gearmotor([3,.4,0],jaw,1.55);for(const z of [-2.2,2.2])equipment.fence(3.3,2.8,[.5,.4,z],jaw);for(const x of [-1.6,1.6])for(const z of [-1.5,1.5])equipment.bolt([x,3.75,z],jaw);cabinet([-2.5,0,3],jaw);operators.push({pos:localPoint([GYPSUM_CRUSHER[0]-2,0,GYPSUM_CRUSHER[2]+4.6]),zone:'CR',angle:Math.PI});
  // Inspect the feeder from the aisle beside its supply pallet and robot fence.
  operators.push({pos:localPoint([-1,0,CEILING_LINE_Z-2]),zone:'GP',angle:Math.PI,walkAxis:'z'});
  // Slurry is formed and allowed to set before cutting, then enters the dryer.
  const forming=group(localPoint([BOARD_START[0],0,BOARD_START[2]]),root);frame(3.5,3.4,2.7,forming);
  for(const x of [-1.6,1.6]){const roll=cyl(.52,2.6,[x,2.7,0],m.paper,forming);roll.rotation.x=Math.PI/2;for(const z of [-1.32,1.32]){equipment.cylinder(.18,.04,[x,2.7,z],m.wood,forming,'z');equipment.cylinder(.085,.06,[x,2.7,z],m.black,forming,'z');box(.18,1.5,.2,[x,1.8,z],equipment.cast,forming);}const axle=cyl(.10,3.4,[x,2.7,0],m.steel,forming);axle.rotation.x=Math.PI/2;}
  box(1.6,.55,3,[0,1.8,0],m.blue,forming);box(1.7,.12,2.6,[0,1.47,0],m.steel,forming);
  const cutter=group(localPoint([BOARD_CUT_X,0,BOARD_START[2]]),root);cutter.name='board-cutter';frame(2,3.2,2.5,cutter);const blade=group([0,1.9,0],cutter,true);box(.1,.4,2.7,[0,0,0],m.steel,blade);box(.3,.12,3.1,[0,.25,0],m.blue,blade);machines['board-cutter']=cutter;cutter.userData.processTool={object:blade,base:1.9,travel:.52};
  for(const z of [-1.4,1.4]){cyl(.10,.8,[0,2.6,z],equipment.cast,cutter);cyl(.04,.7,[0,2.1,z],m.polished,cutter);pipe([[0,2.95,z],[.5,2.95,z],[.5,.4,z]],.025,m.black,cutter);}
  machinePort(k,forming,'slurry',[0,2.35,0],[0,1,0],.22,'slurry',{nozzle:.9});machines.forming=forming;
  // The forming mouth covers the birth of each board; it feeds a real table.
  for(const z of [-1.42,1.42])box(3.4,.55,.10,[0,1.43,z],equipment.enamel,forming);
  box(3.4,.12,2.95,[0,1.77,0],equipment.enamel,forming);box(.12,.55,2.95,[-1.7,1.43,0],equipment.enamel,forming);
  function routedTrack(points,width,tableSize,kind,zone=kind==='bag-track'?'GR':'GK'){
    const half=tableSize/2,firstDrive=rotors.length;
    const isTurn=i=>i>0&&i<points.length-1&&new T.Vector3(...points[i]).sub(new T.Vector3(...points[i-1])).normalize().dot(new T.Vector3(...points[i+1]).sub(new T.Vector3(...points[i])).normalize())<.999;
    for(let i=1;i<points.length;i++){
      const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),d=b.clone().sub(a).normalize();
      if(isTurn(i-1))a.addScaledVector(d,half);if(isTurn(i))b.addScaledVector(d,-half);
      const length=a.distanceTo(b),mid=a.clone().lerp(b,.5);
      if(length<.24){box(width,.07,.24,localPoint([mid.x,1.14,mid.z]),m.steel,root);continue;}
      const table=conveyor(mid.x-8,mid.z+25,length,width,zone,kind);table.rotation.y=-Math.atan2(d.z,d.x);
    }
    return rotors.slice(firstDrive);
  }
  const streamGroups=[];
  function stream(points,kind,zone,interval,options){
    const motion=conveyorMotion(points.map(localPoint),options),count=Math.ceil((motion.duration+.6)/interval)+1;
    const line={motion,kind,zone,interval,time:0,started:false,drive:createDrive(1.5),products:[],tables:[]};
    const size=kind==='bags'?1.7:3,productLength=kind==='bags'?.75:kind==='ceiling'?2:2.4;
    motion.turns.forEach(corner=>line.tables.push(transferTable(k,corner,{parent:root,size,top:kind==='bags'?1.1875:1.175,clearTime:(size/2+productLength/2)/options.speed+options.speed/(2*(options.acceleration||2.4))})));
    for(let i=0;i<count;i++){
      const product=group([0,0,0],root,true),variants={};
      if(kind==='panel'){
        for(const state of ['damp','dry']){
          const g=group([0,0,0],product,true);variants[state]=g;
          box(2.4,.03,1.2,[0,.02,0],state==='dry'?m.paper:m.raw,g,.006);
          box(2.4,.001,.025,[0,.0345,.59],m.blueLight,g);
        }
      }else if(kind==='ceiling'){
        variants.blank=group([0,0,0],product,true);box(1.32,.035,1.32,[0,.025,0],m.paper,variants.blank,.006);
        variants.cut=panelStyles.sheet(product,.0075,0,{pattern:false,dynamic:true});
        variants.finish=panelStyles.choices(product,.0075);variants.holes=variants.finish.root;
      }else{box(.75,.23,.46,[0,.12,0],m.paper,product,.10);box(.45,.012,.20,[0,.24,0],m.blue,product);}
      const record={object:product,variants,motion,delay:i*interval,period:count*interval,fillTime:options.startHold||0,kind,zone};
      product.visible=false;products.push(record);line.products.push(record);
    }
    streamGroups.push(line);return line;
  }
  const cut=[BOARD_CUT_X,1.18,BOARD_START[2]],boardProducts=[[cut[0]+1.2,cut[1],cut[2]],...BOARD_ROUTE.slice(1)];
  // A continuous paper-faced web sets on a supported belt before the cutter.
  // Discrete boards are born at the cut, and only become dry after the dryer.
  const settingLength=cut[0]-BOARD_START[0],settingMid=(cut[0]+BOARD_START[0])/2;
  box(settingLength,.035,1.2,localPoint([settingMid,1.202,BOARD_START[2]]),m.paper,root);
  box(settingLength,.035,2.3,localPoint([settingMid,1.16,BOARD_START[2]]),m.rubber,root);
  for(const z of [-.60,.60])box(settingLength,.028,.025,localPoint([settingMid,1.23,BOARD_START[2]+z]),m.raw,root);
  // Support the complete sheet beyond its centre stop, including its leading edge.
  const boardDrives=routedTrack([...BOARD_ROUTE.slice(0,-1),[BOARD_END[0]+1.35,BOARD_END[1],BOARD_END[2]]],2.6,3,'track');
  const boardLine=stream(boardProducts,'panel','GK',4,{speed:P.boardSpeed,turnTime:1,startHold:.8});
  boardDrives.forEach(drive=>{drive.line=boardLine;});
  boardLine.nextDelivery=0;
  const palletizing=buildPalletizingCell(k,{root,equipment,onPickupClear:()=>{boardLine.nextDelivery++;}});
  const ceilingLines=CEILING_LINES.map(layout=>{
    const {id,start,z,route}=layout;
    const drives=routedTrack([...route.slice(0,-1),[layout.end+1,1.18,z]],2.6,3,'track');
    const line=stream(route,'ceiling','GK',7.5,{speed:P.ceilingSpeed,turnTime:1,stops:{3:1.1,4:1.2,6:.8}});
    line.layout=layout;
    line.products.forEach(p=>p.lineId=id);
    drives.forEach(drive=>{drive.line=line;drive.speed=-rollerAngularSpeed(P.ceilingSpeed,.18);});
    const magazine=group(localPoint([start,0,z]),root);
    box(.12,.85,3.2,[-1.58,1.58,0],equipment.enamel,magazine);
    box(3.2,.85,.12,[0,1.58,1.58],equipment.enamel,magazine);
    box(3.4,.12,3.4,[0,2.06,0],equipment.enamel,magazine);
    const feeder=group(localPoint([start,0,z-1.5]),root);
    feeder.name=id==='panel'?'ceiling-vacuum-feeder':`${id}-vacuum-feeder`;
    for(const x of [-1.35,1.35]){
      box(.10,.12,3.5,[x,2.35,-.25],m.blue,feeder);
      box(.10,.35,.10,[x,2.22,1.05],m.steel,feeder);
    }
    box(2.8,.12,.12,[0,2.35,-1.94],m.blue,feeder);
    const homeZ=localPoint(route[0])[2]-feeder.position.z;
    const head=group([0,1.67,homeZ],feeder,true);
    box(1.5,.10,1.5,[0,0,0],equipment.enamel,head,.04);
    for(const x of [-.48,.48])for(const zz of [-.48,.48]){
      rod([x,-.05,zz],[x,-.34,zz],.04,m.steel,head);
      cyl(.12,.04,[x,-.41,zz],m.rubber,head);
    }
    return {layout,feeder,head,homeZ,magazine,clock:line};
  });
  // Dry construction mixtures have their own dosing, bagging and discharge.
  const baggingPosition=localPoint(BAGGING_POSITION),bg=group(baggingPosition,root);
  frame(5,4,3.5,bg);platform(5.5,4.5,3.5,bg);
  for(const x of [-1.3,1.3]){cyl(.9,2,[x,4.6,0],m.white,bg);cyl(.18,1.2,[x,3,0],m.steel,bg,.9);cyl(.12,.6,[x,2,0],m.dark,bg);}
  ladder(3.6,-3,2,bg);
  machinePort(k,bg,'in',[-1.3,5.6,0],[0,1,0],.3,'solid');machines.bagging=bg;
  // Bags are filled directly below the spouts, then sealed and palletised.
  for(const x of [-1.3,1.3])cyl(.13,.30,[x,1.55,0],m.rubber,bg);
  const bagDrives=routedTrack(BAG_ROUTE,1.3,1.7,'bag-track'),bagLine=stream(BAG_ROUTE,'bags','GR',4.6,{speed:P.bagSpeed,turnTime:.6,startHold:1.1});
  bagDrives.forEach(drive=>{drive.line=bagLine;});
  const sealer=group(localPoint([-32.2,0,-16]),root);frame(1.6,1.6,1.8,sealer);box(1.6,.55,1.6,[0,1.8,0],equipment.enamel,sealer,.04);box(.7,.24,1.5,[0,1.47,0],m.blue,sealer);
  const bagReceiver=group(localPoint([-24,0,-20]),root);frame(3.2,2.6,3.2,bagReceiver);
  for(const z of [-1.3,1.3])box(3.2,2.2,.12,[0,2,z],equipment.enamel,bagReceiver);
  box(3.4,.16,2.8,[0,3.3,0],m.blue,bagReceiver);box(.12,2.2,2.6,[1.6,2,0],equipment.enamel,bagReceiver);
  for(let z=-.55;z<.6;z+=.25){const roller=cyl(.07,3.1,[0,1.11,z],m.steel,bagReceiver,undefined,10);roller.rotation.z=Math.PI/2;}
  box(3.6,.18,1.7,localPoint([-22.2,.16,-20]),m.blue,root);
  // Bagged mixtures keep their separate output pallet.
  const bagPallet=group(localPoint(BAG_PALLET_OUT),root);
  for(const z of [-.5,0,.5])box(1.4,.10,.16,[0,.05,z],m.wood,bagPallet);
  for(const x of [-.5,0,.5])box(.16,.12,1.1,[x,.15,0],m.wood,bagPallet);
  for(let n=0;n<4;n++)for(const x of [-.31,.31])for(const z of [-.27,.27])box(.58,.19,.48,[x,.32+n*.2,z],m.paper,bagPallet,.07);
  operators.push({pos:localPoint([-40,0,-19.8]),zone:'GR',angle:Math.PI});textPlate('GURY GARYNDY',3,.5,localPoint([-43,5.8,-28]),root);
  // Operators use the free aisle and the gap between the board cell and the
  // second ceiling line, outside the empty third roof bay.
  for(const [x,z,walkAxis='x'] of [[-40.3,-9],[8,-9],[48,-9],[60,-19],[-18.7,-19,'z'],[23,-26.5,'z']])operators.push({pos:localPoint([x,0,z]),zone:x< -30?'GR':'GK',angle:Math.PI,walkAxis});
  const interior=buildInteriorEquipment(k,{root,equipment,machines,network});
  flows.push(...network.connections);network.capUnused();
  const machineClocks=new Map(),machineDrives=new Map(),physics=createProcessPhysics();
  // The dryer has real entry/exit coordinates. Stop the entire shared conveyor
  // with the leading board still supported inside its mouth if it remains wet.
  function firstLegTimeAtX(worldX){
    let lo=0,hi=boardLine.motion.milestones[1].arrival;const p=new T.Vector3();
    for(let i=0;i<40;i++){const mid=(lo+hi)/2;boardLine.motion.pose(mid,p);if(p.x+8<worldX)lo=mid;else hi=mid;}
    return (lo+hi)/2;
  }
  const dryerEntry=firstLegTimeAtX(BOARD_DRYER.entryX),dryerExit=firstLegTimeAtX(BOARD_DRYER.exitX);
  const stageMap={CR:[S.infeed,S.crush,S.calcine],TY:[S.crush,S.calcine,S.mix],BS:[S.calcine,S.mix],GR:[S.mix,S.form,S.pack],GK:[S.mix,S.form,S.pack],GP:[S.form,S.pack]};
  const outdoorRotors=rotors.filter(r=>{
    for(let parent=r.object.parent;parent;parent=parent.parent)if(parent===outdoor)return true;
    return false;
  });
  function updateMotion(dt,{preview=false,stage,active,showInterior,showLines=false}){
    const scheduled=zone=>preview||stageMap[zone].includes(stage);
    const healthy=zone=>active.get(zone)?.status==='running';
    physics.update(dt,healthy);
    // A blocked packing receiver stops its upstream board conveyors. Products
    // remain on the rollers, and resume from the same pose after a restart.
    const running=zone=>scheduled(zone)&&healthy(zone)&&(!['GK','GR'].includes(zone)||physics.feedReady(healthy))&&(zone!=='GK'||healthy('GP'));
    for(const zone of Object.keys(stageMap)){
      if(!machineDrives.has(zone))machineDrives.set(zone,createDrive(.6));
      const drive=machineDrives.get(zone);
      if(!healthy(zone))drive.stop();
      drive.update(dt,(showInterior||zone==='CR')&&running(zone)?1:0);
      machineClocks.set(zone,drive.position);
    }
    plate.position.x=.8+P.jawThrowM*Math.cos((machineClocks.get('CR')||0)*rpmToRadians(P.jawRpm));
    // Hidden interior clocks already stop here. Avoid recalculating every
    // conveyor, tool and archive model at that unchanged time as well.
    if(!showInterior){
      for(const r of outdoorRotors)r.object.rotation[r.axis]=(machineClocks.get(r.zone)||0)*r.speed;
      return;
    }
    interior.update(dt,running);
    physics.state.waitingForDryer=false;
    for(const line of streamGroups){
      const allowed=showInterior&&(preview||(line.kind==='bags'?[S.mix,S.form,S.pack]:[S.form,S.pack]).includes(stage));
      if(allowed&&!line.started){
        line.started=true;
        // The guided tour compresses a 93 s board route into its short form
        // and packing chapters. Start with real sheets already on that route.
        line.time=preview?line.motion.duration:line===boardLine?line.motion.duration-(stage===S.pack?0:12):0;
      }
      const previousTime=line.time;
      if(allowed&&running(line.zone)){
        let next=line.time+line.drive.update(dt,1);
        if(line===boardLine)for(const p of line.products){
          if(p.palletizing||!p.batch)continue;
          const age=line.time-p.delay,cycle=Math.floor(age/p.period),exit=p.delay+cycle*p.period+dryerExit;
          if(age>=0&&line.time<=exit+1e-8&&next>=exit&&!boardReady(p.batch)){
            next=Math.min(next,exit);line.drive.stop();physics.state.waitingForDryer=true;
          }
        }
        // The terminal photoeye holds the conveyor until the current sheet is
        // lifted clear. Never skip a delivery when a frame or cycle takes longer.
        line.time=line===boardLine?Math.min(next,line.motion.duration+line.nextDelivery*line.interval):next;
        if(line.time<next)line.drive.stop();
      }else line.drive.stop();
      for(const table of line.tables)table.update(line.time,line.interval);
      for(const p of line.products){
        if(p.palletizing)continue; // The robot now owns this exact product.
        const age=line.time-p.delay,cycle=Math.floor(age/p.period),phase=age>=0?age%p.period:-1;
        p.object.visible=allowed&&phase>=0&&phase<=p.motion.duration+1e-8&&p.handledCycle!==cycle;
        if(!p.object.visible)continue;
        p.object.rotation.y=p.motion.pose(phase,p.object.position);
        p.object.scale.y=p.fillTime?Math.min(1,.2+.8*phase/p.fillTime):1;
        if(p.kind==='panel'){
          if(p.batchCycle!==cycle){
            p.batchCycle=cycle;p.batch=createBoardBatch();
            // Already set when cut from the continuously supported setting web.
            advanceBoard(p.batch,P.settingSeconds,{setting:true});
            if(phase>dryerEntry)advanceBoard(p.batch,Math.max(0,Math.min(phase,dryerExit)-dryerEntry)*P.thermalTimeScale,{drying:true,airC:P.dryerAirC});
          }else if(dt>0){
            const priorPhase=phase-(line.time-previousTime);
            const fraction=line.time>previousTime?Math.max(0,Math.min(phase,dryerExit)-Math.max(priorPhase,dryerEntry))/(line.time-previousTime):phase>=dryerEntry&&phase<=dryerExit+1e-8?1:0;
            advanceBoard(p.batch,dt*P.thermalTimeScale*fraction,{drying:healthy('GK')&&healthy('BS'),airC:physics.state.dryerAirC});
            if(phase>dryerExit)advanceBoard(p.batch,dt*P.thermalTimeScale*(1-fraction));
          }
          const dry=boardReady(p.batch);
          p.variants.damp.visible=!dry;p.variants.dry.visible=dry;
          p.object.userData.materialState=dry?'dry-board':'set-damp-board';
          p.object.userData.processBatch=p.batch;
        }else if(p.kind==='ceiling'){
          const cut=phase>=p.motion.milestones[3].departure,perforated=phase>=p.motion.milestones[4].departure;
          p.variants.blank.visible=!cut;p.variants.cut.visible=cut&&!perforated;p.variants.holes.visible=perforated;
          const sheetNumber=Math.round((line.time-phase)/line.interval);
          p.variants.finish.select(ceilingBatchType(sheetNumber));
          p.object.userData.panelType=p.variants.holes.userData.panelType;
          p.object.userData.materialState=perforated?'finished-ceiling-panel':cut?'cut-panel':'dry-board';
        }else{
          p.object.userData.filledKg=25*Math.min(1,phase/p.fillTime);
          p.object.userData.materialState='dry-mixture';
        }
      }
    }
    for(const {clock:line,feeder,head,homeZ,magazine} of ceilingLines){
      const sheet=line.products.find(p=>p.object.visible&&Math.abs(p.object.position.x-feeder.position.x)<.05&&p.object.position.z<=magazine.position.z+.01);
      if(sheet)head.position.z=sheet.object.position.z-feeder.position.z;
      else head.position.z+=(homeZ-head.position.z)*Math.min(1,dt*2);
    }
    const packingAllowed=showInterior&&(preview||[S.form,S.pack].includes(stage));
    if(packingAllowed&&running('GP')&&dt>0){
      const delivery=boardLine.nextDelivery,arrival=boardLine.motion.duration+delivery*boardLine.interval;
      if(boardLine.started&&boardLine.time>=arrival-1e-8){
        const product=boardLine.products[delivery%boardLine.products.length],cycle=Math.floor(delivery/boardLine.products.length);
        if(product.handledCycle!==cycle&&product.batch&&boardReady(product.batch))palletizing.accept(product,cycle);
      }
      palletizing.update(dt);
    }
    for(const r of rotors)r.object.rotation[r.axis]=(r.line?r.line.time:machineClocks.get(r.zone)||0)*r.speed;
    function tool(machine,line,start,duration){
      const t=machine.userData.processTool,phase=((line.time-start)%line.interval+line.interval)%line.interval;
      if(t)t.object.position.y=t.base-(line.started&&line.time>=start&&phase<duration?Math.sin(Math.PI*phase/duration)**2*t.travel:0);
    }
    tool(machines['board-cutter'],boardLine,0,.8);
    for(const {clock:line,layout:{id}} of ceilingLines){
      tool(interior.units[`${id}-crosscut`],line,line.motion.milestones[3].arrival,1.1);
      tool(interior.units[`${id}-perforation`],line,line.motion.milestones[4].arrival,1.2);
      tool(interior.units[`${id}-packer`],line,line.motion.milestones[6].arrival,.8);
    }
    for(const f of flows)f.dots.forEach((arrow,i)=>{
      // These are explanatory direction arrows, visible only in line view;
      // sealed pipes never display exposed rocks or liquid travelling outside.
      arrow.visible=showLines&&running(f.zone);
      if(!arrow.visible)return;
      const phase=((machineClocks.get(f.zone)||0)*f.speed/f.length+i/f.dots.length)%1;
      arrow.position.copy(f.path.getPointAt(phase));arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),f.path.getTangentAt(phase));
    });
  }
  return {root,outdoor,rotors,products,lamps,flows,operators,interiorInventory:interior.inventory,ceilingLines,palletizing,physics,updateMotion};
}
