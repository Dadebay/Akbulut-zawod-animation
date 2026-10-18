import {useState} from 'react';
import {Box,Layers3,Pause,Play,SlidersHorizontal,Truck,Factory,TrainFront,Warehouse,Mountain,Route,RotateCcw,ZoomIn,Monitor,Waves,Sun,Moon} from 'lucide-react';
import PlantScene from './PlantScene.jsx';
import FleetMap from './FleetMap.jsx';
import FactoryPanels from './FactoryPanels.jsx';
import {assetUrl} from './assets.js';
import {JOURNEY_STEPS,JOURNEY_STAGE as S} from './journey.js';
import {STATIONS} from './industrial/production.js';
import {PROCESS_LINES} from './industrial/processPlan.js';

const AREAS=[['site','Zawod',Factory],['process','Enjamlar',Warehouse],['lines','Hatlar',Route],['dispatch','Otly',TrainFront],['trucks','TIR',Truck],['oldsite','Köne zawod',Factory],['raw','Çig mal',Mountain],['rawyard','Kabul ediş',Truck],['pond','Howuz',Waves],['panels','Paneller',Monitor]];
const PHOTOS=[['aerial','Hakyky görnüş'],['220','Taslama · 01'],['224','Taslama · 02'],['225','Taslama · 03'],['226','Meýilnama'],['227','Umumy meýdan'],['process-plan','Önümçilik hatlary']];
const EQUIPMENT=[...STATIONS,{id:'robot',name:'Robot'}];
export default function VisualOverview({machines,production,history,selected,onSelect,view,setView,paused,setPaused,mode,error,onSettings}) {
  const [equipmentFocus,setEquipmentFocus]=useState('BS'),[cameraRequest,setCameraRequest]=useState(0);
  const [area,setArea]=useState('site'),[roof,setRoof]=useState(true),[photo,setPhoto]=useState('aerial'),[night,setNight]=useState(false);
  const [follow,setFollow]=useState(false),[speed,setSpeed]=useState(1),[journey,setJourney]=useState({index:0,progress:0,blocked:false}),[request,setRequest]=useState({index:0,nonce:0});
  const isScene=!['map','reference','panels'].includes(area),step=JOURNEY_STEPS[journey.index];
  function seek(index){setRequest(r=>({index,nonce:r.nonce+1}));setFollow(true);setPaused(false);}
  function releaseCamera(cutaway=step.cutaway){if(follow)setRoof(!cutaway);setFollow(false);}
  function chooseView(next){setFollow(false);setView(next);setCameraRequest(n=>n+1);}
  function startTour(){if(follow)releaseCamera();else seek(0);}
  function inspectEquipment(id){setEquipmentFocus(id);chooseView('detail');setRoof(false);setRequest(r=>({index:({CR:S.crush,TY:S.crush,BS:S.calcine,GR:S.mix,GK:S.form,GP:S.pack,robot:S.pack})[id],progress:.2,nonce:r.nonce+1}));setPaused(false);}
  function inspectLine(line){setEquipmentFocus(line.id);chooseView('detail');setRoof(false);setRequest(r=>({index:line.step,progress:.3,nonce:r.nonce+1}));setPaused(false);}
  function showArea(id){if(id==='process'&&!EQUIPMENT.some(s=>s.id===equipmentFocus))setEquipmentFocus('BS');setFollow(false);setArea(id);setRoof(!['process','lines'].includes(id));chooseView(id==='lines'?'top':'perspective');if(id==='lines'){setRequest(r=>({index:S.form,progress:.3,nonce:r.nonce+1}));setPaused(false);}if(id==='trucks'||id==='dispatch'){setRequest(r=>({index:S.dispatch,nonce:r.nonce+1}));setPaused(true);}}
  return <section className="visual-overview">
    <div className={`visual-factory area-${area}${night?' is-night':''}`}>
      <div className="factory-toolbar">
      <div className="factory-areas">{AREAS.map(([id,title,Icon])=><button key={id} className={!follow&&area===id?'active':''} onClick={()=>showArea(id)}><Icon size={15}/>{title}</button>)}</div>
      {isScene&&<div className="factory-controls"><div className="view-switch lighting-switch" role="group" aria-label="Gündiz ýa-da gije"><button className={!night?'active':''} aria-pressed={!night} onClick={()=>setNight(false)}><Sun size={15}/>Gündiz</button><button className={night?'active':''} aria-pressed={night} onClick={()=>setNight(true)}><Moon size={15}/>Gije</button></div><div className="view-switch"><button className={view==='perspective'?'active':''} onClick={()=>chooseView('perspective')}><Box size={15}/>3D</button><button className={view==='top'?'active':''} onClick={()=>chooseView('top')}><Layers3 size={15}/>Üstden</button>{['trucks','dispatch','process'].includes(area)&&<button className={view==='detail'?'active':''} aria-label={area==='process'?'Enjamyň ýakyn görnüşi':'Ulagyň ýakyn görnüşi'} onClick={()=>{if(area==='process')inspectEquipment(equipmentFocus);else chooseView('detail');}}><ZoomIn size={15}/>Ýakyn</button>}</div><button className={`icon-button bordered ${roof?'active':''}`} aria-label={roof?'Üçegi gizle':'Üçegi görkez'} onClick={()=>{setFollow(false);setRoof(!roof);}}><Warehouse size={17}/></button><button className="icon-button bordered" aria-label={paused?'Hereketi dowam et':'Hereketi sakla'} onClick={()=>setPaused(!paused)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button className="icon-button bordered" aria-label="Görkeziş sazlamalary" onClick={onSettings}><SlidersHorizontal size={17}/></button></div>}
      </div>
      {isScene?<PlantScene night={night} area={area} cameraRequest={cameraRequest} equipmentFocus={equipmentFocus} roof={roof} machines={machines} selected={selected} onSelect={onSelect} view={view} paused={paused} follow={follow} speed={speed} journeyRequest={request} onJourney={setJourney} onManualCamera={({cutaway})=>releaseCamera(cutaway)}/>:area==='map'?<FleetMap/>:area==='panels'?<FactoryPanels machines={machines} production={production} history={history} mode={mode}/>:<div className="reference-view"><img src={assetUrl(`reference/${photo}.jpg`)} alt={photo==='aerial'?'Zawodyň ulanyjy tarapyndan berlen howa suraty':'Zawodyň binagärlik taslamasy'}/><div className="reference-picker">{PHOTOS.map(([id,label])=><button key={id} onClick={()=>setPhoto(id)} className={photo===id?'active':''}><img src={assetUrl(`reference/${id}.jpg`)} alt=""/><span>{label}</span></button>)}</div></div>}
      {area==='process'&&!follow&&<div className="equipment-picker" aria-label="Enjamy ýakyndan gör">{EQUIPMENT.map(s=><button key={s.id} className={view==='detail'&&equipmentFocus===s.id?'active':''} onClick={()=>inspectEquipment(s.id)}><span>{s.id==='robot'?'GP-02':s.id}</span>{s.name}</button>)}</div>}
      {area==='lines'&&!follow&&<div className="equipment-picker process-line-picker" aria-label="Önümçilik liniýalary">{PROCESS_LINES.map(line=><button key={line.id} title={line.name} style={{'--line-color':line.color}} className={view==='detail'&&equipmentFocus===line.id?'active':''} onClick={()=>inspectLine(line)}><i/>{line.short}</button>)}</div>}
      {isScene&&<div className="journey-panel">
        <div className="journey-heading"><button className={`journey-follow ${follow?'active':''}`} onClick={startTour}><Route size={16}/>{follow?'Erkin görnüş':'Akymy görkez'}</button><span className="journey-caption"><strong>{String(journey.index+1).padStart(2,'0')} · {step.title}</strong><span>{step.caption}</span></span><span className="journey-mode">{journey.blocked?'Enjam garaşylýar':paused?'DURUZYLDY':'NUSGA AKYM'}</span><button className="journey-speed" aria-label="Görkeziş tizligi" onClick={()=>setSpeed(s=>s===1?2:s===2?4:1)}>{speed}×</button><button className="icon-button" aria-label="Akymy täzeden başlat" onClick={()=>seek(0)}><RotateCcw size={14}/></button></div>
        <div className="journey-steps" style={{'--journey-count':JOURNEY_STEPS.length}}>{JOURNEY_STEPS.map((s,i)=><button key={s.id} className={`${i===journey.index?'active ':''}${i<journey.index?'done':''}`} aria-label={`${String(i+1).padStart(2,'0')} ${s.title}`} aria-current={i===journey.index?'step':undefined} onClick={()=>seek(i)}><span className="journey-number">{String(i+1).padStart(2,'0')}</span><span>{s.short}</span><i style={{transform:`scaleX(${i<journey.index?1:i===journey.index?journey.progress:0})`}}/></button>)}</div>
      </div>}
      {isScene&&<div className="model-credit">3D TIR: <a href="https://www.artec3d.com/3d-models/semi-trailer-truck" target="_blank" rel="noreferrer">Artec 3D</a> · <a href={assetUrl('models/ATTRIBUTION.txt')} target="_blank" rel="noreferrer">CC BY 3.0 · uýgunlaşdyryldy</a></div>}
    </div>
  </section>;
}
