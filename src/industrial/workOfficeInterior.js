import {OLD_WORK_OFFICE as H} from './siteLayout.js';

// Local X follows the long glazed facade; positive Z faces the courtyard.
// The open front gallery exposes both working levels in the equipment view.
export function buildWorkOfficeInterior(k,parent){
  const {box,cyl,rod,group,material,textPlate,m}=k;
  const root=group([H.x,0,H.z],parent,true);root.rotation.y=-Math.PI/2;
  root.name='old-work-office-interior';
  const white=material('#e3e3d9',0,.88),timber=material('#b29a79',0,.83);
  const floor=material('#b5b9b5',0,.93),carpet=material('#80958e',0,.98);
  const frame=material('#657b78',.42,.57),screen=material('#253e4d',.18,.55);
  const glass=material('#9fbcb7',.12,.4,{transparent:true,opacity:.35,depthWrite:false});
  const floors=[],desks=[],furniture=[],treads=[];
  for(const [index,y] of [H.ground,H.upper].entries()){
    const level=group([0,y,0],root);level.name=`office-work-floor-${index+1}`;
    level.userData.floor=index+1;floors.push(level);
    const depth=index===0?7:4,centre=index===0?0:-1.5;
    const slab=box(18,.16,depth,[0,-.08,centre],floor,level);
    slab.name='office-floor-slab';
    // Rear wall and low end sections make the cut plane legible.
    box(18,1.15,.12,[0,.575,-3.5],white,level);
    for(const x of [-9,9])box(.12,1.15,depth,[x,.575,centre],white,level);
    const title=textPlate(`${index+1}-NJI GAT · IŞ ÝERI`,3.6,.35,[-6.8,1.24,-3.41],level,'#36574e','#e3e3d9');
    title.name='office-floor-sign';
  }
  const [ground,upper]=floors;
  const clearHeight=H.upper-H.ground-.16;
  for(const x of [-8.8,-3.7,3.7,8.8])
    box(.14,clearHeight,.14,[x,clearHeight/2,.35],frame,ground);
  box(18,.20,.18,[0,-.26,.35],frame,upper);
  const landing=box(1.15,.16,1.5,[4.225,-.08,1.25],floor,upper);
  landing.name='office-upper-landing';
  function chair(x,z,parent,yaw=0){
    const g=group([x,0,z],parent);g.rotation.y=yaw;g.name='office-chair';
    cyl(.055,.40,[0,.24,0],frame,g);
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      rod([0,.09,0],[Math.cos(a)*.27,.09,Math.sin(a)*.27],.025,frame,g);
      cyl(.045,.07,[Math.cos(a)*.27,.06,Math.sin(a)*.27],m.rubber,g);
    }
    box(.49,.09,.48,[0,.47,0],carpet,g,.04);
    box(.49,.45,.065,[0,.72,.235],carpet,g,.03);
    return g;
  }
  function workstation(x,z,parent){
    const desk=group([x,0,z],parent);desk.name='office-workstation';
    box(1.55,.075,.75,[0,.765,0],timber,desk,.025);
    for(const xx of [-.64,.64])for(const zz of [-.27,.27])box(.055,.72,.055,[xx,.36,zz],frame,desk);
    box(.36,.56,.58,[.5,.34,0],white,desk,.015);
    for(const y of [.17,.36,.55])box(.18,.025,.025,[.5,y,.303],frame,desk);
    box(.25,.025,.18,[-.12,.82,-.15],frame,desk);
    box(.04,.20,.04,[-.12,.92,-.18],frame,desk);
    box(.62,.39,.045,[-.12,1.10,-.18],frame,desk,.015);
    box(.55,.31,.015,[-.12,1.10,-.15],screen,desk);
    box(.47,.025,.17,[-.14,.82,.19],white,desk);
    box(.09,.025,.12,[.25,.82,.20],frame,desk,.015);
    box(.18,.035,.25,[-.62,.82,.15],m.paper,desk);
    const seat=chair(x,z+.85,parent);
    desks.push(desk);furniture.push(desk,seat);
  }
  for(const x of [-7.6,-5.3,-.7,1.6,4,6.3])workstation(x,-2.55,ground);
  // The doorway now sits mid-facade, so this pair moves clear of its straight aisle.
  for(const x of [1.7,3.75])workstation(x,.25,ground);
  for(const x of [-7.7,-5.5,-3.3,-1.1,1.1,3.3,5.5,7.7])workstation(x,-2.5,upper);

  // Reception sits beside the existing doorway, keeping its straight path open.
  const reception=group([-4.65,0,2.5],ground);reception.name='office-reception';
  box(1.8,.84,.67,[0,.42,0],white,reception,.025);
  box(1.9,.07,.75,[0,.875,0],timber,reception,.025);
  box(.65,.20,.025,[0,.57,.35],frame,reception);
  furniture.push(reception);
  const meeting=group([-7.15,0,.65],ground);meeting.name='office-meeting-table';
  box(2.25,.09,1.05,[0,.77,0],timber,meeting,.05);
  for(const x of [-.8,.8])box(.14,.72,.65,[x,.36,0],frame,meeting);
  box(.5,.03,.35,[.1,.84,0],m.paper,meeting);
  furniture.push(meeting);
  for(const x of [-7.85,-6.45])for(const side of [-1,1]){
    const seat=chair(x,.65+side*.95,ground,side<0?Math.PI:0);furniture.push(seat);
  }
  // Glass screens separate work bays without hiding the two floor levels.
  for(const [level,x] of [[ground,-3.85],[upper,-4.4]]){
    box(.045,1.05,2.7,[x,.60,-2],glass,level);
    for(const z of [-3.35,-.65])box(.045,1.18,.045,[x,.59,z],frame,level);
    box(.05,.045,2.7,[x,1.16,-2],frame,level);
  }
  function guard(a,b,y,parent){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/1.1);
    for(let i=0;i<=count;i++){
      const t=i/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      rod([x,y,z],[x,y+1.05,z],.028,frame,parent);
    }
    for(const h of [.50,1.05])rod([a[0],y+h,a[1]],[b[0],y+h,b[1]],.028,frame,parent);
  }
  for(const [a,b] of [[[-9,.5],[3.65,.5]],[[4.8,.5],[9,.5]],[[3.65,.5],[3.65,2]],[[3.65,2],[4.8,2]]])
    guard(a,b,0,upper);

  // Two connected eight-riser flights return to an open landing on the gallery.
  const stairs=group([0,H.ground,0],root);stairs.name='office-two-flight-stair';
  const rise=(H.upper-H.ground)/16,run=.37,start=4.8;
  for(let flight=0;flight<2;flight++){
    const z=flight===0?2.5:1.3;
    for(let i=0;i<8;i++){
      const x=flight===0?start+(i+.5)*run:start+(7.5-i)*run;
      const y=(flight*8+i+1)*rise;
      const tread=box(run+.015,.07,1.1,[x,y-.035,z],white,stairs);
      tread.name='office-stair-tread';tread.userData.top=H.ground+y;treads.push(tread);
      box(run,.015,.045,[x,y+.007,z+.5],frame,stairs);
    }
    const x0=flight===0?start:start+8*run,x1=flight===0?start+8*run:start;
    const y0=flight*8*rise,y1=(flight+1)*8*rise;
    for(const side of [-1,1]){
      const zz=z+side*.55;
      rod([x0,y0-.10,zz],[x1,y1-.10,zz],.045,frame,stairs);
      rod([x0,y0+1,zz],[x1,y1+1,zz],.028,frame,stairs);
      for(const t of [0,.5,1]){
        const x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
        rod([x,y,zz],[x,y+1,zz],.025,frame,stairs);
      }
    }
  }
  const middle=box(1.1,.10,2.3,[8.31,8*rise-.05,1.9],floor,stairs);
  middle.name='office-stair-mid-landing';
  guard([8.86,.75],[8.86,3.05],8*rise,stairs);
  for(const z of [.75,3.05])guard([7.76,z],[8.86,z],8*rise,stairs);
  return {root,floors,desks,furniture,stairs,treads,landing};
}
