import * as T from 'three';
import {buildTerrain} from './terrain.js';
import {createQuarryVehicles} from './quarryVehicles.js';

// Photo-informed, compressed presentation terrain. Route and elevations are illustrative.
export {INCOMING_HAUL_POINTS as HAUL_POINTS} from './siteLayout.js';
export {haulRoad as haulCurve} from './siteLayout.js';
import {haulRoad as haulCurve} from './siteLayout.js';

export function buildLandscape(k){
  const terrain=buildTerrain(k,haulCurve());
  const excavator=createQuarryVehicles(k).buildExcavator();
  excavator.g.position.y=terrain.vehicleSurface(excavator.g.position.x,excavator.g.position.z)-.065;
  return {...excavator,vehicleSurface:terrain.vehicleSurface};
}
