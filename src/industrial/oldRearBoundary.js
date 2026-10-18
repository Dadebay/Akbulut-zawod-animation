import * as T from 'three';
import {OLD_REAR_BOUNDARY as L,OLD_PAVILION} from './siteLayout.js';

// Solid white partition between the factory court and the exterior silo/raw-material yard, plus
// the small green-roofed service building behind the long warehouse.
export function buildOldRearBoundary(k){
  const {box,cyl,rod,mesh,group,material,m}=k;
  const white=material('#e0e1d6',.04,.88),base=material('#adafa2',0,.97);
  const cap=material('#c7cbbf',.06,.84),metal=material('#a9b8af',.52,.48);
  const roofGreen=material('#4f8069',.25,.60),roofShade=material('#376953',.25,.62);
  const glass=material('#2e4952',.35,.30),door=material('#6c8a76',.18,.69);
  const concrete=material('#bcbdb0',0,.96);

  function wall(north,south){
    const length=south-north,g=group([L.x,0,(north+south)/2]);
    box(.65,.42,length,[0,-.08,0],base,g);
    box(.38,L.height,length,[0,L.height/2,0],white,g);
    box(.54,.14,length,[0,L.height+.07,0],cap,g);
    const spans=Math.ceil(length/3.5);
    for(let i=0;i<=spans;i++){
      const z=-length/2+length*i/spans;
      box(.56,L.height+.20,.56,[0,(L.height+.20)/2,z],white,g);
      box(.68,.12,.68,[0,L.height+.26,z],cap,g);
    }
  }
  const northGate=L.gateZ-L.gateWidth/2,southGate=L.gateZ+L.gateWidth/2;
  // Meet the rail-side boundary wall at the court's far corner.
  wall(L.north,northGate-.30);wall(southGate+.30,OLD_PAVILION.wallZ);
  // Flush vehicle access through the partition, clear of both silos and stored material.
  box(20,.12,L.gateWidth+.6,[L.x,-.065,L.gateZ],concrete);
  for(const z of [northGate,southGate]){
    box(.62,4.65,.62,[L.x,2.325,z],white);
    box(.78,.16,.78,[L.x,4.70,z],cap);
    box(.66,.65,.66,[L.x,.325,z],base);
    // Open steel leaves fold back into the raw yard.
    for(const y of [.30,1.85])box(5.5,.085,.075,[L.x+2.8,y,z],metal);
    for(let x=.10;x<5.5;x+=.22)rod([L.x+x,.30,z],[L.x+x,1.85,z],.018,white);
    box(.08,1.70,.08,[L.x+5.55,1.10,z],metal);
    cyl(.09,1.05,[L.x-1.0,.525,z+(z===northGate?.65:-.65)],m.yellow,k.scene,undefined,12);
  }
  box(.68,.42,L.gateWidth+.76,[L.x,4.87,L.gateZ],white);
  for(const z of [L.gateZ-4,L.gateZ+4])box(.12,.10,.48,[L.x-.39,4.62,z],m.light);

  const B=L.building,g=group([B.x,0,B.z]);g.name='old-warehouse-rear-service-building';
  box(B.width+2,.58,B.depth+4.5,[0,-.30,1.1],concrete,g);
  box(B.width,B.height,B.depth,[0,B.height/2,0],white,g);
  box(B.width+.08,.30,B.depth+.08,[0,.15,0],base,g);
  const rise=.9,slope=Math.atan2(rise,B.depth/2),length=Math.hypot(B.depth/2,rise)+.45;
  for(const side of [-1,1]){
    const sheet=box(B.width+.7,.13,length,[0,B.height+rise/2,side*B.depth/4],side>0?roofGreen:roofShade,g);sheet.rotation.x=side*slope;
    for(let x=-B.width/2-.2;x<B.width/2+.3;x+=.48){const rib=box(.023,.03,length,[x,B.height+rise/2+.09,side*B.depth/4],metal,g);rib.rotation.x=side*slope;}
    box(B.width+.7,.15,.16,[0,B.height,side*(B.depth/2+.2)],white,g);
  }
  box(B.width+.75,.12,.20,[0,B.height+rise+.04,0],metal,g);
  const shape=new T.Shape();shape.moveTo(-B.depth/2,0);shape.lineTo(B.depth/2,0);shape.lineTo(0,rise);shape.closePath();
  const end=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false});end.rotateY(Math.PI/2);
  for(const side of [-1,1])mesh(end,white,[side*B.width/2,B.height,0],g);
  function window(x,z,yaw=0){
    const pane=group([x,1.70,z],g);pane.rotation.y=yaw;
    box(1.65,1.20,.09,[0,0,0],white,pane);
    box(1.45,1.02,.035,[0,0,.06],glass,pane);
    box(.045,1.08,.055,[0,0,.09],metal,pane);
    box(1.78,.08,.25,[0,-.65,.04],cap,pane);
  }
  for(const x of [-2.65,2.65])window(x,B.depth/2+.045);
  window(-B.width/2-.045,0,-Math.PI/2);window(B.width/2+.045,0,Math.PI/2);
  box(1.15,2.35,.07,[0,1.25,B.depth/2+.05],door,g);
  box(.90,.83,.035,[0,1.94,B.depth/2+.10],glass,g);
  rod([.42,.95,B.depth/2+.15],[.42,1.28,B.depth/2+.15],.018,metal,g);
  // Shaded porch and low steps face the open factory court.
  box(4.8,.15,2.4,[0,2.83,B.depth/2+1.02],roofGreen,g);
  box(4.9,.20,.12,[0,2.78,B.depth/2+2.20],white,g);
  for(const x of [-2.18,2.18])box(.12,2.75,.12,[x,1.375,B.depth/2+2.02],white,g);
  box(4.8,.14,2.4,[0,.07,B.depth/2+1.02],concrete,g);
  box(2.0,.08,.55,[0,.04,B.depth/2+2.45],cap,g);
  box(.30,.09,.18,[0,2.61,B.depth/2+.15],m.light,g);
}
