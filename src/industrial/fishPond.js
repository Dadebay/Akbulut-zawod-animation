import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {POND} from './siteLayout.js';

export function buildFishPond(k){
  const {box,cyl,rod,mesh,group,material,m,textPlate}=k,{x,z,width:w,depth:d}=POND;
  const concrete=material('#bab9a8',0,.92),bank=material('#d2d0bd',0,.86),water=material('#74745a',.08,.47,{transparent:true,opacity:.86}),nursery=material('#566b57',.08,.43,{transparent:true,opacity:.85});
  // Concrete-lined earth reservoir: sloping sides, perimeter access and a
  // smaller nursery cell in one corner, matching the second aerial photograph.
  box(w+5,.14,d+5,[x,-.16,z],material('#9f9b87',0,1));
  box(w,.15,d,[x,-.08,z],concrete);
  const west=x-w/2,east=x+w/2,north=z-d/2,south=z+d/2;
  const banks=[[[west,.75,north],[east,.75,north],[east-2,-.25,north+2],[west+2,-.25,north+2]],[[east,.75,north],[east,.75,south],[east-2,-.25,south-2],[east-2,-.25,north+2]],[[east,.75,south],[west,.75,south],[west+2,-.25,south-2],[east-2,-.25,south-2]],[[west,.75,south],[west,.75,north],[west+2,-.25,north+2],[west+2,-.25,south-2]]];
  for(const points of banks){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();const face=mesh(geo,bank);face.material.side=T.DoubleSide;}
  for(const zz of [north,south]){box(w+.6,.25,.6,[x,.78,zz],bank);for(let xx=west;xx<=east;xx+=2.5)box(.035,.4,.63,[xx,.52,zz],concrete);}
  for(const xx of [west,east]){box(.6,.25,d,[xx,.78,z],bank);for(let zz=north;zz<=south;zz+=2.5)box(.63,.4,.035,[xx,.52,zz],concrete);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=k.tablet?128:256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#858575';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<100;i++){ctx.strokeStyle=i%2?'#9c9c8c':'#747465';ctx.lineWidth=.6;ctx.beginPath();const yy=i*canvas.height/100;ctx.moveTo(0,yy);for(let xx=0;xx<=canvas.width;xx+=8)ctx.lineTo(xx,yy+Math.sin(xx*.14+i)*1.2);ctx.stroke();}
  const ripple=k.trackTexture(new T.CanvasTexture(canvas));ripple.wrapS=ripple.wrapT=T.RepeatWrapping;ripple.repeat.set(6,8);water.bumpMap=nursery.bumpMap=ripple;water.bumpScale=nursery.bumpScale=.035;
  const waterY=.23;
  const mainWater=box(w-4,.025,d-4,[x,waterY,z],water);mainWater.castShadow=false;
  const nurseryX=east-9,nurseryZ=north+11;
  box(14,.035,18,[nurseryX,waterY+.018,nurseryZ],nursery).castShadow=false;
  box(.25,.85,20,[east-16,.34,north+12],bank);box(16,.85,.25,[east-8,.34,north+22],bank);
  // Inlet/outlet sluices, screened pipes and a small pump hut on the bank.
  const hut=group([east-4,0,north-3]);box(5,2.6,3.5,[0,1.3,0],m.white,hut);box(5.4,.16,3.9,[0,2.7,0],m.blue,hut);box(1,1.9,.04,[0,.95,1.77],m.dark,hut);
  for(const xx of [east-5,west+7]){rod([xx,1.2,north-2],[xx,.4,north+3],.16,m.steel);box(1.2,.7,1,[xx,.18,north+2.5],m.dark);}
  for(const [xx,zz] of [[west+5,south],[east-2,north+10]]){box(1.8,1.1,.5,[xx,.5,zz],concrete);for(let dx=-.7;dx<.8;dx+=.2)rod([xx+dx,.2,zz+.3],[xx+dx,1.05,zz+.3],.025,m.dark);}
  // Narrow service deck and aeration equipment make the fish-farm use legible.
  box(2.2,.18,10,[west+6,.9,south-3],m.wood);
  for(const xx of [west+5,west+7])for(const zz of [south-7,south+1]){cyl(.07,2,[xx,.2,zz],m.steel);rod([xx,.95,zz],[xx,1.9,zz],.025,m.steel);}
  const bubbles=[];
  for(const [xx,zz] of [[x-6,z+5],[x+7,z+15]]){
    for(const dx of [-1.3,1.3]){const float=box(2.8,.25,.5,[xx+dx,.48,zz],m.blue);float.castShadow=false;}
    rod([xx-2,.6,zz],[xx+2,.6,zz],.08,m.steel);box(.7,.5,.7,[xx,.8,zz],m.white);
    for(let i=0;i<4;i++){const g=group([xx,.29,zz],k.scene,true);const ring=mesh(new T.RingGeometry(.65,.69,24),material('#c6d0ba',0,.5,{transparent:true,opacity:.28,side:T.DoubleSide}),[0,0,0],g);ring.rotation.x=-Math.PI/2;ring.castShadow=false;bubbles.push({g,offset:i/4});}
  }
  const body=new T.SphereGeometry(1,8,5);body.scale(.36,.07,.10);
  const tail=new T.BufferGeometry();tail.setAttribute('position',new T.Float32BufferAttribute([-.28,0,0,-.52,0,-.16,-.52,0,.16],3));tail.computeVertexNormals();tail.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1],2));
  const fishBody=body.toNonIndexed(),fishGeometry=mergeGeometries([fishBody,tail]),fish=k.instances(fishGeometry,material('#363b2e',0,.9,{side:T.DoubleSide}),48);fish.castShadow=false;
  body.dispose();fishBody.dispose();tail.dispose();const dummy=new T.Object3D();
  function update(time){
    for(let i=0;i<fish.count;i++){const a=i*2.399+time*.08,small=i<12,cx=small?nurseryX:x-4,cz=small?nurseryZ:z+10,rx=small?4:11,rz=small?6:10;dummy.position.set(cx+Math.cos(a)*(rx+(i%3)*.5),.18,cz+Math.sin(a)*rz);dummy.rotation.y=-Math.atan2(Math.cos(a)*rz,-Math.sin(a)*rx);dummy.scale.setScalar(.9+(i%4)*.2);dummy.updateMatrix();fish.setMatrixAt(i,dummy.matrix);}fish.instanceMatrix.needsUpdate=true;
    bubbles.forEach(({g,offset})=>{const scale=.5+((time*.22+offset)%1)*2.2;g.scale.set(scale,1,scale);});
  }
  update(0);textPlate('BALYKÇYLYK',6,.7,[west+5,1.7,south+2],k.scene,'#204f58','#e5e4d6');
  return {update};
}
