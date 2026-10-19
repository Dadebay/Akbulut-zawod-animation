import {FORKLIFT_LAYOUT as F} from './forkliftMotion.js';

export function createForkliftBuilder(k,pallet,worker){
  const {m,box,cyl,sphere,ring,rod,group,material}=k;
  const paint=material('#e5e9e5',.16,.42),frame=material('#35414a',.55,.54);
  const tyre=material('#252a2b',0,.97),seatMat=material('#242c30',0,.9);
  const amber=material('#dda12c',0,.4,{unique:true,emissive:'#c07512',emissiveIntensity:.25});
  const reverseMat=material('#f3f1dd',0,.3,{unique:true,emissive:'#fff7dc',emissiveIntensity:.75});
  return function forklift(index){
    const g=group([0,0,0],k.scene,true),ws=[],steering=[];
    box(2.30,.35,1.19,[-.25,.48,0],frame,g,.09);
    box(.88,.72,1.24,[-.99,.82,0],paint,g,.17);
    box(.84,.10,1.15,[-.96,1.22,0],paint,g,.05);
    box(.075,.33,.82,[-1.45,.67,0],tyre,g,.04);
    for(let z=-.40;z<.44;z+=.10)box(.012,.22,.045,[-1.445,.99,z],frame,g);
    for(const z of [-.61,.61]){
      box(1.68,.10,.15,[-.35,.77,z],paint,g,.035);
      box(.62,.06,.21,[-.05,.39,z],frame,g);
      for(const x of [-.25,0,.25])box(.035,.012,.19,[x,.428,z],m.steel,g);
    }
    for(const [x,r,rear] of [[F.frontAxleX,F.frontRadius,false],[F.rearAxleX,F.rearRadius,true]])for(const side of [-1,1]){
      const pivot=group([x,r,side*.56],g,rear),wheel=group([0,0,0],pivot,true);
      wheel.userData.wheelKey=`fork-solid:${r}:${side}`;wheel.userData.radius=r;wheel.userData.sideOffset=side*.56;
      const tire=cyl(r,.22,[0,0,0],tyre,wheel,undefined,24);tire.rotation.x=Math.PI/2;
      for(const z of [-.115,.115]){const rim=cyl(r*.55,.025,[0,0,z],m.steel,wheel,undefined,20);rim.rotation.x=Math.PI/2;ring(r*.77,.015,[0,0,z],frame,wheel,'z');}
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2,bolt=cyl(.018,.025,[Math.sin(a)*r*.34,Math.cos(a)*r*.34,side*.138],frame,wheel,undefined,6);bolt.rotation.x=Math.PI/2;}
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2,tread=box(.025,.012,.19,[Math.sin(a)*(r-.004),Math.cos(a)*(r-.004),0],frame,wheel);tread.rotation.z=-a;}
      ws.push(wheel);if(rear)steering.push(pivot);
    }
    box(.64,.15,.55,[-.35,1.01,0],seatMat,g,.07);
    const seatBack=box(.13,.56,.55,[-.65,1.30,0],seatMat,g,.06);seatBack.rotation.z=-.08;
    rod([.10,.66,0],[.32,1.39,0],.035,frame,g);
    const steeringWheel=group([.32,1.39,0],g,true);steeringWheel.rotation.z=-.30;
    ring(.17,.018,[0,0,0],seatMat,steeringWheel);
    for(const z of [-.15,.15])rod([0,0,0],[0,0,z],.012,frame,steeringWheel);
    rod([0,0,0],[.15,0,0],.012,frame,steeringWheel);
    for(const z of [-.18,.18])box(.16,.035,.11,[.25,.57,z],tyre,g);
    for(const z of [.34,.43]){rod([.03,1.02,z],[.17,1.22,z],.015,frame,g);sphere(.028,[.17,1.22,z],seatMat,g);}
    // Protective cage and a slatted overhead guard leave the operator visible.
    for(const z of [-.56,.56])for(const x of [-.78,.52])rod([x,.78,z],[x,2.18,z],.032,frame,g);
    for(const z of [-.57,.57])box(1.48,.065,.065,[-.14,2.19,z],frame,g);
    for(let x=-.83;x<.59;x+=.23)box(.055,.055,1.17,[x,2.22,0],paint,g);
    cyl(.065,.10,[-.72,2.30,-.43],amber,g,undefined,16);
    const beacon=group([-.72,2.32,-.43],g,true);box(.09,.07,.025,[.045,0,0],amber,beacon);
    for(const z of [-.55,.55]){box(.08,.10,.14,[.54,1.93,z],frame,g,.015);box(.015,.065,.10,[.586,1.93,z],m.light,g);}
    const reverseLights=group([0,0,0],g,true);
    for(const z of [-.43,.43]){box(.018,.08,.14,[-1.45,1.08,z],m.red,g);box(.02,.065,.075,[-1.462,.91,z],reverseMat,reverseLights);}

    const mast=group([F.mastX,F.mastBaseY,0],g,true);
    for(const z of [-.39,.39]){
      box(.13,2.59,.10,[0,1.295,z],frame,mast);
      box(.05,2.34,.04,[.052,1.28,z],m.polished,mast);
      ring(.065,.019,[.03,2.40,z],m.steel,mast,'z');
      box(.018,2.22,.025,[.08,1.21,z],m.black,mast);
    }
    for(const y of [.20,1.72,2.55])box(.12,.085,.85,[0,y,0],frame,mast);
    cyl(.065,.76,[-.075,.51,0],frame,mast);
    const liftRam=group([-.075,.89,0],mast,true);cyl(.035,1,[0,.5,0],m.polished,liftRam);
    const fork=group([0,F.emptyHeight-F.mastBaseY,0],mast,true);
    box(.13,.18,.94,[.10,.41,0],frame,fork);
    for(const z of [-.24,.24]){
      box(.09,.70,.11,[.13,.35,z],frame,fork);
      box(1.65,.06,.105,[.955,.03,z],frame,fork,.008);
    }
    // Open load backrest, separate from the telescoping mast and fork carriage.
    for(const z of [-.49,.49])box(.055,1.15,.055,[.12,.62,z],frame,fork);
    for(const y of [.10,1.17])box(.055,.055,1.03,[.12,y,0],frame,fork);
    for(let z=-.35;z<.45;z+=.175)box(.025,1.02,.025,[.12,.64,z],frame,fork);
    const cargo=pallet(fork,[F.cargoX-F.mastX,F.palletOffsetY,0],'panel',true);
    const bagCargo=pallet(fork,[F.cargoX-F.mastX,F.palletOffsetY,0],'bags',true);
    cargo.rotation.y=bagCargo.rotation.y=-Math.PI/2;
    const driver=worker({parent:g,position:[-.30,0,0],yaw:Math.PI/2,seated:true,seed:index});
    function update(pose,time){
      g.position.set(pose.x,0,pose.z);g.rotation.y=pose.yaw;
      fork.position.y=pose.height-F.mastBaseY;mast.rotation.z=pose.tilt;
      liftRam.scale.y=Math.max(.08,(pose.height+.58)/1.8);
      cargo.visible=pose.carrying&&pose.kind==='panel';bagCargo.visible=pose.carrying&&pose.kind==='bags';
      steering.forEach(p=>p.rotation.y=-Math.atan2((F.frontAxleX-F.rearAxleX)*pose.curvature,1+p.position.z*pose.curvature));
      ws.forEach((w,i)=>w.rotation.z=-pose.wheelTravel[i]/w.userData.radius);
      steeringWheel.rotation.y=-pose.steer*2.2;
      beacon.rotation.y=time*6;reverseLights.visible=pose.reverse&&Math.floor(time*3)%2===0;driver.update(time,{lookBack:pose.lookBack,steer:pose.steer});
    }
    return {type:'fork',g,ws,fork,mast,cargo,bagCargo,driver,update};
  };
}
