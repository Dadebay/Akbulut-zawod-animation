import * as T from 'three';
import {TRUCK_LAYOUT,TRUCK_SCALE} from './trucks.js';
import {RAIL_LAYOUT} from './railLayout.js';
import {routeProfile} from './motionPath.js';
import {RAIL_SIDE_LOADING as LOADING} from './siteLayout.js';

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

function makeTrip(source,target,laneZ,{pickupClearance=F.emptyHeight,carryHeight=F.carryHeight,park,base=0}={}){
  const r=F.turnRadius,staging=[source[0]-r,laneZ],pickupZ=source[2]-F.cargoX+F.frontAxleX;
  const direction=target.rail?-1:1,alignZ=laneZ+direction*r;
  const dockZ=target.z-direction*(F.cargoX-F.frontAxleX);
  const pickupTurn=path(turn(source[0],laneZ,1));
  const pickupStraight=path(line([source[0],laneZ+r],[source[0],pickupZ]));
  const pickup=path(...pickupTurn.curves,...pickupStraight.curves);
  const approach=path(line(staging,[target.x-r,laneZ]),turn(target.x,laneZ,direction));
  const insertion=path(line([target.x,alignZ],[target.x,dockZ]));
  // Fork heights are measured from the floor the forklift stands on.
  const contactHeight=source[1]-base-F.palletOffsetY,dropHeight=target.y-base-F.palletOffsetY;
  const insertionHeight=Math.max(F.emptyHeight,contactHeight-.07);
  const turnHeight=Math.max(pickupClearance,insertionHeight);
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
  if(turnHeight>F.emptyHeight){
    // Approach a raised pallet at its fork pockets, keeping the chassis on
    // the lower apron and the tines above the concrete dock edge.
    add((turnHeight-F.emptyHeight)/.5,{toHeight:turnHeight});
    drive(pickupTurn,.75);
    if(turnHeight>insertionHeight)add((turnHeight-insertionHeight)/.5,{toHeight:insertionHeight});
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
  if(park){
    const [px,pz]=park,entry=px-2*r,k=.5522847498307936*r;
    // Finish all loading before vacating the dispatch lane into a parallel bay.
    if(entry<staging[0])drive(path(line([entry,laneZ],staging)),1.2,true);
    else drive(path(line(staging,[entry,laneZ])),1.2);
    const parking=path(turn(px-r,laneZ,1),line([px-r,laneZ+r],[px-r,pz-r]),
      new T.CubicBezierCurve3(vector([px-r,pz-r]),vector([px-r,pz-r+k]),vector([px-k,pz]),vector([px,pz])));
    drive(parking,.8);
  }
  add(.7);
  return {phases,duration:time,depositAt,source,target,staging};
}
function job(source,laneZ,targets,options={}){
  let time=0;
  const trips=targets.map((target,i)=>{const trip=makeTrip(source,target,laneZ,{...options,park:i===targets.length-1?options.park:undefined});trip.start=time;time+=trip.duration;return trip;});
  return {source,trips,duration:time,base:options.base||0};
}
// The rail forklifts work on the raised deck; the truck is loaded on the ground.
const DECK=LOADING.platform.height;
const truckTargets=TRUCK_LAYOUT.cargoXs.map((x,i)=>({
  x:64-TRUCK_SCALE*(TRUCK_LAYOUT.kingpinX+TRUCK_LAYOUT.trailerOffsetX+x),y:TRUCK_SCALE*TRUCK_LAYOUT.deckHeight,
  z:-43-TRUCK_SCALE*TRUCK_LAYOUT.cargoZ,kind:i<3?'panel':'bags',index:i,rail:false,
}));
const railTargets=RAIL_LAYOUT.wagonCentres.flatMap((x,n)=>RAIL_LAYOUT.cargoXs.map((offset,i)=>({
  x:RAIL_LAYOUT.offsetX+(x+offset)*RAIL_LAYOUT.scale,y:RAIL_LAYOUT.deckHeight*RAIL_LAYOUT.scale,z:RAIL_LAYOUT.z+RAIL_LAYOUT.cargoZ,
  kind:n%2?'bags':'panel',index:n*2+i,rail:true,
})));
export const FORKLIFT_JOBS=[
  job([61.2,.06,-43],-48.4,truckTargets,{park:[78,-43.2]}),
  job([-1.1,DECK+.06,-41.7],-46.7,railTargets.slice(0,4),{park:[1.6,-41.2],base:DECK}),
  job([11.5,DECK+.06,-44.7],-48.3,railTargets.slice(4),{park:[47.4,-41.2],base:DECK}),
];
export function forkliftFootprint({x,z,yaw},padding=0){
  return [[-1.45-padding,-.8-padding],[2.85+padding,-.8-padding],[2.85+padding,.8+padding],[-1.45-padding,.8+padding]]
    .map(([along,side])=>[x+along*Math.cos(yaw)+side*Math.sin(yaw),z-along*Math.sin(yaw)+side*Math.cos(yaw)]);
}
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
    x,y:job.base,z,yaw,speed,travel,wheelTravel,curvature,steer:-Math.atan((F.frontAxleX-F.rearAxleX)*curvature),kind:trip.target.kind,working,
    height:mix(phase.height,phase.toHeight??phase.height,ease(progress)),
    tilt:mix(phase.tilt,phase.toTilt??phase.tilt,ease(progress)),
    carrying:working&&phase.carrying,
    stockVisible:elapsed<0||(working&&!phase.picked),
    reverse:working&&!!phase.reverse,
    lookBack:mix(wasLookingBack?1:0,lookingBack?1:0,ease(local/.4)),
  };
}
