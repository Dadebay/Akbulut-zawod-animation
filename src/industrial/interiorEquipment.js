import {localPoint,BOARD_START,PROCESS_AISLE_Z,GYPSUM_STORAGE} from './processPlan.js';
import {machinePort} from './equipmentConnections.js';
import {buildProcessTower} from './processTower.js';
import {JOURNEY_STAGE as S} from '../journey.js';
import {createArchiveEquipment} from './archiveEquipment.js';
import {buildProcessBuildingEquipment} from './processBuildingEquipment.js';
import {buildServiceAnnexEquipment} from './serviceAnnexEquipment.js';
import {createCeilingPanelStyles} from './ceilingPanelStyles.js';

// The first leg takes a dry sheet off the supply pallet into the finishing magazine.
export const INTERIOR_VIEWS=[
  {id:'dosing',name:'Köp gatly önümçilik binasy',zone:'BS',position:[-73,40,58],target:[-23,11,7]},
  {id:'utilities',name:'Silo, süzgüç we sowadyş binasy',zone:'BS',position:[32,35,51],target:[-8,8,11]},
  {id:'services',name:'Hyzmat we kompressor otaglary',zone:'BS',position:[13,23,6],target:[-11.2,1.7,-4]},
  {id:'finishing',name:'BEUMER paletleme',zone:'GP',position:[-40,11,-31],target:[-28.7,2.6,-23.5]},
];

