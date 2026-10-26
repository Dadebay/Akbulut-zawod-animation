import * as T from 'three';
import {TRUCK_WEIGHBRIDGE as W,WEIGHBRIDGE_GRAVEL as G} from './siteLayout.js';

// Pit-mounted truck scale beside the east fence: a long steel deck with yellow
// guard rails, flared concrete approach ramps at both ends and a clad booth.
export function buildWeighbridge(k){
  const {box,mesh,group,material,m}=k;
  buildWeighbridgeGravel(k);
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

function buildWeighbridgeGravel(k){
  const {box,mesh,group,material}=k;
  const verge=group();verge.name='weighbridge-gravel-verge';
  // The fence edge stays straight; only the exposed corner facing the scale
  // turns back into the long kerb, as in the rear-corner photograph.
  const shape=new T.Shape();
  shape.moveTo(G.east,-G.south);shape.lineTo(G.west,-G.south);
  shape.lineTo(G.west,-G.north-G.radius);
  shape.quadraticCurveTo(G.west,-G.north,G.west+G.radius,-G.north);
  shape.lineTo(G.east,-G.north);shape.closePath();
  const geometry=new T.ShapeGeometry(shape,24);geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position;
  geometry.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:positions.count},(_,i)=>[positions.getX(i)/4,positions.getZ(i)/4]).flat(),2));
  let seed=6382;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),tones=['#c6c6c2','#a2a5a3','#d7d7d2','#747b7c','#b6b8b4'];
  ctx.fillStyle='#929595';ctx.fillRect(0,0,256,256);
  for(let i=0;i<3600;i++){
    const x=random()*256,z=random()*256,r=1.5+random()*3;
    ctx.fillStyle=tones[i%tones.length];ctx.beginPath();
    for(let j=0;j<5;j++){
      const a=j*Math.PI*2/5,reach=r*(.7+random()*.3);
      ctx[j?'lineTo':'moveTo'](x+Math.cos(a)*reach,z+Math.sin(a)*reach);
    }
    ctx.closePath();ctx.fill();
  }
  const map=k.trackTexture(new T.CanvasTexture(canvas));
  map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=k.tablet?4:8;
  const gravel=material('#ededeb',0,.98,{map,bumpMap:map,bumpScale:.035});
  const surface=mesh(geometry,gravel,[0,.035,0],verge);surface.name='weighbridge-gravel-surface';surface.castShadow=false;
  const kerb=material('#b8bfbd',0,.92),perimeter=shape.getPoints(24);
  for(let i=1;i<perimeter.length;i++){
    const a=perimeter[i-1],b=perimeter[i],length=a.distanceTo(b);if(length<.001)continue;
    const edge=box(length+.012,.12,.12,[(a.x+b.x)/2,.035,-(a.y+b.y)/2],kerb,verge);
    edge.rotation.y=Math.atan2(b.y-a.y,b.x-a.x);edge.castShadow=false;
  }
  // Small shared stones supply relief at walking height, without large rocks
  // or a second stockpile on the flat gravel strip.
  const inside=(x,z)=>{
    let found=false;
    for(let i=0,j=perimeter.length-1;i<perimeter.length;j=i++){
      const a=perimeter[i],b=perimeter[j];
      if((a.y>-z)!==(b.y>-z)&&x<(b.x-a.x)*(-z-a.y)/(b.y-a.y)+a.x)found=!found;
    }
    return found;
  };
  const spots=[];
  for(let i=0;i<2200;i++){
    const x=G.west+.15+random()*(G.east-G.west-.3),z=G.north+.15+random()*(G.south-G.north-.3);
    if(inside(x-.1,z)&&inside(x,z-.1))spots.push([x,.055,z]);
  }
  const stones=k.instances(new T.TetrahedronGeometry(1),material('#c3c6c1',0,.98),spots.length,verge);
  stones.name='weighbridge-gravel-stones';stones.castShadow=false;
  const pose=new T.Object3D(),color=new T.Color();
  spots.forEach((p,i)=>{
    const size=.045+random()*.055;pose.position.set(...p);pose.rotation.set(random(),random()*6,random());pose.scale.set(size,size*.5,size*.8);pose.updateMatrix();
    stones.setMatrixAt(i,pose.matrix);stones.setColorAt(i,color.set(tones[i%tones.length]));
  });
  stones.instanceMatrix.needsUpdate=true;stones.instanceColor.needsUpdate=true;
}
