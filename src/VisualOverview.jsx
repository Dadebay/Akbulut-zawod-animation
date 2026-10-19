import {useEffect,useState,lazy,Suspense} from 'react';
import {Box,Layers3,Pause,Play,SlidersHorizontal,Truck,Factory,TrainFront,Warehouse,Mountain,Route,RotateCcw,Repeat2,ZoomIn,Waves,Sun,Moon} from 'lucide-react';
import PlantScene from './PlantScene.jsx';
const FactoryPanels=lazy(()=>import('./FactoryPanels.jsx'));
import {assetUrl} from './assets.js';
import {JOURNEY_STEPS,JOURNEY_STAGE as S} from './journey.js';
import {STATIONS} from './industrial/production.js';
import {PROCESS_LINES} from './industrial/processPlan.js';
import {INTERIOR_VIEWS} from './industrial/interiorEquipment.js';
import {PROCESS_PHYSICS} from './industrial/processPhysics.js';

const AREAS=[['site','Zawod',Factory],['process','Enjamlar',Warehouse],['lines','Hatlar',Route],['dispatch','Otly',TrainFront],['trucks','TIR',Truck],['oldsite','Köne zawod',Factory],['raw','Çig mal',Mountain],['rawyard','Kabul ediş',Truck],['pond','Howuz',Waves]];
const EQUIPMENT=[...STATIONS,{id:'robot',name:'Robot'},...INTERIOR_VIEWS];
const initialArea=()=>{const requested=new URLSearchParams(location.search).get('area');return requested==='panels'?'panels':AREAS.some(([id])=>id===requested)?requested:'site';};
const initialEquipment=()=>{const id=new URLSearchParams(location.search).get('equipment');return EQUIPMENT.some(item=>item.id===id)?id:null;};
export default function VisualOverview({machines,production,history,selected,onSelect,view,setView,paused,setPaused,mode,error,onSettings,eco}) {
  const [equipmentFocus,setEquipmentFocus]=useState(()=>initialEquipment()||'BS'),[cameraRequest,setCameraRequest]=useState(0);
  const [area,setArea]=useState(initialArea),[roof,setRoof]=useState(()=>!['process','lines'].includes(initialArea())),[night,setNight]=useState(false);
  const [follow,setFollow]=useState(false),[speed,setSpeed]=useState(1),[journey,setJourney]=useState({index:0,progress:0,blocked:false}),[request,setRequest]=useState({index:0,nonce:0});
  const [loopStep,setLoopStep]=useState(null);
  const [processState,setProcessState]=useState(null);
  useEffect(()=>{if(initialArea()==='process'&&initialEquipment()){setView('detail');setPaused(false);}},[setView,setPaused]);
  const isScene=area!=='panels',step=JOURNEY_STEPS[journey.index];
  const showInterior=isScene&&(follow?step.cutaway:!roof);
  function seek(index,repeat=false){setLoopStep(repeat?index:null);setRequest(r=>({index,nonce:r.nonce+1}));setFollow(true);setPaused(false);}
  function releaseCamera(cutaway=step.cutaway){if(follow)setRoof(!cutaway);setFollow(false);}
  function chooseView(next){setFollow(false);setView(next);setCameraRequest(n=>n+1);}
  function startTour(){if(follow)releaseCamera();else seek(0);}
  function inspectEquipment(id){setLoopStep(null);const zone=EQUIPMENT.find(item=>item.id===id)?.zone||id;setArea('process');setEquipmentFocus(id);chooseView('detail');setRoof(false);setRequest(r=>({index:({CR:S.crush,TY:S.crush,BS:S.calcine,GR:S.mix,GK:S.form,GP:S.pack,robot:S.pack})[zone],progress:.2,nonce:r.nonce+1}));setPaused(false);}
  function inspectLine(line){setLoopStep(null);setEquipmentFocus(line.id);chooseView('detail');setRoof(false);setRequest(r=>({index:line.step,progress:.3,nonce:r.nonce+1}));setPaused(false);}
  function showArea(id){setLoopStep(null);if(id==='process'&&!EQUIPMENT.some(s=>s.id===equipmentFocus))setEquipmentFocus('BS');setFollow(false);setArea(id);setRoof(!['process','lines'].includes(id));chooseView(id==='lines'?'top':'perspective');if(id==='lines'){setRequest(r=>({index:S.form,progress:.3,nonce:r.nonce+1}));setPaused(false);}if(id==='trucks'||id==='dispatch'){setRequest(r=>({index:S.dispatch,nonce:r.nonce+1}));setPaused(true);}}
  return <section className="visual-overview">
    <div className={`visual-factory area-${area}${night?' is-night':''}`}>
      <div className="factory-toolbar">
      <div className="factory-areas">{AREAS.map(([id,title,Icon])=><button key={id} className={!follow&&area===id?'active':''} onClick={()=>showArea(id)}><Icon size={15}/>{title}</button>)}</div>
      {isScene&&<div className="factory-controls"><div className="view-switch lighting-switch" role="group" aria-label="Gündiz ýa-da gije"><button className={!night?'active':''} aria-pressed={!night} onClick={()=>setNight(false)}><Sun size={15}/>Gündiz</button><button className={night?'active':''} aria-pressed={night} onClick={()=>setNight(true)}><Moon size={15}/>Gije</button></div><div className="view-switch"><button className={view==='perspective'?'active':''} onClick={()=>chooseView('perspective')}><Box size={15}/>3D</button><button className={view==='top'?'active':''} onClick={()=>chooseView('top')}><Layers3 size={15}/>Üstden</button>{['trucks','dispatch','process','oldsite'].includes(area)&&<button className={view==='detail'?'active':''} aria-label={area==='process'?'Enjamyň ýakyn görnüşi':area==='oldsite'?'Köne zawodyň içi':'Ulagyň ýakyn görnüşi'} onClick={()=>{if(area==='process')inspectEquipment(equipmentFocus);else {if(area==='oldsite')setRoof(false);chooseView('detail');}}}><ZoomIn size={15}/>Ýakyn</button>}</div><button className={`icon-button bordered ${!showInterior?'active':''}`} aria-label={showInterior?'Üçegi görkez':'Üçegi gizle'} onClick={()=>{setFollow(false);setRoof(showInterior);}}><Warehouse size={17}/></button><button className="icon-button bordered" aria-label={paused?'Hereketi dowam et':'Hereketi sakla'} onClick={()=>setPaused(!paused)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button className="icon-button bordered" aria-label="Görkeziş sazlamalary" onClick={onSettings}><SlidersHorizontal size={17}/></button></div>}
      </div>
      {isScene?<PlantScene eco={eco} night={night} area={area} cameraRequest={cameraRequest} equipmentFocus={equipmentFocus} roof={roof} machines={machines} selected={selected} onSelect={onSelect} view={view} paused={paused} follow={follow} speed={speed} loopStep={loopStep} journeyRequest={request} onJourney={setJourney} onProcess={setProcessState} onManualCamera={({cutaway})=>releaseCamera(cutaway)}/>:<Suspense fallback={<div className="scene-fallback">Ýüklenýär…</div>}><FactoryPanels machines={machines} production={production} history={history} mode={mode}/></Suspense>}
      {showInterior&&area!=='oldsite'&&processState&&<details className="process-physics-readout">
        <summary>Nusga fizika · {processState.waitingForDryer?'Guramagyna garaşylýar':`${Math.round(processState.calcinerC)} °C`}</summary>
        <p>Peç: <b>{Math.round(processState.calcinerC)} °C</b> · Sowadyş: <b>{Math.round(processState.coolerC)} °C</b><br/>Guradyjynyň howasy: <b>{Math.round(processState.dryerAirC)} °C</b></p>
        {processState.batch&&<p>Bir panel: <b>{processState.batch.stuccoKg.toFixed(1)} kg</b> gips<br/>Baglanan suw: <b>{processState.batch.boundWaterKg.toFixed(2)} kg</b><br/>Erkin suw: <b>{processState.batch.freeWaterKg.toFixed(2)} kg</b><br/>Bug: <b>{processState.batch.evaporatedKg.toFixed(2)} kg</b></p>}
        <small>Çaklama parametrler. Tesis ölçegi däl. Ýylylyk we himiýa wagty {PROCESS_PHYSICS.thermalTimeScale}× gysgaldylan.</small>
      </details>}
      {showInterior&&area!=='oldsite'&&(follow||area!=='lines')&&<div className="equipment-picker" aria-label="Enjamy ýakyndan gör">{EQUIPMENT.map(s=><button key={s.id} className={!follow&&view==='detail'&&equipmentFocus===s.id?'active':''} onClick={()=>inspectEquipment(s.id)}><span>{s.id==='robot'?'GP-02':s.zone||s.id}</span>{s.name}</button>)}</div>}
      {showInterior&&area==='lines'&&!follow&&<div className="equipment-picker process-line-picker" aria-label="Önümçilik liniýalary">{PROCESS_LINES.map(line=><button key={line.id} title={line.name} style={{'--line-color':line.color}} className={view==='detail'&&equipmentFocus===line.id?'active':''} onClick={()=>inspectLine(line)}><i/>{line.short}</button>)}</div>}
      {isScene&&<div className="journey-panel">
        <div className="journey-heading"><button className={`journey-follow ${follow?'active':''}`} onClick={startTour}><Route size={16}/>{follow?'Erkin görnüş':'Akymy görkez'}</button><span className="journey-caption"><strong>{String(journey.index+1).padStart(2,'0')} · {step.title}</strong><span>{step.caption}</span></span><span className="journey-mode">{loopStep!==null&&<button className="journey-loop" aria-label="Ädimi gaýtalamagy bes et" title="Ädimi gaýtalamagy bes et" onClick={()=>setLoopStep(null)}><Repeat2 size={13}/>GAÝTALANÝAR</button>}{journey.blocked?'Enjam garaşylýar':paused?'DURUZYLDY':'NUSGA AKYM'}</span><button className="journey-speed" aria-label="Görkeziş tizligi" onClick={()=>setSpeed(s=>s===1?2:s===2?4:1)}>{speed}×</button><button className="icon-button" aria-label="Akymy täzeden başlat" onClick={()=>seek(0)}><RotateCcw size={14}/></button></div>
        <div className="journey-steps" style={{'--journey-count':JOURNEY_STEPS.length}}>{JOURNEY_STEPS.map((s,i)=><button key={s.id} className={`${i===journey.index?'active ':''}${i<journey.index?'done ':''}${loopStep===i?'looping':''}`} aria-label={`${String(i+1).padStart(2,'0')} ${s.title}${loopStep===i?' · Gaýtalanýar':''}`} title="Iki gezek bas: diňe şu ädimi gaýtala" aria-current={i===journey.index?'step':undefined} onClick={()=>seek(i)} onDoubleClick={()=>seek(i,true)}><span className="journey-number">{String(i+1).padStart(2,'0')}</span><span>{s.short}</span>{loopStep===i&&<Repeat2 className="journey-repeat-icon" size={12} aria-hidden="true"/>}<i style={{transform:`scaleX(${i<journey.index?1:i===journey.index?journey.progress:0})`}}/></button>)}</div>
      </div>}
      {isScene&&<div className="model-credit">3D TIR: <a href="https://www.artec3d.com/3d-models/semi-trailer-truck" target="_blank" rel="noreferrer">Artec 3D</a> · <a href={assetUrl('models/ATTRIBUTION.txt')} target="_blank" rel="noreferrer">CC BY 3.0 · uýgunlaşdyryldy</a></div>}
    </div>
  </section>;
}
