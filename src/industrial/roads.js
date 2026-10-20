import * as T from 'three';
import {DISPATCH_PAVEMENT,MAIN_ROAD_X,MAIN_ROAD_SEGMENTS} from './trafficLayout.js';
import {OUTER_RAIL_Z,POND_APPROACH,VISITOR_PARK,OLD_ENTRANCE,OLD_APPROACH,oldEntranceRoadZ,OLD_FRONT_COURT as COURT,OLD_PAVILION,OLD_LEFT_CAMPUS as LEFT,NEW_FACTORY_ENTRANCE as ENTRANCE,NEW_ENTRANCE_ROAD as GATE_ROAD} from './siteLayout.js';
import {RAIL_LAYOUT} from './rail.js';

export function buildRoads(k){
  const {box,mesh,material,group}=k;
  const asphalt=k.m.road,shoulder=material('#aba99f',0,1),curb=material('#e9e9e4',0,.9),pavers=material('#d1d2ce',0,.97),paint=material('#deddd1',0,.92),drain=material('#444c4d',.6,.7);
  // The reference uses one 1.23 x 1.55 m stone per 1.25 m pitch, with a
  // faint diagonal grain and a short recessed mark on every stone.
  const stoneLength=1.23,stonePitch=1.25,stoneWidth=1.55;
  const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=256;
  const stoneCtx=stoneCanvas.getContext('2d');
  stoneCtx.fillStyle='#dedfdb';stoneCtx.fillRect(0,0,256,256);
  stoneCtx.fillStyle='rgba(255,255,255,.13)';
  for(let x=-256;x<512;x+=46){
    stoneCtx.beginPath();stoneCtx.moveTo(x,0);stoneCtx.lineTo(x+18,0);
    stoneCtx.lineTo(x+274,256);stoneCtx.lineTo(x+256,256);stoneCtx.closePath();stoneCtx.fill();
  }
  stoneCtx.fillStyle='rgba(76,88,91,.60)';stoneCtx.fillRect(62,62,78,4);
  const stoneMap=k.trackTexture(new T.CanvasTexture(stoneCanvas));
  stoneMap.colorSpace=T.SRGBColorSpace;stoneMap.anisotropy=4;pavers.map=stoneMap;pavers.needsUpdate=true;
  // The exposed walk foundations at junctions use the same stones as the
  // raised runs. Repeat by metres instead of stretching one stone over a strip.
  const walkCanvas=document.createElement('canvas');walkCanvas.width=walkCanvas.height=256;
  const walkCtx=walkCanvas.getContext('2d');
  walkCtx.fillStyle='#aba99f';walkCtx.fillRect(0,0,256,256);
  // Each stone cell is four small stones, as on the raised sidewalks.
  const cellWidth=256*stoneLength/stonePitch;
  for(const i of [0,1])for(const j of [0,1])
    walkCtx.drawImage(stoneCanvas,i*cellWidth/2+1,j*128+1,cellWidth/2-2,126);
  const walkMap=k.trackTexture(new T.CanvasTexture(walkCanvas));
  walkMap.colorSpace=T.SRGBColorSpace;walkMap.anisotropy=4;
  walkMap.wrapS=walkMap.wrapT=T.RepeatWrapping;
  shoulder.color.copy(pavers.color);shoulder.map=walkMap;shoulder.needsUpdate=true;
  const stoneOrigin=.7-stoneLength/2;
  const atRailCrossing=p=>(Math.abs(p.x-MAIN_ROAD_X)<8||Math.abs(p.x-GATE_ROAD.outer.x)<8)&&Math.abs(p.z-OUTER_RAIL_Z)<4;
  const junctions=[[-143,-2],[LEFT.frontRoadX,-61],[LEFT.frontRoadX,oldEntranceRoadZ(LEFT.frontRoadX)],[LEFT.frontRoadX,LEFT.sideRoadZ],[VISITOR_PARK.entryX,oldEntranceRoadZ(VISITOR_PARK.entryX)],[GATE_ROAD.outer.x,GATE_ROAD.z],[OLD_APPROACH.west,oldEntranceRoadZ(OLD_APPROACH.west)]];
  // No stone may reach into a joining carriageway: the pond and new-plant
  // approaches clear their full width plus sidewalk, the visitor entry its half width plus half a stone.
  const junctionRadius=(x,z)=>x===MAIN_ROAD_X&&z===-2?22:
    x===OLD_APPROACH.west&&z===OLD_APPROACH.z?OLD_APPROACH.width/2+1.775:
    x===GATE_ROAD.outer.x&&z===GATE_ROAD.z?GATE_ROAD.width/2+1.775:
    x===VISITOR_PARK.entryX?VISITOR_PARK.entryWidth/2+stonePitch/2:4.3;
  const factoryFenceRuns=[[-50,ENTRANCE.z+ENTRANCE.left*ENTRANCE.widthScale],[ENTRANCE.z+ENTRANCE.right*ENTRANCE.widthScale,40]];
  function band(path,width,y,mat,offset=0,tileCentre=offset){
    const length=path.getLength(),n=Math.ceil(length/1.5),p=[],uv=[],indices=[];
    for(let i=0;i<=n;i++){const point=path.getPointAt(i/n),t=path.getTangentAt(i/n),normal=new T.Vector3(-t.z,0,t.x);for(const side of [-1,1]){const v=point.clone().addScaledVector(normal,offset+side*width/2);p.push(v.x,y,v.z);if(mat===shoulder)uv.push((i*length/n-stoneOrigin)/stonePitch,.5-(offset+side*width/2-tileCentre)/stoneWidth);else uv.push(v.x/3,v.z/3);}if(i<n){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,mat);
  }
  function arrow(pos,angle){const s=new T.Shape();s.moveTo(-.12,-1.3);s.lineTo(.12,-1.3);s.lineTo(.12,.38);s.lineTo(.48,.38);s.lineTo(0,1.1);s.lineTo(-.48,.38);s.lineTo(-.12,.38);s.closePath();const g=group(pos);g.rotation.y=angle;const o=mesh(new T.ShapeGeometry(s),paint,[0,0,0],g);o.rotation.x=-Math.PI/2;o.castShadow=false;}
  // Shared heights keep paint above asphalt regardless of road creation order.
  // Overlapping road ribbons use the same material and world-space UVs.
  const surfaceY=-.095,markingY=-.078,junctionY=-.060,freightY=-.064,freightMarkingY=-.048;
  function road(points,width=7.2,{sidewalk=true,sidewalkEndX=Infinity,mark=true,edgeMarkings=true,curbEdges=true,curbSides=[-1,1],junctionSides=[-1,1],closed=false}={}){
    const path=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)),closed,'catmullrom',.08),len=path.getLength();
    // Real stones run right up to each side road's edge (half its width plus a stone); only the
    // opening itself is left bare. Keep the paving beneath the asphalt and lawns: intersecting roads cut
    // their own openings, while the remaining pedestrian corners stay tiled.
    const surface=band(path,width,surfaceY,asphalt);surface.castShadow=false;
    // The former sidewalk strips are paved with the road asphalt.
    if(sidewalk)for(const side of [-1,1])band(path,1.8,surfaceY,asphalt,side*(width/2+.9)).castShadow=false;
    for(const side of [-1,1]){
      for(let d=.7;d<len;d+=stonePitch){
        const t=d/len,p=path.getPointAt(t),v=path.getTangentAt(t),n=new T.Vector3(-v.z,0,v.x);
        const atOldGate=(Math.abs(p.z-OLD_ENTRANCE.z)<9&&Math.abs(p.x-OLD_ENTRANCE.outerX)<2.6)||
          (Math.abs(p.z-OLD_ENTRANCE.innerZ)<9&&Math.abs(p.x-OLD_ENTRANCE.innerX)<5.4)||
          (Math.abs(p.x-LEFT.frontRoadX)<1&&Math.abs(p.z-COURT.entryZ)<COURT.entryWidth/2+.5);
        // The visitor entry only joins from the parking side; the pond-side walk runs past it.
        if(atOldGate||atRailCrossing(p)||(junctionSides.includes(side)&&junctions.some(([x,z])=>!(x===VISITOR_PARK.entryX&&side*n.z>0)&&Math.hypot(x-p.x,z-p.z)<junctionRadius(x,z))))continue;
        const edge=p.clone().addScaledVector(n,side*(width/2+.12)),a=-Math.atan2(v.z,v.x);
        if(p.x<sidewalkEndX&&curbEdges&&curbSides.includes(side)){const c=box(1.18,.19,.25,[edge.x,-.015,edge.z],curb);c.rotation.y=a;}
        if(p.x<sidewalkEndX&&sidewalk){
          // White stones laid 2 x 2 on the asphalt strip; each group fills the
          // full pitch so neighbouring groups meet with only a hairline joint.
          const walk=p.clone().addScaledVector(n,side*(width/2+1));
          const joint=.006,tileLength=stonePitch/2-joint,tileWidth=(stoneWidth-joint)/2;
          for(const along of [-1,1])for(const across of [-1,1]){
            const tilePos=walk.clone()
              .addScaledVector(v,along*(tileLength+joint)/2)
              .addScaledVector(n,across*(tileWidth+joint)/2);
            const slab=box(tileWidth,.045,tileLength,[tilePos.x,-.0325,tilePos.z],pavers);
            slab.rotation.y=a+Math.PI/2;
          }
          let againstFence=false;
          if(side===-1&&Math.abs(p.x-MAIN_ROAD_X)<.05){
            // Carry the same stones across the strip up to the factory fence.
            const walkEdge=walk.x+stoneWidth/2,fenceFace=ENTRANCE.fenceX-.125,gap=fenceFace-walkEdge;
            for(const [north,south] of factoryFenceRuns){
              const start=Math.max(walk.z-stonePitch/2,north),end=Math.min(walk.z+stonePitch/2,south);
              if(gap<=0||end-start<.02)continue;
              sidewalkTiles(start,end,(walkEdge+fenceFace)/2,gap,false);againstFence=true;
            }
          }
          // A low white edge stone finishes the walk's outer side, except where it
          // meets the fence or turns into a joining sidewalk at a junction.
          const nearJunction=junctions.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<junctionRadius(x,z)+2.3);
          if(!againstFence&&!nearJunction){
            const rim=p.clone().addScaledVector(n,side*(width/2+1+stoneWidth/2+.06));
            const edging=box(stonePitch,.12,.12,[rim.x,-.03,rim.z],curb);edging.rotation.y=a;
          }
        }
        if(edgeMarkings){const stripe=p.clone().addScaledVector(n,side*(width/2-.28));const marking=box(1.26,.006,.11,[stripe.x,markingY,stripe.z],paint);marking.rotation.y=a;marking.castShadow=false;}
      }
    }
    if(mark)for(let d=2;d<len-2;d+=7){const p=path.getPointAt(d/len),t=path.getTangentAt(d/len);if(atRailCrossing(p)||junctions.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<7))continue;const dash=box(3,.008,.105,[p.x,markingY,p.z],paint);dash.rotation.y=-Math.atan2(t.z,t.x);dash.castShadow=false;}
    for(let d=18;d<len;d+=44){const t=d/len,p=path.getPointAt(t),v=path.getTangentAt(t),n=new T.Vector3(-v.z,0,v.x);p.addScaledVector(n,width/2-.43);const g=group([p.x,-.065,p.z]);g.rotation.y=-Math.atan2(v.z,v.x);box(.65,.015,.40,[0,0,0],drain,g);for(let dx=-.26;dx<.3;dx+=.09)box(.025,.025,.34,[dx,.015,0],curb,g);}
    return path;
  }
  for(const [north,south,width] of MAIN_ROAD_SEGMENTS)road([[MAIN_ROAD_X,north],[MAIN_ROAD_X,(north+south)/2],[MAIN_ROAD_X,south]],width);
  // The south sidewalk continues into both corner runs at the same width,
  // with the white roadward curb carried through those corner runs too.
  road([[GATE_ROAD.west,GATE_ROAD.z],[GATE_ROAD.east,GATE_ROAD.z]],GATE_ROAD.width);
  // Both approaches join from the east; the opposite sidewalk stays continuous.
  road([[GATE_ROAD.outer.x,GATE_ROAD.outer.north],[GATE_ROAD.outer.x,GATE_ROAD.outer.south]],GATE_ROAD.outer.width,{junctionSides:[-1]});
  // Continue the same stone size and pitch through the road corners.
  // Only the final stone at a corner may be cut to meet the adjoining run.
  function sidewalkTiles(start,end,cross,crossWidth,alongX,curbSide=0,edgeSide=0){
    for(let from=start;from<end-.04;from+=stonePitch){
      const length=Math.min(stonePitch,end-from);
      const at=from+length/2;
      box(alongX?length+.02:crossWidth,.01,alongX?crossWidth:length+.02,[alongX?at:cross,surfaceY,alongX?cross:at],asphalt).castShadow=false;
      const joint=.006,tl=length/2-joint,tw=(crossWidth-joint)/2;
      for(const i of [-1,1])for(const j of [-1,1]){
        const a=at+i*(tl+joint)/2,c=cross+j*(tw+joint)/2;
        const stone=box(tw,.045,tl,[alongX?a:c,-.0325,alongX?c:a],pavers);
        if(alongX)stone.rotation.y=Math.PI/2;
      }
      if(edgeSide){
        // Same low white edge stone as on the outer side of the road sidewalks.
        const rim=cross+edgeSide*(crossWidth/2+.06);
        box(alongX?length:.12,.12,alongX?.12:length,[alongX?at:rim,-.03,alongX?rim:at],curb);
      }
      if(curbSide){
        const edge=cross+curbSide*(crossWidth/2+.105),curbLength=Math.min(1.18,length);
        box(alongX?curbLength:.25,.19,alongX?.25:curbLength,
          [alongX?at:edge,-.015,alongX?edge:at],curb);
      }
    }
  }
  // The entrance junction cuts off the regular stones before the south fence ends.
  // Complete both rows through that last fenced stretch, leaving the gate open.
  const fenceWalkX=MAIN_ROAD_X+MAIN_ROAD_SEGMENTS[0][2]/2+1;
  const fenceGap=(ENTRANCE.fenceX-.125)-(fenceWalkX+stoneWidth/2);
  // Start a few stones early: they overlap the regular run, so no bare strip is left before the gate pier.
  const lastFenceWalkStart=MAIN_ROAD_SEGMENTS[0][0]+stoneOrigin+16*stonePitch;
  // Kerb stones continue along the road edge right up to the gate building.
  sidewalkTiles(lastFenceWalkStart,factoryFenceRuns[0][1],fenceWalkX,stoneWidth,false,-1);
  sidewalkTiles(lastFenceWalkStart,factoryFenceRuns[0][1],fenceWalkX+stoneWidth/2+fenceGap/2,fenceGap,false);
  // South of the gate the stones start at the pillar and run on to the first road stone.
  const firstSouthStone=19.825;
  sidewalkTiles(factoryFenceRuns[1][0],firstSouthStone,fenceWalkX,stoneWidth,false,-1);
  sidewalkTiles(factoryFenceRuns[1][0],firstSouthStone,fenceWalkX+stoneWidth/2+fenceGap/2,fenceGap,false);
  // Split each turn into the same 1.23 m stones as the straight runs.
  const cornerTiles=(x,z)=>sidewalkTiles(x-stoneWidth/2,x+stoneWidth/2,z,stoneWidth,true);
  // Extend the exact gate-road slab sequence into the outer-road corner.
  // The short turning stone stops before the next existing avenue slab.
  sidewalkTiles(-201.231,-197.501,3.7,1.55,true,-1,1);
  sidewalkTiles(4.485,5.105,-200.3,1.55,false,0,1);
  // Close the opposite outer-road corner with the same paving stones.
  sidewalkTiles(-9.875,-8.485,-200.3,1.55,false,-1,1);
  sidewalkTiles(-199.505,-197.501,-7.7,1.55,true,1,-1);
  cornerTiles(-200.3,-7.7);
  box(.25,.19,1.78,[-201.18,-.015,-7.585],curb);
  box(1.55,.19,.25,[-200.3,-.015,-6.82],curb);
  // Truck-gate corner: continue the white stones along the grass on both sides.
  sidewalkTiles(-164.915,-148.385,3.7,1.55,true,-1,1);
  cornerTiles(-147.6,3.7);
  sidewalkTiles(4.485,19.825,-147.6,1.55,false,1,-1);
  // The white curb turns round this corner just like the northern one.
  box(1.78,.19,.25,[-147.485,-.015,2.82],curb);
  box(.25,.19,1.53,[-146.72,-.015,3.69],curb);
  // Straight woodland corner, using the existing slab and curb pattern.
  sidewalkTiles(-164.915,-148.385,-7.7,1.55,true,1,-1);
  sidewalkTiles(-23.915,-8.485,-147.6,1.55,false,1,-1);
  cornerTiles(-147.6,-7.7);
  box(1.78,.19,.25,[-147.485,-.015,-6.82],curb);
  box(.25,.19,1.53,[-146.72,-.015,-7.71],curb);
  // Woodland lawn between the avenue, the main road and the outer railway: white
  // edge stones along the sidewalk stretches the road edging leaves open
  // beside the gate-road junctions.
  const edgeRun=(x0,z0,x1,z1)=>box(Math.max(Math.abs(x1-x0),.12),.12,Math.max(Math.abs(z1-z0),.12),[(x0+x1)/2,-.03,(z0+z1)/2],curb);
  edgeRun(-199.465,5.1,-199.465,7.6);
  edgeRun(-148.435,19.8,-148.435,25);
  // Both corners where the divided pond approach meets the outer avenue.
  const pondCornerX=GATE_ROAD.outer.x+GATE_ROAD.outer.width/2+1;
  for(const side of [-1,1]){
    const z=OLD_APPROACH.z+side*(OLD_APPROACH.width/2+1);
    // Keep the existing slab pitch; only the stone beside the corner is cut.
    sidewalkTiles(-199.515,-198.675,z,1.55,true,-side,side);
    sidewalkTiles(-198.665,-197.425,z,1.55,true,-side,side);
    // The avenue stones stop short of the approach; fill the corner up to its curb.
    sidewalkTiles(side<0?-131.925:z-stoneWidth/2,side<0?z+stoneWidth/2:-116.925,pondCornerX,stoneWidth,false);
    box(1.78,.19,.25,[pondCornerX-.115,-.015,z-side*.88],curb);
    box(.25,.19,1.53,[pondCornerX-.88,-.015,z+side*.01],curb);
  }
  for(const [north,south] of [[-133.175,-131.475],[-117.525,-115.675]]){
  }
  sidewalkTiles(-131.915,-131.485,pondCornerX,1.55,false,-1,1);
  sidewalkTiles(-117.515,-116.925,pondCornerX,1.55,false,-1,1);
  // The photographed pavilion has a fenced garden facing the railway.
  // Service traffic uses the courtyard and the link at the building's far end.
  // The transverse frontage lane crosses the straight entrance avenue.
  road([[LEFT.frontRoadX,LEFT.sideRoadZ],[LEFT.frontRoadX,-61],[LEFT.frontRoadX,-55.2]],7.0,{sidewalk:false,mark:false,edgeMarkings:false,curbEdges:false});
  // Continue the pale shoulder beside the orchard to the freight rail ballast.
  const railSidewalkEnd=RAIL_LAYOUT.z-2.1;
  // It starts at the pond road's south sidewalk, with a white curb along the lane.
  const pondSouthWalkNorth=OLD_APPROACH.z+OLD_APPROACH.width/2+1-stoneWidth/2;
  sidewalkTiles(pondSouthWalkNorth,railSidewalkEnd,LEFT.frontRoadX-4.15,stoneWidth,false,1,-1);
  // Close the pond-road curb across the corner stone up to the lane's curb.
  const laneCurbFace=LEFT.frontRoadX-4.15+stoneWidth/2+.23,pondCurbEnd=-42.46;
  box(laneCurbFace-pondCurbEnd,.19,.25,[(laneCurbFace+pondCurbEnd)/2,-.015,OLD_APPROACH.z+OLD_APPROACH.width/2+.12],curb);
  // North of the pond road the same strip runs beside the visitor-parking lawn
  // round the lane's dead end, where it joins the side lane's north sidewalk.
  const pondNorthWalkSouth=OLD_APPROACH.z-OLD_APPROACH.width/2-1+stoneWidth/2;
  const sideNorthWalkZ=LEFT.sideRoadZ-LEFT.sideRoadWidth/2-1;
  // The cross run takes the corner square, so the lane curb turns instead of crossing it.
  const laneWalkWest=LEFT.frontRoadX-4.15-stoneWidth/2;
  sidewalkTiles(sideNorthWalkZ+stoneWidth/2,pondNorthWalkSouth,LEFT.frontRoadX-4.15,stoneWidth,false,1,-1);
  sidewalkTiles(laneWalkWest,-34.17,sideNorthWalkZ,stoneWidth,true,1,-1);
  box(.12,.12,stoneWidth,[laneWalkWest-.06,-.03,sideNorthWalkZ],curb);
  box(laneCurbFace-pondCurbEnd,.19,.25,[(laneCurbFace+pondCurbEnd)/2,-.015,OLD_APPROACH.z-OLD_APPROACH.width/2-.12],curb);
  // Narrow unmarked lane outside the warehouse-side fence, as in the photo.
  road([[LEFT.frontRoadX,LEFT.sideRoadZ],[100,LEFT.sideRoadZ]],LEFT.sideRoadWidth,{mark:false,edgeMarkings:false});
  // A single straight ribbon includes the outside approach, both checkpoints
  // and the courtyard. There is no angled joining segment at either gate.
  // The paved court between the old halls has no raised stone sidewalks.
  road([[OLD_APPROACH.west,oldEntranceRoadZ(OLD_APPROACH.west)],[OLD_APPROACH.east,oldEntranceRoadZ(OLD_APPROACH.east)]],OLD_APPROACH.width,{sidewalkEndX:COURT.west,mark:false,edgeMarkings:false});
  road([[VISITOR_PARK.entryX,VISITOR_PARK.south-2],[VISITOR_PARK.entryX,oldEntranceRoadZ(VISITOR_PARK.entryX)]],VISITOR_PARK.entryWidth,{sidewalk:false,mark:false,edgeMarkings:false,curbEdges:false});
  // Match the visitor entrance stones to the narrower adjoining shoulder.
  const visitorEntryEast=VISITOR_PARK.entryX+VISITOR_PARK.entryWidth/2;
  const visitorLawnWest=visitorEntryEast+1.3;
  const visitorLawnSouth=OLD_APPROACH.z-OLD_APPROACH.width/2-1-stoneWidth/2;
  sidewalkTiles(VISITOR_PARK.south+.175,visitorLawnSouth,
    (visitorEntryEast+visitorLawnWest)/2,visitorLawnWest-visitorEntryEast,false,-1,1);
  // The same strip lines the west side of the entry, edged toward its lawn.
  const visitorEntryWest=VISITOR_PARK.entryX-VISITOR_PARK.entryWidth/2;
  sidewalkTiles(VISITOR_PARK.south+.175,visitorLawnSouth,
    visitorEntryWest-(visitorLawnWest-visitorEntryEast)/2,visitorLawnWest-visitorEntryEast,false,1,-1);
  // Continue the pond-road stones through both short gaps beside the lawn.
  // Overlap the last road stone a little so no asphalt shows between them.
  sidewalkTiles(VISITOR_PARK.entryX-VISITOR_PARK.entryWidth/2-.975,
    VISITOR_PARK.entryX-VISITOR_PARK.entryWidth/2,
    OLD_APPROACH.z-OLD_APPROACH.width/2-1,stoneWidth,true);
  sidewalkTiles(VISITOR_PARK.entryX+VISITOR_PARK.entryWidth/2,
    VISITOR_PARK.entryX+VISITOR_PARK.entryWidth/2+.575,
    OLD_APPROACH.z-OLD_APPROACH.width/2-1,stoneWidth,true);
  // Wrap the white curb round both entry corners: along the pond-road edge of
  // the corner stones, then down the entry side to the strip's own curbs.
  const pondCurbZ=OLD_APPROACH.z-OLD_APPROACH.width/2-.12;
  for(const [entryEdge,roadStoneEdge] of [[visitorEntryWest,-83.68],[visitorEntryEast,-72.4]]){
    const out=Math.sign(VISITOR_PARK.entryX-entryEdge),curbX=entryEdge+out*.105;
    const outerX=curbX+out*.125;
    box(Math.abs(outerX-roadStoneEdge),.19,.25,[(outerX+roadStoneEdge)/2,-.015,pondCurbZ],curb);
    box(.25,.19,pondCurbZ+.125-visitorLawnSouth,[curbX,-.015,(visitorLawnSouth+pondCurbZ+.125)/2],curb);
  }
  sidewalkTiles(VISITOR_PARK.east+.8,VISITOR_PARK.east+3.2,
    OLD_APPROACH.z-OLD_APPROACH.width/2-1,stoneWidth,true,0,-1);
  // One slightly raised asphalt patch per junction prevents overlapping ribbons
  // from flickering, and keeps curb/sidewalk strips out of the driving opening.
  // Flat patches with world-space UVs: no thickness or rounded edges, so no dark seam shows.
  function flatPatch(west,east,north,south,y){
    const geo=new T.BufferGeometry(),corners=[[west,north],[east,north],[east,south],[west,south]];
    geo.setAttribute('position',new T.Float32BufferAttribute(corners.flatMap(([x,z])=>[x,y,z]),3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(corners.flatMap(([x,z])=>[x/3,z/3]),2));
    geo.setIndex([0,2,1,0,3,2]);geo.computeVertexNormals();mesh(geo,asphalt).castShadow=false;
  }
  // The lane's dead end stops at the stones wrapped round it.
  for(const [x,z] of junctions)flatPatch(x-4.8,x+4.8,x===LEFT.frontRoadX&&z===LEFT.sideRoadZ?sideNorthWalkZ-stoneWidth/2:z-4.8,z+4.8,junctionY);
  // Rectangular lanes and square junctions, independent of the steering curves.
  const vertices=[],uvs=[],indices=[];
  for(const polygon of DISPATCH_PAVEMENT){const base=vertices.length/3;for(const [x,z] of polygon){vertices.push(x,freightY,z);uvs.push(x/3,z/3);}indices.push(base,base+2,base+1,base,base+3,base+2);}
  const freightGeometry=new T.BufferGeometry();freightGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));freightGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));freightGeometry.setIndex(indices);freightGeometry.computeVertexNormals();mesh(freightGeometry,asphalt).castShadow=false;
  // The corner joins the passenger court with the same continuous asphalt.
  const courtPaving=asphalt;
  for(const [west,east,north,south] of [[-81.5,-65.5,-45.3,-37.2],[-81.5,-73.5,-37.2,-16.3]]){flatPatch(west,east,north,south,-.058);}
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
}
