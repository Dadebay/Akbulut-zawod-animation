import * as T from 'three';
import {clamp01,JOURNEY_STAGE as S} from '../journey.js';
import {PROCESS_LINES,CALCITE_INTAKE,BOARD_PALLET_OUT,BAG_PALLET_OUT,routeCurve} from './processPlan.js';
import {buildRawInfeed} from './rawInfeed.js';
import {rubbleAssets} from './rubble.js';

export function buildMaterialFlow(k,logistics){
  const {m,box,cyl,group,mesh,rod}=k;
  const infeed=buildRawInfeed(k),rubble=rubbleAssets(k);
  const makeCurve=routeCurve;
  function belt(points,width=1.4,supports=true){
    const path=points.map(p=>new T.Vector3(...p)).filter((p,i,all)=>!i||p.distanceToSquared(all[i-1])>1e-8);
    if(path.length<2)return;
    const normals=path.slice(1).map((p,i)=>{
      const d=p.clone().sub(path[i]);return new T.Vector3(-d.z,0,d.x).normalize();
    });
    // Shared, mitred cross-sections close both the carrying surface and its
    // side rails at horizontal turns and at changes of incline.
    const sections=path.map((p,i)=>{
      if(!i)return normals[0].clone();
      if(i===path.length-1)return normals.at(-1).clone();
      const bisector=normals[i-1].clone().add(normals[i]);
      if(bisector.lengthSq()<1e-8)return normals[i].clone();
      bisector.normalize();
      return bisector.multiplyScalar(Math.min(2,1/Math.max(.25,bisector.dot(normals[i]))));
    });
    function strip(left,right,bottom,top,mat){
      const positions=[],indices=[];
      path.forEach((p,i)=>{
        for(const [offset,y] of [[left,top],[right,top],[right,bottom],[left,bottom]]){
          const edge=p.clone().addScaledVector(sections[i],offset);
          positions.push(edge.x,edge.y+y,edge.z);
        }
        if(i<path.length-1)for(let side=0;side<4;side++){
          const a=i*4+side,b=i*4+(side+1)%4;
          indices.push(a,b,b+4,a,b+4,a+4);
        }
      });
      const end=(path.length-1)*4;
      indices.push(0,3,2,0,2,1,end,end+1,end+2,end,end+2,end+3);
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,mat);
    }
    strip(-width/2,width/2,-.13,0,m.rubber);
    for(const side of [-1,1])strip(side*width/2-.05,side*width/2+.05,-.15,.01,m.blue);
    for(let i=0;i<path.length-1;i++){
      const a=path[i],b=path[i+1],d=b.clone().sub(a),length=d.length(),g=group(a.clone().add(b).multiplyScalar(.5).toArray());
      // Keep the carrying face upright on westbound inclines as well.
      g.rotation.set(0,-Math.atan2(d.z,d.x),Math.atan2(d.y,Math.hypot(d.x,d.z)),'YXZ');
      const startInset=i?Math.min(width*.65,length*.25):.15,endInset=i<path.length-2?Math.min(width*.65,length*.25):.15;
      for(let x=-length/2+startInset;x<length/2-endInset;x+=1.5){const roller=cyl(.07,width+.1,[x,-.15,0],m.steel,g,undefined,10);roller.rotation.x=Math.PI/2;}
      if(d.y>1)for(let x=-length/2+Math.max(.3,startInset);x<length/2-endInset;x+=.8)box(.065,.18,width-.16,[x,.07,0],m.rubber,g);
      if(supports)for(let t=.05;t<1;t+=Math.min(.5,5/length)){const p=a.clone().lerp(b,t);for(const side of [-1,1]){const n=new T.Vector3(-d.z,0,d.x).normalize().multiplyScalar(side*width*.6);rod([p.x+n.x,0,p.z+n.z],[p.x+n.x,p.y-.2,p.z+n.z],.065,m.steel);}}
    }
  }
  function duct(points){
    const up=new T.Vector3(0,1,0);
    for(let i=1;i<points.length;i++){
      const a=new T.Vector3(...points[i-1]),b=new T.Vector3(...points[i]),direction=b.clone().sub(a).normalize();
      rod(a.toArray(),b.toArray(),.28,m.white);
      for(const point of [a,b]){const flange=cyl(.36,.09,point.toArray(),m.blue);flange.quaternion.setFromUnitVectors(up,direction);}
      if(i<points.length-1)k.sphere(.285,b.toArray(),m.white);
      if(Math.abs(a.y-b.y)<.1&&a.distanceTo(b)>3){const p=a.clone().lerp(b,.5);rod([p.x,0,p.z],[p.x,p.y-.25,p.z],.07,m.steel);}
    }
  }
  // Gypsum arrives in the loader bucket; calcite keeps its separate intake.
  for(const position of [CALCITE_INTAKE]){
    const intake=group([position[0],0,position[2]]);box(3.3,.2,3.3,[0,.1,0],m.concrete,intake);
    for(const side of [-1,1]){box(2.9,1,.14,[0,.65,side*1.45],m.blue,intake);box(.14,1,2.9,[side*1.45,.65,0],m.blue,intake);}
    box(2.7,.3,2.7,[0,.53,0],m.raw,intake);for(let z=-1.3;z<=1.3;z+=.3)box(2.7,.05,.035,[0,.74,z],m.steel,intake);
  }
  const rawLines=PROCESS_LINES.slice(0,2).flatMap(line=>[line.points,...(line.branches||[])].map(points=>{
    const coarse=line.id==='gypsum'&&points===line.points;
    if(coarse){belt(points.slice(1,3),1.35);belt(points.slice(3,6),1.35);belt(points.slice(5,7),1.35,false);duct(points.slice(6));}
    else if(line.id==='gypsum')duct(points);
    else belt(points,1.35);
    const path=makeCurve(points),length=path.getLength(),objects=[];
    const coarseUntil=coarse?path.curves[0].getLength()+path.curves[1].getLength():0;
    for(let i=0;i<18;i++){
      const g=group([0,0,0],k.scene,true);
      for(let n=0;n<3;n++){
        const rock=mesh(rubble.geometries[(i+n)%4],rubble.material,[(n-1)*.28,.28,(n%2-.5)*.30],g);
        rock.scale.setScalar(.28+((i+n)%3)*.035);rock.rotation.set(i*.19,n*.7,i*.37);
      }
      objects.push(g);
    }
    return {line,path,length,objects,coarseUntil};
  }));
  // The calcite belt terminates inside an enclosed receiving/elevator unit.
  // Its hopper, lift and buffer silo give the material a visible destination.
  const calcite=PROCESS_LINES.find(line=>line.id==='calcite'),last=calcite.points.at(-1),previous=calcite.points.at(-2),receiver=group([last[0],0,last[2]]);
  receiver.rotation.y=-Math.atan2(last[2]-previous[2],last[0]-previous[0]);
  box(4.8,.22,3.1,[0,.11,0],m.concrete,receiver);
  for(const z of [-1.4,1.4]){box(4.4,1.85,.12,[0,1.72,z],m.white,receiver);box(4.4,.18,.18,[0,.78,z],m.blue,receiver);}
  box(4.6,.15,3,[0,2.72,0],m.white,receiver);box(.12,1.9,2.9,[2.2,1.72,0],m.white,receiver);
  box(2.4,.8,2.5,[.55,.75,0],m.dark,receiver);box(.7,6.8,.8,[1.25,3.4,0],m.white,receiver);
  for(let y=.7;y<6.5;y+=.8)box(.82,.05,.92,[1.25,y,0],m.steel,receiver);
  const silo=group([1.25,0,3.2],receiver);k.frame(2.3,2.3,1.6,silo);cyl(.2,1.1,[0,1.65,0],m.steel,silo,1.05);cyl(1.05,3.1,[0,3.75,0],m.white,silo);cyl(1.1,.15,[0,5.36,0],m.steel,silo);
  k.pipe([[1.25,6.7,0],[1.25,7.1,0],[1.25,7.1,3.2],[1.25,5.3,3.2]],.18,m.steel,receiver);k.motor([1.7,6.2,0],receiver,.7);k.ladder(5.4,1.25,4.5,receiver);
  k.textPlate('KALSIT',1.6,.35,[1.25,4.2,4.26],receiver);
  const boardDelivery=[BOARD_PALLET_OUT,[BOARD_PALLET_OUT[0],.8,-36],[25,.8,-36],[25,.8,-41]];
  const bagDelivery=[BAG_PALLET_OUT,[-26,.8,-36],[10,.8,-36],[10,.8,-41]];
  belt(boardDelivery,1.7);belt(bagDelivery,1.4);belt([[51,.8,-41],[-8,.8,-41]],1.7);
  const goods=[51,-8,25].map((x,i)=>{
    const bags=i===1,delivery=bags?bagDelivery:boardDelivery,lastZ=x===51?-45:-43;
    belt([[x,.8,-41],[x,.27,lastZ]],1.7);
    return {path:makeCurve([...delivery,[x,.8,-41],[x,.27,lastZ]]),objects:Array.from({length:3},()=>logistics.pallet(k.scene,[0,0,0],bags?'bags':'panel',true))};
  });
  // A dedicated plan view carries the image's four colours; equipment stays
  // white and blue. Instanced arrows show direction without extra UI text.
  const traces=group([0,0,0],k.scene,true),arrowGeo=new T.ConeGeometry(.23,.8,6),arrowPose=new T.Object3D(),up=new T.Vector3(0,1,0);
  const traceLines=PROCESS_LINES.flatMap(line=>[line.points,...(line.branches||[])].map(points=>{
    const path=makeCurve(points.map(([x,y,z])=>[x,y+.65,z])),mat=k.material(line.color,.1,.5,{emissive:line.color,emissiveIntensity:.3,depthTest:false,depthWrite:false});
    const trace=mesh(new T.TubeGeometry(path,Math.max(36,Math.ceil(path.getLength())),.085,5,false),mat,[0,0,0],traces);trace.castShadow=false;trace.renderOrder=30;
    const arrows=k.instances(arrowGeo,mat,14,traces);arrows.castShadow=false;arrows.renderOrder=31;
    return {line,path,arrows};
  }));
  const falling=[];for(let i=0;i<26;i++){const rock=group([0,0,0],k.scene,true),chunk=mesh(rubble.geometries[i%4],rubble.material,[0,0,0],rock);chunk.scale.setScalar(.24+(i%3)*.045);falling.push(rock);}
  const drop=new T.Vector3(),loadSurface=new T.Vector3();
  return {loader:infeed.loader,update(j,landscape,{showLines=false,active}={}){
    const isRunning=zone=>!active||active.get(zone)?.status==='running';
    traces.visible=showLines;
    traceLines.forEach(({line,path,arrows})=>{arrows.visible=isRunning(line.zone);if(!showLines)return;for(let i=0;i<arrows.count;i++){const t=(j.time*.035+i/arrows.count)%1;arrowPose.position.copy(path.getPointAt(t));arrowPose.quaternion.setFromUnitVectors(up,path.getTangentAt(t).normalize());arrowPose.updateMatrix();arrows.setMatrixAt(i,arrowPose.matrix);}arrows.instanceMatrix.needsUpdate=true;});
    rawLines.forEach(({line,path,length,objects,coarseUntil})=>objects.forEach((o,i)=>{
      o.visible=isRunning(line.zone)&&(line.stages.includes(j.index)||showLines);
      if(o.visible){
        const t=(j.time*.04+i/objects.length)%1,d=path.getTangentAt(t);o.position.copy(path.getPointAt(t));o.rotation.y=-Math.atan2(d.z,d.x);
        o.scale.setScalar(t*length<coarseUntil?1:.43);
        if(line.id==='calcite')o.position.y-=clamp01(1-(1-t)*length/.8)*.6;
      }
    }));
    infeed.update(j,{showLines});
    goods.forEach(({path,objects})=>objects.forEach((o,i)=>{const t=(j.progress-i*.12)/.76;o.visible=j.index===S.pack&&t>=0&&t<=1;if(o.visible){o.position.copy(path.getPointAt(clamp01(t)));const d=path.getTangentAt(clamp01(t));o.rotation.y=-Math.atan2(d.z,d.x);}}));
    const quarryPose=landscape.update(j);
    if(j.index===2)logistics.hauler.dischargePoint.getWorldPosition(drop);else landscape.bucketTip.getWorldPosition(drop);
    logistics.hauler.bed.updateWorldMatrix(true,false);loadSurface.set(2.5,.3+j.rawLoad*.65,0).applyMatrix4(logistics.hauler.bed.matrixWorld);
    falling.forEach((o,i)=>{
      const quarry=j.index===0&&quarryPose.pouring,tip=j.index===2&&j.progress>.2&&j.progress<.7;o.visible=quarry||tip;if(!o.visible)return;
      const t=(j.elapsed*1.8+i/26)%1,spread=(i%5-2)*.17;
      if(quarry)o.position.set(drop.x+spread,drop.y-t*Math.max(.25,drop.y-loadSurface.y),drop.z+Math.sin(i)*.3);
      else o.position.set(drop.x+spread,drop.y-t*.8,drop.z+Math.sin(i)*.5);
      o.rotation.set(j.elapsed+i,i*.3,j.elapsed*.8);
    });
  }};
}
