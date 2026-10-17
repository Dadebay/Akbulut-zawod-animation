import * as T from 'three';

// Fixed site roads and vehicle manoeuvres. Metres in scene space.
// Opposing diagonal rows leave the office-side passenger bays and their aisle clear.
export const PARKED_TRUCKS=[
  ...[-35.5,-29,-22.5,-16].map(z=>({position:[-125,0,z],angle:-.6,scale:.82})),
  ...[-42,-35.5,-29,-22.5].map(z=>({position:[-112.2,0,z],angle:Math.PI-.6,scale:.82}))
];
export const MAIN_ROAD_X=-143;
export const MAIN_ROAD_WIDTH=9.4;
export const DISPATCH_EXIT_LANE_X=MAIN_ROAD_X+2.25;

const v=(x,z)=>new T.Vector3(x,0,z);
const path=new T.CurvePath();
const line=(a,b)=>path.add(new T.LineCurve3(v(...a),v(...b)));
const bend=(a,b,c,d)=>path.add(new T.CubicBezierCurve3(v(...a),v(...b),v(...c),v(...d)));
// Leave the loading berth before passing the dock columns and pallet stock.
bend([64,-43],[57,-43],[57,-47.7],[48,-47.7]);
line([48,-47.7],[-66,-47.7]);
bend([-66,-47.7],[-72.63,-47.7],[-78,-42.33],[-78,-35.7]);
line([-78,-35.7],[-78,-15]);
bend([-78,-15],[-78,-7.82],[-83.82,-2],[-91,-2]);
line([-91,-2],[-130,-2]);
// Swing wide at the gate so the trailer clears the inside kerb, then settle
// into the marked outbound lane. All steering stays within the square apron.
bend([-130,-2],[-138.01,-2],[-144.5,4.49],[-144.5,12.5]);
line([-144.5,12.5],[-144.5,20]);
bend([-144.5,20],[-144.5,32],[DISPATCH_EXIT_LANE_X,44],[DISPATCH_EXIT_LANE_X,56]);
line([DISPATCH_EXIT_LANE_X,56],[DISPATCH_EXIT_LANE_X,180]);
path.arcLengthDivisions=2000;
export const DISPATCH_ROUTE=path;

const length=path.getLength(),count=Math.ceil(length/.20),samples=[];
let trailerYaw=Math.PI,previousHitch;
for(let i=0;i<=count;i++){
  const p=path.getPointAt(i/count),d=path.getTangentAt(i/count),yaw=-Math.atan2(d.z,d.x);
  const hitch=v(p.x-2.6*Math.cos(yaw),p.z+2.6*Math.sin(yaw));
  if(previousHitch){
    // No lateral slip at the trailer axle: integrate the hitch displacement.
    // Axle group centre is 9.05 m behind the kingpin. Precompute once so seeking
    // and different frame rates always produce the same articulation.
    const dx=hitch.x-previousHitch.x,dz=hitch.z-previousHitch.z;
    trailerYaw+=(-Math.sin(trailerYaw)*dx-Math.cos(trailerYaw)*dz)/9.05;
  }
  samples.push({x:p.x,z:p.z,yaw,trailerYaw,hitch});previousHitch=hitch;
}
const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function dispatchPose(progress){
  const at=T.MathUtils.clamp(progress,0,1)*count,lo=Math.min(count-1,Math.floor(at)),t=at-lo,a=samples[lo],b=samples[lo+1];
  return {x:T.MathUtils.lerp(a.x,b.x,t),z:T.MathUtils.lerp(a.z,b.z,t),yaw:lerpAngle(a.yaw,b.yaw,t),trailerYaw:lerpAngle(a.trailerYaw,b.trailerYaw,t)};
}

export function truckFootprint(pose,padding=0){
  const {x,z,yaw,trailerYaw}=pose,hx=x-2.6*Math.cos(yaw),hz=z+2.6*Math.sin(yaw);
  const rectangle=(cx,cz,angle,front,back,halfWidth)=>{
    const out=[];
    for(const [along,side] of [[front,halfWidth],[back,halfWidth],[back,-halfWidth],[front,-halfWidth]])out.push([cx+along*Math.cos(angle)+side*Math.sin(angle),cz-along*Math.sin(angle)+side*Math.cos(angle)]);
    return out;
  };
  return [rectangle(x,z,yaw,2.6+padding,-3.6-padding,1.35+padding),rectangle(hx,hz,trailerYaw,1.3+padding,-12.4-padding,1.33+padding)];
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
  let distance=Math.hypot(Math.max(0,Math.abs(x-MAIN_ROAD_X)-MAIN_ROAD_WIDTH/2),Math.max(-174-z,z-201,0));
  for(const polygon of DISPATCH_PAVEMENT)distance=Math.min(distance,distanceToPolygon(x,z,polygon));
  return distance;
}
