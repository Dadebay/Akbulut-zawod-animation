import {useEffect,useRef,useState} from 'react';
import {Activity,ArrowUpRight,BarChart3,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Droplets,Factory,Gauge,Images,Layers3,Monitor,Package,ShieldCheck,Truck,Warehouse,Wrench,X,Zap} from 'lucide-react';
import {ZONES,summarize} from './data.js';
import {assetUrl} from './assets.js';
import './factory-panels.css';

const PANELS=[
  {id:'overview',number:'01',title:'Umumy dolandyryş',short:'Dolandyryş',location:'Merkezi geçelge',icon:Factory},
  {id:'board',number:'02',title:'Alçypan liniýasy',short:'Alçypan',location:'Esasy önümçilik liniýasy',icon:Layers3},
  {id:'logistics',number:'03',title:'Gaplama we logistika',short:'Logistika',location:'Paletleme · ammar · çykaryş',icon:Truck},
  {id:'quality',number:'04',title:'Hil we howpsuzlyk',short:'Hil we howpsuzlyk',location:'Gözegçilik nokady',icon:ShieldCheck},
  {id:'energy',number:'05',title:'Energiýa we tehniki ýagdaý',short:'Energiýa',location:'Tehniki zona · ulgam gözegçiligi',icon:Zap},
];
const REFERENCES=[{id:'concept',title:'TV ulgamynyň ýerleşdiriş konsepti'},...PANELS.map(p=>({id:p.id,title:`TV ${p.number} · ${p.title}`}))];
const format=(value,digits=0)=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:digits}).replaceAll(',',' '):value??'—';
const photo=id=>assetUrl(`reference/panels/${id}.jpg`);
const metric=(icon,label,value,unit,note)=>({icon,label,value,unit,note});

