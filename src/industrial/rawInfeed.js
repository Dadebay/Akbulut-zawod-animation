import * as T from 'three';
import {JOURNEY_STEPS,JOURNEY_STAGE,clamp01} from '../journey.js';
import {GYPSUM_INTAKE,GYPSUM_CORNER_SILO,GYPSUM_LIFT} from './processPlan.js';
import {GYPSUM_STOCKYARD,RAW_STOCK,LOADER_STOCK,LOADER_PARK,LOADER_SCOOP,LOADER_QUEUE,LOADER_STOP,LOADER_TRANSFER_POINTS,LOADER_PAVEMENT} from './siteLayout.js';
import {buildWheelLoader} from './wheelLoader.js';
import {buildBoulderPiles,rubbleAssets} from './rubble.js';

const smooth=t=>{t=clamp01(t);return t*t*(3-2*t);};
const curve=points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'catmullrom',.08);
const mixAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*clamp01(t);

export function buildCornerSilo(k){
  const {box,cyl,rod,m}=k,silo=k.group(GYPSUM_CORNER_SILO),paint=k.material('#e8ecea',.24,.5);
  silo.name='gypsum-corner-silo';
  const start=new T.Vector3(...GYPSUM_LIFT[0]),end=new T.Vector3(...GYPSUM_LIFT[1]);
  const direction=end.clone().sub(start),horizontal=Math.hypot(direction.x,direction.z);
  const yaw=-Math.atan2(direction.z,direction.x),inlet=k.group([0,0,0],silo);inlet.rotation.y=yaw;
  cyl(2.35,.18,[0,.09,0],m.concrete,silo,undefined,40);
  for(const x of [-1.45,1.45])for(const z of [-1.45,1.45]){
    box(.4,.12,.4,[x,.22,z],m.concrete,silo);
    cyl(.085,3.15,[x,1.8,z],paint,silo);
  }
  cyl(.3,2,[0,2.3,0],paint,silo,1.65);
  k.mesh(new T.CylinderGeometry(1.65,1.65,8,32,1,true),paint,[0,7.3,0],silo);
  for(let y=3.3;y<=11.31;y+=1.05)k.ring(1.66,.026,[0,y,0],paint,silo);
  // Shallow conical crown, with an open centre for the working inlet.
  k.mesh(new T.CylinderGeometry(.88,1.65,1.15,40,1,true),paint,[0,11.875,0],silo);
  // A real opening through the deck, not a solid lid underneath a pipe.
  const deck=new T.Shape();deck.absarc(0,0,1.72,0,Math.PI*2,false);
  const opening=new T.Path();opening.moveTo(-.62,-.78);opening.lineTo(-.62,.78);opening.lineTo(.62,.78);opening.lineTo(.62,-.78);opening.closePath();deck.holes.push(opening);
  const deckGeometry=new T.ExtrudeGeometry(deck,{depth:.16,bevelEnabled:false,curveSegments:32});deckGeometry.rotateX(-Math.PI/2);
  k.mesh(deckGeometry,m.steel,[0,11.3,0],inlet);
  // Hollow receiver: the belt enters below the hood and discharges into the
  // vertical chute. The upstream wall stops below the carrying surface.
  const top=end.y+.65,bottom=12.2,height=top-bottom;
  for(const z of [-.82,.82])box(1.4,height,.08,[0,bottom+height/2,z],paint,inlet);
  box(.08,height,1.64,[.66,bottom+height/2,0],paint,inlet);
  box(.08,1.5,1.64,[-.66,11.75,0],paint,inlet);
  for(const z of [-.82,.82])box(.55,1.2,.08,[-.975,top-.6,z],paint,inlet);
  box(1.95,.1,1.8,[-.275,top+.05,0],paint,inlet);
  for(const z of [-.82,.82])box(1.55,.08,.12,[0,11.5,z],m.blue,inlet);
  for(const x of [-.68,.68])box(.12,.08,1.72,[x,11.5,0],m.blue,inlet);
  box(.9,.3,.9,[0,1.3,0],m.blue,silo);k.motor([.75,.9,0],silo,.65);
  // The north side now carries the discharge to transfer tower 3.
  k.ladder(11.4,0,1.85,silo);
  // Stop the deep truss outside the silo wall; only the belt head overhangs
  // the open receiving deck.
  const trussEnd=1-2.5/horizontal,normal=new T.Vector3(-direction.z,0,direction.x).normalize().multiplyScalar(.85);
  const chord=(t,side,drop)=>start.clone().lerp(end,t).addScaledVector(normal,side).add(new T.Vector3(0,-drop,0)).toArray();
  const spans=Math.ceil(direction.length()/2.5);
  for(const side of [-1,1]){
    for(const drop of [.2,.95])rod(chord(0,side,drop),chord(trussEnd,side,drop),.055,m.steel);
    for(let i=0;i<spans;i++){
      const a=i/spans*trussEnd,b=(i+1)/spans*trussEnd;
      rod(chord(a,side,.2),chord(b,side,.95),.035,m.steel);
      rod(chord(b,side,.95),chord(b,side,.2),.035,m.steel);
    }
  }
  // Two separate concrete pads: a low portal and a taller four-leg trestle.
  for(const t of [.27,.72]){
    const left=chord(t,-1,.95),right=chord(t,1,.95);
    const pad=box(2.4,.18,2.5,[(left[0]+right[0])/2,.09,(left[2]+right[2])/2],m.concrete);pad.rotation.y=yaw;
    for(const p of [left,right])rod([p[0],.18,p[2]],p,.085,m.steel);
    rod(left,right,.065,m.steel);rod([left[0],.25,left[2]],right,.04,m.steel);rod([right[0],.25,right[2]],left,.04,m.steel);
    if(t>.5){
      const along=direction.clone().setY(0).normalize();
      for(const p of [left,right]){
        const q=new T.Vector3(...p).addScaledVector(along,-1.25);
        rod([q.x,.18,q.z],q.toArray(),.085,m.steel);rod(q.toArray(),p,.06,m.steel);
        rod([q.x,.18,q.z],p,.045,m.steel);rod([p[0],.18,p[2]],q.toArray(),.045,m.steel);
      }
    }
  }
}

