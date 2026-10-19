import {localPoint,BOARD_START,PALLET_ROBOT_BASE} from './processPlan.js';
import {machinePort} from './equipmentConnections.js';
import {buildProcessTower} from './processTower.js';
import {JOURNEY_STAGE as S} from '../journey.js';
import {createArchiveEquipment} from './archiveEquipment.js';

// The first leg takes a dry sheet off the supply pallet into the finishing magazine.
export const CEILING_ROUTE=[[5,1.18,-25.6],[5,1.18,-23],[14,1.18,-23],[28,1.18,-23],[40,1.18,-23],[53,1.18,-23],[69,1.18,-23],[69,1.18,-33.5],[58,1.18,-33.5],[40,1.18,-33.5],[26,1.18,-33.5],[20,1.18,-33.5]];
export const INTERIOR_VIEWS=[
  {id:'ceiling',name:'Potolok panelleri',zone:'GK',position:[-4,14,-39],target:[6,1.3,-27]},
  {id:'dosing',name:'Köp gatly önümçilik binasy',zone:'BS',position:[-61,31,46],target:[-29,12,5]},
  {id:'bagging',name:'Haltalama enjamlary',zone:'GR',position:[-47,17,-53],target:[-31,2.2,-31]},
  {id:'utilities',name:'Howa we suw ulgamy',zone:'BS',position:[19,25,31],target:[-7,5,10]},
  {id:'finishing',name:'Gaplama we paletleme',zone:'GP',position:[57,20,-52],target:[43,2,-31]},
];

