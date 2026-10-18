import * as T from 'three';
import {DISPATCH_PAVEMENT,MAIN_ROAD_X,MAIN_ROAD_SEGMENTS} from './trafficLayout.js';
import {OUTER_RAIL_Z,POND_APPROACH,VISITOR_PARK,OLD_ENTRANCE,OLD_APPROACH,oldEntranceRoadZ,OLD_FRONT_COURT as COURT,OLD_PAVILION,OLD_LEFT_CAMPUS as LEFT,NEW_ENTRANCE_ROAD as GATE_ROAD} from './siteLayout.js';
import {RAIL_LAYOUT} from './rail.js';

export function buildRoads(k){
  const {box,mesh,material,group}=k;
  const asphalt=k.m.road,shoulder=material('#aba99f',0,1),curb=material('#bfc0b9',0,.94),pavers=material('#b5b6ad',0,.97),paint=material('#deddd1',0,.92),drain=material('#444c4d',.6,.7);
  const atRailCrossing=p=>(Math.abs(p.x-MAIN_ROAD_X)<8||Math.abs(p.x-GATE_ROAD.outer.x)<8)&&Math.abs(p.z-OUTER_RAIL_Z)<4;
  const junctions=[[-143,-2],[LEFT.frontRoadX,-61],[LEFT.frontRoadX,oldEntranceRoadZ(LEFT.frontRoadX)],[LEFT.frontRoadX,LEFT.sideRoadZ],[VISITOR_PARK.entryX,oldEntranceRoadZ(VISITOR_PARK.entryX)],[GATE_ROAD.outer.x,GATE_ROAD.z],[OLD_APPROACH.west,oldEntranceRoadZ(OLD_APPROACH.west)]];
  function band(path,width,y,mat,offset=0){
    const n=Math.ceil(path.getLength()/1.5),p=[],uv=[],indices=[];
    for(let i=0;i<=n;i++){const point=path.getPointAt(i/n),t=path.getTangentAt(i/n),normal=new T.Vector3(-t.z,0,t.x);for(const side of [-1,1]){const v=point.clone().addScaledVector(normal,offset+side*width/2);p.push(v.x,y,v.z);uv.push(v.x/3,v.z/3);}if(i<n){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,mat);
  }
  function arrow(pos,angle){const s=new T.Shape();s.moveTo(-.12,-1.3);s.lineTo(.12,-1.3);s.lineTo(.12,.38);s.lineTo(.48,.38);s.lineTo(0,1.1);s.lineTo(-.48,.38);s.lineTo(-.12,.38);s.closePath();const g=group(pos);g.rotation.y=angle;const o=mesh(new T.ShapeGeometry(s),paint,[0,0,0],g);o.rotation.x=-Math.PI/2;o.castShadow=false;}
  // Shared heights keep paint above asphalt regardless of road creation order.
  // Overlapping road ribbons use the same material and world-space UVs.
  const surfaceY=-.095,markingY=-.078,junctionY=-.060,freightY=-.064,freightMarkingY=-.048;
  function road(points,width=7.2,{sidewalk=true,mark=true,edgeMarkings=true,curbEdges=true,curbSides=[-1,1],junctionSides=[-1,1],closed=false}={}){
    const path=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)),closed,'catmullrom',.08),len=path.getLength();
    band(path,width+2.6,-.18,shoulder).castShadow=false;const surface=band(path,width,surfaceY,asphalt);surface.castShadow=false;
    for(const side of [-1,1]){
      for(let d=.7;d<len;d+=1.25){
        const t=d/len,p=path.getPointAt(t),v=path.getTangentAt(t),n=new T.Vector3(-v.z,0,v.x);
        const atOldGate=(Math.abs(p.z-OLD_ENTRANCE.z)<9&&Math.abs(p.x-OLD_ENTRANCE.outerX)<9.5)||
          (Math.abs(p.z-OLD_ENTRANCE.innerZ)<9&&Math.abs(p.x-OLD_ENTRANCE.innerX)<6.7)||
          (Math.abs(p.x-LEFT.frontRoadX)<1&&Math.abs(p.z-COURT.entryZ)<COURT.entryWidth/2+.5);
        if(atOldGate||atRailCrossing(p)||(junctionSides.includes(side)&&junctions.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<(x===MAIN_ROAD_X&&z===-2?22:7.5))))continue;
        const edge=p.clone().addScaledVector(n,side*(width/2+.12)),a=-Math.atan2(v.z,v.x);
        if(curbEdges&&curbSides.includes(side)){const c=box(1.18,.19,.25,[edge.x,-.015,edge.z],curb);c.rotation.y=a;}
        if(sidewalk){const walk=p.clone().addScaledVector(n,side*(width/2+1));const slab=box(1.23,.045,1.55,[walk.x,-.0325,walk.z],pavers);slab.rotation.y=a;}
        if(edgeMarkings){const stripe=p.clone().addScaledVector(n,side*(width/2-.28));const marking=box(1.26,.006,.11,[stripe.x,markingY,stripe.z],paint);marking.rotation.y=a;marking.castShadow=false;}
      }
    }
    if(mark)for(let d=2;d<len-2;d+=7){const p=path.getPointAt(d/len),t=path.getTangentAt(d/len);if(atRailCrossing(p)||junctions.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<7))continue;const dash=box(3,.008,.105,[p.x,markingY,p.z],paint);dash.rotation.y=-Math.atan2(t.z,t.x);dash.castShadow=false;}
    for(let d=18;d<len;d+=44){const t=d/len,p=path.getPointAt(t),v=path.getTangentAt(t),n=new T.Vector3(-v.z,0,v.x);p.addScaledVector(n,width/2-.43);const g=group([p.x,-.065,p.z]);g.rotation.y=-Math.atan2(v.z,v.x);box(.65,.015,.40,[0,0,0],drain,g);for(let dx=-.26;dx<.3;dx+=.09)box(.025,.025,.34,[dx,.015,0],curb,g);}
    return path;
  }
  for(const [north,south,width] of MAIN_ROAD_SEGMENTS)road([[MAIN_ROAD_X,north],[MAIN_ROAD_X,(north+south)/2],[MAIN_ROAD_X,south]],width);
  // The south sidewalk continues into both corner runs at the same width.
  // Its roadward curb would add 23 cm only to the middle of the white band.
  road([[GATE_ROAD.west,GATE_ROAD.z],[GATE_ROAD.east,GATE_ROAD.z]],GATE_ROAD.width,{curbSides:[-1]});
  // Both approaches join from the east; the opposite sidewalk stays continuous.
  road([[GATE_ROAD.outer.x,GATE_ROAD.outer.north],[GATE_ROAD.outer.x,GATE_ROAD.outer.south]],GATE_ROAD.outer.width,{junctionSides:[-1]});
  // Continue the 1.23 m slabs on the same 1.25 m pitch as the road sidewalks.
  // Only the final stone at a corner may be cut to meet the adjoining run.
  function sidewalkTiles(start,end,cross,crossWidth,alongX,curbSide=0){
    for(let from=start;from<end-.04;from+=1.25){
      const length=Math.min(1.23,end-from-.01);
      const at=from+length/2;
      box(alongX?length:crossWidth,.045,alongX?crossWidth:length,
        [alongX?at:cross,-.0325,alongX?cross:at],pavers);
      if(curbSide){
        const edge=cross+curbSide*(crossWidth/2+.105),curbLength=Math.min(1.18,length);
        box(alongX?curbLength:.25,.19,alongX?.25:curbLength,
          [alongX?at:edge,-.015,alongX?edge:at],curb);
      }
    }
  }
  // Extend the exact gate-road slab sequence into the outer-road corner.
  // The short turning stone stops before the next existing avenue slab.
  sidewalkTiles(-201.231,-197.501,3.7,1.55,true);
  sidewalkTiles(4.485,5.105,-200.3,1.55,false);
  // Close the opposite outer-road corner with the same paving stones.
  sidewalkTiles(-9.875,-8.485,-200.3,1.55,false,-1);
  sidewalkTiles(-199.505,-197.501,-7.7,1.55,true,1);
  box(1.55,.045,1.55,[-200.3,-.0325,-7.7],pavers);
  box(.25,.19,1.78,[-201.18,-.015,-7.585],curb);
  box(1.55,.19,.25,[-200.3,-.015,-6.82],curb);
  // Truck-gate corner: continue the white stones along the grass on both sides.
  sidewalkTiles(-164.915,-148.385,3.7,1.55,true);
  box(1.53,.045,1.53,[-147.6,-.0325,3.7],pavers);
  sidewalkTiles(4.485,19.825,-147.6,1.55,false);
  // Straight woodland corner, using the existing slab and curb pattern.
  // Grey bedding keeps grass out of the joints and the roadward edge.
  for(const [west,east,north,south] of [
    [-166.175,-146.595,-8.475,-6.695],
    [-148.375,-146.595,-25.175,-8.475]
  ]){
    box(east-west,.045,south-north,[(west+east)/2,-.0405,(north+south)/2],shoulder).castShadow=false;
  }
  sidewalkTiles(-164.915,-148.385,-7.7,1.55,true,1);
  sidewalkTiles(-23.915,-8.485,-147.6,1.55,false,1);
  box(1.53,.045,1.53,[-147.6,-.0325,-7.7],pavers);
  box(1.78,.19,.25,[-147.485,-.015,-6.82],curb);
  box(.25,.19,1.53,[-146.72,-.015,-7.71],curb);
  // Both corners where the divided pond approach meets the outer avenue.
  const pondCornerX=GATE_ROAD.outer.x+GATE_ROAD.outer.width/2+1;
  for(const side of [-1,1]){
    const z=OLD_APPROACH.z+side*(OLD_APPROACH.width/2+1);
    box(5.13,.045,1.78,[pondCornerX+1.56,-.0405,z-side*.115],shoulder).castShadow=false;
    // Keep the existing slab pitch; only the stone beside the corner is cut.
    sidewalkTiles(-199.515,-198.675,z,1.55,true,-side);
    sidewalkTiles(-198.665,-197.425,z,1.55,true,-side);
    box(1.53,.045,1.53,[pondCornerX,-.0325,z],pavers);
    box(1.78,.19,.25,[pondCornerX-.115,-.015,z-side*.88],curb);
    box(.25,.19,1.53,[pondCornerX-.88,-.015,z+side*.01],curb);
  }
  for(const [north,south] of [[-133.175,-131.475],[-117.525,-115.675]]){
    box(1.78,.045,south-north,[pondCornerX-.115,-.0405,(north+south)/2],shoulder).castShadow=false;
  }
  sidewalkTiles(-131.915,-131.485,pondCornerX,1.55,false,-1);
  sidewalkTiles(-117.515,-116.925,pondCornerX,1.55,false,-1);
  // The photographed pavilion has a fenced garden facing the railway.
  // Service traffic uses the courtyard and the link at the building's far end.
  // The transverse frontage lane crosses the straight entrance avenue.
  road([[LEFT.frontRoadX,LEFT.sideRoadZ],[LEFT.frontRoadX,-61],[LEFT.frontRoadX,-55.2]],7.0,{sidewalk:false,mark:false,edgeMarkings:false,curbEdges:false});
  // Continue the pale shoulder beside the orchard to the freight rail ballast.
  const railSidewalkEnd=RAIL_LAYOUT.z-2.1;
  const railSidewalk=box(1.3,.045,railSidewalkEnd-COURT.entryZ,
    [LEFT.frontRoadX-4.15,-.0325,(COURT.entryZ+railSidewalkEnd)/2],pavers);
  railSidewalk.castShadow=false;
  // Narrow unmarked lane outside the warehouse-side fence, as in the photo.
  road([[LEFT.frontRoadX,LEFT.sideRoadZ],[100,LEFT.sideRoadZ]],LEFT.sideRoadWidth,{sidewalk:false,mark:false,edgeMarkings:false});
  // A single straight ribbon includes the outside approach, both checkpoints
  // and the courtyard. There is no angled joining segment at either gate.
  road([[OLD_APPROACH.west,oldEntranceRoadZ(OLD_APPROACH.west)],[OLD_APPROACH.east,oldEntranceRoadZ(OLD_APPROACH.east)]],OLD_APPROACH.width,{mark:false,edgeMarkings:false});
  road([[VISITOR_PARK.entryX,VISITOR_PARK.south-2],[VISITOR_PARK.entryX,oldEntranceRoadZ(VISITOR_PARK.entryX)]],VISITOR_PARK.entryWidth,{sidewalk:false,mark:false});
  // One slightly raised asphalt patch per junction prevents overlapping ribbons
  // from flickering, and keeps curb/sidewalk strips out of the driving opening.
  for(const [x,z] of junctions){const patch=box(9.6,.012,9.6,[x,junctionY-.006,z],asphalt,k.scene,.8);patch.castShadow=false;}
  // Rectangular lanes and square junctions, independent of the steering curves.
  const vertices=[],uvs=[],indices=[];
  for(const polygon of DISPATCH_PAVEMENT){const base=vertices.length/3;for(const [x,z] of polygon){vertices.push(x,freightY,z);uvs.push(x/3,z/3);}indices.push(base,base+2,base+1,base,base+3,base+2);}
  const freightGeometry=new T.BufferGeometry();freightGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));freightGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));freightGeometry.setIndex(indices);freightGeometry.computeVertexNormals();mesh(freightGeometry,asphalt).castShadow=false;
  // The corner joins the passenger court with the same continuous asphalt.
  const courtPaving=asphalt;
  for(const [west,east,north,south] of [[-81.5,-65.5,-45.3,-37.2],[-81.5,-73.5,-37.2,-16.3]]){const patch=box(east-west,.01,south-north,[(west+east)/2,-.058,(north+south)/2],courtPaving);patch.castShadow=false;}
  for(const [x,z,angle] of [[28,-47.7,Math.PI/2],[-18,-47.7,Math.PI/2],[-78,-26,Math.PI],[-108,-2,Math.PI/2],[-126,-2,Math.PI/2]])arrow([x,freightMarkingY,z],angle);
  // Edge lines stop at the junction openings. All runs are straight and aligned
  // with the hall, parking and gate rather than following a vehicle's turn.
  for(const [w,d,x,z] of [[112,.10,-8,-49.7],[8,.10,-69.5,-37.45],[.10,20,-81.2,-26],[.10,28,-73.8,-20],[42,.10,-111,-6.2],[47,.10,-113,3.2]])box(w,.008,d,[x,freightMarkingY,z],paint).castShadow=false;
  for(const z of [-26,23]){
    const width=MAIN_ROAD_SEGMENTS.find(([north,south])=>z>=north&&z<=south)[2];
    const laneOffset=width/4;
    arrow([MAIN_ROAD_X-laneOffset,markingY,z],0);
    arrow([MAIN_ROAD_X+laneOffset,markingY,z],Math.PI);
  }
    // The marked crossing belongs to the new plant's truck gate.
  const crossing=group([-143,markingY,7]);
  for(let dz=-1.7;dz<1.8;dz+=.6)box(6.8,.009,.32,[0,0,dz],paint,crossing).castShadow=false;
}
