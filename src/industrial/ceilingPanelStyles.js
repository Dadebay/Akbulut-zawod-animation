import * as T from 'three';
import {assetUrl} from '../assets.js';

export const WAREHOUSE_PANEL_TYPES=[
  {id:'green',label:'ÝAŞYL · NAGYŞLY',color:'#749976',pattern:'perforated',photo:'decorative-relief',tint:'#89ad87'},
  {id:'yellow',label:'SARY · DEKOR',color:'#d5bc66',pattern:'grid',photo:'yellow-decorative'},
  {id:'metal',label:'METAL · KASSETA',color:'#adb9bd',pattern:'cassette',photo:'metal-perforated'},
  {id:'plastic',label:'PLASTIK · NAGYŞLY',color:'#dce2d4',pattern:'ribbed',photo:'plastic-patterned'},
];
export const CEILING_PANEL_TYPES=[
  {id:'white',label:'AK · NAGYŞLY',color:'#ebe8de',pattern:'perforated',photo:'white-perforated'},
  ...WAREHOUSE_PANEL_TYPES,
];
export const ceilingBatchType=sheetNumber=>((Math.floor(sheetNumber/10)%CEILING_PANEL_TYPES.length)+CEILING_PANEL_TYPES.length)%CEILING_PANEL_TYPES.length;
const kits=new WeakMap();

// Product photographs are shared by all lines and stock. The small procedural
// surface remains visible while its local image loads, or if loading fails.
export function createCeilingPanelStyles(k){
  if(kits.has(k))return kits.get(k);
  const maps=new Map();
  function patternMap(pattern){
    if(maps.has(pattern))return maps.get(pattern);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,128,128);
    if(pattern==='perforated'){
      c.fillStyle='#69716e';
      for(const x of [26,64,102])for(const y of [26,64,102]){
        c.beginPath();c.arc(x,y,3.3,0,Math.PI*2);c.fill();
      }
    }else if(pattern==='grid'){
      c.strokeStyle='#a7a7a7';c.lineWidth=2;
      for(const a of [8,44,84,120]){c.beginPath();c.moveTo(a,8);c.lineTo(a,120);c.moveTo(8,a);c.lineTo(120,a);c.stroke();}
    }else if(pattern==='cassette'){
      c.strokeStyle='#8c9296';c.lineWidth=4;c.strokeRect(5,5,118,118);
      c.strokeStyle='#d9dce0';c.lineWidth=2;c.strokeRect(10,10,108,108);
    }else{
      for(let x=7;x<128;x+=16){c.fillStyle='#aeb4b1';c.fillRect(x,0,2,128);c.fillStyle='#e0e2e0';c.fillRect(x+2,0,3,128);}
    }
    const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
    maps.set(pattern,map);return map;
  }
  const plain=CEILING_PANEL_TYPES.map(type=>k.material(type.color,type.id==='metal'?.8:.08,type.id==='metal'?.3:.75));
  const decorated=CEILING_PANEL_TYPES.map(type=>{
    // Each finish owns its texture so async loading cannot change another
    // variant that happens to use the same fallback pattern.
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const context=canvas.getContext('2d');
    context.drawImage(patternMap(type.pattern).image,0,0,512,512);
    const map=k.trackTexture(new T.CanvasTexture(canvas));
    map.colorSpace=T.SRGBColorSpace;map.anisotropy=k.tablet?2:4;
    const mat=k.material(type.color,type.id==='metal'?.55:.08,type.id==='metal'?.42:.75,{map});
    mat.userData.productPhoto=`textures/ceiling/${type.photo}.webp`;
    if(typeof Image==='function'){
      const photo=new Image();
      const release=()=>{photo.onload=null;photo.onerror=null;map.removeEventListener('dispose',release);};
      map.addEventListener('dispose',release);
      photo.onload=()=>{
        context.drawImage(photo,0,0,512,512);map.needsUpdate=true;
        mat.color.set(type.tint||'#ffffff');release();
      };
      photo.onerror=release;
      photo.src=assetUrl(mat.userData.productPhoto);
    }
    return mat;
  });
  function sheet(parent,y,type=0,{split=true,pattern=true,dynamic=false}={}){
    const g=k.group([0,y,0],parent,dynamic);g.userData.panelType=CEILING_PANEL_TYPES[type].id;
    const mat=pattern?decorated[type]:plain[type];
    if(split)for(const x of [-.33,.33])for(const z of [-.33,.33])k.box(.62,.035,.62,[x,.0175,z],mat,g);
    else k.box(1.32,.035,1.32,[0,.0175,0],mat,g);
    return g;
  }
  function choices(parent,y=0,options={}){
    const root=k.group([0,y,0],parent,true);
    const variants=CEILING_PANEL_TYPES.map((_,type)=>sheet(root,0,type,{...options,dynamic:true}));
    function select(type){
      variants.forEach((g,i)=>{g.visible=i===type;});root.userData.panelType=CEILING_PANEL_TYPES[type].id;
    }
    select(0);return {root,variants,select};
  }
  const styles={plain,decorated,sheet,choices};kits.set(k,styles);return styles;
}
