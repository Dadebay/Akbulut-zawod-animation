import {localPoint} from './processPlan.js';

// Glazed monitoring room in the rear return, after the user's October 27
// reference: a white booth with a black-framed glass front towards the hall.
// Operators face the production floor; the video wall sits on the back wall.
export function buildControlRoom(k,root,room){
  const {box,group,material,textPlate,m}=k,W=room.controlWindow;
  const g=group(localPoint([room.x,0,room.z]),root);g.name='control-room';
  const hx=room.width/2-.18,hz=room.depth/2-.18,front=-hz+.06;
  const white=material('#f2f3f0',.04,.8),frame=material('#1d2226',.35,.45);
  const glass=material('#9fbcb7',.12,.4,{transparent:true,opacity:.3,depthWrite:false});
  const desk=material('#d9dcd8',.06,.7),screen=material('#163447',.1,.35,{emissive:'#2a6f9c',emissiveIntensity:.5});
  const status=['#3ca878','#e0a43a','#3ca878','#d0503e'].map(c=>material(c,0,.4,{emissive:c,emissiveIntensity:.8}));
  const seat=material('#3a4650',0,.9);
  const left=W.west-room.x,right=W.east-room.x,span=right-left,glassHeight=W.head-W.sill;

  // Front: white sill and header, black mullions, full-height glass panes.
  const facade=group([0,0,front],g);facade.name='control-room-glazing';
  box(hx*2,W.sill,.12,[0,W.sill/2,0],white,facade);
  box(hx*2,.6,.12,[0,W.head+.3,0],white,facade);
  for(const [a,b] of [[-hx,left],[right,hx]])box(b-a,glassHeight,.12,[(a+b)/2,(W.sill+W.head)/2,0],white,facade);
  box(span,glassHeight,.02,[(left+right)/2,(W.sill+W.head)/2,0],glass,facade);
  const panes=Math.round(span/.9);
  for(let i=0;i<=panes;i++){
    const x=left+i*span/panes;
    box(.06,glassHeight,.14,[x,(W.sill+W.head)/2,0],frame,facade);
    box(.012,W.sill-.08,.01,[x,W.sill/2,-.065],frame,facade);
  }
  for(const y of [W.sill+.03,W.head-.03])box(span+.06,.06,.14,[(left+right)/2,y,0],frame,facade);
  const sign=textPlate('DOLANDYRYŞ OTAGY',2.6,.3,[(left+right)/2,W.head+.3,-.065],facade,'#1d2226','#f2f3f0');
  sign.rotation.y=Math.PI;

  // Operator console along the glass, three workstations with three screens.
  const bench=group([0,0,front+.62],g);bench.name='control-room-console';
  const length=span-.1;
  box(length,.06,.85,[(left+right)/2,.76,0],desk,bench);
  box(length,.7,.04,[(left+right)/2,.37,-.38],frame,bench);
  for(const x of [left+.08,right-.08])box(.05,.73,.8,[x,.365,0],frame,bench);
  for(const [n,x] of [-span/3,0,span/3].entries()){
    const cx=(left+right)/2+x;
    // Three 0.48 m screens per 1.5 m workstation; the angled side screens
    // stay inside their own station instead of crossing into the next.
    for(const turn of [-1,0,1]){
      const monitor=group([cx+turn*.5,0,-.2+Math.abs(turn)*.07],bench);monitor.rotation.y=-turn*.3;
      box(.04,.2,.04,[0,.89,0],frame,monitor);box(.2,.02,.15,[0,.8,0],frame,monitor);
      box(.48,.32,.04,[0,1.1,0],frame,monitor);box(.44,.28,.01,[0,1.1,.022],screen,monitor);
      for(let row=0;row<3;row++)box(.1+((n+row+turn)%3)*.07,.022,.004,[-.14+((n+row+turn)%3)*.035,1.17-row*.06,.03],status[(n+row+turn+3)%4],monitor);
    }
    box(.44,.02,.15,[cx,.8,.17],frame,bench);
    box(.07,.02,.11,[cx+.32,.8,.18],frame,bench);
    chair(cx,front+1.45);
  }

  // Video wall above the shaft doorway on the back wall, clear of both doors.
  const wall=group([0,0,hz-.06],g);wall.name='control-room-video-wall';
  box(3.62,1.36,.1,[0,3.22,0],frame,wall);
  for(const x of [-1.2,0,1.2])for(const y of [2.89,3.51]){
    box(1.16,.58,.01,[x,y,-.055],screen,wall);
    for(let i=0;i<3;i++)box(.18,.08,.004,[x-.4+i*.4,y+.17-(i%2)*.28,-.062],status[(i+Math.round(x+y))%4],wall);
  }
  const caption=textPlate('ZAWOD · SCADA',1.4,.2,[0,4.05,-.01],wall,'#e2eaee','#1d2226');caption.rotation.y=Math.PI;

  // SCADA server cabinet against the west wall, south of the doorway.
  const cabinet=k.cabinet([-hx+.23,0,hz-1.1],g);cabinet.rotation.y=Math.PI/2;cabinet.name='control-room-scada-cabinet';

  function chair(x,z){
    const c=group([x,0,z],g);c.name='control-room-chair';
    k.cyl(.05,.4,[0,.24,0],frame,c);
    for(let a=0;a<5;a++)k.rod([0,.08,0],[Math.cos(a*1.257)*.28,.06,Math.sin(a*1.257)*.28],.022,frame,c);
    box(.5,.09,.48,[0,.47,0],seat,c,.04);box(.5,.55,.07,[0,.78,.24],seat,c,.03);
    return c;
  }
  return g;
}
