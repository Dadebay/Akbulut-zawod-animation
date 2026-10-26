import * as T from 'three';
import {GYPSUM_SILO_TOWER as SILO} from './siteLayout.js';
import {GYPSUM_CORNER_SILO,GYPSUM_TRANSFER_HEIGHT} from './processPlan.js';

// Exterior dimensions traced from the October 21 rear and overhead references.
// The cutaway's illustrative process racks retain their independent layout.
export const REAR_SERVICE_YARD={
  // October 26 overhead: a straight open passage beside the process blocks,
  // with a single lower recess for the transfer tower and silo.
  gravel:{west:-7.1,upperWest:-2.1,transferPadNorth:23.2,east:16.85,north:-4.5,south:35.7,radius:3},
  bed:{x:7.5,z:6.5,width:8,depth:16,top:.55},
  cabin:{x:14.9,z:0,width:3,depth:2.8,height:2.55},
  cages:[{x:1.3,z:16.4,width:4.8,depth:1.6,rotation:Math.PI/2},{x:14.9,z:-3.1,width:1.7,depth:1.65}],
  buildings:[
    // Numbers follow the user's marked 13-part reference. The main envelope is
    // stepped in both directions; no full-height box sits beneath all its roofs.
    // In the later front-view markup these are 9, 8, 6, 7 and 4.
    // Front faces of 4 / 6 / 8 share x=-31; the L-wing passage stays open.
    {reference:1,name:'rear-south-block',x:-20.75,z:23.5,width:8.5,depth:20,height:18.8,roofRise:.65},
    {reference:2,name:'process-low-shoulder',x:-28,z:20.65,width:6,depth:14.3,height:12.4,roofRise:.45},
    {reference:3,name:'process-front-roof-block',x:-27,z:7.5,width:8,depth:12,height:26.4,roofRise:.7,roofDivider:true},
    {reference:4,name:'rear-stepped-block',x:-18.875,z:7.5,width:8.25,depth:12,height:25.6,roofRise:.7,roofDivider:true},
    // October 26 overhead markup: 3 is the ridged block, 1 the small shaft,
    // and 2 the continuous L-shaped low roof around the shaft.
    {reference:5,name:'process-high-roof-block',x:-25.775,z:-4.5,width:10.45,depth:12,height:28.3,roofRise:.7,roofShape:'gable'},
    {reference:6,name:'rear-high-shaft',x:-17.65,z:-1.6,width:5.8,depth:6.2,height:29.3},
    // October 25 markup, building 1: a low, recessed flat roof surrounded by
    // a deep parapet. Its west edge meets the shaft at -14.75, without a slit.
    {reference:8,name:'rear-hall-link',x:-11.175,z:-4.5,width:7.15,depth:12,height:5.4,parapetHeight:.9},
    {name:'rear-hall-return',x:-17.65,z:-7.6,width:5.8,depth:5.8,height:5.4,sharedRoof:'rear-hall-link'},
    {reference:7,name:'rear-service-room',x:-12.175,z:7.5,width:5.15,depth:12,height:4.5,roofRise:1.2},
    // Markup part 2: attached to the end of part 1, extending toward the west.
    {reference:9,name:'rear-low-annex',x:-23,z:35,width:13,depth:3,height:3.0,roofFinish:'black'},
  ],
};

