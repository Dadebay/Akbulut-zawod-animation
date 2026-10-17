import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createKit} from './industrial/kit.js';
import {buildProduction,STATIONS} from './industrial/production.js';
import {buildLogistics} from './industrial/logistics.js';
import {buildSite} from './industrial/site.js';
import {buildLandscape} from './industrial/landscape.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {createJourneyMotion} from './industrial/journeyMotion.js';
import {PROCESS_LINES,STATION_VIEWS} from './industrial/processPlan.js';
import {batchWheels} from './industrial/wheelInstancing.js';
import {JOURNEY_STEPS,JOURNEY_STAGE as S,journeyAt} from './journey.js';
import {ZONES,STATUSES} from './data.js';
import {createRenderClock,createResolutionBudget} from './renderBudget.js';

const TABLET=import.meta.env.VITE_RENDER_PROFILE==='tablet';

const PRESETS={
  process:{position:[-101,99,113],target:[0,0,-1]},
  lines:{position:[0,178,55],target:[0,0,-2]},
  site:{position:[-290,235,250],target:[22,0,-56]},
  dispatch:{position:[-105,30,-106],target:[-32,2.0,-53]},
  oldsite:{position:[-96,60,-192],target:[25,2,-111]},
  trucks:{position:[58,8,-65],target:[70,1.8,-43]},
  truckDetail:{position:[56.4,4.2,-49.5],target:[63.4,2,-43]},
  trainDetail:{position:[-90,6.5,-67],target:[-75,2.9,-53]},
  raw:{position:[-25,113,221],target:[250,21,18]},
  rawyard:{position:[265,74,-195],target:[171,1,-112]},
  pond:{position:[-224,113,-52],target:[-94,0,-151]},
};
const EQUIPMENT_VIEWS=STATION_VIEWS;
const SITE_VIEWS=[
  {name:'ÇIG MAL KÄNI · NUSGA',anchor:[229,14,43],position:[198,35,88],target:[229,7,43]},
  {name:'DEMIR ÝOL',anchor:[20,4,-53],position:[-40,54,-133],target:[-20,2,-53]},
  {name:'TIR MEÝDANÇASY',anchor:[-111,3,-25],position:[-158,56,14],target:[-111,1,-27]},
  {name:'ÇIG MAL',anchor:[45,5,14],position:[98,48,64],target:[48,1.5,14]},
  {name:'KABUL EDIŞ',anchor:[174,9,-107],position:[227,89,-39],target:[171,1,-113]},
  {name:'BALYK HOWZY',anchor:[-106,2,-107],position:[-153,65,-58],target:[-106,0,-107]},
];
export default function PlantScene({machines,selected,onSelect,view='perspective',area='site',equipmentFocus='BS',cameraRequest=0,roof=true,paused=false,follow=false,speed=1,journeyRequest,onJourney,onManualCamera}){
  const host=useRef(),labels=useRef(),api=useRef(),state=useRef();
  const [failed,setFailed]=useState(false);state.current={machines,selected,paused,roof,area,follow,speed,journeyRequest,onJourney,onManualCamera};
  // Only an explicit view selection restores a preset. Leaving the tour retains the user's camera.
  useEffect(()=>{api.current?.setCamera(area,view,equipmentFocus);},[area,view,equipmentFocus,cameraRequest]);
  useEffect(()=>{
    const container=host.current;let renderer;
    // Preserve depth precision for millimetre-scale surfaces even at campus zoom.
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});}catch{setFailed(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,TABLET?1:2));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=!TABLET;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;container.appendChild(renderer.domElement);
    let dirty=true,previousView='',lastSimulationTime=-1,lastLabelTime=0;
    const scene=new T.Scene();scene.background=new T.Color('#dce4eb');scene.fog=new T.Fog('#dce4eb',650,1900);
    const camera=new T.PerspectiveCamera(36,1,.15,2800);camera.position.set(...(PRESETS[state.current.area]||PRESETS.site).position);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...(PRESETS[state.current.area]||PRESETS.site).target);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=8;controls.maxDistance=570;controls.maxPolarAngle=Math.PI/2.08;controls.minPolarAngle=.05;controls.enablePan=true;
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.025);scene.environment=environment.texture;scene.environmentIntensity=.4;room.dispose();pmrem.dispose();
    scene.add(new T.HemisphereLight('#e9f2ff','#777467',.7));
    const sun=new T.DirectionalLight('#fff3df',2.0);sun.position.set(-110,170,65);sun.castShadow=true;sun.shadow.mapSize.set(TABLET?1024:4096,TABLET?1024:4096);Object.assign(sun.shadow.camera,{left:-160,right:160,top:160,bottom:-160,near:1,far:500});sun.shadow.normalBias=.08;sun.shadow.bias=-.0001;sun.shadow.radius=2;sun.target.position.set(-30,0,-35);scene.add(sun,sun.target);
    const fill=new T.DirectionalLight('#b7d4f1',.45);fill.position.set(30,30,-30);scene.add(fill);
    const k=createKit(scene,{tablet:TABLET});const production=buildProduction(k);production.root.position.set(8,0,-25);const logistics=buildLogistics(k,production.operators.map(o=>({...o,pos:[o.pos[0]+8,o.pos[1],o.pos[2]-25]})));const site=buildSite(k);const landscape=buildLandscape(k);const materialFlow=buildMaterialFlow(k,logistics),moveLogistics=createJourneyMotion(logistics,landscape.vehicleSurface);
    k.optimize();const updateWheels=batchWheels(k);
    if(TABLET){
      // Reuse architectural shadows. Moving assemblies must not leave frozen shadows.
      function staticShadows(node,moving=false){moving=moving||!!node.userData.dynamic;if(node.isMesh&&moving)node.castShadow=false;node.children.forEach(child=>staticShadows(child,moving));}
      staticShadows(scene);
      for(const root of [site.roofs,site.structures])root.traverse(o=>{if(o.isMesh)o.castShadow=true;});
      renderer.shadowMap.needsUpdate=true;
    }
    const stopTruckLoad=logistics.loadTruckModels(()=>{dirty=true;});
    const anchors=[];
    STATIONS.forEach(s=>{const label=document.createElement('button');label.className='scene-label industrial-label';label.innerHTML=`<span class="scene-dot"></span><strong>${s.id}-001</strong>`;label.setAttribute('aria-label',`${ZONES.find(z=>z.id===s.id).name}: AKB-${s.id}-001`);label.onclick=()=>onSelect(`AKB-${s.id}-001`);labels.current.appendChild(label);anchors.push({label,point:new T.Vector3(s.pos[0]+8,s.height,s.pos[2]-25),zone:s.id});});
    SITE_VIEWS.forEach(preset=>{
      const label=document.createElement('button');label.type='button';label.className='scene-site-label scene-site-link';label.textContent=preset.name;
      label.title=`${preset.name} · Ýakyndan gör`;label.setAttribute('aria-label',`${preset.name}: ýakyndan gör`);
      label.onclick=event=>{event.stopPropagation();api.current?.focusSite(preset,event.detail===0);};
      labels.current.appendChild(label);anchors.push({label,point:new T.Vector3(...preset.anchor),site:true});
    });
    PROCESS_LINES.forEach(line=>{const label=document.createElement('span');label.className='scene-site-label scene-line-label';label.textContent=line.name;label.style.setProperty('--line-color',line.color);labels.current.appendChild(label);anchors.push({label,point:new T.Vector3(...line.label),line:true});});
    let targetPosition=new T.Vector3(...PRESETS.process.position),targetLook=new T.Vector3(...PRESETS.process.target),transition=false,manualCamera=false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function moveCamera(preset,immediate=false){
      targetLook.set(...preset.target);targetPosition.set(...preset.position);dirty=true;
      transition=!(immediate||reduced.matches);
      if(!transition){camera.position.copy(targetPosition);controls.target.copy(targetLook);}
    }
    api.current={
      setCamera(a,v,focus){
        manualCamera=false;
        const preset=(v==='detail'?(a==='trucks'?PRESETS.truckDetail:a==='dispatch'?PRESETS.trainDetail:a==='process'?EQUIPMENT_VIEWS[focus||'BS']:a==='lines'?PROCESS_LINES.find(line=>line.id===focus):null):null)||PRESETS[a]||PRESETS.site;
        moveCamera({target:preset.target,position:v==='top'?[preset.target[0],a==='site'?350:a==='lines'?245:115,preset.target[2]+(a==='site'?21:7)]:preset.position});
      },
      focusSite(preset,immediate){
        manualCamera=true;state.current.onManualCamera?.({cutaway:production.root.visible});
        moveCamera(preset,immediate);
      },
    };
    const stopTransition=()=>{transition=false;manualCamera=true;state.current.onManualCamera?.({cutaway:production.root.visible});};controls.addEventListener('start',stopTransition);
    api.current.setCamera(state.current.area,view,equipmentFocus);
    let frame,clock=0,lastRequest=-1,lastStep=-1,wasFollowing=false,lastNotify=0,lastInterior;
    let width=1,height=1,lastMachines,active=new Map();
    const renderClock=createRenderClock(TABLET?60:Infinity),resolutionBudget=createResolutionBudget();
    const resetClock=()=>{renderClock.reset();resolutionBudget.reset();dirty=true;};document.addEventListener('visibilitychange',resetClock);
    const meter=import.meta.env.DEV&&new URLSearchParams(location.search).has('perf')?document.createElement('output'):null;
    let measuredAt=performance.now(),renderedFrames=0,workMs=0,drawMs=0;
    if(meter){meter.style.cssText='position:absolute;left:18px;top:110px;z-index:20;background:#fff;color:#16416b;padding:10px;font:12px monospace;pointer-events:none';container.appendChild(meter);}
    function resize(){dirty=true;({width,height}=container.getBoundingClientRect());renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.fov=width<600?61:36;camera.updateProjectionMatrix();}
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    const tmp=new T.Vector3(),haulCameraOffset=new T.Vector3();
    function animate(now){frame=requestAnimationFrame(animate);if(document.hidden)return;const dt=renderClock.next(now);if(dt===null)return;const workStart=performance.now();const s=state.current,animateMotion=!s.paused&&!reduced.matches;
      if(s.machines!==lastMachines){dirty=true;lastMachines=s.machines;active=new Map(ZONES.map(z=>[z.id,s.machines.find(m=>m.id===`AKB-${z.id}-001`)]));}
      const viewKey=`${s.area}:${s.roof}:${s.selected}:${s.paused}:${s.follow}`;if(viewKey!==previousView){dirty=true;previousView=viewKey;}
      let changed=false;
      if(s.journeyRequest&&s.journeyRequest.nonce!==lastRequest){lastRequest=s.journeyRequest.nonce;clock=JOURNEY_STEPS[s.journeyRequest.index].start+JOURNEY_STEPS[s.journeyRequest.index].duration*(s.journeyRequest.progress||0);changed=true;manualCamera=false;}
      const before=journeyAt(clock),blocked=active.get(before.step.zone)?.status!=='running';
      if(animateMotion&&!blocked)clock+=dt*s.speed;
      const journey=journeyAt(clock),following=s.follow&&!manualCamera,showInterior=s.follow?(manualCamera?production.root.visible:journey.step.cutaway):!s.roof;
      if(following&&(journey.index!==lastStep||!wasFollowing||changed)){
        targetPosition.set(...journey.step.position);targetLook.set(...journey.step.target);transition=true;
        if(reduced.matches){camera.position.copy(targetPosition);controls.target.copy(targetLook);transition=false;}
      }
      // Follow the moving quarry truck; manual orbit/zoom still takes control immediately.
      if(following&&journey.index===1){
        targetLook.set(-1.8,1.4,0).applyQuaternion(logistics.hauler.g.quaternion).add(logistics.hauler.g.position);
        haulCameraOffset.set(13,7.5,11).applyQuaternion(logistics.hauler.g.quaternion);
        targetPosition.copy(targetLook).add(haulCameraOffset);transition=true;
      }
      if(following&&journey.step.id==='carry'&&!changed&&journey.index===lastStep){
        const loader=materialFlow.loader.g;
        targetLook.set(1.8,1.9,0).applyQuaternion(loader.quaternion).add(loader.position);
        haulCameraOffset.set(11,8,13).applyQuaternion(loader.quaternion);
        targetPosition.copy(targetLook).add(haulCameraOffset);transition=true;
      }
      wasFollowing=following;lastStep=journey.index;
      if(transition){
        const blend=reduced.matches?1:1-Math.exp(-dt*6);
        camera.position.lerp(targetPosition,blend);controls.target.lerp(targetLook,blend);
        if(camera.position.distanceTo(targetPosition)<.03&&controls.target.distanceTo(targetLook)<.03){camera.position.copy(targetPosition);controls.target.copy(targetLook);transition=false;}
      }
      controls.dampingFactor=1-Math.pow(.92,dt*60);const cameraMoved=controls.update();
      site.roofs.visible=!showInterior;site.structures.visible=!showInterior;production.root.visible=showInterior;
      if(TABLET&&lastInterior!==showInterior){renderer.shadowMap.needsUpdate=true;lastInterior=showInterior;}
      if(!animateMotion&&!transition&&!cameraMoved&&!dirty&&!changed){resolutionBudget.reset();return;}
      if(cameraMoved||dirty||changed)k.updateDetailVisibility(camera);
      if(journey.time!==lastSimulationTime||dirty||changed){
      lastSimulationTime=journey.time;
      const running=zone=>animateMotion&&active.get(zone)?.status==='running';
      const stageFor={CR:[S.infeed,S.crush,S.calcine],TY:[S.crush,S.calcine,S.mix],BS:[S.calcine,S.mix],GR:[S.mix,S.form,S.pack],GK:[S.mix,S.form,S.pack],GP:[S.form,S.pack]};
      production.rotors.forEach(r=>{if((!showInterior&&r.zone!=='CR')||(!stageFor[r.zone].includes(journey.index)&&s.area!=='lines')||active.get(r.zone)?.status!=='running')return;const t=clock*r.speed;
        if(r.axis==='swing')r.object.rotation.y=r.base+Math.sin(t)*.8;else if(r.axis==='lift')r.object.position.y=r.base+Math.sin(t)*.4;else r.object.rotation[r.axis]=t;
      });
      const boardTime=s.area==='lines'?clock:Math.max(0,clock-JOURNEY_STEPS[S.form].start),bagTime=s.area==='lines'?clock:Math.max(0,clock-JOURNEY_STEPS[S.mix].start);
      if(showInterior){production.updateTransfers(boardTime,bagTime);production.products.forEach(p=>{
        const allowed=(s.area==='lines'||(p.kind==='bags'?[S.mix,S.form,S.pack]:[S.form,S.pack]).includes(journey.index))&&active.get(p.zone)?.status==='running';
        const elapsed=p.kind==='bags'?bagTime:boardTime,age=elapsed-p.delay,phase=age>=0?age%p.period:-1;
        p.object.visible=allowed&&phase>=0&&phase<=p.motion.duration+.4;
        if(p.object.visible){p.object.rotation.y=p.motion.pose(Math.min(phase,p.motion.duration),p.object.position);p.object.scale.y=p.fillTime?Math.min(1,.2+.8*phase/p.fillTime):1;}
      });}
      if(showInterior)production.flows.forEach(f=>{const visible=(s.area==='lines'||f.stages.includes(journey.index))&&active.get(f.zone)?.status==='running';f.dots.forEach((p,i)=>{p.visible=visible;p.position.copy(f.path.getPointAt((clock*.07+i/8)%1));});});
      production.lamps.forEach(l=>{const c=STATUSES[active.get(l.zone)?.status||'offline'].color;l.mat.color.set(c);l.mat.emissive.set(c);});
      logistics.humans.forEach(h=>{if(running(h.zone))h.update(clock);});
      moveLogistics(journey);materialFlow.update(journey,landscape,{showLines:s.area==='lines'&&showInterior,active});site.update(clock);
      }
      if(now-lastNotify>180||changed){s.onJourney?.({index:journey.index,progress:journey.progress,blocked});lastNotify=now;}
      container.dataset.journeyStep=journey.step.id;container.dataset.truckLoads=journey.truckLoads;container.dataset.trainLoads=journey.trainLoads;
      if(cameraMoved||dirty||changed||now-lastLabelTime>100){lastLabelTime=now;anchors.forEach(({label,point,zone,site:siteLabel,line:lineLabel})=>{tmp.copy(point).project(camera);label.style.transform=`translate(-50%,-100%) translate(${(tmp.x*.5+.5)*width}px,${(-tmp.y*.5+.5)*height}px)`;label.style.visibility=tmp.z>1||tmp.x< -1||tmp.x>1||tmp.y< -1||tmp.y>1||(siteLabel&&(['process','lines'].includes(s.area)||s.follow))||(lineLabel&&(s.area!=='lines'||!showInterior))||(!siteLabel&&!lineLabel&&(!showInterior||s.area==='lines'))?'hidden':'visible';if(zone){label.style.setProperty('--status',STATUSES[active.get(zone)?.status||'offline'].color);label.classList.toggle('is-selected',s.selected===`AKB-${zone}-001`);}});}
      updateWheels();const drawStart=performance.now();renderer.render(scene,camera);const drawEnd=performance.now();dirty=false;
      if(TABLET&&animateMotion&&!transition){const scale=resolutionBudget.sample(dt);if(scale!==null){renderer.setPixelRatio(Math.min(devicePixelRatio,scale));dirty=true;}}
      if(meter){workMs+=drawStart-workStart;drawMs+=drawEnd-drawStart;renderedFrames++;if(now-measuredAt>=1000){meter.textContent=`${TABLET?'TABLET':'DESKTOP'} · ${Math.round(renderedFrames*1000/(now-measuredAt))} FPS · ${(renderer.info.render.triangles/1e6).toFixed(2)}M triangles · ${renderer.info.render.calls} draws · CPU ${(workMs/renderedFrames).toFixed(1)}+${(drawMs/renderedFrames).toFixed(1)} ms · ${renderer.getPixelRatio().toFixed(2)}×`;renderedFrames=0;workMs=0;drawMs=0;measuredAt=now;}}
    }
    frame=requestAnimationFrame(animate);
    return()=>{stopTruckLoad();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resetClock);meter?.remove();observer.disconnect();controls.removeEventListener('start',stopTransition);controls.dispose();k.dispose();environment.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();anchors.forEach(a=>a.label.remove());api.current=null;};
  },[]);
  return <div className="plant-scene" ref={host}><div className="scene-labels" ref={labels}/>{failed&&<div className="scene-fallback"><span>3D görnüş bu brauzerde elýeterli däl.</span><div>{ZONES.map(z=><button key={z.id} onClick={()=>onSelect(`AKB-${z.id}-001`)}>{z.name}<strong>120 enjam</strong></button>)}</div></div>}</div>;
}
