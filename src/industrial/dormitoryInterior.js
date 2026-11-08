import {OLD_RAIL_DORMITORY as H} from './siteLayout.js';

// Low partition tops are the section cut of the existing railway-side hall.
// Four twin rooms share the glazed entrance corridor.
export function buildDormitoryInterior(k,parent){
  const {box,cyl,group,material,textPlate,m}=k;
  const root=group([H.x,0,H.z],parent,true);root.name='rail-dormitory-interior';
  const wall=material('#e7e4db',0,.9),floor=material('#bba991',0,.92);
  const timber=material('#896d50',0,.85),linen=material('#efeee5',0,.97);
  const blankets=['#729b95','#b7a16c','#849ba9','#a58b79'].map(c=>material(c,0,.98));
  const west=-H.width/2+.2,east=H.width/2-.2,north=-H.depth/2+.2,south=H.depth/2-.2;
  const front=north+H.corridor,pitch=(east-west)/H.rooms,rooms=[];
  box(east-west,.03,H.corridor,[(west+east)/2,.06,north+H.corridor/2],m.floor,root);
  const label=textPlate('ÝATAKHANA · 2 ADAMLY OTAGLAR',9,.45,[0,.09,north+.6],root,'#385666','#e8ecee');
  label.rotation.x=-Math.PI/2;
  function partition(w,d,x,z,parent=root){
    return box(w,1.45,d,[x,.805,z],wall,parent);
  }
  partition(H.width,.14,0,south+.13);
  for(const x of [west-.13,east+.13])partition(.14,H.depth,x,0);
  // Keep the external central doorway open into the shared corridor.
  for(const [a,b] of [[west,-.75],[.75,east]])partition(b-a,.14,(a+b)/2,north-.13);
  for(let i=0;i<H.rooms;i++){
    const x=west+pitch*(i+.5),room=group([x,0,0],root);
    room.name=`dormitory-room-${i+1}`;room.userData.capacity=2;
    box(pitch-.12,.025,south-front,[0,.07,(front+south)/2],floor,room);
    if(i>0)partition(.12,south-front,-pitch/2,(front+south)/2,room);
    for(const [a,b] of [[-pitch/2,-.5],[.5,pitch/2]])partition(b-a,.12,(a+b)/2,front,room);
    for(const xx of [-.5,.5])box(.07,2.18,.13,[xx,1.17,front],timber,room);
    box(1.07,.1,.13,[0,2.26,front],timber,room);
    const door=group([-.49,.08,front],room);door.rotation.y=-Math.PI/2;
    box(.93,2.04,.045,[.465,1.02,0],timber,door);
    box(.13,.035,.06,[.81,.98,-.045],m.steel,door);
    const number=textPlate(`${String(i+1).padStart(2,'0')} · 2 ADAM`,.85,.19,[0,2.31,front-.09],room,'#385666','#e8ecee');
    number.rotation.y=Math.PI;
    const beds=[];
    for(const xx of [-1.03,1.03]){
      const bed=group([xx,.08,1.55],room);bed.name='single-bed';
      box(1.03,.25,2.12,[0,.22,0],timber,bed,.03);
      box(.96,.20,2.02,[0,.445,0],linen,bed,.045);
      box(.97,.065,1.38,[0,.565,-.25],blankets[i],bed,.025);
      box(.69,.14,.38,[0,.61,.72],linen,bed,.06);
      box(1.06,.88,.09,[0,.44,1.08],timber,bed,.02);
      for(const x of [-.41,.41])for(const z of [-.9,.9])box(.08,.17,.08,[x,.085,z],timber,bed);
      beds.push(bed);
    }
    box(.43,.48,.44,[0,.32,2.35],timber,room,.02);
    box(.45,.04,.46,[0,.58,2.35],linen,room);
    const wardrobe=group([-1.45,.08,front+.55],room);wardrobe.name='room-wardrobe';
    box(.85,1.95,.57,[0,.975,0],timber,wardrobe,.02);
    for(const xx of [-.21,.21]){
      box(.40,1.82,.025,[xx,.98,.3],floor,wardrobe);
      box(.025,.16,.035,[xx*.3,.98,.33],m.steel,wardrobe);
    }
    const desk=group([1.25,.08,front+.52],room);desk.name='room-desk';
    box(1.3,.07,.62,[0,.75,0],timber,desk);
    for(const x of [-.55,.55])for(const z of [-.24,.24])box(.055,.73,.055,[x,.365,z],m.dark,desk);
    box(.42,.04,.28,[.2,.81,0],linen,desk);
    cyl(.07,.24,[-.4,.91,-.1],m.steel,desk);
    cyl(.14,.15,[-.4,1.10,-.1],linen,desk,.08);
    const chair=group([1.25,.08,front+1.12],room);
    box(.46,.065,.43,[0,.43,0],blankets[i],chair,.025);
    box(.46,.45,.06,[0,.67,.22],timber,chair,.02);
    for(const x of [-.18,.18])for(const z of [-.17,.17])box(.045,.4,.045,[x,.2,z],m.dark,chair);
    rooms.push({root:room,beds,wardrobe,desk,door,entry:[x,front],bounds:[x-pitch/2,x+pitch/2,front,south]});
  }
  return {root,rooms,corridor:{west,east,north,south:front}};
}
