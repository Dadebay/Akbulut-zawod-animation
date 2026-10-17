import * as T from 'three';
import {PARKED_TRUCKS} from './trafficLayout.js';

// Office frontage, passenger parking and truck court follow the same axis.
export function buildNewFrontCourt(k,plants){
  const {box,mesh,cyl,rod,group,material,m}=k;
  const asphalt=material('#525b64',0,.97),curb=material('#d3d7d3',.02,.90);
  const paint=material('#dddeda',0,.88),pavers=material('#b9bfc0',0,.94);
  const lawn=material('#667d4a',0,.98),shrubPaint=material('#526b3c',0,.96);
  const shrubGeometry=new T.IcosahedronGeometry(1,1);
  const groundY=.04,paintY=.059;
  function flatBox(w,d,x,z,mat=paint,y=paintY){
    const item=box(w,.012,d,[x,y,z],mat);item.castShadow=false;return item;
  }
  function outline(w,d,r){
    const s=new T.Shape(),a=-w/2,b=w/2,c=-d/2,e=d/2;
    s.moveTo(a+r,c);s.lineTo(b-r,c);s.quadraticCurveTo(b,c,b,c+r);
    s.lineTo(b,e-r);s.quadraticCurveTo(b,e,b-r,e);s.lineTo(a+r,e);
    s.quadraticCurveTo(a,e,a,e-r);s.lineTo(a,c+r);s.quadraticCurveTo(a,c,a+r,c);s.closePath();return s;
  }
  function roundedSurface(w,d,r,x,z,bottom,height,mat){
    const geo=new T.ExtrudeGeometry(outline(w,d,r),{depth:height,bevelEnabled:false,curveSegments:7});geo.rotateX(-Math.PI/2);
    return mesh(geo,mat,[x,bottom,z]);
  }
  function bed(west,east,north,south,r=.75){
    const w=east-west,d=south-north,x=(west+east)/2,z=(north+south)/2;
    const edge=outline(w,d,Math.min(r,w/2,d/2));
    edge.holes.push(outline(w-.28,d-.28,Math.min(r-.14,(w-.28)/2,(d-.28)/2)));
    const curbGeometry=new T.ExtrudeGeometry(edge,{depth:.18,bevelEnabled:false,curveSegments:7});curbGeometry.rotateX(-Math.PI/2);
    mesh(curbGeometry,curb,[x,.025,z]);
    roundedSurface(w-.28,d-.28,Math.min(r-.14,(w-.28)/2,(d-.28)/2),x,z,.04,.13,lawn);
  }
  function shrub(x,z,size,index=0){
    const plant=mesh(shrubGeometry,shrubPaint,[x,.17+size*.55,z]);
    plant.scale.set(size,size*.72,size*.82);plant.rotation.y=index*1.7;
  }
  // One continuous paving outline avoids overlapping surfaces at the freight junction.
  const paving=new T.Shape();
  [[-136.6,-44.5],[-81.8,-44.5],[-81.8,-16.3],[-90.2,-16.3],[-90.2,-12.5],[-136.6,-12.5]].forEach(([x,z],i)=>i?paving.lineTo(x,-z):paving.moveTo(x,-z));
  paving.closePath();const pavingGeo=new T.ShapeGeometry(paving);pavingGeo.rotateX(-Math.PI/2);
  mesh(pavingGeo,asphalt,[0,groundY,0]).castShadow=false;

  // Two planted strips frame a 5.6 m bay depth and a separate 5.4 m parking aisle.
  // Their centre break lines up with the main office entrance at z = -25.
  const strips=[[-85.8,-82.2],[-99.1,-97.0]];
  for(const [west,east] of strips)for(const [north,south] of [[-43.2,-27.15],[-22.85,-17.0]]){
    bed(west,east,north,south,Math.min(.9,(east-west)/2));
    let index=0;
    for(let z=north+1.5;z<south-1;z+=2.7){
      plants.plant((west+east)/2,z,.24+(index%3)*.025);
      shrub(east-.55,z+.6,.29,index++);
    }
  }
  // Passenger bays stay empty as in the reference; white lines show their full depth.
  for(const [start,count] of [[-42.5,5],[-22.6,2]]){
    for(let i=0;i<=count;i++)flatBox(5.6,.085,-88.7,start+i*2.75);
    flatBox(.085,count*2.75,-85.9,start+count*2.75/2);
    for(let i=0;i<count;i++)box(.16,.10,1.55,[-86.35,.10,start+(i+.5)*2.75],curb);
  }
  // A flush pedestrian spine connects both landscaped strips to the office doors.
  flatBox(17.4,3.6,-90.4,-25,pavers,.074);
  flatBox(8.85,3.6,-69.075,-25,pavers,.065);
  for(let x=-98.8;x<-82;x+=.75)flatBox(.025,3.6,x,-25,curb,.084);
  for(let x=-73.2;x<-64.7;x+=.75)flatBox(.025,3.6,x,-25,curb,.075);
  for(let x=-81.1;x<-73.6;x+=.68)flatBox(.36,3.1,x,-25,paint,-.035);

  // Truck bays face a clear central manoeuvring lane, away from the passenger aisle.
  for(const {position,angle,scale} of PARKED_TRUCKS){
    const bay=group(position);bay.rotation.y=angle;
    for(const side of [-1,1])box(18*scale,.012,.09,[-6.3*scale,paintY,side*1.8],paint,bay).castShadow=false;
    box(.09,.012,3.6,[-15.3*scale,paintY,0],paint,bay).castShadow=false;
  }
  // The long rounded hatch is painted, so it does not obstruct vehicle turns.
  roundedSurface(2.1,26,1.05,-118.6,-28,.05,.012,paint).castShadow=false;
  roundedSurface(1.85,25.75,.92,-118.6,-28,.069,.008,asphalt).castShadow=false;
  for(let z=-39.3;z<-16.5;z+=.48){const stripe=flatBox(1.82,.065,-118.6,z,paint,.092);stripe.rotation.y=-.48;}

  // Full, low planting beds soften both white office facades without covering doors.
  for(const [north,south] of [[-36.9,-27.3],[-22.7,-11.1],[4.8,10.1],[15.5,20.8]]){
    bed(-72.9,-66.1,north,south,1.2);
    let index=0;
    for(let z=north+1.2;z<south-1;z+=2.15){
      for(const [x,size] of [[-70.9,.34],[-68.1,.27]])plants.plant(x+(index%2?.15:-.12),z,size+(index%3)*.035);
      shrub(-69.5,z+.6,.62,index);shrub(-72.15,z,.36,index+1);shrub(-66.8,z,.40,index+2);index++;
    }
  }
  flatBox(9.1,3.1,-69.2,12.8,pavers,.065);
  for(let x=-73.4;x<-64.7;x+=.75)flatBox(.025,3.1,x,12.8,curb,.075);
  for(const [x,z] of [[-83.9,-40.9],[-83.9,-18.8],[-98.1,-40.9],[-98.1,-18.8]]){
    cyl(.045,4.2,[x,2.1,z],m.steel);rod([x,4.1,z],[x-.65,4.35,z],.035,m.steel);
    box(.65,.08,.23,[x-.65,4.35,z],m.light);
  }
}
