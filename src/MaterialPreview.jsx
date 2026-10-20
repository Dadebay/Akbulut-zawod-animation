import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createKit} from './industrial/kit.js';
import {MATERIALS} from './industrial/materials.js';
import {loadSkyEnvironment} from './industrial/realism.js';

export default function MaterialPreview(){
  const host=useRef(),api=useRef(),[selected,setSelected]=useState('paintedSteel'),[failed,setFailed]=useState(false);
  const recipe=MATERIALS[selected];
  useEffect(()=>{
    let renderer;try{renderer=new T.WebGLRenderer({antialias:true});}catch{setFailed(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.86;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.current.appendChild(renderer.domElement);
    const scene=new T.Scene();scene.background=new T.Color('#e2e8ec');scene.environmentIntensity=.45;
    const camera=new T.PerspectiveCamera(36,1,.05,100);camera.position.set(3.4,2.2,5.7);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.65,0);controls.minDistance=2;controls.maxDistance=12;controls.maxPolarAngle=Math.PI/2;controls.update();
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),fallback=pmrem.fromScene(room,.025);scene.environment=fallback.texture;room.dispose();pmrem.dispose();
    scene.add(new T.HemisphereLight('#e9f2ff','#777467',.3));
    const sun=new T.DirectionalLight('#fff5e9',2.4);sun.position.set(3,5,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.015;Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});scene.add(sun);
    const stopSky=loadSkyEnvironment(renderer,scene,(hdr,direction)=>{if(hdr)fallback.dispose();if(direction)sun.position.copy(direction).multiplyScalar(8);});
    const k=createKit(scene),sphere=k.mesh(new T.SphereGeometry(.6,48,32),k.m.blue,[-1,.62,0]);
    const box=k.mesh(new RoundedBoxGeometry(1,1,1,2,.02),k.m.blue,[.9,.52,0]);box.rotation.y=.3;
    k.box(20,.05,20,[0,-.04,0],k.material('#b9c1c5',0,.95),scene,0);
    api.current={select(name){const r=MATERIALS[name],mat=k.material(r.color,r.metalness,r.roughness,{surface:name});sphere.material=box.material=mat;}};api.current.select('paintedSteel');
    const observer=new ResizeObserver(()=>{const {width,height}=host.current.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();});observer.observe(host.current);
    let frame;function draw(){frame=requestAnimationFrame(draw);controls.update();renderer.render(scene,camera);}draw();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();stopSky();fallback.dispose();k.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();api.current=null;};
  },[]);
  useEffect(()=>{api.current?.select(selected);},[selected]);
  return <main style={{position:'fixed',inset:0,overflow:'auto',background:'#eef2f5',color:'#243b50',padding:24,zIndex:100}}>
    <div style={{maxWidth:1100,margin:'auto'}}>
      <a href={import.meta.env.BASE_URL}>← Plant</a>
      <h1 style={{margin:'18px 0'}}>Material library</h1>
      <p>Clean factory finishes · 1 m box with 20 mm edges · 1.2 m diameter sphere. Drag to orbit; scroll to inspect.</p>
      <label htmlFor="material-choice">Surface </label>
      <select id="material-choice" value={selected} onChange={e=>setSelected(e.target.value)} style={{padding:10,margin:'16px 0',fontSize:16}}>
        {Object.entries(MATERIALS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}
      </select>
      <p aria-live="polite">Metalness {recipe.metalness} · Roughness {recipe.roughness} · {recipe.tile?`${recipe.tile} m repeat · ${512/recipe.tile} px/m`:'Physical glass · IOR 1.5'} · World-space projection</p>
      <div ref={host} style={{height:'min(65vh,650px)',minHeight:300,borderRadius:12,overflow:'hidden'}}>{failed&&<p>WebGL is unavailable in this browser.</p>}</div>
    </div>
  </main>;
}
