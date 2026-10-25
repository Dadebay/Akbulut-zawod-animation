import {bakeStaticAO} from './industrial/staticAO.js';
import {createRenderPipeline} from './industrial/renderPipeline.js';
import {createSunnyEnvironment} from './industrial/realism.js';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createKit} from './industrial/kit.js';
import {buildProduction,STATIONS} from './industrial/production.js';
import {buildLogistics} from './industrial/logistics.js';
import {buildOldCampusInterior} from './industrial/oldCampusInterior.js';
import {buildSite} from './industrial/site.js';
import {buildBirds} from './industrial/birds.js';
import {buildFactoryServices} from './industrial/factoryServices.js';
import {buildCampusLighting} from './industrial/campusLighting.js';
import {buildLandscape} from './industrial/landscape.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {createJourneyMotion} from './industrial/journeyMotion.js';
import {PROCESS_LINES,STATION_VIEWS} from './industrial/processPlan.js';
import {INTERIOR_VIEWS} from './industrial/interiorEquipment.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';
import {JOURNEY_STEPS,JOURNEY_STAGE as S,journeyAt,journeyOpacity} from './journey.js';
import {ZONES,STATUSES} from './data.js';
import {createRenderClock,createResolutionBudget,profilePixelRatio} from './renderBudget.js';
import {POND,OLD_ENTRANCE,OLD_PAVILION,OLD_RAIL_DORMITORY as DORM,OLD_WORK_OFFICE as OFFICE,RAIL_ACCESS_CROSSING as RAIL_GATE,PRODUCTION_ENTRANCE as ENTRY} from './industrial/siteLayout.js';
import {quarryPoint} from './industrial/quarryLayout.js';
import {createWalkWorld} from './industrial/walkWorld.js';
import {createWalkController} from './industrial/walkController.js';
import {WALK_STARTS} from './industrial/walkLayout.js';
import './walk.css';

// Normal desktop browser rendering uses full detail. Only the dedicated tablet
// build opts into lighter geometry and baked AO. No quality controls on screen.
const TABLET=import.meta.env.VITE_RENDER_PROFILE==='tablet';

