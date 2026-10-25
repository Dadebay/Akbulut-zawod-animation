import {Vector3} from 'three';

export const WALK_BODY={radius:.27,height:1.78,eye:1.65,step:.26,speed:4.2,fast:8.4};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Construction primitives are sampled once, before render batching. A small
// horizontal grid keeps contact queries independent of the render mesh count.
export function createWalkPhysics({ground=-.06,bounds=[-215,250,-205,65]}={}){
  const cells=new Map(),dynamic=[],surfaces=[];let serial=0;
  function add(body){
    body.id=serial++;
    if(body.dynamic){dynamic.push(body);return body;}
    const reach=Math.hypot(body.hx,body.hz),step=8;
    for(let x=Math.floor((body.x-reach)/step);x<=Math.floor((body.x+reach)/step);x++)
      for(let z=Math.floor((body.z-reach)/step);z<=Math.floor((body.z+reach)/step);z++){
        const key=`${x}:${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(body);
      }
    return body;
  }
  function nearby(p,r=1){
    const found=new Set(dynamic);
    for(let x=Math.floor((p.x-r)/8);x<=Math.floor((p.x+r)/8);x++)
      for(let z=Math.floor((p.z-r)/8);z<=Math.floor((p.z+r)/8);z++)
        for(const b of cells.get(`${x}:${z}`)||[])found.add(b);
    return [...found].filter(b=>b.enabled!==false);
  }
  function local(p,b){const c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0),x=p.x-b.x,z=p.z-b.z;return {x:c*x-s*z,z:s*x+c*z,c,s};}
  function overlap(p,b,r=WALK_BODY.radius,height=WALK_BODY.height){
    if(b.enabled===false||p.y+height<=b.bottom+.015||p.y>=b.top-.015)return null;
    const q=local(p,b),cx=clamp(q.x,-b.hx,b.hx),cz=clamp(q.z,-b.hz,b.hz),dx=q.x-cx,dz=q.z-cz,d=Math.hypot(dx,dz);
    if(d>=r)return null;
    let nx,nz,depth;
    if(d>.00001){nx=dx/d;nz=dz/d;depth=r-d;}
    else{
      const a=b.hx-Math.abs(q.x),v=b.hz-Math.abs(q.z);
      if(a<v){nx=q.x<0?-1:1;nz=0;depth=a+r;}else{nx=0;nz=q.z<0?-1:1;depth=v+r;}
    }
    return {x:q.c*nx+q.s*nz,z:-q.s*nx+q.c*nz,depth};
  }
  function surfaceAt(p,b){
    const q=local(p,b);
    if(Math.hypot(Math.max(Math.abs(q.x)-b.hx,0),Math.max(Math.abs(q.z)-b.hz,0))>WALK_BODY.radius+.003)return null;
    return b.heightAt?b.heightAt(p.x,p.z):b.top;
  }
  function floorAt(p,maxY=p.y+WALK_BODY.step){
    let y=ground;
    for(const b of [...nearby(p),...surfaces]){
      if(b.enabled===false||b.walkable===false)continue;
      const top=surfaceAt(p,b);
      if(top!==null&&top<=maxY+.001&&top>y)y=top;
    }
    return y;
  }
  function clear(p){return !nearby(p).some(b=>b.solid!==false&&overlap(p,b));}
  function move(position,delta,dt){
    const p=position.clone(),steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.07),Math.ceil(dt/(1/120)));
    const sub=delta.clone().multiplyScalar(1/steps),subdt=dt/steps;
    for(let i=0;i<steps;i++){
      const before=p.clone();p.add(sub);
      p.x=clamp(p.x,bounds[0],bounds[1]);p.z=clamp(p.z,bounds[2],bounds[3]);
      const floor=floorAt(p,before.y+WALK_BODY.step);
      if(floor>p.y){const raised=p.clone();raised.y=floor;if(clear(raised))p.y=floor;}
      for(let pass=0;pass<4;pass++)for(const b of nearby(p)){
        if(b.solid===false)continue;
        const hit=overlap(p,b);if(hit){p.x+=hit.x*(hit.depth+.0001);p.z+=hit.z*(hit.depth+.0001);}
      }
      const support=floorAt(p,Math.max(before.y,p.y)+.02);
      // Short drops follow steps immediately; larger drops descend visibly.
      p.y=support>=p.y-.3?support:Math.max(support,p.y-5*subdt);
    }
    position.copy(p);return p;
  }
  function rayDistance(origin,direction,limit){
    let nearest=limit;
    const steps=Math.ceil(limit/2),found=new Set();
    for(let i=0;i<=steps;i++)nearby(origin.clone().addScaledVector(direction,limit*i/steps)).forEach(b=>found.add(b));
    for(const b of found){
      if(b.solid===false||b.enabled===false)continue;
      const p=local(origin,b),d=local({x:direction.x+b.x,z:direction.z+b.z},b);
      let low=0,high=nearest;
      for(const [o,v,min,max] of [[p.x,d.x,-b.hx,b.hx],[origin.y,direction.y,b.bottom,b.top],[p.z,d.z,-b.hz,b.hz]]){
        if(Math.abs(v)<1e-8){if(o<min||o>max){high=-1;break;}}
        else{const a=(min-o)/v,c=(max-o)/v;low=Math.max(low,Math.min(a,c));high=Math.min(high,Math.max(a,c));}
      }
      if(high>=low)nearest=Math.min(nearest,low);
    }
    return nearest;
  }
  return {add,nearby,overlap,move,clear,floorAt,rayDistance,addSurface:b=>surfaces.push(b),dynamic,get count(){return serial;}};
}

export function walkDelta(keys,yaw,dt){
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const v=new Vector3(right,0,-forward);
  if(v.lengthSq())v.normalize().applyAxisAngle(new Vector3(0,1,0),yaw).multiplyScalar(dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?WALK_BODY.fast:WALK_BODY.speed));
  return v;
}
