import * as T from 'three';
import {rubbleAssets} from './rubble.js';

// Wheeled, articulated loader: bucket and cylinders share the same hinge geometry.
export function buildWheelLoader(k){
  const {m,box,cyl,rod,group,mesh}=k;
  const paint=k.material('#ecb21b',.28,.4),highlight=k.material('#f8c63b',.24,.38),steel=k.material('#69767f',.72,.43);
  const bucketSteel=k.material('#485158',.68,.64),wear=k.material('#a5aaa8',.78,.48),trim=k.material('#232b30',.15,.75);
  const glass=k.material('#779eac',.15,.23,{transparent:true,opacity:.43,depthWrite:false,side:T.DoubleSide});
  const sidewall=k.material('#343a3c',.02,.94),beacon=k.material('#ee9414',.15,.32,{emissive:'#c66c05',emissiveIntensity:.22});
  const g=group([0,0,0],k.scene,true),front=group([0,0,0],g,true),wheels=[];
  function axle(r,length,pos,mat,parent){const o=cyl(r,length,pos,mat,parent,undefined,24);o.rotation.x=Math.PI/2;return o;}
  function plate(points,width,pos,parent,mat=steel){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const bevel=Math.min(.025,width*.15),geometry=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,steps:1});geometry.translate(0,0,-width/2);return mesh(geometry,mat,pos,parent);}
  function pane(points,parent=g){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const window=mesh(geometry,glass,[0,0,0],parent);window.castShadow=false;for(let i=0;i<points.length;i++)rod(points[i],points[(i+1)%points.length],.035,trim,parent);return window;}
  box(3.1,.55,2.2,[-1.05,1.05,0],m.dark,g,.08);
  // Tapered engine hood and cast rear counterweight, with inset service panels.
  plate([[-3.05,1.18],[-3.02,2.04],[-2.78,2.35],[-1.72,2.48],[-1.58,2.2],[-1.58,1.2]],2.22,[0,0,0],g,paint);
  plate([[-3.2,.77],[-3.2,1.36],[-2.92,1.58],[-2.5,1.45],[-2.5,.73]],2.6,[0,0,0],g,paint);
  box(.10,.66,1.92,[-3.065,1.82,0],trim,g,.035);
  for(let z=-.84;z<=.85;z+=.12)box(.04,.58,.035,[-3.125,1.82,z],steel,g);
  for(const side of [-1,1]){
    box(1.05,.55,.045,[-2.2,1.98,side*1.125],trim,g,.025);
    for(let x=-2.65;x<-1.72;x+=.12)box(.045,.44,.035,[x,1.98,side*1.16],steel,g);
    for(const x of [-2.66,-1.74])for(const y of [1.65,2.31])axle(.028,.045,[x,y,side*1.16],wear,g);
    box(.23,.045,.055,[-1.84,1.65,side*1.165],trim,g);
    const code=k.textPlate('AKB · L01',.83,.18,[-2.16,1.5,side*1.13],g,'#23313b','#ecb21b');if(side<0)code.rotation.y=Math.PI;
    box(.13,.28,.5,[-3.24,1.12,side*.91],trim,g,.025);
    box(.035,.13,.31,[-3.315,1.17,side*.94],m.red,g);
    box(.035,.09,.15,[-3.315,1.02,side*1.01],beacon,g);
    rod([-3.18,.85,side*.62],[-3.32,.85,side*.62],.10,steel,g);
  }
  for(let z=-.48;z<=.5;z+=.25){const stripe=box(.02,.28,.10,[-3.215,1.1,z],trim,g);stripe.rotation.x=-.5;}
  cyl(.10,.9,[-2.17,2.83,-.72],trim,g);cyl(.16,.5,[-2.17,2.65,-.72],steel,g);
  k.pipe([[-2.17,3.2,-.72],[-2.17,3.34,-.72],[-2.35,3.37,-.72]],.095,trim,g);
  for(let y=2.47;y<2.88;y+=.1)k.ring(.163,.012,[-2.17,y,-.72],bucketSteel,g);
  cyl(.17,.48,[-2.17,2.68,.71],trim,g);cyl(.23,.12,[-2.17,2.96,.71],trim,g);
  // ROPS cab: sloped separate windows, door seals and visible interior fittings.
  box(2.02,.22,1.92,[-.55,1.56,0],paint,g,.045);
  box(1.86,.075,1.76,[-.55,1.72,0],trim,g);
  box(.65,.17,.68,[-.85,2.07,0],trim,g,.05);box(.18,.69,.67,[-1.11,2.43,0],trim,g,.045);
  box(.56,.17,.37,[-1.11,2.85,0],trim,g,.04);cyl(.13,.32,[-.85,1.87,0],steel,g);
  for(const z of [-.47,.47]){box(.55,.10,.15,[-.79,2.36,z],trim,g,.03);rod([-.53,2.38,z],[-.49,2.64,z],.025,steel,g);k.sphere(.047,[-.49,2.64,z],trim,g);}
  box(.32,.22,1.42,[.12,2.15,0],trim,g,.025);box(.10,.18,.28,[.30,2.24,.43],m.blueLight,g);
  rod([.08,1.85,0],[.08,2.48,0],.055,trim,g);
  const steering=k.ring(.23,.025,[.08,2.48,0],trim,g,'x');steering.rotation.z=-.35;
  for(const z of [-.22,.22])rod([.08,2.48,0],[.08,2.48,z],.016,steel,g);
  for(const z of [-.94,.94]){
    rod([-1.5,1.66,z],[-1.36,3.48,z],.065,paint,g);rod([.43,1.66,z],[.14,3.48,z],.065,paint,g);
    rod([-1.36,3.48,z],[.14,3.48,z],.055,paint,g);
    pane([[-1.43,1.94,z],[.35,1.94,z],[.13,3.39,z],[-1.36,3.39,z]]);
    box(1.74,.19,.075,[-.54,1.82,z],paint,g);
    rod([-.97,1.96,z*1.02],[-.97,3.37,z*1.02],.026,trim,g);
    box(.22,.055,.07,[-.18,2.04,z*1.04],steel,g,.01);
    for(const y of [2.05,2.95])box(.055,.16,.07,[-1.39,y,z*1.035],steel,g);
  }
  pane([[.35,1.94,-.87],[.35,1.94,.87],[.13,3.39,.87],[.13,3.39,-.87]]);
  pane([[-1.43,1.96,.85],[-1.43,1.96,-.85],[-1.35,3.38,-.85],[-1.35,3.38,.85]]);
  rod([.405,2.02,-.61],[.29,2.76,.14],.022,trim,g);rod([.29,2.62,.03],[.23,3.02,.37],.028,trim,g);
  box(2.14,.16,2.1,[-.6,3.55,0],paint,g,.065);box(1.93,.055,1.86,[-.6,3.655,0],highlight,g,.025);
  cyl(.14,.10,[-.79,3.76,0],trim,g);cyl(.105,.17,[-.79,3.89,0],beacon,g);k.sphere(.105,[-.79,3.975,0],beacon,g);
  for(const side of [-1,1]){
    box(.25,.18,.33,[.40,3.5,side*.78],trim,g,.025);box(.025,.115,.25,[.54,3.5,side*.78],m.light,g);
    box(.22,.16,.28,[-1.65,3.45,side*.78],trim,g,.02);box(.025,.10,.20,[-1.78,3.45,side*.78],m.light,g);
  }
  for(const side of [-1,1]){
    box(.9,.10,.44,[-.1,1.4,side*1.17],steel,g);
    for(let n=0;n<3;n++){
      const z=side*(1.63-n*.16),y=.49+n*.30;box(.72,.08,.31,[-.1,y,z],steel,g);
      for(let x=-.36;x<.24;x+=.1)box(.035,.025,.26,[x,y+.05,z],trim,g);
    }
    for(const x of [-.52,.33]){rod([x,.46,side*1.62],[x,1.43,side*1.13],.045,trim,g);k.pipe([[x,1.43,side*1.22],[x,2.35,side*1.22],[x,2.48,side*.99]],.035,trim,g);}
    k.pipe([[.12,3.22,side*.95],[.32,3.19,side*1.2],[.39,3.09,side*1.5]],.03,trim,g);
    box(.13,.41,.27,[.39,2.98,side*1.5],trim,g,.035);box(.016,.33,.20,[.315,2.98,side*1.5],wear,g,.01);
  }
  box(2.25,.5,1.7,[1.0,1.15,0],paint,front,.08);axle(.24,1.7,[0,1.16,0],steel,g);
  cyl(.20,.68,[.05,1.18,0],steel,g);cyl(.27,.08,[.05,1.55,0],trim,g);
  for(const z of [-.57,.57]){rod([-.5,1.12,z],[1.03,1.12,z*1.12],.075,steel,front);k.pipe([[-.4,1.5,z],[.1,1.65,z],[.65,1.52,z],[1.1,1.48,z]],.032,trim,front);}
  // Rounded tyre shoulders, recessed rims and paired chevron tread blocks.
  const tyreProfile=[[.45,-.28],[.58,-.34],[.72,-.32],[.82,-.24],[.87,-.11],[.87,.11],[.82,.24],[.72,.32],[.58,.34],[.45,.28],[.45,-.28]].map(([r,z])=>new T.Vector2(r,z));
  const tyreGeometry=new T.LatheGeometry(tyreProfile,k.tablet?24:36);tyreGeometry.rotateX(Math.PI/2);
  for(const x of [-1.75,1.65]){
    const parent=x<0?g:front;axle(.15,2.7,[x,.91,0],m.dark,parent);
    for(const side of [-1,1]){
      const wheel=group([x,.91,side*1.32],parent,true);wheel.userData.wheelKey='raw-loader-tyre';
      mesh(tyreGeometry,m.rubber,[0,0,0],wheel);axle(.46,.63,[0,0,0],paint,wheel);axle(.34,.65,[0,0,0],highlight,wheel);axle(.20,.72,[0,0,0],steel,wheel);
      for(const face of [-1,1]){k.ring(.445,.024,[0,0,face*.325],steel,wheel,'z');k.ring(.72,.015,[0,0,face*.309],sidewall,wheel,'z');}
      for(let i=0;i<22;i++)for(const half of [-1,1]){
        const a=i*Math.PI/11+half*.06,tread=box(.20,.085,.31,[Math.sin(a)*.869,Math.cos(a)*.869,half*.16],m.rubber,wheel,.012);
        tread.rotation.z=-a;tread.rotation.y=half*.50;
      }
      for(let i=0;i<10;i++){const a=i*Math.PI/5;axle(.035,.70,[Math.cos(a)*.29,Math.sin(a)*.29,0],wear,wheel);}
      axle(.025,.07,[.38,.05,side*.36],trim,wheel);wheels.push(wheel);
      const arch=[];
      for(let i=0;i<=10;i++){const a=.19*Math.PI+i*.62*Math.PI/10;arch.push([Math.cos(a)*1.06,Math.sin(a)*1.06]);}
      for(let i=10;i>=0;i--){const a=.19*Math.PI+i*.62*Math.PI/10;arch.push([Math.cos(a)*.98,Math.sin(a)*.98]);}
      plate(arch,.72,[x,.91,side*1.32],parent,paint);
      box(.07,.40,.64,[x-.89,1.24,side*1.32],trim,parent);
    }
  }
  const boom=group([.7,1.65,0],front,true);
  for(const z of [-.8,.8]){
    plate([[0,-.20],[.65,-.29],[1.65,-.34],[3.55,-.22],[4.3,-.20],[4.48,-.05],[4.35,.22],[3.6,.29],[1.7,.38],[.52,.28],[0,.22]],.23,[0,0,z],boom,paint);
    plate([[.36,-.14],[1.7,-.22],[3.4,-.12],[3.4,.14],[1.7,.26],[.36,.16]],.04,[0,0,z+Math.sign(z)*.145],boom,highlight);
    for(const [x,r] of [[0,.22],[2.35,.15],[4.3,.18]]){
      axle(r,.34,[x,0,z],steel,boom);axle(r*.65,.38,[x,0,z],paint,boom);
      axle(.045,.40,[x,0,z],trim,boom);
    }
    k.pipe([[.2,.34,z],[1.3,.44,z],[2.7,.37,z],[3.7,.31,z]],.035,m.black,boom);
    for(const x of [.7,1.8,2.8])box(.08,.11,.16,[x,.38,z],steel,boom);
    axle(.15,.34,[.15,1.05,z*.9],steel,front);
  }
  for(const x of [1.4,2.75])box(.28,.3,1.8,[x,0,0],paint,boom);
  const bucket=group([4.3,0,0],boom,true);
  // Curved steel shell with reinforced cheeks, heel ribs and replaceable teeth.
  plate([[-.32,.65],[-.42,.22],[-.38,-.04],[-.26,-.27],[.02,-.40],[1.31,-.40],[1.45,-.27],[.10,-.23],[-.10,-.17],[-.22,.03],[-.25,.25],[-.17,.65]],3.35,[0,0,0],bucket,bucketSteel);
  for(const z of [-1.72,1.72]){
    plate([[-.35,.66],[.12,.58],[1.43,-.26],[1.25,-.42],[.02,-.44],[-.27,-.29],[-.43,.10]],.11,[0,0,z],bucket,bucketSteel);
    plate([[-.30,.51],[-.35,.03],[-.17,-.25],[.95,-.31],[.10,.36]],.045,[0,0,z+Math.sign(z)*.085],bucket,steel);
  }
  for(const z of [-1.35,-.675,0,.675,1.35]){
    plate([[-.4,.55],[-.50,.18],[-.44,-.12],[-.26,-.40],[.22,-.47],[.28,-.40],[-.16,-.31],[-.33,-.08],[-.35,.5]],.09,[0,0,z],bucket,steel);
    const liner=box(1.14,.045,.19,[.62,-.205,z],wear,bucket);liner.rotation.z=-.035;
  }
  box(.25,.14,3.6,[1.35,-.32,0],wear,bucket);
  for(let z=-1.5;z<=1.51;z+=.5){
    plate([[1.3,-.23],[1.78,-.35],[1.31,-.43]],.18,[0,0,z],bucket,wear);
    cyl(.045,.06,[1.35,-.22,z],trim,bucket,undefined,6);
  }
  for(const z of [-1.5,-.75,0,.75,1.5])rod([-.26,.62,z],[-.26,.85,z],.025,steel,bucket);
  rod([-.26,.85,-1.65],[-.26,.85,1.65],.04,steel,bucket);
  const cargo=group([0,0,0],bucket,true),rubble=rubbleAssets(k);
  for(let i=0;i<18;i++){
    const layer=Math.floor(i/12),row=Math.floor(i/3)%4;
    const rock=mesh(rubble.geometries[i%4],rubble.material,[.06+(i%3)*.42,.12+layer*.36,-1.13+row*.74+layer*.22],cargo);
    rock.rotation.set(i*.31,i*.73,i*.19);rock.scale.set(.31+(i%3)*.03,.27+(i%2)*.06,.34);
  }
  const lip=group([1.25,-.3,0],bucket,true);
  function ram(parent,radius=.13){
    const body=cyl(radius,1,[0,0,0],paint,parent),shaft=cyl(radius*.5,1,[0,0,0],m.polished,parent);
    const gland=cyl(radius*1.18,.12,[0,0,0],steel,parent),heel=cyl(radius*1.1,.10,[0,0,0],trim,parent);
    for(const part of [body,shaft,gland,heel])part.userData.dynamic=true;
    const up=new T.Vector3(0,1,0),dir=new T.Vector3(),mid=new T.Vector3();
    const segment=(o,a,b)=>{dir.subVectors(b,a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=dir.length();o.quaternion.setFromUnitVectors(up,dir.normalize());};
    return (a,b)=>{mid.copy(a).lerp(b,.57);segment(body,a,mid);segment(shaft,mid,b);gland.position.copy(mid);gland.quaternion.copy(body.quaternion);heel.position.copy(a);heel.quaternion.copy(body.quaternion);};
  }
  const liftRams=[-.72,.72].map(z=>({z,move:ram(front)})),tiltRam=ram(boom,.11);
  const a=new T.Vector3(),b=new T.Vector3(),axis=new T.Vector3(0,0,1);
  function pose(lift,tilt,fill,steer=0){
    front.rotation.y=steer;boom.rotation.z=lift;bucket.rotation.z=tilt-lift;
    cargo.visible=fill>.01;cargo.scale.y=Math.max(.01,fill);
    for(const r of liftRams){a.set(.15,1.05,r.z);b.set(2.35,0,r.z).applyAxisAngle(axis,lift).add(boom.position);r.move(a,b);}
    a.set(2.6,.24,0);b.set(.04,.56,0).applyAxisAngle(axis,bucket.rotation.z).add(bucket.position);tiltRam(a,b);
  }
  pose(-.26,-.08,0);
  return {g,front,boom,bucket,cargo,lip,wheels,pose};
}
