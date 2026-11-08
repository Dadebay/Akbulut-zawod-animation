import {localPoint,BOARD_END} from './processPlan.js';
import {CEILING_PACK} from './ceilingPalletizer.js';
import {boardMass,boardReady} from './processPhysics.js';
import {createForkliftBuilder} from './forklift.js';
import {FORKLIFT_LAYOUT} from './forkliftMotion.js';
import {createWorkerBuilder} from './workers.js';

// Illustrative board bundle: the lift supports every sheet, lowers by one
// thickness after placement, then raises the pallet to the side rollers.
// Dispatch slots are ordered farthest-first along the eastbound transfer so
// a new pallet never has to pass through a completed pallet.
export const BOARD_PACK={sheets:6,thickness:.03,maxKg:300,placeSeconds:1.2,strapSeconds:.8,liftSpeed:.25,transferSpeed:1,
  stagingZ:CEILING_PACK.z,stagingXs:[CEILING_PACK.feedX+1.25,-6.8,-9.8],wrapX:BOARD_END[0],wrapSeconds:3.2,
  stockZ:-34.1,stockXs:[-31,-28,-25],carrierLaneZ:-37.1,carrierRearZ:-37.6,carrierSpeed:1.25};

export function buildBoardPalletizer(k,{parent,equipment,receiver}){
  const {box,cyl,group,m,material,textPlate}=k,{sheets,thickness,stagingZ,stagingXs}=BOARD_PACK;
  const [rx,,rz]=receiver,cell=group([0,0,0],parent);cell.name='board-packaging-cell';
  const at=(x,y,z,dynamic=false)=>group(localPoint([x,y,z]),cell,dynamic);
  // Raise the board rollers gently from their lift height to the shared
  // potolok feeder. Both products meet the same supported roller elevation.
  const wrapperHalf=1.59,rise=.158,rampStart=BOARD_PACK.wrapX+wrapperHalf;
  const rampY=x=>rise*Math.max(0,Math.min(1,(x-rampStart)/(CEILING_PACK.feedX-rampStart)));
  const support=equipment.zinc,wood=m.wood,strapMat=m.blue;
  // A lift pit accepts the incoming sheet at the powered roller height.
  const lift=at(rx,0,rz);lift.name='board-packaging-lift';
  for(const z of [-1.35,1.35])for(const x of [-1.35,1.35])box(.12,.66,.12,[x,.33,z],equipment.cast,lift);
  const liftDeck=group([0,0,0],lift,true);liftDeck.name='board-packaging-lift-platform';
  // The open receiving deck supports the sheet's quarter-turn. Fixed rollers
  // stop outside this pocket so the pallet can lower without crossing them.
  box(2.72,.16,2.72,[0,.94,0],support,liftDeck);
  // Both conveyor centre lines meet at the wrapper. End their frames at the
  // square base instead of crossing the circular deck with a second roller bed.
  const sideStart=stagingZ+wrapperHalf,sideEnd=rz-1.48,run=sideEnd-sideStart;
  const side=at(rx,0,(sideStart+sideEnd)/2);side.name='board-side-transfer';
  for(const x of [-1.32,1.32]){
    box(.11,.18,run,[x,.84,0],support,side);
    for(let z=-run/2+.45;z<run/2-.7;z+=1.6){
      box(.10,.78,.10,[x,.41,z],equipment.cast,side);
      box(.26,.035,.26,[x,.018,z],support,side);
    }
  }
  for(let z=-run/2+.12;z<run/2;z+=.27)equipment.cylinder(.06,2.45,[0,.96,z],support,side,'x',undefined,10);
  const farthest=CEILING_PACK.feedX,crossStart=BOARD_PACK.wrapX+wrapperHalf,crossLength=farthest-crossStart;
  const crossCenter=(crossStart+farthest)/2,cross=at(crossCenter,0,stagingZ);cross.name='board-left-transfer';
  for(const z of [-1.31,1.31]){
    const h0=rampY(crossStart),h1=rampY(farthest);
    const slope=Math.atan2(h1-h0,crossLength);
    // Keep the tilted rail's end faces inside the shortened transfer footprint.
    const railLength=(crossLength-.17*Math.sin(slope))/Math.cos(slope);
    const rail=box(railLength,.17,.10,[0,.84+(h0+h1)/2,z],support,cross);
    rail.rotation.z=slope;
    for(let x=crossStart+.45;x<farthest;x+=1.6){
      const height=.78+rampY(x);
      box(.10,height,.10,[x-crossCenter,.02+height/2,z],equipment.cast,cross);
      box(.26,.035,.26,[x-crossCenter,.018,z],support,cross);
    }
  }
  for(let x=-crossLength/2+.16;x<crossLength/2;x+=.27){
    equipment.cylinder(.06,2.42,[x,.96+rampY(x+crossCenter),0],support,cross,'z',undefined,10);
  }
  // Blue square turntable with a fully supported circular roller deck. Keep the
  // film dispenser beside it so the pallet and rollers remain visible above.
  const wrapper=at(BOARD_PACK.wrapX,0,stagingZ);wrapper.name='board-pallet-wrapper';
  const turntable=group([0,0,0],wrapper,true);turntable.name='board-wrapper-turntable';
  box(3.18,.16,3.18,[0,.62,0],equipment.blue,wrapper).name='board-wrapper-blue-base';
  for(const z of [-1.53,1.53])box(3.18,.12,.12,[0,.78,z],equipment.blue,wrapper);
  for(const x of [-1.53,1.53])box(.12,.12,3.06,[x,.78,0],equipment.blue,wrapper);
  for(const x of [-1.39,1.39])for(const z of [-1.39,1.39])box(.15,.035,.15,[x,.86,z],equipment.cast,wrapper);
  cyl(1.46,.08,[0,.76,0],equipment.cast,wrapper,1.46,32);
  cyl(1.42,.12,[0,.85,0],equipment.enamel,turntable,1.42,32);
  const radius=1.42;
  for(let x=-radius+.13;x<radius;x+=.22){
    const length=2*Math.sqrt(Math.max(0,radius*radius-x*x))-.08;
    equipment.cylinder(.055,length,[x,.96,0],support,turntable,'z',undefined,10);
  }
  const portal=at(BOARD_PACK.wrapX,0,stagingZ);portal.name='board-wrapper-portal';
  portal.rotation.y=-Math.PI/2;
  box(.16,2.65,.16,[0,1.325,1.76],equipment.enamel,portal);
  box(.34,.06,.34,[0,.03,1.76],equipment.cast,portal);
  const filmHead=group([0,2.45,1.58],portal,true);filmHead.name='board-wrapper-film-head';
  box(.45,.22,.48,[0,0,0],equipment.enamel,filmHead);
  equipment.cylinder(.18,.65,[.28,-.43,-.36],m.paper,filmHead,'y',undefined,12);
  const cabinet=k.cabinet(localPoint([BOARD_PACK.wrapX+.9,0,stagingZ-2.05]),cell);cabinet.scale.setScalar(.7);
  const stage=at(-8.5,0,stagingZ);stage.name='board-packaging-staging';
  box(7.8,.08,3.7,[0,.04,0],m.concrete,stage);
  for(const z of [-1.72,1.72])box(7.8,.012,.07,[0,.09,z],m.yellow,stage);
  for(const x of stagingXs){
    const lane=at(x,0,stagingZ);lane.name='board-packaging-slot';
    for(const z of x===stagingXs[0]?[-.93,.93]:[-.8,.8]){
      const from=x-1.375,to=Math.min(x+1.375,CEILING_PACK.feedX);
      if(to<=from)continue;
      const h0=rampY(from),h1=rampY(to);
      const rail=box(Math.hypot(to-from,h1-h0),.11,.08,[(from+to)/2-x,.90+(h0+h1)/2,z],x===stagingXs[0]?equipment.blue:support,lane);
      rail.rotation.z=Math.atan2(h1-h0,to-from);
    }
    for(let xx=-1.22;xx<1.3&&x+xx<CEILING_PACK.feedX-.05;xx+=.28)
      equipment.cylinder(.06,1.35,[xx,.96+rampY(x+xx),0],support,lane,'z',undefined,10);
  }
  // Low stock pads hold each pallet above the floor so the carrier forks can withdraw.
  const stock=at(BOARD_PACK.stockXs[1],0,BOARD_PACK.stockZ);stock.name='board-pallet-stock-area';
  box(10.5,.035,2.6,[0,.018,0],m.concrete,stock);
  for(const [i,x] of BOARD_PACK.stockXs.entries()){
    const slot=at(x,0,BOARD_PACK.stockZ);slot.name=`board-stock-slot-${i+1}`;
    box(2.78,.16,1.62,[0,.08,0],support,slot);
    for(const z of [-.9,.9])box(2.88,.012,.05,[0,.175,z],m.yellow,slot);
  }
  const stockTitle=textPlate('GIPSOKARTON · STOK',4.4,.35,[0,.055,1.11],stock,'#294e6d','#e9edf0');
  stockTitle.rotation.x=-Math.PI/2;

  // Reuse the white forklift working at the rail siding, including its driver,
  // guarded cab and wheel assemblies. This machine carries the actual pack.
  const carrier=at(stagingXs[0],0,BOARD_PACK.carrierLaneZ,true);carrier.name='board-pallet-carrier';
  const emptyPallet=(parent,pos)=>group(pos,parent,true);
  const forklift=createForkliftBuilder(k,emptyPallet,createWorkerBuilder(k))(4);
  carrier.add(forklift.g);forklift.g.name='board-pallet-forklift-model';
  forklift.cargo.visible=forklift.bagCargo.visible=false;
  const carrierFork=forklift.fork;carrierFork.name='board-carrier-forks';
  const stageSlots=Array(stagingXs.length).fill(null),stocked=[];
  let serial=0,accepted=0,phase='receiving',elapsed=0,activeSheet=null,current,targetSlot=-1;
  let carrierPack=null,carrierPhase='idle',carrierX=stagingXs[0],carrierZ=BOARD_PACK.carrierLaneZ,carrierTargetX=null,carrierSlot=-1,carrierForkY=0;
  let carrierYaw=-Math.PI/2,vehicleTravel=0,vehicleClock=0;
  forklift.g.position.z=-.3;forklift.g.rotation.y=carrierYaw;
  carrierFork.position.y=.94-FORKLIFT_LAYOUT.mastBaseY;
  const sheetBaseY=1.17+thickness/2;
  let placementStartY=0,placementStartYaw=0;
  function newPack(){
    const root=at(rx,0,rz,true);root.name=`board-package-${++serial}`;
    // Pallet bottom and side rollers meet at 1.02 m; its top meets the sheet.
    for(const z of [-.52,0,.52])box(2.45,.08,.14,[0,1.06,z],wood,root);
    box(2.5,.08,1.35,[0,1.13,0],wood,root);
    const layers=[];
    for(let i=0;i<sheets;i++){
      const layer=box(2.4,thickness,1.2,[0,sheetBaseY+i*thickness,0],m.paper,root,.005);
      layer.name='board-packed-sheet';layer.userData.dynamic=true;layer.visible=false;layers.push(layer);
    }
    const straps=group([0,0,0],root,true);straps.name='board-package-straps';straps.visible=false;
    const film=group([0,0,0],root,true);film.name='board-package-stretch-film';film.visible=false;
    const clear=material('#d9e7eb',.04,.34,{transparent:true,opacity:.32,depthWrite:false});
    for(const z of [-.685,.685])box(2.53,.24,.015,[0,1.28,z],clear,film);
    for(const x of [-1.265,1.265])box(.015,.24,1.37,[x,1.28,0],clear,film);
    const top=1.18+sheets*thickness;
    for(const x of [-.68,.68]){
      box(.035,.012,1.36,[x,top+.006,0],strapMat,straps);
      box(.035,.012,1.36,[x,1.174,0],strapMat,straps);
      for(const z of [-.68,.68])box(.035,top-1.174,.012,[x,(top+1.174)/2,z],strapMat,straps);
    }
    root.userData.boardCount=0;root.userData.massKg=0;root.userData.complete=false;
    return {root,layers,straps,film,count:0,massKg:0};
  }
  current=newPack();
  const staged=()=>stageSlots.filter(Boolean);
  function accessibleSlot(){
    // A new pallet approaches from the west. Stop at the first free slot
    // before any occupied slot, or use the farthest slot if the line is clear.
    for(let i=stageSlots.length-1;i>=0;i--)if(stageSlots[i])return i===stageSlots.length-1?-1:i+1;
    return 0;
  }
  const outstanding=()=>stocked.length+staged().length+(carrierPack?1:0);
  function canAccept(batch){
    return phase==='receiving'&&outstanding()<BOARD_PACK.stockXs.length&&accessibleSlot()>=0&&current.count<sheets&&
      (!batch||boardReady(batch)&&current.massKg+boardMass(batch)<=BOARD_PACK.maxKg);
  }
  function accept(batch,source){
    if(!batch||!canAccept(batch))return false;
    current.massKg+=boardMass(batch);current.root.userData.massKg=current.massKg;
    activeSheet=current.layers[current.count];activeSheet.visible=true;
    placementStartY=(source?.position.y??receiver[1])+.02-current.root.position.y;
    placementStartYaw=source?.rotation.y??Math.PI/2;
    activeSheet.position.y=placementStartY;activeSheet.rotation.y=placementStartYaw;
    phase='placing';elapsed=0;accepted++;
    return true;
  }
  const toward=(value,target,speed,time)=>value+Math.sign(target-value)*Math.min(Math.abs(target-value),speed*time);
  function updateCarrier(dt){
    let left=dt;vehicleClock+=dt;
    for(let guard=0;left>1e-9&&guard<48;guard++){
      if(carrierPhase==='idle'){
        const next=stageSlots.findIndex(Boolean);
        if(next<0||stocked.length>=BOARD_PACK.stockXs.length)break;
        carrierSlot=next;carrierTargetX=BOARD_PACK.stockXs[stocked.length];
        carrierForkY=rampY(stagingXs[next]);
        carrierPhase=Math.abs(carrierX-stagingXs[next])<1e-8?'approach':'turn-align';
      }
      const move=(axis,target,speed)=>{
        const value=axis==='x'?carrierX:axis==='z'?carrierZ:axis==='yaw'?carrierYaw:carrierForkY;
        const step=Math.min(left,Math.abs(target-value)/speed),next=toward(value,target,speed,step);
        if(axis==='x'){vehicleTravel+=(next-value)*Math.cos(carrierYaw);carrierX=next;}
        else if(axis==='z'){vehicleTravel-=(next-value)*Math.sin(carrierYaw);carrierZ=next;}
        else if(axis==='yaw')carrierYaw=next;
        else carrierForkY=next;
        left-=step;return Math.abs(next-target)<1e-8;
      };
      if(carrierPhase==='turn-align'){
        if(move('yaw',stagingXs[carrierSlot]<carrierX?-Math.PI:0,1.1))carrierPhase='align';
      }else if(carrierPhase==='align'){
        if(move('x',stagingXs[carrierSlot],BOARD_PACK.carrierSpeed))carrierPhase='turn-pickup';
      }else if(carrierPhase==='turn-pickup'){
        if(move('yaw',-Math.PI/2,1.1))carrierPhase='approach';
      }else if(carrierPhase==='approach'){
        if(move('z',stagingZ-1.8,.85)){
          carrierPack=stageSlots[carrierSlot];stageSlots[carrierSlot]=null;
          carrierPack.root.removeFromParent();carrierFork.add(carrierPack.root);
          carrierPack.root.position.set(FORKLIFT_LAYOUT.cargoX-FORKLIFT_LAYOUT.mastX,-.94,0);
          carrierPack.root.rotation.y=Math.PI/2;
          carrierPhase='lift';
        }
      }else if(carrierPhase==='lift'){
        if(move('y',rampY(stagingXs[carrierSlot])+.25,.42))carrierPhase='back';
      }else if(carrierPhase==='back'){
        if(move('z',BOARD_PACK.carrierLaneZ,.95))carrierPhase='turn-west';
      }else if(carrierPhase==='turn-west'){
        if(move('yaw',-Math.PI,1.1))carrierPhase='travel';
      }else if(carrierPhase==='travel'){
        if(move('x',carrierTargetX,BOARD_PACK.carrierSpeed))carrierPhase='turn-stock';
      }else if(carrierPhase==='turn-stock'){
        if(move('yaw',-Math.PI/2,1.1))carrierPhase='approach-stock';
      }else if(carrierPhase==='approach-stock'){
        if(move('z',BOARD_PACK.stockZ-1.8,.85))carrierPhase='lower';
      }else if(carrierPhase==='lower'){
        if(move('y',-.84,.42)){
          const pack=carrierPack;carrierFork.remove(pack.root);cell.add(pack.root);
          pack.root.position.set(...localPoint([carrierTargetX,-.84,BOARD_PACK.stockZ]));
          pack.root.rotation.y=0;pack.root.userData.stocked=true;
          stocked.push(pack);carrierPack=null;carrierPhase='withdraw';
        }
      }else if(carrierPhase==='withdraw'){
        if(move('z',BOARD_PACK.carrierRearZ,.9))carrierPhase='raise';
      }else if(carrierPhase==='raise'){
        if(move('y',0,.55))carrierPhase='turn-east';
      }else if(carrierPhase==='turn-east'){
        if(move('yaw',0,1.1))carrierPhase='return';
      }else if(carrierPhase==='return'){
        if(move('x',stagingXs[0],BOARD_PACK.carrierSpeed))carrierPhase='turn-home';
      }else if(carrierPhase==='turn-home'){
        if(move('yaw',-Math.PI/2,1.1))carrierPhase='ready';
      }else if(carrierPhase==='ready'){
        if(move('z',BOARD_PACK.carrierLaneZ,.9))carrierPhase='idle';
      }
      if(left<=1e-9)break;
    }
    carrier.position.set(...localPoint([carrierX,0,carrierZ]));
    const reverse=['back','withdraw'].includes(carrierPhase);
    const steering=carrierPhase.startsWith('turn-');
    forklift.update({x:0,y:0,z:-.3,yaw:carrierYaw,height:.94+carrierForkY,tilt:0,
      carrying:false,kind:'panel',curvature:steering ? .35 : 0,steer:steering ? .35 : 0,
      wheelTravel:forklift.ws.map(()=>vehicleTravel),reverse,lookBack:reverse?1:0},vehicleClock);
  }
  function update(dt,enabled){
    if(!enabled||!(dt>0))return;
    updateCarrier(dt);
    let left=dt;
    for(let guard=0;left>1e-9&&guard<32;guard++){
      if(phase==='receiving')break;
      if(phase==='placing'){
        const step=Math.min(left,BOARD_PACK.placeSeconds-elapsed);elapsed+=step;left-=step;
        const t=elapsed/BOARD_PACK.placeSeconds,smooth=t*t*(3-2*t);
        const targetY=sheetBaseY+current.count*thickness;
        activeSheet.position.y=placementStartY+(targetY-placementStartY)*smooth;
        activeSheet.rotation.y=placementStartYaw*(1-smooth);
        if(elapsed>=BOARD_PACK.placeSeconds-1e-9){
          activeSheet.position.y=targetY;activeSheet.rotation.y=0;
          current.count++;current.root.userData.boardCount=current.count;
          phase='lowering';activeSheet=null;
        }
      }else if(phase==='lowering'||phase==='raising'){
        const target=phase==='lowering'?-current.count*thickness:0;
        const distance=Math.abs(target-current.root.position.y),step=Math.min(left,distance/BOARD_PACK.liftSpeed);
        current.root.position.y=toward(current.root.position.y,target,BOARD_PACK.liftSpeed,step);
        liftDeck.position.y=current.root.position.y;left-=step;
        if(Math.abs(current.root.position.y-target)<1e-9){
          if(phase==='lowering')phase=current.count===sheets?'raising':'receiving';
          else{phase='strapping';elapsed=0;}
        }
      }else if(phase==='strapping'){
        const step=Math.min(left,BOARD_PACK.strapSeconds-elapsed);elapsed+=step;left-=step;
        if(elapsed>=BOARD_PACK.strapSeconds-1e-9){current.straps.visible=true;current.root.userData.complete=true;phase='transfer-z';}
      }else if(phase==='transfer-z'||phase==='transfer-to-wrapper'||phase==='transfer-x'){
        const axis=phase==='transfer-z'?'z':'x';
        const target=axis==='z'?stagingZ+25:phase==='transfer-to-wrapper'?BOARD_PACK.wrapX-8:stagingXs[targetSlot]-8;
        const distance=Math.abs(target-current.root.position[axis]),step=Math.min(left,distance/BOARD_PACK.transferSpeed);
        current.root.position[axis]=toward(current.root.position[axis],target,BOARD_PACK.transferSpeed,step);left-=step;
        if(phase==='transfer-x')current.root.position.y=rampY(current.root.position.x+8);
        if(Math.abs(current.root.position[axis]-target)<1e-9){
          if(axis==='z')phase='transfer-to-wrapper';
          else if(phase==='transfer-to-wrapper'){phase='wrapping';elapsed=0;}
          else{stageSlots[targetSlot]=current;targetSlot=-1;current=newPack();phase='receiving';}
        }
      }else if(phase==='wrapping'){
        const step=Math.min(left,BOARD_PACK.wrapSeconds-elapsed);elapsed+=step;left-=step;
        const progress=elapsed/BOARD_PACK.wrapSeconds;
        current.root.rotation.y=turntable.rotation.y=2*Math.PI*progress;
        filmHead.position.y=2.45-.24*Math.sin(Math.PI*progress);
        if(elapsed>=BOARD_PACK.wrapSeconds-1e-9){
          current.root.rotation.y=turntable.rotation.y=0;filmHead.position.y=2.45;
          current.film.visible=true;current.root.userData.wrapped=true;
          phase='waiting-slot';elapsed=0;
        }
      }else if(phase==='waiting-slot'){
        const slot=accessibleSlot();
        if(slot<0)break;
        targetSlot=slot;phase='transfer-x';
      }
    }
  }
  return {root:cell,stocked,stageSlots,carrier,get staged(){return staged();},get current(){return current;},get phase(){return phase;},get carrierPhase(){return carrierPhase;},get carried(){return carrierPack;},get accepted(){return accepted;},canAccept,accept,update};
}
