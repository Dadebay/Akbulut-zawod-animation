import {PROCESS_BUILDINGS as L} from './siteLayout.js';

// White courtyard building, based on the four supplied exterior views.
// The roof and shell follow the existing whole-site cutaway lifecycle.
export function buildCourtyardWing(k,roofs,structures){
  const {box,group,material}=k;
  const wall=material('#f4f5f3',.04,.82),joint=material('#d4dad7',.08,.76);
  const coping=material('#e1e5e2',.24,.61),roof=material('#dbe0dd',.18,.58);
  const glass=material('#304a52',.45,.28),frame=material('#c4cdcb',.32,.57);
  const shell=group([0,0,0],structures),top=group([0,0,0],roofs);
  shell.name='courtyard-wing-shell';top.name='courtyard-wing-roof';
  const core=L.rightCore,arm=L.rightWing,long=L.outerWing,service=L.outerService;
  const west=arm.x-arm.width/2,east=arm.x+arm.width/2;
  const end=long.x-long.width/2,inner=long.z-long.depth/2,outer=long.z+long.depth/2;
  const join=core.z+core.depth/2,base=arm.height;

  function body(name,b){
    const g=group([b.x,0,b.z],shell);g.name=`processing-${name}`;
    box(b.width,b.height,b.depth,[0,b.height/2,0],wall,g);
    box(b.width+.42,.18,b.depth+.42,[0,.09,0],coping,g,.04);
    return g;
  }
  body('rightCore',core);body('rightWing',arm);body('outerWing',long);body('outerService',service);

  // Cladding joints stay on exposed faces; none cross the open roof junction.
  const seam=(w,h,d,pos)=>{const part=box(w,h,d,pos,joint,shell);part.castShadow=false;};
  function xFace(x,z0,z1,height,bottom=.2){
    for(let z=z0+.65;z<z1-.2;z+=.7)seam(.012,height-bottom,.018,[x,(height+bottom)/2,z]);
    for(let y=Math.ceil(bottom/5.1)*5.1;y<height-.3;y+=5.1)seam(.014,.022,z1-z0,[x,y,(z0+z1)/2]);
  }
  function zFace(z,x0,x1,height,bottom=.2){
    for(let x=x0+.65;x<x1-.2;x+=.7)seam(.018,height-bottom,.012,[x,(height+bottom)/2,z]);
    for(let y=Math.ceil(bottom/5.1)*5.1;y<height-.3;y+=5.1)seam(x1-x0,.022,.014,[(x0+x1)/2,y,z]);
  }
  xFace(west-.012,core.z-core.depth/2,inner,base);
  xFace(east+.012,core.z-core.depth/2,outer,base);
  for(const x of [west-.012,east+.012])xFace(x,core.z-core.depth/2,join,core.height,base);
  zFace(core.z-core.depth/2-.012,west,east,core.height);
  zFace(join+.012,west,east,core.height,base);
  xFace(end-.012,inner,outer,base);
  zFace(inner-.012,end,west,base);zFace(outer+.012,end,east,base);
  zFace(service.z+service.depth/2+.012,service.x-service.width/2,service.x+service.width/2,service.height);

  // A continuous flat L-shaped roof, with standing seams and no wall at the elbow.
  for(const b of [arm,long,core]){
    box(b.width,.10,b.depth,[b.x,b.height+.05,b.z],roof,top);
    for(let x=b.x-b.width/2+.45;x<b.x+b.width/2-.2;x+=.7)
      box(.018,.018,b.depth-.18,[x,b.height+.11,b.z],joint,top);
  }
  function parapet(x0,z0,x1,z1,y,height){
    const w=Math.abs(x1-x0),d=Math.abs(z1-z0),x=(x0+x1)/2,z=(z0+z1)/2;
    box(w||.14,height,d||.14,[x,y+height/2,z],wall,top);
    box(w+.10,.045,d+.10,[x,y+height+.023,z],coping,top);
  }
  const near=core.z-core.depth/2;
  for(const x of [west,east])parapet(x,near,x,join,core.height,.5);
  for(const z of [near,join])parapet(west,z,east,z,core.height,.5);
  // The two short parapets step down from the tower towards the long wing.
  for(const [z0,z1,h] of [[join,30.5,1.15],[30.5,32.3,.82],[32.3,inner,.50]])
    for(const x of [west,east])parapet(x,z0,x,z1,base,h);
  parapet(east,inner,east,outer,base,.5);
  parapet(end,inner,west,inner,base,.5);
  parapet(end,outer,east,outer,base,.5);
  parapet(end,inner,end,outer,base,.5);

  function window(pos,width,height,angle){
    const g=group(pos,shell);g.rotation.y=angle;
    box(width+.12,height+.12,.035,[0,0,0],frame,g);
    box(width,height,.028,[0,0,.03],glass,g);
    for(let y=-height/2+1.3;y<height/2-.35;y+=1.35)
      box(width+.02,.035,.035,[0,y,.055],frame,g);
    box(width+.18,.055,.12,[0,-height/2-.055,.04],coping,g);
  }
  for(const z of [22.2,25.8])window([west-.04,10.4,z],.36,17.2,-Math.PI/2);
  for(const z of [28.9,31.0,33.1])window([west-.04,4.8,z],.34,6.1,-Math.PI/2);
  for(const x of [-64,-55.8,-47.6])window([x,4.8,inner-.04],.34,6.1,Math.PI);

  // Low lean-to service enclosure on the blank outer elevation.
  const canopy=box(service.width+.18,.10,service.depth+.16,[service.x,service.height+.13,service.z],roof,top);
  canopy.rotation.x=.10;
  const door=group([end-.035,0,long.z],shell);door.rotation.y=-Math.PI/2;
  box(1.86,3.35,.04,[0,1.85,0],frame,door);
  box(1.68,3.20,.03,[0,1.85,.035],wall,door);
  box(.018,3.15,.02,[0,1.85,.06],joint,door);
  for(const x of [-.09,.09])box(.025,.25,.035,[x,1.65,.08],frame,door);
  const ramp=box(2.6,.08,2.25,[end-1.3,.05,long.z],k.m.concrete,shell);
  ramp.rotation.z=Math.atan2(.18,2.6);
}
