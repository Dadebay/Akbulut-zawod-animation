import * as T from 'three';
import {OLD_ENTRANCE,OLD_ENTRANCE_YAW,POND_APPROACH} from './siteLayout.js';

// Two successive checkpoints in the reference photographs: the named outer
// gateway, then the small security cabin at the old factory boundary.
export function buildOldEntrance(k){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const wall=material('#eeeae0',.04,.79),trim=material('#c7cbc4',.28,.59);
  const glass=material('#263e4c',.45,.24),glassLight=material('#3a5260',.42,.28);
  const gold=material('#bb9134',.66,.35),stone=material('#bdbbae',0,.94);
  const paving=m.road,paint=material('#e6e4d8',0,.88);

  function lettering(text,width,height,pos,parent){
    const canvas=document.createElement('canvas');
    canvas.width=text.length>25?4096:1024;canvas.height=192;
    const ctx=canvas.getContext('2d');
    let size=138;ctx.font=`600 ${size}px Arial`;
    while(ctx.measureText(text).width>canvas.width-48){size-=2;ctx.font=`600 ${size}px Arial`;}
    ctx.fillStyle='#c79c39';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(text,canvas.width/2,canvas.height/2+5);
    const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
    const mat=material('#ffffff',.4,.43,{map,alphaTest:.12,side:T.DoubleSide});
    const sign=mesh(new T.PlaneGeometry(width,height),mat,pos,parent);
    sign.rotation.y=-Math.PI/2;sign.castShadow=false;
    return sign;
  }

  function slabOutline(points,y,height,mat,parent){
    const shape=new T.Shape();
    points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});
    geo.rotateX(-Math.PI/2);
    return mesh(geo,mat,[0,y,0],parent);
  }

  function island(length,width,parent){
    // Rounded curb noses make the split into the two vehicle lanes readable.
    const radius=width/2,straight=length/2-radius,points=[];
    for(let i=0;i<=10;i++){
      const a=-Math.PI/2+i*Math.PI/10;
      points.push([straight+Math.cos(a)*radius,Math.sin(a)*radius]);
    }
    for(let i=0;i<=10;i++){
      const a=Math.PI/2+i*Math.PI/10;
      points.push([-straight+Math.cos(a)*radius,Math.sin(a)*radius]);
    }
    slabOutline(points,-.04,.23,stone,parent);
  }

  function forecourt(parent,halfLength,halfWidth,curbs=true){
    const roadHalf=POND_APPROACH.width/2;
    slabOutline([
      [-halfLength,-roadHalf],[-halfLength+4,-halfWidth],
      [halfLength-4,-halfWidth],[halfLength,-roadHalf],
      [halfLength,roadHalf],[halfLength-4,halfWidth],
      [-halfLength+4,halfWidth],[-halfLength,roadHalf]
    ],-.075,.035,paving,parent).castShadow=false;
    if(!curbs)return;
    for(const side of [-1,1])for(const dir of [-1,1]){
      const a=[dir*halfLength,.035,side*(roadHalf+.2)];
      const b=[dir*(halfLength-4),.035,side*(halfWidth+.2)];
      const dx=b[0]-a[0],dz=b[2]-a[2];
      const curb=box(Math.hypot(dx,dz),.19,.25,[(a[0]+b[0])/2,.035,(a[2]+b[2])/2],stone,parent);
      curb.rotation.y=-Math.atan2(dz,dx);
    }
  }

  function cabin(parent,{x=0,width=3.3,depth=2.7,height=2.85,roofFrame=false}={}){
    const g=group([x,.19,0],parent),front=-width/2;
    box(width,height,depth,[0,height/2,0],wall,g);
    box(width+.14,.38,depth+.14,[0,.19,0],wall,g);
    // Full-height corner glazing sits between a solid sill and roof fascia.
    const sill=.67,top=height-.34,glassHeight=top-sill;
    box(.045,glassHeight,depth-.18,[front-.026,(top+sill)/2,0],glass,g);
    for(const z of [-depth/2+.04,-depth/6,depth/6,depth/2-.04])
      box(.09,glassHeight+.08,.045,[front-.055,(top+sill)/2,z],trim,g);
    for(const side of [-1,1]){
      box(width-.18,glassHeight,.045,[0,(top+sill)/2,side*(depth/2+.026)],side===1?glassLight:glass,g);
      for(const xx of [-width/2+.04,-width/6,width/6,width/2-.04])
        box(.045,glassHeight+.08,.09,[xx,(top+sill)/2,side*(depth/2+.055)],trim,g);
      for(const yy of [sill-.035,top+.035])box(width+.12,.07,.09,[0,yy,side*(depth/2+.055)],wall,g);
    }
    for(const yy of [sill-.035,top+.035])box(.09,.07,depth+.12,[front-.055,yy,0],wall,g);
    // Door and rear window keep the cabin complete from the factory side too.
    box(.055,2.1,.94,[width/2+.03,1.13,-.48],trim,g);
    box(.025,1.38,.73,[width/2+.065,1.41,-.48],glass,g);
    rod([width/2+.1,.95,-.12],[width/2+.1,1.25,-.12],.018,m.steel,g);
    box(.04,1.35,.78,[width/2+.03,1.64,.69],glass,g);
    box(.6,.12,1.15,[width/2+.27,-.06,-.48],stone,g);
    box(width+.32,.26,depth+.32,[0,height+.04,0],wall,g);
    box(width-.12,.055,depth-.12,[0,height+.20,0],trim,g);
    for(const z of [-depth/2-.10,depth/2+.10])box(width+.34,.15,.09,[0,height+.24,z],wall,g);
    for(const xx of [-width/2-.10,width/2+.10])box(.09,.15,depth+.34,[xx,height+.24,0],wall,g);
    if(roofFrame){
      for(const xx of [-width/2+.16,width/2-.16])for(const zz of [-depth/2+.16,depth/2-.16])
        box(.12,.48,.12,[xx,height+.45,zz],wall,g);
      for(const zz of [-depth/2+.16,depth/2-.16])box(width+.02,.12,.16,[0,height+.73,zz],wall,g);
      for(const xx of [-width/2+.16,width/2-.16])box(.16,.12,depth+.02,[xx,height+.73,0],wall,g);
    }
    // A small light and camera under the front eave.
    box(.08,.07,.24,[front-.10,height-.13,0],m.light,g);
    const camera=box(.24,.09,.10,[front-.20,height-.19,-depth/2+.16],wall,g,.015);
    camera.rotation.z=-.18;
    return g;
  }

  function pedestrianGate(parent,z){
    const g=group([0,0,z],parent);
    box(3.6,.16,2.85,[0,-.01,0],stone,g);
    for(const side of [-1,1]){
      box(.53,2.8,.43,[0,1.4,side*1.02],wall,g);
      box(.67,.13,.58,[0,2.85,side*1.02],wall,g);
    }
    box(.65,.30,2.6,[0,2.72,0],wall,g);
    for(const z of [-.78,.78])box(.055,2.35,.045,[0,1.28,z],gold,g);
    for(const y of [.17,.45,2.15,2.43])box(.055,.045,1.60,[0,y,0],gold,g);
    for(let z=-.64;z<.7;z+=.16)rod([0,.18,z],[0,2.4,z],.014,gold,g);
    for(const y of [.72,1.3,1.88]){
      const diamond=box(.055,.46,.46,[-.02,y,0],gold,g);
      diamond.rotation.x=Math.PI/4;
      const inset=box(.065,.31,.31,[-.06,y,0],m.dark,g);
      inset.rotation.x=Math.PI/4;
    }
  }

  const outer=group([OLD_ENTRANCE.outerX,0,OLD_ENTRANCE.z]);
  outer.name='old-factory-named-entrance';outer.rotation.y=OLD_ENTRANCE_YAW;
  forecourt(outer,9,7.6);island(6.6,3.5,outer);
  cabin(outer,{x:-.35,width:3.45,depth:2.8,height:2.9});
  for(const side of [-1,1]){
    box(.95,.20,1.05,[0,.10,side*6.9],stone,outer);
    box(.78,5.1,.70,[0,2.55,side*6.9],wall,outer);
    box(.90,.14,.84,[0,5.02,side*6.9],wall,outer);
    // Short supports rise from the central cabin roof to the named pediment.
    box(.73,1.65,.45,[0,4.25,side*1.1],wall,outer);
    pedestrianGate(outer,side*9.2);
  }
  const pediment=new T.Shape();
  pediment.moveTo(-7.6,5.05);pediment.lineTo(7.6,5.05);
  pediment.lineTo(7.6,5.8);pediment.lineTo(0,7.35);pediment.lineTo(-7.6,5.8);pediment.closePath();
  const pedimentGeometry=new T.ExtrudeGeometry(pediment,{depth:.76,bevelEnabled:false});
  pedimentGeometry.translate(0,0,-.38);pedimentGeometry.rotateY(Math.PI/2);
  mesh(pedimentGeometry,wall,[0,0,0],outer);
  box(.86,.12,15.45,[0,5.07,0],wall,outer);
  for(const side of [-1,1]){
    const slope=box(.91,.13,Math.hypot(7.6,1.55)+.20,[0,6.575,side*3.8],wall,outer);
    slope.rotation.x=side*Math.atan2(1.55,7.6);
    const edge=box(.04,.055,Math.hypot(7.6,1.55)+.20,[-.472,6.59,side*3.8],trim,outer);
    edge.rotation.x=slope.rotation.x;
  }
  lettering('GURLUŞYK GURY GARYNDY MATERIALLARYNY ÖNDÜRÝÄN ZAWODY',14.2,.52,[-.402,5.49,0],outer);
  lettering('AK BULUT',2.3,.44,[-.403,6.04,0],outer);
  // Raised gold outline follows the cloud/infinity emblem on the photographed gate.
  const emblem=[[-.9,-.2],[-.96,0],[-.8,.25],[-.5,.34],[-.38,.62],[-.05,.73],[.26,.58],[.4,.3],[.65,.34],[.86,.13],[.88,-.18],[.68,-.39],[.35,-.4],[.02,-.23],[-.4,.02],[-.66,.02],[-.8,-.1],[-.67,-.28],[-.41,-.28],[-.2,-.18],[.05,-.33],[-.21,-.43],[-.61,-.45],[-.85,-.33]];
  const emblemPath=new T.CatmullRomCurve3(emblem.map(([u,v])=>new T.Vector3(-.45,6.62+v*.65,u)),true,'centripetal');
  mesh(new T.TubeGeometry(emblemPath,80,.06,6,true),gold,[0,0,0],outer);

  const inner=group([OLD_ENTRANCE.innerX,0,OLD_ENTRANCE.innerZ]);
  inner.name='old-factory-security-checkpoint';inner.rotation.y=OLD_ENTRANCE_YAW;
  // Keep the apron open where it meets the courtyard's transverse service lane.
  forecourt(inner,6.2,6.8,false);island(6,3.3,inner);
  cabin(inner,{width:3.0,depth:2.55,height:2.65,roofFrame:true});
  // The small checkpoint has two controlled lanes, without another tall arch.
  for(const side of [-1,1]){
    const gate=group([1.25,.20,side*1.72],inner);
    box(.42,.95,.38,[0,.475,0],wall,gate,.045);
    box(.44,.12,.41,[0,1.02,0],trim,gate,.025);
    const arm=group([0,.87,0],gate);
    arm.rotation.x=side*(side===1?-.96:-.05);
    box(.09,.13,3.1,[0,0,side*1.55],paint,arm);
    for(let dz=.35;dz<3.1;dz+=.6)box(.102,.142,.23,[0,0,side*dz],m.red,arm);
    // Reflective stop disc attached to the barrier arm.
    const disc=mesh(new T.CircleGeometry(.20,20),m.red,[side===1?-.062:.062,-.03,side*1.6],arm);
    disc.rotation.y=side===1?-Math.PI/2:Math.PI/2;
    box(.13,.008,2.9,[-2.7,-.011,side*3.48],paint,inner).castShadow=false;
    for(const dz of [6.15,7.75]){
      box(.28,1.55,.28,[0,.775,side*dz],wall,inner);
      box(.36,.11,.36,[0,1.58,side*dz],wall,inner);
    }
    for(const y of [.45,1.30])box(.055,.055,1.6,[0,y,side*6.95],trim,inner);
    for(let z=6.3;z<7.7;z+=.18)rod([0,.40,side*z],[0,1.35,side*z],.014,trim,inner);
  }
}
