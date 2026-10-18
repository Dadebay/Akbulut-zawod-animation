import * as T from 'three';
import {RAW_YARD,RAW_YARD_APRON,RAW_YARD_CONVEYOR,RAW_STOCK} from './siteLayout.js';

// The existing wall and living/service buildings define the left edge.
// Only the exterior ground on their right is replaced by the reference apron.
export function buildRawYard(k){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const concrete=material('#bec1bf',0,.96),joint=material('#d8dad6',0,.96);
  const steel=material('#73797b',.50,.68),dark=material('#303538',.40,.76);
  const rubber=material('#202426',0,.97),yellow=material('#b38d32',.28,.70);
  const apron=RAW_YARD_APRON;
  const width=apron.east-apron.west,depth=apron.south-apron.north;
  box(width,.20,depth,[(apron.west+apron.east)/2,-.02,(apron.north+apron.south)/2],concrete).castShadow=false;
  // Large flush concrete panels, with fine pale expansion joints.
  for(let x=apron.west+5.5;x<apron.east;x+=5.5)
    box(.035,.006,depth,[x,.084,(apron.north+apron.south)/2],joint).castShadow=false;
  for(let z=apron.north+5.5;z<apron.south;z+=5.5)
    box(width,.006,.035,[(apron.west+apron.east)/2,.084,z],joint).castShadow=false;

  // A low transfer pit and angular covered hopper sit at the far end.
  const {x:unitX,z:unitZ}=RAW_YARD_CONVEYOR;
  const unit=group([unitX,0,unitZ]);unit.name='exterior-yard-conveyors';
  box(10,.17,8,[0,.115,0],concrete,unit);
  box(7.6,.12,5.8,[0,.255,0],dark,unit);
  for(const x of [-3.85,3.85])box(.16,.20,6,[x,.33,0],steel,unit);
  for(const z of [-3,3])box(7.8,.20,.16,[0,.33,z],steel,unit);
  box(3.3,1.45,3.4,[0,1.10,-.9],dark,unit);
  box(2.5,.12,2.7,[0,1.89,-.9],steel,unit);
  for(const x of [-2.3,2.3]){
    box(1.15,.65,1.65,[x,.70,.9],steel,unit);
    box(.85,.12,1.25,[x,1.09,.9],dark,unit);
    for(let z=.4;z<1.6;z+=.22)box(.83,.035,.06,[x,1.17,z],m.steel,unit);
  }
  // Wedge-shaped feeder housing with a dark open mouth towards the pit.
  const profile=[[-13,.2],[-13,1.25],[-6,4.0],[-3.8,3.1],[-3.8,.2]];
  const vertices=[],indices=[],count=profile.length;
  for(const x of [-2.8,2.8])for(const [z,y] of profile)vertices.push(x,y,z);
  for(let i=0;i<count;i++){
    const j=(i+1)%count;indices.push(i,j,count+j,i,count+j,count+i);
  }
  for(let i=1;i<count-1;i++)indices.push(0,i+1,i,count,count+i,count+i+1);
  const hood=new T.BufferGeometry();hood.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hood.setIndex(indices);hood.computeVertexNormals();
  mesh(hood,material('#969c9d',.38,.72,{side:T.DoubleSide}),[0,0,0],unit);
  box(4.7,2.48,.055,[0,1.56,-3.76],rubber,unit);
  box(3.1,.22,2.5,[0,.54,-2.7],dark,unit);
  k.motor([2.2,.54,-1.8],unit,.85);

  function conveyor(start,end,w=1.35){
    const a=new T.Vector3(...start),b=new T.Vector3(...end),delta=b.clone().sub(a),length=delta.length();
    const g=group(a.clone().lerp(b,.5).toArray());
    g.rotation.set(0,-Math.atan2(delta.z,delta.x),0);
    g.rotateZ(Math.atan2(delta.y,Math.hypot(delta.x,delta.z)));
    box(length,.10,w,[0,0,0],rubber,g);
    for(const side of [-1,1]){
      box(length,.23,.095,[0,-.10,side*(w/2+.06)],dark,g);
      box(length,.065,.075,[0,.08,side*(w/2+.07)],yellow,g);
    }
    for(let x=-length/2+.4;x<length/2;x+=1.1){
      const roller=cyl(.075,w+.12,[x,-.09,0],steel,g);roller.rotation.x=Math.PI/2;
    }
    const normal=new T.Vector3(-delta.z,0,delta.x).normalize().multiplyScalar(w/2+.04);
    for(const t of [.22,.55,.88]){
      const p=a.clone().lerp(b,t);
      for(const side of [-1,1]){
        const x=p.x+normal.x*side,z=p.z+normal.z*side;
        box(.45,.12,.45,[x,.10,z],concrete);
        rod([x,.16,z],[x,p.y-.2,z],.05,dark);
      }
    }
  }
  conveyor([unitX,.65,unitZ-3.5],[unitX,1.05,unitZ-.5]);
  conveyor([unitX-2,1.0,unitZ+1],[apron.west+3,3.6,unitZ+2]);
  // Feed the back of the heap, keeping the truck's unloading side clear.
  conveyor([unitX+2,1.0,unitZ+1],[RAW_STOCK[0],2.65,RAW_STOCK[2]-2.5]);
  // The single pile is supplied by the existing delivery animation.
  const [pileX,,pileZ]=RAW_STOCK;
  for(const z of [pileZ-3.4,pileZ+3.4])box(7.5,1.4,.22,[pileX+2,.70,z],steel);
  box(.22,1.4,7,[pileX+5.75,.70,pileZ],steel);
  // Short dark crossing approach connects the concrete edge to the railway.
  const crossingX=apron.west+4.3;
  box(7,.13,3.8,[crossingX,.04,apron.south-.6],m.road).castShadow=false;
  return {bounds:RAW_YARD};
}
