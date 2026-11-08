import * as T from 'three';
import {createEquipmentModels} from './equipmentModels.js';
import {createArchiveEquipment} from './archiveEquipment.js';
import {conveyorMotion,transferTable} from './conveyorTransfer.js';
import {OLD_LEFT_CAMPUS} from './siteLayout.js';
import {buildOldHallDetails} from './oldHallDetails.js';
import {buildOldCeilingFinishing} from './oldCeilingFinishing.js';
import {buildOldSecondCeilingLine,OLD_SECOND_CEILING_LINE} from './oldSecondCeilingLine.js';
import {buildOldHallProcessDetails} from './oldHallProcessDetails.js';
import {buildDormitoryInterior} from './dormitoryInterior.js';
import {buildWorkOfficeInterior} from './workOfficeInterior.js';
import {buildPavilionInterior} from './pavilionInterior.js';
import {buildWarehousePanels} from './warehousePanels.js';
import {createCeilingPanelStyles,ceilingBatchType} from './ceilingPanelStyles.js';

// The user identifies the broad hall as a second ceiling-panel production
// area. The separate narrow hangar combines storage with production of
// green/yellow decorative, metal and plastic ceiling panels for the new factory.
// Equipment positions are illustrative, within the existing building shells.
export const OLD_CEILING_LINE={west:0,east:64,z:-108.5,width:2.6,top:1.18};
export const OLD_CEILING_ROUTE=[[1,-108.5],[9,-108.5],[19,-108.5],[28,-108.5],[51,-108.5],[64,-108.5],[64,-96],[57,-96]].map(([x,z])=>[x,1.18,z]);

