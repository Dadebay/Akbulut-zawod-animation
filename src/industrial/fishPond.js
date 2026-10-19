import * as T from 'three';
import {POND} from './siteLayout.js';

export function buildFishPond(k){
  const {box,cyl,rod,mesh,group,material,m,textPlate}=k,{x,z,width:w,depth:d}=POND;
  const concrete=material('#bab9a8',0,.92),bank=material('#d2d0bd',0,.86),water=material('#2498c3',.06,.23,{unique:true,transparent:true,opacity:.48,depthWrite:false}),nursery=material('#45a9d0',.04,.27,{unique:true,transparent:true,opacity:.32,depthWrite:false});
  // Concrete-lined earth reservoir: sloping sides, perimeter access and a
  // smaller nursery cell in one corner, matching the second aerial photograph.
  box(w+5,.14,d+5,[x,-.16,z],material('#9f9b87',0,1));
  box(w,.15,d,[x,-.08,z],material('#648f9b',0,.96));
  const west=x-w/2,east=x+w/2,north=z-d/2,south=z+d/2;
  // Gravel surrounds the outside of the concrete rim, at a consistent scale.
  const gravelStrips=[
    [west-2.5,east+2.5,north-2.5,north-.3],
    [west-2.5,east+2.5,south+.3,south+2.5],
    [west-2.5,west-.3,north-.3,south+.3],
    [east+.3,east+2.5,north-.3,south+.3]
  ];
  let gravelSeed=317;
  const gravelRandom=()=>{gravelSeed=(1664525*gravelSeed+1013904223)>>>0;return gravelSeed/4294967296;};
  const gravelCanvas=document.createElement('canvas');gravelCanvas.width=gravelCanvas.height=256;
  const gravelContext=gravelCanvas.getContext('2d'),gravelColors=['#aaa99f','#c2bfb4','#d0cec5','#999b95','#babbb5'];
  gravelContext.fillStyle='#8c8d85';gravelContext.fillRect(0,0,256,256);
  for(let i=0;i<1100;i++){
    const px=gravelRandom()*256,py=gravelRandom()*256,rx=2+gravelRandom()*4,ry=rx*(.55+gravelRandom()*.4),angle=gravelRandom()*Math.PI;
    gravelContext.fillStyle=gravelColors[i%gravelColors.length];gravelContext.strokeStyle='#7e8078';gravelContext.lineWidth=.6;
    for(const dx of [-256,0,256])for(const dy of [-256,0,256]){
      if(px+dx+rx<0||px+dx-rx>256||py+dy+rx<0||py+dy-rx>256)continue;
      gravelContext.beginPath();gravelContext.ellipse(px+dx,py+dy,rx,ry,angle,0,Math.PI*2);gravelContext.fill();gravelContext.stroke();
    }
  }
  const gravelMap=k.trackTexture(new T.CanvasTexture(gravelCanvas));gravelMap.wrapS=gravelMap.wrapT=T.RepeatWrapping;gravelMap.colorSpace=T.SRGBColorSpace;
  const gravel=material('#ffffff',0,1,{map:gravelMap,bumpMap:gravelMap,bumpScale:.025});
  const gravelPositions=[],gravelUvs=[],gravelIndices=[];
  for(const [a,b,c,e] of gravelStrips){
    const base=gravelPositions.length/3;
    for(const [xx,zz] of [[a,c],[b,c],[b,e],[a,e]]){gravelPositions.push(xx,.015,zz);gravelUvs.push(xx/3,zz/3);}
    gravelIndices.push(base,base+2,base+1,base,base+3,base+2);
  }
  const gravelGeometry=new T.BufferGeometry();gravelGeometry.setAttribute('position',new T.Float32BufferAttribute(gravelPositions,3));gravelGeometry.setAttribute('uv',new T.Float32BufferAttribute(gravelUvs,2));gravelGeometry.setIndex(gravelIndices);gravelGeometry.computeVertexNormals();
  const gravelBed=mesh(gravelGeometry,gravel);gravelBed.name='pond-exterior-gravel';gravelBed.castShadow=false;
  const pebbleCount=k.tablet?2000:6000,pebbles=k.instances(new T.IcosahedronGeometry(1,0),material('#ffffff',0,1),pebbleCount),pebblePose=new T.Object3D();
  const pebbleTints=gravelColors.map(color=>new T.Color(color)),stripAreas=gravelStrips.map(([a,b,c,e])=>(b-a)*(e-c)),gravelArea=stripAreas.reduce((sum,area)=>sum+area,0);
  for(let i=0;i<pebbleCount;){
    let area=gravelRandom()*gravelArea,strip=0;
    while(strip<stripAreas.length-1&&area>stripAreas[strip])area-=stripAreas[strip++];
    const [a,b,c,e]=gravelStrips[strip],xx=a+.13+gravelRandom()*(b-a-.26),zz=c+.13+gravelRandom()*(e-c-.26);
    if(Math.abs(xx-(east-4))<2.65&&Math.abs(zz-(north-3))<1.9)continue;
    const radius=.045+gravelRandom()*.055;
    pebblePose.position.set(xx,.035,zz);pebblePose.rotation.set(gravelRandom()*.3,gravelRandom()*Math.PI*2,gravelRandom()*.3);pebblePose.scale.set(radius,radius*.5,radius*(.7+gravelRandom()*.3));pebblePose.updateMatrix();
    pebbles.setMatrixAt(i,pebblePose.matrix);pebbles.setColorAt(i,pebbleTints[i%pebbleTints.length]);i++;
  }
  pebbles.name='pond-exterior-pebbles';pebbles.castShadow=false;pebbles.instanceMatrix.needsUpdate=true;pebbles.instanceColor.needsUpdate=true;
  const banks=[[[west,.75,north],[east,.75,north],[east-2,-.25,north+2],[west+2,-.25,north+2]],[[east,.75,north],[east,.75,south],[east-2,-.25,south-2],[east-2,-.25,north+2]],[[east,.75,south],[west,.75,south],[west+2,-.25,south-2],[east-2,-.25,south-2]],[[west,.75,south],[west,.75,north],[west+2,-.25,north+2],[west+2,-.25,south-2]]];
  for(const points of banks){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();const face=mesh(geo,bank);face.material.side=T.DoubleSide;}
  for(const zz of [north,south]){box(w+.6,.25,.6,[x,.78,zz],bank);for(let xx=west;xx<=east;xx+=2.5)box(.035,.4,.63,[xx,.52,zz],concrete);}
  for(const xx of [west,east]){box(.6,.25,d,[xx,.78,z],bank);for(let zz=north;zz<=south;zz+=2.5)box(.63,.4,.035,[xx,.52,zz],concrete);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=k.tablet?128:256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#79949c';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<100;i++){ctx.strokeStyle=i%2?'#b0c6cd':'#536f7b';ctx.lineWidth=.6;ctx.beginPath();const yy=i*canvas.height/100;ctx.moveTo(0,yy);for(let xx=0;xx<=canvas.width;xx+=8)ctx.lineTo(xx,yy+Math.sin(xx*.14+i)*1.2);ctx.stroke();}
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
    for(let i=0;i<4;i++){const g=group([xx,.29,zz],k.scene,true);const ring=mesh(new T.RingGeometry(.65,.69,24),material('#c6d0ba',0,.5,{unique:true,transparent:true,opacity:.28,side:T.DoubleSide}),[0,0,0],g);ring.rotation.x=-Math.PI/2;ring.castShadow=false;bubbles.push({g,material:ring.material,offset:i/4});}
  }
  function update(time){
    ripple.offset.set(time*.007,time*.004);
    bubbles.forEach(({g,material,offset})=>{const age=(time*.22+offset)%1,scale=.5+age*2.2;g.scale.set(scale,1,scale);material.opacity=.32*(1-age);});
  }
  update(0);textPlate('BALYKÇYLYK',6,.7,[west+5,1.7,south+2],k.scene,'#204f58','#e5e4d6');
  return {update};
}
