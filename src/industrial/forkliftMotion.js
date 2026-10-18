import * as T from 'three';
import {TRUCK_LAYOUT} from './trucks.js';
import {RAIL_LAYOUT} from './railLayout.js';
import {routeProfile} from './motionPath.js';

export const FORKLIFT_LAYOUT={
  cargoX:2.10,mastX:.92,mastBaseY:.24,palletOffsetY:-.135,
  frontAxleX:.60,rearAxleX:-.90,frontRadius:.33,rearRadius:.27,
  carryHeight:.46,emptyHeight:.125,turnRadius:1.6,
};
const F=FORKLIFT_LAYOUT;
export const FORKLIFT_WHEELS=[0,F.rearAxleX-F.frontAxleX].flatMap(axle=>[-.56,.56].map(side=>({axle,side})));
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const vector=p=>new T.Vector3(p[0],0,p[1]);
const line=(a,b)=>new T.LineCurve3(vector(a),vector(b));
function turn(x,z,direction){
  const r=F.turnRadius,k=.5522847498307936*r;
  return new T.CubicBezierCurve3(vector([x-r,z]),vector([x-r+k,z]),vector([x,z+direction*(r-k)]),vector([x,z+direction*r]));
}
function path(...parts){const p=new T.CurvePath();parts.forEach(part=>p.add(part));return p;}
function heading(route,t){const d=route.getTangentAt(clamp(t));return -Math.atan2(d.z,d.x);}

function makeTrip(source,target,laneZ,{pickupClearance=F.emptyHeight,carryHeight=F.carryHeight}={}){
  const r=F.turnRadius,staging=[source[0]-r,laneZ],pickupZ=source[2]-F.cargoX+F.frontAxleX;
  const direction=target.rail?-1:1,alignZ=laneZ+direction*r;
  const dockZ=target.z-direction*(F.cargoX-F.frontAxleX);
  const pickupTurn=path(turn(source[0],laneZ,1));
  const pickupStraight=path(line([source[0],laneZ+r],[source[0],pickupZ]));
  const pickup=path(...pickupTurn.curves,...pickupStraight.curves);
  const approach=path(line(staging,[target.x-r,laneZ]),turn(target.x,laneZ,direction));
  const insertion=path(line([target.x,alignZ],[target.x,dockZ]));
  const contactHeight=source[1]-F.palletOffsetY,dropHeight=target.y-F.palletOffsetY;
  const phases=[];let time=0,travel=0,wheelTravel=FORKLIFT_WHEELS.map(()=>0),bend=0,pose={x:staging[0]-F.frontAxleX,z:staging[1],yaw:0},height=F.emptyHeight,tilt=0,carrying=false,picked=false;
  function add(duration,options={}){
    const phase={start:time,duration,travel,wheelTravel:[...wheelTravel],bend,pose:{...pose},height,tilt,carrying,picked,...options};
    phases.push(phase);time+=duration;
    height=options.toHeight??height;tilt=options.toTilt??tilt;bend=options.toBend??bend;
    if(options.route){
      const end=options.reverse?0:1,p=options.route.getPointAt(end);
      const yaw=heading(options.route,end);
      pose={x:p.x-F.frontAxleX*Math.cos(yaw),z:p.z+F.frontAxleX*Math.sin(yaw),yaw};
      bend=options.profile.at(options.reverse?0:options.profile.duration).curvature;
      wheelTravel=wheelTravel.map((d,i)=>d+(options.reverse?-1:1)*options.profile.wheelTravel[i]);
      travel+=(options.reverse?-1:1)*options.route.getLength();
    }
  }
  function drive(route,maxSpeed,reverse=false){
    const profile=routeProfile(route,{speed:maxSpeed,acceleration:carrying?.65:.85,lateral:carrying?.48:.70,wheels:FORKLIFT_WHEELS});
    const initialBend=profile.at(reverse?profile.duration:0).curvature;
    if(Math.abs(initialBend-bend)>.03)add(.4,{toBend:initialBend,lookBack:reverse});
    add(profile.duration,{route,profile,reverse});
  }
  if(pickupClearance>F.emptyHeight){
    // Clear the adjacent raised dock while turning, then lower the empty tines
    // in the open aisle before inserting them into the ground-level pallet.
    add((pickupClearance-F.emptyHeight)/.5,{toHeight:pickupClearance});
    drive(pickupTurn,.75);
    add((pickupClearance-F.emptyHeight)/.5,{toHeight:F.emptyHeight});
    drive(pickupStraight,.55);
  }else drive(pickup,.85);
  add(.45);
  add(.6,{toHeight:contactHeight});
  picked=true;carrying=true;
  add(Math.max(1.35,(carryHeight-contactHeight)/.5),{toHeight:carryHeight});
  add(.65,{toTilt:.055,lookBack:true});
  drive(pickup,1.25,true);
  add(.6);
  drive(approach,1.8);
  add(.65,{toTilt:0});
  add((dropHeight+.10-carryHeight)/.50,{toHeight:dropHeight+.10});
  drive(insertion,.55);
  add(.9,{toHeight:dropHeight});
  const depositAt=time;
  carrying=false;
  add(.55,{toHeight:dropHeight-.035,lookBack:true});
  drive(insertion,.65,true);
  add((dropHeight-.035-F.emptyHeight)/.55,{toHeight:F.emptyHeight,lookBack:true});
  drive(approach,1.8,true);
  add(.7);
  return {phases,duration:time,depositAt,source,target,staging};
}
function job(source,laneZ,targets,options){
  let time=0;
  const trips=targets.map(target=>{const trip=makeTrip(source,target,laneZ,options);trip.start=time;time+=trip.duration;return trip;});
  return {source,trips,duration:time};
}
const truckTargets=TRUCK_LAYOUT.cargoXs.map((x,i)=>({
  x:64-TRUCK_LAYOUT.kingpinX-TRUCK_LAYOUT.trailerOffsetX-x,y:TRUCK_LAYOUT.deckHeight,
  z:-43-TRUCK_LAYOUT.cargoZ,kind:i<3?'panel':'bags',index:i,rail:false,
}));
const railTargets=RAIL_LAYOUT.wagonCentres.flatMap((x,n)=>RAIL_LAYOUT.cargoXs.map((offset,i)=>({
  x:x+offset,y:RAIL_LAYOUT.deckHeight,z:RAIL_LAYOUT.z+RAIL_LAYOUT.cargoZ,
  kind:n%2?'bags':'panel',index:n*2+i,rail:true,
})));
export const FORKLIFT_JOBS=[
  job([51,.06,-43],-48.8,truckTargets),
  job([-24,.06,-41.7],-46.7,railTargets.slice(0,4)),
  job([11.5,.06,-41.7],-46.7,railTargets.slice(4),{pickupClearance:.70,carryHeight:.85}),
];
export const LOADING_DURATION=Math.ceil(Math.max(...FORKLIFT_JOBS.map(j=>j.duration))+2);
export function loadingCounts(elapsed){
  const counts=FORKLIFT_JOBS.map(j=>j.trips.filter(t=>elapsed>=t.start+t.depositAt).length);
  return {truck:counts[0],rail:counts.slice(1),train:counts[1]+counts[2]};
}

