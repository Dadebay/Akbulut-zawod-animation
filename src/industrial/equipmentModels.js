import * as T from 'three';
import {machinePort} from './equipmentConnections.js';
import {PROCESS_PHYSICS as P,rpmToRadians} from './processPhysics.js';
import {BOARD_DRYER} from './processPlan.js';
import {buildDryerTransfers} from './dryerTransfer.js';

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
    port(g,'in',[0,4,0],[0,1,0],.28,'solid',{open:true});
    port(g,'out',[0,.65,-1.9],[0,0,-1],.25,'solid',{nozzle:.5});
  }
  function BS(g){
    base(12.5,3.5,g);const drum=group([0,2.65,0],g,true);cylinder(1.5,10.4,[0,0,0],zinc,drum,'x',1.5,80);
    for(let x=-4.8;x<5.1;x+=1.2)ring(1.503,.009,[x,0,0],seam,drum,'x');for(let n=0;n<4;n++){const a=n/4*Math.PI*2;rod([-5.1,Math.sin(a)*1.502,Math.cos(a)*1.502],[5.1,Math.sin(a)*1.502,Math.cos(a)*1.502],.009,seam,drum);}
    for(const x of [-3.45,3.45]){cylinder(1.6,.28,[x,0,0],cast,drum,'x',1.6,80);cylinder(1.64,.18,[x,0,0],m.polished,drum,'x',1.64,80);circleBolts(1.55,[x+.17,0,0],drum,'x',28);
      const contactZ=Math.sqrt((1.64+.43)**2-(2.65-1.12)**2);
      for(const z of [-contactZ,contactZ]){box(1.4,.4,.75,[x,.43,z],cast,g,.045);
        const roller=group([x,1.12,z],g,true);cylinder(.43,.62,[0,0,0],zinc,roller,'x');box(.012,.05,.68,[.316,0,0],cast,roller);
        rotors.push({object:roller,axis:'x',zone:'BS',speed:-rpmToRadians(P.drumRpm)*1.64/.43});
        for(const dx of [-.47,.47]){box(.18,.52,.6,[x+dx,.91,z],cast,g,.09);bolt([x+dx,.68,z+.22],g);}cylinder(.12,1.25,[x,1.12,z],m.polished,g,'x');}}
    cylinder(1.68,.26,[.7,0,0],cast,drum,'x',1.68,80);for(let n=0;n<80;n++){const a=n/80*Math.PI*2;const tooth=box(.28,.12,.10,[.7,Math.sin(a)*1.72,Math.cos(a)*1.72],zinc,drum);tooth.rotation.x=-a;}circleBolts(1.61,[.88,0,0],drum,'x',32);rotors.push({object:drum,axis:'x',zone:'BS',speed:rpmToRadians(P.drumRpm)});
    gearmotor([1.3,.6,-2.05],g,1.4);const pinion=group([.7,1.18,-1.45],g,true);cylinder(.35,.3,[0,0,0],cast,pinion,'x');for(let n=0;n<18;n++){const a=n/18*Math.PI*2;const t=box(.3,.06,.08,[0,Math.sin(a)*.36,Math.cos(a)*.36],zinc,pinion);t.rotation.x=-a;}rotors.push({object:pinion,axis:'x',zone:'BS',speed:-rpmToRadians(P.drumRpm)*P.drumTeeth/P.pinionTeeth});
    for(const x of [-5.5,5.5]){cylinder(1.52,.55,[x,2.65,0],blue,g,'x');cylinder(1.57,.06,[x+(x>0?-.255:.255),2.65,0],zinc,g,'x');circleBolts(1.43,[x+(x>0?.31:-.31),2.65,0],g,'x',24);box(.7,1.4,1.1,[x,1,0],cast,g);}
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
  // October 27 photos and markup: a 31 m grey insulated dryer in the middle
  // bay. Boards arrive westbound from the wet transfer, so the cream
  // multi-deck infeed and black deck distributors face east. Heater houses
  // stand on the roof.
  function GK(g){
    const cream=material('#e6e2d6',.18,.6),insulated=material('#b4b9ba',.45,.5),roller=material('#4a5156',.55,.5);
    // Local +x runs westbound along the board flow.
    const line=group([0,0,0],g);line.rotation.y=Math.PI;
    // IMG_6752/6753: five roller decks, one per dryer deck opening.
    // The bottom rollers meet the 1.175 m top of the board conveyor.
    const decks=Array.from({length:BOARD_DRYER.decks},(_,i)=>1.04+i*BOARD_DRYER.deckPitch),W=2.3,F=2.15,len=BOARD_DRYER.length,boxWest=-len/2,boxEast=len/2,top=4.4,frameTop=4.15;
    // IMG_6752/6753: a cream portal frame with square posts on foot plates,
    // a roller deck at every dryer level, a gearmotor per deck on the aisle
    // side and top rails that run on past the last portal.
    function deckFrame(x0,x1,inlet){
      const f=group([(x0+x1)/2,0,0],line),L=x1-x0;
      f.name=inlet?'GK-infeed-roller-decks':'GK-outfeed-roller-decks';
      for(const x of [-L/2+.08,L/2-.08]){
        for(const z of [-F,F]){
          box(.18,frameTop,.18,[x,frameTop/2,z],cream,f);
          box(.4,.04,.34,[x,.02,z],zinc,f);
        }
        box(.16,.18,2*F,[x,frameTop,0],cream,f);
      }
      for(const y of decks){
        for(const z of [-F+.1,F-.1])box(L,.14,.09,[0,y,z],cream,f);
        for(let x=-L/2+.12;x<L/2;x+=.28){
          cylinder(.035,2*F-.3,[x,y+.1,0],roller,f,'z',undefined,10);
          for(const z of [-1.35,-.45,.45,1.35])cylinder(.065,.05,[x,y+.1,z],gasket,f,'z',undefined,10);
        }
      }
    }
    // The five short deck extensions feed visible converging branches, which
    // share the same floor conveyor at their outer ends.
    deckFrame(boxWest-.9,boxWest,true);
    deckFrame(boxEast,boxEast+.9,false);
    buildDryerTransfers(k,{parent:line,cylinder,gearmotor,blue,zinc,cast,cream});
    // Dark deck guides either side of both mouths, a fin at every deck, with
    // the dark interior and deck rollers visible through the opening.
    for(const x of [boxWest-.22,boxEast+.22]){
      const out=Math.sign(x);
      for(const z of [-1.92,1.92]){
        box(.32,3.4,.34,[x,2.15,z],gasket,line,.03);
        for(const y of decks)box(.42,.08,.44,[x+out*.04,y+.02,z],cast,line);
      }
      for(const y of decks)box(.08,.06,3.4,[x-out*.24,y+.1,0],roller,line);
    }
    const dry=group([0,0,0],line);dry.name='GK-dryer-box';
    // Continue the roller planes through the open mouths; the insulated walls
    // hide most of this run while the entry and exit stay visibly connected.
    for(const y of decks){
      for(const z of [-F+.1,F-.1])box(len,.14,.09,[0,y,z],cream,dry);
      for(let x=boxWest+.3;x<boxEast-.1;x+=.55)
        cylinder(.035,2*F-.3,[x,y+.1,0],roller,dry,'z',undefined,10);
    }
    for(const z of [-W,W]){
      box(len,top-.3,.12,[0,(top+.3)/2,z],insulated,dry);
      for(let x=-len/2+1.1;x<len/2;x+=1.1)box(.03,top-.45,.02,[x,(top+.3)/2,z+Math.sign(z)*.07],seam,dry);
      box(len,.03,.02,[0,2.35,z+Math.sign(z)*.07],seam,dry);
      ribBeam(len,[0,.28,z],dry);
      for(let x=boxWest+.7;x<boxEast;x+=2.6){
        box(.42,.17,.46,[x,.085,z],cast,dry);
        for(const dx of [-.13,.13])bolt([x+dx,.19,z+.14],dry);
      }
    }
    box(len+.1,.16,2*W+.24,[0,top+.08,0],insulated,dry);
    for(const x of [-len/2,len/2]){
      box(.14,top-3.75,2*W,[x,(top+3.75)/2,0],insulated,dry);
      for(const z of [-1,1])box(.14,3.45,W-1.75,[x,2.025,z*(1.75+(W-1.75)/2)],insulated,dry);
    }
    for(const z of [-1,1]){
      const side=group([0,0,z*W],dry);if(z<0)side.rotation.y=Math.PI;
      for(let x=-len/2+2.2;x<len/2-1;x+=3.3){panel(1.0,1.9,[x,1.45,.07],side,insulated);handle([x+.36,1.45,.12],side);}
    }
    const houses=[-len*.36,-len*.12,len*.12,len*.36];
    for(const [index,x] of houses.entries()){
      const module=group([x,0,0],dry);module.name=`GK-thermal-module-${index+1}`;
      box(2.6,.22,2.9,[0,top+.24,-.65],cast,module);
      box(2.4,2.5,2.6,[0,top+1.6,-.7],insulated,module);
      for(const xx of [-1.19,1.19])box(.08,2.5,2.7,[xx,top+1.6,-.7],zinc,module);
      panel(1.9,1.85,[0,top+1.55,.625],module,blue);
      const fan=group([0,top+1.55,.96],module);fan.name='GK-circulation-fan';
      cylinder(.64,.42,[0,0,0],cast,fan,'z');flange(.68,[0,0,.25],fan,'z');
      cylinder(.56,.025,[0,0,.29],gasket,fan,'z');
      const impeller=group([0,0,.33],fan,true);impeller.name='GK-fan-impeller';
      cylinder(.14,.10,[0,0,0],zinc,impeller,'z');
      for(let n=0;n<8;n++){
        const blade=group([0,0,0],impeller);blade.rotation.z=n*Math.PI/4;
        box(.18,.39,.045,[.08,.32,0],zinc,blade,.01).rotation.z=.25;
      }
      rotors.push({object:impeller,axis:'z',zone:'GK',speed:2.4});
      for(const r of [.25,.41,.56])ring(r,.012,[0,0,.4],zinc,fan,'z');
      for(let n=0;n<8;n++){const a=n*Math.PI/4;rod([0,0,.42],[Math.cos(a)*.59,Math.sin(a)*.59,.42],.01,zinc,fan);}
      gearmotor([.3,top+2.91,-.8],module,.6);
      for(const xx of [-.94,.94]){
        for(let y=top+.55;y<top+2.6;y+=.18)box(.23,.035,.03,[xx,y,.67],gasket,module);
      }
      // Each recirculation module joins the common roof manifold.
      pipe([[0,top+2.85,-.7],[0,top+3.12,-.7]],.24,zinc,module);
      flange(.30,[0,top+2.94,-.7],module,'y',8);
      textPlate(`DRY ZONE 0${index+1}`,1.5,.22,[0,top+.52,.69],module);
      // A service module with inspection window, valve train and instruments.
      for(const side of [-1,1]){
        const service=group([0,0,side*(W+.1)],module);if(side<0)service.rotation.y=Math.PI;
        panel(2.6,1.25,[0,2.95,0],service,blue);
        box(.63,.35,.025,[-.65,3.02,.07],gasket,service);
        for(let i=0;i<5;i++)box(.66,.02,.035,[-.65,2.88+i*.07,.095],zinc,service);
        gauge([.39,3.12,.14],service);
        for(const y of [2.58,3.45])handle([1.12,y,.1],service);
        pipe([[-1.0,1.9,.26],[-.2,1.9,.26],[-.2,2.42,.26]],.045,zinc,service);
        valve([-.6,1.9,.26],service,'x');
        for(const [i,mat] of [m.green??blue,m.red].entries())cylinder(.045,.025,[.78+i*.16,3.33,.07],mat,service,'z',undefined,10);
        textPlate(`ZONE 0${index+1}`,1.0,.19,[0,2.68,.07],service);
      }
    }
    cylinder(.32,houses.at(-1)-houses[0]+.7,[0,top+3.12,-.7],zinc,dry,'x');
    for(const x of houses){
      flange(.39,[x+.45,top+3.12,-.7],dry,'x',10);
      for(const z of [-W-.18,W+.18])box(.055,top-.35,.10,[x-1.8,(top+.25)/2,z],zinc,dry);
    }
    // Raised grating, handrails and a caged ladder make the roof service route visible.
    const walkway=group([0,0,1.79],dry);walkway.name='GK-roof-service-walkway';
    box(len-.5,.09,.68,[0,top+.28,0],cast,walkway);
    for(let x=boxWest+.3;x<boxEast-.2;x+=.22)box(.045,.025,.65,[x,top+.34,0],zinc,walkway);
    for(let x=boxWest+.3;x<=boxEast-.3;x+=(len-.6)/16){
      rod([x,top+.3,.36],[x,top+1.35,.36],.027,m.yellow,walkway);
      box(.10,.20,.26,[x,top+.15,0],cast,walkway);
    }
    for(const y of [top+.8,top+1.35])rod([boxWest+.3,y,.36],[boxEast-.3,y,.36],.027,m.yellow,walkway);
    box(len-.6,.12,.03,[0,top+.4,.36],m.yellow,walkway);
    ladder(top+.35,boxEast-.6,W+.34,dry,true);
    for(const side of [-1,1]){
      pipe([[boxWest+.3,.75,side*(W+.24)],[boxEast-.3,.75,side*(W+.24)]],.055,zinc,dry);
      box(len-.8,.12,.22,[0,3.9,side*(W+.18)],cast,dry);
    }
    cylinder(.38,3.1,[len/2-.9,top+1.55,-1.5],zinc,dry);
  }
  // The BEUMER line owns the packaging (GP) geometry.
  function GP(){}
  return {CR,TY,BS,GR,GK,GP,hollowHopper,gearmotor,fence,panel,handle,bolt,flange,cylinder,gauge,valve,zinc,blue,enamel,cast,wire};
}