export function buildRearServiceYard(k,roofs,structures){
  const {box,cyl,rod,mesh,group,material,m}=k,L=REAR_SERVICE_YARD;
  const shell=group([0,0,0],structures),cover=group([0,0,0],roofs),yard=group([0,0,0],structures);
  shell.name='rear-reference-buildings';cover.name='rear-reference-roofs';yard.name='rear-service-yard';
  const wall=material('#f4f5f3',.04,.82),joint=material('#cdd2cf',.1,.78);
  const coping=material('#d8dcda',.24,.61),roof=material('#b9bfbc',.16,.71,{surface:'roofSheet'});
  const ribbedRoof=material('#9aa2a5',.20,.77,{surface:'roofSheet'});
  const blackRoof=material('#24292d',0,.96,{surface:'roofSheet'});
  const glass=material('#304a52',.45,.28),frame=material('#b7c2bf',.32,.57);

  function building(b){
    const g=group([b.x,0,b.z],shell),r=group([b.x,0,b.z],cover);
    g.name=b.name;r.name=`${b.name}-roof`;
    if(b.reference)g.userData.referencePart=b.reference;
    box(b.width,b.height,b.depth,[0,b.height/2,0],wall,g);
    box(b.width+.22,.18,b.depth+.22,[0,.09,0],coping,g);
    for(const side of [-1,1])for(let z=-b.depth/2+.65;z<b.depth/2-.2;z+=.7)
      box(.016,b.height-.18,.014,[side*(b.width/2+.012),b.height/2,z],joint,g).castShadow=false;
    for(let x=-b.width/2+.65;x<b.width/2-.2;x+=.7)
      box(.014,b.height-.18,.016,[x,b.height/2,b.depth/2+.012],joint,g).castShadow=false;
    for(let y=5.1;y<b.height-.4;y+=5.1){
      for(const side of [-1,1])box(.018,.022,b.depth,[side*(b.width/2+.015),y,0],joint,g).castShadow=false;
      box(b.width,.022,.018,[0,y,b.depth/2+.015],joint,g).castShadow=false;
    }
    if(b.sharedRoof)return g;
    if(b.roofShape==='gable'){
      const w=b.width/2,d=b.depth/2,h=b.height,rise=b.roofRise;
      const ends=new T.BufferGeometry();
      ends.setAttribute('position',new T.Float32BufferAttribute([
        -w,h,-d,w,h,-d,0,h+rise,-d,-w,h,d,w,h,d,0,h+rise,d,
      ],3));
      ends.setIndex([0,2,1,3,4,5]);ends.computeVertexNormals();mesh(ends,wall,[0,0,0],g);
      for(const side of [-1,1]){
        const length=Math.hypot(w,rise),angle=-side*Math.atan2(rise,w);
        const sheet=box(length+.06,.10,b.depth+.12,[side*w/2,h+rise/2+.06,0],ribbedRoof,r);
        sheet.rotation.z=angle;
        for(const z of [-d,d]){
          const edge=box(length+.06,.13,.08,[side*w/2,h+rise/2+.07,z],coping,r);edge.rotation.z=angle;
        }
        box(.10,.16,b.depth+.16,[side*w,h+.02,0],coping,r);
      }
      box(.14,.12,b.depth+.16,[0,h+rise+.11,0],coping,r);
      return g;
    }
    if(b.name==='rear-hall-link'){
      const back=L.buildings.find(v=>v.sharedRoof===b.name);
      const west=back.x-back.width/2-b.x,east=b.width/2,north=-b.depth/2,south=b.depth/2;
      const notchX=-b.width/2,notchZ=back.z+back.depth/2-b.z;
      // One inset L-shaped deck, without a parapet or overlapping sheets
      // across the join between its two legs.
      const outline=[[west+.12,north+.12],[east-.12,north+.12],[east-.12,south-.12],
        [notchX+.12,south-.12],[notchX+.12,notchZ-.12],[west+.12,notchZ-.12]];
      const shape=new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z)));
      const deck=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,steps:1});deck.rotateX(-Math.PI/2);
      mesh(deck,roof,[0,b.height,0],r).name='rear-hall-link-continuous-roof';
      const edge=[[west,north],[east,north],[east,south],[notchX,south],[notchX,notchZ],[west,notchZ]];
      const height=b.parapetHeight;
      for(let i=0;i<edge.length;i++){
        const a=edge[i],c=edge[(i+1)%edge.length],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz);
        box(Math.abs(dx)||.12,height,Math.abs(dz)||.12,
          [(a[0]+c[0])/2-dz/length*.06,b.height+height/2,(a[1]+c[1])/2+dx/length*.06],wall,r);
      }
      return g;
    }
    if(b.roofRise){
      // Closed lean-to roof: high against the process wall, low at the yard.
      const w=b.width/2,d=b.depth/2,h=b.height,rise=b.roofRise;
      const wedge=new T.BufferGeometry();
      wedge.setAttribute('position',new T.Float32BufferAttribute([
        -w,h,-d,w,h,-d,-w,h+rise,-d,-w,h,d,w,h,d,-w,h+rise,d,
      ],3));
      wedge.setIndex([2,4,1,2,5,4,0,5,2,0,3,5,0,2,1,3,4,5]);wedge.computeVertexNormals();
      mesh(wedge,wall,[0,0,0],g);
      const length=Math.hypot(b.width,rise),angle=-Math.atan2(rise,b.width);
      const sheet=box(length+.12,.10,b.depth+.12,[0,h+rise/2+.06,0],ribbedRoof,r);
      sheet.rotation.z=angle;
      for(const z of [-d,d]){
        const edge=box(length+.14,.13,.08,[0,h+rise/2+.07,z],coping,r);edge.rotation.z=angle;
      }
      box(.10,.16,b.depth+.16,[w,h+.02,0],coping,r);
      if(b.roofDivider)box(.13,.7,b.depth,[w-.065,h+.35,0],wall,r);
      return g;
    }
    // Keep the deck inside the 12 cm parapets: a full-width sheet shares
    // their exterior faces and flickers through the white fascia at close range.
    box(b.width-.24,.12,b.depth-.24,[0,b.height+.06,0],b.roofFinish==='black'?blackRoof:roof,r);
    const parapet=b.parapetHeight??.42;
    for(const x of [-b.width/2+.06,b.width/2-.06])box(.12,parapet,b.depth,[x,b.height+parapet/2,0],wall,r);
    for(const z of [-b.depth/2+.06,b.depth/2-.06])box(b.width,parapet,.12,[0,b.height+parapet/2,z],wall,r);
    return g;
  }
  L.buildings.forEach(building);
  const tower=building({...SILO,name:'gypsum-corner-silo-tower',reference:12});
  box(SILO.width+.1,2.8,SILO.depth+1.0,[0,1.4,.35],wall,tower);
  // Straight elevated transfer from tower 3 to building 1. Material-flow
  // geometry owns the working duct; this gallery carries it between the walls.
  const low=L.buildings.find(b=>b.name==='rear-south-block');
  const bridgeWest=low.x+low.width/2,bridgeEast=SILO.x-SILO.width/2,span=bridgeEast-bridgeWest;
  const bridge=group([(bridgeWest+bridgeEast)/2,GYPSUM_TRANSFER_HEIGHT-.5,SILO.z],shell);bridge.name='rear-silo-transfer-bridge';
  box(span+.08,.12,.95,[0,0,0],m.steel,bridge);
  for(const z of [-.43,.43]){
    box(span+.08,.28,.08,[0,-.15,z],coping,bridge);
    for(let x=-span/2;x<span/2;x+=1.2)rod([x,-.25,z],[Math.min(span/2,x+1.2),-.02,z],.025,m.steel,bridge);
  }

  // Doors, intake grilles and the small green window on the ground-level room.
  const room=L.buildings.find(b=>b.name==='rear-service-room'),face=room.x+room.width/2+.04;
  const detail=group([face,0,room.z],shell);detail.rotation.y=Math.PI/2;
  for(const z of [-4.2,.4,2.0,3.6]){
    box(.84,2.05,.045,[z,1.1,0],coping,detail);
    box(.70,1.92,.025,[z,1.1,.035],wall,detail);
  }
  box(1.1,.64,.05,[-4.2,3.25,0],frame,detail);
  box(.96,.49,.025,[-4.2,3.25,.04],glass,detail);
  for(const x of [.4,2.0,3.6]){
    box(1.18,.62,.05,[x,3.25,.01],frame,detail);
    for(let y=3.02;y<3.52;y+=.075)box(1.08,.034,.07,[x,y,.05],coping,detail);
  }
  const annex=L.buildings.at(-1);
  for(let i=0;i<4;i++){
    const x=annex.x-annex.width/2+1.2+i*(annex.width-2.4)/3;
    box(1.6,2.3,.045,[x,1.27,annex.z+annex.depth/2+.025],frame,shell);
    box(1.46,2.16,.03,[x,1.27,annex.z+annex.depth/2+.06],wall,shell);
  }
  // Roof vents belong to their individual pitched sheets, not a shared flat roof.
  for(const [part,x,z] of [[1,-23.5,30.5],[2,-28,23.7],[3,-27.2,7.4],[4,-20.7,10],[4,-19.8,10]]){
    const b=L.buildings.find(b=>b.reference===part);
    const y=b.height+(b.roofRise||0)*(b.x+b.width/2-x)/b.width;
    box(.48,.08,.48,[x,y+.17,z],coping,cover);
    cyl(.14,1.0,[x,y+.69,z],wall,cover);
    cyl(.22,.16,[x,y+1.26,z],coping,cover,.13);
  }

  // Continuous dark service paving; the gravel island is separate from stock heaps.
  box(58,.08,49,[-10,-.085,14],m.road,yard);
  let seed=4927;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),tones=['#777a7d','#b4b5b5','#d8d8d6','#929598','#c4c5c4'];
  ctx.fillStyle='#6e7276';ctx.fillRect(0,0,512,512);
  for(let i=0;i<4000;i++){
    const x=random()*512,y=random()*512,r=2+random()*6;
    ctx.fillStyle=tones[i%tones.length];ctx.strokeStyle='#62686c';ctx.lineWidth=.6;
    ctx.beginPath();
    for(let j=0;j<5;j++){const a=j*Math.PI*2/5,rr=r*(.7+random()*.3);ctx[j?'lineTo':'moveTo'](x+Math.cos(a)*rr,y+Math.sin(a)*rr);}
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  const gravelMap=k.trackTexture(new T.CanvasTexture(canvas));
  gravelMap.wrapS=gravelMap.wrapT=T.RepeatWrapping;gravelMap.colorSpace=T.SRGBColorSpace;gravelMap.anisotropy=k.tablet?4:8;
  const gravel=material('#e6e6e4',0,.97,{map:gravelMap,bumpMap:gravelMap,bumpScale:.06});
  const darkGravel=material('#a0a3a8',0,.98,{map:gravelMap,bumpMap:gravelMap,bumpScale:.07});
  const f=L.gravel,outline=new T.Shape();
  outline.moveTo(f.upperWest+f.radius,-f.north);outline.lineTo(f.east,-f.north);outline.lineTo(f.east,-f.south);
  outline.lineTo(f.west+f.radius,-f.south);outline.quadraticCurveTo(f.west,-f.south,f.west,-f.south+f.radius);
  outline.lineTo(f.west,-f.transferPadNorth);outline.lineTo(f.upperWest,-f.transferPadNorth);
  outline.lineTo(f.upperWest,-f.north-f.radius);outline.quadraticCurveTo(f.upperWest,-f.north,f.upperWest+f.radius,-f.north);outline.closePath();
  const groundGeo=new T.ShapeGeometry(outline,12);groundGeo.rotateX(-Math.PI/2);
  function gravelUV(geo){const p=geo.attributes.position;geo.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>[p.getX(i)/4,p.getZ(i)/4]).flat(),2));return geo;}
  mesh(gravelUV(groundGeo),gravel,[0,.015,0],yard).name='rear-gravel-field';
  const perimeter=outline.getPoints(12);
  for(let i=1;i<perimeter.length;i++){
    const a=perimeter[i-1],b=perimeter[i],length=a.distanceTo(b);if(length<.001)continue;
    const kerb=box(length+.025,.13,.14,[(a.x+b.x)/2,.025,-(a.y+b.y)/2],coping,yard);
    kerb.rotation.y=Math.atan2(b.y-a.y,b.x-a.x);kerb.castShadow=false;
  }
  const bed=L.bed,bg=group([bed.x,0,bed.z],yard);bg.name='rear-raised-vent-bed';
  box(bed.width+2.0,.14,bed.depth+2.0,[0,.07,0],m.concrete,bg);
  const hw=bed.width/2,hd=bed.depth/2,positions=[];
  for(const [y,inset] of [[.14,0],[bed.top,.35]])for(const [x,z] of [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]])
    positions.push(x-Math.sign(x)*inset,y,z-Math.sign(z)*inset);
  const bedGeo=new T.BufferGeometry();bedGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  bedGeo.setIndex([4,6,5,4,7,6,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);bedGeo.computeVertexNormals();
  mesh(gravelUV(bedGeo),darkGravel,[0,0,0],bg);
  // Sparse angular stones add surface relief; the shared map supplies the fine fill.
  const pebbleGeo=new T.TetrahedronGeometry(1),pebbleMat=material('#bfc2c5',0,.96);
  const pose=new T.Object3D(),colour=new T.Color(),fieldPoints=[];
  const insideBox=(x,z,c,pad=0)=>{
    const angle=c.rotation||0,dx=x-c.x,dz=z-c.z;
    return Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))<c.width/2+pad
      &&Math.abs(dx*Math.sin(angle)+dz*Math.cos(angle))<c.depth/2+pad;
  };
  const insideField=(x,z)=>{
    let inside=false;
    for(let i=0,j=perimeter.length-1;i<perimeter.length;j=i++){
      const a=perimeter[i],b=perimeter[j];
      if((a.y>-z)!==(b.y>-z)&&x<(b.x-a.x)*(-z-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  };
  for(let i=0;i<15000;i++){
    const x=f.west+.2+random()*(f.east-f.west-.4),z=f.north+.2+random()*(f.south-f.north-.4);
    if(!insideField(x-.15,z)||!insideField(x+.15,z)||!insideField(x,z-.15)||!insideField(x,z+.15))continue;
    if(insideBox(x,z,bed,1.1)||insideBox(x,z,L.cabin,.5)||L.cages.some(c=>insideBox(x,z,c,.3)))continue;
    if(insideBox(x,z,SILO,.3)||Math.hypot(x-GYPSUM_CORNER_SILO[0],z-GYPSUM_CORNER_SILO[2])<2.5)continue;
    fieldPoints.push([x,.055,z]);
  }
  const bedPoints=Array.from({length:3500},()=>[bed.x+(random()-.5)*(bed.width-1),bed.top+.025,bed.z+(random()-.5)*(bed.depth-1)]);
  for(const [name,points] of [['rear-field-gravel-stones',fieldPoints],['rear-bed-gravel-stones',bedPoints]]){
    const stones=k.instances(pebbleGeo,pebbleMat,points.length,yard);stones.name=name;stones.castShadow=false;
    points.forEach((p,i)=>{
      const s=.055+random()*.085;pose.position.set(...p);pose.rotation.set(random()*2,random()*6,random()*2);pose.scale.set(s,s*.55,s*.8);pose.updateMatrix();
      stones.setMatrixAt(i,pose.matrix);stones.setColorAt(i,colour.set(tones[i%tones.length]));
    });
    stones.instanceMatrix.needsUpdate=true;stones.instanceColor.needsUpdate=true;
  }

  // Six vents: three across each end, matching the six red reference dots.
  const path=new T.CurvePath();
  path.add(new T.LineCurve3(new T.Vector3(0,bed.top,0),new T.Vector3(0,1.4,0)));
  path.add(new T.CubicBezierCurve3(new T.Vector3(0,1.4,0),new T.Vector3(0,1.8,0),new T.Vector3(.6,1.8,0),new T.Vector3(.6,1.4,0)));
  path.add(new T.LineCurve3(new T.Vector3(.6,1.4,0),new T.Vector3(.6,1.14,0)));
  const ventGeo=new T.TubeGeometry(path,20,.115,10,false);
  for(const dx of [-.3,0,.3])for(const dz of [-.36,.36]){
    const x=bed.x+dx*bed.width,z=bed.z+dz*bed.depth;
    const g=group([x,0,z],yard);g.name='rear-gooseneck-vent';
    mesh(ventGeo,wall,[0,0,0],g);cyl(.19,.06,[0,bed.top+.03,0],coping,g);
    cyl(.093,.008,[.6,1.14,0],m.dark,g);
  }
  const green=material('#477853',.14,.64);
  for(const [dx,dz] of [[.06,.04],[.31,-.08],[.31,.10]]){
    const x=bed.x+dx*bed.width,z=bed.z+dz*bed.depth;
    const g=group([x,bed.top,z],yard);g.name='rear-green-inspection-cover';
    box(1.08,.12,.92,[0,.06,0],coping,g);
    box(.94,.27,.78,[0,.20,0],green,g);
    const lid=box(1.02,.055,.86,[0,.36,0],green,g);lid.rotation.x=.13;
    rod([-.15,.39,.12],[.15,.39,.12],.02,coping,g);
  }

  function cage(c,index){
    const g=group([c.x,0,c.z],yard);g.name=`rear-yellow-station-${index+1}`;
    g.rotation.y=c.rotation||0;
    const yellow=material('#f0c523',.18,.54),w=c.width,d=c.depth;
    box(w+.5,.16,d+.5,[0,.08,0],m.concrete,g);
    const n=index===0?2:1;
    for(let i=0;i<n;i++){
      const x=(i-(n-1)/2)*(w/2);
      box(index===0?1.65:1.0,1.0,d-.55,[x,.78,0],yellow,g);
      for(const z of [-.25,.25])cyl(.07,1.5,[x,.9,z],yellow,g);
      cyl(.055,2.9,[x-w/(n*3),1.6,0],yellow,g);
      box(.20,.22,.12,[x,1.43,.20],coping,g);
    }
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(.065,1.45,.065,[x,.88,z],yellow,g);
    for(const z of [-d/2,d/2]){
      for(const y of [.23,1.52])box(w,.045,.045,[0,y,z],yellow,g);
      for(let x=-w/2+.12;x<w/2;x+=.14)box(.018,1.27,.018,[x,.875,z],yellow,g).castShadow=false;
    }
    for(const x of [-w/2,w/2]){
      for(const y of [.23,1.52])box(.045,.045,d,[x,y,0],yellow,g);
      for(let z=-d/2+.12;z<d/2;z+=.14)box(.018,1.27,.018,[x,.875,z],yellow,g).castShadow=false;
    }
  }
  L.cages.forEach(cage);
  const hut=L.cabin,hg=building({...hut,name:'rear-control-cabin'});
  box(hut.width+.9,.14,hut.depth+.9,[hut.x,.07,hut.z],m.concrete,yard);
  for(const x of [-.85,.85])box(.58,.38,.03,[x,1.65,hut.depth/2+.028],glass,hg);
  const hdg=group([hut.width/2+.025,0,0],hg);hdg.rotation.y=Math.PI/2;
  box(.83,2.04,.045,[0,1.1,0],frame,hdg);box(.72,1.94,.025,[0,1.1,.035],wall,hdg);
  // Four sloped roof sheets meet at a low central ridge.
  const hx=hut.width/2-.08,hz=hut.depth/2-.08;
  const hipGeo=new T.BufferGeometry();hipGeo.setAttribute('position',new T.Float32BufferAttribute([
    -hx,0,-hz,hx,0,-hz,0,.48,0, hx,0,-hz,hx,0,hz,0,.48,0,
    hx,0,hz,-hx,0,hz,0,.48,0, -hx,0,hz,-hx,0,-hz,0,.48,0,
  ],3));hipGeo.setIndex([0,2,1,3,5,4,6,8,7,9,11,10]);hipGeo.computeVertexNormals();
  mesh(hipGeo,wall,[hut.x,hut.height+.14,hut.z],cover);
  const mast=group([1.25,0,13.3],yard);mast.name='rear-yard-floodlight';
  box(.65,.25,.65,[0,.125,0],m.concrete,mast);cyl(.065,9.7,[0,5,0],coping,mast,.11);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,x=Math.cos(a)*.4,z=Math.sin(a)*.4;
    rod([0,9.5,0],[x,9.7,z],.03,coping,mast);
    const light=cyl(.15,.13,[x,9.75,z],m.light,mast);light.rotation.z=Math.PI/3;light.rotation.y=a;
  }
  return {yard,shell,cover};
}
