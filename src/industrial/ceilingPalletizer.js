import {createCeilingPanelStyles} from './ceilingPanelStyles.js';
import {localPoint} from './processPlan.js';

// Independent potolok packing cell in the floor rectangle south of GK-001.
// The drywall discharge and the BEUMER/board packers keep their own routes.
// October 28 markup: move this line and its shared board-wrapper entrance
// 1.5 m toward the dryer, retaining the dispatch offsets and connected rollers.
export const CEILING_PACK={west:-4.6,east:10.2,north:-29.9,south:-34.9,z:-32.4,
  feedX:-3.8,tileFeedX:.35,pickX:.6,stackX:1.9,wrapperX:5.2,dispatchX:8,
  slotsZ:[-31.15,-33.65],sheets:8,thickness:.035,feedSeconds:4,strapSeconds:1.5,transferSpeed:1.2};

export function buildCeilingPalletizer(k,{parent,equipment}){
  const {box,group,m,textPlate}=k,C=CEILING_PACK;
  const root=group([0,0,0],parent);root.name='ceiling-pallet-packaging';
  const at=(x,y,z,dynamic=false)=>group(localPoint([x,y,z]),root,dynamic);
  const steel=equipment.zinc,frame=equipment.enamel,dark=equipment.cast,blue=equipment.blue;
  const styles=createCeilingPanelStyles(k);
  const floor=at((C.west+C.east)/2,0,(C.north+C.south)/2);floor.name='ceiling-packaging-floor';
  const width=C.east-C.west,depth=C.north-C.south;
  for(const z of [-depth/2+.04,depth/2-.04])box(width-.08,.018,.055,[0,.018,z],m.yellow,floor);
  for(const x of [-width/2+.04,width/2-.04])box(.055,.018,depth-.08,[x,.018,0],m.yellow,floor);
  const title=textPlate('POTOLOK · PALET GAPLAÝYŞ',5.8,.44,[0,.03,depth/2-.44],floor,'#215078','#f5f5ed');
  title.rotation.x=-Math.PI/2;

  // Continuous powered rollers carry the pallet from the receiving lift
  // through the wrapping arch to the two-slot dispatch table.
  const bed=at((C.feedX+C.dispatchX)/2,0,C.z);bed.name='ceiling-packaging-roller-bed';
  const length=C.dispatchX-C.feedX;
  for(const z of [-.93,.93]){
    box(length,.16,.09,[0,1.04,z],blue,bed);
    for(let x=-length/2+.3;x<length/2;x+=1.6){
      box(.10,.96,.10,[x,.52,z],dark,bed);
      box(.28,.04,.28,[x,.03,z],steel,bed);
    }
  }
  for(let x=-length/2+.1;x<length/2;x+=.24)
    equipment.cylinder(.058,1.72,[x,1.12,0],steel,bed,'z',undefined,10);
  equipment.gearmotor([length/2-1,.34,1.22],bed,.38,Math.PI/2);

  const lift=at(C.stackX,0,C.z);lift.name='ceiling-packaging-lift';
  for(const x of [-.95,.95])for(const z of [-.87,.87])box(.10,1.03,.10,[x,.51,z],dark,lift);
  const liftDeck=group([0,0,0],lift,true);
  box(1.7,.11,1.68,[0,1.11,0],steel,liftDeck);
  for(const z of [-.65,.65])box(1.7,.07,.07,[0,1.15,z],frame,liftDeck);

  // Vacuum pick head deposits one 600 mm tile group at a time on the lift.
  const pickFrame=at(1.15,0,C.z);pickFrame.name='ceiling-packaging-pick-frame';
  for(const x of [-1.65,1.65])for(const z of [-1.04,1.04])box(.13,2.95,.13,[x,1.475,z],frame,pickFrame);
  for(const z of [-1.04,1.04])box(3.43,.15,.13,[0,2.96,z],frame,pickFrame);
  box(3.45,.17,.28,[0,2.98,0],blue,pickFrame);
  const head=at(C.pickX,2.13,C.z,true);head.name='ceiling-packaging-vacuum-head';
  box(1.28,.14,1.28,[0,0,0],blue,head);
  for(const x of [-.45,.45])for(const z of [-.45,.45]){
    box(.055,.31,.055,[x,-.22,z],dark,head);
    equipment.cylinder(.09,.035,[x,-.38,z],m.rubber,head,'y',undefined,10);
  }

  const wrapper=at(C.wrapperX,0,C.z);wrapper.name='ceiling-packaging-wrapper';
  for(const z of [-1.13,1.13])box(.22,2.8,.22,[0,1.4,z],frame,wrapper);
  box(.27,.21,2.5,[0,2.87,0],blue,wrapper);
  const wrapHead=group([0,1.96,0],wrapper,true);wrapHead.name='ceiling-packaging-strap-head';
  box(.27,.21,1.66,[0,0,0],dark,wrapHead);
  const filmRoll=equipment.cylinder(.32,.52,[.46,1.35,1.38],m.paper,wrapper,'y',undefined,16);
  filmRoll.name='ceiling-packaging-film-roll';
  const controls=k.cabinet(localPoint([C.wrapperX+1,0,C.z-1.4]),root);controls.scale.setScalar(.7);

  // The perpendicular rollers support the short sideways move into a slot.
  const dispatch=at(C.dispatchX,0,C.z);dispatch.name='ceiling-packaging-dispatch';
  for(const x of [-.91,.91])box(.09,.16,3.9,[x,1.04,0],blue,dispatch);
  for(let z=-1.85;z<1.95;z+=.24)
    equipment.cylinder(.055,1.7,[0,1.12,z],steel,dispatch,'x',undefined,10);
  for(const z of C.slotsZ){
    const pad=at(C.dispatchX,0,z);pad.name='ceiling-packaging-pallet-slot';
    for(const x of [-.92,.92])for(const zz of [-.52,.52]){
      box(.10,.96,.10,[x,.52,zz],dark,pad);box(.28,.04,.28,[x,.03,zz],steel,pad);
    }
  }

  function bundle(z=C.z,filled=0){
    const rootPack=at(C.stackX,0,z,true);rootPack.name='ceiling-package';
    for(const z of [-.52,0,.52])box(1.52,.08,.12,[0,1.22,z],m.wood,rootPack);
    box(1.55,.08,1.53,[0,1.30,0],m.wood,rootPack);
    const layers=[];
    for(let i=0;i<C.sheets;i++){
      const layer=styles.sheet(rootPack,1.34+i*C.thickness,0,{split:true});
      layer.name='ceiling-packed-panel';layer.visible=i<filled;layers.push(layer);
    }
    const straps=group([0,0,0],rootPack,true);straps.name='ceiling-package-straps';straps.visible=filled===C.sheets;
    const top=1.34+C.sheets*C.thickness;
    for(const x of [-.39,.39]){
      box(.035,.012,1.38,[x,top+.006,0],m.blue,straps);
      box(.035,.012,1.38,[x,1.334,0],m.blue,straps);
      for(const z of [-.69,.69])box(.035,top-1.334,.012,[x,(top+1.334)/2,z],m.blue,straps);
    }
    rootPack.userData.panelCount=filled;
    rootPack.userData.complete=filled===C.sheets;
    return {root:rootPack,layers,straps,count:filled};
  }

  // A finished pallet already occupies the first dispatch slot; the active
  // packer fills the next one so the cell reads as operating on first load.
  const staged=[bundle(C.slotsZ[0],C.sheets)];
  staged[0].root.position.x=localPoint([C.dispatchX,0,0])[0];
  let current=bundle(),phase='feeding',elapsed=0,accepted=0;
  // The west end now receives board pallets from the joined roller line.
  // Tiles enter farther east so neither product occupies that merge point.
  const incoming=at(C.tileFeedX,1.18,C.z,true);incoming.name='ceiling-incoming-panel';
  styles.sheet(incoming,0,0,{split:true});
  const lerp=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
  function update(dt,enabled){
    if(!enabled||!(dt>0))return;
    let left=dt;
    for(let guard=0;left>1e-9&&guard<48;guard++){
      if(phase==='full')break;
      const duration=phase==='feeding'?C.feedSeconds:phase==='strapping'?C.strapSeconds:
        phase==='outbound'?Math.abs(C.dispatchX-C.stackX)/C.transferSpeed:
        Math.abs(C.slotsZ[staged.length]-C.z)/C.transferSpeed;
      const step=Math.min(left,duration-elapsed);elapsed+=step;left-=step;
      if(phase==='feeding'){
        const t=elapsed/C.feedSeconds,layerY=1.34+current.count*C.thickness;
        incoming.visible=t<.75;
        current.layers[current.count].visible=t>=.75;
        if(t<.25){incoming.position.x=localPoint([lerp(C.tileFeedX,C.pickX,t*4),0,0])[0];incoming.position.y=1.18;head.position.x=localPoint([C.pickX,0,0])[0];head.position.y=lerp(2.13,1.61,t*4);}
        else if(t<.5){const u=(t-.25)*4;incoming.position.x=localPoint([lerp(C.pickX,C.stackX,u),0,0])[0];incoming.position.y=lerp(1.18,1.65,u);head.position.x=incoming.position.x;head.position.y=lerp(1.61,2.08,u);}
        else if(t<.75){const u=(t-.5)*4;incoming.position.x=localPoint([C.stackX,0,0])[0];incoming.position.y=lerp(1.65,layerY,u);head.position.x=incoming.position.x;head.position.y=lerp(2.08,layerY+.43,u);}
        else{head.position.x=localPoint([lerp(C.stackX,C.pickX,(t-.75)*4),0,0])[0];head.position.y=lerp(layerY+.43,2.13,(t-.75)*4);}
      }else if(phase==='strapping'){
        incoming.visible=false;head.position.y=2.13;
      }else if(phase==='outbound'){
        current.root.position.x=localPoint([lerp(C.stackX,C.dispatchX,elapsed/duration),0,0])[0];
        wrapHead.position.y=1.96-.28*Math.max(0,1-Math.abs(current.root.position.x-localPoint([C.wrapperX,0,0])[0])/.7);
      }else if(phase==='side-transfer'){
        current.root.position.z=localPoint([0,0,lerp(C.z,C.slotsZ[staged.length],elapsed/duration)])[2];
      }
      if(elapsed<duration-1e-9)continue;
      elapsed=0;
      if(phase==='feeding'){
        incoming.visible=false;current.layers[current.count].visible=true;current.count++;accepted++;
        current.root.userData.panelCount=current.count;
        if(current.count===C.sheets)phase='strapping';
      }else if(phase==='strapping'){
        current.straps.visible=true;current.root.userData.complete=true;phase='outbound';
      }else if(phase==='outbound'){wrapHead.position.y=1.96;phase='side-transfer';}
      else if(phase==='side-transfer'){
        staged.push(current);
        if(staged.length===C.slotsZ.length){phase='full';head.position.set(localPoint([C.pickX,0,0])[0],2.13,head.position.z);}
        else{current=bundle();phase='feeding';}
      }
    }
  }
  return {root,head,staged,get current(){return current;},get phase(){return phase;},get accepted(){return accepted;},update};
}
