import {OLD_PAVILION as P} from './siteLayout.js';

// Dining and office furniture occupy the two attached railway-side volumes.
// Their roofs and glazing are owned by the pavilion cutaway shell.
export function buildPavilionInterior(k,parent){
  const {box,cyl,group,material,textPlate,m}=k;
  const root=group([0,0,0],parent,true);root.name='old-pavilion-interior';
  const floor=material('#d5d5cb',0,.91),cutWall=material('#e2e4db',0,.88);
  const timber=material('#a58a67',0,.82),metal=material('#687879',.48,.48);
  const seat=material('#688f82',0,.84),counter=material('#e7e6dc',.08,.74);
  const screen=material('#294758',.18,.45),food=material('#bb9b62',0,.93);
  const hall=group([P.hall.x,0,P.hall.z],root);hall.name='pavilion-dining-room';
  box(P.hall.width-.35,.14,P.hall.depth-.35,[0,.07,0],floor,hall);
  for(const x of [-P.hall.width/2+.12,P.hall.width/2-.12])
    box(.13,1.15,P.hall.depth-.35,[x,.575,0],cutWall,hall);
  box(P.hall.width-.35,1.15,.13,[0,.575,P.hall.depth/2-.12],cutWall,hall);
  const diningTables=[],diningChairs=[];
  function diningChair(x,z,angle=0){
    const chair=group([x,0,z],hall);chair.rotation.y=angle;chair.name='dining-chair';
    box(.46,.09,.45,[0,.47,0],seat,chair,.025);
    box(.46,.46,.07,[0,.74,.21],seat,chair,.02);
    for(const xx of [-.18,.18])for(const zz of [-.17,.17])
      box(.04,.43,.04,[xx,.215,zz],metal,chair);
    diningChairs.push(chair);
  }
  const places=[[-8,-2.1],[-4.8,-2.1],[-1.6,-2.1],[-8,1.9],[-4.8,1.9],[-1.6,1.9],[1.6,1.9]];
  for(const [x,z] of places){
    const table=group([x,0,z],hall);table.name='dining-table';
    box(1.35,.08,.78,[0,.75,0],timber,table,.025);
    for(const xx of [-.55,.55])for(const zz of [-.29,.29])
      box(.05,.72,.05,[xx,.36,zz],metal,table);
    for(const xx of [-.4,.4])for(const zz of [-.18,.18])
      cyl(.10,.025,[xx,.81,zz],counter,table,undefined,12);
    diningTables.push(table);
    for(const dx of [-.96,.96])diningChair(x+dx,z,dx>0?Math.PI/2:-Math.PI/2);
    for(const dz of [-.78,.78])diningChair(x,z+dz,dz>0?Math.PI:0);
  }
  // The serving counter separates the seating from food preparation while
  // preserving a clear route from the north entrance at local x=3.
  for(const z of [-3.4,3.4])box(.13,1.15,2.65,[4.85,.575,z],cutWall,hall);
  const serving=group([5.9,0,.1],hall);serving.name='canteen-serving-counter';
  box(.75,.84,5.2,[0,.42,0],counter,serving,.025);
  box(.95,.08,5.35,[0,.88,0],timber,serving,.025);
  for(const z of [-1.85,-.6,.65,1.9]){
    box(.59,.035,.69,[-.05,.95,z],metal,serving);
    box(.46,.09,.55,[-.05,1.00,z],food,serving,.03);
  }
  const kitchen=group([8.5,0,0],hall);kitchen.name='canteen-kitchen';
  box(1.35,.85,6.9,[0,.425,0],metal,kitchen,.025);
  box(1.4,.06,6.95,[0,.89,0],counter,kitchen);
  for(const z of [-2.5,-1.2,.1,1.4]){
    cyl(.25,.035,[0,.94,z],screen,kitchen,undefined,16);
    cyl(.18,.025,[0,.965,z],metal,kitchen,undefined,16);
  }
  box(1.35,.22,3.4,[0,2.5,-.7],metal,kitchen);
  box(.58,2.18,.65,[1.65,1.09,3.5],counter,kitchen,.02);
  for(const z of [-3.2,3.1])box(.72,.75,.5,[1.5,.38,z],counter,kitchen);
  const diningSign=textPlate('NAHARHANA · 28 ORUN',5.3,.38,[-5.8,.095,-4.2],hall,'#385666','#e2e4db');
  diningSign.rotation.x=-Math.PI/2;

  const office=group([P.annex.x,0,P.annex.z],root);office.name='pavilion-solar-office';
  box(P.annex.width-.26,.14,P.annex.depth-.26,[0,.07,0],floor,office);
  for(const z of [-P.annex.depth/2+.11,P.annex.depth/2-.11])
    box(P.annex.width-.26,1.05,.12,[0,.525,z],cutWall,office);
  box(.12,1.05,P.annex.depth-.26,[P.annex.width/2-.1,.525,0],cutWall,office);
  const workstations=[];
  for(const z of [-3.6,-1.25,1.1,3.45]){
    const desk=group([.38,0,z],office);desk.name='solar-office-workstation';
    box(1.28,.07,.66,[0,.77,0],timber,desk,.025);
    for(const x of [-.54,.54])for(const dz of [-.25,.25])
      box(.045,.74,.045,[x,.37,dz],metal,desk);
    box(.34,.52,.52,[.40,.27,0],counter,desk,.02);
    box(.08,.21,.08,[-.15,.91,-.12],metal,desk);
    box(.58,.37,.04,[-.15,1.10,-.12],metal,desk,.02);
    box(.51,.30,.015,[-.15,1.10,-.09],screen,desk);
    box(.36,.025,.16,[-.16,.82,.16],counter,desk);
    const chair=group([-.70,0,z],office);chair.name='solar-office-chair';
    cyl(.05,.42,[0,.23,0],metal,chair);
    for(const dx of [-.2,.2])box(.42,.045,.04,[dx,.055,0],metal,chair);
    box(.46,.09,.45,[0,.46,0],seat,chair,.025);
    box(.46,.43,.065,[.21,.7,0],seat,chair,.02);
    workstations.push(desk);
  }
  const officeSign=textPlate('OFIS · IŞ ÝERI',2.3,.3,[0,.095,4.55],office,'#385666','#e2e4db');
  officeSign.rotation.x=-Math.PI/2;
  return {root,hall,office,diningTables,diningChairs,serving,kitchen,workstations};
}