// Reference numbers match docs/equipment-reference-map.json (sorted archive PNGs).
// Small valves/drives belong to their machines, not to a disconnected display row.
export function buildInteriorEquipment(k,{root,equipment,machines,network}){
  const models=createArchiveEquipment(k,equipment);
  const {box,cyl,rod,pipe,group,m}=k,{steel,panel,dark}=models.materials;
  const inventory=[];
  const panelStyles=createCeilingPanelStyles(k);
  const units={...machines};
  function install(id,kind,zone,position,options={},references=[],yaw=0,scale=1,parent=root){
    const g=group(parent===root?localPoint(position):position,parent);
    g.name=`interior-${id}`;g.rotation.y=yaw;g.scale.setScalar(scale);
    g.userData.equipment={id,kind,zone,references};g.userData.equipmentOptions=options;
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
  function label(text,x,y,z,width=3){return k.textPlate(text,width,.34,localPoint([x,y,z]),root,'#344f5c','#e4e9e7');}
  function pallet(x,z,w=2.4,d=1.4,layers=14,finish=null){
    const g=group(localPoint([x,0,z]),root);
    for(const zz of [-d*.35,0,d*.35])box(w,.14,.18,[0,.12,zz],m.wood,g);
    for(const xx of [-w*.35,0,w*.35])box(.18,.1,d,[xx,.23,0],m.wood,g);
    for(let n=0;n<layers-(finish===null?0:1);n++)box(w-.08,.035,d-.08,[0,.32+n*.039,0],finish===null?m.paper:panelStyles.plain[finish],g);
    if(finish!==null){
      const top=panelStyles.sheet(g,.3025+(layers-1)*.039,finish);
      top.scale.set((w-.08)/1.28,1,(d-.08)/1.28);
      g.userData.panelType=top.userData.panelType;
    }
    for(const xx of [-w*.28,w*.28])box(.045,.02,d,[xx,.35+layers*.039,0],m.blue,g);
    return g;
  }
  // Processing-block floors survive the architectural cutaway.
  for(const [x,z,w,d] of [[-29,5,16.5,28.5],[-8,11,24.5,20.5],[-47,-5,12.5,12.5],[-36.5,33,15.5,12]]){
    box(w,.14,d,localPoint([x,-.015,z]),m.floor,root);
    for(let xx=x-w/2+3;xx<x+w/2;xx+=3)box(.018,.008,d,localPoint([xx,.065,z]),steel,root);
  }
  // Keep a clear longitudinal pedestrian aisle between the board and finishing lines.
  for(const z of [PROCESS_AISLE_Z-.7,PROCESS_AISLE_Z+.7])box(124,.012,.07,localPoint([8,.075,z]),m.yellow,root);
  // Cross aisles stop short of the south-bay board line.
  for(const x of [-55,-20,4,71])box(.07,.012,12.8,localPoint([x,.076,-23]),m.yellow,root);

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
  install('calcite-hopper','hopper','TY',[-50,.1,-7],{width:2.7,depth:2.7,height:3,grate:true,outletRadius:.16},[13,66]);
  install('calcite-screen','screen','TY',[-43.5,.1,-6],{length:3.4},[18,39]);
  install('calcite-elevator','elevator','TY',[-47,.1,-7],{height:10.2},[5]);
  install('calcite-air-filter','filter','TY',[-48,5.8,-3.5],{height:2.4,round:true},[14]);
  install('calcite-transfer','belt','TY',[-44,.1,-9],{length:4,width:.9},[11,37]);

  // Thermal preparation: burner, cooling drum, air controls and enclosed screws.
  install('cooling-drum','drum','BS',[-8,.1,15.5],{length:8},[56,65]);
  install('thermal-burner','burner','BS',[-37.2,1.87,8],{},[32],0,.65);
  install('thermal-vessel','hopper','BS',[-25.4,6.15,14],{height:4.3,width:3,depth:2.7,weigh:true},[38]);
  install('thermal-screw','screw','BS',[-29,12.15,14],{length:9,closed:true,yellowCover:true},[6]);
  install('gypsum-magnetic-trap','magneticTrap','CR',[GYPSUM_STORAGE.x-5.9,.2,GYPSUM_STORAGE.z],{},[26,48]);
  install('gypsum-diverter','diverter','CR',[-29.6,7.5,27.5],{},[60]);
  install('hammer-mill','mill','TY',[-39.5,.1,34],{},[54,62]);
  install('twin-roll-feed','mill','TY',[-49.5,.1,34],{outletY:.42},[63],0,.75);
  install('transfer-weigher','belt','TY',[-44.4,.1,34],{length:4.3,width:1.2},[45]);
  machinePort(k,units['transfer-weigher'],'in',[-2.15,1.2,0],[-1,0,0],.25,'solid',{open:true});
  machinePort(k,units['transfer-weigher'],'out',[2.15,1.2,0],[1,0,0],.25,'solid');

  // The dry-mix day bin remains on the process side; the floor-level mixer,
  // classifier and bag-filling display do not belong in this hall.
  deck(-51,-18,5.5,5,3.4);
  install('drymix-day-bin','hopper','GR',[-51,3.6,-18],{width:3,depth:2.6,height:3.2,weigh:true},[44,34]);
  install('drymix-screw','screw','GR',[-49.783,1.7,-18.884],{length:4.7,closed:true},[17],Math.PI/5);
  // Bags are filled in the big process building and reach the BEUMER line on
  // its elevated feed; the potolok pallet cell occupies its own south floor bay.

  deck(-46,-8.5,4.5,4.5,2);
  install('board-slurry-mixer','mixer','GK',[-46,2.1,-8.5],{pan:true,wet:true},[58]);

  // The liner-paper reels were replaced by the parent-roll stands in boardLineHall.

  // No second ceiling production line or robot cell occupies this process hall.
  inventory.push({id:'existing-jaw-crusher',kind:'jaw-crusher',zone:'CR',position:[60,0,34.8],references:[40]});
  inventory.push({id:'existing-storage-silos',kind:'silo',zone:'CR',position:[GYPSUM_STORAGE.x,0,GYPSUM_STORAGE.z],references:[2,84]});
  for(let x=32;x<=38;x+=1){const cab=k.cabinet(localPoint([x,.1,-28.7]),root);cab.scale.set(1,1.3,1);}
  const desk=group(localPoint([44,.1,-28.7]),root);
  box(3,.10,1.1,[0,1.05,0],panel,desk);for(const x of [-1.3,1.3])box(.12,1.05,.8,[x,.52,0],dark,desk);
  for(const x of [-.8,0,.8]){box(.66,.45,.05,[x,1.5,-.15],dark,desk);box(.56,.35,.01,[x,1.5,-.115],m.blueLight,desk);rod([x,1.05,-.15],[x,1.4,-.15],.025,steel,desk);}
  inventory.push({id:'electrical-control-bank',kind:'control-cabinets',zone:'GP',position:[35,.1,-28.7],references:[73,75]});

  // Material circuits share the same mouths as the equipment meshes. Air and
  // water never reuse a powder port; vertical powder movement has an elevator.
  const port=(id,name)=>units[id]?.userData.ports?.[name];
  function join(a,out,b,input,via=[],kind='mechanical',material='powder',zone='BS',support={}){
    const stages=zone==='GR'?[S.mix,S.form,S.pack]:zone==='GK'?[S.form,S.pack]:[S.calcine,S.mix];
    return network.connect(port(a,out),port(b,input),{via:via.map(localPoint),kind,material,zone,stages,...support});
  }
  machinePort(k,units['vertical-mill'],'in2',[-1.35,2.9,.7],[-1,0,0],.28,'solid',{nozzle:.4});
  machinePort(k,units['tower-day-bin'],'recovered',[.8,4.5,0],[0,1,0],.22,'solid',{open:true});
  machinePort(k,units['thermal-vessel'],'recovered',[.8,4.3,0],[0,1,0],.22,'solid',{open:true});
  machinePort(k,units['drymix-day-bin'],'calcite',[.8,3.2,0],[0,1,0],.22,'solid',{open:true});
  // Calcite rock enters on the stockyard belt, passes the two pre-crushers,
  // then reaches TY-001. Its discharge stays in sealed transfers to the south
  // annex rather than ending at a disconnected mouth beside the mill.
  join('twin-roll-feed','out','transfer-weigher','in',[
    [-49.5,.42,32.1],[-47.5,1.3,32.1],[-47.5,1.3,34]
  ],'mechanical','raw','TY');
  join('transfer-weigher','out','hammer-mill','in',[
    [-40.8,1.3,34],[-40.8,4.1,34]
  ],'mechanical','raw','TY');
  join('hammer-mill','out','TY','in',[
    [-39.5,.65,29],[-39.5,5.2,29],[-45.5,5.2,29],[-45.5,5.2,25]
  ],'mechanical','raw','TY',{hangerY:7.7});
  join('TY','out','calcite-hopper','in',[
    [-45.5,.75,20],[-48.5,.75,20],[-48.5,5.7,20],[-48.5,5.7,-7],[-50,5.7,-7]
  ],'mechanical','powder','TY');
  join('calcite-hopper','out','calcite-elevator','in',[
    [-50,.6,-7],[-49,.6,-7]
  ],'mechanical','powder','TY');
  join('calcite-elevator','out','calcite-screen','in',[
    [-44.8,9.8,-7],[-43.5,9.8,-7],[-43.5,9.8,-6]
  ],'mechanical','powder','TY');
  join('calcite-screen','out','drymix-day-bin','calcite',[
    [-40.5,1.3,-6],[-40.5,8,-6],[-40.5,8,-18],[-51,8,-18]
  ],'mechanical','powder','TY');
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
    [-22.788,3.65,-2.5],[-22.788,3.65,-.9],[-22,3.65,-.9],[-22,6.2,-.9],[-22,6.2,12],[-35.7,6.2,12],[-35.7,6.2,8],[-34.65,6.2,8]
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

  // Pumped water enters only the wet board mixer. Finished dry-mix stays dry.
  join('water-buffer','out','liquid-metering','in',[[-11.6,1.75,17],[-11.6,.9,17]],'duct','water','GK');
  join('liquid-metering','out','board-slurry-mixer','water',[
    [-10.15,5.3,17],[-18,5.3,17],[-18,5.3,-6.5],[-46,5.3,-6.5],[-46,5.3,-9.8]
  ],'duct','water','GK');
  // Slurry comes straight out of the front process building onto the forming
  // station, between the top and bottom liners (October 27 markup).
  join('board-slurry-mixer','out','forming','slurry',[
    [-43.5,3.5,-8.5],[BOARD_START[0],3.5,-8.5],[BOARD_START[0],3.1,BOARD_START[2]]
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
  machinePort(k,units['pulse-filter'],'cleaningAir',[1.65,7.65,.7],[1,0,0],.09,'air',{nozzle:.15});
  join('air-receiver','out','pulse-filter','cleaningAir',[[-1.1,2.7,13],[-1.1,4.9,13],[-20,4.9,13],[-20,25.155,13],[-20,25.155,9.59]],'duct','air');

  buildProcessBuildingEquipment(k,{root,models,equipment,units,inventory,network});
  buildServiceAnnexEquipment(k,{root,models,equipment,units,inventory,network});
  return {inventory,units,update:models.update};
}
