import * as T from 'three';
import {operatorGesture} from './campusLife.js';
import {pedestrianMotion} from './pedestrianMotion.js';

export function createWorkerBuilder(k){
  const {m,box,cyl,sphere,rod,group,mesh,material}=k;
  const fabric=material('#31475a',0,.95),trousers=material('#263b4b',0,.98);
  const vest=material('#d8ad35',0,.85),reflective=material('#d6dbcc',.15,.55);
  const helmetMat=material('#ecebe0',0,.55),boot=material('#282b2a',0,.93);
  const skins=['#c29c80','#b4876d','#d3ae91'].map(c=>material(c,0,.9));

  // Local +Z is the direction the person faces. Driver and pedestrian models
  // share adult proportions; the driver's hip/knee/elbow positions are seated.
  return function worker({parent=k.scene,position=[0,0,0],yaw=0,seated=false,seed=0,zone='GP',walk=null,work=null,hardHat=true}={}){
    walk=work?.walk||walk;
    const g=group(position,parent,!!walk),skin=skins[seed%skins.length];g.rotation.y=yaw;g.scale.setScalar(.9);
    const hipY=seated?1.10:.91,walkPose=walk?pedestrianMotion(walk):null,legs=[];
    const up=new T.Vector3(0,1,0),direction=new T.Vector3(),forward=new T.Vector3(),kneePoint=new T.Vector3();
    box(.31,.19,.23,[0,hipY,0],trousers,g,.055);
    for(const side of [-1,1]){
      const hip=[side*.095,hipY-.04,.01];
      const knee=seated?[side*.13,.96,.32]:[side*.11,.50,side*.014];
      const ankle=seated?[side*.14,.59,.39]:[side*.12,.15,side*.035];
      if(walk){
        const thigh=group([0,0,0],g,true),shin=group([0,0,0],g,true),shoe=group([0,0,0],g,true);
        cyl(.073,1,[0,0,0],trousers,thigh,.081,10);cyl(.054,1,[0,0,0],trousers,shin,.068,10);
        sphere(.069,[0,-.5,0],trousers,shin);
        box(.17,.12,.29,[0,-.0625,.055],boot,shoe,.04);
        box(.17,.025,.29,[0,-.1175,.055],m.black,shoe,.012);
        legs.push({hip:new T.Vector3(...hip),thigh,shin,shoe,ankle:new T.Vector3()});
      }else{
        rod(hip,knee,.078,trousers,g);sphere(.078,knee,trousers,g);
        rod(knee,ankle,.063,trousers,g);
        box(.17,.13,.29,[ankle[0],ankle[1]-.05,ankle[2]+.055],boot,g,.045);
        box(.17,.025,.29,[ankle[0],ankle[1]-.10,ankle[2]+.055],m.black,g,.02);
      }
      box(.11,.11,.025,[side*.165,hipY-.15,.065],fabric,g,.015);
    }
    const torso=group([0,hipY+.08,0],g,true);
    const shirt=cyl(.155,.41,[0,.19,0],fabric,torso,.205,12);shirt.scale.z=.68;
    const vestMesh=cyl(.162,.36,[0,.205,0],vest,torso,.21,12);vestMesh.scale.z=.72;
    for(const z of [-.137,.149]){
      box(.34,.035,.012,[0,.105,z],reflective,torso);
      for(const x of [-.105,.105])box(.031,.30,.015,[x,.23,z],reflective,torso);
    }
    box(.012,.34,.012,[0,.22,.157],m.dark,torso);
    for(const side of [-1,1])box(.067,.074,.018,[side*.067,.27,.158],fabric,torso,.008);
    cyl(.049,.07,[0,.43,0],skin,torso);
    const head=group([0,.535,.008],torso,true);
    const face=sphere(.113,[0,0,0],skin,head);face.scale.set(.83,1.18,.91);
    sphere(.024,[0,-.003,.102],skin,head);
    for(const side of [-1,1]){
      const ear=sphere(.025,[side*.098,-.006,0],skin,head);ear.scale.set(.55,1,.75);
      sphere(.008,[side*.036,.025,.096],m.dark,head);
      box(.030,.006,.009,[side*.035,.042,.096],fabric,head,.002);
    }
    box(.033,.006,.008,[0,-.050,.094],fabric,head,.002);
    if(hardHat){
    const shell=mesh(new T.SphereGeometry(.139,k.tablet?12:20,8,0,Math.PI*2,0,Math.PI/2),helmetMat,[0,.09,0],head);shell.scale.set(.96,.78,1.02);
    const brim=cyl(.153,.019,[0,.09,.01],helmetMat,head,undefined,24);brim.scale.z=1.06;
    box(.026,.025,.21,[0,.187,0],helmetMat,head,.01);
    for(const side of [-1,1])box(.022,.015,.13,[side*.064,.172,0],helmetMat,head,.006);
    }
    const arms=[];
    for(const side of [-1,1]){
      const arm=group([side*.215,.36,0],torso,true);
      const elbow=seated?[side*.03,-.23,.15]:[side*.026,-.27,.016];
      const hand=seated?[-side*.060,-.20,.46]:[side*.004,-.48,.055];
      sphere(.068,[0,0,0],fabric,arm);rod([0,0,0],elbow,.058,fabric,arm);
      sphere(.054,elbow,fabric,arm);rod(elbow,hand,.046,fabric,arm);
      const palm=sphere(.049,hand,skin,arm);palm.scale.set(.68,1.23,.70);
      sphere(.023,[hand[0]-side*.03,hand[1]-.012,hand[2]+.012],skin,arm);
      arms.push(arm);
    }
    if(seated){
      // Lap belt and buckle remain on the seat as the driver turns to look back.
      rod([-.18,hipY+.07,-.06],[.16,hipY+.07,.16],.025,m.black,g);
      box(.05,.045,.025,[.11,hipY+.07,.135],m.steel,g);
    }
    function limb(part,a,b){
      direction.subVectors(b,a);part.position.copy(a).add(b).multiplyScalar(.5);
      part.scale.y=direction.length();part.quaternion.setFromUnitVectors(up,direction.normalize());
    }
    function update(time,{lookBack=0,steer=0}={}){
      const gait=walkPose?.(time),walkAmount=gait?Math.min(1,gait.speed/.8):0;
      if(gait){
        g.position.copy(gait.position);g.rotation.y=gait.yaw;
        legs.forEach((leg,i)=>{
          const foot=gait.feet[i];leg.ankle.set(foot.x,.13+foot.lift,foot.z);
          direction.subVectors(leg.ankle,leg.hip);const distance=direction.length();direction.normalize();
          // Two fixed bone lengths solve the knee while the stance foot stays
          // planted in world space. Only the swing foot leaves the ground.
          const upper=.425,lower=.405,d=Math.min(upper+lower-.001,distance);
          const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
          forward.set(0,0,1).addScaledVector(direction,-direction.z).normalize();
          kneePoint.copy(leg.hip).addScaledVector(direction,along).addScaledVector(forward,height);
          limb(leg.thigh,leg.hip,kneePoint);limb(leg.shin,kneePoint,leg.ankle);
          leg.shoe.position.copy(leg.ankle);leg.shoe.rotation.y=foot.yaw;
        });
      }
      const breathe=Math.sin(time*.95+seed*1.7);
      torso.rotation.z=seated?breathe*.003:Math.sin(time*.22+seed)*.014;
      torso.rotation.x=seated?.045:-.012+breathe*.004;
      torso.rotation.y=seated?lookBack*.22:gait?Math.sin(gait.phase)*.045*walkAmount:Math.sin(time*.13+seed*.8)*.045;
      head.rotation.y=seated?lookBack*1.04-steer*.18:Math.sin(time*.25+seed*2.1)*.14;
      head.rotation.x=seated?-.045:Math.sin(time*.19+seed)*.025;
      const gesture=work&&gait?operatorGesture(time,seed,gait,work.panel):null;
      if(gesture){head.rotation.y=gesture.look;torso.rotation.y=gesture.look*.35;}
      arms.forEach((arm,i)=>{
        arm.rotation.x=seated?-.02*steer:gait?Math.cos(gait.phase+i*Math.PI)*.32*walkAmount:Math.sin(time*.38+seed+i*.4)*.025;
        if(gesture&&i===seed%2)arm.rotation.x+=gesture.hand;
        arm.rotation.z=seated?(i?1:-1)*steer*.035:(i?1:-1)*.035;
        // Keep the hands near the steering wheel while the torso looks behind.
        arm.rotation.y=seated?-torso.rotation.y*.8:0;
      });
    }
    update(0);
    return {g,zone,seed,walking:!!walk,update};
  };
}
