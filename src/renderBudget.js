// Maintain a stable display cadence despite small requestAnimationFrame jitter.
export function createRenderClock(fps=Infinity){
  const interval=1000/fps;let previous=null,nextDue=0;
  return {
    next(now){
      if(previous===null){previous=now;nextDue=now+interval;return 0;}
      if(now<nextDue-.5)return null;
      const elapsed=now-previous;
      if(interval>0)nextDue+=Math.max(1,Math.floor((now-nextDue+.5)/interval)+1)*interval;
      previous=now;
      return Math.min(Math.max(elapsed/1000,0),.1);
    },
    reset(){previous=null;nextDue=0;},
  };
}

// Lower pixel fill only after sustained pressure, recovering slowly to avoid
// oscillation. Geometry and the sharp HTML interface are independent of scale.
export function createResolutionBudget(){
  let scale=1,seconds=0,frames=0,fastWindows=0;
  return {sample(dt){
    if(dt<=0)return null;
    seconds+=dt;frames++;
    if(seconds<2)return null;
    const fps=frames/seconds;seconds=0;frames=0;const previous=scale;
    if(fps<48){scale=Math.max(.7,scale-.1);fastWindows=0;}
    else if(fps>57){if(++fastWindows>=3){scale=Math.min(1,scale+.05);fastWindows=0;}}
    else fastWindows=0;
    scale=Math.round(scale*100)/100;
    return scale===previous?null:scale;
  },reset(){seconds=0;frames=0;fastWindows=0;}};
}
