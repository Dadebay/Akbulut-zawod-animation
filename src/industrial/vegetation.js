import {addTreeWind} from './treeWind.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {trafficClearance} from './trafficLayout.js';
import {POND,OUTER_RAIL_Z,POND_APPROACH,OLD_FRONT_PARK,OLD_FRONT_COURT as COURT,OLD_SIDE_LOADING,OLD_REAR_BOUNDARY,OLD_RAW_SILOS,OLD_PAVILION,OLD_LEFT_CAMPUS as LEFT,OLD_APPROACH,NEW_FACTORY_ENTRANCE as ENTRANCE,NEW_ENTRANCE_ROAD as GATE_ROAD,GYPSUM_RECEIVING_HALL,GYPSUM_SILO_TOWER,PROCESS_BUILDINGS,pondAccessClearance,loaderRoadClearance,oldEntranceClearance} from './siteLayout.js';

// A few shared conifer silhouettes, with individual proportions and colours.
// The planting is deterministic so refreshing never moves a tree onto a road.
export function createVegetation(k){
  const sites=[];let seed=721;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const rectDistance=(x,z,west,east,north,south)=>Math.hypot(Math.max(west-x,x-east,0),Math.max(north-z,z-south,0));
  const campusLanes=[
    [LEFT.frontRoadX-3.5,LEFT.frontRoadX+3.5,LEFT.sideRoadZ,-61],
    [LEFT.frontRoadX,OLD_APPROACH.east,POND_APPROACH.z-POND_APPROACH.width/2,POND_APPROACH.z+POND_APPROACH.width/2],
    [LEFT.frontRoadX,COURT.east,COURT.entryZ-COURT.entryWidth/2,COURT.entryZ+COURT.entryWidth/2],
    [LEFT.frontRoadX,100,LEFT.sideRoadZ-LEFT.sideRoadWidth/2,LEFT.sideRoadZ+LEFT.sideRoadWidth/2],
    [COURT.drive.west,COURT.drive.east,COURT.drive.north,COURT.drive.south],
    [OLD_SIDE_LOADING.apron.west,OLD_SIDE_LOADING.apron.east,OLD_SIDE_LOADING.apron.north,OLD_SIDE_LOADING.apron.south],
    [OLD_REAR_BOUNDARY.x-10,OLD_REAR_BOUNDARY.x+10,OLD_REAR_BOUNDARY.gateZ-OLD_REAR_BOUNDARY.gateWidth/2-.3,OLD_REAR_BOUNDARY.gateZ+OLD_REAR_BOUNDARY.gateWidth/2+.3],
    [GATE_ROAD.west,GATE_ROAD.east,GATE_ROAD.z-GATE_ROAD.width/2-1.5,GATE_ROAD.z+GATE_ROAD.width/2+1.5],
    [GATE_ROAD.outer.x-GATE_ROAD.outer.width/2-1.5,GATE_ROAD.outer.x+GATE_ROAD.outer.width/2+1.5,GATE_ROAD.outer.north,GATE_ROAD.outer.south],
    [OLD_PAVILION.serviceX,110,-64.7,-57.3],
    [OLD_PAVILION.serviceX-3.7,OLD_PAVILION.serviceX+3.7,-78,-61]
  ];
  function isClear(tree,{plantedBed=false,plantedMedian=false}={}){
    const {x,z,sx,sz,sy,leanX,leanZ}=tree;
    const crown=2.65*Math.max(sx,sz)+7.5*sy*Math.max(Math.abs(leanX),Math.abs(leanZ))+.3;
    if(!plantedMedian&&(trafficClearance(x,z)<crown+.3||pondAccessClearance(x,z)<crown+.6||loaderRoadClearance(x,z)<crown+.4))return false;
    if(!plantedMedian&&oldEntranceClearance(x,z)<crown+.3)return false;
    if(rectDistance(x,z,ENTRANCE.x-1.1,ENTRANCE.x+3.8,ENTRANCE.z+ENTRANCE.left,ENTRANCE.z+ENTRANCE.right)<crown+.3)return false;
    if(rectDistance(x,z,OLD_FRONT_PARK.west,OLD_FRONT_PARK.east,OLD_FRONT_PARK.north,OLD_FRONT_PARK.south)<crown+.4)return false;
    if(rectDistance(x,z,LEFT.parking.west,LEFT.parking.east,LEFT.parking.north,LEFT.parking.south)<crown+.25)return false;
    for(const b of [OLD_PAVILION.hall,OLD_PAVILION.annex,LEFT.warehouse,OLD_REAR_BOUNDARY.building,OLD_RAW_SILOS,GYPSUM_SILO_TOWER,...Object.values(PROCESS_BUILDINGS)])
      if(rectDistance(x,z,b.x-b.width/2,b.x+b.width/2,b.z-b.depth/2,b.z+b.depth/2)<crown+.3)return false;
    const rear=OLD_REAR_BOUNDARY.building;
    if(rectDistance(x,z,rear.x-2.6,rear.x+2.6,rear.z+rear.depth/2,rear.z+rear.depth/2+2.8)<crown+.3)return false;
    if(rectDistance(x,z,-13,20,28.3,39.95)<crown+.4)return false;
    for(const b of [GYPSUM_RECEIVING_HALL,GYPSUM_RECEIVING_HALL.wing])
      if(rectDistance(x,z,b.west,b.east,b.north,b.south)<crown+.4)return false;
    if(rectDistance(x,z,POND.x-POND.width/2-1.5,POND.x+POND.width/2+1.5,POND.z-POND.depth/2-1.5,POND.z+POND.depth/2+1.5)<crown)return false;
    if(Math.abs(z-OUTER_RAIL_Z)<3+crown)return false;
    // West of the turnout there is only the main track at z=-53.
    // Reserve the wider corridor only where the second track exists.
    const freightRailZ=x<-150?-53:-55.4,freightRailHalfWidth=x<-150?2.6:4.6;
    if(x<116&&Math.abs(z-freightRailZ)<freightRailHalfWidth+crown)return false;
    // The pavilion's narrow landscaped beds border a service lane. Trees
    // deliberately placed in those beds still respect buildings and rail.
    if(!plantedBed&&!plantedMedian&&campusLanes.some(bounds=>rectDistance(x,z,...bounds)<crown+.8))return false;
    return true;
  }
  function plant(x,z,size,options){
    const tree={x,z,sx:size*(.88+random()*.25),sz:size*(.86+random()*.27),sy:size*(.78+random()*.60),yaw:random()*Math.PI*2,leanX:(random()-.5)*.045,leanZ:(random()-.5)*.045,variant:Math.floor(random()*3),tint:Math.floor(random()*5)};
    if(!isClear(tree,options))return false;
    sites.push(tree);return true;
  }
  function row(x1,z1,x2,z2,spacing=4.5){
    const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(len/spacing)),nx=len?-dz/len:0,nz=len?dx/len:0;
    for(let i=0;i<=n;i++){
      const t=T.MathUtils.clamp((i+(random()-.5)*.48)/n,0,1),side=(random()-.5)*1.05;
      plant(x1+dx*t+nx*side,z1+dz*t+nz*side,.72+random()*.31);
    }
  }
  function scatter(x,z,w,d,spacing,small=false){
    const inset=small?1.3:2.2,usableW=w-2*inset,usableD=d-2*inset;
    if(usableW<=0||usableD<=0)return;
    const target=Math.max(1,Math.round(usableW*usableD/(spacing*spacing))),gap=spacing*.63,cells=new Map();
    const west=x-w/2+inset,north=z-d/2+inset;
    // Random, separated samples remove both straight rows and repeated offsets.
    // A slow density variation leaves loose pockets between fuller clusters.
    let added=0;
    for(let attempt=0;attempt<target*24&&added<target;attempt++){
      const xx=west+random()*usableW,zz=north+random()*usableD;
      const density=.80+.16*Math.sin(xx*.31+z)*Math.cos(zz*.27+x);
      if(random()>density)continue;
      const ix=Math.floor(xx/gap),iz=Math.floor(zz/gap);let crowded=false;
      for(let a=ix-1;a<=ix+1&&!crowded;a++)for(let b=iz-1;b<=iz+1;b++){
        if((cells.get(`${a},${b}`)||[]).some(([px,pz])=>Math.hypot(px-xx,pz-zz)<gap)){crowded=true;break;}
      }
      if(crowded||!plant(xx,zz,small?.36+random()*.30:.70+random()*.29))continue;
      const key=`${ix},${iz}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push([xx,zz]);added++;
    }
  }
  function grove(x,z,w,d,spacing=4.2,{surface=true}={}){
    const crossesAvenue=x+w/2>POND_APPROACH.west&&x-w/2<POND_APPROACH.east&&Math.abs(z-POND_APPROACH.z)<d/2+POND_APPROACH.width/2+2;
    const crossesGateRoad=x+w/2>GATE_ROAD.west&&x-w/2<GATE_ROAD.east&&Math.abs(z-GATE_ROAD.z)<d/2+GATE_ROAD.width/2+2;
    if(surface)k.box(w,.15,d,[x,crossesAvenue||crossesGateRoad?-.24:-.10,z],k.m.grass);scatter(x,z,w,d,spacing);
  }
  function garden(x,z,w,d,{curb=true,surface=true}={}){
    if(curb)k.box(w+.5,.23,d+.5,[x,.02,z],k.m.white,k.scene,.6);
    if(surface)k.box(w,.22,d,[x,.12,z],k.m.grass,k.scene,.55);scatter(x,z,w,d,3,true);
  }
  function finish(){
    const bark=k.material('#655d49',0,1,{unique:true}),foliage=k.material('#ffffff',0,.96,{unique:true,vertexColors:true,side:T.DoubleSide});
    for(const mat of [bark,foliage])addTreeWind(k,mat);
    const tints=['#ffffff','#e5eecf','#cbdcd2','#eef0c8','#c1d5bd'].map(c=>new T.Color(c));
    const shades=['#385331','#466334','#58743c','#71874b','#405e36'].map(c=>new T.Color(c));
    for(let variant=0;variant<3;variant++){
      const trees=sites.filter(tree=>tree.variant===variant);if(!trees.length)continue;
      const trunkParts=[],leaves=[],colors=[];
      function branch(a,b,r){
        const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start),g=new T.CylinderGeometry(r*.35,r,dir.length(),5);
        g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());trunkParts.push(g.toNonIndexed());g.dispose();
      }
      function triangle(a,b,c,shade){for(const v of [a,b,c]){leaves.push(...v.toArray());colors.push(shade.r,shade.g,shade.b);}}
      branch([0,0,0],[.05*(variant-1),7.35,0],.13);
      const broad=[1,.91,1.06][variant],levels=k.tablet?11:18,spokes=k.tablet?7:9,sprays=k.tablet?2:3;
      // An irregular shaded inner crown fills the gaps between needle sprays.
      // Outer branches conceal its outline, keeping the tree soft and full.
      const rings=10,sides=9,core=[];
      for(let level=0;level<=rings;level++){
        const t=level/rings,y=.65+t*6.65,r=(.025+1.38*Math.pow(1-t,.77))*broad;
        const ring=[];
        for(let j=0;j<sides;j++){
          const a=j/sides*Math.PI*2+variant*.7,rad=r*(.87+random()*.21+.06*Math.sin(j*2+level));
          ring.push(new T.Vector3(Math.cos(a)*rad+.08*Math.sin(level*.5+variant),y+(random()-.5)*.12,Math.sin(a)*rad));
        }
        core.push(ring);
      }
      for(let level=0;level<rings;level++)for(let j=0;j<sides;j++){
        const next=(j+1)%sides,shade=shades[(j+level+variant)%3];
        triangle(core[level][j],core[level+1][j],core[level][next],shade);
        triangle(core[level][next],core[level+1][j],core[level+1][next],shade);
      }
      for(let level=0;level<levels;level++){
        const t=level/levels,y=.65+t*6.35,r=Math.pow(1-t,.82)*1.76*broad;
        for(let j=0;j<spokes;j++){
          const angle=j*Math.PI*2/spokes+level*2.399+variant*.9+(random()-.5)*.36,rad=r*(.82+random()*.26);
          const direction=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new T.Vector3(-Math.sin(angle),0,Math.cos(angle));
          const start=new T.Vector3(.07*Math.sin(level+variant),y+.35,0),end=direction.clone().multiplyScalar(rad);end.y=y-.10+(random()-.5)*.28;
          if(!k.tablet&&level%3===0)branch(start.toArray(),end.toArray(),.02);
          for(let n=0;n<sprays;n++){
            const at=(n+1)/sprays,center=start.clone().lerp(end,at),length=.31+rad*.17,width=(.23+rad*.18)*(1-at*.24),shade=shades[(j+n+level+variant)%shades.length];
            const tip=center.clone().addScaledVector(direction,length);tip.y+=.13;
            const back=center.clone().addScaledVector(direction,-length*.74);back.y+=.30;
            const left=center.clone().addScaledVector(side,width);left.y-=.13+random()*.12;
            const right=center.clone().addScaledVector(side,-width);right.y-=.13+random()*.12;
            const crest=center.clone();crest.y+=.39+random()*.16;
            triangle(back,left,tip,shade);triangle(back,tip,right,shade);
            triangle(left,crest,right,shades[(j+n+2)%5]);triangle(tip,right,crest,shade);
          }
        }
      }
      const trunk=mergeGeometries(trunkParts);trunkParts.forEach(g=>g.dispose());
      const crown=new T.BufferGeometry();crown.setAttribute('position',new T.Float32BufferAttribute(leaves,3));crown.setAttribute('color',new T.Float32BufferAttribute(colors,3));crown.computeVertexNormals();
      const woody=k.instances(trunk,bark,trees.length),leafy=k.instances(crown,foliage,trees.length),o=new T.Object3D();
      woody.customDepthMaterial=bark.userData.treeDepth;leafy.customDepthMaterial=foliage.userData.treeDepth;
      trees.forEach((tree,i)=>{
        const {x,z,sx,sy,sz,yaw,leanX,leanZ,tint}=tree;
        o.position.set(x,0,z);o.scale.set(sx,sy,sz);o.rotation.set(leanX,yaw,leanZ);o.updateMatrix();
        woody.setMatrixAt(i,o.matrix);leafy.setMatrixAt(i,o.matrix);leafy.setColorAt(i,tints[tint]);
      });
      woody.instanceMatrix.needsUpdate=true;leafy.instanceMatrix.needsUpdate=true;leafy.instanceColor.needsUpdate=true;
    }
  }
  return {row,grove,garden,plant,finish};
}
