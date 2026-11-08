import * as T from 'three';
import {PRODUCTION_ENTRANCE as E} from './siteLayout.js';

export function buildProductionEntrance(k,hall){
  const {group,box,material,mesh}=k;
  const entrance=group([E.x-hall.position.x,0,E.z-hall.position.z],hall);
  entrance.name='production-building-entrance';
  const white=material('#f1f3ef',.06,.73),cladding=material('#e1e4e8',.1,.64);
  const joint=material('#c7cdcd',.12,.79),stone=material('#c6cbc8',.04,.89);
  const glass=material('#45616e',.48,.23),frame=material('#3d484e',.52,.42);
  const handle=material('#b8c1c1',.75,.27);

  // Horizontal sheet courses cover the old vertical ribs in this entrance bay.
  box(5.0,7.75,.055,[.10,3.98,-.035],cladding,entrance);
  for(let y=.30;y<7.8;y+=.105)
    box(4.98,.008,.012,[.10,y,-.001],joint,entrance).castShadow=false;
  for(const y of [2.0,4.0,6.0])
    box(5.0,.025,.016,[.10,y,.004],joint,entrance).castShadow=false;

  // The marked near-side wedge is cut away: the left reveal is shallow,
  // and the roof's front edge runs diagonally to the deeper right reveal.
  const hood=group([0,0,0],entrance);hood.name='production-entrance-white-canopy';
  box(E.width,3.32,.065,[0,2.14,.045],white,hood);
  const leftDepth=.32,rightDepth=1.30,half=E.width/2;
  const edgeWhite=material('#f4f5f1',.25,.49),roofFinish=material('#d6deda',.32,.65);
  const soffit=material('#e4e8e2',.10,.76),recess=material('#87938f',.35,.58);
  const frontAt=x=>leftDepth+(x+half)*(rightDepth-leftDepth)/E.width;
  function outline(inset=0){
    const shape=new T.Shape(),left=-half+inset,right=half-inset;
    shape.moveTo(left,inset);shape.lineTo(right,inset);
    shape.lineTo(right,frontAt(right)-inset);shape.lineTo(left,frontAt(left)-inset);
    shape.closePath();return shape;
  }
  function plate(shape,depth,top,mat,bevel=0){
    const geometry=new T.ExtrudeGeometry(shape,{
      depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,
    });
    geometry.rotateX(Math.PI/2);
    return mesh(geometry,mat,[0,top,0],hood);
  }
  for(const side of [-1,1]){
    const depth=(side<0?leftDepth:rightDepth)-.08;
    box(.14,3.28,depth,[side*(half-.07),2.12,.03+depth/2],edgeWhite,hood,.012);
    // A fine joint separates each folded side panel from the wall finish.
    box(.012,3.17,.012,[side*(half-.15),2.10,.09],joint,hood).castShadow=false;
  }
  // Softened white edges surround a slightly recessed weathering surface.
  plate(outline(.012),.115,3.86,edgeWhite,.012).name='production-canopy-beveled-roof';
  const rim=outline();rim.holes.push(new T.Path(outline(.075).getPoints().reverse()));
  plate(rim,.024,3.896,edgeWhite);
  plate(outline(.08),.012,3.880,roofFinish);
  // A small upstand gives the wall junction a clean, finished edge.
  box(E.width-.10,.105,.07,[0,3.913,.052],edgeWhite,hood,.01);
  box(E.width-.14,.013,.014,[0,3.972,.025],joint,hood).castShadow=false;

  // Set the underside back from the front lip, with a discreet recessed light.
  plate(outline(.09),.022,3.744,soffit).name='production-canopy-soffit';
  const span=E.width-.46,rise=(rightDepth-leftDepth)*span/E.width;
  const strip=group([0,3.713,(leftDepth+rightDepth)/2-.15],hood);
  strip.rotation.y=-Math.atan2(rise,span);strip.name='production-canopy-recessed-light';
  const stripLength=Math.hypot(span,rise);
  box(stripLength,.026,.065,[0,0,0],recess,strip,.008);
  const diffuser=box(stripLength-.10,.009,.032,[0,-.018,0],k.m.light,strip,.003);
  diffuser.castShadow=false;
  diffuser.userData.lighting={radius:3.3,intensity:8,direction:[0,-1,0],cone:Math.cos(Math.PI*.45)};

  const doors=group([0,0,.13],entrance);doors.name='production-entrance-glass-doors';
  for(const x of [-1.425,-.475,.475,1.425])
    box(.92,2.70,.035,[x,1.84,0],glass,doors);
  for(const x of [-1.91,-.95,0,.95,1.91])
    box(.060,2.78,.07,[x,1.84,.027],frame,doors);
  for(const y of [.46,3.22])
    box(3.88,.065,.075,[0,y,.027],frame,doors);
  for(const x of [-.10,.10])
    box(.035,.72,.065,[x,1.43,.105],handle,doors);

  const steps=group([0,0,0],entrance);steps.name='production-entrance-steps';
  box(4.68,.48,1.26,[0,.24,.63],stone,steps);
  for(let i=0;i<3;i++){
    const height=.36-i*.12;
    box(4.76+i*.12,height,.38,[0,height/2,1.45+i*.38],stone,steps);
  }
  const sign=group([0,0,0],entrance);sign.name='production-entrance-sign';
  // Smaller lettering, kept centred on the same wall panel.
  for(const [text,width,y] of [['ÖNÜMÇILIK',2.3,5.21],['BINASY',1.6,4.79]]){
    const canvas=document.createElement('canvas');canvas.width=text.length>6?1024:768;canvas.height=192;
    const ctx=canvas.getContext('2d');ctx.font='700 144px Arial';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5;
    ctx.strokeStyle='#f2f1df';ctx.strokeText(text,canvas.width/2,102,canvas.width-26);
    ctx.fillStyle='#b09a41';ctx.fillText(text,canvas.width/2,102,canvas.width-26);
    const map=k.trackTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
    const letters=mesh(new T.PlaneGeometry(width,.51),material('#ffffff',.38,.44,{map,alphaTest:.15}),[0,y,.055],sign);
    letters.castShadow=false;
  }
  return entrance;
}
