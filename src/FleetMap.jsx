import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {FACTORY,CANDIDATE_AREA,parsePositions} from './fleet.js';

export default function FleetMap(){
  const host=useRef();const [feed,setFeed]=useState('unconfigured'),[count,setCount]=useState(0),[tilesFailed,setTilesFailed]=useState(false);
  useEffect(()=>{
    const map=L.map(host.current,{zoomControl:false,scrollWheelZoom:true}).setView([37.773,65.359],15);
    L.control.zoom({position:'bottomright'}).addTo(map);
    const tiles=L.tileLayer(import.meta.env.VITE_MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:import.meta.env.VITE_MAP_ATTRIBUTION||'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    tiles.on('tileerror',()=>setTilesFailed(true));tiles.on('tileload',()=>setTilesFailed(false));
    const factory=L.divIcon({className:'map-factory-icon',html:'<span>AK BULUT</span>',iconSize:[100,36],iconAnchor:[50,18]});
    const caption=document.createElement('div');caption.textContent='Dostluk · Ulanyjynyň beren ýerleşişi';
    L.marker(FACTORY,{icon:factory}).addTo(map).bindPopup(caption);
    const candidate=L.circle(CANDIDATE_AREA,{radius:115,color:'#b58c42',weight:1.5,dashArray:'5 5',fillOpacity:.10}).addTo(map);
    const note=document.createElement('div');note.textContent='Gazuw yzlaryna meňzeş meýdan. Çig mal känidigi tassyklanmady.';candidate.bindPopup(note);
    candidate.bindTooltip('Barlanmaly meýdan',{permanent:true,direction:'top',className:'map-area-label'});
    const layer=L.layerGroup().addTo(map),markers=new Map();let rows=[],timer,controller,disposed=false,healthy=false;
    const endpoint=import.meta.env.VITE_FLEET_POSITIONS_URL;
    function render(){
      const now=Date.now();let fresh=0;const ids=new Set();
      rows.forEach(p=>{
        ids.add(p.id);const live=healthy&&p.fresh&&now-p.time<=30000;if(live)fresh++;
        let marker=markers.get(p.id);if(!marker){marker=L.circleMarker([p.lat,p.lng],{radius:8,weight:3,color:'#fff'}).addTo(layer);markers.set(p.id,marker);}
        marker.setLatLng([p.lat,p.lng]);marker.setStyle({fillColor:live?'#2779c4':'#929ba5',fillOpacity:1});
        const el=document.createElement('div');el.textContent=`${p.name} · ${live?'GPS':'Maglumat köneldi'}`;marker.unbindTooltip().bindTooltip(el,{direction:'top'});
      });
      markers.forEach((m,id)=>{if(!ids.has(id)){layer.removeLayer(m);markers.delete(id);}});
      setCount(fresh);
    }
    async function poll(){
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6000);
      try{const response=await fetch(endpoint,{signal:controller.signal,credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Position feed unavailable');const next=parsePositions(await response.json());if(disposed)return;rows=next;healthy=true;setFeed(next.some(p=>p.fresh)?'connected':'stale');render();}
      catch{if(disposed)return;healthy=false;setFeed('error');render();}
      finally{clearTimeout(timeout);if(!disposed)timer=setTimeout(poll,5000);}
    }
    if(endpoint){setFeed('loading');poll();}
    const expiry=setInterval(()=>{if(endpoint){render();if(healthy&&rows.length&&rows.every(p=>!p.fresh||Date.now()-p.time>30000))setFeed('stale');}},1000);
    const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(host.current);
    return()=>{disposed=true;clearTimeout(timer);clearInterval(expiry);controller?.abort();observer.disconnect();map.remove();};
  },[]);
  const label={unconfigured:'GPS birikdirilmedi',loading:'GPS garaşylýar',connected:`GPS · ${count} ulag`,stale:'Täze GPS maglumat ýok',error:'GPS aragatnaşygy ýok'}[feed];
  return <div className="fleet-map-view"><div className="fleet-map" ref={host} aria-label="Dostluk geografik kartasy"/><div className={`map-feed ${feed}`}><i/>{label}<small>Hemra suraty göni ýaýlym däl</small></div>{tilesFailed&&<div className="map-error">Karta ýüklenmedi. Internet birikmesini barlaň.</div>}<a className="map-satellite-link" href="https://maps.google.com/maps?q=37.770806,65.355307&ll=37.770806,65.355307&z=15&t=k" target="_blank" rel="noreferrer">Hemra görnüşini aç ↗</a></div>;
}
