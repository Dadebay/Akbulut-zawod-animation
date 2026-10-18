import * as T from 'three';
import {localPoint} from './processPlan.js';

// Add equipment to the existing interior; the architectural envelope is shared
// with the unchanged campus model and is not rebuilt here.
export function buildFactoryServices(k,production){
  const {group,box,cyl,ring,rod,material,m,textPlate}=k;
  const red=material('#bd302b',.15,.44),fanMetal=material('#aebbc0',.65,.42);
  const exitLight=material('#277d55',0,.55,{emissive:'#44bd88',emissiveIntensity:.35});
  const root=group([0,0,0],production.root),fans=[],lights=[];
  function firePoint(x,z,yaw=0){
    const g=group(localPoint([x,0,z]),root);g.rotation.y=yaw;
    box(1.65,.035,1.65,[0,.09,.46],m.yellow,g);
    for(let x=-.68;x<.75;x+=.22){const stripe=box(.08,.008,1.58,[x,.112,.46],m.black,g);stripe.rotation.y=.08;}
    box(1.04,1.5,.35,[0,1.07,0],red,g,.035);
    box(.90,1.34,.018,[0,1.07,.185],m.white,g);
    ring(.32,.055,[.02,1.26,.22],red,g,'z');
    for(const r of [.23,.15,.07])ring(r,.035,[.02,1.26,.23],m.rubber,g,'z');
    rod([.30,1.24,.24],[.36,.66,.24],.035,m.rubber,g);rod([.36,.66,.24],[.23,.60,.24],.035,m.steel,g);
    cyl(.12,.52,[-.72,.64,.10],red,g);k.sphere(.12,[-.72,.91,.10],red,g);
    box(.14,.045,.12,[-.72,1.04,.10],m.dark,g);rod([-.66,1.03,.12],[-.49,.68,.14],.021,m.rubber,g);
    textPlate('ÝANGYN',1.20,.28,[0,2.03,.08],g,'#ffffff','#b92e2a');
    box(.15,.13,.08,[0,2.30,.08],exitLight,g);
  }
  for(const x of [-54,-20,14,69])firePoint(x,-38.55);
  firePoint(-55,13,Math.PI/2);firePoint(-13,8,-Math.PI/2);
  // High wall extraction fans, filter housings and a connected overhead duct.
  box(116,.65,.65,[0,6.55,-13.05],fanMetal,root);
  for(const x of [-50,-16,18,58]){
    const g=group(localPoint([x,5.6,-38.10]),root);
    box(1.75,1.75,.58,[0,0,0],m.dark,g,.04);
    box(1.9,1.9,.10,[0,0,-.35],fanMetal,g);box(.6,.8,.6,[0,1.05,-.22],fanMetal,g);
    ring(.72,.08,[0,0,.34],fanMetal,g,'z');
    const rotor=group([0,0,.28],g,true);cyl(.13,.18,[0,0,0],m.steel,rotor).rotation.x=Math.PI/2;
    for(let i=0;i<6;i++){const blade=box(.24,.59,.065,[Math.sin(i*Math.PI/3)*.37,Math.cos(i*Math.PI/3)*.37,0],fanMetal,rotor,.04);blade.rotation.z=-i*Math.PI/3+.25;}
    for(const r of [.26,.45,.61])ring(r,.012,[0,0,.43],m.steel,g,'z');
    for(let i=0;i<8;i++){const a=i*Math.PI/4;rod([0,0,.44],[Math.cos(a)*.72,Math.sin(a)*.72,.44],.012,m.steel,g);}
    textPlate('HOWA',1.15,.23,[0,-1.10,.05],g);fans.push(rotor);
  }
  // Interior luminaires remain with the cutaway, so they never shine through roofs.
  for(const x of [-49,-23,3,29,55])for(const z of [-33,-18]){
    const g=group(localPoint([x,7.25,z]),root);
    box(1.8,.12,.42,[0,0,0],m.dark,g);box(1.65,.04,.32,[0,-.08,0],m.light,g);
    lights.push(g);
  }
  // Clearly visible outdoor hose/water points at the edge of paved service courts.
  for(const [x,z] of [[-133,-47],[91,33],[83,-133]]){
    const g=group([x,0,z]);box(1.2,.10,1.2,[0,.05,0],m.concrete,g);
    cyl(.16,.85,[0,.52,0],red,g);k.sphere(.19,[0,1,0],red,g);
    rod([-.30,.73,0],[.30,.73,0],.085,red,g);
    for(const side of [-1,1]){const cap=cyl(.11,.07,[side*.34,.73,0],m.steel,g);cap.rotation.z=Math.PI/2;}
    for(const dx of [-.48,.48]){cyl(.045,.75,[dx,.44,.40],m.yellow,g);cyl(.047,.19,[dx,.55,.40],m.black,g);}
    textPlate('ÝANGYN',1.1,.25,[0,1.70,0],g,'#ffffff','#b92e2a');rod([0,.10,-.1],[0,1.82,-.1],.025,m.steel,g);
  }
  return {root,lights,update(time){fans.forEach((fan,i)=>fan.rotation.z=-(time*(7+i*.3))%(Math.PI*2));}};
}
