import * as T from 'three';
import {GYPSUM_RECEIVING_HALL as H} from './siteLayout.js';
import {GYPSUM_CRUSHER} from './processPlan.js';

// The blue process line occupies a covered, L-shaped building beside the heaps.
// Shell and roof use the existing cutaway groups; equipment remains underneath.
export function buildGypsumReceivingHall(k,roofs,structures){
  const {box,cyl,rod,mesh,group,m}=k;
  const wall=k.material('#e1e5e5',.08,.78),trim=k.material('#b4bfc4',.35,.55);
  const roof=k.material('#cbd4d8',.25,.65),roofShade=k.material('#b9c5cb',.25,.66);
  const glazing=k.material('#2f4955',.45,.28),door=k.material('#7b8c96',.32,.66);
  const W=H.wing,length=H.east-H.west,depth=H.south-H.north,cx=(H.west+H.east)/2,cz=(H.north+H.south)/2;
  const shell=group([0,0,0],structures),cover=group([0,0,0],roofs);
  shell.name='gypsum-crushing-hall-walls';cover.name='gypsum-crushing-hall-roof';
  box(length+.4,.16,depth+.2,[cx,-.05,cz+.1],m.floor);
  box(W.east-W.west+.4,.16,W.south-W.north,[(W.west+W.east)/2,-.05,(W.north+W.south)/2],m.floor);
  // East apron is level with the building floor and wide enough for the loader.
  box(13.8,.14,7.6,[H.east+7.1,-.04,H.entryZ],m.concrete);

  box(length,H.height,.24,[cx,H.height/2,H.south],wall,shell);
  box(W.west-H.west,H.height,.24,[(H.west+W.west)/2,H.height/2,H.north],wall,shell);
  box(W.east-W.west,H.height-W.height,.24,[(W.west+W.east)/2,(H.height+W.height)/2,H.north],wall,shell);
  box(length,.28,.34,[cx,.14,H.south],trim,shell);
  box(W.west-H.west,.28,.34,[(H.west+W.west)/2,.14,H.north],trim,shell);

  function endWall(x,openingWidth,openingHeight){
    const north=H.entryZ-openingWidth/2,south=H.entryZ+openingWidth/2;
    for(const [a,b] of [[H.north,north],[south,H.south]])box(.24,H.height,b-a,[x,H.height/2,(a+b)/2],wall,shell);
    box(.24,H.height-openingHeight,openingWidth,[x,(H.height+openingHeight)/2,H.entryZ],wall,shell);
  }
  endWall(H.east,H.entryWidth,H.entryHeight);
  endWall(H.west,2.3,2.65);
  // Large open loading door; no wall or plinth spans the vehicle opening.
  for(const side of [-1,1]){
    const z=H.entryZ+side*(H.entryWidth/2+.04);
    box(.38,H.entryHeight,.22,[H.east+.04,H.entryHeight/2,z],trim,shell);
    box(.44,1.15,.35,[H.east+.16,.575,z],m.yellow,shell);
    for(const y of [.30,.65,.98])box(.015,.13,.36,[H.east+.39,y,z],m.dark,shell);
  }
  box(.40,.24,H.entryWidth+.30,[H.east+.06,H.entryHeight,H.entryZ],trim,shell);
  box(.30,.70,H.entryWidth,[H.east+.15,H.entryHeight+.47,H.entryZ],door,shell);
  for(let y=H.entryHeight+.18;y<H.entryHeight+.8;y+=.12)box(.025,.025,H.entryWidth,[H.east+.315,y,H.entryZ],trim,shell);
  const sign=k.textPlate('GIPS',3.4,.43,[H.east+.15,6.85,H.entryZ],shell);sign.rotation.y=Math.PI/2;

  // Repeated steel portals and a shallow pitched roof form the long hall.
  const slope=Math.atan2(H.ridgeRise,depth/2),sheetDepth=Math.hypot(depth/2,H.ridgeRise)+.20;
  for(let x=H.west+.6;x<H.east;x+=5.4){
    for(const z of [H.north+.28,H.south-.28])box(.18,H.height,.22,[x,H.height/2,z],m.steel,shell);
    rod([x,H.height-.05,H.north+.2],[x,H.height+H.ridgeRise,cz],.065,m.steel,cover);
    rod([x,H.height+H.ridgeRise,cz],[x,H.height-.05,H.south-.2],.065,m.steel,cover);
    rod([x,H.height-.05,H.north+.2],[x,H.height-.05,H.south-.2],.055,m.steel,cover);
    rod([x,H.height-.05,cz],[x,H.height+H.ridgeRise,cz],.045,m.steel,cover);
    box(.95,.10,.28,[x,H.height-.32,cz],m.light,cover);
  }
  for(const side of [-1,1]){
    const z=cz+side*depth/4,y=H.height+H.ridgeRise/2;
    const panel=box(length+.5,.13,sheetDepth,[cx,y,z],side>0?roof:roofShade,cover);panel.rotation.x=side*slope;
    for(let x=H.west;x<=H.east;x+=.78){const seam=box(.025,.025,sheetDepth,[x,y+.085,z],trim,cover);seam.rotation.x=side*slope;}
    box(length+.5,.22,.18,[cx,H.height,cz+side*(depth/2+.15)],wall,cover);
  }
  box(length+.55,.13,.26,[cx,H.height+H.ridgeRise+.04,cz],trim,cover);
  const gable=new T.Shape();gable.moveTo(-depth/2,0);gable.lineTo(depth/2,0);gable.lineTo(0,H.ridgeRise);gable.closePath();
  const gableGeo=new T.ExtrudeGeometry(gable,{depth:.20,bevelEnabled:false});gableGeo.rotateY(Math.PI/2);
  for(const x of [H.west,H.east-.20])mesh(gableGeo,wall,[x,H.height,cz],shell);
  for(let x=H.west+1;x<H.east;x+=1.2)box(.018,H.height-.4,.018,[x,H.height/2,H.south+.13],trim,shell);
  for(const x of [30,43,55]){
    box(.68,1.6,.04,[x,4.0,H.south+.14],glazing,shell);
    box(.045,1.65,.07,[x,4.0,H.south+.17],trim,shell);
  }
  for(const x of [27,46]){
    box(1.08,2.25,.07,[x,1.15,H.north-.16],door,shell);
    box(.73,.55,.02,[x,1.88,H.north-.205],glazing,shell);
    box(1.4,.13,1.0,[x,2.6,H.north-.40],trim,shell);
  }
  for(const x of [21,40,58,74])cyl(.065,H.height,[x,H.height/2,H.south+.30],trim,shell);

  // Narrow side wing shown at the stockyard end of the annotated plan.
  const wingX=(W.west+W.east)/2,wingZ=(W.north+W.south)/2,wingDepth=W.south-W.north;
  for(const x of [W.west,W.east])box(.24,W.height,wingDepth,[x,W.height/2,wingZ],wall,shell);
  box(W.east-W.west,W.height,.24,[wingX,W.height/2,W.north],wall,shell);
  box(W.east-W.west+.4,.17,wingDepth+.25,[wingX,W.height+.085,wingZ],roof,cover);
  for(let z=W.north;z<W.south;z+=.75)box(W.east-W.west+.4,.025,.025,[wingX,W.height+.19,z],trim,cover);
  box(.07,2.2,.95,[W.east+.15,1.12,wingZ],door,shell);
  box(1.8,.65,.05,[wingX,4.5,W.north-.15],glazing,shell);

  // Local dust extraction, controls and a marked maintenance walkway remain
  // visible with the shell lifted, alongside the existing animated equipment.
  const filter=group([wingX,0,wingZ]);k.frame(2.6,2.6,1.3,filter);
  cyl(.28,1.1,[0,1.5,0],m.white,filter,1.05);
  cyl(1.05,2.5,[0,3.3,0],m.white,filter);cyl(1.10,.15,[0,4.6,0],trim,filter);
  k.motor([1.2,.4,0],filter,.7);
  for(let y=2.3;y<4.6;y+=.55)k.ring(1.06,.025,[0,y,0],trim,filter);
  k.pipe([[GYPSUM_CRUSHER[0],4.7,H.entryZ],[GYPSUM_CRUSHER[0],5.3,H.entryZ],[wingX,5.3,H.entryZ],[wingX,5.3,wingZ],[wingX,4.6,wingZ]],.18,trim);
  cyl(.24,1.0,[wingX,W.height+.55,wingZ],trim,cover);cyl(.35,.12,[wingX,W.height+1.09,wingZ],trim,cover);
  for(const x of [36,53])k.cabinet([x,.04,H.south-.75]);
  for(const z of [H.south-1.3,H.south-.30])box(42,.008,.065,[43,.045,z],m.yellow).castShadow=false;
  for(let x=23;x<64;x+=5.4){
    box(.20,.08,.30,[x,2.4,H.south-.22],m.light);
    cyl(.09,.40,[x,.35,H.south-.34],m.red);
  }
}
