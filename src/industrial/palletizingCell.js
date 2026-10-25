import * as T from 'three';
import {BOARD_END,BOARD_PALLET_OUT,PALLET_ROBOT_BASE,localPoint} from './processPlan.js';

// Two material-triggered arms share one receiver and fill separate pallets.
const BOARD_BOTTOM=.005,BOARD_TOP=.035,THICKNESS=.03;
const SHOULDER_HEIGHT=1.5,UPPER_ARM=2.75,FOREARM=2.75,TOOL_DROP=.7;
const CARRY_HEIGHT=2.35,CAPACITY=24;
const smooth=t=>t*t*t*(10+t*(-15+6*t));

export function buildPalletizingCell(k,{root,equipment,onPickupClear}){
  const {m,group,box,cyl,rod,pipe,material,textPlate}=k;
  const pickup=new T.Vector3(...localPoint(BOARD_END));pickup.y+=BOARD_TOP;
  const deckHeight=BOARD_PALLET_OUT[1]+.21;
  // The shared robot/receiver enclosure has no fence through the transfer path.
  const guards=group([0,0,0],root);guards.name='GP-receiver-guards';
  // Keep both robot arms and pallets inside the middle roof bay, beside the
  // shortened board receiver. The railway-side bay is entirely unobstructed.
  const px=BOARD_END[0],pz=BOARD_END[2];
  const boundary=[[px+9.3,pz-5.6],[px+9.3,pz+1.8],[px+3.2,pz+1.8]];
  for(let i=1;i<boundary.length;i++){
    const [ax,az]=boundary[i-1],[bx,bz]=boundary[i];
    equipment.fence(Math.hypot(bx-ax,bz-az),2.25,localPoint([(ax+bx)/2,.25,(az+bz)/2]),guards,-Math.atan2(bz-az,bx-ax));
  }
  equipment.fence(5.6,2.25,localPoint([px+6.5,.25,pz-5.6]),guards);

  // Open roller receiver: photoelectric stop and low guides, no roof or fake
  // stack occupying the board's pickup volume.
  const receiver=group(localPoint([BOARD_END[0],0,BOARD_END[2]]),root);
  for(const z of [-.72,.72]){
    box(2.8,.10,.055,[0,1.235,z],equipment.blue,receiver);
    box(.14,.16,.12,[.85,1.27,z],equipment.cast,receiver);
  }
  box(.07,.11,1.35,[1.25,1.235,0],m.rubber,receiver);
  const ready=material('#66818c',.1,.3,{unique:true,emissive:'#183b27',emissiveIntensity:0});
  cyl(.055,.1,[1.25,1.40,.82],ready,receiver);

  function buildArm({id,basePlan,stackPlan,outsideX}){
    const base=new T.Vector3(...localPoint(basePlan));
    const stack=new T.Vector3(...localPoint(stackPlan));
    const outsidePick=new T.Vector3(outsideX-8,CARRY_HEIGHT,pickup.z);
    const outsideStack=new T.Vector3(outsideX-8,CARRY_HEIGHT,stack.z);
    const toolPoint=outsideStack.clone();
    const robot=group(base.toArray(),root);
    robot.name=`GP-product-driven-robot-${id}`;
    box(2.2,.22,2.2,[0,.11,0],m.concrete,robot);
    box(1.8,.18,1.8,[0,.31,0],equipment.cast,robot,.025);
    cyl(.75,.85,[0,.825,0],equipment.enamel,robot,.6,48);
    for(const x of [-.72,.72])for(const z of [-.72,.72])equipment.bolt([x,.42,z],robot);
    const yaw=group([0,SHOULDER_HEIGHT,0],robot,true);
    cyl(.62,.25,[0,-.125,0],equipment.blue,yaw);
    const shoulder=group([0,0,0],yaw,true);
    const elbow=group([UPPER_ARM,0,0],shoulder,true);
    const wrist=group([FOREARM,0,0],elbow,true);
    const levelTool=group([0,0,0],wrist,true);
    function joint(parent,radius){
      equipment.cylinder(radius,.65,[0,0,0],equipment.blue,parent,'z');
      for(const z of [-.35,.35]){
        equipment.cylinder(radius*.7,.045,[0,0,z],m.steel,parent,'z');
        for(let n=0;n<8;n++){
          const a=n*Math.PI/4;
          equipment.bolt([Math.cos(a)*radius*.82,Math.sin(a)*radius*.82,z],parent,'z',.025);
        }
      }
    }
    function link(parent,length,width){
      box(length,width,.42,[length/2,0,0],equipment.enamel,parent,.06);
      rod([.2,-width*.62,-.3],[length-.2,-width*.62,-.3],.045,equipment.cast,parent);
      pipe([[.05,0,.4],[.3,.3,.4],[length-.3,.3,.4],[length,0,.4]],.045,m.black,parent);
    }
    joint(shoulder,.34);link(shoulder,UPPER_ARM,.48);
    joint(elbow,.32);link(elbow,FOREARM,.35);joint(wrist,.24);
    rod([0,0,0],[0,-.40,0],.11,m.polished,levelTool);
    box(1.9,.12,1.1,[0,-.43,0],equipment.blue,levelTool,.025);
    for(const x of [-.72,0,.72])for(const z of [-.42,.42]){
      cyl(.045,.15,[x,-.565,z],m.polished,levelTool);
      cyl(.14,.06,[x,-.67,z],m.rubber,levelTool,.10);
      pipe([[0,-.26,0],[x,-.26,z],[x,-.61,z]],.018,m.black,levelTool);
    }
    const vacuum=material('#657a83',.15,.4,{unique:true,emissive:'#214b39',emissiveIntensity:0});
    cyl(.045,.09,[.83,-.31,.36],vacuum,levelTool);
    k.cabinet([1.6,0,id===1?1.9:-1.9],robot);
    // Each pallet fills only from actual dry-board arrivals.
    const pallet=group(stack.toArray(),root);pallet.name=`GP-filling-pallet-${id}`;
    for(const z of [-.53,0,.53])box(2.6,.10,.16,[0,.05,z],m.wood,pallet);
    for(const x of [-1.15,-.58,0,.58,1.15])box(.18,.12,1.35,[x,.15,0],m.wood,pallet);
    const layers=Array.from({length:CAPACITY},(_,i)=>{
      const layer=group([stack.x,deckHeight-BOARD_BOTTOM+i*THICKNESS,stack.z],root,true);
      box(2.4,THICKNESS,1.2,[0,.02,0],m.paper,layer,.006);
      box(2.4,.001,.025,[0,.0345,.59],m.blueLight,layer);
      layer.visible=false;return layer;
    });
    // A fixed-height readout makes even a few 30 mm sheets legible from above.
    const readout=group([stack.x,0,stack.z-1.04],root,true);
    box(.075,1.68,.075,[-1.05,.84,0],m.steel,readout);
    const face=group([0,1.65,0],readout,true);face.rotation.set(-1.19,0,Math.PI);
    box(1.75,.52,.08,[0,0,0],equipment.blue,face,.025);
    textPlate(`GP-${String(id).padStart(3,'0')}`,1.55,.18,[0,-.12,.05],face,'#164270','#f2f5f3');
    const counts=Array.from({length:CAPACITY+1},(_,n)=>{
      const label=textPlate(`${String(n).padStart(2,'0')} / ${CAPACITY}`,1.55,.19,[0,.12,.05],face,'#164270','#f2f5f3');
      label.visible=n===0;return label;
    });
    const fill=group([-.7,.23,.055],face,true);
    box(1.4,.035,.02,[0,.23,.05],m.dark,face);
    box(1.4,.035,.025,[.7,0,0],m.blueLight,fill);
    // A zero-scale dynamic owner has no inverse during mesh batching.
    fill.scale.x=.001;fill.visible=false;
    const status={phase:'waiting',vacuum:false,stackCount:0,capacity:CAPACITY};
    robot.userData.palletizing=status;
    let held=null,steps=[],stepIndex=0,elapsed=0,from=toolPoint.clone();

    function pose(){
      const dx=toolPoint.x-base.x,dz=toolPoint.z-base.z;
      const radius=Math.hypot(dx,dz),height=toolPoint.y+TOOL_DROP-SHOULDER_HEIGHT;
      const cosine=(radius*radius+height*height-UPPER_ARM**2-FOREARM**2)/(2*UPPER_ARM*FOREARM);
      // Never stretch links to reach an impossible target.
      if(cosine>1+1e-7||cosine< -1-1e-7)throw new Error(`GP-${id} palletizing target is outside robot reach`);
      const bend=-Math.acos(T.MathUtils.clamp(cosine,-1,1));
      const lift=Math.atan2(height,radius)-Math.atan2(FOREARM*Math.sin(bend),UPPER_ARM+FOREARM*Math.cos(bend));
      const heading=-Math.atan2(dz,dx);
      yaw.rotation.y=heading;shoulder.rotation.z=lift;elbow.rotation.z=bend;
      wrist.rotation.z=-lift-bend;levelTool.rotation.y=-heading;
      if(held&&status.vacuum){
        held.object.position.copy(toolPoint);held.object.position.y-=BOARD_TOP;
        held.object.rotation.set(0,0,0);held.object.scale.set(1,1,1);
      }
      vacuum.color.set(status.vacuum?'#38b783':'#657a83');
      vacuum.emissiveIntensity=status.vacuum?.6:0;
    }
    function accept(product,cycle){
      if(held||steps.length||status.stackCount>=CAPACITY)return false;
      held=product;product.palletizing=true;product.handledCycle=cycle;
      product.object.visible=true;product.variants.damp.visible=false;product.variants.dry.visible=true;
      product.object.scale.set(1,1,1);
      const abovePick=pickup.clone();abovePick.y=CARRY_HEIGHT;
      const aboveStack=stack.clone();aboveStack.y=CARRY_HEIGHT;
      const place=stack.clone();place.y=deckHeight+(status.stackCount+1)*THICKNESS;
      let previous=toolPoint.clone();
      const move=(phase,to,speed=1.1,done)=>{
        const distance=previous.distanceTo(to);
        // Quintic moves keep the faster demonstration cycle eased at each stop.
        const duration=Math.max(.12,1.875*distance/(speed*3.3),Math.sqrt(5.78*distance/14));
        const step={phase,to:to.clone(),duration,done};previous=to.clone();return step;
      };
      const dwell=(phase,duration,done)=>({phase,to:previous.clone(),duration,done});
      steps=[
        move('approaching',outsidePick,1.7),move('approaching',abovePick,1.7),
        move('lowering',pickup,.65),dwell('vacuum-check',.2,()=>{status.vacuum=true;}),
        move('lifting',abovePick,.8,()=>onPickupClear()),
        move('carrying',outsidePick),move('carrying',outsideStack),move('carrying',aboveStack),
        move('placing',place,.55),
        dwell('releasing',.15,()=>{
          // Replace only at the identical, supported pose. The same thickness,
          // colour and outline keep the visible board stationary at handoff.
          layers[status.stackCount].visible=true;
          counts[status.stackCount].visible=false;
          counts[++status.stackCount].visible=true;
          fill.scale.x=Math.max(.001,status.stackCount/CAPACITY);fill.visible=status.stackCount>0;
          status.vacuum=false;
          held.object.visible=false;held.palletizing=false;held=null;
        }),
        move('retracting',aboveStack,1.4),move('returning',outsideStack,1.7),
      ];
      stepIndex=0;elapsed=0;from.copy(toolPoint);status.phase=steps[0].phase;pose();return true;
    }
    function update(dt){
      while(dt>0&&steps.length){
        const step=steps[stepIndex],advance=Math.min(dt,step.duration-elapsed);
        elapsed+=advance;dt-=advance;toolPoint.copy(from).lerp(step.to,smooth(Math.min(1,elapsed/step.duration)));
        pose();
        if(elapsed+1e-9<step.duration)break;
        toolPoint.copy(step.to);step.done?.();elapsed=0;from.copy(toolPoint);
        if(++stepIndex===steps.length){steps=[];status.phase=status.stackCount===CAPACITY?'pallet-full':'waiting';}
        else status.phase=steps[stepIndex].phase;
      }
      pose();
    }
    pose();
    return {accept,update,status,robot,pallet,layers};
  }
  const arms=[
    buildArm({id:1,basePlan:PALLET_ROBOT_BASE,stackPlan:BOARD_PALLET_OUT,outsideX:px+2.7}),
    buildArm({id:2,basePlan:[px-3.5,0,pz-3],stackPlan:[px-3.8,.27,pz-5.2],outsideX:px-3.2}),
  ];
  const status={phase:'waiting',stackCount:0,capacity:CAPACITY*arms.length};
  let nextArm=0;
  function accept(product,cycle){
    for(let i=0;i<arms.length;i++){
      const index=(nextArm+i)%arms.length;
      if(arms[index].accept(product,cycle)){nextArm=(index+1)%arms.length;return true;}
    }
    return false;
  }
  function update(dt){
    arms.forEach(arm=>arm.update(dt));
    status.stackCount=arms.reduce((sum,arm)=>sum+arm.status.stackCount,0);
    status.phase=arms.some(arm=>arm.status.phase!=='waiting'&&arm.status.phase!=='pallet-full')?'working':status.stackCount===status.capacity?'pallet-full':'waiting';
    ready.color.set(status.stackCount===status.capacity?'#efa63c':arms.some(arm=>arm.status.vacuum)?'#38b783':'#66818c');
  }
  return {accept,update,status,arms};
}
