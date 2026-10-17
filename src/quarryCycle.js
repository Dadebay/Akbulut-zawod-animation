const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*smooth(t);

// Two complete scoop / lift / slew / discharge cycles in the opening scene.
export function quarryCycle(progress){
  const elapsed=clamp(progress)*2,completed=Math.min(2,Math.floor(elapsed));
  const phase=elapsed-completed,pour=clamp((phase-.62)/.18);
  let slew=-.88,boom=-.35,stick=.22,bucket=-.8;
  if(phase<.24){bucket=mix(-.8,-.15,phase/.24);}
  else if(phase<.43){boom=mix(-.35,.10,(phase-.24)/.19);stick=mix(.22,.12,(phase-.24)/.19);bucket=-.15;}
  else if(phase<.62){slew=mix(-.88,0,(phase-.43)/.19);boom=.1;stick=.12;bucket=-.15;}
  else if(phase<.82){slew=0;boom=.1;stick=.12;bucket=mix(-.15,.42,(phase-.62)/.18);}
  else{slew=mix(0,-.88,(phase-.82)/.18);boom=mix(.1,-.35,(phase-.82)/.18);stick=mix(.12,.22,(phase-.82)/.18);bucket=mix(.42,-.8,(phase-.82)/.18);}
  return {slew,boom,stick,bucket,pouring:completed<2&&phase>=.62&&phase<.8,bucketLoad:phase<.24?smooth(phase/.24):1-pour,rawLoad:clamp((completed+pour)/2)};
}