export function buildRawInfeed(k){
  const {box,rod,group,mesh,m}=k,loader=buildWheelLoader(k);
  // A short manoeuvring lane connects the right-hand heap to the bunker.
  for(const [west,east,north,south] of LOADER_PAVEMENT)box(east-west,.075,south-north,[(west+east)/2,-.055,(north+south)/2],m.road);
  const deliveryStock=group(RAW_STOCK,k.scene,true);buildBoulderPiles(k,[[0,0,3.2,1.35]],{parent:deliveryStock,seed:291});
  const loaderStock=group(LOADER_STOCK,k.scene,true);
  const stockFields=buildBoulderPiles(k,[[0,0,GYPSUM_STOCKYARD.heapRadius,GYPSUM_STOCKYARD.heapHeight]],{parent:loaderStock,seed:619});
  // Take stones only from the low, bucket-width face of the heap. The rest of
  // the pile keeps its height instead of sinking as soon as loading begins.
  const cutStones=[],stonePose=new T.Object3D(),stoneMatrix=new T.Matrix4();let lastCut=-1;
  for(const field of stockFields){
    field.userData.preserveInstances=true;field.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for(let i=0;i<field.count;i++){
      field.getMatrixAt(i,stoneMatrix);stoneMatrix.decompose(stonePose.position,stonePose.quaternion,stonePose.scale);
      if(stonePose.position.x>3.9&&Math.abs(stonePose.position.z)<1.65&&stonePose.position.y<1.25)
        cutStones.push({field,index:i,matrix:stoneMatrix.clone(),position:stonePose.position.clone(),rotation:stonePose.quaternion.clone(),scale:stonePose.scale.clone()});
    }
  }
  cutStones.sort((a,b)=>b.position.x-a.position.x);
  function scoopFace(fill){
    if(fill===lastCut)return;lastCut=fill;
    cutStones.forEach((stone,i)=>{
      if(fill===0){stone.field.setMatrixAt(stone.index,stone.matrix);return;}
      const taken=smooth((fill-i/cutStones.length*.65)/.35);
      stonePose.position.copy(stone.position);stonePose.position.x+=taken*.45;stonePose.position.y+=Math.sin(taken*Math.PI)*.14;
      stonePose.quaternion.copy(stone.rotation);stonePose.scale.copy(stone.scale).multiplyScalar(1-taken);stonePose.updateMatrix();
      stone.field.setMatrixAt(stone.index,stonePose.matrix);
    });
    stockFields.forEach(field=>{field.instanceMatrix.needsUpdate=true;});
  }
  const rubble=rubbleAssets(k);
  const intake=group([GYPSUM_INTAKE[0],0,GYPSUM_INTAKE[2]]);
  const white=k.material('#ecedeb',.26,.5,{side:T.DoubleSide});
  const vertices=[[-.55,1.1,-.55],[.55,1.1,-.55],[.55,1.1,.55],[-.55,1.1,.55],[-1.9,2.7,-1.9],[1.9,2.7,-1.9],[1.9,2.7,1.9],[-1.9,2.7,1.9]];
  const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));shell.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);shell.computeVertexNormals();mesh(shell,white,[0,0,0],intake);
  for(const x of [-1.75,1.75])for(const z of [-1.75,1.75]){box(.15,2.6,.15,[x,1.3,z],m.steel,intake);box(.45,.12,.45,[x,.06,z],m.steel,intake);}
  for(const z of [-1.95,1.95])box(4,.14,.15,[0,2.7,z],m.blue,intake);
  for(const x of [-1.95,1.95])box(.15,.14,4,[x,2.7,0],m.blue,intake);
  const hopperLoad=group([0,1.35,0],intake,true);
  for(let i=0;i<18;i++){
    const rock=mesh(rubble.geometries[i%4],rubble.material,[(i%3-1)*.55,.3+Math.floor(i/9)*.4,(Math.floor(i/3)%3-1)*.55],hopperLoad);
    rock.scale.set(.36,.3,.34);rock.rotation.set(i*.31,i*.73,i*.17);
  }
  // A short vibrating tray below the hopper feeds the crusher conveyor.
  const feeder=group([-2.4,.82,0],intake,true);box(5,.15,1.45,[0,-.08,0],m.steel,feeder);
  for(const z of [-.74,.74])box(5,.40,.12,[0,.10,z],white,feeder);
  for(const x of [-1.9,1.65])for(const z of [-.83,.83]){
    box(.3,.30,.3,[x-2.4,.15,z],m.steel,intake);
    for(let y=.38;y<.70;y+=.055)k.ring(.13,.023,[x-2.4,y,z],m.dark,intake);
    box(.3,.17,.3,[x-2.4,.24,z],m.blue,intake);
  }
  k.motor([-2.7,.45,1.15],intake,.8);
  for(const z of [-2.5,2.5]){
    for(const x of [-3.5,-1,1.5])rod([x,.1,z],[x,1.25,z],.04,m.yellow,intake);
    for(const y of [.65,1.25])rod([-3.5,y,z],[1.5,y,z],.035,m.yellow,intake);
  }
  k.ladder(2.8,-1.4,-2.15,intake);
  const falling=Array.from({length:18},(_,i)=>{const g=group([0,0,0],k.scene,true),rock=mesh(rubble.geometries[i%4],rubble.material,[0,0,0],g);rock.scale.setScalar(.27+(i%4)*.04);return g;});
  const outbound=curve(LOADER_TRANSFER_POINTS);
  // Retrace the loaded route backwards; heading stays continuous at both ends.
  const homebound=curve([...LOADER_TRANSFER_POINTS].reverse());
  const drop=new T.Vector3(),scoopDistance=LOADER_PARK[0]-LOADER_SCOOP[0],approachDistance=LOADER_QUEUE[0]-LOADER_STOP[0],outboundLength=outbound.getLength();
  const place=(path,t,reverse=false)=>{loader.g.position.copy(path.getPointAt(clamp01(t)));const d=path.getTangentAt(clamp01(t));loader.g.rotation.y=-Math.atan2(d.z,d.x)+(reverse?Math.PI:0);};
  return {loader,update(j,{showLines=false}={}){
    const {id}=j.step,p=j.progress;let lift=-.24,tilt=0,fill=0,travel=0,lookBack=0;
    loader.g.position.set(...LOADER_PARK);loader.g.rotation.y=Math.PI;
    if(id==='scoop'){
      const contactX=LOADER_SCOOP[0]+.6;
      const x=p<.35?T.MathUtils.lerp(LOADER_PARK[0],contactX,smooth(p/.35)):T.MathUtils.lerp(contactX,LOADER_SCOOP[0],smooth((p-.35)/.25));
      loader.g.position.set(x,0,LOADER_SCOOP[2]);travel=LOADER_PARK[0]-x;
      // Approach, make a shallow bite, curl under the stones, then raise to carry.
      fill=smooth((p-.4)/.32);lift=T.MathUtils.lerp(-.24,-.05,smooth((p-.68)/.32));tilt=T.MathUtils.lerp(0,.15,smooth((p-.43)/.4));
    }else if(id==='carry'){
      lift=-.05;tilt=.15;fill=1;
      if(p<.18){loader.g.position.set(T.MathUtils.lerp(LOADER_SCOOP[0],LOADER_PARK[0],smooth(p/.18)),0,LOADER_SCOOP[2]);loader.g.rotation.y=Math.PI;travel=scoopDistance*(1-smooth(p/.18));lookBack=smooth(p/.035);}
      else{const t=(p-.18)/.82;travel=outboundLength*t;place(outbound,t);loader.g.rotation.y=mixAngle(Math.PI,loader.g.rotation.y,smooth(t/.06));}
    }else if(id==='tip'){
      loader.g.position.set(T.MathUtils.lerp(LOADER_QUEUE[0],LOADER_STOP[0],smooth((p-.23)/.12)),0,LOADER_STOP[2]);loader.g.rotation.y=Math.PI;travel=outboundLength+approachDistance*smooth((p-.23)/.12);
      // Raise outside the bunker, approach with the bucket above its rim, then tip.
      lift=T.MathUtils.lerp(-.05,.85,smooth(p/.22));tilt=T.MathUtils.lerp(.15,-.7,smooth((p-.34)/.08));fill=1-clamp01((p-.42)/.36);
      if(p>.8)tilt=T.MathUtils.lerp(-.7,.15,smooth((p-.8)/.2));
    }else if(j.index>=JOURNEY_STAGE.infeed){
      const elapsed=j.time-JOURNEY_STEPS[JOURNEY_STAGE.infeed].start;lift=-.05;tilt=.15;
      if(elapsed<3.5){loader.g.position.set(T.MathUtils.lerp(LOADER_STOP[0],LOADER_QUEUE[0],smooth(elapsed/3.5)),0,LOADER_STOP[2]);loader.g.rotation.y=Math.PI;lift=.85;travel=outboundLength+approachDistance*(1-smooth(elapsed/3.5));lookBack=smooth(elapsed/.5);}
      else if(elapsed<27.5){place(homebound,smooth((elapsed-3.5)/24),true);lift=T.MathUtils.lerp(.85,-.05,smooth((elapsed-3.5)/4));travel=outboundLength*(1-smooth((elapsed-3.5)/24));lookBack=1;}
      else{lift=T.MathUtils.lerp(-.05,-.24,smooth((elapsed-27.5)/3));tilt=T.MathUtils.lerp(.15,0,smooth((elapsed-27.5)/3));}
    }
    const rolling=id==='carry'&&p>.18||id==='infeed'&&j.elapsed<27.5;
    loader.g.position.y+=rolling?.018*(1+Math.sin(travel*3.1)):0;
    loader.g.rotation.z=rolling?.006*Math.sin(travel*2.4):0;
    loader.pose(lift,tilt,fill);
    // Tyres retain their angle at a stop and reverse by the distance travelled.
    loader.wheels.forEach(w=>{
      w.rotation.z=-travel/.87;
      // Suspension absorbs body heave/pitch while tyre contact stays on the ground.
      w.position.y=(.91-loader.g.position.y-Math.sin(loader.g.rotation.z)*w.position.x)/Math.cos(loader.g.rotation.z);
    });
    loader.driver.update(j.time,{lookBack});
    deliveryStock.scale.y=id==='receive'?.55+.45*clamp01((p-.2)/.5):j.index<JOURNEY_STAGE.receive?.55:1;
    scoopFace(id==='scoop'?fill:j.index>JOURNEY_STAGE.scoop?1:0);
    hopperLoad.visible=j.hopperFill>.01||showLines;hopperLoad.scale.y=showLines?.65:Math.max(.01,j.hopperFill);
    feeder.position.y=.82+(id==='infeed'||showLines?Math.sin(j.time*36)*.018:0);
    loader.lip.getWorldPosition(drop);
    falling.forEach((rock,i)=>{
      rock.visible=id==='tip'&&p>.42&&p<.78;
      if(rock.visible){const t=(j.elapsed*1.9+i/falling.length)%1;rock.position.set(drop.x+(i%4-1.5)*.18,drop.y-t*Math.max(.3,drop.y-1.55),drop.z+(i%7-3)*.22);rock.rotation.set(j.elapsed+i,i*.3,j.elapsed*.8);}
    });
  }};
}
