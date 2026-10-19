// Engineering illustration, not plant calibration. Units: m, s, kg, °C, kJ, kW.
// Sources and every assumed operating value: docs/interior-process-layout.md.
export const PROCESS_PHYSICS=Object.freeze({
  thermalTimeScale:90, ambientC:25, calcinerC:160, coolerC:55, dryerAirC:160,
  calcinationMinC:140, dehydrationKJPerKg:450,
  stuccoKgPerBoard:18, waterStuccoRatio:.65, settingSeconds:240,
  hydrationKJPerKg:120, evaporationKJPerKg:2400,
  boardHeatTransferKWPerK:.35, dryMoistureRatio:.005,
  drumRpm:1, drumTeeth:80, pinionTeeth:18, jawRpm:180, jawThrowM:.018,
  screwRpm:30, mixerRpm:18, boardSpeed:1.8, ceilingSpeed:1.1, bagSpeed:.65,
});
const WATER=18.01528, ANHYDRITE=136.14;
export const GYPSUM_MOLAR_MASS=ANHYDRITE+2*WATER;
export const STUCCO_MOLAR_MASS=ANHYDRITE+.5*WATER;
export const HYDRATION_WATER_RATIO=1.5*WATER/STUCCO_MOLAR_MASS;
export const rpmToRadians=rpm=>rpm*Math.PI/30;
export const rollerAngularSpeed=(linearSpeed,radius)=>linearSpeed/radius;

// Exact integral of a bounded linear motor ramp. Identical at 30/60/120 Hz;
// stopping never rewinds phase. The returned travel also drives belt products.
export function createDrive(acceleration=1){
  let speed=0,position=0;
  return {get speed(){return speed;},get position(){return position;},
    update(dt,target){
      if(!(dt>0))return 0;
      const old=speed,delta=target-old,sign=Math.sign(delta);
      const ramp=Math.min(dt,Math.abs(delta)/acceleration);
      speed=old+sign*acceleration*ramp;
      const travel=(old+speed)*.5*ramp+speed*(dt-ramp);
      position+=travel;return travel;
    },
    stop(){speed=0;},
  };
}

// CaSO4·2H2O + heat -> CaSO4·½H2O + 1½H2O. No heat, no conversion.
export function calcineGypsum(rawKg,energyKJ,temperatureC){
  const feed=Math.max(0,rawKg),energy=Math.max(0,energyKJ);
  const converted=temperatureC>=PROCESS_PHYSICS.calcinationMinC?Math.min(feed,energy/PROCESS_PHYSICS.dehydrationKJPerKg):0;
  const stuccoKg=converted*STUCCO_MOLAR_MASS/GYPSUM_MOLAR_MASS;
  return {rawKg:feed-converted,stuccoKg,vapourKg:converted-stuccoKg,usedKJ:converted*PROCESS_PHYSICS.dehydrationKJPerKg};
}

