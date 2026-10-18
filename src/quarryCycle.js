const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*smooth(t);

// Two complete scoop / lift / slew / discharge cycles in the opening scene.
export function quarryCycle(progress){
  const elapsed=clamp(progress)*2,completed=Math.min(2,Math.floor(elapsed));
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
  return {slew,boom,stick,bucket,pouring:completed<2&&phase>=.62&&phase<.8,bucketLoad:phase<.24?smooth(phase/.24):1-pour,rawLoad:clamp((completed+pour)/2)};
}
