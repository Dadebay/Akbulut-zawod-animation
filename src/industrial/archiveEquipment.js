import * as T from 'three';
import {machinePort} from './equipmentConnections.js';
import {createDrive,PROCESS_PHYSICS as P,rpmToRadians,rollerAngularSpeed} from './processPhysics.js';

// Modelled from the equipment renders in the user's Downloads/archive folder.
// Dimensions are illustrative; every moving assembly stays separate for batching.
export function createArchiveEquipment(k,equipment){
  const {box,cyl,ring,rod,pipe,group,mesh,material,m}=k;
  const {cylinder,flange,hollowHopper,gearmotor,bolt}=equipment;
  const steel=material('#929fa3',.65,.43),panel=material('#c3cbcc',.42,.45);
  const dark=material('#46535a',.62,.47),rubber=m.rubber,yellow=m.yellow;
  const motions=[],clocks=new Map(),drives=new Map();
  const port=(g,name,p,n,r,medium='solid',options={})=>machinePort(k,g,name,p,n,r,medium,options);
  function moving(object,zone,mode='rotate',axis='y',speed=1,amplitude=1,phase=0){
    object.userData.dynamic=true;
    motions.push({object,zone,mode,axis,speed,amplitude,phase,base:object.position[axis],angle:object.rotation[axis]});
    return object;
  }
  function feet(w,d,h,g){
    g=group([0,0,0],g);g.userData.cadRetain=true;
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){
      box(.13,h,.13,[x,h/2,z],dark,g);box(.38,.08,.38,[x,.04,z],steel,g);
    }
    for(const z of [-d/2,d/2])box(w,.16,.14,[0,h-.08,z],dark,g);
    for(const x of [-w/2,w/2])box(.14,.16,d,[x,h-.08,0],dark,g);
  }
  function flangeX(r,x,y,z,g){flange(r,[x,y,z],g,'x',8);}
  function inspection(w,h,x,y,z,g){
    box(w+.08,h+.08,.035,[x,y,z],dark,g);
    box(w,h,.035,[x,y,z+.035],panel,g);
    for(const dx of [-w/2+.08,w/2-.08])for(const dy of [-h/2+.08,h/2-.08])bolt([x+dx,y+dy,z+.06],g,'z',.025);
    rod([x+w*.30,y-.12,z+.10],[x+w*.30,y+.12,z+.10],.025,dark,g);
  }
  function shaft(length,r,y,g,zone){
    const rotor=moving(group([0,y,0],g),zone,'rotate','x',rpmToRadians(P.screwRpm));
    cylinder(.075,length,[0,0,0],steel,rotor,'x');
    // A continuous screw flight remains visible through the open inspection trough.
    const vertices=[],indices=[],steps=Math.ceil(length/.06);
    for(let i=0;i<=steps;i++){
      const x=-length/2+length*i/steps,a=x/.65*Math.PI*2;
      for(const radius of [.075,r])vertices.push(x,Math.cos(a)*radius,Math.sin(a)*radius);
      if(i<steps){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    mesh(geo,material('#88969b',.65,.45,{side:T.DoubleSide}),[0,0,0],rotor);
    return rotor;
  }
  function screw(g,zone,{length=5,closed=false,yellowCover=false}={}){
    feet(length-.5,.85,.9,g);
    if(closed){
      cylinder(.39,length,[0,1.25,0],yellowCover?yellow:steel,g,'x');
      for(const x of [-length/2,0,length/2])flangeX(.46,x,1.25,0,g);
      cyl(.22,.65,[-length*.32,1.85,0],steel,g);flange(.29,[-length*.32,2.18,0],g);
      const coupling=moving(group([length/2+.20,1.25,0],g),zone,'rotate','x',rpmToRadians(P.screwRpm));
      for(let n=0;n<6;n++){const a=n*Math.PI/3;box(.22,.065,.065,[0,Math.sin(a)*.19,Math.cos(a)*.19],dark,coupling);}
    }else{
      box(length,.12,.88,[0,1,0],steel,g);
      for(const z of [-.44,.44])box(length,.43,.07,[0,1.2,z],panel,g);
      shaft(length-.2,.32,1.42,g,zone);
      for(const x of [-length/2,length/2])box(.1,.7,.95,[x,1.3,0],steel,g);
    }
    gearmotor([length/2+1,(closed?1.25:1.42)-.7*.48,0],g,.7);
    port(g,'in',[-length*.32,closed?2.18:1.85,0],[0,1,0],.22);
    port(g,'out',[length*.32,.85,0],[0,-1,0],.22,'solid',{nozzle:.45});
  }
  function valve(g,zone,{gate=false,diverter=false,internal=false}={}){
    if(gate){
      for(const z of [-.46,.46])box(1.1,1.15,.10,[0,.65,z],steel,g);
      for(const y of [.12,1.2])box(1.25,.12,1.1,[0,y,0],panel,g);
      const slide=moving(group([0,.65,0],g),zone,'gate','x',.7,.4);
      box(.85,.84,.08,[0,0,0],dark,slide);rod([0,0,0],[1.1,0,0],.04,steel,slide);
      gearmotor([.95,.25,.2],g,.45);
    }else{
      cylinder(.48,.65,[0,.72,0],steel,g,'z');
      for(const y of [.13,1.35])flange(.42,[0,y,0],g);
      const rotor=moving(group([0,.72,.36],g),zone,'rotate','z',1.4);
      cylinder(.36,.06,[0,0,0],dark,rotor,'z');
      for(let n=0;n<6;n++){const blade=box(.06,.66,.05,[0,0,.05],panel,rotor);blade.rotation.z=n*Math.PI/3;}
      gearmotor([.85,.24,0],g,.55,Math.PI/2);
      if(diverter){for(const side of [-1,1])pipe([[0,.4,0],[side*.35,.22,0],[side*.6,.05,0]],.22,steel,g);}
    }
    port(g,'in',[0,gate?1.2:1.35,0],[0,1,0],.28);
    port(g,'out',[0,.13,0],[0,-1,0],.28);
    if(internal)for(const p of Object.values(g.userData.ports))p.connected=true;
  }
  function fan(g,zone,{blower=false}={}){
    feet(2.4,1.5,.3,g);
    const volute=group([-.4,1.1,0],g);
    const casing=mesh(new T.CylinderGeometry(.85,.85,.65,k.tablet?24:48,1,true),steel,[0,0,0],volute);casing.rotation.x=Math.PI/2;
    cylinder(.85,.06,[0,0,-.325],steel,volute,'z');
    mesh(new T.RingGeometry(.44,.85,k.tablet?24:48),material('#c3cbcc',.42,.45,{side:T.DoubleSide}),[0,0,.35],volute);
    ring(.72,.06,[0,0,.36],panel,volute,'z');
    // The impeller turns behind the inlet face, leaving the attached duct clear.
    const rotor=moving(group([0,0,.17],volute),zone,'rotate','z',4.5);
    for(let n=0;n<9;n++){const a=n*Math.PI*2/9,b=box(.14,.55,.07,[Math.sin(a)*.31,Math.cos(a)*.31,0],panel,rotor);b.rotation.z=-a+.3;}
    cylinder(.13,.14,[0,0,.03],dark,rotor,'z');
    box(.5,.85,.62,[.65,.48,0],steel,volute);flange(.35,[.65,.95,0],volute);
    gearmotor([.75,.36,-.2],g,.9,Math.PI/2);
    if(blower)for(const z of [-.9,.9]){cylinder(.36,2.1,[0,.55,z],panel,g,'x');flangeX(.42,-1.08,.55,z,g);}
    port(g,'in',[-.4,1.1,.48],[0,0,1],.42,'air');
    port(g,'out',[.25,2.05,0],[0,1,0],.35,'air');
  }
  function hopper(g,zone,{width=3,depth=3,height=3.6,grate=false,weigh=false}={}){
    feet(width-.25,depth-.25,height-.45,g);
    hollowHopper(width,depth,.55,.55,height*.40,[0,height*.35,0],g);
    for(const z of [-depth/2,depth/2])box(width,height*.25,.08,[0,height*.875,z],steel,g);
    for(const x of [-width/2,width/2])box(.08,height*.25,depth,[x,height*.875,0],steel,g);
    for(const z of [-depth/2,depth/2])for(const x of [-width*.30,width*.30])box(.06,height*.25,.1,[x,height*.875,z],dark,g);
    if(grate)for(let x=-width/2+.1;x<width/2;x+=.22)box(.045,.06,depth,[x,height,0],dark,g);
    const outlet=group([0,height*.35-.7,0],g);outlet.userData.cadRetain=true;outlet.scale.setScalar(.5);valve(outlet,zone,{internal:true});
    if(weigh)for(const x of [-width/2,width/2])for(const z of [-depth/2,depth/2])box(.34,.2,.28,[x,height*.75,z],m.blue,g);
    port(g,'in',[0,height,0],[0,1,0],.28,'solid',{open:true});
    port(g,'out',[0,height*.35-.635,0],[0,-1,0],.21);
    port(g,'air',[width/2+.3,height*.85,0],[1,0,0],.16,'air',{nozzle:.35});
  }
  function elevator(g,zone,{height=9}={}){
    for(const x of [-.42,.42]){box(.65,height,.62,[x,height/2,0],panel,g);for(let y=.8;y<height;y+=1.1)box(.72,.065,.7,[x,y,0],steel,g);}
    box(1.65,.8,.82,[0,height-.1,0],steel,g);box(1.5,.65,.9,[0,.35,0],steel,g);
    gearmotor([.9,height-.65,0],g,.8,Math.PI/2);
    pipe([[-.42,height-.2,0],[-.42,height+.25,0],[1.2,height-.4,0]],.28,steel,g);
    const wheel=moving(group([0,height-.08,.46],g),zone,'rotate','z',1.8);
    cylinder(.44,.08,[0,0,0],dark,wheel,'z');for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([0,0,.07],[Math.sin(a)*.4,Math.cos(a)*.4,.07],.035,steel,wheel);}
    k.ladder(height,-1,0,g,true);
    port(g,'in',[-1,.45,0],[-1,0,0],.28,'solid',{nozzle:.4});
    port(g,'out',[1.2,height-.4,0],[1,-.4,0],.28);
  }
  function cyclone(g,zone,{height=6}={}){
    feet(1.9,1.9,height*.40,g);
    cyl(.16,height*.35,[0,height*.35,0],steel,g,1.05);
    cyl(1.05,height*.32,[0,height*.685,0],panel,g);
    for(const y of [height*.525,height*.845])flange(1.10,[0,y,0],g);
    cyl(.34,.7,[0,height*.9,0],steel,g);flange(.41,[0,height*.96,0],g);
    cylinder(.35,1.1,[.85,height*.73,0],steel,g,'x');flangeX(.42,1.42,height*.73,0,g);
    const v=group([0,.25,0],g);v.userData.cadRetain=true;v.scale.setScalar(.6);valve(v,zone,{internal:true});
    // The cone is joined to its rotary discharge, not suspended over it.
    cyl(.16,Math.max(.05,height*.175-1.06),[0,(height*.175+1.06)/2,0],steel,g);
    port(g,'in',[1.42,height*.73,0],[1,0,0],.35,'air');
    port(g,'air',[0,height*.9+.35,0],[0,1,0],.34,'air');
    port(g,'out',[0,.328,0],[0,-1,0],.22);
  }
  function filter(g,zone,{height=5.8,round=false,industrial=false}={}){
    if(round){
      cyl(.78,height*.64,[0,height*.42,0],panel,g);cyl(.82,.18,[0,height*.78,0],steel,g,.42);
      for(const y of [height*.12,height*.70])ring(.80,.045,[0,y,0],dark,g);
      const f=group([0,height*.8,0],g);f.scale.setScalar(.45);fan(f,zone);
      return;
    }
    feet(2.9,1.8,1.8,g);hollowHopper(3.1,2,.5,.5,1,[0,.8,0],g);
    box(3.1,height-1.9,1.9,[0,(height+1.9)/2,0],industrial?material('#b6bf9f',.3,.65):panel,g);
    if(industrial){
      for(const x of [-1.4,-.7,0,.7,1.4])for(const z of [-.98,.98]){
        box(.055,height-1.9,.055,[x,(height+1.9)/2,z],dark,g);
        rod([x,1.8,z],[x*.16,.8,z*.25],.05,yellow,g);
      }
      for(let y=2;y<height;y+=1)for(const z of [-.99,.99])box(3.1,.055,.055,[0,y,z],dark,g);
    }
    inspection(2.55,height-2.4,0,(height+1.9)/2,1,g);
    for(let x=-1.15;x<1.3;x+=.46){
      cyl(.16,.6,[x,height+.15,0],steel,g);pipe([[x,height+.45,0],[x,height+.45,.7],[x,height-.05,.7]],.06,dark,g);
    }
    cylinder(.16,3.15,[0,height+.45,.7],steel,g,'x');
    const shaker=moving(group([0,height+.05,-.7],g),zone,'vibrate','y',15,.025);
    box(2.4,.15,.25,[0,0,0],steel,shaker);
    const outlet=group([0,.05,0],g);outlet.userData.cadRetain=true;outlet.scale.setScalar(.5);valve(outlet,zone,{internal:true});
    cylinder(.32,.85,[1.85,2.6,0],steel,g,'x');
    port(g,'in',[2.275,2.6,0],[1,0,0],.32,'air');
    port(g,'air',[0,height-.5,-1.4],[0,0,-1],.32,'air',{nozzle:.5});
    port(g,'out',[0,.115,0],[0,-1,0],.18);
  }
  function screen(g,zone,{round=false,length=4}={}){
    feet(round?2.7:length-.3,2.3,.8,g);
    for(const x of [-1.1,1.1])for(const z of [-.9,.9])for(let y=.72;y<1.1;y+=.07)ring(.12,.022,[x,y,z],dark,g);
    const deck=moving(group([0,1.05,0],g),zone,'vibrate','y',23,.045);
    if(round){
      for(let i=0;i<3;i++){
        cyl(1.3,.42,[0,.3+i*.48,0],panel,deck);ring(1.32,.055,[0,.52+i*.48,0],steel,deck);
        cylinder(.18,.6,[1.45,.27+i*.48,0],steel,deck,'x');
      }
      cyl(.3,.35,[0,1.8,0],steel,deck);gearmotor([.7,.2,-1.45],g,.65);
    }else{
      for(const z of [-1.1,1.1])box(length,1,.12,[0,.55,z],steel,deck);
      for(const x of [-length/2,length/2])box(.12,1,2.2,[x,.55,0],panel,deck);
      for(const y of [.1,.47,.84]){box(length,.04,2.1,[0,y,0],dark,deck);for(let x=-length/2+.1;x<length/2;x+=.25)box(.025,.025,2.1,[x,y+.025,0],steel,deck);}
      gearmotor([.35,.1,1.35],deck,.75,Math.PI/2);
    }
    if(round){
      cyl(.3,.25,[0,3.075,0],rubber,g);
      for(const y of [2.98,3.05,3.12,3.19])ring(.31,.028,[0,y,0],steel,g);
      cylinder(.19,.3,[1.8,1.32,0],rubber,g,'x');
      for(const x of [1.68,1.76,1.84,1.92])ring(.20,.025,[x,1.32,0],steel,g,'x');
    }
    port(g,'in',[0,round?3.2:2.15,0],[0,1,0],.3,'solid',{open:true});
    port(g,'out',round?[1.95,1.32,0]:[length/2+.3,1.2,0],[1,0,0],.18,'solid',{nozzle:round?0:.35});
  }
  function mixer(g,zone,{pan=false,wet=false}={}){
    if(pan){
      feet(2.6,2.6,1.1,g);
      const shell=new T.CylinderGeometry(1.5,1.5,1.2,k.tablet?24:48,1,true);
      mesh(shell,material('#9aa8ac',.6,.46,{side:T.DoubleSide}),[0,1.7,0],g);
      cyl(1.48,.10,[0,1.12,0],steel,g);ring(1.51,.06,[0,2.3,0],steel,g);
      const rotor=moving(group([0,1.48,0],g),zone,'rotate','y',1.1);
      cyl(.12,.85,[0,.2,0],steel,rotor);
      for(let n=0;n<4;n++){const a=n*Math.PI/2;rod([0,.25,0],[Math.cos(a)*1.22,0,Math.sin(a)*1.22],.07,steel,rotor);const p=box(.32,.35,.48,[Math.cos(a)*1.22,0,Math.sin(a)*1.22],dark,rotor);p.rotation.y=-a;}
      gearmotor([1.7,.6,0],g,.8);cylinder(.25,.65,[1.825,1.4,0],steel,g,'x');
    }else{
      feet(3.8,2.0,.8,g);box(3.7,.13,1.8,[0,1.0,0],steel,g);
      for(const z of [-.9,.9])box(3.8,1.7,.10,[0,1.8,z],panel,g);
      for(const x of [-1.9,1.9])box(.12,1.7,1.9,[x,1.8,0],steel,g);
      const rotor=moving(group([0,1.76,0],g),zone,'rotate','x',1.4);
      cylinder(.09,3.9,[0,0,0],steel,rotor,'x');
      for(let x=-1.6,i=0;x<1.8;x+=.45,i++){const a=i*.9;rod([x,0,0],[x,Math.cos(a)*.55,Math.sin(a)*.55],.06,steel,rotor);const paddle=box(.32,.15,.42,[x,Math.cos(a)*.55,Math.sin(a)*.55],dark,rotor);paddle.rotation.x=a;}
      gearmotor([2.75,1.76-.9*.48,0],g,.9);flange(.3,[0,.75,0],g);
    }
    port(g,'in',[0,pan?2.3:2.65,0],[0,1,0],.28,'solid',{open:true});
    port(g,'out',pan?[2.15,1.4,0]:[0,.75,0],pan?[1,0,0]:[0,-1,0],.25,wet?'slurry':'solid');
    if(wet){cyl(1.42,.08,[0,1.6,0],material('#c8bea9',.05,.45),g);}
    if(wet)port(g,'water',[0,2.6,-1.3],[0,1,0],.1,'water',{nozzle:.4});
  }
  function vessel(g,zone,{horizontal=false,height=5}={}){
    if(horizontal){
      feet(3.5,1.8,.65,g);cylinder(.95,4,[0,1.65,0],steel,g,'x');
      for(const x of [-2,2]){flangeX(1.02,x,1.65,0,g);cylinder(.75,.2,[x,1.65,0],panel,g,'x');}
      for(const x of [-1,1]){cyl(.2,.55,[x,2.75,0],steel,g);flange(.28,[x,3.03,0],g);}
    }else{
      feet(1.6,1.6,.9,g);cyl(.9,height-1.4,[0,(height+.4)/2,0],panel,g);
      cyl(.9,.3,[0,height-.15,0],steel,g,.45);ring(.92,.04,[0,.9,0],steel,g);
      for(const y of [1.5,2.6]){cylinder(.2,.6,[.95,y,0],steel,g,'x');flangeX(.27,1.3,y,0,g);}
      cyl(.15,.45,[0,height+.15,0],dark,g);
      const wheel=moving(group([0,height+.37,0],g),zone,'stroke','y',.3,.08);ring(.22,.035,[0,0,0],m.red,wheel);
    }
    inspection(.6,.65,0,horizontal?1.7:2.4,horizontal?.96:.91,g);
    if(horizontal){
      port(g,'out',[-2.35,1.65,0],[-1,0,0],.12,'water',{nozzle:.5});
      port(g,'fill',[-1,3.03,0],[0,1,0],.2,'water');
    }else{
      port(g,'in',[1.3,1.5,0],[1,0,0],.2,'air');
      port(g,'out',[1.3,2.6,0],[1,0,0],.2,'air');
    }
  }
  function mill(g,zone,{vertical=false}={}){
    feet(3,2.4,.5,g);
    if(vertical){
      cyl(.35,1.4,[0,1.1,0],steel,g,1.12);cyl(1.12,1.8,[0,2.7,0],panel,g);
      for(const y of [1.8,3.6])flange(1.18,[0,y,0],g);
      gearmotor([.25,3.65,0],g,.85);cylinder(.35,.8,[1.25,3,0],steel,g,'x');
      const shaftHead=moving(group([0,3.9,.6],g),zone,'rotate','y',2);box(.5,.14,.14,[0,0,0],dark,shaftHead);
    }else{
      box(2.5,2.1,2.1,[0,1.6,0],steel,g);hollowHopper(2.1,1.9,1.3,1.1,.75,[0,2.65,0],g);
      for(const z of [-1.25,1.25]){
        const face=Math.sign(z);
        const wheel=moving(group([0,1.65,z],g),zone,'rotate','z',1.6);
        cylinder(.88,.14,[0,0,0],dark,wheel,'z');ring(.74,.07,[0,0,face*.1],steel,wheel,'z');
        for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([0,0,face*.12],[Math.sin(a)*.7,Math.cos(a)*.7,face*.12],.06,steel,wheel);}
      }
      gearmotor([1.8,.45,0],g,1.05);
      inspection(1.5,1.3,0,1.7,1.07,g);
    }
    port(g,'in',vertical?[-1.35,2.9,0]:[0,3.4,0],vertical?[-1,0,0]:[0,1,0],.28,'solid',{nozzle:vertical?.4:0,open:!vertical});
    port(g,'out',[0,.55,-1.55],[0,0,-1],.25,'solid',{nozzle:.7});
    if(vertical)port(g,'air',[1.65,3,0],[1,0,0],.35,'air');
  }
  function drum(g,zone,{length=8}={}){
    feet(length-1.5,2.4,.65,g);
    const body=moving(group([0,1.8,0],g),zone,'rotate','x',.22);
    cylinder(1.12,length,[0,0,0],steel,body,'x');
    for(const x of [-length*.3,0,length*.3])ring(1.17,.10,[x,0,0],dark,body,'x');
    for(let a=0;a<Math.PI*2;a+=Math.PI/3)rod([-length/2,Math.sin(a)*1.125,Math.cos(a)*1.125],[length/2,Math.sin(a)*1.125,Math.cos(a)*1.125],.014,dark,body);
    // Stationary seals and radial outlets sit beyond the rotating shell ends.
    for(const side of [-1,1]){flangeX(1.18,side*(length/2+.16),1.8,0,g);cylinder(.55,.35,[side*(length/2+.25),1.8,0],dark,g,'x');}
    pipe([[length/2+.45,2.1,0],[length/2+.45,3.5,0],[length/2+.6,3.7,0]],.3,steel,g);
    gearmotor([0,.3,-1.4],g,.9);
    port(g,'in',[-length/2-.425,1.8,0],[-1,0,0],.4);
    port(g,'out',[length/2+.45,.65,0],[0,-1,0],.3,'solid',{nozzle:.8});
    port(g,'air',[length/2+.6,3.7,0],[1,0,0],.3,'air');
  }
  function belt(g,zone,{length=5,width=1.2,height=1.2}={}){
    feet(length-.5,width,height-.2,g);
    box(length,.08,width,[0,height,0],rubber,g);
    for(const z of [-width/2-.06,width/2+.06])box(length,.24,.12,[0,height-.10,z],steel,g);
    for(const x of [-length/2+.2,length/2-.2]){
      const roller=moving(group([x,height-.2,0],g),zone,'rotate','z',-rollerAngularSpeed(.65,.16));
      cylinder(.16,width-.16,[0,0,0],dark,roller,'z');box(.2,.05,.012,[0,0,(width-.16)/2+.007],panel,roller);
    }
    for(let x=-length/2+.4;x<length/2;x+=.7){
      const slat=moving(group([x,height+.05,0],g),zone,'belt','x',.65,length-.7);
      box(.035,.016,width-.12,[0,0,0],panel,slat);
    }
    gearmotor([length/2-.4,.3,width/2+.5],g,.65,Math.PI/2);
  }
  function bagStation(g,zone,{bulk=false,rotary=false}={}){
    if(rotary){
      feet(4,4,3.3,g);cyl(.7,1.4,[0,3.7,0],panel,g);cyl(.18,.8,[0,2.7,0],steel,g,.7);
      const carousel=moving(group([0,2.1,0],g),zone,'rotate','y',.25);
      for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*1.45,z=Math.sin(a)*1.45;rod([0,.4,0],[x,.1,z],.10,dark,carousel);box(.55,.85,.30,[x,-.45,z],m.paper,carousel,.06);}
      gearmotor([.6,4.1,0],g,.65);k.railing(4.4,4.4,3.5,g);
    }else{
      feet(3,2.4,4.2,g);box(3.2,.25,2.6,[0,4.2,0],steel,g);
      cyl(.48,.8,[0,3.7,0],panel,g,.8);cyl(.17,.8,[0,3,0],steel,g);
      const bag=moving(group([0,1.3,0],g),zone,'fill','y',.45,1);
      box(bulk?1.65:.75,bulk?1.9:1.05,bulk?1.6:.55,[0,0,0],m.paper,bag,.13);
      for(const x of [-.8,.8])for(const z of [-.7,.7])rod([x,2.15,z],[x,3.15,z],.025,panel,g);
      box(2.3,.15,2,[0,.25,0],dark,g);k.cabinet([1.7,0,0],g);
    }
    port(g,'in',[0,rotary?4.4:4.2,0],[0,1,0],.28,'solid',{open:true});
  }
  function table(g,zone,{kind='cut',length=4,width=2.8,withBed=true,synchronized=false}={}){
    feet(length-.4,width-.2,1.05,g);
    if(withBed)for(let x=-length/2+.15;x<length/2;x+=.28)cylinder(.065,width,[x,1.1,0],steel,g,'z');
    for(const z of [-width/2,width/2])box(length,.22,.14,[0,1,z],dark,g);
    if(kind==='lift'){
      const top=moving(group([0,1.25,0],g),zone,'stroke','y',.65,.28);
      box(length,.10,width,[0,0,0],panel,top);
      for(const z of [-width*.35,width*.35])for(const side of [-1,1])rod([-length*.35,.35,z],[length*.35*side,1.1,z],.055,dark,g);
    }else{
      for(const z of [-width/2,width/2])box(.2,2.9,.2,[0,1.45,z],steel,g);
      box(.45,.25,width+.25,[0,2.9,0],steel,g);
      const tool=group([0,1.9,0],g,true);
      if(!synchronized)moving(tool,zone,'stroke','y',kind==='press'?1.4:1,.5);
      g.userData.processTool={object:tool,kind,base:1.9,travel:kind==='press'?.42:.595};
      box(kind==='press'?1.2:.12,.25,width-.2,[0,0,0],dark,tool);
      if(kind==='press')for(const x of [-.51,-.33,-.15,.15,.33,.51])for(const z of [-.51,-.33,-.15,.15,.33,.51])cyl(.015,.2,[x,-.2,z],steel,tool,undefined,6);
      if(kind==='cut'&&synchronized){
        const slitter=moving(group([-1.2,1.48,0],g),zone,'rotate','z',2.2);
        cylinder(.32,.018,[0,0,0],steel,slitter,'z');
        rod([-1.2,1.48,-width/2],[-1.2,1.48,width/2],.045,dark,g);
      }
      for(const z of [-width*.35,width*.35]){cyl(.07,.8,[0,2.65,z],dark,g);cyl(.035,.6,[0,2.1,z],steel,g);}
    }
    gearmotor([length*.32,.3,width/2+.35],g,.65);
  }
  function tunnel(g,zone,{length=5,width=3,withBelt=true}={}){
    if(withBelt)belt(g,zone,{length:length+2,width:width-.4});
    for(const z of [-width/2,width/2]){box(length,1.8,.12,[0,2.15,z],panel,g);inspection(length-.35,1.25,0,2.15,z+.07,g);}
    box(length,.16,width,[0,3.12,0],steel,g);cyl(.3,.5,[0,3.45,0],steel,g);
    for(const x of [-length/2,length/2])for(let z=-width/2+.15;z<width/2;z+=.25)box(.04,.45,.2,[x,2.8,z],rubber,g);
  }
  function compressor(g,zone){
    box(2.6,2.1,1.6,[0,1.1,0],panel,g);inspection(1.05,1.85,.65,1.1,.83,g);
    for(let y=.4;y<1.7;y+=.12)box(1,.04,.04,[-.65,y,.83],dark,g);
    const vent=moving(group([-.7,1.65,.9],g),zone,'rotate','z',4);
    for(let a=0;a<Math.PI*2;a+=Math.PI/2){const b=box(.12,.55,.035,[Math.sin(a)*.13,Math.cos(a)*.13,0],steel,vent);b.rotation.z=-a;}
    port(g,'out',[1.2,.65,0],[1,0,0],.1,'air',{nozzle:.35});
  }
  function damper(g,zone){
    for(const x of [-.7,.7])box(.12,1.7,.45,[x,.85,0],steel,g);
    for(const y of [.06,1.64])box(1.5,.12,.45,[0,y,0],steel,g);
    for(let y=.25;y<1.6;y+=.25){const vane=moving(group([0,y,0],g),zone,'damper','x',.45,.6);box(1.25,.24,.035,[0,0,0],panel,vane);}
    gearmotor([1,.55,0],g,.45);
    port(g,'in',[0,.85,.3],[0,0,1],.35,'air',{nozzle:.35});
    port(g,'out',[0,.85,-.3],[0,0,-1],.35,'air',{nozzle:.35});
  }
  function palletizer(g,zone,{inline=false}={}){
    feet(3.5,3.5,5.2,g);box(3.8,.3,3.8,[0,5.15,0],steel,g);
    const head=group([0,2.9,0],g,true);
    if(inline)g.userData.processTool={object:head,base:2.9,travel:1.46};else moving(head,zone,'stroke','y',.65,1.4);
    for(const z of [-1.2,1.2])box(2.9,.15,.15,[0,0,z],dark,head);
    for(const x of [-1,0,1]){box(.15,.15,2.6,[x,0,0],steel,head);for(const z of [-.9,.9])cyl(.13,.12,[x,-.22,z],rubber,head);}
    for(const z of [-1.55,1.55])rod([0,1,z],[0,4.9,z],.055,steel,g);
    if(!inline)for(let y=.3;y<1.2;y+=.12)box(2.4,.085,1.2,[0,y,0],m.paper,g);
    gearmotor([.3,5.25,0],g,.8);equipment.fence(4.5,2,[0,0,-2.3],g);
  }
  function pump(g,zone){
    feet(2.5,1.3,.25,g);cylinder(.48,1.2,[-.45,.8,0],steel,g,'x');
    flangeX(.53,-1.1,.8,0,g);flangeX(.53,.18,.8,0,g);
    for(const x of [-.75,-.15]){cyl(.18,.5,[x,1.45,0],steel,g);flange(.25,[x,1.72,0],g);}
    gearmotor([.85,.28,0],g,.65,Math.PI);
    const coupling=moving(group([.3,.8,0],g),zone,'rotate','x',4);
    for(let n=0;n<4;n++){const a=n*Math.PI/2;box(.16,.10,.10,[0,Math.sin(a)*.16,Math.cos(a)*.16],dark,coupling);}
    port(g,'in',[-1.1,.8,0],[-1,0,0],.18,'water');
    port(g,'out',[-.15,1.72,0],[0,1,0],.18,'water');
  }
  function burner(g,zone){
    feet(3.4,1.3,.65,g);cylinder(.5,3,[0,1.2,0],steel,g,'x');
    for(const x of [-1.5,-.6,1.5])flangeX(.58,x,1.2,0,g);
    cylinder(.33,.75,[1.7,1.2,0],dark,g,'x');gearmotor([-1.85,.65,0],g,.8);
    const flame=material('#dd923d',.05,.45,{emissive:'#ff7327',emissiveIntensity:.7});
    const tip=moving(group([2,1.2,0],g),zone,'flame','y',4);
    cylinder(.28,.08,[0,0,0],flame,tip,'x');
    for(const x of [-1.2,-.3,.6]){pipe([[x,.5,1],[x,.8,1],[x,1.2,.3]],.06,steel,g);ring(.14,.025,[x,.85,1],m.red,g);}
    rod([-1.5,.5,1],[1,.5,1],.09,steel,g);
    port(g,'out',[2.075,1.2,0],[1,0,0],.33,'heat');
  }
  function bagDump(g,zone){
    feet(2.4,1.9,1.1,g);hollowHopper(2.7,2.1,.45,.45,.85,[0,.75,0],g);
    for(const z of [-1,1])box(2.7,.5,.09,[0,1.85,z],panel,g);
    for(let x=-1.2;x<1.3;x+=.18)box(.035,.045,1.9,[x,1.7,0],dark,g);
    box(2.7,.45,.12,[0,1.9,-1],steel,g);
    const lid=group([0,2.05,-1],g);lid.rotation.x=-1.12;box(2.7,.08,2.1,[0,0,1.05],panel,lid);
    for(const x of [-1.2,1.2])rod([x,1.7,-.6],[x,3,-.5],.035,steel,g);
    gearmotor([1.6,.6,0],g,.6,Math.PI/2);
    const tray=moving(group([0,1.68,0],g),zone,'vibrate','y',17,.018);box(2.2,.03,1.5,[0,0,0],steel,tray);
    port(g,'out',[0,.75,0],[0,-1,0],.22);
  }
  function telescopic(g,zone){
    cyl(.52,.45,[0,1.5,0],steel,g);flange(.6,[0,1.73,0],g);
    for(const x of [-.55,.55])gearmotor([x,1.55,0],g,.35,Math.PI/2);
    const sleeve=moving(group([0,.7,0],g),zone,'stroke','y',.55,.18);
    cyl(.38,1.1,[0,0,0],panel,sleeve,.45);
    for(let y=-.5;y<.6;y+=.13)ring(.42-y*.06,.035,[0,y,0],dark,sleeve);
    for(const x of [-.48,.48])rod([x,1.5,0],[x,.15,0],.018,steel,g);
  }
  function magneticTrap(g,zone){
    box(1.6,2.4,1,[0,1.3,0],panel,g);
    for(const y of [.1,2.5])box(1.85,.12,1.2,[0,y,0],steel,g);
    box(1.3,1.6,.025,[0,1.3,.52],dark,g);
    for(let y=.65;y<2;y+=.22)rod([-.55,y,.56],[.55,y,.56],.04,steel,g);
    const door=group([-.78,1.3,.56],g);door.rotation.y=-1.15;box(1.5,1.9,.07,[.75,0,0],panel,door);
    gearmotor([1,1,0],g,.45);
    const indicator=moving(group([.6,2,.6],g),zone,'swing','z',.7,.3);box(.1,.3,.04,[0,0,0],m.red,indicator);
  }
  function diverter(g,zone){
    hollowHopper(1.7,1.4,1.1,.8,1.6,[0,.7,0],g);
    box(1.7,.13,1.5,[0,2.3,0],steel,g);
    for(const side of [-1,1]){
      const outlet=group([side*.5,.5,0],g);outlet.rotation.z=side*.35;
      box(.8,1,1,[0,0,0],panel,outlet);box(1,.12,1.2,[0,-.5,0],steel,outlet);
    }
    port(g,'in',[0,2.3,0],[0,1,0],.3);
    for(const side of [-1,1])port(g,side<0?'dry':'board',[side*(.5+Math.sin(.35)*.5),.5-Math.cos(.35)*.5,0],[side*Math.sin(.35),-Math.cos(.35),0],.28);
    const selector=moving(group([0,1.2,.65],g),zone,'damper','z',.6,.38);
    rod([0,0,0],[.5,.4,0],.06,dark,selector);gearmotor([.8,.9,.6],g,.5);
  }
  function butterfly(g,zone){
    cylinder(.6,1.3,[0,.8,0],steel,g,'x');for(const x of [-.68,.68])flangeX(.71,x,.8,0,g);
    const disc=moving(group([0,.8,0],g),zone,'damper','y',.4,Math.PI/2);
    cylinder(.56,.04,[0,0,0],dark,disc,'x');rod([0,.1,0],[0,1.7,0],.06,steel,g);
    box(.65,.3,.4,[0,1.75,0],panel,g);box(.12,.12,.12,[.28,2,0],m.red,g);
    port(g,'in',[.68,.8,0],[1,0,0],.6,'air');
    port(g,'out',[-.68,.8,0],[-1,0,0],.6,'air');
  }
  const builders={screw,valve,fan,hopper,elevator,cyclone,filter,screen,mixer,vessel,mill,drum,belt,bagStation,table,tunnel,compressor,damper,palletizer,pump,burner,bagDump,telescopic,magneticTrap,diverter,butterfly};
  return {builders,materials:{steel,panel,dark},moving,update(dt,isRunning){
    for(const zone of ['CR','TY','BS','GR','GK','GP']){
      if(!drives.has(zone))drives.set(zone,createDrive(.6));
      const drive=drives.get(zone);drive.update(dt,isRunning(zone)?1:0);clocks.set(zone,drive.position);
    }
    for(const r of motions){
      const t=(clocks.get(r.zone)||0)*r.speed+r.phase;
      if(r.mode==='rotate')r.object.rotation[r.axis]=r.angle+t;
      else if(r.mode==='swing')r.object.rotation[r.axis]=r.angle+Math.sin(t)*r.amplitude;
      else if(r.mode==='fill')r.object.scale.y=.2+.8*Math.min(1,t/4);
      else if(r.mode==='flame'){r.object.visible=isRunning(r.zone);r.object.scale.y=.92+.08*Math.sin(t);}
      else if(r.mode==='gate'||r.mode==='damper'){
        const target=(r.mode==='gate'?r.base:r.angle)+(isRunning(r.zone)?r.amplitude:0);
        const vector=r.mode==='gate'?r.object.position:r.object.rotation;
        const delta=target-vector[r.axis];vector[r.axis]+=Math.sign(delta)*Math.min(Math.abs(delta),dt*r.speed);
      }
      else if(r.mode==='vibrate')r.object.position[r.axis]=r.base+Math.sin((clocks.get(r.zone)||0)*Math.PI*24+r.phase)*.0015*drives.get(r.zone).speed;
      else if(r.mode==='belt')r.object.position[r.axis]=((r.base+t+r.amplitude/2)%r.amplitude+r.amplitude)%r.amplitude-r.amplitude/2;
      else r.object.position[r.axis]=r.base+Math.sin(t)*r.amplitude;
    }
  }};
}
