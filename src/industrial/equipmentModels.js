import * as T from 'three';
import {machinePort} from './equipmentConnections.js';
import {PROCESS_PHYSICS as P,rpmToRadians} from './processPhysics.js';

// Original geometry based on the user's equipment renders. All dimensions are metres.
export function createEquipmentModels(k,rotors){
  const {m,box,cyl,ring,rod,pipe,group,mesh,material,frame,ladder,textPlate}=k;
  const enamel=material('#f0f2f1',.28,.36),blue=material('#1c6099',.42,.34);
  const cast=material('#52616b',.72,.44),seam=material('#79838a',.58,.48);
  const gasket=material('#202a30',.12,.82),zinc=material('#aebbc2',.8,.32);
  const interior=material('#89939a',.7,.53,{side:T.DoubleSide});
  const wire=material('#76858f',.6,.58);
  const port=(g,name,p,n,r,medium='solid',options={})=>machinePort(k,g,name,p,n,r,medium,options);
  const axisRotation={x:[0,0,-Math.PI/2],y:[0,0,0],z:[Math.PI/2,0,0]};
  function cylinder(r,h,pos,mat,parent,axis='y',rt=r,segments=48){const o=cyl(r,h,pos,mat,parent,rt,segments);o.rotation.set(...axisRotation[axis]);return o;}
  function bolt(pos,parent,axis='y',radius=.035){cylinder(radius*1.5,.012,pos,zinc,parent,axis,undefined,12);return cylinder(radius,.035,pos,cast,parent,axis,radius,6);}
  function circleBolts(r,pos,parent,axis='y',n=16){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const p=axis==='x'?[pos[0],pos[1]+r*Math.sin(a),pos[2]+r*Math.cos(a)]:axis==='z'?[pos[0]+r*Math.sin(a),pos[1]+r*Math.cos(a),pos[2]]:[pos[0]+r*Math.sin(a),pos[1],pos[2]+r*Math.cos(a)];bolt(p,parent,axis);}}
  function flange(r,pos,parent,axis='y',holes=12){cylinder(r,.07,pos,zinc,parent,axis);const p=[...pos];p[axis==='x'?0:axis==='y'?1:2]+=.055;circleBolts(r*.84,p,parent,axis,holes);}
  function panel(w,h,pos,parent,color=enamel){const g=group(pos,parent);box(w+.035,h+.035,.035,[0,0,0],gasket,g,.012);box(w,h,.04,[0,0,.025],color,g,.025);for(const x of [-w/2+.07,w/2-.07])for(const y of [-h/2+.07,h/2-.07])bolt([x,y,.065],g,'z',.022);return g;}
  function handle(pos,parent){for(const y of [-.09,.09])box(.045,.035,.06,[pos[0],pos[1]+y,pos[2]],zinc,parent,.008);rod([pos[0],pos[1]-.09,pos[2]+.04],[pos[0],pos[1]+.09,pos[2]+.04],.022,gasket,parent);}
  function ribBeam(length,pos,parent){box(length,.25,.08,pos,cast,parent);for(const y of [-.14,.14])box(length,.045,.28,[pos[0],pos[1]+y,pos[2]],cast,parent);}
  function base(w,d,parent){for(const z of [-d/2,d/2])ribBeam(w,[0,.38,z],parent);for(let x=-w/2+.2;x<w/2;x+=w/4)box(.18,.31,d,[x,.38,0],cast,parent);for(const x of [-w/2+.2,w/2-.2])for(const z of [-d/2,d/2]){box(.6,.08,.6,[x,.18,z],zinc,parent);for(const dx of [-.2,.2])bolt([x+dx,.24,z+.18],parent);}}
  function gearmotor(pos,parent,scale=1,angle=0){const g=group(pos,parent);g.scale.setScalar(scale);g.rotation.y=angle;
    box(1.6,.10,.85,[0,.07,0],cast,g);for(const x of [-.5,.55])for(const z of [-.32,.32])bolt([x,.15,z],g);
    box(.55,.64,.62,[-.48,.47,0],cast,g,.07);panel(.45,.45,[-.48,.47,.32],g,zinc);cylinder(.17,.1,[-.48,.47,.36],cast,g,'z');circleBolts(.22,[-.48,.47,.4],g,'z',8);
    cylinder(.28,.85,[.25,.5,0],cast,g,'x');cylinder(.31,.10,[.76,.5,0],zinc,g,'x');
    for(let n=0;n<20;n++){const a=n/20*Math.PI*2;const fin=box(.73,.07,.022,[.27,.5+Math.cos(a)*.29,Math.sin(a)*.29],zinc,g);fin.rotation.x=a;}
    cylinder(.30,.14,[.84,.5,0],cast,g,'x');for(let n=0;n<12;n++){const a=n/12*Math.PI*2;rod([.92,.5+Math.sin(a)*.12,Math.cos(a)*.12],[.92,.5+Math.sin(a)*.25,Math.cos(a)*.25],.012,gasket,g);}
    box(.26,.18,.25,[.25,.86,0],blue,g,.02);pipe([[.35,.9,.1],[.48,.95,.3],[.6,.4,.48],[1,.2,.5]],.026,gasket,g);
    cylinder(.11,.28,[-.85,.48,0],m.polished,g,'x');return g;
  }
  function gauge(pos,parent){const g=group(pos,parent);rod([0,-.24,0],[0,0,0],.03,zinc,g);cylinder(.12,.065,[0,0,0],zinc,g,'z');cylinder(.102,.01,[0,0,.038],enamel,g,'z');rod([0,0,.052],[.06,.045,.052],.008,gasket,g);for(let n=0;n<9;n++){const a=n/8*Math.PI*1.5-Math.PI*.75;box(.012,.018,.008,[Math.sin(a)*.08,Math.cos(a)*.08,.048],gasket,g);}return g;}
  function valve(pos,parent,axis='y'){const g=group(pos,parent);g.rotation.set(...axisRotation[axis]);cyl(.14,.34,[0,0,0],cast,g);flange(.19,[0,-.18,0],g);flange(.19,[0,.18,0],g);rod([0,0,0],[.4,0,0],.035,zinc,g);ring(.17,.018,[.43,0,0],blue,g,'x');for(let n=0;n<3;n++){const a=n/3*Math.PI*2;rod([.43,0,0],[.43,Math.sin(a)*.17,Math.cos(a)*.17],.016,blue,g);}return g;}
  function hollowHopper(w,d,neckW,neckD,h,pos,parent){const g=group(pos,parent);const v=[[-neckW/2,0,-neckD/2],[neckW/2,0,-neckD/2],[neckW/2,0,neckD/2],[-neckW/2,0,neckD/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v.flat(),3));geo.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);geo.computeVertexNormals();mesh(geo,interior,[0,0,0],g);for(const z of [-d/2,d/2]){box(w+.15,.08,.12,[0,h,z],zinc,g);for(let x=-w/2+.15;x<w/2;x+=.45)bolt([x,h+.06,z],g);}for(const x of [-w/2,w/2])box(.12,.08,d,[x,h,0],zinc,g);box(neckW,.06,neckD,[0,-.08,0],gasket,g);return g;}
  function fence(w,h,pos,parent,angle=0){const g=group(pos,parent);g.rotation.y=angle;
    // Solid welded wires stay transparent between cells at every zoom level.
    for(let x=-w/2+.12;x<w/2-.06;x+=.12)box(.008,h-.17,.008,[x,(h+.1)/2,0],wire,g);
    for(let y=.16;y<h-.05;y+=.15)box(w-.12,.008,.008,[0,y,.005],wire,g);
    for(const x of [-w/2,w/2]){box(.065,h,.065,[x,h/2,0],blue,g);box(.22,.05,.2,[x,.025,0],zinc,g);}
    for(const y of [.12,h])box(w,.065,.065,[0,y,0],blue,g);return g;
  }
  function deck(w,d,y,parent){box(w,.12,d,[0,y,0],cast,parent);for(let x=-w/2+.05;x<w/2;x+=.1)box(.025,.018,d,[x,y+.07,0],zinc,parent);for(const z of [-d/2,d/2]){for(let x=-w/2;x<=w/2+.05;x+=w/Math.ceil(w/1.25))rod([x,y,z],[x,y+1.04,z],.023,blue,parent);for(const yy of [.5,1.04])rod([-w/2,y+yy,z],[w/2,y+yy,z],.026,blue,parent);box(w,.12,.025,[0,y+.12,z],blue,parent);}}
  function hatch(pos,r,parent,axis='z'){flange(r,pos,parent,axis,16);cylinder(r*.78,.11,pos,enamel,parent,axis);}

  function CR(g){
    for(const x of [-2,2]){const sg=group([x,0,0],g);frame(2.45,2.45,3.7,sg);cyl(.33,1.65,[0,2.88,0],enamel,sg,1.48,64);cyl(1.48,5.3,[0,6.33,0],enamel,sg,undefined,64);cyl(1.48,.43,[0,9.2,0],zinc,sg,.24,64);
      for(const y of [3.7,5.46,7.22,8.98]){cyl(1.53,.055,[0,y,0],zinc,sg,undefined,64);circleBolts(1.51,[0,y+.055,0],sg,'y',36);}
      for(let n=0;n<6;n++){const a=n/6*Math.PI*2;rod([Math.sin(a)*1.488,3.75,Math.cos(a)*1.488],[Math.sin(a)*1.488,8.94,Math.cos(a)*1.488],.012,seam,sg);}
      for(const y of [9.3,9.84])ring(1.45,.023,[0,y,0],blue,sg);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;rod([Math.sin(a)*1.45,9.05,Math.cos(a)*1.45],[Math.sin(a)*1.45,9.84,Math.cos(a)*1.45],.025,blue,sg);}
      cyl(.22,.8,[.45,9.7,0],zinc,sg);cyl(.34,.08,[.45,10.13,0],zinc,sg);hatch([-.55,9.38,.05],.3,sg,'y');ladder(9.2,0,1.63,sg,true);
      hatch([0,4.3,1.43],.32,sg);handle([0,4.3,1.62],sg);flange(.34,[0,2.03,0],sg);box(.65,.24,.7,[0,1.82,0],blue,sg,.025);gearmotor([.7,1.35,0],sg,.55);valve([0,1.46,0],sg);
      pipe([[.9,3.4,1.2],[.9,2.4,1.2],[1.2,.4,1.5]],.045,zinc,sg);textPlate(`CR-${x<0?'01':'02'}`,1,.22,[-.65,6.8,1.34],sg);
    }
    pipe([[-2,9.55,-.5],[-2,10.3,-1.5],[2,10.3,-1.5],[2,9.55,-.5]],.12,zinc,g);
    const h=group([-5,0,-.5],g);frame(2.4,2.4,1.3,h);hollowHopper(2.7,2.7,.65,.65,1.4,[0,1.1,0],h);for(let z=-1.2;z<1.3;z+=.17)box(2.45,.06,.035,[0,2.52,z],cast,h);
    box(.64,11.4,.74,[-4,5.7,-2.7],enamel,g,.025);for(let y=.8;y<11.4;y+=.85){box(.74,.045,.84,[-4,y,-2.7],zinc,g);panel(.43,.58,[-4,y+.36,-2.31],g);}
    gearmotor([-3.55,10.9,-2.7],g,.65);// Distribution screws now attach to the actual silo top nozzles via processPlan.
    for(const [i,x] of [-2,2].entries())port(g,`out${i+1}`,[x,1.28,0],[0,-1,0],.2);
  }
  function TY(g){
    base(5.8,3.7,g);for(const z of [-1.4,1.4]){box(3.8,1.9,.16,[0,1.8,z],blue,g,.025);for(let x=-1.6;x<=1.6;x+=.8){box(.12,2.1,.25,[x,1.6,z],cast,g);bolt([x,2.7,z+.14],g,'z');}box(4.1,.13,.3,[0,2.85,z],zinc,g);}
    for(const x of [-1.9,1.9])box(.12,2,2.8,[x,1.8,0],enamel,g,.02);
    box(3.7,.14,2.8,[0,.8,0],cast,g);hollowHopper(2.5,2.3,1.6,1.6,1.15,[0,2.84,0],g);
    // Raised service lid with hinge barrels and twin hydraulic stays.
    const lid=group([-1.7,3.05,0],g);lid.rotation.z=-.54;box(.15,2.3,2.8,[0,1.1,0],enamel,lid,.04);box(.05,1.85,2.35,[.1,1.1,0],cast,lid,.025);for(const z of [-1.34,1.34]){cylinder(.12,.48,[-1.7,3.02,z],zinc,g,'z');rod([-.3,2,z],[-2.5,4.45,z],.07,cast,g);rod([-1.2,2.9,z],[-2.5,4.45,z],.035,m.polished,g);}
    const wheel=group([.3,1.95,1.75],g,true);cylinder(.85,.15,[0,0,0],cast,wheel,'z');ring(.75,.08,[0,0,.1],zinc,wheel,'z');for(let n=0;n<8;n++){const a=n/8*Math.PI*2;rod([Math.sin(a)*.25,Math.cos(a)*.25,.12],[Math.sin(a)*.69,Math.cos(a)*.69,.12],.045,zinc,wheel);}cylinder(.2,.24,[0,0,.1],zinc,wheel,'z');rotors.push({object:wheel,axis:'z',zone:'TY',speed:1.1});
    gearmotor([2.3,.48,1.6],g,1.2,Math.PI);fence(4.8,2.5,[.3,.3,2.15],g);textPlate('TY-01',.8,.24,[-.8,2.25,1.51],g);
    panel(1.1,.75,[.25,1.5,-1.51],g);const cyclone=group([0,0,-3.1],g);frame(1.7,1.7,2.4,cyclone);cyl(.17,1.6,[0,2.8,0],zinc,cyclone,.8);cyl(.8,1.6,[0,4.4,0],zinc,cyclone);for(const y of [3.6,5.2])flange(.84,[0,y,0],cyclone);pipe([[0,5.2,-3.1],[0,6,-3.1],[0,6,-.4],[0,4,-.4]],.24,zinc,g);
    port(g,'out',[0,.65,-1.9],[0,0,-1],.25,'solid',{nozzle:.5});
  }
  function BS(g){
    base(12.5,3.5,g);const drum=group([0,2.65,0],g,true);cylinder(1.5,10.4,[0,0,0],zinc,drum,'x',1.5,80);
    for(let x=-4.8;x<5.1;x+=1.2)ring(1.503,.009,[x,0,0],seam,drum,'x');for(let n=0;n<4;n++){const a=n/4*Math.PI*2;rod([-5.1,Math.sin(a)*1.502,Math.cos(a)*1.502],[5.1,Math.sin(a)*1.502,Math.cos(a)*1.502],.009,seam,drum);}
    for(const x of [-3.45,3.45]){cylinder(1.6,.28,[x,0,0],cast,drum,'x',1.6,80);cylinder(1.64,.18,[x,0,0],m.polished,drum,'x',1.64,80);circleBolts(1.55,[x+.17,0,0],drum,'x',28);
      const contactZ=Math.sqrt((1.64+.43)**2-(2.65-1.12)**2);
      for(const z of [-contactZ,contactZ]){box(1.4,.4,.75,[x,.73,z],cast,g,.045);
        const roller=group([x,1.12,z],g,true);cylinder(.43,.62,[0,0,0],zinc,roller,'x');box(.64,.04,.06,[0,.43,0],cast,roller);
        rotors.push({object:roller,axis:'x',zone:'BS',speed:-rpmToRadians(P.drumRpm)*1.64/.43});
        for(const dx of [-.47,.47]){box(.18,.52,.6,[x+dx,.91,z],cast,g,.09);bolt([x+dx,.68,z+.22],g);}cylinder(.12,1.25,[x,1.12,z],m.polished,g,'x');}}
    cylinder(1.68,.26,[.7,0,0],cast,drum,'x',1.68,80);for(let n=0;n<80;n++){const a=n/80*Math.PI*2;const tooth=box(.28,.12,.10,[.7,Math.sin(a)*1.72,Math.cos(a)*1.72],zinc,drum);tooth.rotation.x=-a;}circleBolts(1.61,[.88,0,0],drum,'x',32);rotors.push({object:drum,axis:'x',zone:'BS',speed:rpmToRadians(P.drumRpm)});
    gearmotor([1.3,.6,-2.05],g,1.4);const pinion=group([.7,1.18,-1.45],g,true);cylinder(.35,.3,[0,0,0],cast,pinion,'x');for(let n=0;n<18;n++){const a=n/18*Math.PI*2;const t=box(.3,.06,.08,[0,Math.sin(a)*.36,Math.cos(a)*.36],zinc,pinion);t.rotation.x=-a;}rotors.push({object:pinion,axis:'x',zone:'BS',speed:-rpmToRadians(P.drumRpm)*P.drumTeeth/P.pinionTeeth});
    for(const x of [-5.5,5.5]){cylinder(1.52,.55,[x,2.65,0],blue,g,'x');cylinder(1.57,.06,[x+(x>0?-.3:.3),2.65,0],zinc,g,'x');circleBolts(1.43,[x+(x>0?.31:-.31),2.65,0],g,'x',24);box(.7,1.4,1.1,[x,1,0],cast,g);}
    hollowHopper(1.4,1.1,.6,.6,1.2,[-5.65,3.7,0],g);pipe([[5.5,3.4,0],[5.5,4.7,0],[5.5,5.4,-.7],[5.5,5.4,-2]],.4,zinc,g);flange(.47,[5.5,4.55,0],g);
    hatch([-2,0,1.48],.28,drum);gauge([5.45,3.6,.9],g);pipe([[5.5,2.8,1.2],[5.5,1.7,1.5],[4.3,1.7,1.5]],.05,zinc,g);valve([4.7,1.7,1.5],g,'x');
    const walk=group([0,0,2.75],g);frame(10.7,.9,1.15,walk);deck(10.7,1,1.15,walk);ladder(1.2,-5.4,3.3,g);textPlate('BS-01',1.2,.25,[0,1.35,3.28],g);
    port(g,'in',[-5.65,4.9,0],[0,1,0],.3,'solid',{open:true});
    port(g,'exhaust',[5.5,5.4,-2],[0,0,-1],.4,'air');
    port(g,'out',[5.5,1.85,1.65],[0,0,1],.3,'solid',{nozzle:.6});
    port(g,'heat',[-5.85,2.65,0],[-1,0,0],.3,'heat',{nozzle:.4});
  }
  function GR(g){
    frame(5.7,4.6,2.7,g);deck(6.4,5.1,2.7,g);ladder(2.8,-3.35,2.45,g,true);
    mesh(new T.CylinderGeometry(1.85,1.85,1.45,72,1,true),interior,[0,3.7,0],g);cyl(1.84,.10,[0,3.02,0],zinc,g);for(const y of [3,4.43]){ring(1.87,.05,[0,y,0],zinc,g);circleBolts(1.87,[0,y+.045,0],g,'y',28);}cyl(1.73,.04,[0,3.2,0],m.raw,g);
    const agitator=group([0,3.32,0],g,true);cyl(.13,.75,[0,.3,0],m.polished,agitator);for(let n=0;n<4;n++){const a=n*Math.PI/2;rod([0,.42,0],[Math.cos(a)*1.62,.14,Math.sin(a)*1.62],.06,zinc,agitator);const paddle=box(.34,.34,.55,[Math.cos(a)*1.55,.14,Math.sin(a)*1.55],cast,agitator,.025);paddle.rotation.y=-a;}rotors.push({object:agitator,axis:'y',zone:'GR',speed:rpmToRadians(P.mixerRpm)});
    gearmotor([-2.8,3,0],g,1.1,Math.PI);hatch([0,3.7,1.84],.34,g);gauge([.75,4.2,1.7],g);pipe([[0,2.8,0],[0,1.7,0],[0,1.7,2.5],[4.5,1.7,2.5]],.18,zinc,g);valve([0,2.3,0],g);flange(.23,[0,1.7,2.2],g,'z');
    // Separate weighing vessels and their supporting portal leave the mixing pan visible.
    for(const x of [-2.5,2.5]){for(const z of [-1.1,1.1])box(.1,3,.1,[x,4.2,z],cast,g);cyl(.64,1.1,[x,6.4,-.45],enamel,g);cyl(.13,.75,[x,5.48,-.45],zinc,g,.64);flange(.68,[x,6.95,-.45],g);pipe([[x,5.1,-.45],[x*.6,4.75,-.45],[x*.5,4.45,-.45]],.12,zinc,g);for(const z of [-1.1,1.1])box(.22,.12,.26,[x,6.3,z],blue,g);}
    textPlate('GR-01',1,.24,[-.8,3.8,1.72],g);
    port(g,'in',[-2.5,6.95,-.45],[0,1,0],.25);
    port(g,'additives',[2.5,6.95,-.45],[0,1,0],.25);
    port(g,'out',[4.5,1.7,2.5],[1,0,0],.18);
  }
  function GK(g){
    for(let i=0;i<5;i++){const x=-8+i*3.5,sg=group([x,0,0],g);for(const z of [-1.8,1.8]){box(3.45,1.9,.10,[0,2.25,z],enamel,sg,.025);box(3.5,.18,.2,[0,1.22,z],blue,sg);box(3.5,.12,.18,[0,3.25,z],blue,sg);for(const xx of [-1.57,1.57])box(.13,2,.16,[xx,2.23,z],cast,sg);
        const side=group([0,0,z],sg);if(z<0)side.rotation.y=Math.PI;for(const xx of [-.8,.8]){panel(1.42,1.55,[xx,2.25,.07],side,enamel);handle([xx+.46,2.2,.15],side);box(.55,.28,.035,[xx,2.56,.115],gasket,side,.035);box(.47,.20,.04,[xx,2.56,.12],m.glass,side);for(const yy of [1.75,2.7])box(.05,.15,.075,[xx-.67,yy,.12],zinc,side);}}
      box(3.48,.14,3.65,[0,3.32,0],enamel,sg,.035);for(const zz of [-1,0,1])box(3.4,.025,.025,[0,3.402,zz],seam,sg);
      for(const xx of [-1.65,1.65]){box(.06,.18,3.7,[xx,3.38,0],blue,sg);for(const z of [-1.8,1.8])bolt([xx,3.5,z],sg);}
      cyl(.31,.35,[0,3.57,0],zinc,sg);flange(.39,[0,3.76,0],sg);pipe([[0,3.8,0],[0,4.2,0],[0,4.6,-.5],[0,4.6,-2.5]],.24,zinc,sg);gearmotor([.3,.38,-2],sg,.65);textPlate(`GK-${i+1}`, .7,.18,[0,3.05,1.88],sg);
    }
    pipe([[-8,4.6,-2.5],[0,4.6,-2.5],[6,4.6,-2.5],[8,4.6,-2.5],[8,6.5,-2.5]],.34,zinc,g);for(let x=-8;x<=6;x+=3.5){const gg=group([x,4.6,-2.5],g);flange(.39,[.6,0,0],gg,'x');}
    cyl(.48,.09,[8,6.62,-2.5],zinc,g);for(const x of [7.8,8.2])rod([x,6.4,-2.5],[x,6.59,-2.5],.025,zinc,g);flange(.39,[8,5.7,-2.5],g);
    // Open mouths: a real tunnel around the moving boards, not a solid end cap.
    for(const x of [-9.8,7.8]){for(const z of [-1.7,1.7])box(.2,2.3,.22,[x,2.24,z],blue,g);box(.2,.30,3.6,[x,3.25,0],blue,g);for(let z=-1.45;z<1.5;z+=.3)box(.035,.52,.24,[x,2.97,z],gasket,g);}
  }
  function GP(g){
    for(const x of [-2.45,2.45])for(const z of [-1.7,1.7]){box(.25,4,.25,[x,2.2,z],enamel,g,.025);box(.6,.12,.6,[x,.26,z],cast,g);for(const dx of [-.21,.21])bolt([x+dx,.34,z+.2],g);box(.10,2.9,.06,[x,2.5,z+.16],m.polished,g);}
    for(const z of [-1.7,1.7]){box(5.2,.4,.33,[0,4.3,z],blue,g,.03);box(5.2,.08,.09,[0,4.55,z],m.polished,g);}for(const x of [-2.45,2.45])box(.28,.35,3.5,[x,4.3,0],enamel,g,.025);
    // This portal is the receiving/sensing station. The adjacent robot owns
    // the vacuum pickup; a second oscillating head would occupy its work area.
    box(.55,.16,.4,[0,4.01,0],enamel,g,.025);
    box(.18,.06,.18,[0,3.90,0],m.black,g);
    for(const z of [-1.7,1.7])pipe([[0,4.15,0],[0,4.15,z],[2.45,4.15,z],[2.45,.5,z]],.025,gasket,g);
    for(const z of [-2,2])fence(.8,2.4,[-3,.25,z],g,Math.PI/2);
    for(const x of [-2.2,2.2])fence(1.55,2.4,[x,.25,2.4],g);
    textPlate('GP-01',1,.24,[0,4.32,1.89],g);
  }
  return {CR,TY,BS,GR,GK,GP,hollowHopper,gearmotor,fence,panel,handle,bolt,flange,cylinder,gauge,zinc,blue,enamel,cast,wire};
}
