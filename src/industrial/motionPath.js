import * as T from 'three';

export const clamp01=n=>Math.max(0,Math.min(1,n));
export const smooth=n=>{n=clamp01(n);return n*n*(3-2*n);};
export const angleDifference=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const steeringAngle=(wheelbase,curvature)=>T.MathUtils.clamp(Math.atan(wheelbase*curvature),-Math.PI*35/180,Math.PI*35/180);
export function routeCurvature(route,u){
  const step=.2/route.getLength(),lo=Math.max(0,u-step),hi=Math.min(1,u+step);
  const a=route.getTangentAt(lo),b=route.getTangentAt(hi);
  return angleDifference(-Math.atan2(a.z,a.x),-Math.atan2(b.z,b.x))/((hi-lo)*route.getLength());
}

// Plan speed along distance, then brake backwards from every bend and stop.
// This keeps acceleration and lateral acceleration bounded at any frame rate.
export function routeProfile(route,{speed=1.8,acceleration=.8,lateral=.6,wheels=[]}={}){
  const length=route.getLength(),count=Math.max(8,Math.ceil(length/.18)),ds=length/count;
  const yaw=[],curvature=[],velocities=[],times=[0],roll=wheels.map(()=>[0]);
  for(let i=0;i<=count;i++){
    const tangent=route.getTangentAt(i/count),a=-Math.atan2(tangent.z,tangent.x);
    yaw[i]=i?yaw[i-1]+angleDifference(yaw[i-1],a):a;
  }
  for(let i=0;i<=count;i++){
    const lo=Math.max(0,i-1),hi=Math.min(count,i+1);
    curvature[i]=(yaw[hi]-yaw[lo])/((hi-lo)*ds);
    const limit=typeof speed==='function'?speed(route.getPointAt(i/count),i/count):speed;
    velocities[i]=Math.min(limit,Math.sqrt(lateral/Math.max(.00001,Math.abs(curvature[i]))));
  }
  velocities[0]=0;velocities[count]=0;
  for(let i=1;i<=count;i++)velocities[i]=Math.min(velocities[i],Math.sqrt(velocities[i-1]**2+2*acceleration*ds));
  for(let i=count-1;i>=0;i--)velocities[i]=Math.min(velocities[i],Math.sqrt(velocities[i+1]**2+2*acceleration*ds));
  for(let i=1;i<=count;i++){
    times[i]=times[i-1]+2*ds/(velocities[i-1]+velocities[i]);
    const bend=(curvature[i-1]+curvature[i])*.5;
    wheels.forEach(({axle,side},j)=>{roll[j][i]=roll[j][i-1]+ds*Math.hypot(1+side*bend,axle*bend);});
  }
  const duration=times[count];
  function at(time){
    time=Math.max(0,Math.min(duration,time));
    let low=0,high=count;
    while(high-low>1){const mid=(low+high)>>1;if(times[mid]<=time)low=mid;else high=mid;}
    const dt=times[high]-times[low],t=time-times[low],a=(velocities[high]-velocities[low])/dt;
    const moved=Math.min(ds,velocities[low]*t+.5*a*t*t),blend=moved/ds,distance=Math.min(length,low*ds+moved);
    return {distance,speed:time===duration?0:Math.max(0,velocities[low]+a*t),u:clamp01(distance/length),
      curvature:curvature[low]+(curvature[high]-curvature[low])*blend,
      wheelTravel:roll.map(r=>r[low]+(r[high]-r[low])*blend)};
  }
  return {duration,length,at,wheelTravel:roll.map(r=>r[count])};
}

export function roundedRoute(west,east,north,south,radius,y=0){
  if(east-west<2*radius-1e-8||south-north<2*radius-1e-8)throw new RangeError('Rounded route must fit inside its bounds');
  const route=new T.CurvePath(),v=(x,z)=>new T.Vector3(x,y,z),r=radius,k=r*.5522847498307936;
  const line=(a,b)=>route.add(new T.LineCurve3(v(...a),v(...b)));
  const bend=(a,b,c,d)=>route.add(new T.CubicBezierCurve3(v(...a),v(...b),v(...c),v(...d)));
  line([west+r,north],[east-r,north]);
  bend([east-r,north],[east-r+k,north],[east,north+r-k],[east,north+r]);
  line([east,north+r],[east,south-r]);
  bend([east,south-r],[east,south-r+k],[east-r+k,south],[east-r,south]);
  line([east-r,south],[west+r,south]);
  bend([west+r,south],[west+r-k,south],[west,south-r+k],[west,south-r]);
  line([west,south-r],[west,north+r]);
  bend([west,north+r],[west,north+r-k],[west+r-k,north],[west+r,north]);
  return route;
}
