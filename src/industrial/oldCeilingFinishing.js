import * as T from 'three';
import {roundedConnection} from './equipmentConnections.js';
import {createCeilingPanelStyles,ceilingBatchType,CEILING_PANEL_TYPES} from './ceilingPanelStyles.js';

// Illustrative panel finishing equipment, within the existing old hall.
// The shared sheet cadence drives both transfers, so sheets have visible
// sources and destinations instead of appearing inside closed magazines.
export function buildOldCeilingFinishing(k,{parent,equipment,models,line,stockPallet}){
  const {box,cyl,rod,ring,group,mesh,textPlate,m}=k;
  const root=group([0,0,0],parent);root.name='old-ceiling-finishing';
  const steel=equipment.zinc,pale=equipment.enamel,dark=equipment.cast;
  const machines=[],pipes=[],payloads=[];
  const panelStyles=createCeilingPanelStyles(k),sheetFinishes=new WeakMap();
  const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*smooth(t);
  function unit(name,position){
    const g=group(position,root);g.name=`old-finishing-${name}`;machines.push(g);return g;
  }
  function duct(points,r=.12,mat=steel){
    const path=roundedConnection(points.map(p=>new T.Vector3(...p)),.24);
    const g=group([0,0,0],root);
    for(const curve of path.curves)
      mesh(new T.TubeGeometry(curve,Math.max(4,Math.ceil(curve.getLength()*3)),r,10,false),mat,[0,0,0],g);
    g.name='old-finishing-service-pipe';pipes.push({object:g,path,radius:r});return g;
  }
  function plaque(text,x,y,z,w=3.6){
    return textPlate(text,w,.40,[x,y,z],root,'#304551','#e9c842');
  }
  function deck(parent){
    for(const z of [-.7,0,.7])box(1.85,.09,.16,[0,.045,z],m.wood,parent);
    for(const x of [-.7,0,.7])for(const z of [-.7,0,.7])box(.16,.1,.16,[x,.14,z],m.wood,parent);
    for(let z=-.8;z<=.8;z+=.2)box(1.85,.07,.16,[0,.23,z],m.wood,parent);
  }
  function sheet(parent,y,cut=false){
    if(!cut)return panelStyles.sheet(parent,y,0,{split:false,pattern:false});
    const finish=panelStyles.choices(parent,y);sheetFinishes.set(finish.root,finish);
    return finish.root;
  }
  function gantry(name,x,z0,z1,cut){
    const g=unit(name,[x,0,0]),height=4.8;
    for(const xx of [-1.7,1.7])for(const z of [z0-1.65,z1+1.65]){
      box(.20,height,.24,[xx,height/2,z],pale,g);
      box(.5,.10,.5,[xx,.05,z],steel,g);
    }
    for(const xx of [-1.7,1.7])box(.22,.25,z1-z0+3.5,[xx,height,(z0+z1)/2],steel,g);
    for(const z of [z0-1.65,z1+1.65])box(3.6,.28,.22,[0,height,z],pale,g);
    const carriage=group([0,height-.2,z0],g,true);
    box(3.5,.18,.28,[0,0,0],dark,carriage);
    equipment.gearmotor([1.18,.12,0],carriage,.45,Math.PI/2);
    const head=group([0,0,z0],g,true);
    for(const xx of [-.5,.5]){
      box(.10,.08,1.12,[xx,.19,0],steel,head);
      for(const zz of [-.46,.46])cyl(.09,.10,[xx,.085,zz],m.rubber,head);
    }
    box(1.18,.10,.10,[0,.23,0],dark,head);
    const mast=box(.10,1,.10,[0,0,z0],steel,g);
    mast.userData.dynamic=true;
    const payload=sheet(head,0,cut);payload.userData.dynamic=true;
    payload.name=`${name}-carried-sheet`;payloads.push(payload);
    function pose(y,z){
      head.position.set(0,y,z);carriage.position.z=z;
      const h=height-.2-y-.3;
      mast.position.set(0,y+.3+h/2,z);mast.scale.y=h;
    }
    return {g,head,payload,pose};
  }

  // Raw blanks are lifted from an exposed stack behind the line. The bridge
  // crosses the north pedestrian strip above head height, with posts outside it.
  const feeder=gantry('vacuum-feeder',1,-114.5,line.z,false);
  const rawStack=unit('blank-lift-table',[1,.06,-114.5]);deck(rawStack);
  for(let i=0;i<24;i++)sheet(rawStack,.28+i*.035);
  for(const z of [-.65,.65])rod([-.65,.12,z],[.65,.25,z],.055,steel,rawStack);
  plaque('01 · LEWHA BESLEME',1,3.6,-107.0);
  for(const x of [-3.2,5.3])stockPallet(x,-114.5,root,1.3);

  // Four pressure rolls coat/laminate the already cut and perforated panels.
  const coater=unit('roller-coater',[37,0,line.z]);
  for(const z of [-1.65,1.65]){
    box(5.6,1.2,.16,[0,1.5,z],pale,coater);
    for(const x of [-2.6,2.6])box(.15,1,.22,[x,.5,z],dark,coater);
    equipment.panel(1.4,.75,[0,1.55,z+.09],coater);
  }
  for(const x of [-1.65,-.55,.55,1.65]){
    const roll=models.moving(group([x,1.49,0],coater),'GK','rotate','z',-1.5);
    equipment.cylinder(.27,2.9,[0,0,0],steel,roll,'z');
    box(.12,.035,.014,[0,.16,1.46],dark,roll);
    equipment.cylinder(.10,3.4,[x,1.49,0],dark,coater,'z');
  }
  equipment.gearmotor([1.65,1.49-.55*.48,2.15],coater,.55,-Math.PI/2);
  box(4.2,.14,2.5,[0,2.5,0],steel,coater);
  for(const z of [-1.25,1.25])box(4.2,.65,.06,[0,2.12,z],pale,coater);
  plaque('05 · ÖRTÜK',37,2.9,-106.72);
  const dryer=unit('curing-tunnel',[43.5,0,line.z]);
  models.builders.tunnel(dryer,'GK',{length:5.4,width:3.6,withBelt:false});
  for(const x of [-1.7,1.7]){
    box(1.15,.7,1.25,[x,3.55,0],pale,dryer);
    for(let z=-.45;z<=.45;z+=.15)box(.85,.045,.025,[x,3.6,z],dark,dryer);
  }
  plaque('06 · GURATMA',43.5,2.9,-106.5);
  duct([[43.5,3.7,line.z],[43.5,4.65,line.z],[43.5,4.65,-105.8]],.23);

  // Side services make the feed to the coating head visible; their pipes
  // cross the pedestrian strip at 4.35 m, below the building's trusses.
  for(const x of [18,26]){
    const tank=unit(`coating-tank-${x}`,[x,0,-114.85]);
    for(const xx of [-.52,.52])for(const zz of [-.52,.52])box(.10,.65,.10,[xx,.325,zz],dark,tank);
    cyl(.75,2.5,[0,1.85,0],pale,tank);
    for(const y of [.6,3.1])ring(.77,.045,[0,y,0],steel,tank);
    cyl(.75,.20,[0,3.2,0],steel,tank,.30);
    equipment.gearmotor([0,3.32,0],tank,.55);
    equipment.gauge([.35,1.35,.77],tank);
    plaque('ÖRTÜK GARYNDYSY',x,3.9,-114.0,3);
    duct([[x,.8,-114.1],[x,.8,-113.85]],.065);
  }
  duct([[18,.8,-113.85],[29,.8,-113.85],[29,.8,-114.85]],.065);
  const pump=unit('coating-pump',[29.66,.32,-114.85]);pump.scale.setScalar(.6);
  models.builders.pump(pump,'GK');
  duct([[29.57,1.352,-114.85],[29.57,4.35,-114.85],[37,4.35,-114.85],[37,4.35,line.z],[37,2.6,line.z]],.09);
  const compressor=unit('compressor',[8.4,0,-114.9]);compressor.scale.setScalar(.85);
  models.builders.compressor(compressor,'GK');
  duct([[9.42,.5525,-114.9],[10,.5525,-114.9],[10,4.6,-114.9],[1,4.6,-114.9],[1,4.6,-115.45]],.045,equipment.blue);
  const airUnit=unit('dryer-air-unit',[48,0,-114.85]);airUnit.scale.setScalar(.8);
  models.builders.fan(airUnit,'GK');
  // Air intake stays at the rear wall; the outlet leads into the curing hood.
  duct([[48.2,1.64,-114.85],[48.2,4.35,-114.85],[45.2,4.35,-114.85],[45.2,4.35,line.z],[45.2,3.9,line.z]],.23);

  // The return conveyor feeds an exposed vacuum stacker. Its delivery side
  // faces a separate low pallet conveyor, strapping arch and dispatch bay.
  const stacker=gantry('vacuum-stacker',57,-96,-91.3,true);
  plaque('08 · ISTIFLEME',57,4.0,-90.1);
  const conveyor=unit('pallet-conveyor',[61.3,0,-91.3]);
  for(const z of [-1.03,1.03]){
    box(11.6,.16,.12,[0,.24,z],dark,conveyor);
    for(const x of [-5.3,-2,2,5.3])box(.14,.25,.18,[x,.125,z],steel,conveyor);
  }
  for(let x=-5.65;x<=5.7;x+=.28)equipment.cylinder(.065,2,[x,.285,0],steel,conveyor,'z');
  const receiver=group([57,.35,-91.3],root,true);receiver.name='old-finishing-receiving-pallet';deck(receiver);
  const layers=Array.from({length:10},(_,i)=>{
    const layer=sheet(receiver,.28+i*.035,true);layer.userData.dynamic=true;return layer;
  });
  const outbound=group([57,.35,-91.3],root,true);outbound.name='old-finishing-outbound-pallet';deck(outbound);
  const outgoingLayers=Array.from({length:10},(_,i)=>sheet(outbound,.28+i*.035,true));
  const straps=group([0,0,0],outbound,true);
  for(const x of [-.47,.47]){
    box(.045,.012,1.38,[x,.642,0],equipment.blue,straps);
    for(const z of [-.685,.685])box(.045,.38,.012,[x,.46,z],equipment.blue,straps);
  }
  const wrapper=unit('strapping-arch',[63.2,0,-91.3]);
  for(const z of [-1.3,1.3]){
    box(.24,2.6,.24,[0,1.3,z],pale,wrapper);box(.5,.10,.5,[0,.05,z],steel,wrapper);
  }
  box(.28,.22,2.8,[0,2.65,0],pale,wrapper);
  const strapHead=group([0,1.75,0],wrapper,true);
  box(.30,.25,1.6,[0,0,0],dark,strapHead);
  equipment.cylinder(.36,.22,[.6,.6,1.4],equipment.blue,wrapper,'x');
  k.cabinet([.85,0,1.5],wrapper).scale.setScalar(.7);
  plaque('09 · GAPLAÝYŞ',63.2,3.15,-89.8);
  const dispatch=textPlate('TAÝÝAR ÖNÜM → ÝÜKLEME',9,.8,[60,.085,-88.15],root,'#385666','#dfe2db');
  dispatch.rotation.x=-Math.PI/2;

  // Material racks and an inspection bench fill the unused wall strip while
  // leaving the centre forklift circuit and the south loading opening free.
  for(const x of [5,18,31]){
    const rack=unit(`material-rack-${x}`,[x,0,-90]);
    for(const xx of [-2.5,2.5])for(const z of [-.60,.60])box(.10,4.5,.10,[xx,2.25,z],dark,rack);
    for(const y of [.2,1.65,3.1]){
      box(5.1,.12,1.3,[0,y,0],steel,rack);
      for(const [slot,xx] of [-1.6,0,1.6].entries()){
        const type=(Math.round(y/1.45)+slot+(x===31?2:0))%CEILING_PANEL_TYPES.length;
        if(x===18){
          equipment.cylinder(.4,1.05,[xx,y+.46,0],panelStyles.plain[type],rack,'z');
          equipment.cylinder(.12,1.08,[xx,y+.46,0],m.wood,rack,'z');
        }else for(let i=0;i<7;i++)box(1.35,.06,1.1,[xx,y+.12+i*.07,0],i===6?panelStyles.decorated[type]:panelStyles.plain[type],rack);
      }
    }
    textPlate(x===18?'ÖRTÜK RULONLARY':'LEWHA ÄTIÝAÇLYGY',4,.32,[0,4.15,.67],rack,'#385666','#e8ecee');
  }
  const bench=unit('quality-bench',[18,0,-92.8]);
  for(const x of [-1.9,1.9])for(const z of [-.65,.65])box(.10,.9,.10,[x,.45,z],dark,bench);
  box(4.2,.12,1.6,[0,.96,0],pale,bench);
  for(const [type,x] of [-1.6,-.8,0,.8,1.6].entries()){
    const sample=panelStyles.sheet(bench,1.02,type);sample.position.x=x;sample.scale.setScalar(.48);
  }
  box(.6,.55,.08,[1.3,1.4,-.55],dark,bench);box(.5,.4,.02,[1.3,1.42,-.50],m.blueLight,bench);
  plaque('HIL GÖZEGÇILIGI',18,2.15,-93.45);
  for(const [x,label] of [[4,'LEWHA GIRIŞI →'],[36,'ÖNÜMÇILIK →']]){
    const mark=textPlate(label,6,.65,[x,.085,-106.0],root,'#385666','#dfe2db');mark.rotation.x=-Math.PI/2;
  }
  function update(clock,duration,interval){
    const feedPhase=((clock%interval)+interval)%interval;
    let y,z;
    if(feedPhase<1){y=mix(line.top,3.8,feedPhase);z=line.z;}
    else if(feedPhase<2.5){y=3.8;z=mix(line.z,-114.5,(feedPhase-1)/1.5);}
    else if(feedPhase<3.3){y=mix(3.8,line.top,(feedPhase-2.5)/.8);z=-114.5;}
    else if(feedPhase<4.2){y=mix(line.top,3.8,(feedPhase-3.3)/.9);z=-114.5;}
    else if(feedPhase<5.7){y=3.8;z=mix(-114.5,line.z,(feedPhase-4.2)/1.5);}
    else{y=mix(3.8,line.top,(feedPhase-5.7)/(interval-5.7));z=line.z;}
    feeder.pose(y,z);feeder.payload.visible=feedPhase>=3.3;

    const elapsed=clock-duration+1e-9,cycle=Math.floor(elapsed/interval);
    const phase=((elapsed%interval)+interval)%interval,index=((cycle%10)+10)%10;
    const type=ceilingBatchType(cycle);
    sheetFinishes.get(stacker.payload).select(type);
    layers.forEach(layer=>sheetFinishes.get(layer).select(type));
    receiver.userData.panelType=CEILING_PANEL_TYPES[type].id;
    const target=.35+.28+index*.035,drop=3.2;
    if(phase<.8){y=mix(line.top,3.2,phase/.8);z=-96;}
    else if(phase<2.4){y=3.2;z=mix(-96,-91.3,(phase-.8)/1.6);}
    else if(phase<drop){y=mix(3.2,target,(phase-2.4)/.8);z=-91.3;}
    else if(phase<4){y=mix(target,3.2,(phase-drop)/.8);z=-91.3;}
    else if(phase<5.6){y=3.2;z=mix(-91.3,-96,(phase-4)/1.6);}
    else{y=mix(3.2,line.top,(phase-5.6)/(interval-5.6));z=-96;}
    stacker.pose(y,z);stacker.payload.visible=phase<drop;
    const full=index===9&&phase>=drop;
    receiver.visible=!full;
    layers.forEach((layer,i)=>{layer.visible=i<index+(phase>=drop?1:0);});
    const batchPeriod=interval*10;
    const travel=((elapsed-(9*interval+drop))%batchPeriod+batchPeriod)%batchPeriod;
    const outgoingType=ceilingBatchType(Math.floor((elapsed-(9*interval+drop))/batchPeriod)*10);
    outgoingLayers.forEach(layer=>sheetFinishes.get(layer).select(outgoingType));
    outbound.userData.panelType=CEILING_PANEL_TYPES[outgoingType].id;
    outbound.visible=true;
    outbound.position.x=travel<5?mix(57,63.2,travel/5):travel<8?63.2:travel<11?mix(63.2,66, (travel-8)/3):66;
    straps.visible=travel>=7;
    strapHead.position.y=travel>=5&&travel<8?1.75-.6*Math.sin(Math.PI*(travel-5)/3)**2:1.75;
  }
  return {root,machines,pipes,payloads,feeder,stacker,receiver,outbound,layers,straps,update};
}
