import {secondTrackPath,arrivalTrainPose,ARRIVAL_CAR_OFFSETS,SECOND_TRACK_END_X,SECOND_TRACK_Z} from './arrivalTrain.js';
import * as T from 'three';
import {buildTurkmenLocomotive} from './turkmenLocomotive.js';
import {buildBoulderPiles} from './rubble.js';
import {RAW_YARD,RAW_YARD_APRON,RAIL_ACCESS_CROSSING} from './siteLayout.js';
import {RAIL_LAYOUT} from './railLayout.js';

export {RAIL_LAYOUT} from './railLayout.js';
export const FREIGHT_RAIL_EXTENSION={startX:110,endX:RAW_YARD_APRON.east-6};
export const RAW_YARD_RAIL_GATE={west:RAW_YARD.east-9,east:RAW_YARD.east-3};

// End beside the apron on the existing straight axis, outside the paved yard.
// Terrain grading follows the same line as the visible rails.
export function freightRailExtensionPath(){
  const {startX,endX}=FREIGHT_RAIL_EXTENSION,P=x=>new T.Vector3(x,0,RAIL_LAYOUT.z);
  const path=new T.CurvePath();
  path.add(new T.LineCurve3(P(startX),P(endX)));
  return path;
}

// Freight consist with a photo-informed Turkmenistan CKD9A-1 style locomotive.
// Wagon loading coordinates remain independent of the locomotive sections.
export function buildRail(k,pallet){
  const {m,box,cyl,ring,rod,group,mesh,material,textPlate}=k;
  const railWheels=[],trainCargo=[];
  const blue=material('#1b507e',.32,.42),white=material('#dce1e3',.2,.47),frame=material('#30383d',.64,.58),steel=material('#899195',.82,.37),rubber=material('#1b242a',0,.92),glass=material('#213c49',.35,.2),darkGlass=material('#14232c',.25,.26),edge=material('#c4ae61',.25,.6);
  const ballast=material('#8b8981',0,1),railMat=material('#7b7770',.83,.4),tie=material('#79796f',0,.95);
  const straightLength=FREIGHT_RAIL_EXTENSION.endX+700,straightCenter=(FREIGHT_RAIL_EXTENSION.endX-700)/2;
  box(straightLength,.18,4.05,[straightCenter,.005,RAIL_LAYOUT.z],ballast);
  // Concrete sleepers, fastenings, rail webs and polished running surfaces.
  for(let x=-700;x<=FREIGHT_RAIL_EXTENSION.endX+.01;x+=.7){
    box(.24,.15,2.64,[x,.19,RAIL_LAYOUT.z],tie);
    if(x>-165)for(const z of [-.76,.76]){box(.32,.035,.25,[x,.285,RAIL_LAYOUT.z+z],frame);for(const dz of [-.12,.12])box(.07,.06,.045,[x,.30,RAIL_LAYOUT.z+z+dz],railMat);}
  }
  for(const dz of [-.76,.76]){const z=RAIL_LAYOUT.z+dz;box(straightLength,.035,.16,[straightCenter,.285,z],railMat);box(straightLength,.075,.055,[straightCenter,.34,z],railMat);box(straightLength,.065,.075,[straightCenter,.3775,z],steel);}
  // Flush crossing panels leave the flangeways open where the two roads cross.
  for(const x of [-143,-62]){box(10,.19,1.30,[x,.30,RAIL_LAYOUT.z],frame);for(const dz of [-1.30,1.30])box(10,.19,.85,[x,.30,RAIL_LAYOUT.z+dz],frame);}
  const ballastCount=k.tablet?1800:6500,stones=k.instances(new T.DodecahedronGeometry(1,0),ballast,ballastCount);const dummy=new T.Object3D();let seed=83;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<ballastCount;i++){dummy.position.set(-180+rnd()*(FREIGHT_RAIL_EXTENSION.endX+180),.14,RAIL_LAYOUT.z+(rnd()>.5?1:-1)*(1.35+rnd()*.65));dummy.rotation.set(rnd()*3,rnd()*3,rnd()*3);const s=.045+rnd()*.075;dummy.scale.set(s,s*.55,s);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}stones.instanceMatrix.needsUpdate=true;stones.userData.detailDistance=100;

  // A braced buffer stop makes the straight track's endpoint visible.
  {
    const stop=group([FREIGHT_RAIL_EXTENSION.endX-1.7,0,RAIL_LAYOUT.z]);stop.name='freight-track-buffer-stop';
    for(const z of [-.76,.76]){
      box(2.8,.18,.23,[.25,.49,z],frame,stop);
      rod([-1.1,.58,z],[0,1.25,z],.10,frame,stop);
      rod([1.5,.58,z],[0,1.25,z],.10,frame,stop);
    }
    box(.28,.32,2.7,[0,1.25,0],frame,stop);
    for(let i=0;i<5;i++)box(.025,.22,.5,[-.153,1.25,-1+i*.5],i%2?m.red:white,stop);
  }

  // The incoming siding branches from the main line at the west end and stops
  // beside the dormitory, before the road crossing.
  {
    const track=secondTrackPath();
    const length=track.getLength(),segments=Math.ceil(length/2);
    function strip(width,y,mat,offset=0){
      const pos=[],idx=[];
      for(let i=0;i<=segments;i++){const p=track.getPointAt(i/segments),t=track.getTangentAt(i/segments),nx=-t.z,nz=t.x;for(const side of [-1,1]){const w=offset+side*width/2;pos.push(p.x+nx*w,y,p.z+nz*w);}if(i<segments){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
      const item=mesh(geo,mat);item.castShadow=false;return item;
    }
    strip(3.3,.07,ballast);
    for(const side of [-.76,.76]){strip(.16,.31,railMat,side);strip(.07,RAIL_LAYOUT.railTop,steel,side);}
    const count=Math.floor(length/.7),sleepers=k.instances(new T.BoxGeometry(.24,.15,2.64),tie,count),o=new T.Object3D();
    for(let i=0;i<count;i++){const p=track.getPointAt(i/(count-1)),t=track.getTangentAt(i/(count-1));o.position.set(p.x,.19,p.z);o.rotation.set(0,-Math.atan2(t.z,t.x),0);o.scale.set(1,1,1);o.updateMatrix();sleepers.setMatrixAt(i,o.matrix);}
    sleepers.instanceMatrix.needsUpdate=true;
    // A low stone cap buries the rail ends, matching the straight siding in the reference.
    const sidingEnd=group([SECOND_TRACK_END_X,0,SECOND_TRACK_Z]);
    sidingEnd.name='dormitory-siding-stone-end';
    box(2.2,.16,3.05,[.60,.14,0],ballast,sidingEnd);
    box(2.0,.32,2.8,[-.35,.35,0],material('#5b605f',0,.94),sidingEnd,.055);
  }

  // A plain concrete road crossing spans the whole fence opening. The siding
  // stops beside it, so only the straight main rails pass through.
  {
    const {x:roadX,width}=RAIL_ACCESS_CROSSING;
    const west=roadX-width/2,east=roadX+width/2;
    const entrance=group();entrance.name='rail-access-gateway';
    const roadSurface=m.road;
    const panelSurface=material('#8b9191',0,.96,{
      map:roadSurface.map,bumpMap:roadSurface.bumpMap,bumpScale:.009
    });
    const seam=material('#515957',0,.98),header=material('#a8aaa5',0,.94);
    function strip(left0,right0,z0,y0,left1,right1,z1,y1,mat){
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute([
        left0,y0,z0,right0,y0,z0,left1,y1,z1,right1,y1,z1
      ],3));
      geo.setAttribute('uv',new T.Float32BufferAttribute([
        left0/3,z0/3,right0/3,z0/3,left1/3,z1/3,right1/3,z1/3
      ],2));
      geo.setIndex(z1>z0?[0,2,1,1,2,3]:[0,1,2,1,3,2]);
      geo.computeVertexNormals();
      const surface=mesh(geo,mat,[0,0,0],entrance);surface.castShadow=false;return surface;
    }
    const approaches=[
      [-45.5,-.035,width,-50.7,.392,width],
      [-58.9,.392,width,-64.5,.145,width]
    ];
    // Short grades merge into the yard asphalt; only the rail deck reads as concrete.
    for(const [z0,y0,w0,z1,y1,w1] of approaches){
      strip(roadX-w0/2,roadX+w0/2,z0,y0,
        roadX-w1/2,roadX+w1/2,z1,y1,roadSurface);
    }
    const grooveHalfWidth=.13,north=-50.7,south=-58.9;
    const roadPanels={positions:[],uvs:[],indices:[]};
    function panel(x0,x1,z0,z1){
      const {positions,uvs,indices}=roadPanels;
      const base=positions.length/3,y=.392;
      positions.push(x0,y,z0,x1,y,z0,x0,y,z1,x1,y,z1);
      uvs.push(x0/3,z0/3,x1/3,z0/3,x0/3,z1/3,x1/3,z1/3);
      indices.push(base,base+2,base+1,base+1,base+2,base+3);
    }
    const grooves=[RAIL_LAYOUT.z-.76,RAIL_LAYOUT.z+.76]
      .map(z=>[z-grooveHalfWidth,z+grooveHalfWidth]).sort((a,b)=>a[0]-b[0]);
    let edge=south;
    for(const [start,end] of [...grooves,[north,north]]){
      if(start>edge+.02)panel(west,east,edge,start);
      edge=Math.max(edge,end);
    }
    const panels=new T.BufferGeometry();
    panels.setAttribute('position',new T.Float32BufferAttribute(roadPanels.positions,3));
    panels.setAttribute('uv',new T.Float32BufferAttribute(roadPanels.uvs,2));
    panels.setIndex(roadPanels.indices);panels.computeVertexNormals();
    const crossing=mesh(panels,panelSurface,[0,0,0],entrance);
    crossing.name='rail-access-crossing-panels';crossing.castShadow=false;
    // A single panel joint gives the crossing the simple slab detail in the reference.
    for(const x of [west+1.8]){
      let edge=south;
      for(const [start,end] of [...grooves,[north,north]]){
        if(start>edge+.04)box(.025,.004,start-edge,[x,.396,(edge+start)/2],seam).castShadow=false;
        edge=Math.max(edge,end);
      }
    }
    for(const z of [north+.13,south-.13]){
      box(width,.035,.17,[roadX,.375,z],header).castShadow=false;
    }
  }

  function wheelset(parent,x,r=.46){
    const y=RAIL_LAYOUT.railTop+r;
    const axle=cyl(.105,2.25,[x,y,0],frame,parent);axle.rotation.x=Math.PI/2;
    for(const side of [-1,1]){
      const g=group([x,y,side*.76],parent,true);g.userData.wheelKey=`rail:${r}:${side}`;
      g.userData.radius=r;
      const profile=[[0,-.10],[r*.50,-.10],[r*.68,-.067],[r*.85,-.067],[r,-.088],[r,.067],[r+.035,.067],[r+.035,.105],[r*.76,.105],[r*.58,.065],[0,.065]].map(([rr,z])=>new T.Vector2(rr,z));
      const wheel=mesh(new T.LatheGeometry(profile,k.tablet?24:64),steel,[0,0,0],g);wheel.rotation.x=side*Math.PI/2;
      const hub=cyl(.16,.20,[0,0,side*.12],frame,g,undefined,32);hub.rotation.x=Math.PI/2;
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2,bolt=cyl(.022,.025,[Math.sin(a)*.23,Math.cos(a)*.23,side*.13],steel,g,undefined,6);bolt.rotation.x=Math.PI/2;}
      railWheels.push(g);
    }
  }
  function spring(parent,x,z){
    cyl(.092,.23,[x,1.17,z],rubber,parent);
    for(let y=1.07;y<1.29;y+=.037)ring(.105,.018,[x,y,z],steel,parent);
  }
  function bogie(parent,x,loco=false){
    const g=group([x,0,0],parent),axles=loco?[-1.75,0,1.75]:[-.93,.93];
    for(const a of axles)wheelset(g,a,loco?.49:.46);
    for(const z of [-1.04,1.04]){
      box(loco?4.7:2.7,.23,.19,[0,1.05,z],frame,g,.045);
      for(const a of axles){box(.35,.28,.24,[a,.99,z],frame,g,.035);box(.22,.19,.035,[a,.99,z+Math.sign(z)*.14],steel,g,.025);for(const dx of [-.25,.25])spring(g,a+dx,z);rod([a-.40,.69,z*.8],[a+.40,.69,z*.8],.035,frame,g);}
      box(.65,.22,.2,[0,1.24,z],steel,g,.025);
    }
    for(const a of axles)box(.22,.15,2.0,[a,1.08,0],frame,g);
    box(.65,.20,1.7,[0,1.25,0],frame,g);
  }
  function coupling(parent,x,direction){
    box(.75,.21,.25,[x,1.08,0],frame,parent,.035);
    box(.31,.33,.40,[x+direction*.35,1.08,0],steel,parent,.05);
    box(.22,.20,.17,[x+direction*.47,1.08,.13],frame,parent,.025);
    for(const z of [-.38,.38]){const hose=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x,1.08,z),new T.Vector3(x+direction*.17,.62,z),new T.Vector3(x+direction*.37,.91,z)]),12,.025,6,false),rubber,[0,0,0],parent);}
  }
  const train=group([RAIL_LAYOUT.offsetX,0,0],k.scene,true);
  for(const [n,cx] of RAIL_LAYOUT.wagonCentres.entries()){
    const g=group([cx,0,RAIL_LAYOUT.z],train);bogie(g,-4.65);bogie(g,4.65);
    for(const z of [-.72,.72]){box(13.4,.28,.13,[0,1.23,z],frame,g);box(13.4,.06,.28,[0,1.35,z],frame,g);}
    for(let x=-6.4;x<6.6;x+=.75)box(.10,.17,2.8,[x,1.31,0],frame,g);
    box(13.4,.13,2.9,[0,1.425,0],blue,g);
    for(let x=-6.5;x<6.6;x+=.26)box(.24,.07,2.78,[x,1.525,0],m.wood,g);
    for(const z of [-1.47,1.47]){
      box(13.4,.18,.085,[0,1.38,z],blue,g);
      for(let x=-6.4;x<=6.5;x+=1.29){
        // Retracted stakes leave a full pallet-width loading opening on the
        // warehouse side; the opposite side retains its upright restraints.
        const loadingOpening=z>0&&RAIL_LAYOUT.cargoXs.some(cx=>Math.abs(x-cx)<1.05);
        box(.09,loadingOpening?.10:.85,.09,[x,loadingOpening?1.48:1.91,z],blue,g);
        box(.16,.19,.035,[x,1.46,z+Math.sign(z)*.06],steel,g);ring(.055,.015,[x,1.48,z+Math.sign(z)*.08],steel,g,'z');
      }
      // Folded side boards expose the freight and the forklift loading edge.
      for(let x=-5.35;x<6;x+=2.68){box(2.53,.35,.07,[x,1.14,z],blue,g);box(2.5,.035,.025,[x,1.17,z+Math.sign(z)*.05],steel,g);}
      const label=textPlate(`AKB ${String(n+1).padStart(3,'0')}`,1.15,.16,[0,1.37,z+Math.sign(z)*.05],g,'#e1e4db','#1b507e');if(z<0)label.rotation.y=Math.PI;
      for(const x of [-5.5,5.5])box(.25,.07,.015,[x,1.38,z+Math.sign(z)*.06],edge,g);
    }
    for(const x of [-6.65,6.65]){box(.09,.74,2.94,[x,1.91,0],blue,g);for(const z of [-1,0,1])box(.04,.68,.065,[x+Math.sign(x)*.06,1.91,z],steel,g);coupling(g,x+Math.sign(x)*.26,Math.sign(x));}
    for(const x of [-6.1,6.1])for(const z of [-1.62,1.62]){rod([x-.22,.60,z],[x-.22,1.47,z],.025,steel,g);rod([x+.22,.60,z],[x+.22,1.47,z],.025,steel,g);for(const y of [.65,.91,1.17])rod([x-.22,y,z],[x+.22,y,z],.025,steel,g);}
    const brake=ring(.22,.028,[-6.85,2.03,.8],edge,g,'x');for(const z of [-.18,.18])rod([-6.85,2.03,.8],[-6.85,2.03+z,.8],.017,edge,g);
    for(const x of RAIL_LAYOUT.cargoXs)trainCargo.push(pallet(g,[x,RAIL_LAYOUT.deckHeight,RAIL_LAYOUT.cargoZ],n%2?'bags':'panel',true));
  }

  buildTurkmenLocomotive(k,train,{z:RAIL_LAYOUT.z,bogie,coupling});
  // Shrink along the track and in height only; pallets keep their real size.
  const s=RAIL_LAYOUT.scale;train.scale.set(s,s,1);
  for(const cargo of trainCargo)cargo.scale.set(1/s,1/s,1);
  const incoming=[],firstIncomingWheel=railWheels.length;
  for(let i=0;i<3;i++){
    const g=group([0,0,0],k.scene,true);incoming.push(g);g.scale.set(RAIL_LAYOUT.scale,RAIL_LAYOUT.scale,1);
    if(i===0){
      buildTurkmenLocomotive(k,g,{z:0,bogie,coupling,sectionCentres:[0],frontTowardsPositiveX:true});
    }else{
      bogie(g,-3.6);bogie(g,3.6);box(13.4,.25,2.8,[0,1.42,0],blue,g);
      box(13.2,.08,2.65,[0,1.58,0],m.wood,g);
      for(const side of [-1,1]){
        box(13.3,.82,.08,[0,2.01,side*1.4],blue,g);
        for(let x=-5.6;x<6;x+=2.8)box(.10,.86,.12,[x,2.01,side*1.43],steel,g);
      }
      for(const x of [-6.6,6.6])box(.08,.82,2.85,[x,2.01,0],blue,g);
      const rawLoad=group([0,1.68,0],g);rawLoad.name='incoming-gypsum-stone-load';
      // Heaped to the brim: a fuller bed under overlapping, taller piles along the whole wagon.
      box(12.6,.74,2.52,[0,.37,0],material('#dedbd0',0,.96),rawLoad,.08);
      const spots=Array.from({length:15},(_,n)=>[-5.6+n*.8,n%2?-.14:.14,1.32,1.05+(n%3)*.12]);
      buildBoulderPiles(k,spots,{parent:rawLoad,seed:283+i*31,depthScale:.9});
      for(const x of [-6.9,6.9])coupling(g,x,Math.sign(x));
    }
  }
  const incomingWheels=railWheels.splice(firstIncomingWheel),tongues=[];
  for(const side of [-1,1]){
    const hinge=group([-149,.40,RAIL_LAYOUT.z+side*.76],k.scene,true);
    box(5,.065,.055,[2.5,0,0],steel,hinge);tongues.push(hinge);
  }
  function updateArrival(time){
    const lead=arrivalTrainPose(time);
    incoming.forEach((car,i)=>{const pose=arrivalTrainPose(time,ARRIVAL_CAR_OFFSETS[i]);car.position.copy(pose.position);car.rotation.y=pose.yaw;});
    incomingWheels.forEach(w=>{w.rotation.z=-lead.distance/(w.userData.radius||.46);});
    tongues.forEach((tongue,i)=>{tongue.rotation.y=(i?1:-1)*.025+lead.switch*.055;});
  }
  updateArrival(0);
  return {train,trainCargo,railWheels,updateArrival};
}
