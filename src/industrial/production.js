import * as T from 'three';
import {JOURNEY_STAGE as S} from '../journey.js';
import {createEquipmentModels} from './equipmentModels.js';
import {buildInteriorEquipment} from './interiorEquipment.js';
import {PROCESS_STATIONS,BOARD_ROUTE,BOARD_START,BOARD_END,BOARD_CUT_X,BOARD_DRYER,PROCESS_AISLE_Z,BAG_ROUTE,GYPSUM_CRUSHER,localPoint} from './processPlan.js';

import {createEquipmentConnections,machinePort} from './equipmentConnections.js';
import {conveyorMotion,transferTable} from './conveyorTransfer.js';
import {dryerTransferRuns,dryerBoardPose} from './dryerTransfer.js';
import {buildBoardLineHall} from './boardLineHall.js';
import {buildBeumerLine} from './beumerLine.js';
import {buildCeilingPalletizer} from './ceilingPalletizer.js';
import {PROCESS_PHYSICS as P,createDrive,createProcessPhysics,createBoardBatch,advanceBoard,boardReady,rpmToRadians,rollerAngularSpeed} from './processPhysics.js';

export const STATIONS=PROCESS_STATIONS.map(s=>({...s,pos:localPoint(s.world)}));

export function buildProduction(k){
  const {m,box,cyl,ring,rod,pipe,group,frame,platform,ladder,bolts,motor,cabinet,textPlate,material,mesh}=k;
  const rotors=[],products=[],lamps=[],flows=[],operators=[];
  const equipment=createEquipmentModels(k,rotors),machines={};
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
  STATIONS.forEach(s=>{
    const g=group(s.pos,root);g.name=`machine-${s.id}`;machines[s.id]=g;
    // The shared robot cell owns its receiver, controls and foundations.
    if(s.id==='GP')return;
    plinth(s.id==='BS'?13:s.id==='GK'?BOARD_DRYER.length+13:8,s.id==='GK'?5:7,g);
    equipment[s.id](g);g.name=`machine-${s.id}`;machines[s.id]=g;
    // A station in the south bay keeps its controls on the hall side, off the wall.
    const face=s.world[2]>-20.17&&s.world[2]<-10.5?-1:1;
    const control=cabinet([3.4,.25,3*face],g);if(face<0)control.rotation.y=Math.PI;
    for(const y of [.25,.32,.39,.46])box(.42,.014,.018,[0,y,.26],m.dark,control);
    for(const x of [-.33,.33])for(const y of [.22,1.37])box(.06,.11,.04,[x,y,.27],m.steel,control);
    const hmi=group([2.5,0,3.3*face],g);if(face<0)hmi.rotation.y=Math.PI;box(.38,.08,.4,[0,.3,0],m.dark,hmi);cyl(.055,1.15,[0,.88,0],m.steel,hmi);
    const console=group([0,1.55,0],hmi);console.rotation.x=-.22;box(.55,.38,.12,[0,0,0],equipment.enamel,console,.03);box(.37,.22,.018,[-.04,.025,.07],m.black,console,.012);box(.32,.17,.01,[-.04,.025,.083],m.blueLight,console);
    for(let n=0;n<3;n++)box(.2,.012,.008,[-.06,.07-n*.045,.091],m.white,console);
    const stop=cyl(.048,.045,[.2,-.1,.09],m.red,console);stop.rotation.x=Math.PI/2;
    pipe([[3.4,.45,2.85*face],[3.4,.28,2.4*face],[2,.28,2.4*face],[2,.4,1.5*face]],.035,m.black,g);
    operators.push({pos:[s.pos[0]+(s.id==='GK'?-4:3),s.pos[1]+.25,s.pos[2]+4.4*face],zone:s.id,angle:face>0?Math.PI:0});
    const lm=material('#3ca878',.1,.3,{unique:true,emissive:'#3ca878',emissiveIntensity:.3});const lamp=group([3.4,2.1,3*face],g,true);cyl(.055,.3,[0,0,0],m.dark,lamp);cyl(.07,.12,[0,.2,0],lm,lamp);lamps.push({mat:lm,zone:s.id});
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
      if(kind==='track'&&d.x<-.99&&Math.abs(mid.z-BOARD_DRYER.z)<.001){
        // The dryer owns the five roller decks between these two joints.
        // Stop the blue single-level conveyor at each outer frame instead of
        // drawing it through the insulated tunnel and across its open mouths.
        const entry=BOARD_DRYER.entryX+BOARD_DRYER.entryApron;
        const exit=BOARD_DRYER.exitX-BOARD_DRYER.exitApron;
        for(const [from,to,name] of [[a.x,entry,'board-dryer-approach'],[exit,b.x,'board-dryer-discharge']]){
          if(from-to<.24)continue;
          const table=conveyor((from+to)/2-8,mid.z+25,from-to,width,zone,kind);
          table.rotation.y=Math.PI;table.name=name;
        }
        continue;
      }
      const table=conveyor(mid.x-8,mid.z+25,length,width,zone,kind);table.rotation.y=-Math.atan2(d.z,d.x);
    }
    return rotors.slice(firstDrive);
  }
  const streamGroups=[];
  function stream(points,kind,zone,interval,options){
    const motion=conveyorMotion(points.map(localPoint),options),count=Math.ceil((motion.duration+.6)/interval)+1;
    const line={motion,kind,zone,interval,time:0,started:false,drive:createDrive(1.5),products:[],tables:[]};
    const size=kind==='bags'?1.7:3,productLength=kind==='bags'?.75:2.4;
    motion.turns.forEach(corner=>line.tables.push(transferTable(k,corner,{parent:root,size,top:kind==='bags'?points[1][1]:1.175,name:kind==='bags'?'beumer-bag-transfer-corner':undefined,clearTime:(size/2+productLength/2)/options.speed+options.speed/(2*(options.acceleration||2.4))})));
    for(let i=0;i<count;i++){
      const product=group([0,0,0],root,true),variants={};
      if(kind==='panel'){
        for(const state of ['damp','dry']){
          const g=group([0,0,0],product,true);variants[state]=g;
          box(2.4,.03,1.2,[0,.02,0],state==='dry'?m.paper:m.raw,g,.006);
          box(2.4,.001,.025,[0,.0345,.59],m.blueLight,g);
        }
      }else{box(.75,.23,.46,[0,.12,0],m.paper,product,.10);box(.45,.012,.20,[0,.24,0],m.blue,product);}
      const record={object:product,variants,motion,delay:i*interval,period:count*interval,fillTime:options.startHold||0,kind,zone,deckIndex:kind==='panel'?i%BOARD_DRYER.decks:0};
      product.visible=false;products.push(record);line.products.push(record);
    }
    streamGroups.push(line);return line;
  }
  const cut=[BOARD_CUT_X,1.18,BOARD_START[2]];
  const boardProducts=[[cut[0]+1.2,cut[1],cut[2]],...BOARD_ROUTE.slice(1)];
  // A continuous paper-faced web sets on a supported belt before the cutter.
  // Discrete boards are born at the cut, and only become dry after the dryer.
  const settingLength=cut[0]-BOARD_START[0],settingMid=(cut[0]+BOARD_START[0])/2;
  box(settingLength,.035,1.2,localPoint([settingMid,1.202,BOARD_START[2]]),m.paper,root);
  box(settingLength,.035,2.3,localPoint([settingMid,1.16,BOARD_START[2]]),m.rubber,root);
  for(const z of [-.60,.60])box(settingLength,.028,.025,localPoint([settingMid,1.23,BOARD_START[2]+z]),m.raw,root);
  // The receiving lift supports the final sheet; fixed rollers end at its edge.
  const boardDrives=routedTrack([...BOARD_ROUTE.slice(0,-1),[BOARD_END[0],BOARD_END[1],BOARD_END[2]+1.48]],2.6,3,'track');
  // Keep successive sheets separated through the shared five-to-one throat.
  const boardLine=stream(boardProducts,'panel','GK',BOARD_DRYER.boardInterval,{speed:P.boardSpeed,turnTime:1,startHold:.8});
  boardDrives.forEach(drive=>{drive.line=boardLine;});
  buildBoardLineHall(k,{root,equipment});
  const {palletizer,bagStock,updateBeumer}=buildBeumerLine(k,{root,equipment});
  const ceilingPalletizer=buildCeilingPalletizer(k,{parent:root,equipment});
  // Filled bags ride the elevated BEUMER feed from the big process building.
  const bagLine=stream(BAG_ROUTE,'bags','GR',4.6,{speed:P.bagSpeed,turnTime:.6,startHold:1.1});
  operators.push({pos:localPoint([-36,0,PROCESS_AISLE_Z-.6]),zone:'GR',angle:Math.PI});
  // Operators use the free aisles beside the board line, outside the empty
  // part of the railway-side bay.
  for(const [x,z,walkAxis='x'] of [[-33.2,-10.6],[8,-9],[48,-9],[60,PROCESS_AISLE_Z-.6],[-18.7,PROCESS_AISLE_Z-.6,'z'],[BOARD_DRYER.x,PROCESS_AISLE_Z]])operators.push({pos:localPoint([x,0,z]),zone:x< -30?'GR':'GK',angle:Math.PI,walkAxis});
  const interior=buildInteriorEquipment(k,{root,equipment,machines,network});
  flows.push(...network.connections);network.capUnused();
  const machineClocks=new Map(),machineDrives=new Map(),physics=createProcessPhysics();
  // The dryer has real entry/exit coordinates. Stop the entire shared conveyor
  // with the leading board still supported inside its mouth if it remains wet.
  // The dryer sits on the westbound middle-bay leg after the wet transfer.
  function dryerLegTimeAtX(worldX){
    const {milestones}=boardLine.motion,leg=boardProducts.findIndex((p,i)=>i>0&&p[2]===BOARD_DRYER.z&&boardProducts[i-1][2]===BOARD_DRYER.z&&worldX<=boardProducts[i-1][0]&&worldX>=p[0])-1;
    const sign=Math.sign(boardProducts[leg+1][0]-boardProducts[leg][0]);
    let lo=milestones[leg].departure,hi=milestones[leg+1].arrival;const p=new T.Vector3();
    for(let i=0;i<40;i++){const mid=(lo+hi)/2;boardLine.motion.pose(mid,p);if((p.x+8-worldX)*sign<0)lo=mid;else hi=mid;}
    return (lo+hi)/2;
  }
  const dryerEntry=dryerLegTimeAtX(BOARD_DRYER.entryX),dryerExit=dryerLegTimeAtX(BOARD_DRYER.exitX);
  const dryerMerges=dryerTransferRuns().map(run=>({...run,tongues:Array.from({length:BOARD_DRYER.decks},(_,i)=>machines.GK.getObjectByName(`${run.name}-tongue-${i+1}`))}));
  const stageMap={CR:[S.infeed,S.crush,S.calcine],TY:[S.crush,S.calcine,S.mix],BS:[S.calcine,S.mix],GR:[S.mix,S.form,S.pack],GK:[S.mix,S.form,S.pack],GP:[S.form,S.pack]};
  const outdoorRotors=rotors.filter(r=>{
    for(let parent=r.object.parent;parent;parent=parent.parent)if(parent===outdoor)return true;
    return false;
  });
  function updateMotion(dt,{preview=false,stage,active,showInterior,showLines=false,showFlowZone=null}){
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
    palletizer.update(dt,running('GP'));
    bagStock.update(dt,healthy('GP'));
    ceilingPalletizer.update(dt,scheduled('GK')&&healthy('GK'));
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
      if(allowed&&running(line.zone)&&(line!==bagLine||healthy('GP'))){
        let next=line.time+line.drive.update(dt,1);
        if(line===boardLine)for(const p of line.products){
          const age=line.time-p.delay;if(age<0)continue;
          const cycle=Math.floor(age/p.period),exit=p.delay+cycle*p.period+dryerExit;
          if(p.batch&&line.time<=exit+1e-8&&next>=exit&&!boardReady(p.batch)){
            next=Math.min(next,exit);line.drive.stop();physics.state.waitingForDryer=true;
          }
          const arrival=p.delay+cycle*p.period+line.motion.duration;
          if(p.handledCycle!==cycle&&line.time<=arrival+1e-8&&next>=arrival){
            next=Math.min(next,arrival);
            if(!palletizer.canAccept())line.drive.stop();
          }
        }
        if(line===bagLine)for(const p of line.products){
          const age=line.time-p.delay;if(age<0)continue;
          const cycle=Math.floor(age/p.period),arrival=p.delay+cycle*p.period+line.motion.duration;
          if(p.handledCycle!==cycle&&line.time<=arrival+1e-8&&next>=arrival){
            next=Math.min(next,arrival);
            if(!bagStock.canAccept())line.drive.stop();
          }
        }
        line.time=next;
      }else line.drive.stop();
      for(const table of line.tables)table.update(line.time,line.interval);
      for(const p of line.products){
        const age=line.time-p.delay,cycle=Math.floor(age/p.period),phase=age>=0?age%p.period:-1;
        p.object.visible=allowed&&phase>=0&&phase<=p.motion.duration+1e-8&&p.handledCycle!==cycle;
        if(!p.object.visible)continue;
        p.object.rotation.y=p.motion.pose(phase,p.object.position);
        if(p.kind==='panel'){
          p.object.rotation.z=0;
          if(Math.abs(p.object.position.z-25-BOARD_DRYER.z)<.01){
            const pose=dryerBoardPose(p.object.position.x+8,p.deckIndex);
            p.object.position.y=pose.height;p.object.rotation.z=pose.pitch;
          }
        }
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
          if(line===boardLine&&phase>=line.motion.duration-1e-8&&p.handledCycle!==cycle&&running('GP')&&dry&&palletizer.accept(p.batch,p.object)){
            p.handledCycle=cycle;p.object.visible=false;
          }
        }else{
          p.object.userData.filledKg=25*Math.min(1,phase/p.fillTime);
          p.object.userData.materialState='dry-mixture';
          if(line===bagLine&&phase>=line.motion.duration-1e-8&&p.handledCycle!==cycle&&healthy('GP')&&bagStock.accept()){
            p.handledCycle=cycle;p.object.visible=false;
          }
        }
      }
    }
    updateBeumer(dt,healthy('GP'));
    // The five visible branch profiles converge at a single powered throat.
    // Only the selected tongue occupies that shared space under the sheet.
    for(const run of dryerMerges){
      const sheet=boardLine.products.find(p=>p.object.visible&&Math.abs(p.object.position.z-25-BOARD_DRYER.z)<.01&&
        p.object.position.x+8>=Math.min(run.floorX,run.deckX)-1.2&&p.object.position.x+8<=Math.max(run.floorX,run.deckX)+1.2);
      run.tongues.forEach((tongue,i)=>{tongue.visible=i===(sheet?.deckIndex??0);});
    }
    for(const r of rotors)r.object.rotation[r.axis]=(r.line?r.line.time:machineClocks.get(r.zone)||0)*r.speed;
    function tool(machine,line,start,duration){
      const t=machine.userData.processTool,phase=((line.time-start)%line.interval+line.interval)%line.interval;
      if(t)t.object.position.y=t.base-(line.started&&line.time>=start&&phase<duration?Math.sin(Math.PI*phase/duration)**2*t.travel:0);
    }
    tool(machines['board-cutter'],boardLine,0,.8);
    for(const f of flows)f.dots.forEach((arrow,i)=>{
      // These are explanatory direction arrows, visible in line view or when
      // the corresponding machine is inspected up close;
      // sealed pipes never display exposed rocks or liquid travelling outside.
      arrow.visible=(showLines||showFlowZone===f.zone)&&running(f.zone);
      if(!arrow.visible)return;
      const phase=((machineClocks.get(f.zone)||0)*f.speed/f.length+i/f.dots.length)%1;
      arrow.position.copy(f.path.getPointAt(phase));arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),f.path.getTangentAt(phase));
    });
  }
  return {root,outdoor,rotors,products,lamps,flows,operators,interiorInventory:interior.inventory,palletizing:palletizer,bagStock,ceilingPalletizing:ceilingPalletizer,physics,updateMotion};
}