// Reference numbers match docs/equipment-reference-map.json (sorted archive PNGs).
// Small valves/drives belong to their machines, not to a disconnected display row.
export function buildInteriorEquipment(k,{root,equipment,machines,network}){
  const models=createArchiveEquipment(k,equipment);
  const {box,cyl,rod,pipe,group,m}=k,{steel,panel,dark}=models.materials;
  const inventory=[];
  const units={...machines};
  function install(id,kind,zone,position,options={},references=[],yaw=0,scale=1,parent=root){
    const g=group(parent===root?localPoint(position):position,parent);
    g.name=`interior-${id}`;g.rotation.y=yaw;g.scale.setScalar(scale);
    g.userData.equipment={id,kind,zone,references};
    models.builders[kind](g,zone,options);
    units[id]=g;
    inventory.push({id,kind,zone,position,scale,references});
    if(position[0]>-37&&position[0]<-21&&position[2]>-9&&position[2]<19&&position[1]>.6&&['hopper','filter','cyclone','mill','screw','fan'].includes(kind)){
      const level=[24.5,18,12,6,0].find(y=>y<=position[1]),height=position[1]-level;
      const w=(options.width||({filter:2.9,cyclone:1.9,mill:3,screw:options.length||5,fan:2.4}[kind])||2.8)*scale;
      const d=(options.depth||({filter:1.8,cyclone:1.9,mill:2.4,screw:.85,fan:1.5}[kind])||2.8)*scale;
      const seat=group(localPoint([position[0],level,position[2]]),root);
      for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])if(height>.05){box(.12,height,.12,[x,height/2,z],dark,seat);box(.35,.08,.35,[x,.04,z],steel,seat);}
      for(const z of [-d/2,d/2]){box(w+.4,.14,.4,[0,height-.08,z],dark,seat);box(15,.20,.14,[-29-position[0],-.16,z],dark,seat);}
      for(const x of [-w/2,w/2])box(.4,.14,d+.4,[x,height-.08,0],dark,seat);
    }
    return g;
  }
  function deck(x,z,w,d,y){
    const g=group(localPoint([x,0,z]),root);
    // Open service walkways keep the machinery visible from above.
    for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2]){
      box(.18,y,.18,[xx,y/2,zz],dark,g);box(.45,.08,.45,[xx,.04,zz],steel,g);
    }
    for(const zz of [-d/2,d/2]){
      box(w,.14,.85,[0,y,zz],dark,g);
      for(let xx=-w/2;xx<w/2;xx+=.3)box(.035,.025,.83,[xx,y+.085,zz],steel,g);
      for(let xx=-w/2;xx<=w/2;xx+=w/Math.ceil(w/1.5))rod([xx,y,zz],[xx,y+1.05,zz],.03,m.yellow,g);
      for(const yy of [.5,1.05])rod([-w/2,y+yy,zz],[w/2,y+yy,zz],.035,m.yellow,g);
    }
    for(const xx of [-w/2,w/2])box(.85,.14,d,[xx,y,0],dark,g);
    k.ladder(y,-w/2-.5,d/2,g,true);return g;
  }
  function label(text,x,y,z,width=3){k.textPlate(text,width,.34,localPoint([x,y,z]),root,'#344f5c','#e4e9e7');}
  function pallet(x,z,w=2.4,d=1.4,layers=14){
    const g=group(localPoint([x,0,z]),root);
    for(const zz of [-d*.35,0,d*.35])box(w,.14,.18,[0,.12,zz],m.wood,g);
    for(const xx of [-w*.35,0,w*.35])box(.18,.1,d,[xx,.23,0],m.wood,g);
    for(let n=0;n<layers;n++)box(w-.08,.035,d-.08,[0,.32+n*.039,0],m.paper,g);
    for(const xx of [-w*.28,w*.28])box(.045,.02,d,[xx,.35+layers*.039,0],m.blue,g);
    return g;
  }
  // Processing-block floors survive the architectural cutaway.
  for(const [x,z,w,d] of [[-29,5,16.5,28.5],[-8,11,24.5,20.5],[-47,-5,12.5,12.5],[-36.5,33,15.5,12]]){
    box(w,.14,d,localPoint([x,-.015,z]),m.floor,root);
    for(let xx=x-w/2+3;xx<x+w/2;xx+=3)box(.018,.008,d,localPoint([xx,.065,z]),steel,root);
  }
  // Keep a clear longitudinal pedestrian aisle between the board and finishing lines.
  for(const z of [-19.7,-18.3])box(124,.012,.07,localPoint([8,.075,z]),m.yellow,root);
  for(const x of [-55,-20,4,71])box(.07,.012,26,localPoint([x,.076,-25]),m.yellow,root);

  // Preparation tower: elevated day bin, weighing hopper, screws and separator.
  buildProcessTower(k,root);
  deck(-29,-2.5,7,6,6);deck(-29,-2.5,7,6,12);deck(-29,-2.5,7,6,18);
  install('tower-day-bin','hopper','BS',[-29,18.15,-2.5],{width:4.1,depth:3.8,height:4.5},[19,33,44]);
  install('tower-weighing','hopper','BS',[-29,12.15,-2.5],{width:3.1,depth:2.8,height:3.8,weigh:true},[21,34]);
  install('tower-rotary-feed','valve','BS',[-29,10.8,-2.5],{},[4]);
  install('tower-screen','screen','BS',[-29,7.2,-2.5],{round:true},[57]);
  install('tower-discharge','valve','BS',[-26.5,6.1,-2.5],{diverter:true},[12,30]);
  install('tower-open-screw','screw','BS',[-24.644,3.35,-2.5],{length:5.8},[3,17]);
  install('tower-gate','valve','BS',[-26.5,5.2,-2.5],{gate:true},[1,16,20],Math.PI/2,.65);
  install('tower-elevator','elevator','BS',[-34.8,.1,-4.5],{height:25.2},[5]);
  install('tower-aspiration','filter','BS',[-23.7,18.15,-4.5],{height:5.5},[15]);
  label('DOZALAMA',-29,19.1,1.2,4);

  // Milling and air handling fill the previously empty tall rear building.
  deck(-8,9,19,15,6.5);
  install('vertical-mill','mill','BS',[-33,6.15,7.5],{vertical:true},[51]);
  install('process-column','cyclone','BS',[-33,18.15,7.5],{height:7.1},[61]);
  install('cyclone-separator','cyclone','BS',[-13,.1,14],{height:7.7},[36]);
  install('pulse-filter','filter','BS',[-25.4,12.15,8.4],{height:7.2,industrial:true},[15],0,1.7);
  install('silo-vent','filter','BS',[-25.4,24.5,8.4],{height:1.3,round:true},[7,14]);
  install('extraction-fan','fan','BS',[-25.4,24.65,4],{},[9,25]);
  install('roots-blower','fan','BS',[-23.7,24.65,-4.5],{blower:true},[68]);
  install('air-compressor','compressor','BS',[1,.1,12.5],{},[67]);
  install('air-receiver','vessel','BS',[-3,.1,13],{height:4.7},[35]);
  install('water-buffer','vessel','GK',[-7,.1,17],{horizontal:true},[50]);
  install('liquid-metering','pump','GK',[-10,.1,17],{},[10]);
  install('air-damper','damper','BS',[-21,11,2.95],{},[23,29]);
  units['air-damper'].rotation.x=Math.PI/2;
  install('air-branch-valve','butterfly','BS',[-1.2,1.32,13],{},[8,22,71],0,.35);
  // Visible corrugated expansion joint in the hot-air duct (reference 69).

  const exhaust=group(localPoint([-24.2,24.65,1.2]),root);
  cyl(.36,6.5,[0,3.25,0],steel,exhaust);for(let y=.4;y<6.5;y+=1.2)k.ring(.38,.035,[0,y,0],dark,exhaust);
  cyl(.6,.35,[0,6.8,0],panel,exhaust,0);inventory.push({id:'exhaust-stack',kind:'stack',zone:'BS',position:[-24.2,24.65,1.2],references:[24]});
  machinePort(k,exhaust,'in',[0,0,0],[0,-1,0],.36,'air');
  units['exhaust-stack']=exhaust;
  label('HOWA WE SUW',-8,7.7,17,4.5);

  install('cyclone-recovery','hopper','BS',[-33,12.15,7.5],{height:3.6,width:2.6,depth:2.6},[13]);
  install('filter-recovery','hopper','BS',[-25.4,6.15,8.4],{height:3.7,width:2.7,depth:2.7},[19]);
  install('stucco-distributor','diverter','BS',[-25.4,3.8,14],{},[28,60]);

  // Compact calcite preparation and metering in the small left-hand block.
  install('calcite-hopper','hopper','TY',[-50,.1,-7],{width:2.7,depth:2.7,height:3,grate:true},[13,66]);
  install('calcite-screen','screen','TY',[-43.5,.1,-6],{length:3.4},[18,39]);
  install('calcite-elevator','elevator','TY',[-47,.1,-7],{height:10.2},[5]);
  install('calcite-air-filter','filter','TY',[-48,5.8,-3.5],{height:2.4,round:true},[14]);
  install('calcite-transfer','belt','TY',[-44,.1,-9],{length:4,width:.9},[11,37]);

  // Thermal preparation: burner, cooling drum, air controls and enclosed screws.
  install('cooling-drum','drum','BS',[-8,.1,15.5],{length:8},[56,65]);
  install('thermal-burner','burner','BS',[-37.2,1.87,8],{},[32],0,.65);
  install('thermal-vessel','hopper','BS',[-25.4,6.15,14],{height:4.3,width:3,depth:2.7,weigh:true},[38]);
  install('thermal-screw','screw','BS',[-29,12.15,14],{length:9,closed:true,yellowCover:true},[6]);
  install('gypsum-magnetic-trap','magneticTrap','CR',[-31.5,.2,30.2],{},[26,48]);
  install('gypsum-diverter','diverter','CR',[-29.6,7.5,27.5],{},[60]);
  install('hammer-mill','mill','TY',[-39.5,.1,34],{},[54,62]);
  install('twin-roll-feed','mill','TY',[-49.5,.1,34],{},[63],0,.75);
  install('transfer-weigher','belt','TY',[-44.4,.1,34],{length:4.3,width:1.2},[45]);

  // Dry-mix metering / bag filling along the west end of the production hall.
  deck(-51,-18,5.5,5,3.4);
  install('drymix-day-bin','hopper','GR',[-51,3.6,-18],{width:3,depth:2.6,height:3.2,weigh:true},[44,34]);
  install('drymix-screw','screw','GR',[-49.783,1.7,-18.884],{length:4.7,closed:true},[17],Math.PI/5);
  install('additive-pan','mixer','GR',[-54,.1,-24.5],{pan:true},[58],0,.8);
  install('ribbon-mixer','mixer','GR',[-35.5,.1,-24.5],{},[47]);
  install('vibrating-classifier','screen','GR',[-29,.1,-25],{round:true},[57],0,.85);
  install('manual-bag-dump','bagDump','GR',[-54,.1,-29],{},[31,49]);
  install('bulk-bag-filler','bagStation','GR',[-54,.1,-35],{bulk:true},[42]);
  install('rotary-packer','bagStation','GR',[-23.5,.1,-34],{rotary:true},[53]);
  install('bag-magazine','palletizer','GR',[-23.5,.1,-26.5],{},[64,70],0,.72);
  install('bag-discharge-belt','belt','GR',[-28,.1,-34],{length:4.2,width:.85},[45]);
  install('bag-spout','telescopic','GR',[-43,1.3,-32.5],{},[55],0,.5);
  label('HALTALAMA',-25,5.5,-37.2,4);

  deck(-46,-8.5,4.5,4.5,2);
  install('board-slurry-mixer','mixer','GK',[-46,2.1,-8.5],{pan:true,wet:true},[58]);

  // Liner-paper reels, matching the full production-hall references 78 and 82.
  const reels=group(localPoint([-51,.1,-13]),root);
  for(const x of [-2.5,2.5]){
    const roll=models.moving(group([x,1.25,0],reels),'GK','rotate','z',.25);
    equipment.cylinder(.95,1.8,[0,0,0],m.paper,roll,'z');
    for(const z of [-.92,.92])equipment.cylinder(.21,.04,[0,0,z],m.wood,roll,'z');
    for(const z of [-1,1]){box(.16,1.25,.16,[x,.64,z],dark,reels);box(2.5,.12,.35,[x,.12,z],steel,reels);}
    box(.12,.03,1.75,[x-.9,1.5,0],panel,roll);
  }
  inventory.push({id:'liner-paper-reels',kind:'paper-unwind',zone:'GK',position:[-51,.1,-13],references:[78,82]});

  // Ceiling-panel finishing line: coating / lamination, guillotine, perforation,
  // inspection tunnel and receiver, with a continuous real roller bed underneath.
  install('panel-lamination','tunnel','GK',[14,0,-23],{length:5,width:3,withBelt:false},[52]);
  install('panel-crosscut','table','GK',[28,0,-23],{kind:'cut',withBed:false,synchronized:true},[46]);
  install('panel-perforation','table','GK',[40,0,-23],{kind:'press',length:4.6,withBed:false,synchronized:true},[43]);
  install('panel-inspection','tunnel','GK',[53,0,-23],{length:5.5,width:3,withBelt:false},[52,77]);
  install('panel-stack-lift','table','GP',[17,0,-33.5],{kind:'lift',length:3.5},[43]);
  // The moving panels disappear inside a covered receiving pocket, then leave
  // as the visible stacks next to its lift instead of vanishing over bare floor.
  const receiver=group(localPoint([20,0,-33.5]),root);
  receiver.rotation.y=Math.PI;
  for(const z of [-1.4,1.4])box(3.6,.85,.10,[0,1.55,z],panel,receiver);
  box(3.7,.12,2.9,[0,2,0],steel,receiver);box(.12,.85,2.9,[1.8,1.55,0],panel,receiver);
  pallet(5,-26.5,2.4,1.4,22).name='ceiling-supply-pallet';
  // Drive motors, suspended metal detector and connected dust extraction.
  for(const x of [14,28,40,53]){
    const drive=group(localPoint([x,.1,-25.4]),root);equipment.gearmotor([0,0,0],drive,.75);
    inventory.push({id:`panel-drive-${x}`,kind:'motor',zone:'GK',position:[x,.1,-25.4],references:[72]});
  }
  const magnet=group(localPoint([21,2.55,-23]),root);
  box(2,.6,2.3,[0,0,0],dark,magnet);
  for(const x of [-.8,.8])for(const z of [-1,1])rod([x,.3,z],[x,1.8,z],.025,steel,magnet);
  inventory.push({id:'panel-metal-detector',kind:'suspended-magnet',zone:'GK',position:[21,2.55,-23],references:[27]});
  install('panel-dust-collector','filter','GK',[48,.1,-29],{height:4.6},[15]);
  for(const id of ['panel-crosscut','panel-perforation'])machinePort(k,units[id],'air',[0,3.1,0],[0,1,0],.17,'air',{nozzle:.3});
  label('POTOLOK PANELLERI',30,3.6,-26.5,5.5);

  // Pallet/packing cells keep clear of the loading entrance at x=14.2.
  install('board-palletizer','palletizer','GP',[26,.1,-33.5],{inline:true},[70]);
  install('final-pack-tunnel','tunnel','GP',[40,0,-33.5],{length:4,width:2.8,withBelt:false},[52]);
  install('package-lift','table','GP',[55,.1,-36.5],{kind:'lift',length:3},[43]);
  for(const [x,z] of [[33,-36],[45,-36],[59,-36],[64,-37]])pallet(x,z);
  for(const x of [22,30,38,54,62])pallet(x,-29,1.5,1.3,8);
  // The robot shares the live board receiver and fills the output pallet.
  inventory.push({id:'existing-robot-cell',kind:'robot',zone:'GP',position:PALLET_ROBOT_BASE,references:[41,59]});
  inventory.push({id:'existing-jaw-crusher',kind:'jaw-crusher',zone:'CR',position:[60,0,34.8],references:[40]});
  inventory.push({id:'existing-storage-silos',kind:'silo',zone:'CR',position:[-25.6,0,30.2],references:[2,84]});
  // Reference 73: repeated electrical cabinets and a seated control desk.
  for(let x=63;x<=70;x+=1){const cab=k.cabinet(localPoint([x,.1,-37.8]),root);cab.scale.set(1,1.3,1);}
  const desk=group(localPoint([62,.1,-33]),root);
  box(3,.10,1.1,[0,1.05,0],panel,desk);for(const x of [-1.3,1.3])box(.12,1.05,.8,[x,.52,0],dark,desk);
  for(const x of [-.8,0,.8]){box(.66,.45,.05,[x,1.5,-.15],dark,desk);box(.56,.35,.01,[x,1.5,-.115],m.blueLight,desk);rod([x,1.05,-.15],[x,1.4,-.15],.025,steel,desk);}
  inventory.push({id:'electrical-control-bank',kind:'control-cabinets',zone:'GP',position:[66,.1,-37.8],references:[73,75]});
  label('GAPLAMA',42,4.5,-37.8,4);

  // Material circuits share the same mouths as the equipment meshes. Air and
  // water never reuse a powder port; vertical powder movement has an elevator.
  const port=(id,name)=>units[id]?.userData.ports?.[name];
  function join(a,out,b,input,via=[],kind='mechanical',material='powder',zone='BS'){
    const stages=zone==='GR'?[S.mix,S.form,S.pack]:zone==='GK'?[S.form,S.pack]:[S.calcine,S.mix];
    return network.connect(port(a,out),port(b,input),{via:via.map(localPoint),kind,material,zone,stages});
  }
  machinePort(k,units['vertical-mill'],'in2',[-1.35,2.9,.7],[-1,0,0],.28,'solid',{nozzle:.4});
  machinePort(k,units['tower-day-bin'],'recovered',[.8,4.5,0],[0,1,0],.22,'solid',{open:true});
  machinePort(k,units['thermal-vessel'],'recovered',[.8,4.3,0],[0,1,0],.22,'solid',{open:true});
  // Independent dust receivers avoid returning calcined dust to the raw mill.
  install('raw-dust-bag','bagStation','BS',[-23.7,12.15,-4.5],{bulk:true},[42]);
  const rawStack=group(localPoint([-22.5,24.65,-1.5]),root);
  cyl(.26,4.2,[0,2.1,0],steel,rawStack);cyl(.45,.15,[0,4.4,0],panel,rawStack);
  machinePort(k,rawStack,'in',[0,0,0],[0,-1,0],.26,'air');units['raw-air-stack']=rawStack;
  // Recovery hopper for the auxiliary cyclone; its product stays contained.

  join('CR','out1','vertical-mill','in',[
    [-27.6,.65,30.2],[-36,.65,30.2],[-36,10,30.2],[-36,10,7.5],[-35,10,7.5],[-35,9.05,7.5]
  ],'mechanical','raw');
  join('CR','out2','vertical-mill','in2',[
    [-23.6,.65,30.2],[-35,.65,29],[-35,9.05,29],[-35,9.05,8.2]
  ],'mechanical','raw');
  join('vertical-mill','out','tower-elevator','in',[
    [-33,6.7,5],[-36,6.7,5],[-36,.55,5],[-36,.55,-4.5]
  ]);
  join('tower-elevator','out','tower-day-bin','in',[[-32.8,24.7,-4.5],[-29,24.7,-4.5],[-29,24.7,-2.5]]);
  join('tower-day-bin','out','tower-weighing','in',[],'gravity');
  join('tower-weighing','out','tower-rotary-feed','in',[],'gravity');
  join('tower-rotary-feed','out','tower-screen','in',[],'gravity');
  join('tower-screen','out','tower-discharge','in',[],'gravity');
  join('tower-discharge','out','tower-gate','in',[],'gravity');
  join('tower-gate','out','tower-open-screw','in',[],'gravity');
  join('tower-open-screw','out','BS','in',[
    [-22.788,3.65,-2.5],[-22,3.65,-2.5],[-22,6.2,-2.5],[-22,6.2,12],[-35.7,6.2,12],[-35.7,6.2,8],[-34.65,6.2,8]
  ]);
  join('thermal-burner','out','BS','heat',[],'duct','heat');
  join('BS','out','cooling-drum','in',[
    [-23.5,1.85,10.6],[-19,1.85,10.6],[-19,3.2,10.6],[-19,3.2,15.5],[-13,3.2,15.5],[-13,1.9,15.5]
  ],'mechanical','stucco');
  join('cooling-drum','out','thermal-screw','in',[
    [-4,.3,15.5],[-3,.3,18.5],[-3,15,18.5],[-31.88,15,18.5],[-31.88,15,14]
  ],'mechanical','stucco');
  join('thermal-screw','out','thermal-vessel','in',[],'gravity','stucco');
  join('thermal-vessel','out','stucco-distributor','in',[],'gravity','stucco');
  join('stucco-distributor','dry','drymix-day-bin','in',[
    [-26.6,3.1,14],[-36.5,3.1,14],[-36.5,8,14],[-36.5,8,-18],[-51,8,-18]
  ],'mechanical','stucco','GR');
  join('stucco-distributor','board','board-slurry-mixer','in',[
    [-24.2,3.1,14],[-20,3.1,14],[-20,7,14],[-20,7,-8.5],[-46,7,-8.5]
  ],'mechanical','stucco','GK');
  join('drymix-day-bin','out','drymix-screw','in',[],'gravity','stucco','GR');
  join('drymix-screw','out','GR','in',[
    [-48.57,2.2,-19.77],[-50,2.2,-21],[-50,7.7,-21],[-46.6,7.7,-21],[-46.6,7.7,-25.25]
  ],'mechanical','powder','GR');
  join('TY','out','GR','additives',[
    [-45.5,.65,22.5],[-40,.65,22.5],[-40,8.2,22.5],[-40,8.2,-25.25],[-41.6,8.2,-25.25]
  ],'mechanical','powder','GR');
  join('GR','out','bagging','in',[
    [-39,1.7,-22.3],[-38.5,1.7,-27.5],[-38.5,6.5,-27.5],[-44.3,6.5,-27.5],[-44.3,6.5,-32.5]
  ],'mechanical','powder','GR');
  join('manual-bag-dump','out','ribbon-mixer','in',[
    [-54,.35,-29],[-54,.35,-27],[-54,4.2,-27],[-35.5,4.2,-27],[-35.5,4.2,-24.5]
  ],'mechanical','powder','GR');
  join('ribbon-mixer','out','vibrating-classifier','in',[
    [-35.5,.4,-24.5],[-32,.4,-24.5],[-32,3.8,-24.5],[-29,3.8,-25]
  ],'mechanical','powder','GR');
  join('vibrating-classifier','out','rotary-packer','in',[
    [-26.8,1.222,-25],[-26.8,5.2,-25],[-23.5,5.2,-25],[-23.5,5.2,-34]
  ],'mechanical','powder','GR');

  // Pumped water enters only the wet board mixer. Finished dry-mix stays dry.
  join('water-buffer','out','liquid-metering','in',[[-10.8,1.2,17],[-11.6,1.2,17],[-11.6,.9,17]],'duct','water','GK');
  join('liquid-metering','out','board-slurry-mixer','water',[
    [-10.15,5.3,17],[-18,5.3,17],[-18,5.3,-6.5],[-46,5.3,-6.5],[-46,5.3,-9.8]
  ],'duct','water','GK');
  join('board-slurry-mixer','out','forming','slurry',[
    [-43.5,3.5,-8.5],[BOARD_START[0],3.2,-10.5],[BOARD_START[0],3.1,BOARD_START[2]]
  ],'gravity','slurry','GK');

  join('vertical-mill','air','process-column','in',[
    [-30.3,9.15,7.5],[-30.3,23.333,7.5]
  ],'duct','air');
  join('process-column','out','cyclone-recovery','in',[],'gravity');
  join('cyclone-recovery','out','tower-day-bin','recovered',[
    [-33,12.4,7.5],[-35.4,12.4,7.5],[-35.4,24,7.5],[-28.2,24,7.5],[-28.2,24,-2.5]
  ]);
  join('process-column','air','tower-aspiration','in',[
    [-33,25.6,7.5],[-21,25.6,7.5],[-21,25.6,-4.5],[-21,20.75,-4.5]
  ],'duct','air');
  join('tower-aspiration','out','raw-dust-bag','in',[],'gravity');
  join('tower-aspiration','air','roots-blower','in',[
    [-23.7,23.15,-6.8],[-26,23.15,-6.8],[-26,25.75,-6.8],[-26,25.75,-3.4],[-24.1,25.75,-3.4]
  ],'duct','air');
  join('roots-blower','out','raw-air-stack','in',[[-23.45,27.4,-4.5],[-22.5,27.4,-4.5],[-22.5,23.8,-1.5]],'duct','air');
  join('BS','exhaust','air-damper','in',[[-23.5,5.4,3.8],[-21,5.4,3.8]],'duct','air');
  join('air-damper','out','pulse-filter','in',[[-21,16.57,3.8],[-20.9,16.57,8.4]],'duct','air');
  join('pulse-filter','out','filter-recovery','in',[],'gravity','stucco');
  join('filter-recovery','out','thermal-vessel','recovered',[
    [-25.4,6.4,8.4],[-22,6.4,8.4],[-22,11.5,8.4],[-24.6,11.5,14]
  ],'mechanical','stucco');
  join('pulse-filter','air','extraction-fan','in',[
    [-25.4,23.54,5.1],[-27,23.54,5.1],[-27,25.75,5.1],[-25.8,25.75,5.1]
  ],'duct','air');
  join('extraction-fan','out','exhaust-stack','in',[[-25.15,27.4,4],[-24.2,27.4,4],[-24.2,23.8,1.2]],'duct','air');
  join('cooling-drum','air','cyclone-separator','in',[[-2.5,3.8,15.5],[-2.5,5.721,15.5],[-10.9,5.721,14]],'duct','air');
  // Cyclone fines drop into a sealed receiver; clean air joins its own vent.
  // This auxiliary leg is not routed back into raw feed or the wet mixer.
  const auxVent=group(localPoint([-13,9,14]),root);cyl(.34,3,[0,1.5,0],steel,auxVent);
  machinePort(k,auxVent,'in',[0,0,0],[0,-1,0],.34,'air');units['cooler-vent']=auxVent;
  join('cyclone-separator','air','cooler-vent','in',[],'duct','air');
  // Closed discharge boot catches separated fines without exposing moving dust.
  const boot=group(localPoint([-13,.1,14]),root);box(1.15,.22,1.15,[0,.11,0],dark,boot);
  machinePort(k,boot,'in',[0,.25,0],[0,1,0],.22,'solid');units['cyclone-boot']=boot;
  join('cyclone-separator','out','cyclone-boot','in',[],'gravity');

  join('air-compressor','out','air-branch-valve','in',[[2.7,.75,12.5],[2.7,.75,11],[-.6,.75,11],[-.6,1.6,11],[-.6,1.6,13]],'duct','air');
  join('air-branch-valve','out','air-receiver','in',[],'duct','air');
  // Dust extraction for the ceiling finishing tools has a supported manifold.
  const manifold=group(localPoint([34,5.5,-27]),root);
  cyl(.3,.7,[0,0,0],steel,manifold);
  for(const [name,p,n] of [['cut',[-.35,0,0],[-1,0,0]],['press',[.35,0,0],[1,0,0]],['out',[0,0,-.45],[0,0,-1]]])machinePort(k,manifold,name,p,n,.22,'air',{nozzle:.4});
  units['finishing-manifold']=manifold;
  join('panel-crosscut','air','finishing-manifold','cut',[[28,5.5,-23],[28,5.5,-27]],'duct','air','GK');
  join('panel-perforation','air','finishing-manifold','press',[[40,5.5,-23],[40,5.5,-27]],'duct','air','GK');
  join('finishing-manifold','out','panel-dust-collector','in',[[34,5.5,-28],[51,5.5,-28],[51,2.7,-29]],'duct','air','GK');
  install('finishing-extraction-fan','fan','GK',[51,.1,-31.5],{},[9]);
  const finishingVent=group(localPoint([54,4,-31.5]),root);cyl(.3,3.8,[0,1.9,0],steel,finishingVent);
  machinePort(k,finishingVent,'in',[0,0,0],[0,-1,0],.3,'air');units['finishing-vent']=finishingVent;
  join('panel-dust-collector','air','finishing-extraction-fan','in',[[48,4.2,-31],[48,1.2,-30.3],[50.6,1.2,-30.3]],'duct','air','GK');
  join('finishing-extraction-fan','out','finishing-vent','in',[[51.25,3.2,-31.5],[54,3.2,-31.5]],'duct','air','GK');
  machinePort(k,units['pulse-filter'],'cleaningAir',[1.65,7.65,.7],[1,0,0],.09,'air',{nozzle:.15});
  join('air-receiver','out','pulse-filter','cleaningAir',[[-1.1,2.7,13],[-20,2.7,13],[-20,25.155,13],[-20,25.155,9.59]],'duct','air');

  return {inventory,units,update:models.update};
}
