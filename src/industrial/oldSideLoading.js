import * as T from 'three';
import {OLD_SIDE_LOADING as L} from './siteLayout.js';

// Wide covered vehicle entrance on the old hall's railway-facing side.
export function buildOldSideLoading(k){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const white=material('#dfe2db',.04,.86),base=material('#a7aaa2',0,.94);
  const roofMat=material('#4f8069',.25,.60),seam=material('#87a994',.27,.64);
  const steel=material('#bbc8bf',.50,.48),inside=material('#56625d',0,.98);
  const concrete=material('#b9baae',0,.96),joint=material('#a5a89b',0,.98);
  const {apron:A}=L,front=L.wallZ+L.depth,back=L.wallZ-L.interiorDepth;
  const g=group([L.x,0,L.wallZ]);g.name='old-factory-truck-entrance';

  // A flush apron connects to the long courtyard drive on both sides.
  box(A.east-A.west,.12,A.south-A.north,[(A.east+A.west)/2,-.075,(A.south+A.north)/2],concrete);
  for(let x=A.west+5;x<A.east;x+=5)box(.018,.006,A.south-A.north,[x,-.009,(A.south+A.north)/2],joint).castShadow=false;
  for(let z=A.north+5;z<A.south;z+=5)box(A.east-A.west,.006,.018,[(A.east+A.west)/2,-.009,z],joint).castShadow=false;
  box(L.interiorWidth,.10,L.interiorDepth,[0,-.04,-L.interiorDepth/2],concrete,g);
  box(L.width-.48,.10,L.depth,[0,-.04,L.depth/2],concrete,g);

  // The opening continues into the hall: floor, recessed back wall and roof frames.
  box(L.interiorWidth-.04,L.clearHeight-.15,.035,[0,(L.clearHeight-.15)/2,-L.interiorDepth+.035],inside,g);
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
  const wallShape=new T.Shape();wallShape.moveTo(0,0);wallShape.lineTo(L.depth,0);
  wallShape.lineTo(L.depth,frontHeight-.08);wallShape.lineTo(0,backHeight-.08);wallShape.closePath();
  const wallGeo=new T.ExtrudeGeometry(wallShape,{depth:.24,bevelEnabled:false});
  wallGeo.translate(0,0,-.12);wallGeo.rotateY(-Math.PI/2);
  for(const side of [-1,1]){
    const x=side*(L.width/2-.12);
    mesh(wallGeo,white,[x,0,0],g);
    box(.29,.32,L.depth,[x,.16,L.depth/2],base,g);
    for(let z=.45;z<L.depth;z+=.85){
      const height=backHeight+(frontHeight-backHeight)*z/L.depth-.2;
      box(.025,height,.023,[x+side*.135,height/2,z],steel,g);
    }
    box(.34,frontHeight,.36,[x,frontHeight/2,L.depth-.10],white,g);
    cyl(.075,frontHeight,[x+side*.24,frontHeight/2,L.depth+.08],steel,g,undefined,12);
    cyl(.10,1.15,[x-side*.48,.575,L.depth+.6],m.yellow,g,undefined,12);
  }
  const roof=group([0,(backHeight+frontHeight)/2,L.depth/2],g);
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
  for(const x of [-2.0,2.0])box(.07,.008,L.interiorDepth+L.depth-.7,[L.x+x,.019,(back+front-.7)/2],m.yellow).castShadow=false;
}
