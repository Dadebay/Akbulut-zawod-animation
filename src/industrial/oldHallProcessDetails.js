import * as T from 'three';
import {roundedConnection} from './equipmentConnections.js';

// Illustrative additions to the two existing panel lines. The conveyors keep
// their original timing and sheet envelope; all utilities fit the north bay.
export function buildOldHallProcessDetails(k,{parent,equipment,models,line,secondLine}){
  const {box,cyl,rod,ring,group,mesh,textPlate,m}=k;
  const {cylinder,gearmotor,gauge,flange,panel,handle}=equipment;
  const pale=equipment.enamel,steel=equipment.zinc,dark=equipment.cast,blue=equipment.blue;
  const root=group([0,0,0],parent);root.name='old-hall-process-details';
  const machines=[],stations=[],rotors=[],pipes=[];
  function unit(name,pos){
    const g=group(pos,root);g.name=`old-process-${name}`;machines.push(g);return g;
  }
  function rotate(g,axis,speed){models.moving(g,'GK','rotate',axis,speed);rotors.push(g);return g;}
  function pipe(points,r=.07,mat=steel){
    const path=roundedConnection(points.map(p=>new T.Vector3(...p)),.18);
    const tube=group([0,0,0],root);tube.name='old-process-service-pipe';
    // Separate bends from straight runs so an overhead service does not gain
    // a floor-height collision box spanning the aisle beneath it.
    for(const curve of path.curves)
      mesh(new T.TubeGeometry(curve,curve.isLineCurve3?1:8,r,8,false),mat,[0,0,0],tube);
    pipes.push(tube);return tube;
  }
  function feet(g,w,d,h){
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){
      box(.13,h,.13,[x,h/2,z],dark,g);
      box(.32,.08,.32,[x,.04,z],steel,g);
    }
  }
  function tag(g,label,w,y,z){textPlate(label,w,.23,[0,y,z],g,'#304551','#e9c842');}
  function control(g,w){
    const c=group([w/2+.14,0,1.92],g);
    box(.34,.08,.38,[0,.04,0],steel,c);box(.09,1.38,.09,[0,.73,0],dark,c);
    const head=group([0,1.55,0],c);head.rotation.x=-.15;
    box(.65,.48,.20,[0,0,0],pale,head,.025);
    box(.46,.27,.018,[-.04,.04,.11],m.black,head);
    box(.38,.19,.01,[-.04,.04,.123],m.blueLight,head);
    for(let i=0;i<3;i++)box(.22-i*.045,.012,.008,[-.075,.09-i*.05,.132],pale,head);
    for(const x of [-.22,0,.22])cylinder(.027,.02,[x,-.16,.12],x===.22?m.red:blue,head,'z',undefined,10);
    box(.19,.10,.15,[.13,.25,0],m.yellow,head);
    k.pipe([[0,1.35,-.08],[0,.23,-.08],[-.25,.23,-.3],[-.25,.5,-.55]],.025,m.black,c);
  }
  function station(name,x,line,w,label){
    const g=unit(name,[x,0,line.z]);
    stations.push({root:g,x,z:line.z,width:w,top:line.top,kind:name});
    feet(g,w-.15,3.12,1.1);
    for(const z of [-1.56,1.56]){
      box(w,.16,.14,[0,1.05,z],dark,g);
      box(w,.12,.08,[0,1.92,z],m.yellow,g);
    }
    control(g,w);tag(g,label,Math.max(1.2,w),2.55,1.66);
    return g;
  }
  function brush(name,x,line,w){
    const g=station(name,x,line,w,'ÇOTGA · ARASSALAMA');
    for(const xx of [-w*.25,w*.25]){
      const roller=rotate(group([xx,line.top+.34,0],g),'z',-2.2);
      cylinder(.26,2.75,[0,0,0],dark,roller,'z');
      for(let n=0;n<12;n++){
        const a=n*Math.PI/6;
        box(.045,.035,2.72,[Math.sin(a)*.265,Math.cos(a)*.265,0],steel,roller);
      }
      cylinder(.07,3.35,[xx,line.top+.34,0],steel,g,'z');
      gearmotor([xx,line.top+.07,1.85],g,.40,-Math.PI/2);
    }
    for(const z of [-1.44,1.44]){
      box(w,.55,.055,[0,2.12,z],pale,g);
      for(const xx of [-w*.35,w*.35])rod([xx,1.1,z],[xx,2.35,z],.035,steel,g);
    }
    box(w,.09,2.95,[0,2.44,0],pale,g);
    cyl(.15,.28,[0,2.62,0],steel,g);flange(.21,[0,2.78,0],g);
    pipe([[x,2.78,line.z],[x,4.32,line.z],[x,4.32,-105.8],[Math.max(9,x),4.65,-105.8]],.15);
  }
  function edger(name,x,line,w){
    const g=station(name,x,line,w,'GYRA TIMARLAMA');
    for(const z of [-.91,.91])for(const xx of [-w*.28,w*.28]){
      const head=rotate(group([xx,line.top+.13,z],g),'y',3);
      cyl(.19,.20,[0,0,0],dark,head);box(.08,.025,.30,[0,.115,0],steel,head);
      cyl(.07,.45,[xx,line.top+.35,z],steel,g);
      gearmotor([xx,line.top+.53,z],g,.30,Math.PI/2);
    }
    for(const z of [-1.35,1.35]){
      box(w,.70,.10,[0,1.65,z],pale,g);
      panel(w*.65,.38,[0,1.7,z+.06],g);handle([w*.2,1.7,z+.11],g);
    }
    box(.18,.11,2.85,[0,2.26,0],m.yellow,g);
    for(const z of [-.95,.95]){
      pipe([[x,1.8,line.z+z],[x,2.9,line.z+z],[x,2.9,line.z],[x,4.65,line.z],[x,4.65,-105.8]],.09);
    }
  }
  function inspect(name,x,line,w){
    const g=station(name,x,line,w,'ÖLÇEG · HIL');
    for(const z of [-1.48,1.48])box(.16,2.75,.16,[0,1.375,z],pale,g);
    box(.24,.22,3.2,[0,2.78,0],blue,g);
    for(const z of [-.95,0,.95]){
      box(.24,.27,.32,[0,2.54,z],dark,g);
      cylinder(.07,.11,[0,2.35,z],m.black,g);
      ring(.075,.015,[0,2.29,z],steel,g);
    }
    for(const x of [-.25,.25])box(.07,.045,2.5,[x,2.17,0],m.light,g);
    for(const z of [-1.43,1.43]){
      box(.08,.44,.08,[0,1.53,z],dark,g);
      cyl(.035,.07,[0,1.77,z],m.red,g);
    }
  }
  brush('line-1-brushing',13.8,line,2.7);
  inspect('line-1-measurement',23.4,line,1.1);
  edger('line-1-edge-trimmer',32.3,line,2.1);
  const cooling=station('line-1-cooling',58.2,line,3.3,'SOWATMA');
  for(const z of [-1.5,1.5]){
    box(3.3,.65,.10,[0,2.10,z],pale,cooling);
    for(let x=-1.4;x<1.5;x+=.25)box(.045,.55,.055,[x,2.1,z+.07],steel,cooling);
  }
  box(3.3,.12,3.1,[0,2.51,0],pale,cooling);
  for(const x of [-.86,.86]){
    cyl(.59,.18,[x,2.65,0],dark,cooling);
    const fan=rotate(group([x,2.78,0],cooling),'y',4.2);
    for(let n=0;n<6;n++){
      const a=n*Math.PI/3,blade=box(.19,.045,.42,[Math.sin(a)*.30,0,Math.cos(a)*.30],steel,fan);
      blade.rotation.y=a+.35;
    }
    cyl(.12,.10,[0,.04,0],pale,fan);ring(.59,.025,[x,2.85,0],steel,cooling);
    for(const dx of [-.35,0,.35])rod([x+dx,2.87,-.44],[x+dx,2.87,.44],.012,steel,cooling);
  }
  inspect('line-1-final-check',61.8,line,.8);
  brush('line-2-brushing',7,secondLine,1.6);
  edger('line-2-edge-trimmer',19,secondLine,1.6);
  inspect('line-2-final-check',30.3,secondLine,.8);

  // Dedicated service skids, with connected supply/return lines, fill the
  // wall bay without putting equipment in the operator circulation strips.
  const utilityZ=-114.85;
  const dosing=unit('dosing-skid',[35.4,0,utilityZ]);
  box(3.5,.16,1.8,[0,.16,0],dark,dosing);
  for(const x of [-.9,.9]){
    for(const z of [-.5,.5])box(.10,.8,.10,[x,.56,z],steel,dosing);
    cyl(.56,1.4,[x,1.75,0],pale,dosing);
    cyl(.23,.6,[x,.75,0],steel,dosing,.56);
    cyl(.56,.18,[x,2.54,0],steel,dosing,.32);
    gearmotor([x,2.67,0],dosing,.4);gauge([x,1.55,.59],dosing);
    cylinder(.13,.8,[x,.47,.5],blue,dosing,'z');
    flange(.19,[x,.47,.94],dosing,'z',6);
    equipment.valve([x,.8,.75],dosing);
  }
  panel(1.0,.7,[0,1.2,.94],dosing);tag(dosing,'DOZALAÝYŞ',3,3.25,.4);
  const chiller=unit('water-chiller',[41.2,0,utilityZ]);
  feet(chiller,3.3,1.4,.25);box(3.6,2.05,1.6,[0,1.3,0],pale,chiller);
  for(const x of [-1.15,0,1.15]){
    panel(.95,1.45,[x,1.28,.83],chiller);
    for(let y=.7;y<1.85;y+=.16)box(.74,.035,.04,[x,y,.88],dark,chiller);
  }
  for(const x of [-.94,.94]){
    cylinder(.65,.08,[x,2.38,0],dark,chiller);ring(.66,.03,[x,2.45,0],steel,chiller);
    const fan=rotate(group([x,2.47,0],chiller),'y',3.6);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5,blade=box(.19,.04,.46,[Math.sin(a)*.30,0,Math.cos(a)*.30],steel,fan);blade.rotation.y=a;
    }
    cyl(.10,.08,[0,.04,0],pale,fan);
  }
  tag(chiller,'SOWADYJY AGREGAT',3,2.04,.91);
  const filter=unit('cartridge-filter',[53.6,0,utilityZ]);
  feet(filter,1.6,1.4,1.5);
  box(1.8,2.25,1.45,[0,2.65,0],pale,filter);
  equipment.hollowHopper(1.8,1.45,.35,.35,.65,[0,.88,0],filter);
  for(const x of [-.46,.46]){
    panel(.70,1.72,[x,2.66,.77],filter);handle([x+.20,2.66,.84],filter);
    cyl(.22,.25,[x,3.91,0],steel,filter);
  }
  cyl(.28,.5,[0,.61,0],blue,filter);cyl(.44,.35,[0,.19,0],dark,filter);
  gauge([.68,3.5,.79],filter);tag(filter,'GOŞMAÇA SÜZGÜÇ',1.9,4.2,.4);
  const air=unit('air-receiver',[57.8,0,utilityZ]);
  feet(air,.85,.85,.55);cyl(.61,2.65,[0,1.89,0],pale,air);
  for(const y of [.57,3.22])ring(.62,.045,[0,y,0],steel,air);
  cyl(.61,.24,[0,3.34,0],steel,air,.2);cyl(.10,.36,[0,3.63,0],blue,air);
  gauge([.24,1.9,.65],air);equipment.valve([-.40,1.1,.70],air);
  tag(air,'HOWA RESIWERI',1.8,2.8,.67);
  const cabinets=unit('electrical-bank',[63,0,-115.1]);
  for(const x of [-1.8,-.6,.6,1.8]){
    box(1.1,.18,.90,[x,.13,0],dark,cabinets);
    box(1.08,2.4,.78,[x,1.42,0],pale,cabinets);
    panel(.98,2.24,[x,1.42,.41],cabinets);handle([x+.32,1.5,.48],cabinets);
    box(.35,.25,.025,[x,2.04,.49],dark,cabinets);
    box(.28,.17,.012,[x,2.04,.51],m.blueLight,cabinets);
    for(let y=.48;y<.9;y+=.09)box(.72,.024,.025,[x,y,.49],dark,cabinets);
  }
  tag(cabinets,'01 / 02 · HATLARYŇ DOLANDYRYŞY',4.4,2.92,.42);

  // Material and tooling stores remain inside the utility bay, alongside
  // existing tanks; the machine-facing passage stays open at z=-113..-111.
  for(const [x,kind] of [[12.4,'tooling-rack'],[22,'film-unwind']]){
    const rack=unit(kind,[x,0,utilityZ]);feet(rack,2.1,1.25,2.65);
    for(const y of [.2,1.25,2.4]){
      box(2.3,.10,1.4,[0,y,0],steel,rack);
      for(const xx of [-.65,.65]){
        cylinder(.36,.95,[xx,y+.41,0],kind==='film-unwind'?m.paper:blue,rack,'z');
        cylinder(.10,1.03,[xx,y+.41,0],m.wood,rack,'z');
      }
    }
    tag(rack,kind==='film-unwind'?'ÖRTÜK RULONY':'ÇALŞYLÝAN GURAL',2.4,3.05,.68);
  }
  // Supply and return meet the existing coating heads and new cooling hood.
  for(const [offset,y,mat] of [[-.16,4.95,blue],[.16,5.18,steel]]){
    pipe([[35.4+offset,1.0,utilityZ+.8],[35.4+offset,y,utilityZ+.8],[37+offset,y,utilityZ+.8],[37+offset,y,line.z],[37+offset,2.6,line.z]],.06,mat);
    pipe([[41.2+offset,1.1,utilityZ+.85],[41.2+offset,y,utilityZ+.85],[58.2+offset,y,utilityZ+.85],[58.2+offset,y,line.z],[58.2+offset,2.6,line.z]],.075,mat);
  }
  pipe([[53.6,3.82,utilityZ],[53.6,4.65,utilityZ],[53.6,4.65,-105.8]],.20);
  pipe([[57.8,3.80,utilityZ],[57.8,5.35,utilityZ],[7,5.35,utilityZ],[7,5.35,secondLine.z],[7,2.7,secondLine.z]],.045,blue);
  // A supported cable tray joins the control bank and both machine rows.
  for(const z of [-110.8,-110.45])box(57,.14,.045,[35.5,5.04,z],dark,root);
  for(let x=7;x<64;x+=.8)box(.045,.035,.35,[x,4.98,-110.625],steel,root);
  for(const x of [7,31,45,63]){
    rod([x,5.1,-110.8],[x,5.75,-110.8],.022,steel,root);
    rod([x,5.75,-115.8],[x,5.75,-110.4],.035,steel,root);
  }
  for(const s of stations){
    const x=s.x+s.width/2+.14,z=s.z+1.92;
    pipe([[x,1.7,z],[x,3.3,z],[x,4.98,z],[x,4.98,-110.625]],.025,m.black);
  }
  pipe([[63,2.65,-115.1],[63,4.98,-115.1],[63,4.98,-110.625]],.06,m.black);
  return {root,machines,stations,rotors,pipes};
}
