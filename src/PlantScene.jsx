import {fitSunShadow} from './industrial/lighting.js';
import {bakeStaticAO} from './industrial/staticAO.js';
import {createRenderPipeline} from './industrial/renderPipeline.js';
import {loadSkyEnvironment} from './industrial/realism.js';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
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
import {createRenderClock,profilePixelRatio} from './renderBudget.js';
import {POND,OLD_ENTRANCE,OLD_PAVILION,OLD_RAIL_DORMITORY as DORM,OLD_WORK_OFFICE as OFFICE,RAIL_ACCESS_CROSSING as RAIL_GATE,PRODUCTION_ENTRANCE as ENTRY} from './industrial/siteLayout.js';
import {quarryPoint} from './industrial/quarryLayout.js';

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
  {name:'TIR MEÝDANÇASY',anchor:[-111,3,-25],position:[-158,56,14],target:[-111,1,-27]},
  {name:'ÇIG MAL',anchor:[45,5,14],position:[98,48,64],target:[48,1.5,14]},
  {name:'BALYK HOWUZY',anchor:[POND.x,2,POND.z],position:[POND.x-47,65,POND.z+49],target:[POND.x,0,POND.z]},
  {name:'ÝATAKHANA',anchor:[DORM.x,3,DORM.z],position:[DORM.x-8,20,DORM.z-22],target:[DORM.x,0,DORM.z]},
  {name:'NAHARHANA · OFIS',anchor:[OLD_PAVILION.hall.x-7,4,OLD_PAVILION.hall.z],position:[OLD_PAVILION.hall.x-15,21,OLD_PAVILION.hall.z-24],target:[OLD_PAVILION.hall.x-6,1.3,OLD_PAVILION.hall.z]},
];
export default function PlantScene({machines,selected,onSelect,view='perspective',area='site',equipmentFocus='BS',cameraRequest=0,roof=true,night=false,eco=false,paused=false,follow=false,speed=1,loopStep=null,journeyRequest,onJourney,onManualCamera,onProcess}){
  const host=useRef(),labels=useRef(),api=useRef(),state=useRef();
  const [failed,setFailed]=useState(false);state.current={eco,machines,selected,paused,roof,night,area,follow,speed,loopStep,journeyRequest,onJourney,onManualCamera,onProcess};
  // Only an explicit view selection restores a preset. Leaving the tour retains the user's camera.
  useEffect(()=>{api.current?.setCamera(area,view,equipmentFocus);},[area,view,equipmentFocus,cameraRequest]);
  useEffect(()=>{
    const container=host.current;let renderer;
    // Millimetre-separated roof seams and paving need stable depth at campus distances.
    try{renderer=new T.WebGLRenderer({antialias:false,alpha:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});}catch{setFailed(true);return;}
    renderer.setPixelRatio(profilePixelRatio(devicePixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=!TABLET;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;container.appendChild(renderer.domElement);
    let dirty=true,previousView='',lastSimulationTime=-1,lastLabelTime=0,lastProcessNotify=0;
    const scene=new T.Scene();scene.background=new T.Color('#dce4eb');scene.fog=new T.FogExp2('#dce4eb',.00075);
    const camera=new T.PerspectiveCamera(36,1,.5,2800);camera.position.set(...(PRESETS[state.current.area]||PRESETS.site).position);
    const pipeline=createRenderPipeline(renderer,scene,camera,{ambientOcclusion:!TABLET});
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...(PRESETS[state.current.area]||PRESETS.site).target);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=8;controls.maxDistance=1150;controls.maxPolarAngle=Math.PI/2.08;controls.minPolarAngle=.05;controls.enablePan=true;controls.zoomToCursor=true;
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.025);scene.environment=environment.texture;scene.environmentIntensity=.4;room.dispose();pmrem.dispose();
    // A real sky photograph lights and reflects the scene once it has loaded.
    let skyBackground=null,sunDirection=new T.Vector3(-.44,.82,.36).normalize();
    const stopSky=loadSkyEnvironment(renderer,scene,(hdr,direction)=>{skyBackground=hdr;if(hdr)environment.dispose();if(direction)sunDirection.copy(direction);renderer.shadowMap.needsUpdate=true;if(hdr&&!lastNight){scene.background=hdr;scene.backgroundIntensity=.9;}dirty=true;});
    const hemisphere=new T.HemisphereLight('#e9f2ff','#777467',.7);scene.add(hemisphere);
    const sun=new T.DirectionalLight('#fff5e9',2.4);sun.castShadow=true;sun.shadow.mapSize.set(TABLET?2048:4096,TABLET?2048:4096);scene.add(sun,sun.target);
    const fill=new T.DirectionalLight('#b7d4f1',.45);fill.position.set(30,30,-30);scene.add(fill);
    const k=createKit(scene,{tablet:TABLET});const production=buildProduction(k);production.root.position.set(8,0,-25);const logistics=buildLogistics(k,production.operators.map(o=>({...o,pos:[o.pos[0]+8,o.pos[1],o.pos[2]-25]})));const site=buildSite(k);const landscape=buildLandscape(k);const materialFlow=buildMaterialFlow(k,logistics),moveLogistics=createJourneyMotion(logistics,landscape.vehicleSurface);
    const oldInterior=buildOldCampusInterior(k,logistics.pallet);
    const birds=buildBirds(k),services=buildFactoryServices(k,production);
    const lighting=buildCampusLighting(k,{logistics,loader:materialFlow.loader,production,excavator:landscape});
    if(TABLET)bakeStaticAO(k);
    poolSurfaces(k);k.optimize({preserveRepeated:true});let updateBatches;
    let lastNight;
    function setTimeOfDay(night){
      scene.background=night||!skyBackground?new T.Color(night?'#101c30':'#dce4eb'):skyBackground;scene.fog.color.set(night?'#101c30':'#dce4eb');
      hemisphere.color.set(night?'#7e9dcb':'#e9f2ff');hemisphere.groundColor.set(night?'#2d3540':'#777467');hemisphere.intensity=night?.32:.3;
      sun.color.set(night?'#91b1da':'#fff5e9');sun.intensity=night?.16:2.4;
      fill.intensity=night?.12:.45;scene.environmentIntensity=night?.12:.45;renderer.toneMappingExposure=night?1.08:.86;
      lighting.setNight(night);container.dataset.timeOfDay=night?'night':'day';lastNight=night;dirty=true;
    }
    if(TABLET){
      // Reuse architectural shadows. Moving assemblies must not leave frozen shadows.
      function staticShadows(node,moving=false){moving=moving||!!node.userData.dynamic;if(node.isMesh&&moving)node.castShadow=false;node.children.forEach(child=>staticShadows(child,moving));}
      staticShadows(scene);
      for(const root of [site.roofs,site.structures])root.traverse(o=>{if(o.isMesh)o.castShadow=true;});
      renderer.shadowMap.needsUpdate=true;
    }
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
      setCamera(a,v,focus){
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
    let frame,clock=0,ambientClock=0,lastRequest=-1,lastStep=-1,wasFollowing=false,lastNotify=0,lastInterior;
    let width=1,height=1,lastMachines,active=new Map();
    let lastEco=state.current.eco,renderClock=createRenderClock(lastEco?30:60);
    const resetClock=()=>{renderClock.reset();dirty=true;};document.addEventListener('visibilitychange',resetClock);
    function resize(){dirty=true;({width,height}=container.getBoundingClientRect());pipeline.resize(width,height,profilePixelRatio(devicePixelRatio));camera.aspect=width/Math.max(height,1);camera.fov=width<600?61:36;camera.updateProjectionMatrix();}
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    const tmp=new T.Vector3(),haulCameraOffset=new T.Vector3();
    function animate(now){frame=requestAnimationFrame(animate);if(document.hidden)return;if(lastEco!==state.current.eco){lastEco=state.current.eco;renderClock=createRenderClock(lastEco?30:60);dirty=true;}const dt=renderClock.next(now);if(dt===null)return;const s=state.current,animateMotion=!s.paused&&!reduced.matches;
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
      const journey=journeyAt(clock),following=s.follow&&!manualCamera,showInterior=s.follow?(manualCamera?production.root.visible:journey.step.cutaway):!s.roof;
      const opacity=journeyOpacity(journey.time,{following,playing:animateMotion&&!blocked,loopStep:s.loopStep});
      renderer.domElement.style.opacity=opacity;labels.current.style.opacity=opacity;
      container.style.background=s.night?'#101c30':'#dce4eb';
      const equipmentPreview=showInterior&&!s.follow&&s.loopStep===null&&['process','lines'].includes(s.area);
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
      controls.dampingFactor=1-Math.pow(.92,dt*60);const cameraMoved=controls.update(dt);
      // The follow camera can cut across the bank while smoothing a bend even
      // when both endpoints are above ground. Keep its actual pose clear too.
      if(following&&journey.index===1){
        const floor=landscape.vehicleSurface(camera.position.x,camera.position.z)+2.5;
        if(camera.position.y<floor){camera.position.y=floor;camera.lookAt(controls.target);}
      }
      site.oldShells.forEach(shell=>{shell.visible=!showInterior;});site.roofs.visible=!showInterior;site.structures.visible=!showInterior;production.root.visible=showInterior;oldInterior.root.visible=showInterior;
      logistics.setTruckInteriorVisible(showInterior);
      if(TABLET&&lastInterior!==showInterior){renderer.shadowMap.needsUpdate=true;lastInterior=showInterior;}
      // Facade ventilation runs at a steady speed even when the tour is paused.
      const ventilationMoving=!showInterior&&!reduced.matches;
      if(ventilationMoving)site.updateVentilation(dt);
      if(!animateMotion&&!ventilationMoving&&!transition&&!cameraMoved&&!dirty&&!changed)return;
      if(cameraMoved||dirty||changed||animateMotion)k.updateDetailVisibility(camera);
      production.updateMotion(animateMotion?dt*s.speed:0,{preview:equipmentPreview,stage:journey.index,active,showInterior,showLines:s.area==='lines'&&showInterior});
      if(showInterior&&(now-lastProcessNotify>500||changed)){
        const boards=production.products.filter(p=>p.kind==='panel'&&p.object.visible&&p.batch);
        const sample=boards.find(p=>p.object.userData.materialState==='set-damp-board')||boards[0];
        s.onProcess?.({...production.physics.state,batch:sample?.batch?{...sample.batch}:null});lastProcessNotify=now;
      }
      // Ambient life has its own continuous clock: seeking or wrapping the
      // production tour must not teleport pedestrians, fish or the service car.
      logistics.humans.forEach(h=>{if(h.walking||active.get(h.zone)?.status==='running')h.update(ambientClock);});
      logistics.updateOldLife(ambientClock);logistics.traffic.update(ambientClock);birds.update(ambientClock);site.update(ambientClock);
      oldInterior.update(ambientClock);
      if(showInterior)services.update(ambientClock);
      k.windTime.value=ambientClock;lighting.update();
      if(now-lastNotify>180||changed){s.onJourney?.({index:journey.index,progress:journey.progress,blocked});lastNotify=now;}
      container.dataset.journeyStep=journey.step.id;container.dataset.truckLoads=journey.truckLoads;container.dataset.trainLoads=journey.trainLoads;
      if(cameraMoved||dirty||changed||now-lastLabelTime>100){lastLabelTime=now;camera.updateMatrixWorld();anchors.forEach(({label,point,zone,site:siteLabel,line:lineLabel})=>{tmp.copy(point).project(camera);label.style.transform=`translate(-50%,-100%) translate(${(tmp.x*.5+.5)*width}px,${(-tmp.y*.5+.5)*height}px)`;label.style.visibility=tmp.z>1||tmp.x< -1||tmp.x>1||tmp.y< -1||tmp.y>1||(siteLabel&&(['process','lines'].includes(s.area)||s.follow))||(lineLabel&&(s.area!=='lines'||!showInterior))||(!siteLabel&&!lineLabel&&(!showInterior||s.area==='lines'))?'hidden':'visible';if(zone){label.style.setProperty('--status',STATUSES[active.get(zone)?.status||'offline'].color);label.classList.toggle('is-selected',s.selected===`AKB-${zone}-001`);}});}
      updateBatches();camera.updateMatrixWorld();
      fitSunShadow(sun,camera,controls.target,sunDirection,{mapSize:TABLET?2048:4096});
      if(TABLET&&(cameraMoved||dirty||changed))renderer.shadowMap.needsUpdate=true;
      pipeline.update(camera.position.distanceTo(controls.target),s.night);pipeline.render();dirty=false;
    }
    frame=requestAnimationFrame(animate);
    return()=>{stopSky();stopTruckLoad();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resetClock);observer.disconnect();controls.removeEventListener('start',stopTransition);controls.dispose();k.dispose();environment.dispose();sun.shadow.dispose();pipeline.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();anchors.forEach(a=>a.label.remove());api.current=null;};
  },[]);
  return <div className="plant-scene" ref={host}><div className="scene-labels" ref={labels}/>{failed&&<div className="scene-fallback"><span>3D görnüş bu brauzerde elýeterli däl.</span><div>{ZONES.map(z=><button key={z.id} onClick={()=>onSelect(`AKB-${z.id}-001`)}>{z.name}<strong>120 enjam</strong></button>)}</div></div>}</div>;
}