// Extra process, quality and utility values come from the user's concept cards.
// They remain presentation examples; none are substituted for missing live data.
function panelData(id,machines,production,history,isDemo){
  const stats=summarize(machines),sample=value=>isDemo?value:null;
  if(id==='overview')return {
    metrics:[metric(BarChart3,'Gündelik önümçilik',production?.today,'t',`Maksat: ${format(production?.target)} t`),metric(Activity,'Işleýän enjamlar',stats.running,'',`${stats.total} gözegçilik nokady`),metric(Clock3,'Garaşýan enjamlar',stats.idle,'','Önümçilik nokatlary'),metric(Wrench,'Näsazlykly enjamlar',stats.fault,'','Enjam ýagdaýy')],
    chartTitle:'Gündelik önümçilik',chartUnit:'t / sag',chart:(history||[]).map(p=>p.production),ticks:['00:00','06:00','12:00','18:00','23:00'],
    rowsTitle:'Bölümleriň ýagdaýy',rows:ZONES.map(zone=>{const count=summarize(machines.filter(m=>m.zone===zone.id));return {label:zone.name,value:`${count.running} / ${count.total}`,progress:count.availability};}),
  };
  if(id==='board')return {
    metrics:[metric(Layers3,'Sagatlyk önümçilik',sample(1250),'m² / sag','Alçypan liniýasy'),metric(Gauge,'Liniýa tizligi',sample(28),'m / min','Konweýer akymy'),metric(Layers3,'Plitanyň galyňlygy',sample(12.5),'mm','Önüm ölçegi'),metric(Droplets,'Çyglylyk',sample(.6),'%','Hil görkezijisi')],
    chartTitle:'Alçypan önümçiligi',chartUnit:'m² / sag',chart:isDemo?[950,1040,1020,1130,1090,1180,1160,1230,1210,1270,1230,1250]:[],ticks:['08:00','09:00','10:00','11:00','12:00'],
    rowsTitle:'Liniýanyň görkezijileri',rows:[{label:'Hil derejesi',value:sample('99.2%'),progress:sample(99.2)},{label:'Ret derejesi',value:sample('0.8%')},{label:'Enjam ýagdaýy',value:sample('Işleýär')},{label:'Önüm',value:'Alçypan'}],
  };
  if(id==='logistics')return {
    metrics:[metric(Package,'Palet sany',sample(1246),'','Taýýar önümler'),metric(Truck,'Çykyş taýýarlygy',sample(92),'%','Ugratmaga taýýar'),metric(Warehouse,'Ammar dolulygy',sample(78),'%','Saklaýyş meýdançasy'),metric(Truck,'Işleýän forkliftler',sample(6),'','Ýükleme meýdançasy')],
    chartTitle:'Taýýarlanan paletler',chartUnit:'palet / sag',chart:isDemo?[62,78,96,103,116,126,137,149,162,170]:[],ticks:['08:00','10:00','12:00','14:00','16:00'],
    rowsTitle:'Ýükleme we ugratmak',rows:[{label:'Ýüklenýän awtoulaglar',value:sample('4')},{label:'Çykyş taýýarlygy',value:sample('92%'),progress:sample(92)},{label:'Ammar dolulygy',value:sample('78%'),progress:sample(78)},{label:'Ugratmak',value:'TIR · demir ýol'}],
  };
  if(id==='quality')return {
    metrics:[metric(ShieldCheck,'Gorag serişdeleri',sample(96),'%','PPE laýyklygy'),metric(CheckCircle2,'Günlük barlaglar',sample(100),'%','Meýilleşdirilen barlaglar'),metric(Wrench,'Kemçilikler',sample(2),'','Gözegçilikde'),metric(ShieldCheck,'Howp duýduryşlary',sample(0),'','Howpsuzlyk gözegçiligi')],
    chartTitle:'Barlaglaryň ýerine ýetirilişi',chartUnit:'%',chart:isDemo?[76,80,84,88,90,94,96,98,100,100]:[],ticks:['08:00','10:00','12:00','14:00','16:00'],
    rowsTitle:'Hil we gorag',rows:[{label:'Hil ýagdaýy',value:sample('Kadaly')},{label:'PPE laýyklygy',value:sample('96%'),progress:sample(96)},{label:'Günlük barlaglar',value:sample('100%'),progress:sample(100)},{label:'Gözegçilikdäki kemçilikler',value:sample('2')}],
  };
  return {
    metrics:[metric(Zap,'Energiýa sarpy',sample(2.8),'MW','Sazlama derejesi: 3.5 MW'),metric(Activity,'Enjamlar ulanylyşy',sample(92),'%','Tehniki zona'),metric(Gauge,'Howa basyşy',sample(7.2),'bar','Gysylan howa ulgamy'),metric(Wrench,'Meýilleşdirilen işler',sample(12),'','Tehniki hyzmat')],
    chartTitle:'Energiýa sarp edilişi',chartUnit:'MW',chart:isDemo?[2.1,2.2,2.4,2.3,2.6,2.7,2.5,2.8,2.7,2.9,2.8,2.8]:[],ticks:['06:00','10:00','14:00','18:00','22:00'],
    rowsTitle:'Tehniki hyzmat',rows:[{label:'Tamamlanan işler',value:sample('9 / 12'),progress:sample(75)},{label:'Işde · garaşýar',value:sample('2 · 1')},{label:'Howa temperaturasy',value:sample('24 °C')},{label:'Howa akymy',value:sample('18 500 m³ / sag')},{label:'Aktiw alarm',value:sample('1')}],
  };
}

function Chart({data}){
  const max=Math.max(1,...data.chart.filter(Number.isFinite));
  return <section className="tv-chart tv-surface" aria-label={data.chartTitle}>
    <div className="tv-section-heading"><h3>{data.chartTitle}</h3><span>{data.chartUnit}</span></div>
    {data.chart.length?<>
      <div className="tv-chart-plot">
        <div className="tv-chart-axis">{[1,.75,.5,.25,0].map(n=><span key={n}>{format(max*n,max<10?1:0)}</span>)}</div>
        <div className="tv-chart-bars">{data.chart.map((value,index)=><div key={index} title={`${format(value,1)} ${data.chartUnit}`}><span style={{height:`${Math.max(1,value/max*100)}%`}}/></div>)}</div>
      </div>
      <div className="tv-chart-times">{data.ticks.map(t=><span key={t}>{t}</span>)}</div>
    </>:<div className="tv-empty">Maglumat garaşylýar</div>}
  </section>;
}

