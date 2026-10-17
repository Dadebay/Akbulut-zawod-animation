import * as T from 'three';

const smooth=t=>t*t*(3-2*t);
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

// Travel to the centre of a transfer table, stop, rotate, then continue.
// The same corner positions drive both the machinery and the product pose.
export function conveyorMotion(points,{speed=8,turnTime=.7,startHold=0}={}){
  const actions=[],turns=[];let duration=0;
  const add=action=>{action.start=duration;duration+=action.duration;actions.push(action);return action;};
  if(startHold){const a=new T.Vector3(...points[0]),d=new T.Vector3(...points[1]).sub(a);add({a,b:a,yaw:-Math.atan2(d.z,d.x),duration:startHold});}
  for(let i=1;i<points.length;i++){
    const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),d=b.clone().sub(a);
    const yaw=-Math.atan2(d.z,d.x);add({a,b,yaw,duration:d.length()/speed});
    if(i<points.length-1){
      const c=new T.Vector3(...points[i+1]).sub(b),to=-Math.atan2(c.z,c.x);
      if(Math.abs(angleDelta(yaw,to))>.01)turns.push(add({a:b,b,yaw,to,duration:turnTime,turn:true}));
    }
  }
  function pose(time,position){
    const action=actions.find(a=>time<=a.start+a.duration)||actions.at(-1),t=T.MathUtils.clamp((time-action.start)/action.duration,0,1);
    position.copy(action.a).lerp(action.b,t);
    return action.turn?action.yaw+angleDelta(action.yaw,action.to)*smooth(t):action.yaw;
  }
  return {duration,turns,pose};
}

export function transferTable(k,corner,{parent,size=3,top=1.175}={}){
  const {box,cyl,group,m}=k,g=group(corner.a.toArray(),parent);g.position.y=0;
  const half=size/2;
  for(const x of [-half+.18,half-.18])for(const z of [-half+.18,half-.18]){
    box(.13,top-.2,.13,[x,(top-.2)/2,z],m.dark,g);box(.3,.06,.3,[x,.03,z],m.steel,g);
  }
  box(size,.15,size,[0,top-.3,0],m.blue,g);
  const deck=group([0,0,0],g,true),radius=half-.07;
  const bearing=cyl(radius,.09,[0,top-.16,0],m.steel,deck,undefined,k.tablet?20:40);
  for(let x=-radius+.15;x<radius;x+=.26){
    const length=2*Math.sqrt(Math.max(0,radius*radius-x*x));
    const roller=cyl(.065,length,[x,top-.065,0],m.steel,deck,undefined,10);roller.rotation.x=Math.PI/2;
  }
  // Only the unused edges get guards; entry and exit remain unobstructed.
  const incoming=new T.Vector3(Math.cos(corner.yaw),0,-Math.sin(corner.yaw)),outgoing=new T.Vector3(Math.cos(corner.to),0,-Math.sin(corner.to));
  for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const normal=new T.Vector3(x,0,z);
    if(normal.dot(incoming)<-.9||normal.dot(outgoing)>.9)continue;
    box(z?size:.10,.18,x?size:.10,[x*half,top+.05,z*half],m.blue,g);
  }
  for(const x of [-.6,.6])box(.3,.14,.45,[x,.35,0],m.dark,g);
  box(.65,.3,.4,[half-.3,.45,half-.35],m.white,g,.035);
  return {update(elapsed,interval){
    const phase=((elapsed-corner.start)%interval+interval)%interval,hold=corner.duration+.48;
    let angle=corner.yaw;
    if(phase<corner.duration)angle+=angleDelta(corner.yaw,corner.to)*smooth(phase/corner.duration);
    else if(phase<hold)angle=corner.to;
    else if(phase<interval-.48)angle=corner.to+angleDelta(corner.to,corner.yaw)*smooth((phase-hold)/(interval-.48-hold));
    deck.rotation.y=angle;
  }};
}
