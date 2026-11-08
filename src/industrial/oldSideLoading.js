import * as T from 'three';
import {OLD_SIDE_LOADING as L} from './siteLayout.js';

// Wide covered vehicle entrance on the old hall's railway-facing side.
export function buildOldSideLoading(k){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const white=material('#dfe2db',.04,.86),base=material('#a7aaa2',0,.94);
  const roofMat=material('#4f8069',.25,.60),seam=material('#87a994',.27,.64);
  const steel=material('#bbc8bf',.50,.48),inside=material('#56625d',0,.98);
  const concrete=material('#b9baae',0,.96),asphalt=m.road;
  const {apron:A}=L,front=L.wallZ+L.depth,back=L.wallZ-L.interiorDepth;
  const g=group([L.x,0,L.wallZ]);g.name='old-factory-truck-entrance';

  // A flush apron connects to the long courtyard drive on both sides.
  box(A.east-A.west,.12,A.south-A.north,[(A.east+A.west)/2,-.075,(A.south+A.north)/2],asphalt);
  box(L.interiorWidth,.10,L.interiorDepth,[0,-.04,-L.interiorDepth/2],concrete,g);
  box(L.width-.48,.10,L.depth,[0,-.04,L.depth/2],concrete,g);

  // The opening continues into the hall: floor, recessed back wall and roof frames.
  const interiorScreen=group([0,0,0],g,true);
  interiorScreen.name='old-loading-recess-screen';
  box(L.interiorWidth-.04,L.clearHeight-.15,.035,[0,(L.clearHeight-.15)/2,-L.interiorDepth+.035],inside,interiorScreen);
  for(const z of [-2.1,-6.7,-11.3]){
    box(L.interiorWidth-.12,.17,.17,[0,L.clearHeight-.13,z],steel,g);
    for(const side of [-1,1])rod([side*(L.interiorWidth/2-.25),L.clearHeight-.65,z],[side*(L.interiorWidth/2-1.5),L.clearHeight-.13,z],.035,steel,g);
    box(1.1,.07,.15,[0,L.clearHeight-.26,z],m.light,g);
  }
  for(const side of [-1,1]){
    box(.23,L.clearHeight,.30,[side*L.interiorWidth/2,L.clearHeight/2,.06],white,g);
    box(.08,1.05,.34,[side*(L.interiorWidth/2-.13),.525,.075],m.yellow,g);
    for(const y of [.25,.60,.95])box(.085,.13,.35,[side*(L.interiorWidth/2-.13),y,.075],m.dark,g);
  }
  box(L.interiorWidth+.38,.24,.36,[0,L.clearHeight+.02,.06],steel,g);
  box(L.interiorWidth-.10,.27,.18,[0,L.clearHeight-.16,-.20],base,g);
  for(const y of [L.clearHeight-.25,L.clearHeight-.16,L.clearHeight-.07])box(L.interiorWidth-.10,.025,.025,[0,y,-.10],steel,g);

  // Solid side cheeks and one broad opening match the photographed lean-to roof.
  const backHeight=5.65,frontHeight=5.05;
  for(const side of [-1,1]){
    // Both ends stay open so the trailer drives straight through; only slim posts carry the roof.
    const x=side*(L.width/2-.12);
    box(.34,frontHeight,.36,[x,frontHeight/2,L.depth-.10],white,g);
    box(.34,backHeight,.30,[x,backHeight/2,.15],white,g);
    cyl(.075,frontHeight,[x+side*.24,frontHeight/2,L.depth+.08],steel,g,undefined,12);
    cyl(.10,1.15,[x-side*.48,.575,L.depth+.6],m.yellow,g,undefined,12);
  }
  // The front face is closed with a solid wall and a roller-door panel.
  const frontScreen=group([0,0,0],g,true);frontScreen.name='old-loading-front-screen';
  box(L.width-.2,frontHeight-.1,.22,[0,(frontHeight-.1)/2,L.depth-.11],white,frontScreen);
  box(L.width-.2,.30,.30,[0,.15,L.depth-.11],base,g);
  box(L.width*.62,frontHeight-1.0,.06,[0,(frontHeight-1.0)/2+.15,L.depth+.02],steel,frontScreen);
  for(let y=.6;y<frontHeight-1.0;y+=.38)box(L.width*.62,.02,.07,[0,y+.15,L.depth+.045],inside,frontScreen);
  const roof=group([0,(backHeight+frontHeight)/2,L.depth/2],g,true);roof.name='old-loading-canopy-roof';
  roof.rotation.x=Math.atan2(backHeight-frontHeight,L.depth);
  const slopeLength=Math.hypot(L.depth,backHeight-frontHeight)+.60;
  box(L.width+.6,.14,slopeLength,[0,0,0],roofMat,roof);
  for(let x=-L.width/2;x<L.width/2+.1;x+=.57)box(.025,.035,slopeLength,[x,.09,0],seam,roof);
  for(const x of [-L.width/2-.23,L.width/2+.23])box(.10,.18,slopeLength,[x,-.015,0],steel,roof);
  box(L.width+.6,.32,.20,[0,frontHeight-.06,L.depth+.22],white,g);
  box(L.width-.32,.18,.18,[0,frontHeight-.29,L.depth-.22],steel,g);
  box(L.width+.65,.12,.18,[0,frontHeight+.10,L.depth+.24],steel,g);
  for(const x of [-4.8,4.8])box(.55,.09,.25,[x,frontHeight-.40,L.depth-.35],m.light,g);

  // Sparse guides stay under the canopy, leaving the through lane unobstructed.
  for(const dz of [-1.5,1.5])box(L.width+10,.008,.07,[L.x,.019,L.wallZ+L.depth/2+dz],m.yellow).castShadow=false;
  return {interiorScreen,roof,frontScreen};
}
