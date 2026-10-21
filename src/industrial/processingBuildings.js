import {PROCESS_BUILDINGS as L} from './siteLayout.js';
import {buildCourtyardWing} from './courtyardWing.js';

// Architectural envelope only: the production equipment keeps its existing layout.
export function buildProcessingBuildings(k,roofs,structures){
  const {box,group,material,textPlate,m}=k;
  const wall=material('#f4f5f3',.04,.82),seam=material('#cdd2cf',.10,.78);
  const roof=material('#abb3b5',.08,.85),coping=material('#d8dcda',.24,.61);
  const glass=material('#304a52',.45,.28),frame=material('#c4cdcb',.32,.57);
  const bodies={};

  function volume(name,b){
    const g=group([b.x,0,b.z],structures),r=group([b.x,0,b.z],roofs);
    g.name=`processing-${name}`;bodies[name]=g;
    box(b.width,b.height,b.depth,[0,b.height/2,0],wall,g);
    box(b.width+.06,.24,b.depth+.06,[0,.12,0],coping,g);
    // Quiet cladding joints leave the slender window strips legible from a distance.
    for(let z=-b.depth/2+1.6;z<b.depth/2-.6;z+=2.1)
      box(.018,b.height-.35,.013,[-b.width/2-.014,b.height/2,z],seam,g);
    for(let x=-b.width/2+1.4;x<b.width/2-.6;x+=2.1)
      box(.013,b.height-.35,.018,[x,b.height/2,b.depth/2+.014],seam,g);
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
  const courtyard=new Set(['rightCore','rightWing','outerWing','outerService']);
  Object.entries(L).filter(([name])=>!courtyard.has(name)).forEach(([name,b])=>volume(name,b));
  buildCourtyardWing(k,roofs,structures);

  function slit(name,z,bottom,top,width=.32,divided=true){
    const b=L[name],g=bodies[name],front=-b.width/2,y=(bottom+top)/2,zz=z-b.z;
    box(.035,top-bottom+.12,width+.13,[front-.025,y,zz],frame,g);
    box(.032,top-bottom,width,[front-.062,y,zz],glass,g);
    if(divided)for(let yy=bottom+2.8;yy<top-.4;yy+=3.1)
      box(.042,.065,width+.02,[front-.083,yy,zz],coping,g);
    box(.11,.065,width+.18,[front-.06,bottom-.05,zz],coping,g);
  }
  // Two uninterrupted panes on the smaller front tower.
  for(const z of [-8.3,-3.7])slit('leftCore',z,3.9,11.2,.62,false);
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

  // The broad blank rear building carries the service deck seen in the render.
  const roofY=L.rear.height+.19,deck=group([L.rear.x+2,roofY,L.rear.z],roofs);
  box(14,.10,12,[0,.05,0],coping,deck);
  for(let x=-5.4;x<6;x+=3.6)for(let z=-4.4;z<5;z+=4.4){
    box(.48,.12,.48,[x,.16,z],m.steel,deck);
    k.cyl(.085,.42,[x,.43,z],coping,deck,undefined,12);
  }
  for(const [x,z] of [[-2.1,-1.7],[2.0,1.3]]){
    box(1.30,.70,.82,[x,.45,z],material('#69977d',.08,.76),deck);
    box(1.44,.10,.94,[x,.85,z],coping,deck);
  }
  const roofCabin=group([L.rear.x+8.8,roofY,L.rear.z-7],roofs);
  box(3.4,2.4,3.8,[0,1.2,0],wall,roofCabin);
  box(3.65,.18,4.05,[0,2.49,0],coping,roofCabin);
  box(3.1,.045,3.5,[0,2.61,0],roof,roofCabin);
  box(.045,1.9,.82,[-1.73,1.02,0],frame,roofCabin);
}
