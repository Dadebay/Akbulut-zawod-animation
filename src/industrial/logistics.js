import {haulCurve} from './landscape.js';
import {createTruckBuilder} from './trucks.js';
import {buildRail} from './rail.js';
import {createQuarryVehicles} from './quarryVehicles.js';
import {PARKED_TRUCKS} from './trafficLayout.js';
import {OLD_SIDE_LOADING} from './siteLayout.js';
import {createWorkerBuilder} from './workers.js';
import {createForkliftBuilder} from './forklift.js';
import {FORKLIFT_JOBS} from './forkliftMotion.js';

export function buildLogistics(k,operators){
  const {m,box,group}=k;
  const humans=[],vehicles=[],worker=createWorkerBuilder(k);let dispatchTruck;
  function human(position,yaw=0,zone='GP'){
    const record=worker({position,yaw,zone,seed:humans.length});humans.push(record);return record.g;
  }
  operators.forEach(o=>human(o.pos,o.angle,o.zone));
  [[33,0,-40.6],[-29,0,-40.9],[3,0,-41.2],[-108,0,-9],[83,0,4]].forEach(p=>human(p,Math.PI,'GP'));

  function pallet(parent,pos,kind='panel',dynamic=false){
    const p=group(pos,parent,dynamic);
    for(const z of [-.45,0,.45])box(1.3,.09,.16,[0,.045,z],m.wood,p);
    // Nine blocks leave real fork pockets beneath the deck in both directions.
    for(const x of [-.5,0,.5])for(const z of [-.45,0,.45])box(.16,.10,.16,[x,.14,z],m.wood,p);
    for(let z=-.5;z<=.5;z+=.2)box(1.3,.07,.15,[0,.23,z],m.wood,p);
    if(kind==='bags'){for(let y=0;y<6;y++)for(const x of [-.31,.31])for(const z of [-.27,.27]){box(.58,.19,.48,[x,.37+y*.2,z],m.paper,p,.07);box(.22,.012,.16,[x,.47+y*.2,z],m.blue,p);}}
    else {for(let i=0;i<24;i++)box(1.28,.024,1.08,[0,.31+i*.028,0],m.paper,p);for(const x of [-.42,.42])box(.045,.70,1.10,[x,.62,0],m.blue,p);}
    return p;
  }
  const truckBuilder=createTruckBuilder(k,pallet);
  function truck(pos,angle=0,_dump=false,active=false){const record=truckBuilder.build(pos,angle,active);if(active)dispatchTruck=record;return record.g;}
  const hauler=createQuarryVehicles(k).buildHauler(truckBuilder);hauler.route=haulCurve();vehicles.push(hauler);
  for(const {position,angle,scale} of PARKED_TRUCKS)truck(position,angle).scale.setScalar(scale);
  // The old hall's covered side entrance accepts a full-size articulated truck.
  truck([OLD_SIDE_LOADING.x,0,OLD_SIDE_LOADING.wallZ-7],Math.PI/2);
  truck([64,0,-43],Math.PI,false,true);

  const forklift=createForkliftBuilder(k,pallet,worker);
  const [truckFork,railForkA,railForkB]=FORKLIFT_JOBS.map((_,i)=>forklift(i));
  vehicles.push(truckFork,railForkA,railForkB);

  const {train,trainCargo,railWheels}=buildRail(k,pallet);

  // Loading stock. Keep vehicle aisles and pedestrian walkways clear.
  for(let x=5;x<29;x+=2.2)if(Math.abs(x-FORKLIFT_JOBS[2].source[0])>1.6)pallet(k.scene,[x,.6,-41.5],x%4>2?'bags':'panel');
  for(let x=-21;x<-9;x+=2.5)pallet(k.scene,[x,0,-42.3]);
  const stock=FORKLIFT_JOBS.map(({source})=>{
    box(1.8,.06,1.8,[source[0],.03,source[2]],m.concrete);
    const g=group(source,k.scene,true);g.rotation.y=Math.PI;
    return {g,panel:pallet(g,[0,0,0],'panel',true),bags:pallet(g,[0,0,0],'bags',true)};
  });
  return {humans,vehicles,pallet,hauler,dispatchTruck,train,trainCargo,railWheels,truckFork,railForkA,railForkB,stock,loadTruckModels:truckBuilder.load};
}
