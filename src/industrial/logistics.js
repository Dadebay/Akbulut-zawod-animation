import {SHIFT_WALKS,OLD_HALL_WALKS,oldForkMotion,operatorWork} from './campusLife.js';
import {haulCurve} from './landscape.js';
import {createTruckBuilder} from './trucks.js';
import {buildRail} from './rail.js';
import {createQuarryVehicles} from './quarryVehicles.js';
import {PARKED_TRUCKS} from './trafficLayout.js';
import {OLD_SIDE_LOADING,RAIL_SIDE_LOADING as LOADING} from './siteLayout.js';
import {createWorkerBuilder} from './workers.js';
import {createForkliftBuilder} from './forklift.js';
import {FORKLIFT_JOBS} from './forkliftMotion.js';
import {WALK_ROUTES} from './pedestrianMotion.js';
import {buildServiceTraffic} from './serviceTraffic.js';

export function buildLogistics(k,operators){
  const {m,box,group}=k;
  const greenFace=k.material('#a8cbb9',.06,.86),greenEdge=k.material('#c4dfd0',.03,.88);
  const humans=[],vehicles=[],worker=createWorkerBuilder(k);let dispatchTruck;
  function human(position,yaw=0,zone='GP'){
    const record=worker({position,yaw,zone,seed:humans.length});humans.push(record);return record.g;
  }
  operators.forEach((o,i)=>humans.push(worker({position:o.pos,yaw:o.angle+(i%3-1)*.35,zone:o.zone,seed:i,work:operatorWork(o.pos,i,o.walkAxis)})));
  [...SHIFT_WALKS,...OLD_HALL_WALKS].forEach((walk,i)=>humans.push(worker({walk,seed:i+20,zone:'GP'})));
  WALK_ROUTES.forEach(walk=>humans.push(worker({walk,seed:humans.length,zone:'GP'})));
  human([83,0,4],Math.PI,'GP');
  const traffic=buildServiceTraffic(k);

  function pallet(parent,pos,kind='panel',dynamic=false){
    const p=group(pos,parent,dynamic);
    for(const z of [-.45,0,.45])box(1.3,.09,.16,[0,.045,z],m.wood,p);
    // Nine blocks leave real fork pockets beneath the deck in both directions.
    for(const x of [-.5,0,.5])for(const z of [-.45,0,.45])box(.16,.10,.16,[x,.14,z],m.wood,p);
    for(let z=-.5;z<=.5;z+=.2)box(1.3,.07,.15,[0,.23,z],m.wood,p);
    if(kind==='bags'){for(let y=0;y<6;y++)for(const x of [-.31,.31])for(const z of [-.27,.27]){box(.58,.19,.48,[x,.37+y*.2,z],m.paper,p,.07);box(.22,.012,.16,[x,.47+y*.2,z],m.blue,p);}}
    else {
      const coloured=kind==='green';
      const sheets=coloured?30:24,pitch=coloured?.038:.028,thickness=coloured?.034:.024,strapHeight=coloured?1.15:.70;
      for(let i=0;i<sheets;i++)box(1.28,thickness,1.08,[0,.31+i*pitch,0],coloured?(i===sheets-1?greenFace:greenEdge):m.paper,p);
      for(const x of [-.42,.42])box(.045,strapHeight,1.10,[x,.27+strapHeight/2,0],coloured?m.white:m.blue,p);
    }
    return p;
  }
  const truckBuilder=createTruckBuilder(k,pallet);
  function truck(pos,angle=0,_dump=false,active=false){const record=truckBuilder.build(pos,angle,active);if(active)dispatchTruck=record;return record.g;}
  const hauler=createQuarryVehicles(k).buildHauler(truckBuilder);hauler.route=haulCurve();vehicles.push(hauler);
  for(const {position,angle,scale} of PARKED_TRUCKS)truck(position,angle).scale.multiplyScalar(scale);
  // The old hall's covered side entrance accepts an articulated truck.
  // The truck drives in through the open left and right ends of the shed, whose front is closed.
  truck([OLD_SIDE_LOADING.x-6.2,0,OLD_SIDE_LOADING.wallZ+OLD_SIDE_LOADING.depth/2],Math.PI);
  truck([64,0,-43],Math.PI,false,true);

  const forklift=createForkliftBuilder(k,pallet,worker);
  const [truckFork,railForkA,railForkB]=FORKLIFT_JOBS.map((_,i)=>forklift(i));
  vehicles.push(truckFork,railForkA,railForkB);
  const oldFork=forklift(3),oldPose=oldForkMotion();oldFork.update(oldPose(0),0);

  const {train,trainCargo,railWheels,updateArrival}=buildRail(k,pallet);

  // Each green stack is a real pallet-sized load. The rail forklift lifts
  // these exact bays; the second forklift restores an empty bay on deposit.
  const panelStocks=group([0,LOADING.platform.height,0]);panelStocks.name='rail-loading-panel-stocks';
  const greenStock=LOADING.panelBays.map(({x},i)=>{
    const p=pallet(panelStocks,[x,.06,LOADING.panelRows[0]],'green',true);
    p.name=`rail-green-pallet-${i+1}`;return p;
  });
  const stock=FORKLIFT_JOBS.map(({source},i)=>{
    if(i!==1)box(1.8,.06,1.8,[source[0],source[1]-.03,source[2]],m.concrete);
    const g=group(source,k.scene,true);g.rotation.y=Math.PI;
    return {g,panel:pallet(g,[0,0,0],i===2?'green':'panel',true),bags:pallet(g,[0,0,0],'bags',true)};
  });
  return {humans,traffic,oldFork,updateArrival,updateOldLife:time=>oldFork.update(oldPose(time),time),vehicles,pallet,hauler,dispatchTruck,train,trainCargo,railWheels,truckFork,railForkA,railForkB,stock,greenStock,loadTruckModels:truckBuilder.load,setTruckInteriorVisible:truckBuilder.setInteriorVisible};
}
