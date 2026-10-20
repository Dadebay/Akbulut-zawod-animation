import * as T from 'three';
import {OLD_LEFT_CAMPUS} from './siteLayout.js';
import {conveyorMotion} from './conveyorTransfer.js';
import {WAREHOUSE_PANEL_TYPES,createCeilingPanelStyles} from './ceilingPanelStyles.js';
export {WAREHOUSE_PANEL_TYPES} from './ceilingPanelStyles.js';

// Four compact finishing cells use prepared blanks, then cut/form and finish
// the different ceiling panels described by the user. The centre aisle and
// all three loading doors remain independent of the machinery.
export function buildWarehousePanels(k,{parent,equipment,models,floorMark}){
  const {box,cyl,group,material,textPlate,m}=k;
  const hall=OLD_LEFT_CAMPUS.warehouse,z=hall.z-4.1,top=1.18*.7;
  const root=group([0,0,0],parent);root.name='warehouse-panel-production';
  const stock=[],cells=[],machines=[],products=[];
  const styles=createCeilingPanelStyles(k),finishes=styles.plain.slice(1),surfaces=styles.decorated.slice(1);
  const panelFace=k.trackGeometry(new T.PlaneGeometry(.94,.92));
  const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function deck(g){
    for(const zz of [-.45,0,.45])box(1.25,.09,.15,[0,.045,zz],m.wood,g);
    for(const x of [-.48,0,.48])for(const zz of [-.45,0,.45])box(.14,.10,.14,[x,.14,zz],m.wood,g);
    for(let zz=-.5;zz<=.5;zz+=.2)box(1.25,.07,.15,[0,.23,zz],m.wood,g);
  }
  function panel(g,type,y=0,finished=true){
    const record=WAREHOUSE_PANEL_TYPES[type],mat=finished?finishes[type]:type===2?m.steel:m.paper;
    box(.94,.026,.92,[0,y+.013,0],mat,g);
    if(!finished)return;
    const face=k.mesh(panelFace,surfaces[type],[0,y+.027,0],g);face.rotation.x=-Math.PI/2;
    if(record.pattern==='cassette'){
      for(const zz of [-.445,.445])box(.94,.035,.025,[0,y+.025,zz],mat,g);
      for(const x of [-.457,.457])box(.025,.035,.91,[x,y+.025,0],mat,g);
    }
  }
  function pallet(x,zz,type,owner=parent,dynamic=false){
    const g=group([x,.06,zz],owner,dynamic);g.name=`warehouse-${WAREHOUSE_PANEL_TYPES[type].id}-stock`;
    g.userData.panelType=WAREHOUSE_PANEL_TYPES[type].id;deck(g);
    // The top sheet carries the finish detail; the sheets below share the colour.
    for(let i=0;i<16;i++)box(.96,.028,.94,[0,.29+i*.045,0],finishes[type],g);
    panel(g,type,.98);
    for(const xx of [-.32,.32])box(.035,.015,1.01,[xx,1.03,0],equipment.blue,g);
    return g;
  }
  // Two compact pallets per marked bay keep the former storage capacity,
  // grouped by finish, with breaks opposite every loading door.
  let bay=0;
  for(let x=-1;x<66;x+=5){
    if([4,24,49].some(door=>Math.abs(x-door)<3.2))continue;
    const zz=hall.z+3.5,type=bay++%4;
    floorMark(2.8,.055,x,zz-1.2,parent);floorMark(2.8,.055,x,zz+1.2,parent);
    for(const dx of [-1.4,1.4])floorMark(.055,2.4,x+dx,zz,parent);
    for(const dx of [-.65,.65])stock.push(pallet(x+dx,zz,type));
    const label=textPlate(WAREHOUSE_PANEL_TYPES[type].label,2.7,.28,[x,.085,zz-1.45],parent,'#385666','#dfe2db');
    label.rotation.x=-Math.PI/2;
  }
  for(const [type,cx] of [1,18.5,36,53.5].entries()){
    const cell=group([0,0,0],root);cell.name=`warehouse-cell-${WAREHOUSE_PANEL_TYPES[type].id}`;
    function machine(kind,x,options){
      const g=group([x,0,z],cell);g.name=`${cell.name}-${kind}`;g.scale.setScalar(.7);
      models.builders[kind](g,'GK',options);machines.push(g);return g;
    }
    const start=cx-4.6,end=cx+4.6;
    const press=machine('table',cx-1.6,{kind:type===2?'press':'cut',length:3.4,width:2.4,withBed:false,synchronized:true});
    const hood=machine('tunnel',cx+1.3,{length:3.5,width:2.4,withBelt:false});
    // Open inspection glazing distinguishes the small finishing hoods.
    box(1.4,.40,.035,[cx+1.3,1.5,z+.91],m.glass,cell);
    const length=end-.65-(start-.7),mid=(end-.65+start-.7)/2;
    for(const zz of [-.65,.65]){
      box(length,.16,.10,[mid,top-.14,z+zz],equipment.cast,cell);
      for(let x=start-.6;x<end-.6;x+=1.9)box(.10,top-.15,.10,[x,(top-.15)/2,z+zz],equipment.enamel,cell);
    }
    for(let x=start+.7;x<=end-.65;x+=.25)
      equipment.cylinder(.055,1.24,[x,top-.055,z],equipment.zinc,cell,'z');
    const raw=group([start,top-.28-10*.035,z],cell);raw.name='warehouse-blank-stack';deck(raw);
    for(let i=0;i<10;i++)panel(raw,type,.28+i*.035,false);
    for(const zz of [-.60,.60])box(.07,1.45,.07,[start-.60,.725,z+zz],equipment.cast,cell);
    box(.09,.12,1.34,[start-.6,1.5,z],equipment.enamel,cell);
    const receiver=group([end,0,z],cell,true);receiver.name='warehouse-lift-stacker';deck(receiver);
    const layers=Array.from({length:8},(_,i)=>{
      const layer=group([0,.28+i*.045,0],receiver,true);panel(layer,type);return layer;
    });
    for(const zz of [-.55,.55])box(1.25,.15,.12,[end,.105,z+zz],equipment.cast,cell);
    const outbound=group([end,top-.28-8*.045,z],cell,true);outbound.name='warehouse-packed-batch';deck(outbound);
    for(let i=0;i<8;i++)panel(outbound,type,.28+i*.045);
    for(const xx of [-.32,.32])box(.035,.015,1,[xx,.645,0],equipment.blue,outbound);
    for(const zz of [-.62,.62])box(3.1,.12,.08,[end+1.05,.12,z+zz],equipment.cast,cell);
    for(let x=end-.45;x<end+2.55;x+=.23)
      equipment.cylinder(.045,1.2,[x,top-.28-8*.045-.045,z],equipment.zinc,cell,'z');
    const label=textPlate(WAREHOUSE_PANEL_TYPES[type].label,7,.55,[cx,2.6,z+.90],cell,'#385666','#e9c842');
    for(const x of [cx-3.3,cx+3.3])box(.055,2.3,.055,[x,1.15,z+.9],equipment.cast,cell);
    const route=[[start,top,z],[cx-1.6,top,z],[cx+1.3,top,z],[end,top,z]];
    const motion=conveyorMotion(route,{speed:.65,stops:{1:.75}});
    const interval=7,count=Math.ceil(motion.duration/interval)+1,period=count*interval,lineProducts=[];
    for(let i=0;i<count;i++){
      const g=group([start,top,z],cell,true);g.name=`warehouse-moving-${WAREHOUSE_PANEL_TYPES[type].id}`;
      const blank=group([0,0,0],g,true),finished=group([0,0,0],g,true);
      panel(blank,type,0,false);panel(finished,type);
      const p={object:g,blank,finished,offset:i*interval,type:WAREHOUSE_PANEL_TYPES[type].id};
      products.push(p);lineProducts.push(p);
    }
    cells.push({root:cell,press,hood,receiver,outbound,layers,motion,interval,period,products:lineProducts,start,end,type,top});
  }
  function update(time){
    for(const cell of cells){
      const {motion,interval,period,press,receiver,outbound,layers,end}=cell,clock=time+motion.duration;
      for(const p of cell.products){
        const age=((clock-p.offset)%period+period)%period;
        p.object.visible=age<=motion.duration;
        if(p.object.visible){
          p.object.rotation.y=motion.pose(age,p.object.position);
          p.blank.visible=age<motion.milestones[2].departure;p.finished.visible=!p.blank.visible;
        }
      }
      const phase=((clock-motion.milestones[1].arrival)%interval+interval)%interval,tool=press.userData.processTool;
      tool.object.position.y=tool.base-(phase<.75?Math.sin(Math.PI*phase/.75)**2*tool.travel:0);
      const receivePhase=((time%interval)+interval)%interval,index=((Math.floor(time/interval)%8)+8)%8;
      receiver.position.y=top-.28-index*.045-.045*smooth(receivePhase/.8);
      layers.forEach((g,i)=>{g.visible=i<=index;});
      receiver.visible=index<7||receivePhase<1;
      const travel=((time-(7*interval+1))%(8*interval)+8*interval)%(8*interval);
      outbound.position.x=end+2.2*smooth(travel/2.8);
    }
  }
  update(0);
  return {root,stock,machines,products,cells,update,top};
}