export function buildOldCampusInterior(k,pallet){
  const {m,box,cyl,group,textPlate}=k;
  const root=group([0,0,0],k.scene,true);root.name='old-campus-interior';
  const dormitory=buildDormitoryInterior(k,root);
  const office=buildWorkOfficeInterior(k,root);
  const pavilion=buildPavilionInterior(k,root);
  // The raised loading shutters expose this interior even with the roof on.
  const production=group([0,0,0],root),warehouse=group([0,0,0],k.scene,true);
  production.name='old-ceiling-production';warehouse.name='old-stock-hangar';
  const equipment=createEquipmentModels(k,[]),models=createArchiveEquipment(k,equipment);
  const panelStyles=createCeilingPanelStyles(k);
  const line=OLD_CEILING_LINE,{west,east,z,width,top}=line;
  const machines=[],stock=[];
  const floorMark=(w,d,x,zz,parent)=>{
    const mark=box(w,.012,d,[x,.075,zz],m.yellow,parent);mark.castShadow=false;
  };
  function stockPallet(x,zz,parent,scale=1.5){
    const load=pallet(parent,[x,.06,zz],'panel');load.scale.setScalar(scale);
    stock.push(load);return load;
  }
  // One continuous route from the exposed blank feeder through finishing
  // and inspection to the stacker, east of the forklift/loading aisle.
  const supports=[];
  function rollerBed(x0,z0,x1,z1){
    const length=Math.hypot(x1-x0,z1-z0),g=group([(x0+x1)/2,0,(z0+z1)/2],production);
    g.rotation.y=-Math.atan2(z1-z0,x1-x0);g.name='old-ceiling-roller-bed';supports.push(g);
    for(const side of [-1,1]){
      const zz=side*width/2;
      box(length,.22,.12,[0,top-.15,zz],equipment.enamel,g);
      for(let x=-length/2+.25;x<length/2;x+=2.5){
        box(.12,top-.18,.12,[x,(top-.18)/2,zz],equipment.enamel,g);
        box(.32,.07,.32,[x,.055,zz],m.steel,g);
        box(.18,.08,.14,[x,.8,zz],m.dark,g);
      }
    }
    for(let x=-length/2+.12;x<length/2;x+=.32){
      const roll=cyl(.075,width-.16,[x,top-.075,0],m.steel,g,undefined,12);roll.rotation.x=Math.PI/2;
    }
    for(let x=-length/2+.8;x<length/2;x+=4){
      equipment.gearmotor([x,.35,-width/2-.23],g,.35,Math.PI/2);
      box(.055,.18,.08,[x,1.38,width/2],m.dark,g);
      box(.025,.035,.035,[x,1.47,width/2-.03],m.red,g);
    }
  }
  rollerBed(west,z,east-1.5,z);
  rollerBed(64,-107,64,-97.5);
  rollerBed(55.8,-96,62.5,-96);
  for(const side of [-1,1])floorMark(east-west+3,.07,(west+east)/2,z+side*2.65,production);
  function machine(kind,x,options){
    const g=group([x,0,z],production);g.name=`old-ceiling-${kind}-${x}`;
    models.builders[kind](g,'GK',options);machines.push(g);return g;
  }
  machine('tunnel',9,{length:5,width:3,withBelt:false});
  const cutter=machine('table',19,{kind:'cut',withBed:false,synchronized:true});
  const press=machine('table',28,{kind:'press',length:4.6,withBed:false,synchronized:true});
  machine('tunnel',51,{length:7,width:3,withBelt:false});
  for(const x of [9,19,28])k.cabinet([x,0,z+2.2],production);
  stockPallet(-3.5,z,production);
  // The two production lanes leave pedestrian strips and the loading aisle clear.
  for(const zz of [-104.8,-95.2])floorMark(44,.07,30,zz,production);
  const productionLabel=textPlate('01 · POTOLOK HATY',12,.7,[26,.09,-104.3],production,'#385666','#dfe2db');
  productionLabel.rotation.x=-Math.PI/2;
  const details=buildOldHallDetails(k,{parent:production,equipment,lineZ:z});
  const finishing=buildOldCeilingFinishing(k,{parent:production,equipment,models,line,stockPallet});
  machines.push(...finishing.machines);
  const secondLine=buildOldSecondCeilingLine(k,{parent:production,equipment,models,floorMark});
  machines.push(...secondLine.machines);
  const processDetails=buildOldHallProcessDetails(k,{parent:production,equipment,models,line,secondLine:OLD_SECOND_CEILING_LINE});
  machines.push(...processDetails.machines);

  const hall=OLD_LEFT_CAMPUS.warehouse;
  const warehousePanels=buildWarehousePanels(k,{parent:warehouse,equipment,models,floorMark});
  stock.push(...warehousePanels.stock);machines.push(...warehousePanels.machines);
  for(const zz of [hall.z-2.3,hall.z+2.3])floorMark(70,.07,31,zz,warehouse);
  for(const [x,label] of [[12,'AMMAR'],[43,'TÄZE ZAWOD ÜÇIN ÖNÜMÇILIK']]){
    const stockLabel=textPlate(label,20,1.2,[x,.09,hall.z],warehouse,'#385666','#dfe2db');
    stockLabel.rotation.x=-Math.PI/2;
  }

  const motion=conveyorMotion(OLD_CEILING_ROUTE,{speed:.85,turnTime:1,stops:{2:1.1,3:1.2}});
  const transfers=motion.turns.map(corner=>{
    // Fixed corner apron closes the crescents between a circular transfer and
    // the rectangular incoming bed. It sits just below the roller contact plane.
    const shape=new T.Shape();shape.moveTo(-1.525,-1.525);shape.lineTo(1.525,-1.525);shape.lineTo(1.525,1.525);shape.lineTo(-1.525,1.525);shape.closePath();
    const hole=new T.Path();hole.absarc(0,0,1.425,0,Math.PI*2,true);shape.holes.push(hole);
    const apron=k.mesh(new T.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false,curveSegments:32}),m.steel,[corner.a.x,top-.07,corner.a.z],production);
    apron.rotation.x=-Math.PI/2;apron.name='old-transfer-apron';supports.push(apron);
    return transferTable(k,corner,{parent:production,size:3,top,clearTime:2.8});
  });
  const interval=7,count=Math.ceil(motion.duration/interval)+1,period=count*interval;
  const products=[];
  for(let i=0;i<count;i++){
    const product=group([0,top,z],production,true);product.name='old-ceiling-sheet';
    const blank=group([0,0,0],product,true),cut=group([0,0,0],product,true);
    box(1.32,.035,1.32,[0,.0175,0],m.paper,blank);
    const unfinished=panelStyles.sheet(cut,0,0,{pattern:false,dynamic:true});
    const finish=panelStyles.choices(cut),holes=finish.root;
    products.push({object:product,blank,cut,holes,unfinished,finish,offset:i*interval});
  }
  let previous=0;
  function update(time){
    models.update(Math.max(0,time-previous),()=>true);previous=time;
    // Start with an established line, with generous spacing at the tool stops.
    const clock=time+motion.duration;
    finishing.update(clock,motion.duration,interval);
    secondLine.update(time);
    warehousePanels.update(time);
    transfers.forEach(table=>table.update(clock,interval));
    for(const p of products){
      const age=((clock-p.offset)%period+period)%period;
      p.object.visible=age<=motion.duration;
      if(!p.object.visible)continue;
      p.object.rotation.y=motion.pose(age,p.object.position);
      p.blank.visible=age<motion.milestones[2].departure;
      p.cut.visible=!p.blank.visible;
      // Colour and surface finish emerge inside the final curing/inspection hood.
      p.holes.visible=age>=motion.milestones[4].arrival;p.unfinished.visible=!p.holes.visible;
      const sheetNumber=Math.round((clock-age)/interval);
      p.finish.select(ceilingBatchType(sheetNumber));
      p.object.userData.panelType=p.finish.root.userData.panelType;
    }
    for(const [g,index,hold] of [[cutter,2,1.1],[press,3,1.2]]){
      const tool=g.userData.processTool;
      const phase=((clock-motion.milestones[index].arrival)%interval+interval)%interval;
      tool.object.position.y=tool.base-(phase<hold?Math.sin(Math.PI*phase/hold)**2*tool.travel:0);
    }
  }
  update(0);
  return {root,production,warehouse,products,stock,machines,supports,details,finishing,secondLine,processDetails,dormitory,office,pavilion,warehousePanels,update};
}
