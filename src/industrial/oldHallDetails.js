import * as T from 'three';
import {roundedConnection} from './equipmentConnections.js';

// A restrained reconstruction of the user's old-factory interior photograph:
// pale machinery, exposed rollers, yellow service access and connected extraction.
export function buildOldHallDetails(k,{parent,equipment,lineZ}){
  const {box,cyl,rod,group,mesh,textPlate,m}=k;
  const pale=equipment.enamel,steel=equipment.zinc,yellow=m.yellow,dark=equipment.cast;
  const root=group([0,0,0],parent);root.name='old-hall-reference-details';
  const safety=group([0,0,0],root);safety.name='old-hall-service-platform';
  function duct(points,r=.24){
    const path=roundedConnection(points.map(p=>new T.Vector3(...p)),.45);
    const tube=mesh(new T.TubeGeometry(path,Math.max(16,Math.ceil(path.getLength()*3)),r,12,false),steel,[0,0,0],root);
    tube.name='old-hall-extraction-duct';
    return tube;
  }
  function rail(a,b,parent=root){
    const length=Math.hypot(b[0]-a[0],b[2]-a[2]),n=Math.ceil(length/1.15);
    for(let i=0;i<=n;i++){
      const p=a.map((v,j)=>v+(b[j]-v)*i/n);
      rod(p,[p[0],p[1]+1.05,p[2]],.027,yellow,parent);
    }
    for(const h of [.5,1.05])rod([a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],.03,yellow,parent);
  }
  // Perimeter columns and side trusses evoke the hall without covering its
  // central cutaway. No column is planted in the south loading opening.
  for(const z of [-115.8,-88.7]){
    for(const x of [-5,7,31,45,67]){
      if(z>-100&&x===45)continue;
      box(.8,.5,.8,[x,.25,z],m.concrete,root);
      box(.23,5.45,.3,[x,3.075,z],pale,root);
      for(const dx of [-.16,.16])box(.055,5.45,.42,[x+dx,3.075,z],pale,root);
      box(.58,.12,.58,[x,.55,z],steel,root);
    }
    for(const y of [5.1,5.85])box(73,.12,.16,[31,y,z],pale,root);
    for(let x=-5;x<67;x+=3){
      rod([x,5.1,z],[x+1.5,5.85,z],.035,pale,root);
      rod([x+1.5,5.85,z],[x+3,5.1,z],.035,pale,root);
    }
  }
  // Dust hoods actually connect to a common header and the filter inlet.
  for(const x of [9,19,28]){
    if(x!==9){
      box(1.7,.14,2.65,[x,3.45,lineZ],pale,root);
      for(const z of [lineZ-1.38,lineZ+1.38])box(.075,.7,.075,[x,3.1,z],steel,root);
    }
    duct([[x,x===9?3.7:3.52,lineZ],[x,4.65,lineZ],[x,4.65,-105.8]]);
  }
  duct([[9,4.65,-105.8],[54.8,4.65,-105.8],[56.6,4.65,-104.7]],.32);
  for(const x of [10,22,34,46]){
    // Hangers meet a high cable/service beam, above every walking route.
    rod([x,4.45,-105.8],[x,5.75,-105.8],.022,dark,root);
  }
  box(48,.12,.2,[33,5.8,-105.8],pale,root);
  for(const x of [9,55]){
    rod([x,5.8,-105.8],[x,5.8,-115.8],.06,pale,root);
  }
  // Filter, tapered hopper, sealed dust receiver and inspection panels.
  const filter=group([58,0,-104.7],root);filter.name='old-hall-dust-filter';
  box(2.8,3.1,2.4,[0,3.45,0],pale,filter,.035);
  equipment.hollowHopper(2.8,2.4,.45,.45,1.05,[0,.85,0],filter);
  cyl(.23,.3,[0,.7,0],dark,filter);
  cyl(.42,.48,[0,.28,0],steel,filter);cyl(.46,.05,[0,.535,0],dark,filter);
  for(const x of [-1.6,1.6])for(const z of [-1.3,1.3]){
    box(.14,3.1,.14,[x,1.55,z],dark,filter);
    box(.4,.09,.4,[x,.045,z],steel,filter);
    rod([x,.3,z],[x*.4,1.85,z],.035,dark,filter);
  }
  for(let y=2.1;y<5;y+=.55)for(const z of [-1.215,1.215])box(2.86,.055,.05,[0,y,z],steel,filter);
  for(const x of [-.7,.7]){
    equipment.panel(1.15,1.75,[x,3.65,1.245],filter);
    equipment.handle([x+.4,3.65,1.31],filter);
  }
  textPlate('TOZ SÜZGÜJI',2.2,.28,[0,4.72,1.30],filter,'#41505a','#f0f2f1');
  duct([[58,5,-104.7],[58,5.7,-104.7],[58,5.7,-102.8],[58,6.4,-102.8]],.38);
  cyl(.48,.09,[58,6.48,-102.8],steel,root);
  // Walkable platform surrounds, rather than intersects, the filter shell.
  for(const z of [-106.6,-102.8])box(5.2,.12,.8,[58,3.15,z],dark,safety);
  for(const x of [55.9,60.1])box(1,.12,3,[x,3.15,-104.7],dark,safety);
  for(const x of [55.45,60.55])rail([x,3.23,-107],[x,3.23,-102.4],safety);
  rail([55.45,3.23,-107],[60.55,3.23,-107],safety);
  rail([55.45,3.23,-102.4],[59.4,3.23,-102.4],safety);
  for(const x of [55.8,60.2])for(const z of [-106.7,-102.6])box(.12,3.1,.12,[x,1.55,z],dark,safety);
  // The stair occupies the strip between the forklift aisle and return rollers.
  for(let i=0;i<15;i++)box(1.1,.10,.29,[60,3.15-(i+.5)*.21,-102.4+(i+.5)*.28],steel,safety);
  for(const x of [59.42,60.58]){
    rod([x,.12,-98.2],[x,3.15,-102.4],.06,dark,safety);
    rail([x,.12,-98.2],[x,3.15,-102.4],safety);
  }
  // Neat overhead cable tray and short drops to each existing control cabinet.
  for(const z of [-106.25,-105.95])box(29,.12,.045,[19,3.85,z],dark,root);
  for(let x=4.5;x<34;x+=.7)box(.045,.035,.3,[x,3.8,-106.1],steel,root);
  for(const x of [9,19,28]){
    k.pipe([[x,3.8,-106.1],[x,3.8,-106.3],[x,1.55,-106.3]],.028,m.black,root);
    const console=group([x+.9,0,-106.35],root);
    box(.42,.08,.42,[0,.04,0],steel,console);cyl(.045,1.18,[0,.67,0],steel,console);
    const head=group([0,1.34,0],console);head.rotation.x=-.28;
    box(.62,.38,.12,[0,0,0],pale,head,.025);box(.34,.21,.025,[-.07,.025,.075],m.black,head);
    box(.27,.14,.01,[-.07,.025,.09],m.blueLight,head);cyl(.035,.045,[.22,-.1,.1],m.red,head);
  }
  // Small numbered station plates keep the richer equipment readable.
  for(const [x,label] of [[9,'02 · ARASSALAMA'],[19,'03 · KESME'],[28,'04 · NAGYŞ'],[51,'07 · GÖZEGÇILIK']]){
    textPlate(label,2.7,.35,[x,2.7,lineZ+1.55],root,'#273b47','#e9c842');
    for(const dx of [-1.15,1.15])rod([x+dx,1.1,lineZ+1.55],[x+dx,2.52,lineZ+1.55],.025,dark,root);
  }
  // A single maintenance cart, not scattered clutter in the circulation lanes.
  const cart=group([53.6,0,-111.3],root);cart.name='old-hall-maintenance-cart';
  box(1.4,.8,.65,[0,.65,0],pale,cart,.035);box(1.5,.10,.74,[0,1.1,0],dark,cart);
  for(const x of [-.55,.55])for(const z of [-.25,.25]){const wheel=cyl(.11,.08,[x,.16,z],m.rubber,cart);wheel.rotation.x=Math.PI/2;}
  for(const y of [.45,.7,.95])box(1.15,.018,.03,[0,y,.34],steel,cart);
  return root;
}
