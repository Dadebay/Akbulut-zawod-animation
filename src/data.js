export const ZONES = [
  { id:'CR', name:'Çig mal', subtitle:'Kabul etmek we saklamak', short:'01', color:'#78d5ca', types:['Çig mal bunkeri','Lenta konweýeri','Daş döwüji','Dozirleýji'], model:'silo' },
  { id:'TY', name:'Kalsit', subtitle:'Kalsit önümçilik liniýasy', short:'02', color:'#6bb7e9', types:['Üweýji degirmen','Separator','Elek','Tozan süzgüji'], model:'mill' },
  { id:'BS', name:'Bişirme', subtitle:'Gipsiň ýylylyk işlenişi', short:'03', color:'#e0b981', types:['Aýlanýan peç','Sowadyjy','Wentilýator','Ýylylyk çalşyjy'], model:'kiln' },
  { id:'GR', name:'Gury garyndy', subtitle:'Gury gurluşyk garyndylary', short:'04', color:'#a8a2e0', types:['Garyşdyryjy','Dozirleýji','Goşundy bunkeri','Şnek konweýeri'], model:'mixer' },
  { id:'GK', name:'Gipsokarton', subtitle:'Şekil bermek we guratmak', short:'05', color:'#75cfc0', types:['Şekillendiriji','Guradyjy','Kesiji','Rolikli konweýer'], model:'board' },
  { id:'GP', name:'Gaplama', subtitle:'Gaplamak we ugratmak', short:'06', color:'#9cb6cc', types:['Gaplaýjy','Paletleýji','Agram ölçeýji','Ugradyjy konweýer'], model:'packer' },
];
export const STATUSES = {
  running:{name:'Işleýär',color:'#149569',label:'Işleýän'},
  idle:{name:'Garaşýar',color:'#c48a1f',label:'Garaşýan'},
  fault:{name:'Näsazlyk',color:'#d84c60',label:'Näsazlykly'},
  offline:{name:'Maglumat ýok',color:'#71828e',label:'Aragatnaşyk ýok'},
};
const statusAt = i => i < 632 ? 'running' : i < 686 ? 'idle' : i < 704 ? 'fault' : 'offline';
export function createDemoSnapshot(tick=0, scenario='normal', now=Date.now()) {
  const machines=ZONES.flatMap((zone,zi)=>Array.from({length:120},(_,i)=>{
    const n=zi*120+i;
    let status=statusAt((n*137)%720);
    if(scenario==='maintenance' && zone.id==='BS' && i<26) status='idle';
    if(scenario==='network' && zone.id==='GP') status='offline';
    const moving=status==='running';
    const wave=Math.sin(tick*.22+n*.4);
    return {id:`AKB-${zone.id}-${String(i+1).padStart(3,'0')}`,zone:zone.id,name:zone.types[i%4],status,
      timestamp:new Date(now).toISOString(),
      telemetry:{load:moving?Math.round(65+(n%21)+wave*3):0,temperature:status==='offline'?null:Math.round((zone.id==='BS'?145:28)+(n%14)+wave*2),power:status==='offline'?null:moving?Number((3.8+n%14*.85+wave*.2).toFixed(1)):0},
      runtime:status==='offline'?null:Number((5.1+n%25/10).toFixed(1))};
  }));
  return {timestamp:new Date(now).toISOString(),source:'demo',machines,production:{today:184.2+tick*.08,target:220,rate:24.8+Math.sin(tick*.2)*.7,unit:'t'},
    history:Array.from({length:24},(_,i)=>({hour:i,production:Number((i<6?0:9+Math.sin(i*.4)*2+(i%3)*1.1).toFixed(1))}))};
}
export function summarize(machines) {
  const counts={running:0,idle:0,fault:0,offline:0};
  machines.forEach(m=>counts[m.status]++);
  return {...counts,total:machines.length,availability:machines.length?counts.running/machines.length*100:0};
}
export function filterMachines(machines,{search='',status='all',zone='all'}={}) {
  const q=search.trim().toLocaleLowerCase();
  return machines.filter(m=>(status==='all'||m.status===status)&&(zone==='all'||m.zone===zone)&&(!q||`${m.id} ${m.name}`.toLocaleLowerCase().includes(q)));
}
export function validateSnapshot(raw,now=Date.now()) {
  if(!raw || !Array.isArray(raw.machines)) throw new Error('Snapshot must contain a machines array');
  const ids=new Set();
  const machines=raw.machines.map(m=>{
    if(!m.id || ids.has(m.id)) throw new Error('Machine IDs must be unique and non-empty');
    if(!STATUSES[m.status]) throw new Error(`Unknown machine status: ${m.status}`);
    if(!ZONES.some(z=>z.id===m.zone)) throw new Error(`Unknown zone: ${m.zone}`);
    ids.add(m.id);
    const age=now-Date.parse(m.timestamp);
    return {...m,name:m.name||m.id,status:!Number.isFinite(age)||age>30000||age< -5000?'offline':m.status,telemetry:m.telemetry||{}};
  });
  return {...raw,machines,source:'live'};
}
export function createDataSource(onSnapshot,onError,{mode='demo',url='',interval=2500}={}) {
  let timer,stopped=false,paused=false,tick=0,scenario='normal',controller;
  const poll=async()=>{
    if(stopped) return;
    if(paused && mode==='demo'){timer=setTimeout(poll,interval);return;}
    if(mode==='live'){
      try{
        if(!url) throw new Error('Live snapshot URL is not configured');
        controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),8000);
        let response;
        try{response=await fetch(url,{signal:controller.signal,credentials:'omit'});}finally{clearTimeout(timeout);}
        if(!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
        const data=validateSnapshot(await response.json());
        if(!stopped)onSnapshot(data);
      }catch(error){if(!stopped)onError(error);}
    }else onSnapshot(createDemoSnapshot(tick++,scenario));
    if(!stopped)timer=setTimeout(poll,interval);
  };
  poll();
  return {stop(){stopped=true;clearTimeout(timer);controller?.abort();},setScenario(value){scenario=value;},setPaused(value){paused=value;}};
}
export const SOURCES=[
  {title:'Ak Bulut · Türkmen Gips',url:'https://www.akbulut.com.tm/index.php/tk/turkmen-gips',description:'Gipsokarton we gury gurluşyk garyndylary.'},
  {title:'Baumak · Gypsum technologies',url:'https://baumak.com.tr/en/gypsum-technologies/',description:'Çig maldan gaplama çenli önümçilik tehnologiýasy.'},
];
