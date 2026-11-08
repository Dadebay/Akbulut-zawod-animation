import * as T from 'three';
import {NEW_FACTORY_ENTRANCE as L} from './siteLayout.js';

// The new plant's asymmetric white gateway, traced from the supplied front view.
// Local X runs across the facade; positive Z faces the outside approach road.
export function buildNewFactoryEntrance(k){
  const {box,rod,mesh,group,material,m}=k;
  const g=group([L.x,0,L.z]);g.rotation.y=-Math.PI/2;g.name='turkmen-gips-main-entrance';
  const white=material('#edece6',.04,.76),edge=material('#c9cfcc',.35,.53);
  const stone=material('#bbbdb8',0,.92),metal=material('#bbc7c9',.65,.38);
  const dark=material('#293b43',.4,.46),gold=material('#bd9a45',.64,.39);
  const blue=material('#399bbd',.45,.35);
  const panes=['#1c3c47','#254a55','#34515b','#607079'].map(color=>material(color,.54,.22));

  function profile(points,front,depth,mat=white){
    const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});
    return mesh(geo,mat,[0,0,front-depth],g);
  }
  function lettering(text,width,height,pos,color='#c6a448'){
    const canvas=document.createElement('canvas');canvas.width=text.length>25?4096:1024;canvas.height=160;
    const ctx=canvas.getContext('2d');let size=116;ctx.font=`600 ${size}px Arial`;
    while(ctx.measureText(text).width>canvas.width-40){size-=2;ctx.font=`600 ${size}px Arial`;}
    ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,84);
    const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
    const mat=material('#ffffff',.4,.43,{map,alphaTest:.12});
    const sign=mesh(new T.PlaneGeometry(width,height),mat,pos,g);sign.castShadow=false;
  }

  // The security room is part of the left support. Its dark glazing has a sloping edge.
  const boothLeft=L.left,boothRight=-6,boothWidth=boothRight-boothLeft,boothX=(boothLeft+boothRight)/2;
  box(boothWidth+.30,.22,4.5,[boothX,.08,-1.10],stone,g);
  box(boothWidth,6.25,4,[boothX,3.275,-1.20],white,g);
  box(boothWidth+.16,.22,4.18,[boothX,6.48,-1.20],white,g);
  box(boothWidth-.35,.06,3.65,[boothX,6.62,-1.20],edge,g);
  const bottom=.35,top=5.98,glassRight=-6.10;
  const leftAt=y=>-13.55+(y-bottom)*(2.50/(top-bottom));
  const glassOutline=[[leftAt(bottom),bottom],[glassRight,bottom],[glassRight,top],[leftAt(top),top]];
  profile(glassOutline,.825,.018,panes[0]);
  // Clip every pane against the diagonal white reveal, including the triangular panes.
  function clippedPane(points){
    const out=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],da=a[0]-leftAt(a[1]),db=b[0]-leftAt(b[1]);
      if(da>=0)out.push(a);
      if((da>=0)!==(db>=0)){
        const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
      }
    }
    return out;
  }
  const cols=6,rows=5,pitch=(glassRight-leftAt(bottom))/cols,rowHeight=(top-bottom)/rows;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++){
    const x0=leftAt(bottom)+col*pitch+.025,x1=x0+pitch-.05,y0=bottom+row*rowHeight+.025,y1=y0+rowHeight-.05;
    const points=clippedPane([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
    if(points.length>2)profile(points,.85,.012,panes[row===rows-1?3:(col+row)%3]);
  }
  for(let row=0;row<=rows;row++){
    const y=bottom+row*rowHeight;box(glassRight-leftAt(y),.038,.045,[(glassRight+leftAt(y))/2,y,.875],metal,g);
  }
  for(let col=0;col<=cols;col++){
    const x=leftAt(bottom)+col*pitch,high=Math.min(top,bottom+(x-leftAt(bottom))*(top-bottom)/2.50);
    if(high>bottom)box(.038,high-bottom,.045,[x,(high+bottom)/2,.875],metal,g);
  }
  rod([leftAt(bottom),bottom,.875],[leftAt(top),top,.875],.04,edge,g);
  box(boothWidth,.25,.13,[boothX,.24,.85],stone,g);

  // A side door faces the factory, keeping the front glass plane uninterrupted.
  box(1.12,2.42,.065,[-7.6,1.42,-3.235],edge,g);
  box(.94,2.22,.035,[-7.6,1.42,-3.28],dark,g);
  box(.70,1.12,.02,[-7.6,1.85,-3.31],panes[1],g);
  rod([-7.25,1.10,-3.35],[-7.25,1.43,-3.35],.022,metal,g);
  box(1.65,.14,.55,[-7.6,.08,-3.48],stone,g);
  for(const x of [-15.2,-12.5,-9.8]){
    box(1.75,2.25,.04,[x,3.25,-3.23],panes[1],g);
    box(.045,2.28,.06,[x,3.25,-3.26],metal,g);
  }

  // The long fascia has a splayed left end and a deep, ribbed canopy below it.
  profile([[L.left-.75,7.56],[10.0,7.56],[10.0,6.48],[L.left+.02,6.48]],.83,2.80);
  box(26.6,.12,.20,[-3.3,6.45,.88],edge,g);
  box(15.7,.13,2.65,[1.85,6.40,-.56],edge,g);
  for(let x=-5.85;x<9.6;x+=.42)box(.065,.14,2.48,[x,6.28,-.56],metal,g);
  for(const x of [-4.9,1.5,7.9])box(.34,.065,.42,[x,6.18,-.48],m.light,g);
  lettering('TÜRKMEN GIPS GURY GURLUŞYK GARYNDYLARY WE GIPSOKARTON ZAWODY',24.45,.66,[-3.55,7.03,.862]);

  // Tall logo pier and the broad diagonal support in the right-hand corner.
  profile([[9.55,.20],[12.65,.20],[12.65,8.85],[9.55,8.85]],.82,3.0);
  profile([[10.20,.20],[L.right,.20],[9.55,6.65],[7.65,6.65]],.94,1.50);
  box(3.28,.20,3.25,[11.43,.10,-.55],stone,g);
  k.ring(.92,.022,[11.08,7.55,.868],gold,g,'z');
  const bars=[.36,.57,.76,.94,1.20,1.35,1.13,.96,.70,.49];
  for(const [i,h] of bars.entries()){
    const x=10.32+i*.168;
    box(.12,h,.045,[x,6.94+h/2,.90],blue,g);
    box(.018,h,.018,[x+.073,6.94+h/2,.91],gold,g);
  }
  box(1.88,.045,.07,[11.08,6.94,.90],gold,g);
  lettering('TÜRKMEN GIPS',1.92,.23,[11.08,6.76,.92],'#328fb2');
  box(1.92,.035,.06,[11.08,6.60,.90],gold,g);

  // White sliding leaf is parked along the right fence so moving trucks can pass.
  const fenceDepth=L.x-L.fenceX;
  const rightShift=(1-L.widthScale)*L.right;
  const leaf=group([21.05-rightShift,0,fenceDepth],g);leaf.name='main-entrance-open-sliding-gate';
  const width=15.6;
  box(width,.55,.10,[0,.49,0],white,leaf);
  for(const y of [.19,.79,2.36,2.57])box(width,.065,.09,[0,y,0],metal,leaf);
  for(let x=-width/2;x<=width/2+.01;x+=2.6)box(.10,2.44,.13,[x,1.38,0],white,leaf);
  for(let x=-width/2+.18;x<width/2;x+=.23)rod([x,.78,0],[x,2.57,0],.016,white,leaf);
  for(let x=-width/2+.25;x<width/2;x+=.47)box(.12,.12,.04,[x,2.32,.07],edge,leaf);
  for(const x of [-5.5,5.5]){
    const wheel=k.cyl(.11,.08,[x,.17,0],dark,leaf,undefined,12);wheel.rotation.x=Math.PI/2;
  }
  const stop=box(.42,.65,.48,[13.40-rightShift,.325,fenceDepth-.65],edge,g);
  // Narrow the facade to 70% and raise its current height by 10%.
  // Keep the canopy depth and the sliding leaf height as they were.
  const body=group([0,0,0],g);body.scale.set(L.widthScale,.8*1.1,.8);
  for(const child of [...g.children])if(child!==body&&child!==leaf&&child!==stop)body.add(child);
  return g;
}
