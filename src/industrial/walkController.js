import {Vector3,Euler} from 'three';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {WALK_BODY,walkDelta} from './walkPhysics.js';

const editable=target=>target?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]');

export function createWalkController(camera,element,world,{onState,onInspect}={}){
  const controls=new PointerLockControls(camera,element),keys=new Set(),position=new Vector3(),safe=new Vector3();
  controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;controls.pointerSpeed=.8;
  let enabled=false,dragMode=false,drag=null,saved=null,target=null,message='',startId='new',lastStatus='',lastNotify=0;
  element.tabIndex=0;
  const active=()=>controls.isLocked||dragMode;
  const notify=()=>{
    const status={locked:active(),dragMode,region:world.region(position),interaction:target?(target.kind==='machine'?'Enjam barada maglumat':`${target.label} · ${target.motion.target?'Ýap':'Aç'}`):'',message};
    const signature=JSON.stringify(status);if(signature!==lastStatus){lastStatus=signature;onState?.(status);}
  };
  const stopDrag=()=>{if(drag&&element.hasPointerCapture?.(drag.id))element.releasePointerCapture(drag.id);drag=null;};
  const unlock=()=>{keys.clear();stopDrag();dragMode=false;element.style.cursor='';controls.unlock();notify();};
  function startDrag(){if(!enabled)return;controls.unlock();message='';dragMode=true;keys.clear();element.style.cursor='grab';element.focus({preventScroll:true});notify();}
  function look(dx,dy){const e=new Euler().setFromQuaternion(camera.quaternion,'YXZ');e.y-=dx;e.x=Math.max(-Math.PI/2+.12,Math.min(Math.PI/2-.12,e.x-dy));camera.quaternion.setFromEuler(e);}
  function pointerdown(e){if(!enabled||!dragMode||e.button!==0)return;e.preventDefault();element.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};element.setPointerCapture(e.pointerId);element.style.cursor='grabbing';}
  function pointermove(e){if(!drag||drag.id!==e.pointerId)return;look((e.clientX-drag.x)*.004,(e.clientY-drag.y)*.004);drag.x=e.clientX;drag.y=e.clientY;}
  function pointerup(){stopDrag();if(dragMode)element.style.cursor='grab';}
  function reset(id=startId){
    startId=id;const start=world.starts.find(s=>s.id===id)||world.starts[0];position.set(...start.position);
    position.y=world.physics.floorAt(position,position.y+.6);
    // A safe start cannot be assumed after a later model/layout edit.
    if(!world.physics.clear(position)){
      let found=false;
      for(let r=.5;r<5&&!found;r+=.5)for(let i=0;i<16&&!found;i++){
        const p=position.clone().add(new Vector3(Math.cos(i*Math.PI/8)*r,0,Math.sin(i*Math.PI/8)*r));p.y=world.physics.floorAt(p,p.y+.5);
        if(world.physics.clear(p)){position.copy(p);found=true;}
      }
    }
    safe.copy(position);camera.position.copy(position).add(new Vector3(0,WALK_BODY.eye,0));camera.rotation.set(0,start.yaw,0,'YXZ');keys.clear();target=null;notify();
  }
  function setEnabled(next,id='new'){
    if(enabled===next)return;enabled=next;keys.clear();world.setActive(next);
    if(next){
      saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,near:camera.near};
      camera.fov=65;camera.near=.08;camera.updateProjectionMatrix();reset(id);
    }else{
      unlock();target=null;if(saved){camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.fov=saved.fov;camera.near=saved.near;camera.updateProjectionMatrix();}
    }
    notify();
  }
  async function lock(){
    if(!enabled)return;message='';dragMode=false;
    if(!element.requestPointerLock){startDrag();return;}
    try{await element.requestPointerLock();}catch{startDrag();}
  }
  function interact(){
    if(!enabled||!active()||!target)return;
    if(target.kind==='machine'){const id=target.id;unlock();onInspect?.(id);}else target.toggle();notify();
  }
  function keydown(e){
    if(!enabled)return;
    if(e.code==='Escape'){unlock();return;}
    if(editable(e.target)||!active())return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyE'&&!e.repeat){e.preventDefault();interact();}
  }
  const keyup=e=>keys.delete(e.code),focusLost=()=>{if(enabled)unlock();},visibility=()=>{if(document.hidden)focusLost();};
  const changed=()=>{keys.clear();notify();};
  const error=()=>{if(enabled)startDrag();};
  controls.addEventListener('lock',changed);controls.addEventListener('unlock',changed);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',focusLost);
  document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerlockerror',error);
  element.addEventListener('pointerdown',pointerdown);element.addEventListener('pointermove',pointermove);element.addEventListener('pointerup',pointerup);element.addEventListener('pointercancel',pointerup);element.addEventListener('lostpointercapture',pointerup);
  function update(dt,now=0){
    if(!enabled)return false;
    const before=camera.position.clone();
    if(active()){
      look((Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.5,(Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')))*dt*1.1);
      const yaw=new Euler().setFromQuaternion(camera.quaternion,'YXZ').y;
      world.physics.move(position,walkDelta(keys,yaw,Math.min(dt,.1)),Math.min(dt,.1));
      if(position.y< -3||!Number.isFinite(position.y)){position.copy(safe);keys.clear();}
      else if(world.physics.clear(position))safe.copy(position);
      camera.position.copy(position);camera.position.y+=WALK_BODY.eye;
    }
    const direction=camera.getWorldDirection(new Vector3()),limit=3,occlusion=world.physics.rayDistance(camera.position,direction,limit);
    target=null;let score=Infinity;
    for(const item of [...world.doors,...world.equipmentTargets]){
      const offset=item.point.clone().sub(camera.position),distance=offset.length(),along=offset.dot(direction),away=Math.sqrt(Math.max(0,distance*distance-along*along));
      if(along>0&&distance<limit&&away<Math.min(.7,.2+distance*.17)&&along<occlusion+.4&&away<score){target=item;score=away;}
    }
    const doorsMoved=world.updateDoors(dt,position);
    if(now-lastNotify>100){notify();lastNotify=now;element.dataset.walkPosition=position.toArray().map(n=>n.toFixed(2)).join(',');element.dataset.walkRegion=world.region(position);}
    return doorsMoved||active()||before.distanceToSquared(camera.position)>1e-8;
  }
  return {setEnabled,reset,lock,startDrag,unlock,update,position,get enabled(){return enabled;},get locked(){return active();},
    dispose(){unlock();controls.dispose();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',focusLost);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerlockerror',error);element.removeEventListener('pointerdown',pointerdown);element.removeEventListener('pointermove',pointermove);element.removeEventListener('pointerup',pointerup);element.removeEventListener('pointercancel',pointerup);element.removeEventListener('lostpointercapture',pointerup);},
  };
}
