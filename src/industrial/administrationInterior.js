import {NEW_ADMINISTRATION as A} from './siteLayout.js';

// Illustrative office layout inside the existing facade, separate from all
// production assemblies. It remains visible when the exterior is cut away.
export function buildAdministrationInterior(k){
  const {group,box,cyl,rod,material,textPlate,m}=k;
  const west=A.x-A.width/2,east=A.productionWallX;
  const width=east-west,cx=(west+east)/2;
  const root=group([cx,A.ground,A.z],k.scene,true);root.name='new-administration-interior';
  const stone=material('#b9c1be',0,.92),white=material('#e0e3da',0,.86);
  const timber=material('#bca17c',0,.8),metal=material('#566c73',.35,.6);
  const fabric=material('#527d79',0,.95),screen=material('#234958',.15,.48);
  const glass=material('#a3c4ca',.1,.4,{transparent:true,opacity:.30,depthWrite:false});
  const floor=box(width-.36,.14,A.depth-.36,[0,-.07,0],stone,root);floor.name='administration-office-floor';
  const furniture=[],desks=[],partitions=[];
  const left=-width/2+.25,right=width/2-.25,end=A.depth/2-.25;
  function wall(w,d,x,z,name){
    const piece=box(w,1.12,d,[x,.56,z],white,root);piece.name=name;partitions.push(piece);return piece;
  }
  // Low cut edges show the building boundary without obscuring the work rooms.
  for(const z of [-end,end])wall(width-.38,.14,0,z,'administration-cutaway-end-wall');
  for(const [x,gap,name] of [[left,2.4,'administration-front-cut-wall'],[right,1.6,'administration-production-partition']]){
    for(const side of [-1,1])wall(.14,end-gap/2,x,side*(end+gap/2)/2,name);
  }
  for(const z of [-3.35,3.8])for(const [x0,x1] of [[left,-.9],[.9,right]]){
    wall(x1-x0,.12,(x0+x1)/2,z,'administration-office-divider');
    box(x1-x0,.62,.035,[(x0+x1)/2,1.43,z],glass,root);
    box(x1-x0,.035,.045,[(x0+x1)/2,1.76,z],metal,root);
  }
  function chair(x,z,yaw=0){
    const g=group([x,0,z],root);g.rotation.y=yaw;g.name='administration-office-chair';
    cyl(.055,.40,[0,.24,0],metal,g);
    for(let n=0;n<5;n++){
      const a=n*Math.PI*2/5;rod([0,.10,0],[Math.cos(a)*.27,.10,Math.sin(a)*.27],.025,metal,g);
    }
    box(.49,.09,.48,[0,.47,0],fabric,g,.04);
    box(.49,.43,.07,[0,.72,.235],fabric,g,.03);
    furniture.push(g);return g;
  }
  function workstation(x,z,yaw){
    const g=group([x,0,z],root);g.rotation.y=yaw;g.name='administration-workstation';
    box(1.55,.075,.78,[0,.765,0],timber,g,.025);
    for(const xx of [-.64,.64])for(const zz of [-.27,.27])box(.055,.72,.055,[xx,.36,zz],metal,g);
    box(.36,.58,.58,[.52,.34,0],white,g,.015);
    for(const y of [.17,.36,.55])box(.18,.025,.025,[.52,y,.303],metal,g);
    box(.24,.025,.18,[-.12,.82,-.15],metal,g);
    box(.04,.20,.04,[-.12,.92,-.18],metal,g);
    box(.62,.39,.045,[-.12,1.10,-.18],metal,g,.015);
    box(.55,.31,.015,[-.12,1.10,-.15],screen,g);
    box(.47,.025,.17,[-.14,.82,.19],white,g);
    box(.09,.025,.12,[.25,.82,.20],metal,g,.015);
    box(.18,.035,.25,[-.62,.82,.15],m.paper,g);
    chair(x+Math.sin(yaw)*.86,z+Math.cos(yaw)*.86,yaw);
    furniture.push(g);desks.push(g);
  }
  for(const z of [-10.65,-7.85,-5.05]){
    workstation(-2.60,z,Math.PI/2);workstation(2.35,z,-Math.PI/2);
  }
  for(const z of [5.25,8.05,10.85])workstation(-2.6,z,Math.PI/2);
  const reception=group([1.55,0,2.15],root);reception.name='administration-reception';
  box(2.1,.84,.7,[0,.42,0],white,reception,.025);
  box(2.2,.075,.8,[0,.875,0],timber,reception,.025);furniture.push(reception);
  const meeting=group([1.7,0,8.2],root);meeting.name='administration-meeting-table';
  box(1.15,.09,4.0,[0,.77,0],timber,meeting,.05);
  for(const z of [-1.4,1.4])box(.65,.72,.14,[0,.36,z],metal,meeting);
  box(.45,.035,.33,[0,.84,0],m.paper,meeting);furniture.push(meeting);
  for(const z of [6.8,8.2,9.6])for(const side of [-1,1])chair(1.7+side*1.06,z,side>0?Math.PI/2:-Math.PI/2);
  for(const x of [-2,0,2]){
    const cabinet=group([x,0,-12.05],root);cabinet.name='administration-document-cabinet';
    box(1.2,1.6,.5,[0,.8,0],white,cabinet);
    for(const side of [-1,1]){
      box(.57,1.48,.025,[side*.30,.8,.263],timber,cabinet);
      box(.025,.16,.03,[side*.08,.82,.29],metal,cabinet);
    }
    furniture.push(cabinet);
  }
  // A continuous centre aisle connects the entrance, office rooms and hall door.
  box(width-.5,.012,1.8,[0,.008,0],material('#d6d6c9',0,.94),root);
  const title=textPlate('EDARA · IŞ ÝERLERI',5.3,.42,[0,.026,-1.25],root,'#38586a','#d6d6c9');title.rotation.x=-Math.PI/2;
  const meetingTitle=textPlate('MASLAHAT OTAGY',3.3,.3,[1.65,.026,11.3],root,'#38586a','#b9c1be');meetingTitle.rotation.x=-Math.PI/2;
  return {root,floor,furniture,desks,partitions};
}
