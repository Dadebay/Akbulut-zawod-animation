import * as T from 'three';
import {quarryCycle} from '../quarryCycle.js';
import {rubbleAssets} from './rubble.js';
import {quarryPoint,QUARRY_LOAD_POINT,EXCAVATOR_LAYOUT,excavatorLoadingPose} from './quarryLayout.js';

export const HAULER_LAYOUT={bedPivot:[-5.5,1.25,0],bedLength:5.55,bedWidth:2.5,wheelRadius:.562,loadPoint:QUARRY_LOAD_POINT};

// Original industrial bodies, with the same scanned MAN cab used by the delivery trucks.
export function createQuarryVehicles(k){
  const {m,box,cyl,ring,rod,pipe,mesh,group,material,textPlate}=k;
  const paint=material('#f3f4f2',.2,.36),blue=paint,steel=material('#919fa8',.82,.37),frame=material('#303a43',.66,.58);
  const wear=material('#737e85',.74,.53),glass=material('#385663',.5,.18,{transparent:true,opacity:.58});
  const rubble=rubbleAssets(k);
  const lamp=material('#fbf3d5',.15,.25,{emissive:'#e5d3a2',emissiveIntensity:.3});
  let seed=719;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function axisCylinder(r,h,pos,mat,parent,axis='z',segments=32){const o=cyl(r,h,pos,mat,parent,undefined,segments);if(axis==='z')o.rotation.x=Math.PI/2;else if(axis==='x')o.rotation.z=Math.PI/2;return o;}
  function bolt(pos,parent,axis='z',radius=.035){axisCylinder(radius*1.5,.012,pos,steel,parent,axis,12);return axisCylinder(radius,.035,pos,frame,parent,axis,6);}
  function boltCircle(r,pos,parent,n=12){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;bolt([pos[0]+Math.sin(a)*r,pos[1]+Math.cos(a)*r,pos[2]],parent);}}
  function prism(points,depth,pos,mat,parent,bevel=.02){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:16});geo.translate(0,0,-depth/2);return mesh(geo,mat,pos,parent);}
  function hinge(pos,r,parent){axisCylinder(r,.64,pos,blue,parent);for(const z of [-.35,.35]){axisCylinder(r*.7,.04,[pos[0],pos[1],pos[2]+z],steel,parent);boltCircle(r*.48,[pos[0],pos[1],pos[2]+z],parent,8);}}
  // The quarry is outside the factory's shadow map; retain soft ground contact here.
  function contactShadow(parent,length,width,pos){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const context=canvas.getContext('2d');
    const gradient=context.createRadialGradient(64,64,15,64,64,64);gradient.addColorStop(0,'white');gradient.addColorStop(.5,'#aaaaaa');gradient.addColorStop(1,'black');context.fillStyle=gradient;context.fillRect(0,0,128,128);
    const alphaMap=k.trackTexture(new T.CanvasTexture(canvas));
    const shadow=mesh(new T.PlaneGeometry(length,width),new T.MeshBasicMaterial({color:'#222b30',alphaMap,transparent:true,opacity:.3,depthWrite:false}),pos,parent);
    shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;k.trackObject(shadow);
  }
  function hydraulic(parent,r=.09){const body=cyl(r,1,[0,0,0],frame,parent),piston=cyl(r*.55,1,[0,0,0],m.polished,parent),collar=cyl(r*1.15,.08,[0,0,0],steel,parent);for(const o of [body,piston,collar])o.userData.dynamic=true;
    const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),mid=new T.Vector3(),direction=new T.Vector3();
    function segment(o,start,end){direction.subVectors(end,start);o.position.copy(start).add(end).multiplyScalar(.5);o.scale.y=direction.length();o.quaternion.setFromUnitVectors(up,direction.normalize());}
    return (start,end)=>{a.copy(start);b.copy(end);mid.copy(a).lerp(b,.55);segment(body,a,mid);segment(piston,mid,b);collar.position.copy(mid);collar.quaternion.copy(body.quaternion);};
  }
  function rockPile(parent,length,width){
    const cargo=group([0,0,0],parent,true);
    for(let layer=0;layer<2;layer++)for(let row=0;row<3;row++)for(let col=0;col<8;col++){
      const x=.45+col*(length-.6)/8+(random()-.5)*.13,z=(row-1)*width*.30+(random()-.5)*.09;
      const y=.4+layer*.45+(row===1?.1:0)+(random()-.5)*.08,size=.35+random()*.07;
      const rock=mesh(rubble.geometries[(col+row+layer)%4],rubble.material,[x,y,z],cargo);
      rock.userData.dynamic=true;rock.userData.rest=rock.position.clone();
      rock.scale.set(size*1.12,size*.8,size);rock.rotation.set(random()*.6,random()*6,random()*.6);
    }
    return cargo;
  }

  function buildHauler(truckBuilder){
    const g=group(quarryPoint(),k.scene,true),ws=[],steering=[];truckBuilder.mountCab(g,[.85,0,0],1.05);
    contactShadow(g,10.5,3.7,[-1.65,.075,0]);
    for(const z of [-.49,.49]){box(8.5,.28,.12,[-1.7,.81,z],frame,g);box(8.5,.05,.22,[-1.7,.97,z],steel,g);}
    for(let x=-5.6;x<2.2;x+=.6)box(.12,.16,1.1,[x,.8,0],frame,g);
    for(const x of [-4.55,-3.15,1.4275]){
      axisCylinder(.10,2.0,[x,.562,0],frame,g);const diff=mesh(new T.SphereGeometry(.21,20,14),frame,[x,.56,0],g);diff.scale.set(1,.9,1.1);
      for(const z of [-1.1235,1.1235]){if(x>0){const front=truckBuilder.steeredWheel(g,x,z,HAULER_LAYOUT.wheelRadius);ws.push(front.wheel);steering.push(front.pivot);}else ws.push(truckBuilder.wheel(g,x,z,HAULER_LAYOUT.wheelRadius,true));for(let layer=0;layer<4;layer++)box(1.2-layer*.13,.025,.12,[x,.69+layer*.03,z*.56],wear,g);}
    }
    rod([-4.55,.58,0],[.75,.67,0],.07,steel,g);
    for(const z of [-1.2,1.2]){
      box(2.6,.12,.42,[-3.86,1.23,z],paint,g,.055);for(const x of [-5.15,-2.55])box(.08,.48,.48,[x,.95,z],frame,g,.02);
      box(.045,.42,.49,[-5.22,.39,z],m.rubber,g);box(1.45,.08,.08,[-1.35,.47,z],steel,g);
      for(const x of [-1.95,-.75])rod([x,.48,z],[x,.97,z*.75],.026,frame,g);
    }
    axisCylinder(.34,1.3,[-1.25,.76,-.83],steel,g,'x');for(const x of [-1.75,-.75])ring(.355,.025,[x,.76,-.83],frame,g,'x');cyl(.075,.10,[-.9,1.1,-.83],frame,g);
    box(1.25,.55,.65,[-1.3,.72,.86],frame,g,.07);box(1.13,.42,.025,[-1.3,.73,1.2],steel,g,.025);for(const x of [-1.75,-.85])box(.12,.07,.035,[x,.8,1.22],frame,g);
    for(const z of [-.4,.4])axisCylinder(.16,.8,[-2.3,.56,z],frame,g,'x');
    box(.18,.24,2.2,[-5.8,.65,0],paint,g,.025);for(const z of [-.87,.87]){box(.055,.15,.35,[-5.91,.85,z],m.red,g);box(.05,.12,.15,[-5.94,.85,z*.7],m.orange,g);}
    // Plate floor, sloping side walls, top rails, external ribs and a real rear hinge.
    const bed=group(HAULER_LAYOUT.bedPivot,g,true),length=HAULER_LAYOUT.bedLength;
    box(length,.15,2.2,[length/2,.08,0],wear,bed,.015);for(let x=.2;x<length;x+=.55)box(.1,.18,2.2,[x,-.08,0],frame,bed);
    for(const side of [-1,1]){
      const wall=box(length,1.28,.09,[length/2,.72,side*1.16],blue,bed,.025);wall.rotation.x=side*.14;
      box(length,.12,.16,[length/2,1.37,side*1.25],steel,bed,.025);box(length,.12,.13,[length/2,.16,side*1.08],blue,bed);
      for(let x=.12;x<length;x+=.78){const rib=box(.13,1.3,.11,[x,.73,side*1.23],paint,bed,.015);rib.rotation.x=side*.14;for(const y of [.25,1.22])bolt([x,y,side*(y>1?1.35:1.2)],bed);}
      for(let i=0;i<16;i++){const scratch=box(.2+random()*.5,.012,.012,[.3+random()*4.9,.3+random()*.7,side*1.12],wear,bed);scratch.rotation.z=(random()-.5)*.5;}
      textPlate('AK BULUT',1.3,.24,[2.9,.85,side*1.3],bed,'#eef2f4','#1c5894').rotation.y=side<0?Math.PI:0;
    }
    box(.12,1.65,2.5,[length, .95,0],paint,bed,.025);box(.8,.10,2.55,[length+.3,1.82,0],blue,bed,.02);
    const tailgate=group([-.02,1.36,0],bed,true);box(.10,1.25,2.48,[0,-.61,0],blue,tailgate,.025);
    for(const z of [-1.1,0,1.1])box(.08,1.22,.12,[-.08,-.61,z],paint,tailgate);for(const y of [-1.2,0])box(.14,.12,2.5,[-.05,y,0],steel,tailgate);
    for(const z of [-1.08,1.08]){axisCylinder(.09,.3,[0,0,z],steel,tailgate);axisCylinder(.11,.32,[0,0,z],frame,bed);}
    const cargo=rockPile(bed,5.18,2.13),dischargePoint=group([-.02,.2,0],bed,true);
    const cargoRocks=[...cargo.children];
    function updateCargo(load,unloading){
      cargo.visible=load>.001;cargo.scale.y=1;
      const slide=unloading?(1-load)*5.7:0;
      for(const rock of cargoRocks){
        const rest=rock.userData.rest;rock.position.copy(rest);rock.position.x-=slide;
        rock.visible=unloading?rock.position.x>=.15:rest.y<=.4+load*.6;
      }
    }
    const hoist=hydraulic(g,.14),anchor=new T.Vector3(-3.9,.86,0),moving=new T.Vector3();
    function updateHoist(){moving.set(4.25,-.05,0).applyAxisAngle(new T.Vector3(0,0,1),bed.rotation.z).add(bed.position);hoist(anchor,moving);}
    updateHoist();return {type:'haul',g,ws,steering,bed,tailgate,cargo,dischargePoint,updateHoist,updateCargo,zone:'CR'};
  }

  function buildExcavator(){
    const g=group(EXCAVATOR_LAYOUT.position,k.scene,true);g.rotation.y=EXCAVATOR_LAYOUT.yaw;
    for(const z of [-1.28,1.28])contactShadow(g,5.6,1.7,[0,.09,z]);
    // Track shoes follow a continuous stadium-shaped chain around both sprockets.
    const half=1.85,r=.48,perimeter=4*half+2*Math.PI*r;
    function trackPoint(d){d=((d%perimeter)+perimeter)%perimeter;if(d<2*half)return {x:-half+d,y:r,angle:0};d-=2*half;if(d<Math.PI*r){const a=Math.PI/2-d/r;return {x:half+r*Math.cos(a),y:r*Math.sin(a),angle:a-Math.PI/2};}d-=Math.PI*r;if(d<2*half)return {x:half-d,y:-r,angle:Math.PI};d-=2*half;const a=-Math.PI/2-d/r;return {x:-half+r*Math.cos(a),y:r*Math.sin(a),angle:a-Math.PI/2};}
    for(const z of [-1.28,1.28]){
      box(3.9,.48,.52,[0,.67,z],frame,g,.12);
      for(const x of [-half,half]){axisCylinder(.43,.58,[x,.58,z],wear,g);for(const side of [-1,1]){axisCylinder(.28,.04,[x,.58,z+side*.32],steel,g);boltCircle(.21,[x,.58,z+side*.35],g,10);}for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const tooth=box(.10,.13,.6,[x+Math.sin(a)*.43,.58+Math.cos(a)*.43,z],frame,g);tooth.rotation.z=-a;}}
      for(let x=-1.35;x<1.5;x+=.45){axisCylinder(.23,.55,[x,.37,z],steel,g);axisCylinder(.09,.62,[x,.37,z],frame,g);}
      for(const x of [-1.2,0,1.2])axisCylinder(.12,.54,[x,.92,z],frame,g);
      for(let i=0;i<64;i++){const p=trackPoint(i/64*perimeter),shoe=group([p.x,p.y+.58,z],g);shoe.rotation.z=p.angle;box(perimeter/64*.91,.055,.78,[0,0,0],wear,shoe,.008);box(.036,.08,.76,[0,.055,0],steel,shoe);for(const dz of [-.21,.21])bolt([0,.04,dz],shoe,'y',.021);}
    }
    for(const z of [-.65,.65])box(3.2,.28,.3,[0,.8,z],frame,g);cyl(1.0,.2,[0,1.1,0],steel,g);cyl(.94,.18,[0,1.25,0],frame,g);
    const upper=group([0,1.35,0],g,true);box(3.8,.25,2.6,[-.25,.15,0],frame,upper,.05);
    box(1.35,1.22,2.55,[-1.65,.81,0],blue,upper,.27);box(1.4,1.0,1.48,[-.45,.73,.56],paint,upper,.12);box(1.5,.10,1.5,[-.45,1.28,.56],blue,upper,.035);
    for(const z of [-1.31,1.31]){box(1.1,.62,.025,[-1.65,.84,z],frame,upper,.05);for(let x=-2.12;x< -1.18;x+=.095)box(.022,.54,.03,[x,.84,z*1.015],steel,upper);}
    for(let x=-1.05;x<.05;x+=.12)box(.035,.03,1.1,[x,1.35,.54],frame,upper);
    cyl(.065,1.15,[-.9,1.65,.9],frame,upper);cyl(.10,.05,[-.9,2.25,.9],steel,upper);box(.52,.08,.4,[-.05,1.4,.7],frame,upper,.03);
    // Angled cab pillars and individual glass panes leave the seat and driver visible.
    const cab=group([.55,.3,-.62],upper);
    const cabinProfile=[[-.77,0],[.82,0],[.68,1.83],[.40,2.05],[-.64,2.05],[-.77,1.8]];
    box(1.6,.28,1.2,[0,.15,0],paint,cab,.05);box(1.48,.12,1.22,[-.07,2.04,0],blue,cab,.055);
    for(const side of [-1,1]){
      prism([[-.64,.48],[.66,.48],[.56,1.77],[.36,1.91],[-.59,1.91]],.018,[0,0,side*.59],glass,cab,0);
      for(let i=0;i<cabinProfile.length;i++){const a=cabinProfile[i],b=cabinProfile[(i+1)%cabinProfile.length];rod([a[0],a[1],side*.62],[b[0],b[1],side*.62],.038,paint,cab);}
      rod([-.18,.42,side*.62],[-.18,1.95,side*.62],.025,frame,cab);box(.24,.045,.05,[.24,.57,side*.65],frame,cab,.012);box(.65,.06,.26,[0,.1,side*.76],steel,cab);box(.58,.06,.24,[.07,-.17,side*.76],steel,cab);
    }
    const windshield=box(.018,1.35,1.08,[.70,1.2,0],glass,cab);windshield.rotation.z=.07;rod([.74,.6,-.35],[.71,1.46,.1],.015,frame,cab);
    box(.025,1.22,1.07,[-.73,1.22,0],glass,cab);box(.45,.12,.48,[-.2,.6,0],m.black,cab,.05);box(.14,.57,.48,[-.4,.94,0],m.black,cab,.04);
    box(.34,.46,.31,[-.16,.97,0],m.yellow,cab,.04);const head=mesh(new T.SphereGeometry(.105,16,12),m.skin,[-.12,1.34,0],cab);cyl(.13,.07,[-.12,1.44,0],paint,cab);for(const z of [-.17,.17]){rod([-.08,1.07,z],[.25,.85,z],.045,blue,cab);rod([-.1,.7,z],[.35,.38,z],.06,blue,cab);}
    for(const z of [-.85,.83])box(.12,.14,.22,[1.05,.45,z],lamp,upper,.02);box(.16,.1,.4,[.35,2.5,-.64],frame,upper,.015);for(const z of [-.76,-.52])box(.12,.07,.15,[.44,2.51,z],lamp,upper);
    rod([.65,1.8,-1.26],[1.3,1.83,-1.45],.025,frame,upper);box(.13,.28,.12,[1.3,1.7,-1.45],frame,upper,.035);
    for(const x of [-1.4,-.3])rod([x,.3,1.4],[x,1.7,1.4],.025,steel,upper);rod([-1.4,1.7,1.4],[-.3,1.7,1.4],.025,steel,upper);
    textPlate('AK BULUT',1.3,.25,[-1.55,.8,1.33],upper,'#eef2f4','#1c5894');
    const boom=group([.95,.8,.43],upper,true);
    const boomShape=[[-.22,-.23],[.35,-.33],[1.13,1.35],[2.9,3.33],[2.96,3.66],[2.61,3.85],[2.31,3.47],[.67,1.85],[.05,.28]];
    prism(boomShape,.48,[0,0,0],blue,boom,.035);for(const z of [-.27,.27])prism(boomShape,.045,[0,0,z],paint,boom,.01);hinge([0,0,0],.23,boom);hinge([2.8,3.55,0],.20,boom);
    const stick=group([2.8,3.55,0],boom,true);
    prism([[-.24,.12],[.12,.3],[.57,-.1],[2.43,-2.48],[2.25,-2.7],[1.95,-2.54],[.15,-.45]],.38,[0,0,0],blue,stick,.025);
    for(const z of [-.22,.22])prism([[-.18,.1],[.12,.23],[2.35,-2.49],[2.21,-2.6],[.08,-.4]],.035,[0,0,z],paint,stick,.01);
    const bucket=group([2.25,-2.5,0],stick,true);hinge([0,0,0],.18,bucket);
    // Open scoop: curved shell, thick cheeks, cutting edge, replaceable teeth.
    const shell=[[-.35,.13],[-.30,-.4],[.03,-.78],[.55,-.97],[1.24,-.91],[1.3,-.80],[.58,-.83],[.14,-.66],[-.15,-.34],[-.21,.1]];
    prism(shell,1.35,[0,0,0],wear,bucket,.012);
    for(const z of [-.70,.70])prism([[-.4,.12],[.1,.22],[1.25,-.84],[.55,-1.0],[0,-.83],[-.38,-.4]],.06,[0,0,z],steel,bucket,.015);
    box(.18,.14,1.52,[1.21,-.87,0],frame,bucket,.02);for(let z=-.6;z<=.61;z+=.3)prism([[1.15,-.78],[1.65,-.91],[1.18,-1.02]],.14,[0,0,z],steel,bucket,.018);
    for(const z of [-.45,.45]){rod([-.1,.12,z],[.3,.44,z],.055,blue,bucket);bolt([.3,.44,z],bucket);}
    const bucketTip=group([1.3,-.85,0],bucket,true),load=group([.45,-.54,0],bucket,true);
    for(let i=0;i<8;i++){const rock=mesh(rubble.geometries[i%4],rubble.material,[(i%2-.5)*.42,.05+Math.floor(i/4)*.2,(Math.floor(i/2)%2-.5)*.66],load);rock.scale.set(.28,.25,.29);rock.rotation.set(random()*.6,random()*6,random()*.6);}
    pipe([[0,.3,.35],[.7,1.9,.35],[2.5,3.55,.35]],.035,frame,boom);pipe([[0,.4,-.35],[.75,1.85,-.35],[2.6,3.55,-.35]],.025,frame,boom);
    pipe([[.2,.08,.3],[.9,-.7,.3],[1.8,-1.8,.3]],.027,frame,stick);
    const boomRams=[-.37,.37].map(z=>({z,move:hydraulic(upper,.09)})),stickRam=hydraulic(boom,.085),bucketRam=hydraulic(stick,.065);
    const a=new T.Vector3(),b=new T.Vector3(),inv=new T.Matrix4();
    function localPoint(object,point,parent,out){object.updateWorldMatrix(true,false);parent.updateWorldMatrix(true,false);inv.copy(parent.matrixWorld).invert();return out.set(...point).applyMatrix4(object.matrixWorld).applyMatrix4(inv);}
    function updateRams(){for(const ram of boomRams){a.set(.6,.3,.43+ram.z);localPoint(boom,[1.8,2.55,ram.z],upper,b);ram.move(a,b);}a.set(.7,2.2,.36);localPoint(stick,[.6,-.45,.36],boom,b);stickRam(a,b);a.set(.65,-.8,.3);localPoint(bucket,[.3,.44,.3],stick,b);bucketRam(a,b);}
    function pose(p){upper.rotation.y=p.slew;boom.rotation.z=p.boom;stick.rotation.z=p.stick;bucket.rotation.z=p.bucket;load.visible=p.bucketLoad>.03;load.scale.y=Math.max(.03,p.bucketLoad);updateRams();}
    const loadingPose=excavatorLoadingPose();
    function update(j){const p=j.index===0?quarryCycle(j.progress):{slew:-1.0,boom:-.35,stick:.22,bucket:-.8,bucketLoad:0,pouring:false};pose({...p,slew:p.slew+loadingPose.slew,boom:p.boom+loadingPose.boom-.1,stick:p.stick+loadingPose.stick-.12});return p;}
    update({index:0,progress:0});return {g,upper,boom,stick,bucket,bucketTip,update};
  }
  return {buildHauler,buildExcavator};
}
