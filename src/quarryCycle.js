const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*smooth(t);

export const QUARRY_SCOOPS=4;
export const QUARRY_LOADING_SECONDS=QUARRY_SCOOPS*18;
// Four full 18-second scoop / lift / slew / discharge cycles.
export function quarryCycle(progress){
  const elapsed=clamp(progress)*QUARRY_SCOOPS,completed=Math.min(QUARRY_SCOOPS,Math.floor(elapsed));
  const phase=elapsed-completed,pour=clamp((phase-.62)/.18);
  // The boom stays raised above the cab roof while the house slews between the face and the
  // tipper, and only lowers once the bucket is over the middle of the body.
  const lifted=.46;
  let slew=-1.0,boom=-.35,stick=.22,bucket=-.8;
  if(phase<.24){bucket=mix(-.8,-.15,phase/.24);}
  else if(phase<.43){boom=mix(-.35,lifted,(phase-.24)/.19);stick=mix(.22,.12,(phase-.24)/.19);bucket=-.15;}
  else if(phase<.55){slew=mix(-1.0,0,(phase-.43)/.12);boom=lifted;stick=.12;bucket=-.15;}
  else if(phase<.62){slew=0;boom=mix(lifted,.1,(phase-.55)/.07);stick=.12;bucket=-.15;}
  else if(phase<.82){slew=0;boom=.1;stick=.12;bucket=mix(-.15,.42,(phase-.62)/.18);}
  else{
    const t=(phase-.82)/.18;
    slew=mix(0,-1.0,t);stick=mix(.12,.22,t);bucket=mix(.42,-.8,t);
    // Rise clear of the cab first, then lower only after the slew has almost finished.
    boom=t<.4?mix(.1,lifted,t/.4):lifted-(lifted+.35)*Math.pow((t-.4)/.6,3);
  }
  return {phase,completed,slew,boom,stick,bucket,pouring:completed<QUARRY_SCOOPS&&phase>=.62&&phase<.8,bucketLoad:phase<.24?smooth(phase/.24):1-pour,rawLoad:clamp((completed+pour)/QUARRY_SCOOPS)};
}
