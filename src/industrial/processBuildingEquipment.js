import {localPoint} from './processPlan.js';
import {machinePort} from './equipmentConnections.js';
import {JOURNEY_STAGE as S} from '../journey.js';

// Reconstructed from the user's Telegram CAD screenshots, not imported CAD.
// Keep filenames distinct from the older numbered archive references.
export const PROCESS_EQUIPMENT_REFERENCES={
  calcite:'photo_2026-10-20_00-28-13.jpg',
  thermal:'photo_2026-10-20_00-28-20 (2).jpg',
  mixing:'photo_2026-10-20_00-28-29 (2).jpg',
};

export function buildProcessBuildingEquipment(k,{root,models,equipment,units,inventory,network}){
  const {box,cyl,rod,ring,group,m}=k;
  const {steel,panel,dark}=models.materials;
  const frame=k.material('#77866a',.45,.6),duct=k.material('#2682a8',.5,.4);
  function install(id,kind,building,position,options={},reference='mixing',yaw=0,scale=1){
    const g=group(localPoint(position),root);
    g.name=`interior-${id}`;g.rotation.y=yaw;g.scale.setScalar(scale);
    const entry={id,kind,zone:'BS',building,position,scale,sourceFiles:reference?[PROCESS_EQUIPMENT_REFERENCES[reference]]:[],illustrative:!reference};
    g.userData.equipment=entry;inventory.push(entry);units[id]=g;
    (kind==='process-silo'?silo:models.builders[kind])(g,'BS',options);
    return g;
  }
  function port(id,name,p,n,r=.22,medium='solid'){
    return machinePort(k,units[id],name,p,n,r,medium,{nozzle:.2});
  }
  function join(a,out,b,input,via=[],kind='gravity',material='powder',shellMaterial){
    const from=units[a].userData.ports[out],to=units[b].userData.ports[input];
    network.connect(from,to,{via:via.map(localPoint),kind,material,shellMaterial,zone:'BS',stages:[S.calcine,S.mix]});
  }
  function support(x,z,w,d,y,base=0){
    const g=group(localPoint([x,0,z]),root);
    for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2]){
      box(.18,y-base,.18,[xx,(y+base)/2,zz],frame,g);box(.48,.1,.48,[xx,base+.05,zz],steel,g);
    }
    for(const zz of [-d/2,d/2])box(w,.24,.18,[0,y-.12,zz],frame,g);
    for(const xx of [-w/2,w/2])box(.18,.24,d,[xx,y-.12,0],frame,g);
    return g;
  }
  function silo(g,zone,{height=6,radius=1.25}={}){
    // The cone empties through a rotary valve; flanged shell courses and roof
    // vents reproduce the tall silver vessels in both reference assemblies.
    const coneBottom=1,coneTop=Math.min(3,height*.4),top=height-.35;
    cyl(.2,coneTop-coneBottom,[0,(coneTop+coneBottom)/2,0],panel,g,radius);
    cyl(radius,top-coneTop,[0,(top+coneTop)/2,0],panel,g);
    cyl(radius,.25,[0,top+.125,0],steel,g,radius*.24);
    for(let y=coneTop;y<top+.05;y+=1.8)ring(radius+.025,.035,[0,y,0],steel,g);
    for(const x of [-radius*.78,radius*.78])for(const z of [-radius*.78,radius*.78]){
      box(.12,coneTop,.12,[x,coneTop/2,z],frame,g);
      box(.25,.12,.25,[x,.07,z],m.blue,g);
    }
    const valve=group([0,.15,0],g);valve.scale.setScalar(.6);
    models.builders.valve(valve,zone,{internal:true});
    cyl(.21,.15,[0,.99,0],steel,g);
    cyl(.16,.35,[0,height-.175,0],steel,g);
    cyl(.19,.4,[radius*.58,height-.15,0],panel,g);
    cyl(.27,.10,[radius*.58,height+.1,0],steel,g,.12);
    equipment.gauge([radius*.6,coneTop+.45,radius*.82],g);
    machinePort(k,g,'in',[0,height,0],[0,1,0],.24,'solid');
    machinePort(k,g,'out',[0,.228,0],[0,-1,0],.2,'solid');
  }

  // Main tower: two full-height buffer silos fill the open shafts between
  // the existing elevator, day bin and mill, with weighing on the floor below.
  for(const [i,x] of [-33,-25.2].entries()){
    const bin=`tower-buffer-${i+1}`,weigh=`tower-buffer-weigh-${i+1}`;
    install(bin,'process-silo','main',[x,12.15,3.6],{height:11.6,radius:1.22},'calcite');
    install(weigh,'hopper','main',[x,6.15,3.6],{width:2.6,depth:2.4,height:4.5,weigh:true},'calcite');
    support(x,3.6,2.8,2.7,6.15);support(x,3.6,2.8,2.7,12.15);
    join(bin,'out',weigh,'in');
    port('tower-elevator',`buffer-${i}`,[1.2,25,.25+i*.5],[1,0,0]);
    join('tower-elevator',`buffer-${i}`,bin,'in',[[x,25.15,-1],[x,25.15,3.6]],'mechanical');
  }
  install('tower-buffer-screw','screw','main',[-29,.1,3.6],{length:7,closed:true,yellowCover:true},'calcite');
  port('tower-buffer-screw','in2',[2.24,2.18,0],[0,1,0]);
  join('tower-buffer-weigh-1','out','tower-buffer-screw','in');
  join('tower-buffer-weigh-2','out','tower-buffer-screw','in2');
  port('BS','bufferFeed',[-4.4,4.9,-1.3],[0,1,0]);
  join('tower-buffer-screw','out','BS','bufferFeed',[
    [-26.76,.95,3.6],[-28,.95,3.6],[-28,5.6,3.6],[-33.4,5.6,3.6],[-33.4,5.6,6.7]
  ],'mechanical');

  // Rear building: a four-bin mixing rack over the existing cooling and water
  // services. Its columns are outside the equipment below and its rear aisle
  // stays continuous, with a stair at the east end.
  const rack=support(-7.5,17,20,4.8,11.15);rack.name='rear-bin-rack';
  for(const y of [6.5,11.15]){
    for(const z of [-2.4,2.4])box(20,.22,.18,[0,y-.11,z],frame,rack);
    box(20,.1,1.1,[0,y,2.9],steel,rack);
    for(let x=-10;x<=10;x+=1.25){
      rod([x,y,3.4],[x,y+1.05,3.4],.025,m.yellow,rack);
    }
    for(const h of [.5,1.05])rod([-10,y+h,3.4],[10,y+h,3.4],.03,m.yellow,rack);
  }
  for(const z of [-1.175,1.175])box(20,.18,.32,[0,6.56,z],frame,rack);
  for(const z of [-1.209,1.209])box(20,.18,.32,[0,11.16,z],frame,rack);
  // Stair flights beside the rack; landings meet the existing 6.5 m gallery.
  for(const [bottom,top,z0,z1] of [[0,6.5,10.3,19.3],[6.5,11.15,19.3,12.5]]){
    const steps=Math.ceil((top-bottom)/.22),x=3.25;
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps;
      box(1,.075,Math.abs(z1-z0)/steps+.025,localPoint([x,bottom+(top-bottom)*(i+1)/steps,z0+(z1-z0)*t]),steel,root);
    }
    for(const xx of [x-.55,x+.55]){
      rod(localPoint([xx,bottom,z0]),localPoint([xx,top,z1]),.07,frame,root);
      rod(localPoint([xx,bottom+1.05,z0]),localPoint([xx,top+1.05,z1]),.03,m.yellow,root);
    }
    box(1.2,.1,1.3,localPoint([x,top,z1]),steel,root);
  }
  box(1.1,.1,7.5,localPoint([2.8,11.15,16.25]),steel,root);
  for(const [i,x] of [-15,-10,-5,0].entries()){
    install(`rear-day-bin-${i+1}`,'process-silo','rear',[x,11.25,17],{height:5.7,radius:1.55});
  }
  for(const [i,x] of [-12.5,-2.5].entries()){
    const weigh=`rear-weigh-${i+1}`;
    install(weigh,'hopper','rear',[x,6.65,17],{width:3.5,depth:2.6,height:3.8,weigh:true});
    port(weigh,'in2',[.9,3.8,0],[0,1,0]);
    join(`rear-day-bin-${i*2+1}`,'out',weigh,'in');
    join(`rear-day-bin-${i*2+2}`,'out',weigh,'in2');
    // Separate metering legs feed the existing cooled-product transfer screw.
    port('thermal-screw',`meter-${i}`,[-1+i*2,2.18,0],[0,1,0]);
    join(weigh,'out','thermal-screw',`meter-${i}`,[
      [x,6.8,17],[x,6.8,19.2],[x,17.8,19.2],[-30+i*2,17.8,19.2],[-30+i*2,17.8,14]
    ],'mechanical','stucco');
  }
  // Distribution spine and its enclosed lift fill the top row through four
  // independent drops, instead of pipes ending against the silo shell.
  install('rear-distribution-lift','elevator','rear',[-18.4,.1,10.5],{height:17.2});
  for(let i=0;i<4;i++){
    const x=[-15,-10,-5,0][i];
    port('rear-distribution-lift',`bin-${i}`,[1.2,17.2,i*.13],[1,0,0]);
    join('rear-distribution-lift',`bin-${i}`,`rear-day-bin-${i+1}`,'in',[
      [-17.2,17.8,12+i*.45],[x,17.8,12+i*.45],[x,17.8,17]
    ],'mechanical','stucco');
  }
  port('cooling-drum','storage',[3.6,.65,.5],[0,-1,0]);
  join('cooling-drum','storage','rear-distribution-lift','in',[
    [-4.4,.4,16],[-4.4,.4,18.7],[-19.6,.4,18.7],[-19.6,.55,10.5]
  ],'mechanical','stucco');

  // The reference thermal skid occupies the unused north half: drum with red
  // drive ring, twin-hopper bag filter, blue hot-air elbow and exhaust cyclone.
  install('rear-thermal-drum','drum','rear',[-7.5,.1,5.2],{length:12},'thermal');
  const drum=units['rear-thermal-drum'];
  ring(1.19,.15,[1.4,1.8,0],m.red,drum,'x');
  for(const x of [-3.6,3.6])box(1.5,.7,2.2,[x,.35,0],m.concrete,drum);
  for(const [i,x] of [-10,-5].entries()){
    install(`rear-filter-${i+1}`,'filter','rear',[x,6.7,4],{height:7,industrial:true},'thermal');
    support(x,4,3.4,2.4,6.7);
    if(i===0){
      port('rear-thermal-drum','dust',[x+7.5,3,0],[0,1,0],.32,'air');
      join('rear-thermal-drum','dust','rear-filter-1','in',[
        [x,4.2,5.2],[x+2.6,4.2,5.2],[x+2.6,9.3,5.2],[x+2.6,9.3,4]
      ],'duct','air');
    }
    port('rear-distribution-lift',`recovery-${i}`,[-1,1.2+i*.5,0],[-1,0,0]);
    join(`rear-filter-${i+1}`,'out','rear-distribution-lift',`recovery-${i}`,[
      [x,6.3,4],[x,6.3,8.2],[-19.5,6.3,8.2],[-19.5,1.3+i*.5,10.5]
    ],'mechanical','stucco');
  }
  install('rear-exhaust-cyclone','cyclone','rear',[-16.4,.1,4],{height:10.8},'thermal',Math.PI);
  install('rear-induced-fan','fan','rear',[-12,.1,9.5],{},'thermal');
  port('rear-exhaust-cyclone','filter2',[1.42,7.884,.7],[1,0,0],.32,'air');
  join('rear-filter-1','air','rear-exhaust-cyclone','in',[[-10,13.2,2],[-18.4,13.2,2],[-18.4,7.984,4]],'duct','air');
  join('rear-filter-2','air','rear-exhaust-cyclone','filter2',[[-5,13.2,1.7],[-18.8,13.2,1.7],[-18.8,7.984,3.3]],'duct','air');
  join('rear-exhaust-cyclone','air','rear-induced-fan','in',[[-16.4,11,4],[-16.4,11,9.5],[-12.4,11,9.5],[-12.4,1.2,11]],'duct','air');
  // The blue elbow is a real flange-to-flange air connection, with a service
  // ladder alongside it, rather than decorative tubing with blind ends.
  join('rear-thermal-drum','air','rear-filter-2','in',[
    [.9,3.8,5.2],[.9,11.8,5.2],[-1.7,11.8,5.2],[-2.3,9.3,4]
  ],'duct','air',duct);
  const hotDuct=group(localPoint([.9,0,5.2]),root);
  for(const y of [5,7,9])ring(.33,.045,[0,y,0],steel,hotDuct);
  k.ladder(10.6,1,0,hotDuct,true);
  port('tower-buffer-screw','thermal',[0,.85,.3],[0,-1,0]);
  join('tower-buffer-screw','thermal','rear-thermal-drum','in',[
    [-29,.6,3.9],[-29,.6,2],[-19.8,.6,2],[-19.8,3.1,2],[-14.6,3.1,2],[-14.6,1.9,5.2]
  ],'mechanical');
  port('cooling-drum','thermalIn',[-3,3.2,0],[0,1,0]);
  join('rear-thermal-drum','out','cooling-drum','thermalIn',[
    [-1.05,.4,5.2],[-1.05,.4,7.5],[-1.05,4.5,7.5],[-1.05,4.5,15.5],[-11,4.5,15.5]
  ],'mechanical','stucco');
  port('rear-distribution-lift','fines',[-1,.8,.3],[-1,0,0]);
  join('rear-exhaust-cyclone','out','rear-distribution-lift','fines',[
    [-16.4,.428,4],[-19.8,.428,4],[-19.8,.9,10.8]
  ],'mechanical','stucco');
  const stack=group(localPoint([-15.7,0,10.5]),root);stack.name='rear-filter-stack';
  cyl(.3,17.5,[0,8.75,0],panel,stack);cyl(.46,.22,[0,17.61,0],steel,stack,.2);
  for(let y=1;y<17;y+=2)ring(.32,.035,[0,y,0],steel,stack);
  units['rear-filter-stack']=stack;
  machinePort(k,stack,'in',[.3,2,0],[1,0,0],.3,'air');
  join('rear-induced-fan','out','rear-filter-stack','in',[[-11.75,3,9.5],[-14.7,3,9.5],[-14.7,2,10.5]],'duct','air');

  for(const [x,z] of [[-35.1,3.6],[-17.3,19.9],[-1,8.8]]){
    const controls=group(localPoint([x,.1,z]),root);
    k.cabinet([0,0,0],controls);equipment.gauge([.15,1.25,.32],controls);
  }

  // Two compact recovery trains occupy the north bays, between the elevator
  // and the existing raw-air filter. Each level retains the perimeter catwalk.
  for(const [i,x] of [-31.6,-27].entries()){
    const prefix=`tower-recovery-${i+1}`,z=-5.95;
    install(`${prefix}-cyclone`,'cyclone','main',[x,18.15,z],{height:6},'calcite',0,.75);
    install(`${prefix}-hopper`,'hopper','main',[x,12.15,z],{width:2.4,depth:2.1,height:3.4,weigh:true},'calcite',0,.75);
    install(`${prefix}-valve`,'valve','main',[x,10.2,z],{},'calcite',0,.65);
    install(`${prefix}-screw`,'screw','main',[x,6.15,z],{length:3.1,closed:true},'calcite',0,.75);
    install(`${prefix}-fan`,'fan','main',[x,.1,z],{},'calcite',0,.75);
    const stand=support(x,z,3.2,1.95,18.15);
    for(const y of [6.15,12.15]){
      for(const zz of [-.975,.975])box(3.2,.22,.18,[0,y-.11,zz],frame,stand);
      for(const xx of [-1.6,1.6])box(.18,.22,1.95,[xx,y-.11,0],frame,stand);
    }
    join(`${prefix}-cyclone`,'out',`${prefix}-hopper`,'in');
    join(`${prefix}-hopper`,'out',`${prefix}-valve`,'in');
    join(`${prefix}-valve`,'out',`${prefix}-screw`,'in');
    // Pick up dust from the raw day bin; recovered powder returns before firing.
    port('tower-day-bin',`north-dust-${i}`,[-1.25+i*2.5,3.4,-1.98],[0,0,-1],.2,'air');
    join('tower-day-bin',`north-dust-${i}`,`${prefix}-cyclone`,'in',[
      [-30.25+i*2.5,21.55,-4.9],[x+1.6,21.55,-4.9],[x+1.6,21.435,z]
    ],'duct','air');
    const riser=x-2.1,riserZ=i?-5.05:z;
    join(`${prefix}-cyclone`,'air',`${prefix}-fan`,'in',[
      [x,23,z],[riser,23,z],[riser,23,riserZ],
      [riser,2.4,riserZ],[x-.3,2.4,riserZ],[x-.3,2.4,-4.9],[x-.3,1.1,-4.9]
    ],'duct','air');
    const exhaustX=-24.4+i*1.4,exhaustY=2.4+i*.4;
    port('tower-aspiration',`recovery-air-${i}`,[-.7+i*1.4,1.9,-1.15],[0,0,-1],.18,'air');
    join(`${prefix}-fan`,'out','tower-aspiration',`recovery-air-${i}`,[
      [x+.1875,exhaustY,z],[x+.1875,exhaustY,-6.55],
      [exhaustX,exhaustY,-6.55],[exhaustX,20.05,-6.55]
    ],'duct','air');
    const returnX=-29.8+i*1.6,returnY=3.4-i*.6;
    port('tower-buffer-screw',`recovered-raw-${i}`,[-.8+i*1.6,2.18,0],[0,1,0],.18);
    join(`${prefix}-screw`,'out','tower-buffer-screw',`recovered-raw-${i}`,[
      [x+.744,returnY,z],[returnX,returnY,z],[returnX,returnY,3.6]
    ],'gravity','raw');
    const panelGroup=group(localPoint([x+.95,6.15,-5.1]),root);
    const cabinet=k.cabinet([0,0,0],panelGroup);cabinet.scale.setScalar(.55);
  }

  // A paired blending mezzanine fills the open middle of the rear building.
  // Feed hoppers, rotary valves, open pan mixers and enclosed transfer screws
  // form complete circuits; the two older service aisles remain unobstructed.
  const blendRack=support(-7.5,10.6,13,3.5,11.25);
  blendRack.name='rear-blending-rack';
  for(const y of [6.75,11.25]){
    for(const x of [-2.5,2.5])for(const z of [-1.105,1.105])box(3.2,.18,.3,[x,y-.09,z],frame,blendRack);
    box(13,.10,.65,[0,y-.05,1.75],steel,blendRack);
    for(let x=-6.5;x<=6.5;x+=1.3)rod([x,y,2.05],[x,y+1.05,2.05],.025,m.yellow,blendRack);
    for(const h of [.5,1.05])rod([-6.5,y+h,2.05],[6.5,y+h,2.05],.03,m.yellow,blendRack);
  }
  // Short stepped bridges meet the existing gallery and upper stair landing.
  for(const [startY,endY,endX] of [[6.75,6.5,1.5],[11.25,11.15,2.7]]){
    const length=endX+1;
    for(let step=0;step<3;step++)box(length/3+.02,.08,.65,localPoint([
      -1+length*(step+.5)/3,startY+(endY-startY)*step/2-.04,12.35
    ]),steel,root);
    for(const z of [12.025,12.675])rod(localPoint([-1,startY+1.05,z]),localPoint([endX,endY+1.05,z]),.03,m.yellow,root);
  }
  for(const [i,x] of [-10,-5].entries()){
    const prefix=`rear-blend-${i+1}`,z=10.6,feederZ=i?10.5:11.25,feederY=i?3.7:3.4;
    install(`${prefix}-hopper`,'hopper','rear',[x,11.25,z],{width:2.8,depth:2.2,height:3.8,weigh:true});
    install(`${prefix}-valve`,'valve','rear',[x,9.9,z],{},'mixing',0,.75);
    install(`${prefix}-mixer`,'mixer','rear',[x,6.75,z],{pan:true},'mixing',0,.85);
    install(`${prefix}-screw`,'screw','rear',[x,feederY,feederZ],{length:2.5,closed:true,yellowCover:true});
    support(x,feederZ,2.8,1.2,feederY);
    port('rear-distribution-lift',`blend-${i}`,[1.2,16.4+i*.6,-.2],[1,0,0]);
    join('rear-distribution-lift',`blend-${i}`,`${prefix}-hopper`,'in',[
      [-17,16.6+i*.6,9.6-i*.9],[x,16.6+i*.6,9.6-i*.9],[x,16.6+i*.6,z]
    ],'mechanical','stucco');
    join(`${prefix}-hopper`,'out',`${prefix}-valve`,'in');
    join(`${prefix}-valve`,'out',`${prefix}-mixer`,'in');
    join(`${prefix}-mixer`,'out',`${prefix}-screw`,'in',[
      [x+2.25,7.94,z],[x+2.25,6.3,feederZ],[x-.8,6.3,feederZ]
    ],'gravity','stucco');
    port('rear-distribution-lift',`blend-return-${i}`,[1,2.5+i*.5,0],[1,0,0],.2);
    join(`${prefix}-screw`,'out','rear-distribution-lift',`blend-return-${i}`,[
      [x+.8,feederY+.4,feederZ],[x+.8,feederY+.4,11.8],
      [-17,feederY+.4,11.8],[-17,2.6+i*.5,10.5]
    ],'mechanical','stucco');
    const controls=group(localPoint([x-1.8,6.75,11.65]),root);
    const cabinet=k.cabinet([0,0,0],controls);cabinet.scale.setScalar(.65);
  }

  // Additional illustrative process trains fill the open bays. They reuse the
  // existing drives and flange network; no building or original machine moves.
  install('infill-centre-bin','process-silo','main',[-29,12.15,3.6],{height:11.6,radius:1.22},null);
  install('infill-centre-weigh','hopper','main',[-29,6.15,3.6],{width:2.6,depth:2.4,height:4.5,weigh:true},null);
  support(-29,3.6,2.8,2.7,12.15,6);
  port('tower-elevator','centre-bin',[1.2,25,1.1],[1,0,0]);
  join('tower-elevator','centre-bin','infill-centre-bin','in',[[-29,25.55,-1],[-29,25.55,3.6]],'mechanical');
  join('infill-centre-bin','out','infill-centre-weigh','in');
  port('tower-buffer-screw','centre-weigh',[0,2.18,0],[0,1,0]);
  join('infill-centre-weigh','out','tower-buffer-screw','centre-weigh');

  // Two tall dosing stacks behind the southern service gallery, with open
  // mixers on the lower floor and powered return legs to the transfer screw.
  for(const [i,x] of [-33.6,-29.5].entries()){
    const id=`infill-dose-${i+1}`,z=11.95;
    install(`${id}-bin`,'process-silo','main',[x,18.15,z],{height:5.6,radius:.92},null);
    install(`${id}-weigh`,'hopper','main',[x,15.15,z],{height:2.4,width:1.8,depth:1.8,weigh:true},null);
    install(`${id}-valve`,'valve','main',[x,14.4,z],{},null,0,.45);
    install(`${id}-mixer`,'mixer','main',[x,6.15,z],{},null,0,.65);
    const mount=support(x,z,2.5,2.1,18.15,6);
    for(const y of [6.15,15.15])for(const zz of [-1.05,1.05])box(2.5,.18,.25,[0,y-.09,zz],frame,mount);
    port('tower-elevator',`dose-${i}`,[1.2,25,1.3+i*.2],[1,0,0]);
    join('tower-elevator',`dose-${i}`,`${id}-bin`,'in',[
      [-35.6,25.9,-1+i*.4],[-35.6,25.9,z],[x,25.9,z]
    ],'mechanical');
    join(`${id}-bin`,'out',`${id}-weigh`,'in');
    join(`${id}-weigh`,'out',`${id}-valve`,'in');
    join(`${id}-valve`,'out',`${id}-mixer`,'in');
    port('thermal-screw',`dose-return-${i}`,[x+29,2.18,0],[0,1,0],.18);
    join(`${id}-mixer`,'out','thermal-screw',`dose-return-${i}`,[
      [x,6.4,z],[x,6.4,14.95],[x,15.2+i*.35,14.95],[x,15.2+i*.35,14]
    ],'mechanical','stucco');
    const control=group(localPoint([x+1.1,6.15,12.9]),root);
    k.cabinet([0,0,0],control).scale.setScalar(.6);
  }

  // Water-service skids sit above the cooling line. Tanks, circulating pumps
  // and a supported supply header make the middle of the rear rack continuous.
  const water=k.material('#2d829e',.42,.45);
  for(const [i,x] of [-16,-10.6,-5.2,.2].entries()){
    const id=`infill-water-${i+1}`,z=13.85,pumpX=x+(i===1?.7:0);
    install(`${id}-tank`,'vessel','rear',[x,8.8,z],{horizontal:true},null);
    install(`${id}-pump`,'pump','rear',[pumpX,6.65,z],{},null);
    const seat=group(localPoint([x,6.5,z]),root);
    for(const xx of [-1.75,1.75])for(const zz of [-.9,.9])box(.14,2.3,.14,[xx,1.15,zz],frame,seat);
    for(const zz of [-.9,.9])box(3.8,.18,.24,[0,2.21,zz],frame,seat);
    for(const xx of [-1.75,1.75])box(.22,.18,2,[xx,2.21,0],frame,seat);
    port(`${id}-tank`,'return',[1,3.03,0],[0,1,0],.15,'water');
    port('water-buffer',`skid-${i}`,[-.6+i*.4,2.6,0],[0,1,0],.12,'water');
    const supplyX=-7.6+i*.4;
    join('water-buffer',`skid-${i}`,`${id}-tank`,'fill',[
      [supplyX,4.7,17],[supplyX,4.7,15.1],[supplyX,12.8+i*.18,15.1],
      [x-1,12.8+i*.18,15.1],[x-1,12.8+i*.18,z]
    ],'duct','water',water);
    join(`${id}-tank`,'out',`${id}-pump`,'in',[
      [x-2.65,10.45,z],[x-2.65,10.45,15.25],[x-2.65,7.45,15.25],[pumpX-1.5,7.45,15.25],[pumpX-1.5,7.45,z]
    ],'duct','water',water);
    join(`${id}-pump`,'out',`${id}-tank`,'return',[
      [pumpX-.15,8.55,z],[pumpX-.15,8.55,15.1],[pumpX-.15,12.3,15.1],[x+1,12.3,15.1],[x+1,12.3,z]
    ],'duct','water',water);
    equipment.gauge(localPoint([x+1.2,8.5,15.1]),root);
  }

  // A bank of extraction fans bridges the large gap above the rear filters.
  // Each has its own inlet branch and a sealed connection into the stack.
  for(const [i,x] of [-15,-10,-5,0].entries()){
    const id=`infill-extract-${i+1}`,filter=`rear-filter-${i<2?1:2}`;
    install(id,'fan','rear',[x,14.85,7.2],{},null);
    const seat=group(localPoint([x,11.15,7.2]),root);
    for(const xx of [-1.2,1.2])for(const zz of [-.75,.75])box(.12,3.7,.12,[xx,1.85,zz],frame,seat);
    for(const zz of [-.75,.75])box(2.7,.18,.2,[0,3.61,zz],frame,seat);
    port(filter,`upper-fan-${i}`,[-.8+(i%2)*1.6,6.5,1.15],[0,0,1],.25,'air');
    const sourceX=(i<2?-10:-5)-.8+(i%2)*1.6;
    join(filter,`upper-fan-${i}`,id,'in',[
      [sourceX,14.35,6.1],[x-.4,14.35,6.1],[x-.4,14.35,8.35],[x-.4,15.95,8.35]
    ],'duct','air');
    port('rear-filter-stack',`upper-fan-${i}`,[.3,17-i*.35,0],[1,0,0],.25,'air');
    join(id,'out','rear-filter-stack',`upper-fan-${i}`,[
      [x+.25,18.15,7.2],[x+.25,18.15,8.6],[-14.8,18.15,8.6],[-14.8,17-i*.35,10.5]
    ],'duct','air');
  }
}
