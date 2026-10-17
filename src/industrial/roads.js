import * as T from 'three';
import {DISPATCH_PAVEMENT,MAIN_ROAD_X,MAIN_ROAD_WIDTH} from './trafficLayout.js';
import {OUTER_RAIL_Z,POND_APPROACH,VISITOR_PARK,OLD_ENTRANCE,OLD_FRONT_COURT as COURT,OLD_PAVILION,OLD_LEFT_CAMPUS as LEFT} from './siteLayout.js';

export function buildRoads(k){
  const {box,mesh,material,group}=k;
  const asphalt=material('#656c70',0,.98),shoulder=material('#aba99f',0,1),curb=material('#bfc0b9',0,.94),pavers=material('#b5b6ad',0,.97),paint=material('#deddd1',0,.92),drain=material('#444c4d',.6,.7);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=91;
  for(let i=0;i<pixels.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const c=166+(seed%69);pixels.data[i]=c;pixels.data[i+1]=c;pixels.data[i+2]=c;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);const tex=k.trackTexture(new T.CanvasTexture(canvas));tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;asphalt.map=tex;asphalt.bumpMap=tex;asphalt.bumpScale=.013;
  const atRailCrossing=p=>Math.abs(p.x-MAIN_ROAD_X)<8&&Math.abs(p.z-OUTER_RAIL_Z)<4;
  const junctions=[[-143,-61],[-143,-2],[LEFT.frontRoadX,-61],[LEFT.frontRoadX,OLD_ENTRANCE.innerZ],[OLD_PAVILION.serviceX,-61],[OLD_PAVILION.serviceX,-78],[-143,POND_APPROACH.z],[LEFT.frontRoadX,POND_APPROACH.z],[VISITOR_PARK.entryX,POND_APPROACH.z]];
  function band(path,width,y,mat,offset=0){
    const n=Math.ceil(path.getLength()/1.5),p=[],uv=[],indices=[];
    for(let i=0;i<=n;i++){const point=path.getPointAt(i/n),t=path.getTangentAt(i/n),normal=new T.Vector3(-t.z,0,t.x);for(const side of [-1,1]){const v=point.clone().addScaledVector(normal,offset+side*width/2);p.push(v.x,y,v.z);uv.push(v.x/3,v.z/3);}if(i<n){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,mat);
  }
  function arrow(pos,angle){const s=new T.Shape();s.moveTo(-.12,-1.3);s.lineTo(.12,-1.3);s.lineTo(.12,.38);s.lineTo(.48,.38);s.lineTo(0,1.1);s.lineTo(-.48,.38);s.lineTo(-.12,.38);s.closePath();const g=group(pos);g.rotation.y=angle;const o=mesh(new T.ShapeGeometry(s),paint,[0,0,0],g);o.rotation.x=-Math.PI/2;o.castShadow=false;}
  // Shared heights keep paint above asphalt regardless of road creation order.
  // Overlapping road ribbons use the same material and world-space UVs.
  const surfaceY=-.095,markingY=-.078,junctionY=-.060,freightY=-.064,freightMarkingY=-.048;
  function road(points,width=7.2,{sidewalk=true,mark=true,edgeMarkings=true,closed=false}={}){
    const path=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)),closed,'catmullrom',.08),len=path.getLength();
    band(path,width+2.6,-.18,shoulder).castShadow=false;const surface=band(path,width,surfaceY,asphalt);surface.castShadow=false;
    for(const side of [-1,1]){
      for(let d=.7;d<len;d+=1.25){
        const t=d/len,p=path.getPointAt(t),v=path.getTangentAt(t),n=new T.Vector3(-v.z,0,v.x);
        const atOldGate=(Math.abs(p.z-OLD_ENTRANCE.z)<9&&Math.abs(p.x-OLD_ENTRANCE.outerX)<9.5)||
          (Math.abs(p.z-OLD_ENTRANCE.innerZ)<9&&Math.abs(p.x-OLD_ENTRANCE.innerX)<6.7)||
          (Math.abs(p.x-LEFT.frontRoadX)<1&&Math.abs(p.z-COURT.entryZ)<COURT.entryWidth/2+.5);
        if(atOldGate||atRailCrossing(p)||junctions.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<(x===MAIN_ROAD_X&&z===-2?22:7.5)))continue;
        const edge=p.clone().addScaledVector(n,side*(width/2+.12)),a=-Math.atan2(v.z,v.x);
        const c=box(1.18,.19,.25,[edge.x,-.015,edge.z],curb);c.rotation.y=a;
        if(sidewalk){const walk=p.clone().addScaledVector(n,side*(width/2+1));const slab=box(1.23,.045,1.55,[walk.x,-.0325,walk.z],pavers);slab.rotation.y=a;}
        if(edgeMarkings){const stripe=p.clone().addScaledVector(n,side*(width/2-.28));const marking=box(1.26,.006,.11,[stripe.x,markingY,stripe.z],paint);marking.rotation.y=a;marking.castShadow=false;}
      }
    }
    if(mark)for(let d=2;d<len-2;d+=7){const p=path.getPointAt(d/len),t=path.getTangentAt(d/len);if(atRailCrossing(p)||junctions.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<7))continue;const dash=box(3,.008,.105,[p.x,markingY,p.z],paint);dash.rotation.y=-Math.atan2(t.z,t.x);dash.castShadow=false;}
    for(let d=18;d<len;d+=44){const t=d/len,p=path.getPointAt(t),v=path.getTangentAt(t),n=new T.Vector3(-v.z,0,v.x);p.addScaledVector(n,width/2-.43);const g=group([p.x,-.065,p.z]);g.rotation.y=-Math.atan2(v.z,v.x);box(.65,.015,.40,[0,0,0],drain,g);for(let dx=-.26;dx<.3;dx+=.09)box(.025,.025,.34,[dx,.015,0],curb,g);}
    return path;
  }
  road([[MAIN_ROAD_X,-174],[MAIN_ROAD_X,23],[MAIN_ROAD_X,201]],MAIN_ROAD_WIDTH);
  // The photographed pavilion has a fenced garden facing the railway.
  // Service traffic uses the courtyard and the link at the building's far end.
  road([[-163,-61],[LEFT.frontRoadX,-61]],7.4);
  road([[OLD_PAVILION.serviceX,-61],[110,-61]],7.4);
  road([[OLD_PAVILION.serviceX,-78],[OLD_PAVILION.serviceX,-61]],7.4,{mark:false});
  // One outside frontage road serves the two gates; the hall frontage is a concrete court.
  road([[LEFT.frontRoadX,POND_APPROACH.z],[LEFT.frontRoadX,-61]],7.0,{sidewalk:false,mark:false,edgeMarkings:false});
  road([[LEFT.frontRoadX,OLD_ENTRANCE.innerZ],[0,OLD_ENTRANCE.innerZ]],9.0,{sidewalk:false,mark:false});
  // Narrow unmarked lane outside the warehouse-side fence, as in the photo.
  road([[LEFT.frontRoadX,LEFT.sideRoadZ],[100,LEFT.sideRoadZ]],LEFT.sideRoadWidth,{sidewalk:false,mark:false,edgeMarkings:false});
  // The divided pond-side avenue meets the front street and narrower outside lane.
  road([[POND_APPROACH.west,POND_APPROACH.z],[POND_APPROACH.east,POND_APPROACH.z]],POND_APPROACH.width,{mark:false});
  road([[VISITOR_PARK.entryX,VISITOR_PARK.south-2],[VISITOR_PARK.entryX,POND_APPROACH.z]],VISITOR_PARK.entryWidth,{sidewalk:false,mark:false});
  // One slightly raised asphalt patch per junction prevents overlapping ribbons
  // from flickering, and keeps curb/sidewalk strips out of the driving opening.
  for(const [x,z] of junctions){const patch=box(9.6,.012,9.6,[x,junctionY-.006,z],asphalt,k.scene,.8);patch.castShadow=false;}
  // Rectangular lanes and square junctions, independent of the steering curves.
  const vertices=[],uvs=[],indices=[];
  for(const polygon of DISPATCH_PAVEMENT){const base=vertices.length/3;for(const [x,z] of polygon){vertices.push(x,freightY,z);uvs.push(x/3,z/3);}indices.push(base,base+2,base+1,base,base+3,base+2);}
  const freightGeometry=new T.BufferGeometry();freightGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));freightGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));freightGeometry.setIndex(indices);freightGeometry.computeVertexNormals();mesh(freightGeometry,asphalt).castShadow=false;
  for(const [x,z,angle] of [[28,-47.7,Math.PI/2],[-18,-47.7,Math.PI/2],[-78,-26,Math.PI],[-108,-2,Math.PI/2],[-126,-2,Math.PI/2]])arrow([x,freightMarkingY,z],angle);
  // Edge lines stop at the junction openings. All runs are straight and aligned
  // with the hall, parking and gate rather than following a vehicle's turn.
  for(const [w,d,x,z] of [[112,.10,-8,-49.7],[8,.10,-69.5,-37.45],[.10,20,-81.2,-26],[.10,28,-73.8,-20],[42,.10,-111,-6.2],[47,.10,-113,3.2]])box(w,.008,d,[x,freightMarkingY,z],paint).castShadow=false;
  for(const z of [-26,23,104,163]){arrow([-145.25,markingY,z],0);arrow([-140.75,markingY,z],Math.PI);}
  for(const x of [-112,66]){arrow([x,markingY,-59.2],-Math.PI/2);arrow([x,markingY,-62.8],Math.PI/2);}
  // The marked crossing belongs to the new plant's truck gate.
  const crossing=group([-143,markingY,7]);
  for(let dz=-1.7;dz<1.8;dz+=.6)box(6.8,.009,.32,[0,0,dz],paint,crossing).castShadow=false;
  box(3.1,.01,.25,[-1.65,0,-3.0],paint,crossing).castShadow=false;
}
