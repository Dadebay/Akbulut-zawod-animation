import {PROCESS_BUILDINGS as L} from './siteLayout.js';
import {buildCourtyardWing} from './courtyardWing.js';
import {buildRearServiceYard} from './rearServiceYard.js';

// Architectural envelope only: the production equipment keeps its existing layout.
export function buildProcessingBuildings(k,roofs,structures){
  const {box,group,material,textPlate}=k;
  const wall=material('#f4f5f3',.04,.82),seam=material('#cdd2cf',.10,.78);
  const roof=material('#abb3b5',.08,.85),coping=material('#d8dcda',.24,.61);
  const glass=material('#304a52',.45,.28),frame=material('#c4cdcb',.32,.57);
  const bodies={};

  function volume(name,b){
    const g=group([b.x,0,b.z],structures),r=group([b.x,0,b.z],roofs);
    g.name=`processing-${name}`;bodies[name]=g;
    const bottom=name==='leftCore'?L.leftBase.height:0;
    box(b.width,b.height-bottom,b.depth,[0,(b.height+bottom)/2,0],wall,g);
    if(!bottom)box(b.width+.06,.24,b.depth+.06,[0,.12,0],coping,g);
    // Quiet cladding joints leave the slender window strips legible from a distance.
    for(let z=-b.depth/2+1.6;z<b.depth/2-.6;z+=2.1)
      box(.018,b.height-bottom-.35,.013,[-b.width/2-.014,(b.height+bottom)/2,z],seam,g);
    for(let x=-b.width/2+1.4;x<b.width/2-.6;x+=2.1)
      box(.013,b.height-bottom-.35,.018,[x,(b.height+bottom)/2,b.depth/2+.014],seam,g);
    if(name==='leftBase')return;
    box(b.width+.10,.12,b.depth+.10,[0,b.height+.06,0],wall,r);
    box(b.width-.44,.055,b.depth-.44,[0,b.height+.15,0],roof,r);
    for(const z of [-b.depth/2+.08,b.depth/2-.08]){
      box(b.width,.48,.16,[0,b.height+.31,z],wall,r);
      box(b.width+.08,.045,.22,[0,b.height+.575,z],coping,r);
    }
    for(const x of [-b.width/2+.08,b.width/2-.08]){
      box(.16,.48,b.depth,[x,b.height+.31,0],wall,r);
      box(.22,.045,b.depth+.08,[x,b.height+.575,0],coping,r);
    }
  }
  const customVolumes=new Set(['rightCore','rightWing','outerWing','outerService','rear','buffer']);
  Object.entries(L).filter(([name])=>!customVolumes.has(name)).forEach(([name,b])=>volume(name,b));
  buildCourtyardWing(k,roofs,structures);
  buildRearServiceYard(k,roofs,structures);

  // Only the exposed L-shaped part of the lower floor has a roof. The front
  // wall continues straight into the tower, without a terrace or parapet ledge.
  const base=L.leftBase,core=L.leftCore,baseRoof=group([0,0,0],roofs);
  baseRoof.name='processing-left-base-roof';
  const east=base.x+base.width/2,south=base.z+base.depth/2;
  const towerEast=core.x+core.width/2,towerSouth=core.z+core.depth/2;
  for(const [x,z,w,d] of [
    [base.x,(towerSouth+south)/2,base.width,south-towerSouth],
    [(towerEast+east)/2,core.z,east-towerEast,core.depth],
  ]){
    box(w,.10,d,[x,base.height+.05,z],wall,baseRoof);
    box(w-.04,.035,d-.04,[x,base.height+.112,z],roof,baseRoof);
  }
  const doorPanel=material('#f7f8f5',.08,.72),doorJoint=material('#d0d7d4',.12,.69);
  for(const [index,x] of [-49.9,-46.6,-41.8].entries()){
    const door=group([x-base.x,0,base.depth/2+.025],bodies.leftBase);
    door.name=`processing-service-door-${index+1}`;
    const width=index===2?1.9:2.2,height=2.65;
    box(width+.14,height+.12,.055,[0,.14+height/2,0],frame,door);
    box(width,height,.035,[0,.14+height/2,.045],doorPanel,door);
    for(let y=.64;y<2.7;y+=.5)
      box(width-.04,.014,.012,[0,y,.069],doorJoint,door).castShadow=false;
    if(index===2)for(const xx of [-.55,0,.55]){
      box(.43,.23,.018,[xx,2.18,.075],frame,door);
      box(.35,.15,.018,[xx,2.18,.09],glass,door);
    }
    box(.035,.25,.04,[width/2-.16,1.15,.087],coping,door);
    box(width+.18,.08,.18,[0,.10,.055],coping,door);
  }

  function slit(name,z,bottom,top,width=.32,divided=true){
    const b=L[name],g=bodies[name],front=-b.width/2,y=(bottom+top)/2,zz=z-b.z;
    box(.035,top-bottom+.12,width+.13,[front-.025,y,zz],frame,g);
    box(.032,top-bottom,width,[front-.062,y,zz],glass,g);
    if(divided)for(let yy=bottom+2.8;yy<top-.4;yy+=3.1)
      box(.042,.065,width+.02,[front-.083,yy,zz],coping,g);
    box(.11,.065,width+.18,[front-.06,bottom-.05,zz],coping,g);
  }
  // Two uninterrupted panes on the smaller front tower.
  for(const z of [-8.3,-3.7])slit('leftCore',z,1.05,11.8,.62,false);
  for(const z of [-6.2,-.6,5,10.6,16.2])slit('main',z,2.9,25.3,.32);
  const label=textPlate('TÜRKMEN GIPS',6.4,.46,[L.main.x-L.main.width/2-.065,26.12,-2.4],structures,'#5593a6','#f4f5f3');
  label.rotation.y=-Math.PI/2;

  // A low set-back roof house replaces the extra full-height front slab.
  const top=L.main.height,roofHouse=group([-27.0,top+.18,1.0],roofs);
  box(8,2.65,6.2,[0,1.325,0],wall,roofHouse);
  box(8.25,.16,6.45,[0,2.73,0],coping,roofHouse);
  box(7.7,.055,5.9,[0,2.84,0],roof,roofHouse);
  for(const z of [-2.4,2.4])box(.45,.32,.50,[3,3.01,z],coping,roofHouse);
  // Two white vent stacks to the right of the roof house in the front elevation.
  for(const z of [11.8,15.7]){
    const vent=group([-32,top+.18,z],roofs);
    box(.58,.08,.58,[0,.04,0],coping,vent);
    k.cyl(.14,.75,[0,.455,0],wall,vent);
    k.cyl(.14,.23,[0,.945,0],wall,vent,.30);
    k.cyl(.30,.18,[0,1.15,0],wall,vent);
    k.cyl(.30,.24,[0,1.36,0],wall,vent,.17);
    k.cyl(.17,.19,[0,1.575,0],wall,vent);
    k.cyl(.20,.04,[0,1.69,0],coping,vent);
  }
}
