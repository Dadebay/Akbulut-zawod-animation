import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ZONES,STATUSES} from './data.js';

export default function PlantScene({machines,selected,onSelect,view='perspective',paused=false}){
  const host=useRef(), labels=useRef(), state=useRef({machines,selected,paused}), controlsApi=useRef();
  const [failed,setFailed]=useState(false);
  state.current={machines,selected,paused};
  useEffect(()=>{controlsApi.current?.setView(view);},[view]);
  useEffect(()=>{
    const container=host.current;
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setFailed(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    container.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#eff6ff',.005);
    const camera=new THREE.PerspectiveCamera(34,1,.1,150);camera.position.set(34,29,38);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.target.set(0,.8,0);controls.minDistance=23;controls.maxDistance=85;controls.maxPolarAngle=Math.PI/2.35;controls.minPolarAngle=.12;controls.enablePan=false;
    controlsApi.current={setView(mode){camera.position.set(...(mode==='top'?[0,57,.1]:[34,29,38]));controls.target.set(0,.8,0);controls.update();}};
    scene.add(new THREE.HemisphereLight('#f7fbff','#aec7e5',2.4));
    const key=new THREE.DirectionalLight('#ffffff',3.5);key.position.set(-12,25,16);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-23;key.shadow.camera.right=23;key.shadow.camera.top=20;key.shadow.camera.bottom=-20;key.shadow.normalBias=.06;scene.add(key);
    const rim=new THREE.DirectionalLight('#61a7dc',1.7);rim.position.set(10,10,-16);scene.add(rim);
    const mats={metal:new THREE.MeshStandardMaterial({color:'#b9d0e6',metalness:.62,roughness:.36}),dark:new THREE.MeshStandardMaterial({color:'#446285',metalness:.7,roughness:.48}),body:new THREE.MeshStandardMaterial({color:'#e9f3ff',metalness:.4,roughness:.52}),mint:new THREE.MeshStandardMaterial({color:'#2877c9',metalness:.5,roughness:.45}),warm:new THREE.MeshStandardMaterial({color:'#89b4df',metalness:.6,roughness:.42}),floor:new THREE.MeshStandardMaterial({color:'#c8dbee',metalness:.2,roughness:.9}),belt:new THREE.MeshStandardMaterial({color:'#42658a',roughness:.9}),paper:new THREE.MeshStandardMaterial({color:'#f8fbff',roughness:.8}),glass:new THREE.MeshStandardMaterial({color:'#72b4fa',transparent:true,opacity:.2,metalness:.35,roughness:.3})};
    const geometries=[],extraMaterials=[],rotors=[],items=[],lamps=[],anchors=[],vehicles=[],materialFlows=[];
    const rubber=new THREE.MeshStandardMaterial({color:'#263e5a',roughness:.95});
    const rawMat=new THREE.MeshStandardMaterial({color:'#ded8c8',roughness:1});
    const roadMat=new THREE.MeshStandardMaterial({color:'#b8cee4',roughness:1});
    extraMaterials.push(rubber,rawMat,roadMat);
    function mesh(geo,mat,pos,parent=scene){geometries.push(geo);const obj=new THREE.Mesh(geo,mat);obj.position.set(...pos);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
    const box=(w,h,d,pos,mat=mats.body,parent=scene)=>mesh(new THREE.BoxGeometry(w,h,d),mat,pos,parent);
    const cyl=(r,h,pos,mat=mats.metal,parent=scene,top=r)=>mesh(new THREE.CylinderGeometry(top,r,h,32),mat,pos,parent);
    function tube(points,r=.09,material=mats.mint,parent=scene){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),48,r,8,false),material,[0,0,0],parent);}
    function railing(x,y,z,w,d,parent){
      [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]].forEach(([dx,dz])=>cyl(.035,.65,[x+dx,y+.32,z+dz],mats.warm,parent));
      [z-d/2,z+d/2].forEach(zz=>box(w,.04,.04,[x,y+.62,zz],mats.warm,parent));
      [x-w/2,x+w/2].forEach(xx=>box(.04,.04,d,[xx,y+.62,z],mats.warm,parent));
    }
    function supports(w,d,h,parent){[-w/2,w/2].forEach(x=>[-d/2,d/2].forEach(z=>box(.12,h,.12,[x,h/2,z],mats.dark,parent)));}
    function ladder(x,y,z,h,parent){[-.21,.21].forEach(dx=>box(.045,h,.045,[x+dx,y+h/2,z],mats.warm,parent));for(let i=0;i<h/.28;i++)box(.45,.035,.045,[x,y+i*.28,z],mats.warm,parent);}
    function conveyor(x,z,length,parent,zone,axis='x',kind='board'){
      const g=new THREE.Group();g.position.set(x,0,z);if(axis==='z')g.rotation.y=Math.PI/2;parent.add(g);
      box(length,.18,.95,[0,.8,0],mats.dark,g);box(length,.045,.69,[0,.91,0],mats.belt,g);
      for(let i=-length/2+.35;i<length/2;i+=1.15){box(.1,.8,.72,[i,.4,0],mats.dark,g);const roll=cyl(.10,.9,[i,.84,0],mats.metal,g);roll.rotation.x=Math.PI/2;}
      for(let i=0;i<Math.floor(length/1.8);i++){const product=box(kind==='bag'?.72:zone==='GK'?1.4:.82,kind==='bag'?.3:.10,zone==='GK'?.85:.75,[0,kind==='bag'?1.12:1.01,0],mats.paper,g);
        if(kind==='bag')box(.55,.015,.17,[0,.16,0],mats.mint,product);
        if(zone==='GK'){box(1.15,.014,.018,[0,.06,0],mats.warm,product);box(.018,.014,.65,[0,.06,0],mats.warm,product);}items.push({object:product,length,offset:i*1.8,zone,time:0});}
      return g;
    }
    box(43,.28,25,[0,-.25,1],mats.floor);
    box(42,.02,3.4,[0,-.09,10],roadMat);
    box(3.4,.02,21,[-18,-.09,0],roadMat);
    box(3.4,.02,21,[18,-.09,0],roadMat);
    box(42,.02,3.4,[0,-.09,-8.5],roadMat);
    for(let x=-20;x<21;x+=2.5){box(1,.02,.055,[x,-.065,10],mats.body);box(1,.02,.055,[x,-.065,-8.5],mats.body);}
    [-18,18].forEach(x=>{for(let z=-8;z<10;z+=2.5)box(.055,.02,1,[x,-.065,z],mats.body);});
    const grid=new THREE.GridHelper(43,60,'#a6bfdc','#c3d6eb');grid.position.y=-.09;scene.add(grid);
    // Perimeter lane markings keep the model readable at television distance.
    [-8,8.8].forEach(z=>box(30,.014,.035,[0,-.09,z],mats.mint));
    const placements=[[-10,0,-3.2],[-4.8,0,-3.2],[2.1,0,-3.2],[9.4,0,-3.2],[-5.6,0,4.5],[7.1,0,4.5]];
    ZONES.forEach((zone,index)=>{
      const group=new THREE.Group();group.position.set(...placements[index]);scene.add(group);
      const w=index===4?12:index===5?9:5,d=5;
      box(w,.16,d,[0,.02,0],mats.dark,group);
      const zoneMat=new THREE.MeshStandardMaterial({color:zone.color,emissive:zone.color,emissiveIntensity:.3});extraMaterials.push(zoneMat);
      box(w-.1,.025,.045,[0,.12,d/2-.15],zoneMat,group);
      let height=3.5;
      if(zone.model==='silo'){
        [-1.2,1.2].forEach(x=>{cyl(.94,3.2,[x,3.4,0],mats.body,group);cyl(.94,.6,[x,5.25,0],mats.metal,group,.05);cyl(.27,1,[x,1.3,0],mats.metal,group,.94);[-.62,.62].forEach(dx=>[-.62,.62].forEach(z=>box(.12,2,.12,[x+dx,1,z],mats.dark,group)));for(let y=2.1;y<4.9;y+=.8){const ring=mesh(new THREE.TorusGeometry(.95,.022,6,32),mats.dark,[x,y,0],group);ring.rotation.x=Math.PI/2;}ladder(x+.95,.2,.1,5.1,group);});height=5.7;
        tube([[-1.2,5.5,0],[-1.2,6,-1.5],[1.2,6,-1.5],[1.2,5.5,0]],.1,mats.mint,group);
      }else if(zone.model==='mill'){
        supports(3,2,1.1,group);box(3.7,.14,2.6,[0,1.2,0],mats.metal,group);box(2.5,1.5,2,[0,2,0],mats.mint,group);
        cyl(1.1,1.3,[0,3.35,0],mats.body,group,1.4);cyl(.4,.4,[0,4.2,0],mats.metal,group);railing(0,1.3,0,3.7,2.6,group);ladder(-1.9,.2,1.1,1.6,group);
        const rotor=cyl(.6,.35,[1.5,2,0],mats.dark,group);rotor.rotation.z=Math.PI/2;rotors.push({object:rotor,axis:'x',zone:zone.id});height=4.8;
      }else if(zone.model==='kiln'){
        const drum=cyl(1.05,5.6,[0,1.9,0],mats.warm,group);drum.rotation.z=Math.PI/2;
        [-1.7,1.7].forEach(x=>{box(.75,1,.95,[x,.62,0],mats.dark,group);const ring=mesh(new THREE.TorusGeometry(1.09,.1,8,32),mats.dark,[x,1.9,0],group);ring.rotation.y=Math.PI/2;});
        for(let i=0;i<7;i++){const fin=box(4.6,.055,.08,[0,0,0],mats.dark,drum);fin.rotation.z=Math.PI/2;fin.position.set(Math.cos(i/7*Math.PI*2)*1.065,0,Math.sin(i/7*Math.PI*2)*1.065);}
        rotors.push({object:drum,axis:'y',zone:zone.id});tube([[2.5,1.9,0],[3,2.5,0],[3,4.8,0]],.35,mats.metal,group);cyl(.48,.1,[3,4.8,0],mats.dark,group);height=4.2;
      }else if(zone.model==='mixer'){
        supports(3.2,2.5,2.4,group);box(3.8,.16,3,[0,2.5,0],mats.metal,group);cyl(1.2,1.5,[0,3.4,0],mats.mint,group);cyl(1.2,.28,[0,4.28,0],mats.body,group,.65);cyl(.28,1,[0,1.6,0],mats.metal,group,1.05);railing(0,2.65,0,3.8,3,group);ladder(-1.95,.2,1.2,3,group);height=5;
        const motor=box(.55,.6,.55,[0,4.7,0],mats.dark,group);rotors.push({object:motor,axis:'y',zone:zone.id});
      }else if(zone.model==='board'){
        conveyor(0,0,11,group,zone.id);box(4.2,2.2,2.15,[-1,2,0],mats.mint,group);box(4.45,.18,2.4,[-1,3.2,0],mats.body,group);
        for(let x=-2.8;x<1;x+=.55)box(.025,1.4,.02,[x,2.1,1.09],mats.dark,group);
        box(1.4,2.6,1.65,[3.8,1.5,0],mats.body,group);box(1.5,.4,1.7,[3.8,2.5,0],mats.dark,group);height=3.7;
      }else{
        conveyor(0,0,8.5,group,zone.id);supports(2.5,2.2,3.5,group);box(2.7,.25,2.4,[-.5,3.5,0],mats.body,group);box(.3,1.3,.3,[-.5,2.8,0],mats.mint,group);box(2.6,2.5,.08,[-.5,2.1,-1],mats.glass,group);
        for(let i=0;i<5;i++)box(1.65,.13,1.1,[3.2,.3+i*.14,1.65],mats.paper,group);height=4.1;
      }
      const lampMat=new THREE.MeshStandardMaterial({color:'#56dcb1',emissive:'#56dcb1',emissiveIntensity:2});extraMaterials.push(lampMat);const lamp=cyl(.1,.3,[w/2-.3,.6,2],lampMat,group);lamps.push({lamp,zone:zone.id});
      const anchor=new THREE.Vector3(placements[index][0],height+.55,placements[index][2]);
      const label=document.createElement('button');label.className='scene-label';label.innerHTML=`<span class="scene-dot"></span><strong>${zone.id}-001</strong><span class="scene-count">+119</span>`;label.setAttribute('aria-label',`${zone.name}: AKB-${zone.id}-001`);label.onclick=()=>onSelect(`AKB-${zone.id}-001`);labels.current.appendChild(label);anchors.push({anchor,label,zone:zone.id});
    });
    tube([[-9.1,4.6,-3],[-7.8,4.6,-3],[-7.2,3.8,-3],[-5,3.8,-3]],.13);
    tube([[-3.8,2,-3],[-2.5,2,-3],[-1.8,1.8,-3],[0,1.8,-3]],.16);
    tube([[4.7,2,-3],[5.8,3,-3],[6,4.3,-3],[9.4,4.3,-3]],.14);
    tube([[9.4,1.1,-3],[11.7,1.1,-3],[11.7,1.1,1.7],[8.5,1.1,1.7],[7.1,2.5,4.5]],.15);
    conveyor(0,4.5,3.8,scene,'GK');
    // Material travels through the same visible route as the manufacturing process.
    function flow(points,zone,speed=.12){
      const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      tube(points,.085,mats.warm);
      const dots=Array.from({length:8},()=>mesh(new THREE.SphereGeometry(.095,8,6),mats.paper,[0,0,0]));
      materialFlows.push({path,dots,zone,speed,time:0});
    }
    flow([[-14.5,.55,-6.5],[-13,1,-5],[-12.5,5,-4],[-11,5.5,-3.2]],'CR');
    flow([[-9,4.9,-3.2],[-7.5,4.9,-3.2],[-7,4.2,-3.2],[-4.8,4.2,-3.2]],'TY');
    flow([[-3.6,2.4,-3.2],[-2.6,2.4,-3.2],[-1,2.1,-3.2],[0,2.1,-3.2]],'BS');
    flow([[4.6,2.3,-3.2],[5.8,3.4,-3.2],[6.8,4.6,-3.2],[9.4,4.6,-3.2]],'GR');
    flow([[9.4,1.1,-3],[8,1.1,.8],[0,1.1,.8],[-8,1.1,.8],[-9,2.2,4.5]],'GK',.07);
    flow([[9.4,1.1,-3],[12,2,-3],[14,2,-2],[14,2.8,0]],'GP');

    // A gypsum bagging branch and visible finished pallets.
    const bagger=new THREE.Group();bagger.position.set(14,0,0);scene.add(bagger);
    supports(2,2,2.6,bagger);cyl(.9,1.3,[0,3.25,0],mats.body,bagger,.9);cyl(.25,.9,[0,2.15,0],mats.mint,bagger,.9);
    conveyor(0,1.2,5.5,bagger,'GP','z','bag');
    function bag(parent,x,y,z){const sack=box(.72,.32,.5,[x,y,z],mats.paper,parent);box(.48,.015,.15,[0,.17,0],mats.mint,sack);return sack;}
    for(let j=0;j<3;j++)for(let k=0;k<3;k++)bag(scene,14+(j%2)*.75,.35+k*.34,5+j*.6);
    function pallet(parent,x,y,z,tiles=true){
      const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
      box(1.6,.14,1.15,[0,.08,0],mats.warm,g);
      if(tiles) for(let i=0;i<7;i++){box(1.5,.065,1.05,[0,.2+i*.075,0],mats.paper,g);box(.07,.015,1.06,[.45,.24+i*.075,0],mats.mint,g);}
      else for(let i=0;i<3;i++)for(let j=0;j<2;j++)bag(g,-.38+j*.76,.3+i*.33,0);
      return g;
    }
    [[14,9],[16,9],[19,6]].forEach(([x,z])=>pallet(scene,x,.05,z));
    [[-15,-4],[-16,-4],[-15,-2.8]].forEach(([x,z],i)=>mesh(new THREE.DodecahedronGeometry(.75+i*.1,0),rawMat,[x,.45,z]));
    // Low retaining walls define the incoming raw-material bay.
    box(4,.7,.16,[-15,.25,-4.6],mats.body);box(.16,.7,4,[-17,.25,-2.6],mats.body);
    box(2.2,.2,1.9,[-14.5,.08,-6.5],mats.dark);
    [-.95,.95].forEach(z=>box(2.2,.5,.08,[-14.5,.4,-6.5+z],mats.mint));

    function wheel(parent,x,z,r=.34){
      const w=cyl(r,.19,[x,r,z],rubber,parent);w.rotation.x=Math.PI/2;
      const hub=cyl(r*.45,.205,[x,r,z],mats.metal,parent);hub.rotation.x=Math.PI/2;
      return w;
    }
    function truck(){
      const g=new THREE.Group();scene.add(g);
      box(3.25,.28,1.4,[0,.7,0],mats.dark,g);
      const wheels=[];[-1.05,1.05].forEach(x=>[-.77,.77].forEach(z=>wheels.push(wheel(g,x,z))));
      box(1.1,1.25,1.4,[1,1.3,0],mats.mint,g);box(1.18,.12,1.5,[1,1.98,0],mats.body,g);
      box(.05,.52,1.12,[1.57,1.6,0],mats.glass,g);[-.71,.71].forEach(z=>box(.8,.48,.025,[1.05,1.65,z],mats.dark,g));
      [-.5,.5].forEach(z=>box(.035,.16,.26,[1.61,.95,z],mats.paper,g));
      const bed=new THREE.Group();bed.position.set(-1.5,.92,0);g.add(bed);
      box(2.05,.13,1.45,[1,0,0],mats.body,bed);[-.73,.73].forEach(z=>box(2.05,.55,.08,[1,.27,z],mats.mint,bed));box(.08,.55,1.5,[2,.27,0],mats.mint,bed);
      const cargo=new THREE.Group();bed.add(cargo);
      for(let i=0;i<15;i++){const rock=mesh(new THREE.DodecahedronGeometry(.19+(i%3)*.03),rawMat,[.15+(i%5)*.35,.23+Math.floor(i/10)*.19,-.43+Math.floor(i/5)%3*.42],cargo);rock.rotation.set(i,i*.3,i*.2);}
      const dust=Array.from({length:9},()=>mesh(new THREE.DodecahedronGeometry(.09),rawMat,[0,0,0]));
      vehicles.push({type:'truck',group:g,wheels,bed,cargo,dust,time:0,zone:'CR'});
    }
    function forklift(tiles,offset){
      const g=new THREE.Group();scene.add(g);box(1.3,.65,1.15,[-.2,.65,0],mats.mint,g);box(.6,.8,1.05,[-.6,1,0],mats.body,g);
      const wheels=[];[-.7,.5].forEach(x=>[-.62,.62].forEach(z=>wheels.push(wheel(g,x,z,.26))));
      [-.5,.5].forEach(z=>{box(.08,1.55,.08,[.5,1.3,z],mats.dark,g);box(.08,1.5,.08,[-.65,1.3,z],mats.dark,g);});box(1.4,.1,1.25,[-.05,2.05,0],mats.body,g);
      [-.38,.38].forEach(z=>{box(.08,2,.1,[.8,1.1,z],mats.dark,g);box(1.1,.08,.12,[1.3,.5,z],mats.dark,g);});
      const cargo=pallet(g,1.3,.5,0,tiles);const route=new THREE.CatmullRomCurve3([[11.7,0,7.4],[13.1,0,10.3],[17,0,10.3],[18.1,0,7.5],[16.2,0,6.5],[13,0,6.7]].map(p=>new THREE.Vector3(...p)),true,'catmullrom',.2);
      vehicles.push({type:'forklift',group:g,wheels,cargo,route,offset,time:0,zone:'GP'});
    }
    truck();forklift(true,0);forklift(false,.5);
    // Two short product labels are part of the schematic, not telemetry.
    [['GIPS',[14,4.25,0]],['POTOLOK',[-5,1.4,7.2]]].forEach(([text,pos])=>{const label=document.createElement('span');label.className='scene-product-label';label.textContent=text;labels.current.appendChild(label);anchors.push({anchor:new THREE.Vector3(...pos),label});});
    let frame,elapsed=0,last=performance.now();const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function resize(){const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.fov=camera.aspect<1?62:34;camera.updateProjectionMatrix();}
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
    function animate(now=performance.now()){frame=requestAnimationFrame(animate);const delta=Math.max(0,Math.min((now-last)/1000,.05));last=now;if(!state.current.paused&&!reduce)elapsed+=delta;
      controls.update();
      const activeZones=new Map(ZONES.map(z=>[z.id,state.current.machines.find(m=>m.id===`AKB-${z.id}-001`)]));
      rotors.forEach(({object,axis,zone})=>{if(activeZones.get(zone)?.status==='running'&&!state.current.paused&&!reduce)object.rotateY(delta*.32);});
      items.forEach(item=>{if(activeZones.get(item.zone)?.status==='running'&&!state.current.paused&&!reduce)item.time+=delta;item.object.position.x=((item.time*.8+item.offset)%item.length)-item.length/2;});
      materialFlows.forEach(f=>{if(activeZones.get(f.zone)?.status==='running'&&!state.current.paused&&!reduce)f.time+=delta;f.dots.forEach((p,i)=>p.position.copy(f.path.getPointAt((f.time*f.speed+i/f.dots.length)%1)));});
      vehicles.forEach(v=>{
        const moving=activeZones.get(v.zone)?.status==='running'&&!state.current.paused&&!reduce;if(moving)v.time+=delta;
        if(v.type==='truck'){
          const t=v.time%24;const x=t<7?-20+7*t/7:t<12?-13:t<19?-13-7*(t-12)/7:-20;
          v.group.position.set(x,0,-6.5);
          v.bed.rotation.z=t<7?0:t<8?(t-7)*.65:t<10?.65:t<12?(12-t)*.325:0;
          v.cargo.scale.y=t<8?1:t<10?Math.max(.01,1-(t-8)/2):t<22?.01:Math.min(1,(t-22)/2);
          v.cargo.visible=t<10||t>22;
          v.dust.forEach((p,i)=>{p.visible=t>=8&&t<10;const phase=(t*2+i/9)%1;p.position.set(-14.6-phase*.3,1.1-phase*.9,-6.5+Math.sin(i*5)*.3);});
        }else{
          const t=(v.time/26+v.offset)%1;v.group.position.copy(v.route.getPointAt(t));const direction=v.route.getTangentAt(t);v.group.rotation.y=-Math.atan2(direction.z,direction.x);v.cargo.visible=t<.58;
        }
        if(moving)v.wheels.forEach(w=>w.rotateY(delta*2));
      });
      lamps.forEach(({lamp,zone})=>{const c=STATUSES[activeZones.get(zone)?.status||'offline'].color;lamp.material.color.set(c);lamp.material.emissive.set(c);});
      const rect=container.getBoundingClientRect();anchors.forEach(({anchor,label,zone})=>{const pos=anchor.clone().project(camera);label.style.transform=`translate(-50%,-100%) translate(${(pos.x*.5+.5)*rect.width}px,${(-pos.y*.5+.5)*rect.height}px)`;if(zone){label.style.setProperty('--status',STATUSES[activeZones.get(zone)?.status||'offline'].color);label.classList.toggle('is-selected',state.current.selected===`AKB-${zone}-001`);}label.style.visibility=pos.z>1?'hidden':'visible';});
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);resizeObserver.disconnect();controls.dispose();renderer.dispose();geometries.forEach(g=>g.dispose());[...Object.values(mats),...extraMaterials].forEach(m=>m.dispose());renderer.domElement.remove();anchors.forEach(({label})=>label.remove());controlsApi.current=null;};
  },[]);
  return <div className="plant-scene" ref={host}><div className="scene-labels" ref={labels}/>{failed&&<div className="scene-fallback"><span>3D görnüş bu brauzerde elýeterli däl.</span><div>{ZONES.map(z=><button key={z.id} onClick={()=>onSelect(`AKB-${z.id}-001`)}>{z.name}<strong>120 enjam</strong></button>)}</div></div>}</div>;
}
