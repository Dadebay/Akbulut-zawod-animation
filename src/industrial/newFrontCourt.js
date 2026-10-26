import * as T from 'three';
import {NEW_FACTORY_ENTRANCE as ENTRANCE,DINING_STREET} from './siteLayout.js';

// The entrance is an open paved forecourt with low planted strips, as in the exterior references.
export function buildNewFrontCourt(k,plants){
  const {box,mesh,cyl,rod,material,m}=k;
  const asphalt=m.road,curb=material('#d3d7d3',.02,.90);
  const paint=material('#dddeda',0,.88),pavers=material('#b9bfc0',0,.94);
  const lawn=m.grass,shrubPaint=material('#526b3c',0,.96);
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
  function shrub(x,z,size,index=0,base=0,finish=shrubPaint){
    const plant=mesh(shrubGeometry,finish,[x,.17+base+size*.55,z]);
    plant.scale.set(size,size*.72,size*.82);plant.rotation.y=index*1.7;
  }
  // Keep the forecourt and its perimeter roads on one continuous level.
  const paving=new T.Shape();
  [[ENTRANCE.southFenceX,-44.5],[-73.5,-44.5],[-73.5,3.5],[ENTRANCE.southFenceX,3.5]].forEach(([x,z],i)=>i?paving.lineTo(x,-z):paving.moveTo(x,-z));
  paving.closePath();const pavingGeo=new T.ShapeGeometry(paving);pavingGeo.rotateX(-Math.PI/2);
  mesh(pavingGeo,asphalt,[0,groundY,0]).castShadow=false;
  // One continuous finish joins the court and its junction road; restore the
  // edge and centre markings above that shared surface.
  flatBox(54,.10,-109.5,-7.2,paint,.063);
  for(let x=-134;x<-82;x+=6.5)flatBox(2.5,.10,x,-2,paint,.063);

  // Use the factory-wide asphalt grid, aligned across the surrounding lanes.
  const courtWest=ENTRANCE.southFenceX+1.35,courtEast=-82.2;
  const courtNorth=-43.2,courtSouth=-8.2,pavedEast=-58.1;
  flatBox(pavedEast-courtWest,courtSouth-courtNorth,(courtWest+pavedEast)/2,(courtNorth+courtSouth)/2,asphalt,.065).name='office-court-paving';

  // The inner strip is straight. The street-side strip rounds only the
  // outside corner at each end of the rectangular pedestrian court.
  const groundcover=material('#354f28',0,.97),stripLeaves=material('#657d3c',0,.96);
  for(const [north,south] of [[courtNorth,-26.6],[-23.4,courtSouth]]){
    bed(-102.5,-100.5,north,south,.18);
    box(1.35,.23,south-north-.65,[-101.5,.25,(north+south)/2],groundcover,k.scene,.12);
    for(let z=north+.5,i=0;z<south-.4;z+=.58,i++)shrub(-101.5,z,.37,i,.06,stripLeaves);
  }
  function outerStrip(upper,inset=0){
    const west=-85.8+inset,east=courtEast-inset,north=(upper?courtNorth:-23.4)+inset,south=(upper?-26.6:courtSouth)-inset,r=3.6-inset;
    const shape=new T.Shape();shape.moveTo(west,-north);
    if(upper){shape.quadraticCurveTo(east,-north,east,-(north+r));shape.lineTo(east,-south);}
    else{shape.lineTo(east,-north);shape.lineTo(east,-(south-r));shape.quadraticCurveTo(east,-south,west,-south);}
    shape.lineTo(west,-south);shape.closePath();return shape;
  }
  const insidePolygon=(polygon,x,z)=>{
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a.y>-z)!==(b.y>-z)&&x<(b.x-a.x)*(-z-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  };
  for(const upper of [true,false]){
    for(const [inset,bottom,height,finish] of [[0,.025,.20,curb],[.26,.225,.035,groundcover]]){
      const geo=new T.ExtrudeGeometry(outerStrip(upper,inset),{depth:height,bevelEnabled:false,curveSegments:16});geo.rotateX(-Math.PI/2);
      mesh(geo,finish,[0,bottom,0]).castShadow=false;
    }
    const polygon=outerStrip(upper,.5).getPoints(20);
    for(let z=upper?courtNorth+.6:-22.8,i=0;z<(upper?-27.1:courtSouth-.5);z+=.6,i++)
      for(const x of [-85,-84.3,-83.6,-82.9])if(insidePolygon(polygon,x,z))shrub(x,z,.30,i,.12,stripLeaves);
  }
  // A planted margin runs inside the entrance fence, clear of the gate opening.
  bed(ENTRANCE.southFenceX+.35,ENTRANCE.southFenceX+1.65,-44.1,-15.0,.5);
  for(let z=-43.5,i=0;z<-15.5;z+=.6,i++)
    shrub(ENTRANCE.southFenceX+1,z,.30,i);

  // The central crossing points straight at the office entrance. Matching
  // crossings break the pale kerb along the top and bottom of the court.
  const crossing=(west,east,z,depth=1.8)=>{
    for(let x=west+.14;x<east-.1;x+=.36)flatBox(.18,depth,x,z,paint,.105);
  };
  flatBox(2.0,3.2,-101.5,-25,pavers,.091);
  flatBox(3.6,3.2,-84,-25,pavers,.091);
  flatBox(11.55,5.75,-70.425,-25,pavers,.091);
  crossing(-100.5,-85.8,-25);
  crossing(-82.2,-76.2,-25);
  for(const z of [courtNorth,courtSouth]){
    for(const [west,east] of [[courtWest,-128],[-111,-95.8],[-89,-85.8]])
      box(east-west,.16,.38,[(west+east)/2,.11,z],curb).castShadow=false;
    crossing(-128,-111,z,.9);crossing(-95.8,-89,z,.9);crossing(-82.2,-76.2,z,.9);
  }
  for(let x=-76.1;x<-64.7;x+=.75)flatBox(.025,5.75,x,-25,curb,.103);

  // The office gardens wrap around the ends of both projecting wings. Their
  // rounded street corners align with the court, leaving the entrance open.
  const officeLawn=material('#304b25',0,.98),officeLeaves=material('#3d592b',0,.96);
  const officeBorder=material('#899c50',0,.95),officeHedge=material('#334e28',0,.96);
  function officeOutline(upper,inset=0){
    const west=-76.2+inset,front=-65.85-inset,east=-58.1-inset,r=3.5-inset;
    const north=(upper?courtNorth:-22.125)+inset,south=(upper?-27.875:courtSouth)-inset;
    const notch=(upper?-38.15:-11.85)+(upper?-inset:inset),s=new T.Shape();
    if(upper){
      s.moveTo(west,-south);s.lineTo(front,-south);s.lineTo(front,-notch);s.lineTo(east,-notch);
      s.lineTo(east,-north);s.lineTo(west+r,-north);s.quadraticCurveTo(west,-north,west,-(north+r));
    }else{
      s.moveTo(west,-north);s.lineTo(front,-north);s.lineTo(front,-notch);s.lineTo(east,-notch);
      s.lineTo(east,-south);s.lineTo(west+r,-south);s.quadraticCurveTo(west,-south,west,-(south-r));
    }
    s.closePath();return s;
  }
  for(const upper of [true,false]){
    for(const [inset,bottom,height,finish,label] of [[0,.025,.24,curb,'curb'],[.38,.265,.035,officeLawn,'lawn']]){
      const geo=new T.ExtrudeGeometry(officeOutline(upper,inset),{depth:height,bevelEnabled:false,curveSegments:16});geo.rotateX(-Math.PI/2);
      const surface=mesh(geo,finish,[0,bottom,0]);surface.castShadow=false;surface.name=`office-garden-${upper?'upper':'lower'}-${label}`;
    }
    const polygon=officeOutline(upper,.48).getPoints(24),contains=(x,z)=>insidePolygon(polygon,x,z);
    let index=0;
    for(let z=upper?courtNorth+.7:-22;z<(upper?-27.8:courtSouth-.5);z+=.7)for(let x=-75.55;x<-58.6;x+=.7){
      const xx=x+Math.sin(index*2.4)*.15,zz=z+Math.cos(index*1.7)*.15,size=.24+(index%4)*.04;index++;
      if(![[xx-size,zz],[xx+size,zz],[xx,zz-size],[xx,zz+size]].every(([px,pz])=>contains(px,pz)))continue;
      shrub(xx,zz,size,index,.15,index%3?officeLeaves:officeHedge);
    }
    for(let z=upper?-41:-20.5;z<(upper?-28.5:-9.8);z+=2.15)for(let x=-73.8;x<-59.5;x+=2.2){
      if(contains(x-1,z)&&contains(x+1,z)&&contains(x,z-1)&&contains(x,z+1))
        plants.plant(x+.12*Math.sin(x+z),z,.23+.035*(Math.abs(Math.round(x+z))%3),{plantedBed:true});
    }
    const rim=officeOutline(upper,.82);
    rim.getSpacedPoints(Math.ceil(rim.getLength()/.68)).forEach((p,i)=>shrub(p.x,-p.y,.20,i,.27,officeBorder));
    const hedgeZ=upper?-28.4:-21.6;
    for(let x=-75.7,i=0;x<-69;x+=.32,i++)shrub(x,hedgeZ,.23,i,.27,officeHedge);
  }
  // Dining garden: the upper bed wraps behind the hall, with one broad
  // rounded street corner. The central walk stays open between two low hedges.
  const diningLawn=material('#304b25',0,.98),diningLeaves=material('#3d592b',0,.96);
  const borderLeaves=material('#899c50',0,.95),hedgeLeaves=material('#334e28',0,.96);
  function diningOutline(upper,inset=0){
    const west=-78+inset,front=-66.1-inset,north=(upper?2.1:15.5)+inset,south=(upper?10.1:21.9)-inset;
    const s=new T.Shape();s.moveTo(west,-south);s.lineTo(front,-south);
    if(upper){
      const east=-55.65-inset,back=4.5-inset,r=5-inset,corner=1.8-inset;
      s.lineTo(front,-back);s.lineTo(east,-back);s.lineTo(east,-(north+corner));
      s.quadraticCurveTo(east,-north,east-corner,-north);s.lineTo(west+r,-north);
      s.quadraticCurveTo(west,-north,west,-(north+r));
    }else{s.lineTo(front,-north);s.lineTo(west,-north);}
    s.closePath();return s;
  }
  for(const upper of [true,false]){
    const edge=diningOutline(upper),inside=diningOutline(upper,.43);
    for(const [shape,bottom,height,finish,label] of [[edge,.025,.24,curb,'curb'],[inside,.265,.035,diningLawn,'lawn']]){
      const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:16});geo.rotateX(-Math.PI/2);
      const surface=mesh(geo,finish,[0,bottom,0]);surface.name=`dining-garden-${upper?'upper':'lower'}-${label}`;
      surface.castShadow=false;
    }
    const polygon=inside.getPoints(24);
    const contains=(x,z)=>{
      let found=false;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[i],b=polygon[j];
        if((a.y>-z)!==(b.y>-z)&&x<(b.x-a.x)*(-z-a.y)/(b.y-a.y)+a.x)found=!found;
      }
      return found;
    };
    let index=0;
    for(let z=upper?2.8:16.2;z<(upper?9.65:21.45);z+=.65)for(let x=-77.4;x<-56.1;x+=.65){
      const xx=x+Math.sin(index*2.4)*.13,zz=z+Math.cos(index*1.7)*.12,size=.24+(index%4)*.045;index++;
      if(![[xx-size,zz],[xx+size,zz],[xx,zz-size],[xx,zz+size]].every(([px,pz])=>contains(px,pz)))continue;
      shrub(xx,zz,size,index,.15,index%3?diningLeaves:hedgeLeaves);
    }
    // Taller foliage sits within the lawn, clear of the rounded kerb and door.
    for(let z=upper?5.5:17.3;z<(upper?9:21);z+=2.0)for(let x=-75.5;x<-67.5;x+=2.25){
      if(contains(x-1,z)&&contains(x+1,z)&&contains(x,z-1)&&contains(x,z+1))
        plants.plant(x+.15*Math.sin(x+z),z,.24+.04*(Math.abs(Math.round(x+z))%3),{plantedBed:true});
    }
  }
  const border=new T.CurvePath();
  const v=(x,z)=>new T.Vector3(x,0,z);
  border.add(new T.LineCurve3(v(-77.1,9.1),v(-77.1,7.1)));
  border.add(new T.QuadraticBezierCurve3(v(-77.1,7.1),v(-77.1,3),v(-73,3)));
  border.add(new T.LineCurve3(v(-73,3),v(-57.45,3)));
  border.add(new T.QuadraticBezierCurve3(v(-57.45,3),v(-56.55,3),v(-56.55,3.6)));
  border.getSpacedPoints(Math.ceil(border.getLength()/.65)).forEach((p,i)=>shrub(p.x,p.z,.28,i,.27,borderLeaves));
  for(let z=16.4,i=0;z<21;z+=.65,i++)shrub(-77.1,z,.28,i,.27,borderLeaves);
  for(let x=-77.1,i=0;x<-66.9;x+=.65,i++)shrub(x,21,.28,i,.27,borderLeaves);
  for(const z of [9.55,16.05])for(let x=-77.4,i=0;x<-69.4;x+=.34,i++)shrub(x,z,.25,i,.28,hedgeLeaves);
  flatBox(13.5,5.4,-71.8,12.8,pavers,.065);
  for(let x=-78.3;x<-64.7;x+=.75)flatBox(.025,5.4,x,12.8,curb,.075);
  // The dining frontage meets an asphalt street with a broken centre line.
  const street=DINING_STREET,streetX=(street.west+street.east)/2;
  flatBox(street.east-street.west,street.south-street.north,streetX,(street.north+street.south)/2,asphalt,.047);
  for(let z=street.north+2;z<street.south-1;z+=5.2)flatBox(.085,2.2,streetX,z,paint,.065);
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
