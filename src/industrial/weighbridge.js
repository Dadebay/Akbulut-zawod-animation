import * as T from 'three';
import {TRUCK_WEIGHBRIDGE as W} from './siteLayout.js';

// Pit-mounted truck scale beside the east fence: a long steel deck with yellow
// guard rails, flared concrete approach ramps at both ends and a clad booth.
export function buildWeighbridge(k){
  const {box,mesh,group,material,m}=k;
  const deckMat=material('#a9aeb2',.18,.62),pit=material('#3b4144',.2,.85);
  const ramp=material('#c3c5c2',0,.94),rail=material('#d7a72a',.3,.55);
  const clad=material('#d9dcdc',.1,.7),frame=material('#f0f1ee',.05,.8),glass=material('#2a4a5c',.55,.28);
  const g=group([W.x,0,W.z]);g.name='truck-weighbridge';
  const half=W.length/2,top=W.deckHeight;

  box(W.width+.5,.14,W.length+.3,[0,top-.17,0],pit,g).castShadow=false;
  box(W.width,.12,W.length,[0,top-.06,0],deckMat,g).castShadow=false;
  // Load-cell housings show as a row of dark recesses along each side.
  for(const side of [-1,1])for(let z=-half+1.5;z<half;z+=3)box(.06,.12,.5,[side*(W.width/2+.2),top-.12,z],m.dark,g);

  // Low yellow guard rails on both long edges.
  for(const side of [-1,1]){
    const x=side*(W.width/2-.08);
    for(let z=-half+.4;z<=half-.4+.01;z+=(W.length-.8)/Math.round((W.length-.8)/1.2))box(.07,.55,.07,[x,top+.27,z],rail,g);
    box(.08,.07,W.length-.7,[x,top+.56,0],rail,g);
  }

  // Ramps fall from the deck to grade and flare out on curved sides.
  const steps=14,positions=[],indices=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,halfWidth=W.width/2+(W.flare-W.width/2)*t*t,y=top*(1-t)+.01;
    positions.push(-halfWidth,y,t*W.rampLength,halfWidth,y,t*W.rampLength);
    if(i<steps){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const rampGeometry=new T.BufferGeometry();
  rampGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  rampGeometry.setIndex(indices);rampGeometry.computeVertexNormals();
  for(const end of [-1,1]){
    const r=mesh(rampGeometry,ramp,[0,0,end*half],g);
    if(end<0)r.rotation.y=Math.PI;
    r.castShadow=false;
  }

  // Weigh-house against the fence, beside the middle of the deck.
  const booth=group([W.boothX-W.x,0,W.boothZ-W.z],g);booth.name='weighbridge-booth';
  box(W.boothWidth,W.boothHeight,W.boothDepth,[0,W.boothHeight/2,0],clad,booth);
  for(let z=-W.boothDepth/2+.12;z<W.boothDepth/2;z+=.18)box(W.boothWidth+.02,W.boothHeight-.2,.02,[0,W.boothHeight/2,z],frame,booth);
  box(W.boothWidth+.25,.14,W.boothDepth+.25,[0,W.boothHeight+.07,0],frame,booth);
  // Windows look out over the deck.
  for(const z of [-.35,.35]){
    box(.04,.75,.55,[-W.boothWidth/2-.02,1.55,z],glass,booth);
    box(.06,.85,.07,[-W.boothWidth/2-.03,1.55,z+.31],frame,booth);
    box(.06,.85,.07,[-W.boothWidth/2-.03,1.55,z-.31],frame,booth);
  }
  box(.06,.06,1.4,[-W.boothWidth/2-.03,1.98,0],frame,booth);
  box(.06,.06,1.4,[-W.boothWidth/2-.03,1.12,0],frame,booth);
  box(W.boothWidth+.3,.12,W.boothDepth+.3,[0,.06,0],ramp,booth);
  return g;
}