function ReferenceGallery({initial,onClose}){
  const [index,setIndex]=useState(initial),dialog=useRef(),ref=REFERENCES[index];
  useEffect(()=>{const element=dialog.current;element.showModal();return()=>element.close();},[]);
  const advance=direction=>setIndex(value=>(value+direction+REFERENCES.length)%REFERENCES.length);
  return <dialog ref={dialog} className="tv-gallery" aria-labelledby="tv-gallery-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();advance(1);}if(e.key==='ArrowLeft'){e.preventDefault();advance(-1);}}}>
    <div className="tv-gallery-inner"><div className="tv-gallery-top"><div><span className="tv-eyebrow">BERLEN GÖRSEL NUSGALAR · {index+1} / 6</span><h2 id="tv-gallery-title">{ref.title}</h2></div><button autoFocus className="icon-button" aria-label="Suraty ýapmak" onClick={onClose}><X size={22}/></button></div>
    <img className="tv-gallery-image" src={photo(ref.id)} alt={ref.title}/>
    <div className="tv-gallery-bottom"><button className="tv-gallery-arrow" aria-label="Öňki surat" onClick={()=>advance(-1)}><ChevronLeft/></button><div className="tv-thumbnails">{REFERENCES.map((item,i)=><button key={item.id} aria-label={item.title} aria-pressed={index===i} onClick={()=>setIndex(i)}><img src={photo(item.id)} alt=""/><span>{i===0?'Konsept':`TV 0${i}`}</span></button>)}</div><button className="tv-gallery-arrow" aria-label="Indiki surat" onClick={()=>advance(1)}><ChevronRight/></button></div><p>Görsel konsept · Suratdaky sanlar nusgadyr.</p>
    </div>
  </dialog>;
}

export default function FactoryPanels({machines,production,history,mode}){
  const [selected,setSelected]=useState('overview'),[gallery,setGallery]=useState(null);
  const panel=PANELS.find(p=>p.id===selected),data=panelData(selected,machines,production,history,mode==='demo');
  return <section className="factory-panels" aria-label="Zawodyň maglumat panelleri">
    <div className="tv-topline"><div className="tv-heading"><span className="tv-number"><Monitor size={17}/>TV {panel.number}</span><div><span className="tv-eyebrow">TÜRKMEN GIPS · DOSTLUK</span><h1>{panel.title}</h1><p>{panel.location}</p></div></div><div className="tv-heading-actions"><span className="tv-demo"><i/>{mode==='demo'?'NUSGA MAGLUMAT':'MAGLUMAT PANELI'}</span><button className="tv-outline-button" onClick={()=>setGallery(0)}><Images size={16}/>Görsel nusgalar <span>6</span></button></div></div>
    <nav className="tv-navigation" aria-label="TV panelleri">{PANELS.map(({id,number,short,icon:Icon})=><button key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}><span>{number}</span><Icon size={18}/>{short}</button>)}</nav>
    <div className="tv-metrics">{data.metrics.map(({icon:Icon,label,value,unit,note},i)=><article key={label} className={`tv-metric ${i===0?'tv-metric-primary':''}`}><div><span>{label}</span><Icon size={20}/></div><strong>{format(value,1)}<small>{unit}</small></strong><p>{note}</p></article>)}</div>
    <div className="tv-content"><div className="tv-data-column"><Chart data={data}/><section className="tv-status-panel tv-surface"><div className="tv-section-heading"><h3>{data.rowsTitle}</h3><Activity size={17}/></div><div className="tv-status-grid">{data.rows.map(row=><div className="tv-status-row" key={row.label}><div><span>{row.label}</span><strong>{row.value??'—'}</strong></div>{Number.isFinite(row.progress)&&<div className="tv-progress"><i style={{width:`${Math.max(0,Math.min(100,row.progress))}%`}}/></div>}</div>)}</div></section></div>
    <aside className="tv-reference tv-surface"><div className="tv-section-heading"><h3>Görsel nusga</h3><span>TV {panel.number}</span></div><button className="tv-reference-open" aria-label={`${panel.title} — suraty ulaltmak`} onClick={()=>setGallery(PANELS.findIndex(p=>p.id===selected)+1)}><img src={photo(panel.id)} alt={`${panel.title} üçin berlen TV panel nusgasy`}/><span><Images size={16}/>Suraty ulalt <ArrowUpRight size={16}/></span></button><div className="tv-reference-caption"><Monitor size={18}/><div><strong>{panel.location}</strong><p>100″ ekran üçin görsel konsept</p></div></div></aside></div>
    <p className="tv-footnote">{mode==='demo'?'Görkeziş üçin nusga maglumatlar · Hakyky SCADA birikmesi entek ýok.':'Goşmaça ölçegler birikdirilende görkeziler · Görsel nusgalardaky sanlar hakyky maglumat däldir.'}</p>
    {gallery!==null&&<ReferenceGallery initial={gallery} onClose={()=>setGallery(null)}/>}
  </section>;
}
