import {createEquipmentModels} from './equipmentModels.js';
import {createArchiveEquipment} from './archiveEquipment.js';
import {conveyorMotion} from './conveyorTransfer.js';
import {OLD_LEFT_CAMPUS} from './siteLayout.js';

// The user identifies the broad hall as a second ceiling-panel production
// area, and the separate narrow hangar as finished-product storage.
// Equipment positions are illustrative, within the existing building shells.
export const OLD_CEILING_LINE={west:0,east:40,z:-108.5,width:2.6,top:1.18};

export function buildOldCampusInterior(k,pallet){
  const {m,box,cyl,group,textPlate}=k;
  const root=group([0,0,0],k.scene,true);root.name='old-campus-interior';
  const production=group([0,0,0],root),warehouse=group([0,0,0],root);
  production.name='old-ceiling-production';warehouse.name='old-stock-hangar';
  const equipment=createEquipmentModels(k,[]),models=createArchiveEquipment(k,equipment);
  const line=OLD_CEILING_LINE,{west,east,z,width,top}=line;
  const machines=[],stock=[];
  const floorMark=(w,d,x,zz,parent)=>{
    const mark=box(w,.012,d,[x,.075,zz],m.yellow,parent);mark.castShadow=false;
  };
  function stockPallet(x,zz,parent,scale=1.5){
    const load=pallet(parent,[x,.06,zz],'panel');load.scale.setScalar(scale);
    stock.push(load);return load;
  }
  // A continuous roller bed supports the sheets through every station.
  for(const side of [-1,1]){
    const zz=z+side*width/2;
    box(east-west,.22,.12,[(west+east)/2,top-.15,zz],m.blue,production);
    for(let x=west+.4;x<east;x+=2.5){
      box(.12,top-.18,.12,[x,(top-.18)/2,zz],m.dark,production);
      box(.32,.07,.32,[x,.055,zz],m.steel,production);
    }
    floorMark(east-west+5,.07,(west+east)/2,z+side*2.65,production);
  }
  for(let x=west+.12;x<east;x+=.32){
    const roll=cyl(.075,width-.16,[x,top-.075,z],m.steel,production,undefined,12);
    roll.rotation.x=Math.PI/2;
  }
  function machine(kind,x,options){
    const g=group([x,0,z],production);g.name=`old-ceiling-${kind}-${x}`;
    models.builders[kind](g,'GK',options);machines.push(g);return g;
  }
  machine('tunnel',9,{length:5,width:3,withBelt:false});
  const cutter=machine('table',19,{kind:'cut',withBed:false,synchronized:true});
  const press=machine('table',28,{kind:'press',length:4.6,withBed:false,synchronized:true});
  // Covered feed and receiving magazines conceal the beginning/end of the
  // stream. Both sit over the bed, with adjacent stock and accessible controls.
  for(const x of [1,39]){
    const hood=group([x,0,z],production);hood.name='old-ceiling-magazine';machines.push(hood);
    for(const dz of [-1.4,1.4])box(3.4,.85,.10,[0,1.63,dz],equipment.enamel,hood);
    box(3.5,.12,2.9,[0,2.12,0],equipment.enamel,hood);
    stockPallet(x,z,production,.9);
  }
  for(const x of [9,19,28])k.cabinet([x,0,z+2.2],production);
  stockPallet(-3.5,z,production);
  stockPallet(43,z,production);
  // Keep the existing pedestrian strips and the centre forklift aisle clear.
  for(const zz of [-104.8,-95.2])floorMark(44,.07,30,zz,production);
  const productionLabel=textPlate('POTOLOK ÖNÜMÇILIGI',17,1.2,[26,.09,-115.6],production,'#385666','#dfe2db');
  productionLabel.rotation.x=-Math.PI/2;

  const hall=OLD_LEFT_CAMPUS.warehouse;
  // Two rows leave a 5 m centre aisle; breaks in the yard-side row keep all
  // three loading doors (x=4,24,49) accessible from the warehouse aisle.
  for(const side of [-1,1])for(let x=-1;x<66;x+=5){
    if(side===1&&[4,24,49].some(door=>Math.abs(x-door)<3.2))continue;
    const zz=hall.z+side*3.5;
    floorMark(2.8,.055,x,zz-1.2,warehouse);
    floorMark(2.8,.055,x,zz+1.2,warehouse);
    for(const dx of [-1.4,1.4])floorMark(.055,2.4,x+dx,zz,warehouse);
    stockPallet(x,zz,warehouse);
  }
  for(const zz of [hall.z-2.3,hall.z+2.3])floorMark(70,.07,31,zz,warehouse);
  const stockLabel=textPlate('HANGAR · STOK',15,1.2,[31,.09,hall.z],warehouse,'#385666','#dfe2db');
  stockLabel.rotation.x=-Math.PI/2;

  const points=[1,9,19,28,39].map(x=>[x,top,z]);
  const motion=conveyorMotion(points,{speed:.85,stops:{2:1.1,3:1.2}});
  const interval=7,count=Math.ceil(motion.duration/interval)+1,period=count*interval;
  const products=[];
  for(let i=0;i<count;i++){
    const product=group([0,top,z],production,true);product.name='old-ceiling-sheet';
    const blank=group([0,0,0],product,true),cut=group([0,0,0],product,true),holes=group([0,0,0],cut,true);
    box(1.32,.035,1.32,[0,.0175,0],m.paper,blank);
    for(const x of [-.33,.33])for(const dz of [-.33,.33]){
      box(.62,.035,.62,[x,.0175,dz],m.paper,cut);
      for(const a of [-.18,0,.18])for(const b of [-.18,0,.18])
        cyl(.014,.003,[x+a,.037,dz+b],m.dark,holes,undefined,6);
    }
    products.push({object:product,blank,cut,holes,offset:i*interval});
  }
  let previous=0;
  function update(time){
    models.update(Math.max(0,time-previous),()=>true);previous=time;
    // Start with an established line, with generous spacing at the tool stops.
    const clock=time+motion.duration;
    for(const p of products){
      const age=((clock-p.offset)%period+period)%period;
      p.object.visible=age<=motion.duration;
      if(!p.object.visible)continue;
      p.object.rotation.y=motion.pose(age,p.object.position);
      p.blank.visible=age<motion.milestones[2].departure;
      p.cut.visible=!p.blank.visible;p.holes.visible=age>=motion.milestones[3].departure;
    }
    for(const [g,index,hold] of [[cutter,2,1.1],[press,3,1.2]]){
      const tool=g.userData.processTool;
      const phase=((clock-motion.milestones[index].arrival)%interval+interval)%interval;
      tool.object.position.y=tool.base-(phase<hold?Math.sin(Math.PI*phase/hold)**2*tool.travel:0);
    }
  }
  update(0);
  return {root,production,warehouse,products,stock,machines,update};
}
