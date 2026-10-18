import * as T from 'three';
import {BOARD_END,BOARD_PALLET_OUT,PALLET_ROBOT_BASE,localPoint} from './processPlan.js';

// A material-triggered pick/place cycle. Coordinates describe the bottom of the
// vacuum cups; both the wrist and the carried board are solved from that point.
const BOARD_BOTTOM=.005,BOARD_TOP=.035,THICKNESS=.03;
const SHOULDER_HEIGHT=1.5,UPPER_ARM=2.75,FOREARM=2.75,TOOL_DROP=.7;
const CARRY_HEIGHT=2.35,CAPACITY=24;
const smooth=t=>t*t*t*(10+t*(-15+6*t));

export function buildPalletizingCell(k,{root,equipment,onPickupClear}){
  const {m,group,box,cyl,rod,pipe,material}=k;
  const base=new T.Vector3(...localPoint(PALLET_ROBOT_BASE));
  const pickup=new T.Vector3(...localPoint(BOARD_END));pickup.y+=BOARD_TOP;
  const stack=new T.Vector3(...localPoint(BOARD_PALLET_OUT));
  const deckHeight=BOARD_PALLET_OUT[1]+.21;
  // Leave the portal through its open east side before turning toward the
  // pallet. A diagonal move would sweep the sheet through the front post.
  // Keep the wrist east of the base while turning, so the folded elbow also
  // stays clear of the portal (not just the carried sheet).
  const outsidePick=new T.Vector3(2-8,CARRY_HEIGHT,pickup.z);
  const outsideStack=new T.Vector3(2-8,CARRY_HEIGHT,stack.z);
  const toolPoint=outsideStack.clone();
  const robot=group(base.toArray(),root);
  robot.name='GP-product-driven-robot';
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
  const vacuum=material('#657a83',.15,.4,{emissive:'#214b39',emissiveIntensity:0});
  cyl(.045,.09,[.83,-.31,.36],vacuum,levelTool);
  k.cabinet([1.6,0,1.9],robot);
  // The shared robot/receiver enclosure has no fence through the transfer path.
  equipment.fence(8,2.25,localPoint([4.6,.25,-30.5]),root,Math.PI/2);
  equipment.fence(6.1,2.25,localPoint([1.55,.25,-26.4]),root);
  equipment.fence(5.6,2.25,localPoint([1.8,.25,-34.6]),root);

  // Open roller receiver: photoelectric stop and low guides, no roof or fake
  // stack occupying the board's pickup volume.
  const receiver=group(localPoint([BOARD_END[0],0,BOARD_END[2]]),root);
  for(const z of [-.72,.72]){
    box(2.8,.10,.055,[0,1.235,z],equipment.blue,receiver);
    box(.14,.16,.12,[.85,1.27,z],equipment.cast,receiver);
  }
  box(.07,.11,1.35,[1.25,1.235,0],m.rubber,receiver);
  const ready=material('#66818c',.1,.3,{emissive:'#183b27',emissiveIntensity:0});
  cyl(.055,.1,[1.25,1.40,.82],ready,receiver);

  // One empty pallet is filled by actual arrivals. A full pallet waits for
  // collection; it never resets or disappears to fabricate more capacity.
  const pallet=group(stack.toArray(),root);
  for(const z of [-.53,0,.53])box(2.6,.10,.16,[0,.05,z],m.wood,pallet);
  for(const x of [-1.15,-.58,0,.58,1.15])box(.18,.12,1.35,[x,.15,0],m.wood,pallet);
  const layers=Array.from({length:CAPACITY},(_,i)=>{
    const layer=group([stack.x,deckHeight-BOARD_BOTTOM+i*THICKNESS,stack.z],root,true);
    box(2.4,THICKNESS,1.2,[0,.02,0],m.paper,layer,.006);
    box(2.4,.001,.025,[0,.0345,.59],m.blueLight,layer);
    layer.visible=false;return layer;
  });
  const status={phase:'waiting',vacuum:false,stackCount:0,capacity:CAPACITY};
  robot.userData.palletizing=status;
  let held=null,steps=[],stepIndex=0,elapsed=0,from=toolPoint.clone();

  function pose(){
    const dx=toolPoint.x-base.x,dz=toolPoint.z-base.z;
    const radius=Math.hypot(dx,dz),height=toolPoint.y+TOOL_DROP-SHOULDER_HEIGHT;
    const cosine=(radius*radius+height*height-UPPER_ARM**2-FOREARM**2)/(2*UPPER_ARM*FOREARM);
    // Never stretch links to reach an impossible target.
    if(cosine>1+1e-7||cosine< -1-1e-7)throw new Error('GP palletizing target is outside robot reach');
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
    ready.color.set(status.stackCount===CAPACITY?'#efa63c':held?'#38b783':'#66818c');
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
      // Quintic time law: zero endpoint velocity/acceleration; these bounds
      // limit its peak speed and acceleration, including a slow final approach.
      const duration=Math.max(.3,1.875*distance/speed,Math.sqrt(5.78*distance/1.5));
      const step={phase,to:to.clone(),duration,done};previous=to.clone();return step;
    };
    const dwell=(phase,duration,done)=>({phase,to:previous.clone(),duration,done});
    steps=[
      move('approaching',outsidePick,1.7),move('approaching',abovePick,1.7),
      move('lowering',pickup,.65),dwell('vacuum-check',.35,()=>{status.vacuum=true;}),
      move('lifting',abovePick,.8,()=>onPickupClear()),
      move('carrying',outsidePick),move('carrying',outsideStack),move('carrying',aboveStack),
      move('placing',place,.55),
      dwell('releasing',.25,()=>{
        // Replace only at the identical, supported pose. The same thickness,
        // colour and outline keep the visible board stationary at handoff.
        layers[status.stackCount++].visible=true;status.vacuum=false;
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
  return {accept,update,status};
}