export function createBoardBatch({stuccoKg=PROCESS_PHYSICS.stuccoKgPerBoard,waterKg=stuccoKg*PROCESS_PHYSICS.waterStuccoRatio}={}){
  const sourceGypsumKg=Math.max(0,stuccoKg)*GYPSUM_MOLAR_MASS/STUCCO_MOLAR_MASS;
  const source=calcineGypsum(sourceGypsumKg,sourceGypsumKg*PROCESS_PHYSICS.dehydrationKJPerKg,PROCESS_PHYSICS.calcinerC);
  return {sourceGypsumKg,calcinationVapourKg:source.vapourKg,stuccoKg:source.stuccoKg,waterKg:Math.max(0,waterKg),reactedKg:0,boundWaterKg:0,
    freeWaterKg:Math.max(0,waterKg),evaporatedKg:0,temperatureC:25,heatInputKJ:0};
}
export function boardMass(batch){return batch.stuccoKg+batch.boundWaterKg+batch.freeWaterKg;}
export function boardReady(batch){
  return batch.reactedKg>=batch.stuccoKg*.999 && batch.freeWaterKg<=
    (batch.stuccoKg+batch.boundWaterKg)*PROCESS_PHYSICS.dryMoistureRatio+1e-9;
}
export function advanceBoard(batch,seconds,{setting=false,drying=false,airC=25}={}){
  if(!(seconds>0))return batch;
  // Bounded substeps limit render-rate error in the coupled heat/water update.
  for(let left=seconds;left>1e-9;){
    const dt=Math.min(left,1);left-=dt;
    if(setting){
      const reacted=Math.min(batch.stuccoKg-batch.reactedKg,batch.freeWaterKg/HYDRATION_WATER_RATIO,
        batch.stuccoKg*dt/PROCESS_PHYSICS.settingSeconds);
      const water=reacted*HYDRATION_WATER_RATIO;
      batch.reactedKg+=reacted;batch.boundWaterKg+=water;batch.freeWaterKg-=water;
      batch.temperatureC+=reacted*PROCESS_PHYSICS.hydrationKJPerKg/Math.max(1,boardMass(batch)*1.4);
    }
    if(drying && batch.reactedKg>=batch.stuccoKg*.999 && airC>batch.temperatureC){
      const capacity=Math.max(1,boardMass(batch)*1.4);
      // Low-temperature evaporation in a ventilated dryer; not a boiling rule.
      // Keep the product below 95°C; air temperature is a separate quantity.
      const heat=PROCESS_PHYSICS.boardHeatTransferKWPerK*(airC-batch.temperatureC)*dt;
      const warm=Math.min(heat,Math.max(0,60-batch.temperatureC)*capacity);
      batch.temperatureC+=warm/capacity;
      const minimum=(batch.stuccoKg+batch.boundWaterKg)*PROCESS_PHYSICS.dryMoistureRatio;
      const evaporated=Math.min(Math.max(0,batch.freeWaterKg-minimum),(heat-warm)/PROCESS_PHYSICS.evaporationKJPerKg);
      batch.freeWaterKg-=evaporated;batch.evaporatedKg+=evaporated;
      const sensible=Math.min(heat-warm-evaporated*PROCESS_PHYSICS.evaporationKJPerKg,Math.max(0,Math.min(95,airC)-batch.temperatureC)*capacity);
      batch.temperatureC+=sensible/capacity;
      batch.heatInputKJ+=warm+evaporated*PROCESS_PHYSICS.evaporationKJPerKg+sensible;
    }else if(!setting&&(!drying||batch.reactedKg>=batch.stuccoKg*.999)){
      const surroundings=Math.min(95,airC);
      batch.temperatureC=surroundings+(batch.temperatureC-surroundings)*Math.exp(-dt/900);
    }
  }
  return batch;
}

// Start at an explicitly declared running-plant condition. When heat or airflow
// is lost, temperatures decay continuously and downstream material is held.
export function createProcessPhysics(){
  const {ambientC,calcinerC,coolerC,dryerAirC,calcinationMinC}=PROCESS_PHYSICS;
  const state={calcinerC,coolerC,dryerAirC,waitingForDryer:false};
  return {state,update(dt,healthy){
    if(!(dt>0))return;
    const t=Math.max(0,dt)*PROCESS_PHYSICS.thermalTimeScale;
    const approach=(value,target,tau)=>target+(value-target)*Math.exp(-t/tau);
    state.calcinerC=approach(state.calcinerC,healthy('BS')?calcinerC:ambientC,900);
    state.coolerC=approach(state.coolerC,healthy('BS')?coolerC:ambientC,480);
    state.dryerAirC=approach(state.dryerAirC,healthy('GK')&&healthy('BS')?dryerAirC:ambientC,600);
  },feedReady(healthy){return healthy('BS')&&state.calcinerC>=calcinationMinC&&state.coolerC<=70;}};
}
