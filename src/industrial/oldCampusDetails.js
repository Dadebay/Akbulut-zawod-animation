import * as T from 'three';
import {OLD_FRONT_PARK as PARK} from './siteLayout.js';
import {createParkedCarBuilder} from './parkedCars.js';

export function createSolarPanels(k){
  // One shared cell texture keeps both arrays inexpensive on the tablet.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#87929b';ctx.fillRect(0,0,512,1024);
  const cols=6,rows=12,cw=512/cols,ch=1024/rows;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++){
    const x=col*cw+1.7,y=row*ch+1.7,w=cw-3.4,h=ch-3.4;
    const fill=ctx.createLinearGradient(x,y,x+w,y+h);
    fill.addColorStop(0,(row+col)%3===0?'#26394a':'#213344');fill.addColorStop(1,'#101f2d');
    ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#83919b';ctx.lineWidth=.7;
    for(let bus=1;bus<4;bus++){const xx=x+w*bus/4;ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx,y+h);ctx.stroke();}
    ctx.strokeStyle='#5a6e7c';ctx.lineWidth=.45;
    for(let finger=1;finger<12;finger++){const yy=y+h*finger/12;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);ctx.stroke();}
  }
  const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
  const cells=k.material('#ffffff',.33,.31,{map});
  const frame=k.material('#b8c3ca',.72,.36),back=k.material('#17242c',.3,.66);
  return function panel(w,d,pos,parent){
    const g=k.group(pos,parent);
    k.box(w,.07,d,[0,0,0],frame,g);
    k.box(w-.035,.012,d-.035,[0,.039,0],back,g);
    const face=k.mesh(new T.PlaneGeometry(w-.075,d-.075),cells,[0,.047,0],g);
    face.rotation.x=-Math.PI/2;face.castShadow=false;
    return g;
  };
}

export function buildOldFrontParking(k,panel){
  const {box,rod,mesh,group,material,m}=k;
  const concrete=material('#b7b7aa',0,.94),curb=material('#d0d0c4',0,.9);
  const frame=material('#c0c9c5',.6,.44),green=material('#587e69',.3,.56),paint=material('#e6e5d7',0,.87);
  const midZ=(PARK.north+PARK.south)/2,length=PARK.south-PARK.north,rampWest=PARK.east-1.6;
  box(rampWest-PARK.west,.14,length,[(rampWest+PARK.west)/2,-.065,midZ],concrete);
  // A shallow apron opens the covered bays onto the internal concrete court.
  const ramp=new T.BufferGeometry();
  ramp.setAttribute('position',new T.Float32BufferAttribute([
    rampWest,.005,PARK.north,rampWest,.005,PARK.south,
    PARK.east+.25,-.023,PARK.south,PARK.east+.25,-.023,PARK.north
  ],3));ramp.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,1,1,0],2));
  ramp.setIndex([0,1,2,0,2,3]);ramp.computeVertexNormals();mesh(ramp,concrete).castShadow=false;
  box(.23,.20,length,[PARK.west,.07,midZ],curb);
  for(const z of [PARK.north,PARK.south])box(rampWest-PARK.west,.20,.23,[(rampWest+PARK.west)/2,.07,z],curb);
  for(let z=PARK.north+3;z<PARK.south;z+=3.1)box(rampWest-PARK.west,.006,.018,[(rampWest+PARK.west)/2,.011,z],m.concrete);

  const canopy=group([PARK.canopyX,0,PARK.z]);canopy.rotation.y=Math.PI/2;
  canopy.name='old-factory-covered-parking';
  const roof=group([0,3.18,0],canopy);roof.rotation.x=-.10;
  box(PARK.canopyWidth,.075,PARK.canopyDepth,[0,0,0],green,roof);
  for(const z of [-PARK.canopyDepth/2,PARK.canopyDepth/2])box(PARK.canopyWidth+.10,.16,.10,[0,-.025,z],frame,roof);
  for(const x of [-PARK.canopyWidth/2,PARK.canopyWidth/2])box(.10,.16,PARK.canopyDepth,[x,-.025,0],frame,roof);
  for(const z of [-2.45,2.45])box(12.6,.17,.12,[0,-.13,z],frame,roof);
  for(const x of [-6.2,-3.1,0,3.1,6.2]){
    box(.10,.15,5.7,[x,-.11,0],frame,roof);
    for(const z of [-2.45,2.45]){
      const top=3.18+Math.sin(.10)*z-.14;
      box(.38,.16,.38,[x,.085,z],curb,canopy);
      box(.12,top-.12,.12,[x,(top+.12)/2,z],frame,canopy);
      rod([x,top-.50,z],[x+(x>0?-.65:.65),top-.02,z],.033,frame,canopy);
    }
  }
  // The photographed canopy has a dark gridded top and a slim green fascia.
  for(let col=0;col<8;col++)for(let row=0;row<3;row++)
    panel(1.54,1.70,[(col-3.5)*1.61,.11,(row-1)*1.78],roof);
  for(const x of [-6.2,-3.1,0,3.1,6.2])box(.075,.008,5.7,[x,.016,.15],paint,canopy);
  for(const x of [-4.65,-1.55,1.55,4.65]){
    box(1.6,.10,.15,[x,.065,-1.45],curb,canopy);
    for(const dx of [-.6,.6])box(.17,.013,.17,[x+dx,.12,-1.45],m.yellow,canopy);
  }
  const car=createParkedCarBuilder(k);
  car(PARK.canopyX+.3,PARK.z-4.65,Math.PI,7);
  car(PARK.canopyX+.3,PARK.z+1.55,Math.PI,1);
}
