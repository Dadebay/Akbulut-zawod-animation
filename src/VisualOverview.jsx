import {Box,Layers3,Pause,Play,SlidersHorizontal,ArrowRight,Truck,Package,PanelsTopLeft,Grid2X2} from 'lucide-react';
import PlantScene from './PlantScene.jsx';
import {STATUSES} from './data.js';

export default function VisualOverview({machines,stats,selected,onSelect,view,setView,paused,setPaused,mode,error,onEquipment,onSettings,onFilter}) {
  return <section className="visual-overview">
    <div className="visual-factory">
      <div className="factory-title"><span>DOSTLUK · LEBAP</span><h1>Gips we potolok önümçiligi</h1><span className={`visual-demo ${error?'error':''}`}><i/>{error?'Aragatnaşyk ýok':mode==='demo'?'GÖRKEZIŞ · NUSGA MAGLUMAT':'SCADA'}</span></div>
      <div className="factory-controls"><div className="view-switch"><button className={view==='perspective'?'active':''} onClick={()=>setView('perspective')}><Box size={15}/>3D</button><button className={view==='top'?'active':''} onClick={()=>setView('top')}><Layers3 size={15}/>Üstden</button></div><button className="icon-button bordered" aria-label={paused?'Hereketi dowam et':'Hereketi sakla'} onClick={()=>setPaused(!paused)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button className="icon-button bordered" aria-label="Görkeziş sazlamalary" onClick={onSettings}><SlidersHorizontal size={17}/></button></div>
      <PlantScene machines={machines} selected={selected} onSelect={onSelect} view={view} paused={paused}/>
      <div className="factory-flow"><span><Truck size={17}/>Çig mal</span><ArrowRight size={15}/><span><Package size={17}/>Gips</span><ArrowRight size={15}/><span><PanelsTopLeft size={17}/>Potolok</span></div>
      <div className="factory-watermark">AK BULUT</div>
    </div>
    <div className="visual-statusbar"><button className="visual-total" onClick={onEquipment}><span className="total-icon"><Grid2X2 size={26}/></span><strong>{stats.total}</strong><span>ENJAM<ArrowRight size={15}/></span></button>{Object.entries(STATUSES).map(([status,meta])=><button className={`visual-status ${status}`} key={status} onClick={()=>onFilter(status)}><i/><strong>{stats[status]}</strong><span>{meta.name}</span><div className="visual-status-track"><b style={{transform:`scaleX(${stats.total?stats[status]/stats.total:0})`}}/></div></button>)}</div>
  </section>;
}
