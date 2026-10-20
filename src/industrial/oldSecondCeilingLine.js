import {conveyorMotion} from './conveyorTransfer.js';
import {createCeilingPanelStyles,ceilingBatchType,CEILING_PANEL_TYPES} from './ceilingPanelStyles.js';

// The second independent line occupies the centre bay and ends before the
// south loading entrance. It shares the hall's extraction and material stores.
export const OLD_SECOND_CEILING_LINE={start:-1.5,end:32.2,z:-100.4,top:1.18,width:2.6};

export function buildOldSecondCeilingLine(k,{parent,equipment,models,floorMark}){
  const {box,group,textPlate,m}=k,{start,end,z,top,width}=OLD_SECOND_CEILING_LINE;
  const root=group([0,0,0],parent);root.name='old-ceiling-line-2';
  const styles=createCeilingPanelStyles(k),machines=[],supports=[];
  const steel=equipment.zinc,pale=equipment.enamel,dark=equipment.cast;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const wrap=(t,period)=>(t%period+period)%period;
  function unit(name,x){
    const g=group([x,0,z],root);g.name=`old-line-2-${name}`;machines.push(g);return g;
  }
  function deck(g){
    for(const zz of [-.7,0,.7])box(1.85,.09,.16,[0,.045,zz],m.wood,g);
    for(const x of [-.7,0,.7])for(const zz of [-.7,0,.7])box(.16,.1,.16,[x,.14,zz],m.wood,g);
    for(let zz=-.8;zz<=.8;zz+=.2)box(1.85,.07,.16,[0,.23,zz],m.wood,g);
  }
  function rollers(x0,x1,y,w=width){
    const g=group([(x0+x1)/2,0,z],root),length=x1-x0;
    g.name='old-line-2-roller-bed';supports.push(g);
    for(const zz of [-w/2,w/2]){
      box(length,.18,.10,[0,y-.13,zz],pale,g);
      for(let x=-length/2+.18;x<length/2;x+=2.1){
        box(.12,y-.15,.12,[x,(y-.15)/2,zz],dark,g);
        box(.3,.07,.3,[x,.055,zz],steel,g);
      }
    }
    for(let x=-length/2+.08;x<length/2;x+=.25)
      equipment.cylinder(.065,w-.12,[x,y-.065,0],steel,g,'z');
    return g;
  }
  rollers(start+.7,end-.85,top);
  // An exposed blank magazine meets the conveyor at the same contact height.
  const raw=unit('blank-magazine',start);raw.position.y=top-.28-16*.035;deck(raw);
  for(let i=0;i<16;i++)styles.sheet(raw,.28+i*.035,0,{split:false,pattern:false});
  for(const zz of [-1,1])box(.08,1.6,.08,[start-.85,.8,z+zz],dark,root);
  box(.1,.14,2.1,[start-.85,1.6,z],pale,root);
  const feed=group([start-.72,top+.08,z],root,true);
  box(.10,.08,1.4,[0,0,0],steel,feed);
  function machine(kind,x,options){
    const g=unit(kind,x);models.builders[kind](g,'GK',options);return g;
  }
  machine('tunnel',4,{length:3.6,width:2.9,withBelt:false});
  const cutter=machine('table',10,{kind:'cut',length:3.6,width:2.8,withBed:false,synchronized:true});
  const press=machine('table',16,{kind:'press',length:3.8,width:2.8,withBed:false,synchronized:true});
  const coater=unit('roller-coater',22);
  for(const zz of [-1.5,1.5]){
    box(3.8,1.05,.14,[0,1.52,zz],pale,coater);
    for(const x of [-1.65,1.65])box(.14,1.05,.18,[x,.525,zz],dark,coater);
  }
  for(const x of [-1.1,0,1.1]){
    const roll=models.moving(group([x,1.49,0],coater),'GK','rotate','z',-1.5);
    equipment.cylinder(.27,2.85,[0,0,0],steel,roll,'z');
  }
  equipment.gearmotor([1.1,1.23,1.9],coater,.5,-Math.PI/2);
  machine('tunnel',27,{length:4,width:2.9,withBelt:false});
  for(const x of [10,16,22])k.cabinet([x,0,z-2.1],root).scale.setScalar(.65);
  // Both cutting hoods connect above head height to the existing dust header.
  for(const x of [4,10,16]){
    if(x!==4)box(1.65,.12,2.8,[x,3.4,z],pale,root);
    k.pipe([[x,x===4?3.7:3.46,z],[x,4.65,z],[x,4.65,-105.8]],.18,steel,root);
  }
  k.pipe([[27,3.7,z],[27,4.65,z],[27,4.65,-105.8]],.18,steel,root);
  // A lowering stack table receives ten sheets, then sends that exact lot
  // along the lower rollers through the strapping arch to dispatch.
  const packY=top-.28-10*.035,receiver=group([end,0,z],root,true);
  receiver.name='old-line-2-lift-stacker';deck(receiver);
  const layers=Array.from({length:10},(_,i)=>styles.choices(receiver,.28+i*.035));
  const outbound=group([end,packY,z],root,true);
  outbound.name='old-line-2-packed-batch';deck(outbound);
  const outgoing=Array.from({length:10},(_,i)=>styles.choices(outbound,.28+i*.035));
  const straps=group([0,0,0],outbound,true);
  for(const x of [-.47,.47]){
    box(.045,.012,1.38,[x,.642,0],equipment.blue,straps);
    for(const zz of [-.685,.685])box(.045,.38,.012,[x,.46,zz],equipment.blue,straps);
  }
  rollers(end-1,37.35,packY,2.05);
  const packer=unit('strapping-arch',35.3);
  for(const zz of [-1.25,1.25])box(.20,2.55,.20,[0,1.275,zz],pale,packer);
  box(.25,.2,2.7,[0,2.6,0],pale,packer);
  const strapHead=group([0,1.75,0],packer,true);
  box(.28,.2,1.55,[0,0,0],dark,strapHead);
  for(const zz of [z-2.75,z+2.55])floorMark(40,.07,17,zz,root);
  const label=textPlate('02 · POTOLOK HATY',12,.7,[17,.09,z+3.25],root,'#385666','#dfe2db');
  label.rotation.x=-Math.PI/2;
  for(const [x,label] of [[4,'ARASSALAMA'],[10,'KESME'],[16,'NAGYŞ'],[22,'ÖRTÜK'],[27,'GURATMA'],[32.2,'ISTIFLEME'],[35.3,'GAPLAÝYŞ']])
    textPlate(label,x>30?2.4:3,.28,[x,x>30?2.9:3.15,z+1.55],root,'#304551','#e9c842');

  const motion=conveyorMotion([start,4,10,16,22,27,end].map(x=>[x,top,z]),{speed:.8,stops:{2:1.1,3:1.2}});
  const interval=7,count=Math.ceil(motion.duration/interval)+1,period=count*interval;
  const products=Array.from({length:count},(_,i)=>{
    const object=group([start,top,z],root,true);object.name='old-line-2-sheet';
    const blank=styles.sheet(object,0,0,{split:false,pattern:false,dynamic:true});
    const finish=styles.choices(object);
    return {object,blank,finish,offset:i*interval};
  });
  function update(time){
    // Offset the two lines so their presses and stacks do not move in lockstep.
    const elapsed=time+3.5+1e-9,clock=elapsed+motion.duration;
    for(const p of products){
      const age=wrap(clock-p.offset,period);p.object.visible=age<=motion.duration;
      if(!p.object.visible)continue;
      p.object.rotation.y=motion.pose(age,p.object.position);
      p.blank.visible=age<motion.milestones[5].arrival;p.finish.root.visible=!p.blank.visible;
      p.finish.select(ceilingBatchType(Math.round((clock-age)/interval)));
      p.object.userData.panelType=p.finish.root.userData.panelType;
    }
    for(const [g,index,hold] of [[cutter,2,1.1],[press,3,1.2]]){
      const phase=wrap(clock-motion.milestones[index].arrival,interval),tool=g.userData.processTool;
      tool.object.position.y=tool.base-(phase<hold?Math.sin(Math.PI*phase/hold)**2*tool.travel:0);
    }
    const feedPhase=wrap(clock,interval);
    feed.position.x=start-.72+(feedPhase<1.5?.7*Math.sin(Math.PI*feedPhase/1.5)**2:0);
    const phase=wrap(elapsed,interval),cycle=Math.floor(elapsed/interval),index=wrap(cycle,10);
    const type=ceilingBatchType(cycle);
    receiver.position.y=top-.28-index*.035-.035*smooth(phase/.8);
    receiver.visible=index<9||phase<.8;receiver.userData.panelType=CEILING_PANEL_TYPES[type].id;
    layers.forEach((layer,i)=>{layer.select(type);layer.root.visible=i<=index;});
    const batchPeriod=interval*10,travel=wrap(elapsed-(9*interval+.8),batchPeriod);
    const outgoingType=ceilingBatchType(Math.floor((elapsed-(9*interval+.8))/batchPeriod)*10);
    outgoing.forEach(layer=>layer.select(outgoingType));
    outbound.userData.panelType=CEILING_PANEL_TYPES[outgoingType].id;
    outbound.position.x=travel<2?end+(35.3-end)*smooth(travel/2):travel<3.5?35.3:35.3+1.1*smooth((travel-3.5)/2);
    straps.visible=travel>=3;
    strapHead.position.y=travel>=2&&travel<3.5?1.75-.6*Math.sin(Math.PI*(travel-2)/1.5)**2:1.75;
  }
  update(0);
  return {root,machines,supports,products,motion,interval,receiver,layers,outbound,straps,update};
}
