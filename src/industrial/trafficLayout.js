import * as T from 'three';
import {NEW_FACTORY_ENTRANCE as ENTRANCE} from './siteLayout.js';
import {routeProfile} from './motionPath.js';
import {TRUCK_SCALE} from './trucks.js';

// Fixed site roads and vehicle manoeuvres. Metres in scene space.
// Opposing diagonal rows leave the office-side passenger bays and their aisle clear.
export const PARKED_TRUCKS=[
  ...[-29,-20.5,-12].map(z=>({position:[-127.4,0,z],angle:-1.1,scale:1})),
  ...[[-114.4,-31],[-115.2,-25.5]].map(([x,z])=>({position:[x,0,z],angle:2.04,scale:1}))
];
export const MAIN_ROAD_X=-143;
export const MAIN_ROAD_WIDTH=7.2;
// The avenue runs along the plant fence from the railway southwards; the long outer road further west carries the northern traffic.
export const MAIN_ROAD_NORTH=-51.5;
// Both sides of the entrance share the same carriageway width and centreline.
export const MAIN_ROAD_SEGMENTS=[[MAIN_ROAD_NORTH,-6.5,MAIN_ROAD_WIDTH],[-6.5,44,MAIN_ROAD_WIDTH]];
export const DISPATCH_EXIT_LANE_X=MAIN_ROAD_X+2.25;
export const DISPATCH_EXIT_ROAD_X=-200;
export const DISPATCH_EXIT_ROAD_Z=ENTRANCE.z-2.6;

const v=(x,z)=>new T.Vector3(x,0,z);
const path=new T.CurvePath();
const line=(a,b)=>path.add(new T.LineCurve3(v(...a),v(...b)));
const bend=(a,b,c,d)=>path.add(new T.CubicBezierCurve3(v(...a),v(...b),v(...c),v(...d)));
// Leave the loading berth before passing the dock columns and pallet stock.
bend([64,-43],[60,-43],[60,-47.7],[56,-47.7]);
// Run west along the top of the court, down the fence side and out through the gate
// onto the gate road that leads to the outer road.
line([56,-47.7],[-106.6,-47.7]);
bend([-106.6,-47.7],[-113.23,-47.7],[-120.2,-42.33],[-120.2,-35.7]);
line([-120.2,-35.7],[-120.2,-16]);
bend([-120.2,-16],[-120.2,-8.27],[-124.87,-2],[-132.6,-2]);
// Ease into the northern lane before reaching the planted road divider.
bend([-132.6,-2],[-140.7,-2],[-148.9,DISPATCH_EXIT_ROAD_Z],[-157,DISPATCH_EXIT_ROAD_Z]);
line([-157,DISPATCH_EXIT_ROAD_Z],[DISPATCH_EXIT_ROAD_X,DISPATCH_EXIT_ROAD_Z]);
path.arcLengthDivisions=2000;
export const DISPATCH_ROUTE=path;
export const DISPATCH_PROFILE=routeProfile(path,{speed:p=>p.x< -132&&p.z> -10?8/3.6:15/3.6,acceleration:.6,lateral:.48});
export function dispatchMotion(progress){
  const time=T.MathUtils.clamp(progress,0,1)*DISPATCH_PROFILE.duration,m=DISPATCH_PROFILE.at(time);
  return {...dispatchPose(m.u),...m,braking:DISPATCH_PROFILE.at(time+.2).speed<m.speed-.005};
}

