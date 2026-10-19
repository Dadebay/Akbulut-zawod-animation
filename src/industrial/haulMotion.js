import {INCOMING_HAUL,RETURN_HAUL} from './siteLayout.js';
import {routeProfile} from './motionPath.js';

const limits={speed:p=>p.x>255?6:15/3.6,acceleration:.65,lateral:.55};
export const HAUL_PROFILE=routeProfile(INCOMING_HAUL,limits);
export const RETURN_PROFILE=routeProfile(RETURN_HAUL,limits);
export function haulPose(returning,elapsed){
  const route=returning?RETURN_HAUL:INCOMING_HAUL,profile=returning?RETURN_PROFILE:HAUL_PROFILE,m=profile.at(elapsed);
  const p=route.getPointAt(m.u),d=route.getTangentAt(m.u);
  return {...m,position:p,yaw:-Math.atan2(d.z,d.x),travel:(returning?HAUL_PROFILE.length:0)+m.distance};
}