const PRESETS={
  process:{position:[-101,99,113],target:[0,0,-1]},
  lines:{position:[0,178,55],target:[0,0,-2]},
  site:{position:[-290,235,250],target:[22,0,-56]},
  dispatch:{position:[-105,30,-106],target:[-32,2.0,-53]},
  oldsite:{position:[-96,60,-192],target:[25,2,-111]},
  oldInterior:{position:[43,46,-42],target:[31,1.5,-103]},
  oldoffice:{position:[OFFICE.x-21,18,OFFICE.z-16],target:[OFFICE.x,1.6,OFFICE.z]},
  pavilion:{position:[OLD_PAVILION.hall.x-15,21,OLD_PAVILION.hall.z-24],target:[OLD_PAVILION.hall.x-6,1.3,OLD_PAVILION.hall.z]},
  trucks:{position:[58,8,-65],target:[70,1.8,-43]},
  truckDetail:{position:[56.4,4.2,-49.5],target:[63.4,2,-43]},
  trainDetail:{position:[-90,6.5,-67],target:[-75,2.9,-53]},
  raw:{position:quarryPoint(-251,108,182),target:quarryPoint(24,16,-21)},
  rawyard:{position:[130,86,14],target:[130,1,-109]},
  railgate:{position:[RAIL_GATE.x+14,30,-82],target:[RAIL_GATE.x,0,-54.5]},
  pond:{position:[-224,113,-52],target:[OLD_ENTRANCE.outerX,0,OLD_ENTRANCE.z]},
};
const EQUIPMENT_VIEWS={...STATION_VIEWS,...Object.fromEntries(INTERIOR_VIEWS.map(v=>[v.id,v]))};
const SITE_VIEWS=[
  {name:'ÇIG MAL KÄNI · NUSGA',anchor:quarryPoint(3,9,4),position:quarryPoint(-28,30,49),target:quarryPoint(3,2,4)},
  {name:'DEMIR ÝOL',anchor:[20,4,-53],position:[-40,54,-133],target:[-20,2,-53]},
  {name:'ÝÜKLEME NOKADY',anchor:[25,7.5,-46.4],position:[-9,35,-110],target:[25,2.7,-43]},
  {name:'ÖNÜMÇILIK BINASY',anchor:[ENTRY.x,6.3,ENTRY.z],position:[ENTRY.x-3,6.8,ENTRY.z+14],target:[ENTRY.x,2.9,ENTRY.z+.6]},
  {name:'GIRIŞ MEÝDANÇASY',anchor:[-111,3,-25],position:[-158,56,14],target:[-111,1,-27]},
  {name:'ÇIG MAL',anchor:[45,5,14],position:[98,48,64],target:[48,1.5,14]},
  {name:'BALYK HOWUZY',anchor:[POND.x,2,POND.z],position:[POND.x-47,65,POND.z+49],target:[POND.x,0,POND.z]},
  {name:'ÝATAKHANA',anchor:[DORM.x,3,DORM.z],position:[DORM.x-8,20,DORM.z-22],target:[DORM.x,0,DORM.z]},
  {name:'NAHARHANA · OFIS',anchor:[OLD_PAVILION.hall.x-7,4,OLD_PAVILION.hall.z],position:[OLD_PAVILION.hall.x-15,21,OLD_PAVILION.hall.z-24],target:[OLD_PAVILION.hall.x-6,1.3,OLD_PAVILION.hall.z]},
];
export default function PlantScene({machines,selected,onSelect,view='perspective',area='site',equipmentFocus='BS',cameraRequest=0,roof=true,night=false,eco=false,paused=false,follow=false,speed=1,loopStep=null,journeyRequest,onJourney,onManualCamera,walking=false,onWalkExit}){
  const host=useRef(),labels=useRef(),api=useRef(),state=useRef();
  const [failed,setFailed]=useState(false),[walkStatus,setWalkStatus]=useState({locked:false,region:'',interaction:'',message:''});
  const [walkStart,setWalkStart]=useState('new');
  useEffect(()=>{if(walking)setWalkStart(['oldsite','oldoffice','pavilion'].includes(area)?'old':'new');},[walking,area]);
  state.current={eco,machines,selected,paused,roof,night,area,view,equipmentFocus,follow,speed,loopStep,journeyRequest,onJourney,onManualCamera,walking,onSelect};
  useEffect(()=>{if(selected)api.current?.unlockWalk();},[selected]);
  // Only an explicit view selection restores a preset. Leaving the tour retains the user's camera.
  useEffect(()=>{api.current?.setCamera(area,view,equipmentFocus);},[area,view,equipmentFocus,cameraRequest]);
  useEffect(()=>{
    const container=host.current;let renderer;
    // Millimetre-separated roof seams and paving need stable depth at campus distances.
    try{renderer=new T.WebGLRenderer({antialias:false,alpha:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});}catch{setFailed(true);return;}
    renderer.setPixelRatio(profilePixelRatio(devicePixelRatio));renderer.shadowMap.enabled=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;container.appendChild(renderer.domElement);
    let dirty=true,previousView='',lastSimulationTime=-1,lastLabelTime=0;
    const scene=new T.Scene();scene.background=new T.Color('#acd3ef');scene.fog=new T.FogExp2('#acd3ef',.00022);
    const camera=new T.PerspectiveCamera(36,1,.5,2800);camera.position.set(...(PRESETS[state.current.area]||PRESETS.site).position);
    const pipeline=createRenderPipeline(renderer,scene,camera,{ambientOcclusion:!TABLET});
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...(PRESETS[state.current.area]||PRESETS.site).target);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=8;controls.maxDistance=1150;controls.maxPolarAngle=Math.PI/2.08;controls.minPolarAngle=.05;controls.enablePan=true;controls.zoomToCursor=true;
    const environment=createSunnyEnvironment(renderer);scene.environment=environment.texture;
    const hemisphere=new T.HemisphereLight('#e9f2ff','#777467',.7);scene.add(hemisphere);
    const sun=new T.DirectionalLight('#fff8ed',3.2);sun.castShadow=false;sun.position.copy(environment.sunDirection).multiplyScalar(900);scene.add(sun,sun.target);
    const fill=new T.DirectionalLight('#b7d4f1',.45);fill.position.set(30,30,-30);scene.add(fill);
    const k=createKit(scene,{tablet:TABLET});const production=buildProduction(k);production.root.position.set(8,0,-25);const logistics=buildLogistics(k,production.operators.map(o=>({...o,pos:[o.pos[0]+8,o.pos[1],o.pos[2]-25]})));const site=buildSite(k);const landscape=buildLandscape(k);const materialFlow=buildMaterialFlow(k,logistics),moveLogistics=createJourneyMotion(logistics,landscape.vehicleSurface);
    // Enclosed feeds follow the cutaway even when exterior building widths change.
    production.root.attach(materialFlow.enclosed);
    const oldInterior=buildOldCampusInterior(k,logistics.pallet);
    const birds=buildBirds(k),services=buildFactoryServices(k,production);
    const lighting=buildCampusLighting(k,{logistics,loader:materialFlow.loader,production,excavator:landscape});
    const walkWorld=TABLET?null:createWalkWorld(k,{site,production,oldInterior,logistics,materialFlow});
    const walker=walkWorld?createWalkController(camera,renderer.domElement,walkWorld,{onState:setWalkStatus,onInspect:id=>state.current.onSelect(id)}):null;
    if(walkWorld){
      STATIONS.forEach(s=>walkWorld.equipmentTargets.push({kind:'machine',id:`AKB-${s.id}-001`,point:new T.Vector3(s.pos[0]+8,1.3,s.pos[2]-25)}));
      container.dataset.walkInventory=JSON.stringify(walkWorld.inventory);
    }
    if(TABLET)bakeStaticAO(k);
    poolSurfaces(k);k.optimize({preserveRepeated:true});let updateBatches;
    let lastNight;
    function setTimeOfDay(night){
      scene.background=night?new T.Color('#101c30'):environment.background;scene.backgroundIntensity=.45;
      scene.fog.color.set(night?'#101c30':'#acd3ef');scene.fog.density=night?.00075:.00022;
      hemisphere.color.set(night?'#7e9dcb':'#cce5ff');hemisphere.groundColor.set(night?'#2d3540':'#958b70');hemisphere.intensity=night?.32:.3;
      sun.color.set(night?'#91b1da':'#fff8ed');sun.intensity=night?.16:3.2;
      fill.intensity=night?.12:.18;scene.environmentIntensity=night?.12:.2;renderer.toneMappingExposure=night?1.08:.9;
      lighting.setNight(night);container.dataset.timeOfDay=night?'night':'day';lastNight=night;dirty=true;
    }
    // The new and old buildings no longer project the heavy, flattening sun
    // shadows. Clearing mesh flags before batching also combines more surfaces.
    scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
    updateBatches=batchAssemblies(k);
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
      lockWalk:()=>walker?.lock(),dragWalk:()=>walker?.startDrag(),unlockWalk:()=>walker?.unlock(),resetWalk:id=>{walker?.reset(id);dirty=true;},
      setCamera(a,v,focus){
        if(state.current.walking)return;
        manualCamera=false;
        const preset=(v==='detail'?(a==='trucks'?PRESETS.truckDetail:a==='dispatch'?PRESETS.trainDetail:a==='oldsite'?PRESETS.oldInterior:a==='process'?EQUIPMENT_VIEWS[focus||'BS']:a==='lines'?PROCESS_LINES.find(line=>line.id===focus):null):null)||PRESETS[a]||PRESETS.site;
        moveCamera({target:preset.target,position:v==='top'?[preset.target[0],a==='site'?350:a==='lines'?245:115,preset.target[2]+(a==='site'?21:7)]:preset.position});
      },
      focusSite(preset,immediate){
        manualCamera=true;state.current.onManualCamera?.({cutaway:production.root.visible});
        moveCamera(preset,immediate);
      },
    };
    const stopTransition=()=>{transition=false;manualCamera=true;state.current.onManualCamera?.({cutaway:production.root.visible});};controls.addEventListener('start',stopTransition);
    api.current.setCamera(state.current.area,view,equipmentFocus);
    let frame,clock=0,ambientClock=0,lastRequest=-1,lastStep=-1,wasFollowing=false,lastNotify=0,walkArea=null;
    let width=1,height=1,lastMachines,active=new Map();
    let lastEco=state.current.eco,renderClock=createRenderClock(lastEco?30:60),resolutionBudget=createResolutionBudget(30,.6),renderScale=1,renderRatio=0;
    const resetClock=()=>{renderClock.reset();resolutionBudget.reset();dirty=true;};document.addEventListener('visibilitychange',resetClock);
    function syncResolution(distance){
      // Wide views can shed pixels only after sustained frame pressure. A
      // close zoom always returns to the display's full pixel ratio.
      const scale=TABLET&&state.current.eco&&distance>180?renderScale:1;
      const next=profilePixelRatio(devicePixelRatio)*scale;
      if(Math.abs(next-renderRatio)>.01){renderRatio=next;pipeline.resize(width,height,next);dirty=true;}
    }
    function resize(){dirty=true;({width,height}=container.getBoundingClientRect());renderRatio=0;syncResolution(camera.position.distanceTo(controls.target));camera.aspect=width/Math.max(height,1);camera.fov=walker?.enabled?65:width<600?61:36;camera.updateProjectionMatrix();}
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    const tmp=new T.Vector3(),haulCameraOffset=new T.Vector3();
    function animate(now){frame=requestAnimationFrame(animate);if(document.hidden)return;if(lastEco!==state.current.eco){lastEco=state.current.eco;renderClock=createRenderClock(lastEco?30:60);resolutionBudget=createResolutionBudget(30,.6);renderScale=1;dirty=true;}const dt=renderClock.next(now);if(dt===null)return;const s=state.current;
      const walk=!!(s.walking&&walker);
      if(walker&&walker.enabled!==walk){
        if(walk)walkArea=s.area;
        transition=false;controls.enabled=!walk;manualCamera=walk;walker.setEnabled(walk,['oldsite','oldoffice','pavilion'].includes(s.area)?'old':'new');dirty=true;
        if(!walk&&s.area!==walkArea)api.current.setCamera(s.area,s.view,s.equipmentFocus);
        container.dataset.walking=String(walk);labels.current.style.display=walk?'none':'';
      }
      const walkMoved=walker?.update(dt,now)||false;
      const trafficHold=walk&&walkWorld.trafficBlocked(walker.position);
      container.dataset.walkTrafficHold=String(!!trafficHold);
      const animateMotion=!s.paused&&!reduced.matches&&!trafficHold;
      if(s.machines!==lastMachines){dirty=true;lastMachines=s.machines;active=new Map(ZONES.map(z=>[z.id,s.machines.find(m=>m.id===`AKB-${z.id}-001`)]));}
      const viewKey=`${s.area}:${s.roof}:${s.selected}:${s.paused}:${s.follow}:${s.night}:${s.loopStep}`;if(viewKey!==previousView){dirty=true;previousView=viewKey;}
      if(lastNight!==s.night)setTimeOfDay(s.night);
      if(animateMotion)ambientClock+=dt*s.speed;
      let changed=false,loopRestarted=false;
      if(s.journeyRequest&&s.journeyRequest.nonce!==lastRequest){lastRequest=s.journeyRequest.nonce;clock=JOURNEY_STEPS[s.journeyRequest.index].start+JOURNEY_STEPS[s.journeyRequest.index].duration*(s.journeyRequest.progress||0);changed=true;manualCamera=false;}
      const before=journeyAt(clock),blocked=active.get(before.step.zone)?.status!=='running';
      if(animateMotion&&!blocked){
        const repeat=Number.isInteger(s.loopStep)?JOURNEY_STEPS[s.loopStep]:null;
        if(repeat){
          const elapsed=Math.max(0,clock-repeat.start)+dt*s.speed;
          loopRestarted=elapsed>=repeat.duration;
          clock=repeat.start+elapsed%repeat.duration;
          if(loopRestarted)changed=true;
        }else clock+=dt*s.speed;
      }
      const journey=journeyAt(clock),following=!walk&&s.follow&&!manualCamera,showInterior=walk|| (s.follow?(manualCamera?production.root.visible:journey.step.cutaway):!s.roof);
      const opacity=journeyOpacity(journey.time,{following,playing:animateMotion&&!blocked,loopStep:s.loopStep});
      renderer.domElement.style.opacity=opacity;labels.current.style.opacity=opacity;
      container.style.background=s.night?'#101c30':'#dce4eb';
      const equipmentPreview=walk||showInterior&&!s.follow&&s.loopStep===null&&['process','lines'].includes(s.area);
      // Update the vehicles before following them, including the first frame
      // after a repeated step wraps back to its start.
      if(journey.time!==lastSimulationTime||dirty||changed||(equipmentPreview&&animateMotion)){
        lastSimulationTime=journey.time;
        production.lamps.forEach(l=>{const c=STATUSES[active.get(l.zone)?.status||'offline'].color;l.mat.color.set(c);l.mat.emissive.set(c);});
        moveLogistics(journey);materialFlow.update(journey,landscape,{showLines:s.area==='lines'&&showInterior,showInterior,active});
      }
      if(following&&(journey.index!==lastStep||!wasFollowing||changed)){
        targetPosition.set(...journey.step.position);targetLook.set(...journey.step.target);transition=true;
        if(reduced.matches){camera.position.copy(targetPosition);controls.target.copy(targetLook);transition=false;}
      }
      // Follow the moving quarry truck; manual orbit/zoom still takes control immediately.
      if(following&&journey.index===1){
        targetLook.set(-1.8,1.4,0).applyQuaternion(logistics.hauler.g.quaternion).add(logistics.hauler.g.position);
        haulCameraOffset.set(13,7.5,11).applyQuaternion(logistics.hauler.g.quaternion);
        targetPosition.copy(targetLook).add(haulCameraOffset);
        targetPosition.y=Math.max(targetPosition.y,landscape.vehicleSurface(targetPosition.x,targetPosition.z)+3);
        transition=true;
      }
      if(following&&journey.step.id==='carry'&&!changed&&journey.index===lastStep){
        const loader=materialFlow.loader.g;
        targetLook.set(1.8,1.9,0).applyQuaternion(loader.quaternion).add(loader.position);
        haulCameraOffset.set(11,8,13).applyQuaternion(loader.quaternion);
        targetPosition.copy(targetLook).add(haulCameraOffset);transition=true;
      }
      wasFollowing=following;lastStep=journey.index;
      if(loopRestarted&&following){camera.position.copy(targetPosition);controls.target.copy(targetLook);transition=false;}
      if(transition){
        const blend=reduced.matches?1:1-Math.exp(-dt*6);
        camera.position.lerp(targetPosition,blend);controls.target.lerp(targetLook,blend);
        if(camera.position.distanceTo(targetPosition)<.03&&controls.target.distanceTo(targetLook)<.03){camera.position.copy(targetPosition);controls.target.copy(targetLook);transition=false;}
      }
      controls.dampingFactor=1-Math.pow(.92,dt*60);const cameraMoved=walk?walkMoved:controls.update(dt);
      // The follow camera can cut across the bank while smoothing a bend even
      // when both endpoints are above ground. Keep its actual pose clear too.
      if(following&&journey.index===1){
        const floor=landscape.vehicleSurface(camera.position.x,camera.position.z)+2.5;
        if(camera.position.y<floor){camera.position.y=floor;camera.lookAt(controls.target);}
      }
      site.oldShells.forEach(shell=>{shell.visible=walk||!showInterior;});site.roofs.visible=walk||!showInterior;site.structures.visible=walk||!showInterior;production.root.visible=showInterior;oldInterior.root.visible=showInterior;
      logistics.setTruckInteriorVisible(showInterior&&!walk);
      // Facade ventilation runs at a steady speed even when the tour is paused.
      const ventilationMoving=!showInterior&&!reduced.matches;
      if(ventilationMoving)site.updateVentilation(dt);
      if(!animateMotion&&!ventilationMoving&&!transition&&!cameraMoved&&!dirty&&!changed)return;
      if(cameraMoved||dirty||changed||animateMotion)k.updateDetailVisibility(camera);
      production.updateMotion(animateMotion?dt*s.speed:0,{preview:equipmentPreview,stage:journey.index,active,showInterior,showLines:s.area==='lines'&&showInterior});
      // Ambient life has its own continuous clock: seeking or wrapping the
      // production tour must not teleport pedestrians, fish or the service car.
      logistics.humans.forEach(h=>{if(h.walking||active.get(h.zone)?.status==='running')h.update(ambientClock);});
      logistics.updateOldLife(ambientClock);logistics.traffic.update(ambientClock);birds.update(ambientClock);site.update(ambientClock);
      if(walk)walkWorld.syncVehicles(animateMotion?dt:0);
      oldInterior.update(ambientClock);
      if(showInterior)services.update(ambientClock);
      k.windTime.value=ambientClock;lighting.update();
      if(now-lastNotify>180||changed){s.onJourney?.({index:journey.index,progress:journey.progress,blocked});lastNotify=now;}
      container.dataset.journeyStep=journey.step.id;container.dataset.truckLoads=journey.truckLoads;container.dataset.trainLoads=journey.trainLoads;
      if(cameraMoved||dirty||changed||now-lastLabelTime>100){lastLabelTime=now;camera.updateMatrixWorld();anchors.forEach(({label,point,zone,site:siteLabel,line:lineLabel})=>{tmp.copy(point).project(camera);label.style.transform=`translate(-50%,-100%) translate(${(tmp.x*.5+.5)*width}px,${(-tmp.y*.5+.5)*height}px)`;label.style.visibility=tmp.z>1||tmp.x< -1||tmp.x>1||tmp.y< -1||tmp.y>1||(siteLabel&&(['process','lines'].includes(s.area)||s.follow))||(lineLabel&&(s.area!=='lines'||!showInterior))||(!siteLabel&&!lineLabel&&(!showInterior||s.area==='lines'))?'hidden':'visible';if(zone){label.style.setProperty('--status',STATUSES[active.get(zone)?.status||'offline'].color);label.classList.toggle('is-selected',s.selected===`AKB-${zone}-001`);}});}
      updateBatches();camera.updateMatrixWorld();
      const distance=walk?8:camera.position.distanceTo(controls.target);
      if(TABLET&&s.eco){const nextScale=resolutionBudget.sample(dt);if(nextScale!==null)renderScale=nextScale;}
      syncResolution(distance);
      pipeline.update(distance,s.night);pipeline.render();dirty=false;
    }
    frame=requestAnimationFrame(animate);
    return()=>{walker?.dispose();stopTruckLoad();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resetClock);observer.disconnect();controls.removeEventListener('start',stopTransition);controls.dispose();k.dispose();environment.dispose();sun.shadow.dispose();pipeline.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();anchors.forEach(a=>a.label.remove());api.current=null;};
  },[]);
  return <div className="plant-scene" ref={host}><div className="scene-labels" ref={labels}/>{walking&&!failed&&<>
    {walkStatus.locked?<div className="walk-hud"><span className="walk-location">{walkStatus.region}</span><span className="walk-reticle" aria-hidden="true"/>{walkStatus.interaction&&<span className="walk-interaction"><kbd>E</kbd>{walkStatus.interaction}</span>}<span className="walk-help"><kbd>W A S D</kbd> Ýöre <kbd>Shift</kbd> Çalt <kbd>← ↑ ↓ →</kbd> Bak <kbd>E</kbd> Aç / ýap <kbd>Esc</kbd> Menýu</span></div>:!selected&&<div className="walk-menu-shade"><div className="walk-menu" role="dialog" aria-modal="true" aria-labelledby="walk-title">
      <span className="walk-eyebrow">AK BULUT · PYÝADA GEZINTI</span><h2 id="walk-title">Zawodyň içinde gez</h2><p>Adamyň gözünden önümçiligi we binalary öwreniň.</p>
      <div className="walk-controls-guide"><span><kbd>W A S D / Shift</kbd> Ýöremek / çalt ýöremek</span><span><kbd>Trackpad / ← ↑ ↓ →</kbd> Basyp süýräň ýa-da ugur düwmeleri bilen bakyň</span><span><kbd>E</kbd> Gapyny açmak / ýapmak</span><span><kbd>Esc</kbd> Menýu</span></div>
      <label className="walk-start-label" htmlFor="walk-start">Başlangyç nokady</label><select id="walk-start" value={walkStart} onChange={e=>{setWalkStart(e.target.value);api.current?.resetWalk(e.target.value);}}>{WALK_STARTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
      {walkStatus.message&&<p className="walk-error" role="status">{walkStatus.message}</p>}
      <button className="walk-primary" onClick={()=>api.current?.dragWalk()}>Trackpad bilen başla <span>→</span></button><button className="walk-mouse-option" onClick={()=>api.current?.lockWalk()}>Syçan bilen başla</button><div className="walk-menu-actions"><button onClick={()=>api.current?.resetWalk(walkStart)}>Girişe dolan</button><button onClick={onWalkExit}>Umumy görnüşe dolan</button></div>
      <small>Klawiatura + trackpad ýa-da syçan · Içki ýerleşiş temsili</small>
    </div></div>}
  </>}{failed&&<div className="scene-fallback"><span>3D görnüş bu brauzerde elýeterli däl.</span><div>{ZONES.map(z=><button key={z.id} onClick={()=>onSelect(`AKB-${z.id}-001`)}>{z.name}<strong>120 enjam</strong></button>)}</div></div>}</div>;
}
