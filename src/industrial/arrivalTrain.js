import * as T from 'three';
import {routeProfile,smooth} from './motionPath.js';
import {RAIL_LAYOUT} from './railLayout.js';
export const SECOND_TRACK_Z=-57.6;
// The dormitory-side siding ends before the road crossing.
export const SECOND_TRACK_END_X=84.5;
// The detailed locomotive is longer than either of its two raw-stone wagons.
// Car spacing follows the 20% shorter rolling stock.
export const ARRIVAL_CAR_OFFSETS=[0,17.4,32.2].map(offset=>offset*.8);
const P=(x,z)=>new T.Vector3(x,0,z);
export function secondTrackPath(){
  const track=new T.CurvePath();
  track.add(new T.CubicBezierCurve3(P(-150,RAIL_LAYOUT.z),P(-130,RAIL_LAYOUT.z),P(-130,SECOND_TRACK_Z),P(-110,SECOND_TRACK_Z)));
  track.add(new T.LineCurve3(P(-110,SECOND_TRACK_Z),P(SECOND_TRACK_END_X,SECOND_TRACK_Z)));
  return track;
}
const route=new T.CurvePath();route.add(new T.LineCurve3(P(-470,RAIL_LAYOUT.z),P(-150,RAIL_LAYOUT.z)));
route.add(secondTrackPath().curves[0]);route.add(new T.LineCurve3(P(-110,SECOND_TRACK_Z),P(52,SECOND_TRACK_Z)));
export const ARRIVAL_PROFILE=routeProfile(route,{speed:3,acceleration:.3,lateral:.4});
export function arrivalTrainPose(time,offset=0){
  const m=ARRIVAL_PROFILE.at(time),distance=m.distance-offset,u=Math.max(0,distance)/ARRIVAL_PROFILE.length,p=route.getPointAt(u),t=route.getTangentAt(u);
  if(distance<0)p.x+=distance;
  const shift=smooth((m.distance-280)/20)*(1-smooth((time-ARRIVAL_PROFILE.duration-1)/2));
  return {...m,position:p,yaw:-Math.atan2(t.z,t.x),switch:shift};
}
