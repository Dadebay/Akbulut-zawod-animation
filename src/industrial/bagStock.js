import * as T from 'three';
import {conveyorMotion} from './conveyorTransfer.js';
import {BEUMER_LINE,localPoint} from './processPlan.js';

export const BAG_STOCK={receiveX:BEUMER_LINE.west+3.5,infeedX:BEUMER_LINE.east-.4,turnX:-22.8,turnRadius:.75,z:BEUMER_LINE.z,stockZ:-19.2,slots:[-27,-25.3,-23.6],bagsPerPallet:16,fillLiftY:2.11,layerHeight:.20,bagsPerLayer:8,liftSpeed:.8};

export function buildBagStock(k,{parent,equipment}){
  const {box,cyl,group,material,textPlate,m}=k;
  const steel=material('#bdc7ca',.68,.38),side=material('#e5e9e8',.32,.55);
  const wood=material('#a97945',.1,.82),strap=material('#1c68af',.2,.5);
  const film=material('#d6e5eb',.05,.3,{transparent:true,opacity:.25,depthWrite:false});
  const cell=group([0,0,0],parent);cell.name='beumer-bag-stock';
  const at=(x,y,z,p=cell)=>group(localPoint([x,y,z]),p);
  const {receiveX,infeedX,turnX,turnRadius,z,stockZ,slots,bagsPerPallet}=BAG_STOCK;

  // The BEUMER roller bed continues through two powered right-angle transfers.
  function rollerRun(x0,x1,z0,z1,name){
    const alongX=Math.abs(x1-x0)>Math.abs(z1-z0),length=alongX?Math.abs(x1-x0):Math.abs(z1-z0);
    const run=at((x0+x1)/2,0,(z0+z1)/2);run.name=name;
    for(const sideOffset of [-.67,.67]){
      box(alongX?length:.08,.16,alongX?.08:length,
        alongX?[0,1.04,sideOffset]:[sideOffset,1.04,0],side,run);
      for(let along=-length/2+.28;along<length/2-.1;along+=1.6){
        box(.10,1.02,.10,alongX?[along,.51,sideOffset]:[sideOffset,.51,along],side,run);
      }
    }
    const count=Math.max(1,Math.ceil(length/.18));
    for(let i=0;i<count;i++){
      const along=-length/2+(i+.5)*length/count;
      const pos=alongX?[along,1.14,0]:[0,1.14,along];
      equipment.cylinder(.045,1.24,pos,steel,run,alongX?'z':'x');
    }
    return run;
  }
  // Each straight run stops outside the swept circular deck, including its
  // rails and last roller. No perpendicular roller grid remains in the corners.
  const joint=turnRadius+.04,turntables=[];
  rollerRun(infeedX,turnX-joint,z,z,'beumer-bag-outfeed');
  rollerRun(turnX,turnX,z+joint,stockZ-joint,'beumer-bag-north-transfer');
  rollerRun(slots[0]-.85,turnX-joint,stockZ,stockZ,'beumer-bag-stock-conveyor');
  for(const [index,cornerZ] of [z,stockZ].entries()){
    const turn=at(turnX,0,cornerZ);turn.name='beumer-bag-turntable';
    cyl(.62,.10,[0,.98,0],equipment.cast,turn);
    const deck=group([0,0,0],turn,true);deck.name='beumer-bag-turntable-deck';
    deck.rotation.y=index?-Math.PI/2:0;turntables.push(deck);
    cyl(turnRadius,.10,[0,1.08,0],steel,deck);
    for(let i=-3;i<=3;i++){
      const x=i*.19,length=2*Math.sqrt(.69*.69-x*x)-.04;
      equipment.cylinder(.045,length,[x,1.14,0],steel,deck,'z');
    }
    for(const x of [-.57,.57])for(const zz of [-.57,.57])box(.10,1.04,.10,[x,.52,zz],side,turn);
  }

  // Three outlined positions keep the bag inventory apart from board pallets.
  const stock=at((slots[0]+turnX)/2,0,stockZ);stock.name='beumer-bag-stock-area';
  const padWidth=slots[0]-turnX<0?turnX-slots[0]+1.4:slots[0]-turnX+1.4;
  box(padWidth,.035,2.45,[0,.018,0],m.concrete,stock);
  for(const zz of [-1.21,1.21])box(padWidth,.012,.035,[0,.043,zz],m.yellow,stock);
  for(const x of slots){
    const slot=at(x,0,stockZ);slot.name='beumer-bag-stock-slot';
    for(const dx of [-.78,.78])for(const dz of [-.58,.58]){
      box(.25,.015,.035,[dx,.05,dz],m.yellow,slot);
      box(.035,.015,.25,[dx,.05,dz],m.yellow,slot);
    }
  }
  const title=textPlate('BEUMER · PALET STOK',3.8,.28,[0,.052,1.04],stock,'#254f70','#e8eceb');
  title.rotation.x=-Math.PI/2;

  let serial=0,accepted=0,current=null,lowering=null,moving=null;
  const stocked=[];
  function makePallet(x,zz,full=false){
    const root=group(localPoint([x,0,zz]),cell,true);root.name=`beumer-bag-pallet-${++serial}`;
    for(const dz of [-.42,0,.42])box(1.42,.08,.10,[0,1.22,dz],wood,root);
    box(1.45,.08,1.10,[0,1.30,0],wood,root);
    const bags=[];
    for(let layer=0;layer<2;layer++)for(let row=0;row<2;row++)for(let column=0;column<4;column++){
      const bag=group([(column-1.5)*.34,1.44+layer*.20,(row-.5)*.52],root,true);
      box(.32,.19,.48,[0,0,0],m.paper,bag,.045);
      box(.23,.005,.23,[0,.098,0],m.blue,bag);
      bag.visible=full;bags.push(bag);
    }
    const wrap=group([0,0,0],root,true);wrap.name='beumer-bag-pallet-wrap';wrap.visible=full;
    for(const dx of [-.38,.38]){
      box(.035,.012,1.13,[dx,1.745,0],strap,wrap);
      for(const dz of [-.55,.55])box(.035,.41,.018,[dx,1.535,dz],strap,wrap);
    }
    for(const dz of [-.555,.555])box(1.46,.40,.008,[0,1.54,dz],film,wrap);
    root.userData.bagCount=full?bagsPerPallet:0;
    root.userData.massKg=full?bagsPerPallet*25:0;
    root.userData.stocked=full;
    return {root,bags,wrap,count:full?bagsPerPallet:0};
  }
  // The running factory already has finished inventory when the scene opens.
  for(const x of slots.slice(0,2)){
    const pack=makePallet(x,stockZ,true);pack.root.rotation.y=Math.PI;stocked.push(pack);
  }
  current=makePallet(receiveX,z);
  current.root.position.y=BAG_STOCK.fillLiftY;
  const fillHeight=pack=>BAG_STOCK.fillLiftY-Math.floor(pack.count/BAG_STOCK.bagsPerLayer)*BAG_STOCK.layerHeight;
  function canAccept(){return !!current&&current.count<bagsPerPallet&&Math.abs(current.root.position.y-fillHeight(current))<1e-8;}
  function accept(){
    if(!canAccept())return false;
    const pack=current;pack.bags[pack.count].visible=true;pack.count++;accepted++;
    pack.root.userData.bagCount=pack.count;pack.root.userData.massKg=pack.count*25;
    if(pack.count===bagsPerPallet){
      pack.wrap.visible=true;pack.root.userData.wrapped=true;
      lowering=pack;current=null;
    }
    return true;
  }
  function update(dt,running){
    if(!running||dt<=0)return;
    // Receive each layer at the elevated feed. The loaded pallet stays on its
    // lift until it has reached the lower outfeed, then travels horizontally.
    if(current){
      const target=fillHeight(current),delta=target-current.root.position.y;
      current.root.position.y+=Math.sign(delta)*Math.min(Math.abs(delta),BAG_STOCK.liftSpeed*dt);
    }
    if(lowering){
      const step=Math.min(dt,lowering.root.position.y/BAG_STOCK.liftSpeed);
      lowering.root.position.y=Math.max(0,lowering.root.position.y-BAG_STOCK.liftSpeed*step);dt-=step;
      if(lowering.root.position.y>1e-8)return;
      lowering.root.position.y=0;
      const slot=slots[stocked.length],route=[[receiveX,0,z],[turnX,0,z],[turnX,0,stockZ],[slot,0,stockZ]].map(localPoint);
      moving={pack:lowering,slot,motion:conveyorMotion(route,{speed:1.15,acceleration:1.8,turnTime:.55}),time:0};
      moving.motion.turns.forEach((corner,index)=>{turntables[index].rotation.y=corner.yaw;});
      lowering=null;
    }
    if(!moving)return;
    moving.time=Math.min(moving.motion.duration,moving.time+dt);
    moving.pack.root.rotation.y=moving.motion.pose(moving.time,moving.pack.root.position);
    moving.motion.turns.forEach((corner,index)=>{
      const progress=T.MathUtils.smoothstep(moving.time,corner.start,corner.start+corner.duration);
      const delta=Math.atan2(Math.sin(corner.to-corner.yaw),Math.cos(corner.to-corner.yaw));
      turntables[index].rotation.y=corner.yaw+delta*progress;
    });
    if(moving.time>=moving.motion.duration-1e-8){
      const {pack,slot}=moving;
      pack.root.position.set(...localPoint([slot,0,stockZ]));pack.root.rotation.y=Math.PI;
      pack.root.userData.stocked=true;stocked.push(pack);moving=null;
      if(stocked.length<slots.length)current=makePallet(receiveX,z);
    }
  }
  return {root:cell,stocked,get current(){return current},get lowering(){return lowering},get moving(){return moving},get liftOffset(){return (current||lowering)?.root.position.y||0},get accepted(){return accepted},canAccept,accept,update};
}