export function sampleForklift(job,elapsed){
  const working=elapsed>=0&&elapsed<job.duration;
  const trip=job.trips.find(t=>elapsed<t.start+t.duration)||job.trips.at(-1);
  const t=Math.max(0,Math.min(trip.duration,elapsed-trip.start));
  const phaseIndex=trip.phases.findIndex(p=>t<p.start+p.duration);
  const phase=trip.phases[phaseIndex<0?trip.phases.length-1:phaseIndex];
  const local=Math.max(0,Math.min(phase.duration,t-phase.start)),progress=local/phase.duration;
  let {x,z,yaw}=phase.pose,speed=0,travel=phase.travel,wheelTravel=phase.wheelTravel,curvature=mix(phase.bend,phase.toBend??phase.bend,ease(progress));
  if(phase.route){
    const motion=phase.profile.at(phase.reverse?phase.duration-local:local),sign=phase.reverse?-1:1;
    const p=phase.route.getPointAt(clamp(motion.u));
    yaw=heading(phase.route,motion.u);
    // The unsteered front axle follows the path; the chassis and rear axle
    // follow that axle, so reversing cannot slide the vehicle sideways.
    x=p.x-F.frontAxleX*Math.cos(yaw);z=p.z+F.frontAxleX*Math.sin(yaw);
    speed=motion.speed*sign;curvature=motion.curvature;
    travel+=phase.reverse?motion.distance-phase.profile.length:motion.distance;
    wheelTravel=phase.wheelTravel.map((d,i)=>d+motion.wheelTravel[i]-(phase.reverse?phase.profile.wheelTravel[i]:0));
  }
  const lookingBack=phase.reverse||phase.lookBack;
  const previous=trip.phases[(phaseIndex<0?trip.phases.length-1:phaseIndex)-1];
  const wasLookingBack=previous?.reverse||previous?.lookBack;
  return {
    x,z,yaw,speed,travel,wheelTravel,curvature,steer:-Math.atan((F.frontAxleX-F.rearAxleX)*curvature),kind:trip.target.kind,working,
    height:mix(phase.height,phase.toHeight??phase.height,ease(progress)),
    tilt:mix(phase.tilt,phase.toTilt??phase.tilt,ease(progress)),
    carrying:working&&phase.carrying,
    stockVisible:elapsed<0||(working&&!phase.picked),
    reverse:working&&!!phase.reverse,
    lookBack:mix(wasLookingBack?1:0,lookingBack?1:0,ease(local/.4)),
  };
}