const length=path.getLength(),count=Math.ceil(length/.20),samples=[];
let trailerYaw=Math.PI,previousHitch;
for(let i=0;i<=count;i++){
  const p=path.getPointAt(i/count),d=path.getTangentAt(i/count),yaw=-Math.atan2(d.z,d.x);
  const hitch=v(p.x-2.6*TRUCK_SCALE*Math.cos(yaw),p.z+2.6*TRUCK_SCALE*Math.sin(yaw));
  if(previousHitch){
    // No lateral slip at the trailer axle: integrate the hitch displacement.
    // Axle group centre is 9.05 m behind the kingpin. Precompute once so seeking
    // and different frame rates always produce the same articulation.
    const dx=hitch.x-previousHitch.x,dz=hitch.z-previousHitch.z;
    trailerYaw+=(-Math.sin(trailerYaw)*dx-Math.cos(trailerYaw)*dz)/(9.05*TRUCK_SCALE);
  }
  samples.push({x:p.x,z:p.z,yaw,trailerYaw,hitch});previousHitch=hitch;
}
const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function dispatchPose(progress){
  const at=T.MathUtils.clamp(progress,0,1)*count,lo=Math.min(count-1,Math.floor(at)),t=at-lo,a=samples[lo],b=samples[lo+1];
  return {x:T.MathUtils.lerp(a.x,b.x,t),z:T.MathUtils.lerp(a.z,b.z,t),yaw:lerpAngle(a.yaw,b.yaw,t),trailerYaw:lerpAngle(a.trailerYaw,b.trailerYaw,t)};
}

export function truckFootprint(pose,padding=0){
  const {x,z,yaw,trailerYaw}=pose,hx=x-2.6*TRUCK_SCALE*Math.cos(yaw),hz=z+2.6*TRUCK_SCALE*Math.sin(yaw);
  const rectangle=(cx,cz,angle,front,back,halfWidth)=>{
    const out=[];
    for(const [along,side] of [[front,halfWidth],[back,halfWidth],[back,-halfWidth],[front,-halfWidth]])out.push([cx+along*Math.cos(angle)+side*Math.sin(angle),cz-along*Math.sin(angle)+side*Math.cos(angle)]);
    return out;
  };
  return [rectangle(x,z,yaw,2.6*TRUCK_SCALE+padding,-3.6*TRUCK_SCALE-padding,1.35*TRUCK_SCALE+padding),rectangle(hx,hz,trailerYaw,1.3*TRUCK_SCALE+padding,-12.4*TRUCK_SCALE-padding,1.33*TRUCK_SCALE+padding)];
}

// Straight industrial roads with square junction aprons. The vehicle turns
// within these fixed boundaries; its curved swept path must not shape the road.
// [west, east, north, south]. Junctions allow for the long trailer's inside cut.
export const FREIGHT_ROAD_AREAS=[
  [-81.5,82,-50,-45.3],       // Loading side of the production hall.
  [48,82,-45.3,-40.5],       // Loading berth apron.
  [-81.5,-73.5,-45.3,3.5],   // Straight lane alongside the office and parking.
  [-147.7,-73.5,-6.5,3.5],   // Straight exit to the gate.
  [-81.5,-65.5,-45.3,-37.2], // Square junction at the north end of the office.
  [-90,-81.5,-16,-6.5],      // Square junction at the south end.
  [-147.7,-135.2,3.5,6.5],   // Gate opening; keep asphalt outside the boundary fence.
  [ENTRANCE.southFenceX,-81.5,-50,-44.5], // Top lane meets the moved fence.
  [-123.5,-103.5,-50,-33],   // Turn from the top lane into the central aisle.
  [-122.6,-114.6,-34,-16],   // Central aisle between the two truck rows.
  [-135,-114,-18,-6.5],      // Turn from the aisle towards the gate.
  [-205,-147.7,-6.5,3.5],    // Gate road to the outer road.
];
export const DISPATCH_PAVEMENT=FREIGHT_ROAD_AREAS.map(([west,east,north,south])=>[[east,south],[west,south],[west,north],[east,north]]);
function distanceToPolygon(x,z,points){
  let inside=false,nearest=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,az]=points[j],[bx,bz]=points[i],dx=bx-ax,dz=bz-az;
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    const t=T.MathUtils.clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);
    nearest=Math.min(nearest,Math.hypot(x-ax-t*dx,z-az-t*dz));
  }
  return inside?0:nearest;
}
export function trafficClearance(x,z){
  let distance=Infinity;
  for(const [north,south,width] of MAIN_ROAD_SEGMENTS)distance=Math.min(distance,Math.hypot(Math.max(0,Math.abs(x-MAIN_ROAD_X)-width/2),Math.max(north-z,z-south,0)));
  for(const polygon of DISPATCH_PAVEMENT)distance=Math.min(distance,distanceToPolygon(x,z,polygon));
  return distance;
}
