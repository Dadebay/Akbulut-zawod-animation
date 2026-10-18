import * as T from 'three';
import {RAW_YARD,RAW_YARD_APRON,RAW_YARD_CONVEYOR,RAW_STOCK,OLD_RAW_SILOS} from './siteLayout.js';

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
  // The photographed receiving area has two slender white silos west of the
  // transfer equipment, aligned side by side near the railway.
  const siloWhite=material('#e5e9e7',.06,.78);
  const siloBand=material('#c2cac9',.30,.66);
  const siloCap=material('#f0f2ef',.08,.72);
  const siloFrame=material('#748082',.44,.66);
  const brandCanvas=document.createElement('canvas');
  brandCanvas.width=2048;brandCanvas.height=256;
  const brandContext=brandCanvas.getContext('2d');
  brandContext.fillStyle='#1e292d';brandContext.fillRect(0,0,2048,256);
  brandContext.fillStyle='#ffffff';brandContext.font='700 104px Arial';
  brandContext.textAlign='center';brandContext.textBaseline='middle';
  for(let i=0;i<4;i++)brandContext.fillText('AKBULUT',256+i*512,132,465);
  const brandMap=k.trackTexture(new T.CanvasTexture(brandCanvas));brandMap.colorSpace=T.SRGBColorSpace;
  const siloBrand=material('#ffffff',.08,.68,{map:brandMap});
  function receivingSilo(x,z,bodyHeight){
    const g=group([x,0,z]);g.name='old-yard-receiving-silo';
    cyl(2.05,.20,[0,.18,0],concrete,g,2.05,32);
    const bodyBottom=3.0,bodyTop=bodyBottom+bodyHeight,radius=1.32;
    for(const sx of [-.86,.86])for(const sz of [-.86,.86]){
      box(.16,2.70,.16,[sx,1.60,sz],siloFrame,g);
      box(.34,.17,.34,[sx,.34,sz],steel,g);
    }
    for(const side of [-1,1]){
      rod([-1.05,.55,side*.86],[1.05,2.84,side*.86],.047,siloFrame,g);
      rod([side*.86,.55,-1.05],[side*.86,2.84,1.05],.047,siloFrame,g);
    }
    cyl(.30,1.48,[0,2.27,0],siloWhite,g,radius,32);
    cyl(.29,.52,[0,1.32,0],siloFrame,g,.29,24);
    cyl(radius,bodyHeight,[0,(bodyBottom+bodyTop)/2,0],siloWhite,g,radius,32);
    for(const y of [bodyBottom+.18,bodyTop-.18])
      cyl(radius+.018,.075,[0,y,0],siloBand,g,radius+.018,32);
    // A shallow cylindrical lid leaves a clean, level top on both vessels.
    cyl(radius+.08,.20,[0,bodyTop+.08,0],siloCap,g,radius+.08,32);
    const brandY=bodyTop-1.25;
    const brand=cyl(radius+.025,.72,[0,brandY,0],siloBrand,g,radius+.025,64);
    brand.rotation.y=-Math.PI/4;
    // A slim fixed ladder and service rail make the vessels legible up close.
    for(const sx of [-.23,.23])rod([sx,2.98,radius+.12],[sx,bodyTop-.15,radius+.12],.027,siloFrame,g);
    for(let y=3.25;y<bodyTop-.2;y+=.36)
      rod([-.23,y,radius+.14],[.23,y,radius+.14],.022,siloFrame,g);
    cyl(.27,.15,[0,1.01,0],siloFrame,g,.27,24);
    return g;
  }
  // Keep both vessels on the same line; turn the right-hand vessel's ladder
  // and service face toward the transfer conveyor.
  receivingSilo(OLD_RAW_SILOS.x-3.8,OLD_RAW_SILOS.z,8.4);
  const rightSilo=receivingSilo(OLD_RAW_SILOS.x+3.8,OLD_RAW_SILOS.z,8.4);
  rightSilo.rotation.y=Math.atan2(unitX-rightSilo.position.x,unitZ-rightSilo.position.z);
  // The single pile is supplied by the existing delivery animation.
  const [pileX,,pileZ]=RAW_STOCK;
  for(const z of [pileZ-3.4,pileZ+3.4])box(7.5,1.4,.22,[pileX+2,.70,z],steel);
  box(.22,1.4,7,[pileX+5.75,.70,pileZ],steel);
  // Short dark crossing approach connects the concrete edge to the railway.
  const crossingX=apron.west+4.3;
  box(7,.13,3.8,[crossingX,.04,apron.south-.6],m.road).castShadow=false;
  return {bounds:RAW_YARD};
}
