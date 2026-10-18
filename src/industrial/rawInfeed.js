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
  box(5.2,.25,5.2,[0,.1,0],m.concrete,silo);k.frame(3.4,3.4,3.3,silo);
  cyl(.3,2,[0,2.3,0],paint,silo,1.65);cyl(1.65,8,[0,7.3,0],paint,silo);
  for(let y=3.3;y<=11.31;y+=1.33)k.ring(1.66,.045,[0,y,0],m.steel,silo);
  cyl(1.72,.16,[0,11.38,0],m.steel,silo);cyl(.3,.55,[0,11.72,0],paint,silo);
  box(.9,.3,.9,[0,1.3,0],m.blue,silo);k.motor([.75,.9,0],silo,.65);
  // Top access, safety cage and dust filter stay visible beside the left block.
  k.ladder(11.4,-1.95,0,silo,true);
  for(let i=0;i<10;i++){const a=i*Math.PI/5,x=Math.cos(a)*1.86,z=Math.sin(a)*1.86;rod([x,11.42,z],[x,12.4,z],.035,m.yellow,silo);}
  for(const y of [11.5,11.93,12.4])k.ring(1.86,.035,[0,y,0],m.yellow,silo);
  cyl(.36,1.25,[.8,12.1,-.7],paint,silo);cyl(.44,.12,[.8,12.78,-.7],m.blue,silo);
  k.textPlate('GIPS',1.5,.45,[0,7.8,1.67],silo);
  // Open steel truss follows the actual rising material belt into the silo.
  const start=new T.Vector3(...GYPSUM_LIFT[0]),end=new T.Vector3(...GYPSUM_LIFT[1]);
  const direction=end.clone().sub(start),normal=new T.Vector3(-direction.z,0,direction.x).normalize().multiplyScalar(.85);
  const chord=(t,side,drop)=>start.clone().lerp(end,t).addScaledVector(normal,side).add(new T.Vector3(0,-drop,0)).toArray();
  const spans=Math.ceil(direction.length()/2.5);
  for(const side of [-1,1]){
    for(const drop of [.2,.95])rod(chord(0,side,drop),chord(1,side,drop),.055,m.steel);
    for(let i=0;i<spans;i++){
      const a=i/spans,b=(i+1)/spans;
      rod(chord(a,side,.2),chord(b,side,.95),.035,m.steel);
      rod(chord(b,side,.95),chord(b,side,.2),.035,m.steel);
    }
  }
  for(const t of [.12,.48,.82]){
    const left=chord(t,-1,.95),right=chord(t,1,.95);
    for(const p of [left,right]){box(.65,.18,.65,[p[0],.09,p[2]],m.concrete);rod([p[0],.18,p[2]],p,.085,m.steel);}
    rod(left,right,.065,m.steel);rod([left[0],.25,left[2]],right,.04,m.steel);rod([right[0],.25,right[2]],left,.04,m.steel);
  }
  box(1.3,.36,1.5,[end.x,end.y+.13,end.z],paint);
}

export function buildRawInfeed(k){
  const {box,rod,group,mesh,m}=k,loader=buildWheelLoader(k);
  // A short manoeuvring lane connects the right-hand heap to the bunker.
  for(const [west,east,north,south] of LOADER_PAVEMENT)box(east-west,.075,south-north,[(west+east)/2,-.055,(north+south)/2],m.concrete);
  const deliveryStock=group(RAW_STOCK,k.scene,true);buildBoulderPiles(k,[[0,0,3.2,1.35]],{parent:deliveryStock,seed:291});
  const loaderStock=group(LOADER_STOCK,k.scene,true);buildBoulderPiles(k,[[0,0,GYPSUM_STOCKYARD.heapRadius,GYPSUM_STOCKYARD.heapHeight]],{parent:loaderStock,seed:619});
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
    const {id}=j.step,p=j.progress;let lift=-.26,tilt=-.08,fill=0,travel=0,lookBack=0;
    loader.g.position.set(...LOADER_PARK);loader.g.rotation.y=Math.PI;
    if(id==='scoop'){
      loader.g.position.set(T.MathUtils.lerp(LOADER_PARK[0],LOADER_SCOOP[0],smooth(p/.5)),0,LOADER_SCOOP[2]);travel=scoopDistance*smooth(p/.5);
      fill=smooth((p-.38)/.3);lift=T.MathUtils.lerp(-.26,-.05,smooth((p-.68)/.32));tilt=T.MathUtils.lerp(-.08,.15,smooth((p-.55)/.4));
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
      else{lift=T.MathUtils.lerp(-.05,-.26,smooth((elapsed-27.5)/3));tilt=T.MathUtils.lerp(.15,-.08,smooth((elapsed-27.5)/3));}
    }
    loader.g.rotation.z=0;
    loader.pose(lift,tilt,fill);
    // Tyres retain their angle at a stop and reverse by the distance travelled.
    loader.wheels.forEach(w=>{w.rotation.z=-travel/.87;});
    loader.driver.update(j.time,{lookBack});
    deliveryStock.scale.y=id==='receive'?.55+.45*clamp01((p-.2)/.5):j.index<JOURNEY_STAGE.receive?.55:1;
    loaderStock.scale.y=id==='scoop'?1-fill*.10:j.index>JOURNEY_STAGE.scoop?.9:1;
    hopperLoad.visible=j.hopperFill>.01||showLines;hopperLoad.scale.y=showLines?.65:Math.max(.01,j.hopperFill);
    feeder.position.y=.82+(id==='infeed'||showLines?Math.sin(j.time*36)*.018:0);
    loader.lip.getWorldPosition(drop);
    falling.forEach((rock,i)=>{
      rock.visible=id==='tip'&&p>.42&&p<.78;
      if(rock.visible){const t=(j.elapsed*1.9+i/falling.length)%1;rock.position.set(drop.x+(i%4-1.5)*.18,drop.y-t*Math.max(.3,drop.y-1.55),drop.z+(i%7-3)*.22);rock.rotation.set(j.elapsed+i,i*.3,j.elapsed*.8);}
    });
  }};
}
