import * as T from 'three';
import {assetUrl} from '../assets.js';
import {NEW_ADMINISTRATION} from './siteLayout.js';

// Keep the established footprints; facade proportions follow the supplied
// front elevations of the dining hall and administration building.
export function buildFrontBuildings(k,parent){
  const {box,cyl,rod,mesh,group,material}=k;
  const wall=material('#e5e5df',.02,.78),edge=material('#bcc2c1',.28,.52);
  const frame=material('#505c60',.42,.42),stone=material('#c1c4c3',0,.88,{surface:'concrete'});
  const roof=material('#a4aaab',.12,.82,{surface:'roofSheet'}),soffit=material('#b2b4af',.04,.80);
  const glass=material('#8298a0',.46,.19,{physical:true,clearcoat:1,clearcoatRoughness:.11,envMapIntensity:2});
  const lowerGlass=material('#30545e',.28,.20,{physical:true,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:2});
  const gold=material('#c6aa60',.65,.35),leaves=material('#40552b',0,.94);
  const hedgeGeometry=new T.IcosahedronGeometry(1,1);

  function lettering(text,width,height,x,y,g){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const c=canvas.getContext('2d');c.font='600 76px Arial';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#77663d';c.fillText(text,515,69,995);
    c.fillStyle='#d7bd75';c.fillText(text,512,64,995);
    const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
    const sign=mesh(new T.PlaneGeometry(width,height),material('#ffffff',.35,.48,{map,alphaTest:.1}),[x,y,0],g);
    sign.rotation.y=-Math.PI/2;sign.name=text.startsWith('N')?'dining-sign':'administration-sign';
  }
  function roofWell(x,z,w,d,y,g){
    box(w,.15,d,[x,y-.075,z],wall,g);
    box(w-.38,.04,d-.38,[x,y+.02,z],roof,g);
    for(const xx of [x-w/2+.10,x+w/2-.10])box(.20,.25,d,[xx,y+.125,z],wall,g);
    for(const zz of [z-d/2+.10,z+d/2-.10])box(w,.25,.20,[x,y+.125,zz],wall,g);
  }
  function entranceCanopy(front,width,height,g){
    const outer=width+1.6,inner=width+.10;
    const points=[
      [front+.40,height+.12,-inner/2],[front+.40,height+.12,inner/2],
      [front-1.42,height+1.12,outer/2],[front-1.42,height+1.12,-outer/2],
    ];
    const vertices=[...points,...points.map(([x,y,z])=>[x,y+.12,z])].flat();
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geo.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7,3,4,0,3,7,4]);geo.computeVertexNormals();
    mesh(geo,soffit,[0,0,0],g).name='flared-entrance-canopy';
    box(.18,.15,outer+.12,[front-1.42,height+1.23,0],wall,g);
    for(const side of [-1,1])rod([front+.4,height+.18,side*inner/2],[front-1.42,height+1.18,side*outer/2],.038,edge,g);
  }
  function glazing(x,bottom,top,width,z,rows,g,columns=1){
    const h=top-bottom,y=(top+bottom)/2;
    box(.08,h+.10,width+.10,[x,y,z],frame,g);
    box(.018,h,width,[x-.051,y,z],glass,g);
    const baseHeight=Math.min(1.03,h*.24);
    box(.012,baseHeight,width,[x-.069,bottom+baseHeight/2,z],lowerGlass,g);
    for(let i=1;i<rows;i++)box(.035,.035,width,[x-.083,bottom+h*i/rows,z],frame,g);
    for(let i=1;i<columns;i++)box(.035,h,.042,[x-.083,y,z-width/2+width*i/columns],frame,g);
    box(.19,.075,width+.20,[x-.04,bottom-.065,z],stone,g);
  }
  function planter(front,z,width,length,g){
    const x=front-5.1;
    box(length,.64,width,[x,.32,z],stone,g);
    box(length+.10,.09,width+.10,[x,.685,z],stone,g);
    box(length-.22,.06,width-.22,[x,.74,z],material('#424a31',0,.96),g);
    for(let a=-length/2+.3,i=0;a<length/2-.2;a+=.40,i++)for(const side of [-1,1]){
      const shrub=mesh(hedgeGeometry,leaves,[x+a,.89,z+side*width*.21],g);shrub.scale.set(.34,.26,.28);
      shrub.rotation.y=i*1.7;
      const flower=k.sphere(.035,[x+a+.08,1.08,z+side*width*.21],gold,g);flower.castShadow=false;
    }
    for(let a=-length/2+1;a<length/2;a+=1.1)box(.014,.58,.009,[x+a,.33,z+(z<0?-1:1)*(width/2+.006)],edge,g);
  }
  function building({name,x,z,width,depth,height,entrance,dining=false}){
    const g=group([x,0,z],parent);g.name=name;
    const front=-width/2,wing=(depth-entrance)/2,recess=.22;
    const portalHeight=height+(dining?.78:2.0),glassTop=portalHeight-.66;
    box(width+.15,.30,depth+.15,[0,.15,0],stone,g);
    for(const side of [-1,1]){
      const center=side*(entrance/2+wing/2);
      if(dining)box(width,height,wing,[0,height/2,center],wall,g);
      else{
        // Hollow office wings: furniture occupies the room behind these skins.
        box(width,height,.20,[0,height/2,side*(depth/2-.10)],wall,g);
        box(.20,.38,wing,[front+.10,.19,center],wall,g);
        box(.20,.45,wing,[front+.10,height-.225,center],wall,g);
      }
      if(!dining)roofWell(-.575,center,width-1.15,wing,height,g);
      box(.15,.35,wing,[front-.07,.175,center],stone,g);
      const windowTop=height-.45,pitch=(wing-.55)/4;
      for(let i=0;i<4;i++){
        const zz=center-wing/2+.275+pitch*(i+.5);
        glazing(front-.04,.38,windowTop,dining?.86:1.24,zz,dining?5:10,g);
      }
      if(!dining){
        let edgeZ=center-wing/2;
        for(let i=0;i<4;i++){
          const windowZ=center-wing/2+.275+pitch*(i+.5),left=windowZ-.62;
          box(.20,windowTop-.38,left-edgeZ,[front+.10,(windowTop+.38)/2,(left+edgeZ)/2],wall,g);
          edgeZ=windowZ+.62;
        }
        const end=center+wing/2;
        box(.20,windowTop-.38,end-edgeZ,[front+.10,(windowTop+.38)/2,(end+edgeZ)/2],wall,g);
      }
      // Continuous horizontal fascia bands, finished with a thin coping.
      const bandHeight=dining?.29:.49,bands=dining?2:3;
      for(let band=0;band<bands;band++){
        const y=height-.30+(band+.5)*bandHeight;
        box(.43,bandHeight-.035,wing+.20,[front-.17,y,center],wall,g);
        box(.45,.025,wing+.20,[front-.19,y-bandHeight/2,center],frame,g);
      }
      box(.58,.13,wing+.32,[front-.22,height-.30+bands*bandHeight+.045,center],edge,g);
      // Retain the quiet side elevations and roof footprint from the site plan.
      if(dining){
        box(1.2,.46,.06,[1.7,2.92,side*(depth/2+.04)],frame,g);
        box(1.08,.34,.025,[1.7,2.92,side*(depth/2+.08)],glass,g);
      }else for(let xx=front+1.6;xx<width/2-1;xx+=2.2){
        box(.82,height-1.2,.06,[xx,height/2,side*(depth/2+.04)],frame,g);
        box(.70,height-1.34,.025,[xx,height/2,side*(depth/2+.08)],glass,g);
      }
    }
    const centerHeight=dining?height:portalHeight;
    if(dining)box(width-recess,centerHeight,entrance,[recess/2,centerHeight/2,0],wall,g);
    else{
      const rear=NEW_ADMINISTRATION.productionWallX-x;
      box(.18,height,depth,[rear+.08,height/2,0],wall,g).name='administration-production-wall';
      for(const side of [-1,1])box(width-1.15,portalHeight-height,.16,[-.575,(height+portalHeight)/2,side*(entrance/2-.08)],wall,g);
      box(.18,portalHeight-height,entrance,[rear+.08,(height+portalHeight)/2,0],wall,g);
    }
    if(dining)roofWell(0,0,width,depth,height,g);
    else roofWell((recess-1.15)/2,0,width-recess-1.15,entrance,portalHeight,g);
    // Glazing sits behind the portal's white reveals, ahead of the roof edge.
    const entryX=front-.10,glazingWidth=entrance-1.15;
    glazing(entryX,.36,glassTop,glazingWidth,0,dining?6:13,g,3);
    // The double doors occupy the lower central bay of the curtain wall.
    const doorWidth=dining?1.7:2.4,doorTop=2.42;
    for(const zz of [-doorWidth/2,0,doorWidth/2])box(.055,doorTop-.36,.045,[entryX-.10,(doorTop+.36)/2,zz],frame,g);
    box(.055,.045,doorWidth,[entryX-.10,doorTop,0],frame,g);
    for(const zz of [-.13,.13])rod([entryX-.15,1.14,zz],[entryX-.15,1.62,zz],.021,edge,g);
    for(const side of [-1,1])box(.42,portalHeight,.50,[front-.13,portalHeight/2,side*(entrance/2-.25)],wall,g);
    box(.44,.64,entrance,[front-.14,portalHeight-.30,0],wall,g);
    lettering(dining?'N A H A R H A N A':'E D A R A  B I N A S Y',entrance-.64,dining?.31:.36,front-.375,portalHeight-.27,g);
    entranceCanopy(front,entrance,portalHeight,g);
    for(let step=0;step<3;step++){
      const top=.36-step*.10;
      box(1.2+step*.45,top,entrance-.18+step*.20,[front-.35-step*.225,top/2,0],stone,g);
    }
    for(const side of [-1,1])planter(front,side*(entrance/2+(dining?1.35:.70)),dining?1.1:1.25,dining?8.3:8.0,g);
    if(!dining){
      const logo=group([entryX-.13,glassTop-.85,0],g);logo.rotation.y=-Math.PI/2;
      mesh(new T.CircleGeometry(.39,24,0,Math.PI),wall,[0,0,0],logo);
      const blue=material('#48a6c4',.32,.45);
      for(let i=0;i<9;i++){
        const h=.12+.20*(1-Math.abs(i-4)/4);box(.034,h,.015,[(i-4)*.067,h/2,.014],blue,logo);
      }
    }
    return g;
  }
  const administration=building({name:'new-administration-facade',...NEW_ADMINISTRATION});
  const dining=building({name:'new-dining-facade',x:-60.9,z:12.8,width:10,depth:16,height:4.05,entrance:3.8,dining:true});
  buildAdministrationFlags(k);
  return {administration,dining};
}

