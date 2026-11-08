import {localPoint,BOARD_START,BOARD_LINE_Z,BOARD_DRYER,BOARD_RETURN_X,BOARD_DRYER_Z} from './processPlan.js';

// October 27 hall photos: paper parent-roll stands with red arms and operator
// panels under a yellow-railed mezzanine, an electrical panel row beside the
// dryer infeed and a stair-served bag filter near the dryer return.
export const BOARD_MEZZANINE={west:-30,east:-15.5,north:BOARD_LINE_Z-1.9,south:BOARD_LINE_Z+1.9,y:4.2};
// IMG_6754 markup: both parent-roll stands sit at the west end of the hall
// under their own splicer mezzanine, with loading rails toward the aisle.
export const BOARD_PAPER_STANDS=[-40,-37];
export const BOARD_PAPER_Z=-12.9;
export const BOARD_SPLICER_DECK={west:-42.8,east:-35.5,north:-14.5,south:-11.4,y:4};
// Panel row beside the dryer infeed; bag filter clear of the return rollers.
export const BOARD_PANEL_ROW={west:BOARD_DRYER.entryX+.5,east:BOARD_DRYER.entryX+6.1,z:BOARD_DRYER.z-4.2};
export const BOARD_DUST_FILTER={x:3,z:-26.6,width:4.2,depth:3.2,legs:3.2,height:8};
export const BOARD_DUST_PICKUP={x:BOARD_RETURN_X,z:BOARD_DRYER_Z-2.8,y:3.55};

