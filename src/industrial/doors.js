import {Vector3} from 'three';
import {WALK_BODY} from './walkPhysics.js';

export function createDoorMotion({open=false,duration=.8}={}){
  let progress=open?1:0,target=progress;
  return {get progress(){return progress;},get target(){return target;},toggle(){target=target?0:1;},
    update(dt,blocked=()=>false){
      const next=Math.max(0,Math.min(1,progress+Math.sign(target-progress)*Math.min(Math.abs(target-progress),dt/duration)));
      if(next===progress)return false;
      if(blocked(progress,next)){if(target===0)target=1;return false;}
      progress=next;return true;
    },
  };
}

export function buildWalkDoor(k,physics,{id,label,x,y,z,yaw,width,height,type='hinge',open=false},parent){
  const root=k.group([x,y,z],parent,true);root.rotation.y=yaw;root.name=`walk-door-${id}`;
  const panel=k.material(type==='roller'?'#becac8':'#b0c9cf',.2,.58),frame=k.material('#3f5e69',.45,.5);
  for(const xx of [-width/2-.045,width/2+.045])k.box(.09,height+.10,.14,[xx,height/2,0],frame,root);
  k.box(width+.18,.10,.14,[0,height+.05,0],frame,root);
  const motion=createDoorMotion({open,duration:type==='roller'||type==='slide'?1.7:.75}),leaves=[];
  const count=type==='double'?2:1,w=width/count;
  for(let i=0;i<count;i++){
    const sign=i===1?-1:1,px=i===1?width/2:-width/2;
    const pivot=k.group([type==='roller'||type==='slide'?0:px,0,0],root,true);
    const cx=type==='roller'||type==='slide'?0:sign*w/2;
    k.box(w-.025,height-.025,.075,[cx,height/2,0],panel,pivot);
    if(type==='roller')for(let yy=.2;yy<height;yy+=.28)k.box(w-.04,.018,.02,[cx,yy,.046],frame,pivot);
    else{
      k.box(w-.12,.075,.09,[cx,height*.64,0],frame,pivot);
      for(const side of [-1,1])k.box(.035,.28,.10,[cx+sign*(w/2-.15),1.04,side*.075],frame,pivot);
    }
    const body=physics.add({x:0,z:0,hx:w/2,hz:.045,bottom:y,top:y+height,yaw,dynamic:true,enabled:true,walkable:false,door:id});
    leaves.push({pivot,body,cx,sign,px});
  }
  const ease=t=>t*t*(3-2*t);
  function pose(t,commit=true){
    const angle=ease(t),out=[];
    for(const leaf of leaves){
      let a=0,lx=type==='roller'||type==='slide'?0:leaf.px,ly=0;
      if(type==='roller')ly=angle*(height+.12);
      else if(type==='slide')lx=angle*(width+.15);
      else a=-leaf.sign*angle*Math.PI*.51;
      const xx=lx+Math.cos(a)*leaf.cx,zz=-Math.sin(a)*leaf.cx,c=Math.cos(yaw),s=Math.sin(yaw);
      const body={...leaf.body,x:x+c*xx+s*zz,z:z-s*xx+c*zz,bottom:y+ly,top:y+ly+height,yaw:yaw+a};
      out.push(body);
      if(commit){leaf.pivot.position.set(lx,ly,0);leaf.pivot.rotation.y=a;Object.assign(leaf.body,body);}
    }
    return out;
  }
  pose(motion.progress);
  return {id,label,root,motion,leaves,point:new Vector3(x,y+Math.min(1.3,height/2),z),
    toggle:()=>motion.toggle(),
    update(dt,player,vehicles=[]){
      const changed=motion.update(dt,(from,to)=>{
        for(let i=1;i<=4;i++)for(const b of pose(from+(to-from)*i/4,false)){
          if(player&&physics.overlap(player,b,WALK_BODY.radius+.05))return true;
          for(const v of vehicles){
            if(v.enabled===false||v.top<b.bottom||v.bottom>b.top)continue;
            // Conservative sweep around vehicle corners, including the centre.
            const c=Math.cos(v.yaw||0),s=Math.sin(v.yaw||0);
            for(const dx of [-v.hx,0,v.hx])for(const dz of [-v.hz,0,v.hz])
              if(physics.overlap(new Vector3(v.x+c*dx+s*dz,v.bottom,v.z-s*dx+c*dz),b,.18,v.top-v.bottom))return true;
          }
        }
        return false;
      });
      if(changed)pose(motion.progress);return changed;
    },
  };
}