function buildAdministrationFlags(k){
  const {group,material,box,cyl,mesh}=k;
  const root=group();root.name='administration-three-flags';
  const pole=material('#b7aa7b',.72,.34),base=material('#bfc1b5',.35,.68);
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#00853a';ctx.fillRect(0,0,900,600);
  const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const image=document.createElement('img');image.onload=()=>{ctx.drawImage(image,0,0,900,600);map.needsUpdate=true;};
  image.src=assetUrl('brand/turkmenistan-flag.webp');
  map.addEventListener('dispose',()=>{image.onload=null;image.removeAttribute?.('src');});
  const cloth=material('#ffffff',0,.88,{map,side:T.DoubleSide,unique:true,flatShading:true});
  cloth.onBeforeCompile=shader=>{
    shader.uniforms.flagTime=k.windTime;
    shader.vertexShader='uniform float flagTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float freeEdge = uv.x;
      transformed.z += freeEdge * (0.19 * sin(uv.x * 8.0 - flagTime * 2.7 + uv.y * 1.4) + 0.045 * sin(uv.x * 19.0 - flagTime * 4.0));
      transformed.y -= freeEdge * 0.16 + freeEdge * 0.045 * sin(uv.x * 6.0 - flagTime * 2.7);`);
  };
  cloth.customProgramCacheKey=()=> 'turkmenistan-flag-wind-v1';
  const flagGeometry=new T.PlaneGeometry(1.85,1.85*2/3,24,12);flagGeometry.translate(.925,-1.85/3,0);
  for(const [i,z] of [-18.7,-17.0,-15.3].entries()){
    const p=group([-74.5,0,z],root);p.name=`administration-flagpole-${i+1}`;
    box(.34,.18,.34,[0,.39,0],base,p);
    cyl(.10,.58,[0,.65,0],pole,p,.075);cyl(.055,10.55,[0,5.62,0],pole,p,.035);
    k.sphere(.075,[0,10.94,0],pole,p);
    const flag=group([-.075,10.72,0],p,true);flag.rotation.y=-Math.PI/2;
    mesh(flagGeometry,cloth,[0,0,0],flag).name=`turkmenistan-flag-${i+1}`;
    for(const y of [9.5,10.72])k.ring(.07,.012,[0,y,0],base,p);
  }
  return root;
}