export function buildBoardLineHall(k,{root,equipment}){
  const {box,cyl,rod,pipe,group,material,textPlate,railing,m}=k;
  const white=material('#eeeee8',.16,.6),red=material('#a8282b',.3,.45),grey=material('#a9aeb0',.4,.5);
  const deckGrey=material('#c6cacb',.5,.5),turquoise=material('#16858f',.2,.5),kraft=material('#b89a72',0,.85);
  const duct=material('#eceeec',.2,.55),steelGrey=material('#9aa1a4',.45,.5),hose=material('#d22a22',.1,.6);
  const parts=group([0,0,0],root);parts.name='board-line-hall';

  // Parent-roll stands: red side frames on a pivot, a kraft roll, a yellow
  // loading rail toward the aisle and an operation panel beside each stand.
  for(const [i,x] of BOARD_PAPER_STANDS.entries()){
    const stand=group(localPoint([x,0,BOARD_PAPER_Z]),parts);stand.name=`board-paper-stand-${i+1}`;
    box(.55,.012,2.6,[0,.007,-2.3],m.yellow,stand);box(.14,.014,2.6,[0,.009,-2.3],m.black,stand);
    for(const z of [-.9,.9])box(.5,.02,.2,[0,.011,z>0?z:-1.05],red,stand);
    const roll=cyl(.8,1.2,[0,1.05,0],kraft,stand);roll.rotation.x=Math.PI/2;
    equipment.cylinder(.13,1.6,[0,1.05,0],m.steel,stand,'z');
    for(const z of [-.85,.85]){
      const arm=group([0,1.05,z],stand);arm.rotation.z=.55;
      box(.38,1.4,.2,[0,-.62,0],red,arm,.06);
      equipment.cylinder(.22,.22,[0,0,z>0?.1:-.1],m.black,arm,'z');
      box(.8,.3,.55,[.4,.15,z],red,stand,.04);
    }
    const panel=group([-1.6,0,-1.1],stand);panel.rotation.y=Math.PI;
    box(1.1,.9,.6,[0,.45,0],white,panel,.03);
    const desk=box(1.1,.08,.55,[0,.98,.04],grey,panel);desk.rotation.x=-.28;
    box(.3,.2,.02,[-.25,1.02,.24],m.black,panel);box(.26,.16,.01,[-.25,1.02,.255],m.blueLight,panel);
    for(const [j,x2] of [.05,.2,.35].entries())cyl(.035,.03,[x2,1.0,.22],[m.red,m.green??m.blueLight,m.yellow][j],panel);
    cyl(.07,.16,[.45,1.12,-.1],red,panel);
    textPlate('PARENT ROLL STAND',.8,.09,[0,.78,.305],panel,'#a8282b','#f4f4f0');
    // Red splicer head hanging beneath the deck housing.
    box(1.1,.55,.7,[0,3.05,0],red,stand,.04);box(.5,.2,.02,[0,3.1,-.36],white,stand);
  }
  // Splicer mezzanine: grey housings under the deck, yellow rails above.
  const S=BOARD_SPLICER_DECK,sw=S.east-S.west,sd=S.south-S.north;
  const splice=group(localPoint([(S.west+S.east)/2,0,(S.north+S.south)/2]),parts);splice.name='board-splicer-mezzanine';
  for(const [x,zs] of [[-sw/2,[-sd/2,sd/2]],[0,[sd/2]],[sw/2,[-sd/2,sd/2]]])for(const z of zs){
    box(.2,S.y,.2,[x,S.y/2,z],white,splice);box(.42,.04,.42,[x,.02,z],m.steel,splice);
  }
  for(const z of [-sd/2,sd/2])box(sw,.3,.16,[0,S.y-.15,z],white,splice);
  for(let x=-sw/2+.15;x<sw/2;x+=.3)box(.05,.04,sd,[x,S.y+.02,0],deckGrey,splice);
  box(sw-.4,.85,1.0,[0,S.y-.75,0],grey,splice);
  railing(sw,sd,S.y+.04,splice);
  // White inspection steps between the two stands.
  const treads=group(localPoint([BOARD_PAPER_STANDS[0]+2,0,BOARD_PAPER_Z]),parts);treads.name='board-paper-steps';
  box(.9,.06,.9,[0,1.0,.3],white,treads);for(const [x,z] of [[-.42,-.12],[.42,-.12],[-.42,.72],[.42,.72]])box(.06,1,.06,[x,.5,z],white,treads);
  for(let n=0;n<4;n++)box(.9,.05,.28,[0,.2+n*.2,-.3-(3-n)*.28],white,treads);
  for(const x of [-.45,.45]){rod([x,.2,-1.4],[x,1.0,-.15],.035,white,treads);rod([x,1.1,-1.4],[x,2.0,-.15],.03,m.yellow,treads);rod([x,2,-.15],[x,2,.75],.03,m.yellow,treads);}

  // October 27 markup: the top and bottom liners run from the two parent-roll
  // stands to the forming station. The top sheet passes through the splicer
  // housing and under the mezzanine; the bottom sheet runs just above the floor.
  function web(points,name){
    const g=group([0,0,0],parts);g.name=name;
    for(let i=1;i<points.length;i++){
      const [a,b]=[points[i-1],points[i]].map(p=>localPoint(p)),dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
      const run=Math.hypot(dx,dz),seg=group([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],g);
      seg.rotation.y=-Math.atan2(dz,dx);
      box(Math.hypot(run,dy),.006,1.2,[0,0,0],kraft,seg).rotation.z=Math.atan2(dy,run);
      // A guide roller at every bend.
      if(i<points.length-1)equipment.cylinder(.07,1.45,[b[0],b[1]-.08,b[2]],m.steel,g,'z');
    }
    return g;
  }
  const [topStand,bottomStand]=BOARD_PAPER_STANDS,formX=BOARD_START[0],L=BOARD_LINE_Z,P=BOARD_PAPER_Z;
  web([[topStand,1.85,P],[topStand+1.5,3.25,P],[S.east-.4,3.25,P],[S.east+1,3.4,L],[formX-1.6,3.4,L],[formX-.6,3.22,L]],'board-top-paper');
  web([[bottomStand,.25,P],[bottomStand+1.4,.32,L],[formX-1.8,.32,L],[formX-.9,1.2,L]],'board-bottom-paper');

  // IMG_6732: spray-bar rack across the setting belt, white pipes with red
  // hose loops, and the next bottom-paper roll waiting beside the belt.
  const rack=group(localPoint([-20.6,0,BOARD_LINE_Z]),parts);rack.name='board-spray-rack';
  for(const z of [-1.55,1.55])box(.14,1.9,.14,[0,.95,z],white,rack);
  for(const [i,y] of [1.35,1.55,1.75].entries()){
    equipment.cylinder(.04,3.3,[0,y,0],white,rack,'z');
    for(let z=-1.1;z<=1.11;z+=.55){
      const dz=(i%2?.18:-.18);
      pipe([[0,y,z],[.05,y-.28,z+dz],[0,y-.05,z+dz*2]].map(([a,b,c])=>[a,b,c]),.018,hose,rack);
    }
  }
  const spare=cyl(.5,1.3,localPoint([-19.2,.5,BOARD_LINE_Z+2.1]),kraft,parts);spare.rotation.x=Math.PI/2;
  // Mezzanine over the paper stands and forming belt, open grating from above.
  const z0=BOARD_MEZZANINE.north,z1=BOARD_MEZZANINE.south,y=BOARD_MEZZANINE.y;
  const w=BOARD_MEZZANINE.east-BOARD_MEZZANINE.west,cx=(BOARD_MEZZANINE.west+BOARD_MEZZANINE.east)/2,d=z1-z0;
  const deck=group(localPoint([cx,0,(z0+z1)/2]),parts);deck.name='board-mezzanine';
  // IMG_6732: a grey steel frame over the belt, with knee braces at each post.
  const posts=[-w/2,-w/2+4.7,w/2-4.5,w/2];
  for(const x of posts)for(const z of [-d/2,d/2]){
    box(.22,y,.22,[x,y/2,z],steelGrey,deck);box(.45,.04,.45,[x,.02,z],m.steel,deck);
    for(const dx of [-.9,.9])if(Math.abs(x+dx)<w/2)rod([x,y-1,z],[x+dx,y-.3,z],.05,steelGrey,deck);
  }
  for(const z of [-d/2,d/2])box(w,.36,.18,[0,y-.18,z],steelGrey,deck);
  for(let x=-w/2;x<=w/2+.01;x+=w/6)box(.14,.26,d,[x,y-.13,0],steelGrey,deck);
  for(let x=-w/2+.15;x<w/2;x+=.3)box(.05,.04,d,[x,y+.02,0],deckGrey,deck);
  railing(w,d,y+.04,deck);
  // Steep white stair from the north edge down into the hall, clear of the
  // setting belt that now runs the full length beneath the mezzanine.
  const steps=21,run=.25,stair=group(localPoint([BOARD_MEZZANINE.west+.8,0,z0]),parts);stair.name='board-mezzanine-stair';
  stair.rotation.y=-Math.PI/2;
  for(let i=0;i<steps;i++)box(run+.02,.05,1,[-(steps-i)*run+run/2,(i+1)*y/steps-.025,0],white,stair);
  for(const z of [-.52,.52]){
    rod([-steps*run,0,z],[0,y,z],.06,white,stair);
    rod([-steps*run,1,z],[0,y+1,z],.03,m.yellow,stair);
    for(let i=0;i<=steps;i+=5)rod([-(steps-i)*run,i*y/steps,z],[-(steps-i)*run,i*y/steps+1,z],.025,m.yellow,stair);
  }

  // Electrical panel row on a white base beside the dryer infeed.
  const row=group(localPoint([(BOARD_PANEL_ROW.west+BOARD_PANEL_ROW.east)/2,0,BOARD_PANEL_ROW.z]),parts);row.name='board-electrical-row';row.rotation.y=Math.PI;
  const rw=BOARD_PANEL_ROW.east-BOARD_PANEL_ROW.west,count=Math.floor(rw/.8);
  box(rw,.22,.7,[0,.11,0],white,row);box(rw,.14,.66,[0,.29,0],m.black,row);
  for(let i=0;i<count;i++){
    const x=-rw/2+.4+i*rw/count;
    box(rw/count-.02,2,.6,[x,1.36,0],grey,row,.015);
    box(.04,1.9,.01,[x+rw/count/2-.05,1.36,.305],m.dark,row);
    if(i%2===0){box(.22,.16,.01,[x,1.95,.31],m.dark,row);for(let n=0;n<3;n++)cyl(.03,.02,[x-.08+n*.08,1.55,.31],n===0?m.red:m.blueLight,row).rotation.x=Math.PI/2;}
    else for(let n=0;n<4;n++)box(.2,.012,.008,[x,.95+n*.06,.31],m.dark,row);
  }
  box(.12,2,.62,[rw/2-.07,1.36,0],turquoise,row);

  // Bag filter: braced legs, hopper, insulated body, yellow stairs and rails.
  const F=BOARD_DUST_FILTER,filter=group(localPoint([F.x,0,F.z]),parts);filter.name='board-dust-filter';
  const fw=F.width,fd=F.depth,legY=F.legs;
  for(const x of [-fw/2,fw/2])for(const z of [-fd/2,fd/2]){box(.22,legY,.22,[x,legY/2,z],white,filter);box(.5,.05,.5,[x,.025,z],m.steel,filter);}
  for(const z of [-fd/2,fd/2]){rod([-fw/2,.2,z],[fw/2,legY-.2,z],.06,white,filter);rod([fw/2,.2,z],[-fw/2,legY-.2,z],.06,white,filter);}
  for(const x of [-fw/2,fw/2]){rod([x,.2,-fd/2],[x,legY-.2,fd/2],.06,white,filter);rod([x,.2,fd/2],[x,legY-.2,-fd/2],.06,white,filter);}
  box(fw+1.2,.14,fd+1.2,[0,legY,0],deckGrey,filter);railing(fw+1.2,fd+1.2,legY+.07,filter);
  const funnel=group([0,legY+.9,0],filter);funnel.scale.z=fd/fw;
  // The four-sided hopper must fit the 4.2 × 3.2 m filter footprint after its 45° rotation.
  cyl(.4,1.6,[0,0,0],white,funnel,fw*.355,4).rotation.y=Math.PI/4;
  box(fw,F.height-legY-2.6,fd,[0,legY+1.7+(F.height-legY-2.6)/2,0],white,filter);
  for(let x=-fw/2+.7;x<fw/2;x+=.7)box(.03,F.height-legY-2.8,.02,[x,legY+1.7+(F.height-legY-2.6)/2,fd/2+.01],grey,filter);
  box(fw,.12,fd,[0,F.height-.84,0],deckGrey,filter);railing(fw,fd,F.height-.78,filter);
  // Diagonal stair from the leg platform to the roof walkway.
  const flight=group([fw/2+.1,legY,-fd/2],filter),rise=F.height-.84-legY,steps2=Math.ceil(rise/.22);
  for(let i=0;i<steps2;i++)box(.9,.05,.26,[.45,(i+1)*rise/steps2,i*fd/steps2],deckGrey,flight);
  for(const x of [0,.9])rod([x,1,0],[x,rise+1,fd],.03,m.yellow,flight);
  // Floor fan and clean-air stack travel with the relocated filter.
  const fanX=F.x-4.2,fanZ=F.z,fan=group(localPoint([fanX,0,fanZ]),parts);fan.name='board-dust-fan';
  box(1.6,.12,1.2,[0,.06,0],m.steel,fan);equipment.cylinder(.7,.55,[0,.95,0],white,fan,'z');
  box(.5,.5,.5,[.9,.5,0],m.blueLight,fan,.04);equipment.gearmotor([-.2,.12,.55],fan,.5);
  pipe([localPoint([F.x-fw/2,F.height-1.4,F.z]),localPoint([fanX,F.height-1.4,F.z]),localPoint([fanX,1.65,fanZ])],.32,duct,parts);
  cyl(.32,6.2,localPoint([fanX,3.4,fanZ-.9]),duct,parts);
  // The long extraction duct finishes at the blue dryer-return conveyor,
  // directly above its own pickup hood; it no longer runs on toward BEUMER.
  const H=BOARD_DUST_PICKUP,hood=group(localPoint([H.x,0,H.z]),parts);hood.name='board-dust-pickup-hood';
  box(2.7,.16,1.45,[0,H.y,0],white,hood);
  // Keep the hood supports outside the receiving pallet's lowering pocket.
  for(const z of [-1.59,1.59])box(3.3,.14,.10,[0,H.y,z],steelGrey,hood);
  for(const x of [-1.6,1.6]){
    box(.10,.14,3.18,[x,H.y,0],steelGrey,hood);
    for(const z of [-1.59,1.59]){
      box(.10,H.y,.10,[x,H.y/2,z],steelGrey,hood);
      box(.27,.035,.27,[x,.018,z],m.steel,hood);
    }
  }
  box(2.35,.04,1.22,[0,H.y-.12,0],m.dark,hood);
  const extraction=group([0,0,0],parts);extraction.name='board-dust-extraction-duct';
  pipe([localPoint([F.x-fw/2,7.4,F.z]),localPoint([H.x,7.4,F.z]),localPoint([H.x,7.4,H.z]),localPoint([H.x,H.y+.13,H.z])],.3,duct,extraction);
  return parts;
}
