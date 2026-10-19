import * as T from 'three';
import {OUTER_RAIL_Z as z,outerRailPath} from './siteLayout.js';
export const RAIL_CROSSINGS=[-143,-205];
export const RAIL_CROSSING_POSTS=RAIL_CROSSINGS.flatMap(x=>[-1,1].map(side=>({x:x+side*5.4,z:z+side*5,side})));

export function buildOuterRail(k){
  const {box,cyl,rod,material,m}=k,ballast=material('#8f897c',0,1),steel=material('#8a8b86',.78,.4),tie=material('#b1b0a4',0,.96),dark=material('#545751',.6,.7);
  // The outer boundary is a railway embankment, not another asphalt road.
  const path=outerRailPath(),length=path.getLength(),segments=420;
  function strip(width,y,mat){const pts=[],indices=[];for(let i=0;i<=segments;i++){const p=path.getPointAt(i/segments),t=path.getTangentAt(i/segments),n=new T.Vector3(-t.z,0,t.x).normalize();for(const side of [-1,1]){const q=p.clone().addScaledVector(n,width*side/2);pts.push(q.x,q.y+y,q.z);}if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setIndex(indices);geo.computeVertexNormals();k.mesh(geo,mat).castShadow=false;}
  strip(6.8,-.03,material('#aaa18f',0,1));strip(4.3,.10,ballast);
  const count=Math.floor(length/.7),sleepers=k.instances(new T.BoxGeometry(.24,.15,2.65),tie,count),fasteners=k.instances(new T.BoxGeometry(.32,.045,.27),dark,count*2),o=new T.Object3D();
  for(let i=0;i<count;i++){const p=path.getPointAt(i/(count-1)),t=path.getTangentAt(i/(count-1)),n=new T.Vector3(-t.z,0,t.x).normalize();o.position.copy(p);o.position.y+=.19;o.rotation.set(0,-Math.atan2(t.z,t.x),Math.atan2(t.y,Math.hypot(t.x,t.z)));o.updateMatrix();sleepers.setMatrixAt(i,o.matrix);for(const side of [-1,1]){o.position.copy(p).addScaledVector(n,side*.76);o.position.y+=.29;o.updateMatrix();fasteners.setMatrixAt(i*2+(side+1)/2,o.matrix);}}
  sleepers.instanceMatrix.needsUpdate=true;fasteners.instanceMatrix.needsUpdate=true;
  for(let i=0;i<segments;i++){const a=path.getPointAt(i/segments),b=path.getPointAt((i+1)/segments),dir=b.clone().sub(a),mid=a.clone().lerp(b,.5),normal=new T.Vector3(-dir.z,0,dir.x).normalize();for(const side of [-1,1])for(const [y,h,w,mat] of [[.285,.035,.16,dark],[.34,.075,.055,dark],[.3775,.065,.075,steel]]){const p=mid.clone().addScaledVector(normal,side*.76);p.y+=y;const rail=box(dir.length()+.02,h,w,p.toArray(),mat);rail.rotation.set(0,-Math.atan2(dir.z,dir.x),Math.atan2(dir.y,Math.hypot(dir.x,dir.z)));}}
  const stones=k.instances(new T.DodecahedronGeometry(1,0),ballast,k.tablet?1600:4200);let seed=819;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<stones.count;i++){const progress=.4+rnd()*.5,p=path.getPointAt(progress),t=path.getTangentAt(progress),normal=new T.Vector3(-t.z,0,t.x).normalize();o.position.copy(p).addScaledVector(normal,(rnd()>.5?1:-1)*(1.25+rnd()*.9));o.position.y+=.14;o.rotation.set(rnd()*3,rnd()*3,rnd()*3);const s=.05+rnd()*.07;o.scale.set(s,s*.55,s);o.updateMatrix();stones.setMatrixAt(i,o.matrix);}stones.instanceMatrix.needsUpdate=true;stones.userData.detailDistance=110;
  // Road crossing panels stay flush with the running surfaces.
  for(const crossingX of RAIL_CROSSINGS){box(10,.19,1.30,[crossingX,.30,z],dark);for(const dz of [-1.32,1.32])box(10,.19,.85,[crossingX,.30,z+dz],dark);}
  for(const {x,z:postZ,side} of RAIL_CROSSING_POSTS){
    cyl(.07,3.6,[x,1.8,postZ],m.white);
    for(const [angle,mat] of [[.7,m.red],[-.7,m.white]]){const sign=box(.11,1.4,.09,[x,3.3,postZ],mat);sign.rotation.z=angle;}
    box(.42,1.1,.45,[x,.55,postZ],m.steel);
    const arm=k.group([x,1.15,postZ]);arm.rotation.z=-side*1.35;
    box(4.8,.13,.12,[-side*2.4,0,0],m.white,arm);
    for(let a=.4;a<4.8;a+=.8)box(.28,.14,.13,[-side*a,0,0],m.red,arm);
  }
  // Keep the drainage outside; the poles stand between the fence and the left rail shoulder.
  box(260,.08,1.6,[-30,-.3,z+5.8],material('#7f7b70',0,1));for(const dz of [-.85,.85])box(260,.3,.15,[-30,-.1,z+5.8+dz],tie);
  const poleZ=41.9;
  for(let x=-160;x<100;x+=36){cyl(.12,10,[x,5,poleZ],tie,k.scene,.08,10);box(.14,.18,2.6,[x,9.3,poleZ],dark);for(const dz of [-1,0,1]){cyl(.09,.23,[x,9.5,poleZ+dz],m.white);if(x<64)rod([x,9.6,poleZ+dz],[x+36,9.6,poleZ+dz],.014,dark);}}
}
