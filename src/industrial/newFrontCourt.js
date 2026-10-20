import * as T from 'three';
import {PARKED_TRUCKS} from './trafficLayout.js';
import {NEW_FACTORY_ENTRANCE as ENTRANCE} from './siteLayout.js';

// Office frontage, passenger parking and truck court follow the same axis.
export function buildNewFrontCourt(k,plants){
  const {box,mesh,cyl,rod,group,material,m}=k;
  const asphalt=m.road,curb=material('#d3d7d3',.02,.90);
  const paint=material('#dddeda',0,.88),pavers=material('#b9bfc0',0,.94);
  const lawn=m.grass,shrubPaint=material('#526b3c',0,.96);
  const shrubGeometry=new T.IcosahedronGeometry(1,1);
  const palmBark=material('#75684f',0,.95),palmLeaf=material('#416d3c',0,.78,{side:T.DoubleSide});
  const blossom=material('#a59bb4',0,.9),flowerBorder=material('#813d4f',0,.9);
  const officeFlowers=material('#92557b',0,.9);
  const blossomGeometry=new T.IcosahedronGeometry(.10,0);
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
  function hatchedApron(points){
    const angle=Math.PI/4,dx=Math.cos(angle),dz=Math.sin(angle),nx=-dz,nz=dx;
    const offsets=points.map(([x,z])=>x*nx+z*nz);
    for(let offset=Math.min(...offsets)+.25;offset<Math.max(...offsets)-.15;offset+=.36){
      const hits=[];
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        const start=a[0]*nx+a[1]*nz-offset,end=b[0]*nx+b[1]*nz-offset;
        if(start*end>0||Math.abs(start-end)<1e-8)continue;
        const t=start/(start-end),hit=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        if(!hits.some(p=>Math.hypot(p[0]-hit[0],p[1]-hit[1])<.04))hits.push(hit);
      }
      if(hits.length<2)continue;
      hits.sort((a,b)=>(a[0]-b[0])*dx+(a[1]-b[1])*dz);
      const a=hits[0],b=hits[hits.length-1],length=Math.hypot(b[0]-a[0],b[1]-a[1])-.24;
      if(length<.2)continue;
      const stripe=flatBox(length,.075,(a[0]+b[0])/2,(a[1]+b[1])/2,paint,.080);
      stripe.rotation.y=-angle;
    }
  }
  function bed(west,east,north,south,r=.75){
    const w=east-west,d=south-north,x=(west+east)/2,z=(north+south)/2;
    const edge=outline(w,d,Math.min(r,w/2,d/2));
    edge.holes.push(outline(w-.28,d-.28,Math.min(r-.14,(w-.28)/2,(d-.28)/2)));
    const curbGeometry=new T.ExtrudeGeometry(edge,{depth:.18,bevelEnabled:false,curveSegments:7});curbGeometry.rotateX(-Math.PI/2);
    mesh(curbGeometry,curb,[x,.025,z]);
    roundedSurface(w-.28,d-.28,Math.min(r-.14,(w-.28)/2,(d-.28)/2),x,z,.04,.13,lawn);
  }
  function raisedBed(west,east,north,south){
    const w=east-west,d=south-north,x=(west+east)/2,z=(north+south)/2;
    box(w,.50,d,[x,.26,z],curb);
    box(w-.28,.09,d-.28,[x,.55,z],lawn);
    for(const zz of [north+.08,south-.08])box(w,.065,.16,[x,.55,zz],curb);
    for(const xx of [west+.08,east-.08])box(.16,.065,d,[xx,.55,z],curb);
  }
  function shrub(x,z,size,index=0,base=0){
    const plant=mesh(shrubGeometry,shrubPaint,[x,.17+base+size*.55,z]);
    plant.scale.set(size,size*.72,size*.82);plant.rotation.y=index*1.7;
  }
  function palm(x,z,height,spread){
    const tree=group([x,0,z]);
    rod([0,.15,0],[.14,height,0],.115,palmBark,tree);
    const vertices=[],crown=[.14,height,0];
    const point=(angle,r,t)=>[
      crown[0]+Math.cos(angle)*r,
      crown[1]+.34*Math.sin(Math.PI*t)-.73*t*t,
      crown[2]+Math.sin(angle)*r
    ];
    const triangle=(a,b,c)=>vertices.push(...a,...b,...c);
    for(let i=0;i<10;i++){
      const angle=i*Math.PI/5+.16,reach=spread*(.89+(i%3)*.055);
      const tangent=[-Math.sin(angle),Math.cos(angle)];
      for(let j=0;j<8;j++){
        const t=j/8,next=(j+1)/8,a=point(angle,reach*t,t),b=point(angle,reach*next,next);
        const width=.23*Math.sin(Math.PI*(t+next)/2)+.025;
        const left=[a[0]+tangent[0]*width,a[1]-.07,a[2]+tangent[1]*width];
        const right=[a[0]-tangent[0]*width,a[1]-.07,a[2]-tangent[1]*width];
        triangle(a,left,b);triangle(a,b,right);
      }
      for(let j=1;j<9;j++){
        const t=j/10,a=point(angle,reach*(t-.025),t),b=point(angle,reach*(t+.07),t+.07);
        const width=.36*Math.sin(Math.PI*t);
        for(const side of [-1,1]){
          const tip=[b[0]+tangent[0]*width*side,b[1]-.22,b[2]+tangent[1]*width*side];
          triangle(a,b,tip);
        }
      }
    }
    const fronds=new T.BufferGeometry();
    fronds.setAttribute('position',new T.Float32BufferAttribute(vertices,3));fronds.computeVertexNormals();
    mesh(fronds,palmLeaf,[0,0,0],tree);
  }
  // Cover the whole parking apron, including the former bare rectangular gap
  // beside the planted strips. Keep one surface at a consistent height.
  const paving=new T.Shape();
  [[ENTRANCE.southFenceX,-44.5],[-73.5,-44.5],[-73.5,3.5],[ENTRANCE.southFenceX,3.5]].forEach(([x,z],i)=>i?paving.lineTo(x,-z):paving.moveTo(x,-z));
  paving.closePath();const pavingGeo=new T.ShapeGeometry(paving);pavingGeo.rotateX(-Math.PI/2);
  mesh(pavingGeo,asphalt,[0,groundY,0]).castShadow=false;
  // One continuous finish joins the court and its junction road; restore the
  // edge and centre markings above that shared surface.
  flatBox(54,.10,-109.5,-7.2,paint,.063);
  for(let x=-134;x<-82;x+=6.5)flatBox(2.5,.10,x,-2,paint,.063);

  // Planted strips frame two facing passenger rows and their central drive aisle.
  // Their centre break lines up with the main office entrance at z = -25.
  const strips=[[-85.8,-82.2],[-102.5,-100.5]];
  for(const [west,east] of strips)for(const [north,south] of [[-43.2,-27.15],[-22.85,-12.8]]){
    bed(west,east,north,south,Math.min(.9,(east-west)/2));
    let index=0;
    for(let z=north+1.35;z<south-1;z+=2.35){
      plants.plant((west+east)/2,z,.34+(index%3)*.025);
      shrub(east-.55,z+.6,.30,index++);
    }
    for(let z=north+.5,i=0;z<south-.4;z+=.56,i++)
      shrub((west+east)/2+(i%2)*.16,z,.25,i);
  }
  // Two rows of passenger bays face a clear 5.7 m aisle, as in the plan.
  const passengerRows=[
    {west:-100.5,east:-96.0,stop:-100.0},
    {west:-90.3,east:-85.8,stop:-86.3},
  ];
  for(const [start,count] of [[-42.4,6],[-22.15,4]]){
    const pitch=2.25;
    for(const {west,east,stop} of passengerRows){
      for(let i=0;i<=count;i++)flatBox(east-west,.085,(west+east)/2,start+i*pitch);
      flatBox(.085,count*pitch,stop< -95?east:west,start+count*pitch/2);
      for(let i=0;i<count;i++)box(.16,.10,1.55,[stop,.10,start+(i+.5)*pitch],curb);
    }
  }
  // A flush pedestrian spine connects both landscaped strips to the office doors.
  flatBox(20.4,3.6,-92.3,-25,pavers,.074);
  flatBox(11.55,3.6,-70.425,-25,pavers,.065);
  for(let x=-102.3;x<-82.2;x+=.75)flatBox(.025,3.6,x,-25,curb,.084);
  for(let x=-76.1;x<-64.7;x+=.75)flatBox(.025,3.6,x,-25,curb,.075);

  // Truck bays face a clear central manoeuvring lane, away from the passenger aisle.
  for(const {position,angle,scale} of PARKED_TRUCKS){
    const bay=group(position);bay.rotation.y=angle;
    for(const side of [-1,1])box(18*scale,.012,.09,[-6.3*scale,paintY,side*1.8],paint,bay).castShadow=false;
    box(.09,.012,3.6,[-15.3*scale,paintY,0],paint,bay).castShadow=false;
  }
  // Triangular exclusion zones finish the two ends of the angled truck rows.
  hatchedApron([[-135.8,-43.6],[-123.2,-43.6],[-135.8,-40.0]]);
  hatchedApron([[-111.2,-12.9],[-102.7,-12.9],[-102.7,-16.7]]);

  // Planting beds frame both office entrances without covering their doors.
  for(const [north,south] of [[-36.9,-27.3],[-22.7,-11.1],[3.7,10.1],[15.5,21.9]]){
    const diningGarden=north>0;
    if(diningGarden)raisedBed(-78,-66.1,north,south);
    else bed(-76.2,-66.1,north,south,1.2);
    let index=0;
    for(let z=north+1.2;z<south-1;z+=2.15){
      for(const [x,size] of (north<0?[[-74.5,.48],[-70.9,.38]]:[[-70.9,.34],[-68.1,.27]]))
        plants.plant(x+(index%2?.15:-.12),z,size+(index%3)*.035);
      const base=diningGarden?.42:0;
      shrub(-69.5,z+.6,.62,index,base);shrub(-72.15,z,.36,index+1,base);shrub(-66.8,z,.40,index+2,base);index++;
      if(!diningGarden){
        shrub(-74.4,z+.55,.45,index);shrub(-75.3,z,.32,index+1);
        for(const dx of [-.28,0,.28])
          mesh(blossomGeometry,officeFlowers,[-73.4+dx,.55,z+.25+dx]);
      }
      if(north<0&&index%2===0)for(const x of [-71.9,-67.1])
        for(const dx of [-.2,.2])mesh(blossomGeometry,blossom,[x+dx,.56,z+.3+dx]);
      if(diningGarden){
        shrub(-75.1,z+.3,.48,index,.42);shrub(-77,z+.7,.33,index+1,.42);
        plants.plant(-75.7,z,.23+(index%2)*.025,{plantedBed:true});
        for(const x of [-77.2,-73.4])for(const dx of [-.2,.2])
          mesh(blossomGeometry,blossom,[x+dx,.76,z+.25+dx]);
      }
    }
    if(diningGarden)for(let z=north+.55,i=0;z<south-.3;z+=.9,i++){
      for(const [x,size] of [[-77.25,.28],[-74.35,.34],[-71.25,.36],[-67.2,.27]])
        shrub(x+(i%2)*.13,z,size,i,.42);
      if(i%2===0)for(const x of [-76.5,-73.2,-68.3])
        mesh(blossomGeometry,blossom,[x,.76,z+.13]);
    }
    if(!diningGarden)for(let z=north+.45,i=0;z<south-.3;z+=.48,i++){
      shrub(-75.75,z,.28,i);
      shrub(-73.1+(i%2)*.2,z,.32,i+1);
      if(i%3===0)for(const x of [-74.9,-71.8,-68.2])
        mesh(blossomGeometry,i%2?officeFlowers:blossom,[x,.58,z+.15]);
    }
    if(diningGarden){
      const flowerZ=north<12?south-.44:north+.44;
      for(let x=-77.3;x<-66.7;x+=.32)
        mesh(blossomGeometry,flowerBorder,[x,.69,flowerZ]);
    }
  }
  // Keep the palm at the southern end of the office garden.
  palm(-75.1,-10.7,4.0,1.7);
  for(const [x,z,h,s] of [[-74,4.3,3.6,1.35],[-73.6,21.3,3.6,1.35]])
    palm(x,z,h,s);
  flatBox(13.5,3.1,-71.8,12.8,pavers,.065);
  for(let x=-78.3;x<-64.7;x+=.75)flatBox(.025,3.1,x,12.8,curb,.075);
  // The dining frontage meets an asphalt street with a broken centre line.
  flatBox(13,32,-84.5,12.8,asphalt,.047);
  for(let z=-1.8;z<28;z+=5.2)flatBox(.085,2.2,-86.4,z,paint,.065);
  for(const [x,z] of [[-77,6.2],[-77,19.4]]){
    cyl(.048,3.85,[x,1.925,z],m.white);
    for(const side of [-1,1]){
      rod([x,3.82,z],[x+side*.55,4.05,z],.028,m.white);
      box(.38,.055,.22,[x+side*.6,4.05,z],m.light);
    }
  }
  for(const [x,z] of [[-83.9,-40.9],[-83.9,-18.8],[-101.5,-40.9],[-101.5,-18.8]]){
    cyl(.045,4.2,[x,2.1,z],m.steel);rod([x,4.1,z],[x-.65,4.35,z],.035,m.steel);
    box(.65,.08,.23,[x-.65,4.35,z],m.light);
  }
}
