import * as T from 'three';
import {TRUCK_LAYOUT} from './trucks.js';
import {RAIL_LAYOUT} from './rail.js';

export const FORKLIFT_LAYOUT={
  cargoX:2.10,mastX:.92,mastBaseY:.24,palletOffsetY:-.135,
  frontAxleX:.60,rearAxleX:-.90,frontRadius:.33,rearRadius:.27,
  carryHeight:.46,emptyHeight:.125,turnRadius:1.6,
};
const F=FORKLIFT_LAYOUT,clamp=n=>Math.max(0,Math.min(1,n));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const vector=p=>new T.Vector3(p[0],0,p[1]);
const line=(a,b)=>new T.LineCurve3(vector(a),vector(b));
function turn(x,z,direction){
  const r=F.turnRadius,k=.5522847498307936*r;
  return new T.CubicBezierCurve3(vector([x-r,z]),vector([x-r+k,z]),vector([x,z+direction*(r-k)]),vector([x,z+direction*r]));
}
function path(...parts){const p=new T.CurvePath();parts.forEach(part=>p.add(part));return p;}
function heading(route,t){const d=route.getTangentAt(clamp(t));return -Math.atan2(d.z,d.x);}

// Distance-driven acceleration/braking, shared by forward and reverse travel.
// Reversing samples the same path backwards without turning the chassis around.
function driveProfile(length,maxSpeed,acceleration=.85){
  const peak=Math.min(maxSpeed,Math.sqrt(length*acceleration)),ramp=peak/acceleration;
  const cruise=Math.max(0,(length-peak*peak/acceleration)/peak),duration=ramp*2+cruise;
  return {duration,at(t){
    t=Math.max(0,Math.min(duration,t));
    if(t<ramp)return {distance:.5*acceleration*t*t,speed:acceleration*t};
    if(t<ramp+cruise)return {distance:.5*peak*ramp+peak*(t-ramp),speed:peak};
    const remaining=duration-t;
    return {distance:length-.5*acceleration*remaining*remaining,speed:acceleration*remaining};
  }};
}

function makeTrip(source,target,laneZ,{pickupClearance=F.emptyHeight,carryHeight=F.carryHeight}={}){
  const r=F.turnRadius,staging=[source[0]-r,laneZ],pickupZ=source[2]-F.cargoX;
  const direction=target.rail?-1:1,alignZ=laneZ+direction*r;
  const dockZ=target.z-direction*F.cargoX;
  const pickupTurn=path(turn(source[0],laneZ,1));
  const pickupStraight=path(line([source[0],laneZ+r],[source[0],pickupZ]));
  const pickup=path(...pickupTurn.curves,...pickupStraight.curves);
  const approach=path(line(staging,[target.x-r,laneZ]),turn(target.x,laneZ,direction));
  const insertion=path(line([target.x,alignZ],[target.x,dockZ]));
  const contactHeight=source[1]-F.palletOffsetY,dropHeight=target.y-F.palletOffsetY;
  const phases=[];let time=0,travel=0,pose={x:staging[0],z:staging[1],yaw:0},height=F.emptyHeight,tilt=0,carrying=false,picked=false;
  function add(duration,options={}){
    const phase={start:time,duration,travel,pose:{...pose},height,tilt,carrying,picked,...options};
    phases.push(phase);time+=duration;
    height=options.toHeight??height;tilt=options.toTilt??tilt;
    if(options.route){
      const end=options.reverse?0:1,p=options.route.getPointAt(end);
      pose={x:p.x,z:p.z,yaw:heading(options.route,end)};
      travel+=(options.reverse?-1:1)*options.route.getLength();
    }
  }
  function drive(route,maxSpeed,reverse=false){const profile=driveProfile(route.getLength(),maxSpeed);add(profile.duration,{route,profile,reverse});}
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
  let {x,z,yaw}=phase.pose,speed=0,steer=0,travel=phase.travel;
  if(phase.route){
    const motion=phase.profile.at(local),length=phase.route.getLength(),sign=phase.reverse?-1:1;
    const u=phase.reverse?1-motion.distance/length:motion.distance/length,p=phase.route.getPointAt(clamp(u));
    x=p.x;z=p.z;yaw=heading(phase.route,u);speed=motion.speed*sign;travel+=motion.distance*sign;
    const low=clamp(u-.35/length),high=clamp(u+.35/length);
    const curvature=angleDelta(heading(phase.route,low),heading(phase.route,high))/((high-low)*length||1);
    steer=-Math.atan((F.frontAxleX-F.rearAxleX)*curvature);
  }
  const lookingBack=phase.reverse||phase.lookBack;
  const previous=trip.phases[(phaseIndex<0?trip.phases.length-1:phaseIndex)-1];
  const wasLookingBack=previous?.reverse||previous?.lookBack;
  return {
    x,z,yaw,speed,travel,steer,kind:trip.target.kind,working,
    height:mix(phase.height,phase.toHeight??phase.height,ease(progress)),
    tilt:mix(phase.tilt,phase.toTilt??phase.tilt,ease(progress)),
    carrying:working&&phase.carrying,
    stockVisible:elapsed<0||(working&&!phase.picked),
    reverse:working&&!!phase.reverse,
    lookBack:mix(wasLookingBack?1:0,lookingBack?1:0,ease(local/.4)),
  };
}
