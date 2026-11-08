import * as T from 'three';
import {localPoint,BEUMER_LINE,BAG_ROUTE,BOARD_LINE_Z,BOARD_END} from './processPlan.js';
import {buildBoardPalletizer} from './boardPalletizer.js';
import {BAG_STOCK,buildBagStock} from './bagStock.js';
import {buildBeumerMachines} from './beumerMachines.js';

// The BEUMER bag stacker is centred on GP-001. The independent board packer
// stands farther east, outside the BEUMER bag feed and its safety curtains.
// The inclined, yellow-railed bag conveyor arrives from the process building.
// The inclined belt begins after the level factory outlet and its 90° turn.
// Its surface sits just below the bags travelling on BAG_ROUTE.
export const BEUMER_BAG_FEED=BAG_ROUTE.slice(1).map(([x,y,z])=>[x,y-.07,z]);
export const BEUMER_SECONDARY_FEED=BAG_ROUTE.slice(1).map(([,y,z])=>[BEUMER_LINE.west+5.5,y-.07,z]);

export function buildBeumerLine(k,{root,equipment}){
  const {box,rod,group,material,m}=k;
  const blue=material('#1f6fb8',.35,.42),grey=material('#b8bcbd',.3,.55),light=material('#dfe2e1',.12,.62);
  const galvanised=material('#c3cacd',.75,.32),darkGrey=material('#5d6468',.4,.55);
  const white=material('#eeeee8',.16,.6),deck=material('#c6cacb',.5,.5);
  const Z=BEUMER_LINE.z,W=BEUMER_LINE.west,line=group([0,0,0],root);line.name='beumer-line';
  const at=(x,y,z,parent=line)=>group(localPoint([x,y,z]),parent);

  function rollers(x0,x1,width=1.3){
    const g=at((x0+x1)/2,0,Z),L=x1-x0;g.name='beumer-roller-conveyor';
    for(const z of [-width/2,width/2]){box(L,.16,.07,[0,1.04,z],light,g);for(let x=-L/2+.2;x<L/2;x+=1.5){box(.07,.98,.07,[x,.49,z],light,g);box(.22,.03,.18,[x,.015,z],darkGrey,g);}}
    for(let x=-L/2+.08;x<L/2;x+=.16)equipment.cylinder(.04,width-.1,[x,1.14,0],galvanised,g,'z');
    for(let x=-L/2+1;x<L/2-.5;x+=3)equipment.gearmotor([x,.36,width/2+.3],g,.32,Math.PI/2);
    return g;
  }
  const machines=buildBeumerMachines(k,{parent:line,equipment});
  rollers(W+3,BAG_STOCK.infeedX);

  // Paired elevated belts and outside service walkways follow the photographs.
  // The primary belt keeps the exact animated bag route.
  for(const [index,points] of [BEUMER_BAG_FEED,BEUMER_SECONDARY_FEED].entries()){
    const [a,b]=points.map(p=>new T.Vector3(...p)),run=b.clone().sub(a),length=run.length();
    const feed=group(localPoint([(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2]),line);
    feed.name=index?'beumer-secondary-bag-feed':'beumer-bag-feed';
    feed.rotation.y=-Math.atan2(run.z,run.x);
    const pitch=group([0,0,0],feed);pitch.rotation.z=Math.atan2(run.y,Math.hypot(run.x,run.z));
    box(length,.12,.9,[0,0,0],m.rubber,pitch);
    for(const z of [-.5,.5])box(length,.30,.06,[0,-.05,z],light,pitch);
    for(let x=-length/2+.5;x<length/2-.4;x+=1.25){
      equipment.cylinder(.065,.88,[x,-.12,0],galvanised,pitch,'z',undefined,10);
      box(.09,.12,1.14,[x,-.23,0],light,pitch);
    }
    const side=index?1:-1;
    const walkwayLength=length*(a.z-(Z+1.5))/(a.z-b.z),walkwayCentre=(walkwayLength-length)/2;
    box(walkwayLength,.05,.7,[walkwayCentre,-.02,side*.9],deck,pitch);
    for(let x=-length/2;x<=walkwayLength-length/2+.01;x+=walkwayLength/Math.ceil(walkwayLength/1.6))
      rod([x,0,side*1.25],[x,1.05,side*1.25],.027,m.yellow,pitch);
    for(const y of [.5,1.05]){
      box(walkwayLength,.045,.045,[walkwayCentre,y,side*1.25],m.yellow,pitch);
      box(.045,.045,.7,[walkwayLength-length/2,y,side*.9],m.yellow,pitch);
    }
    box(walkwayLength,.12,.035,[walkwayCentre,.08,side*1.25],m.yellow,pitch);
    const spans=Math.max(2,Math.round(length/4));
    for(let i=0;i<spans;i++){
      const p=a.clone().lerp(b,i/spans);
      if(p.z>BOARD_LINE_Z-2.4)continue;
      const leg=at(p.x,0,p.z);leg.rotation.y=feed.rotation.y;
      const h=p.y-.2;
      for(const z of [side*1.1,-side*.55]){box(.14,h,.14,[0,h/2,z],white,leg);box(.32,.04,.32,[0,.02,z],darkGrey,leg);}
      box(.14,.14,1.8,[0,h,side*.27],white,leg);
      rod([0,.2,side*1.1],[0,h-.2,-side*.55],.035,white,leg);
    }
    if(index){
      const outlet=at(a.x,a.y,a.z);outlet.name='beumer-secondary-factory-outlet';
      box(1.05,.10,1.35,[0,0,.4],m.rubber,outlet);
      for(const x of [-.55,.55])box(.09,.24,1.4,[x,0,.4],light,outlet);
      box(1.2,.42,.55,[0,.51,1.05],blue,outlet);
    }
  }
  // The short level discharge runs west from the factory wall to a supported
  // 90° corner. The long incline then runs south on one constant X axis.
  const source=BAG_ROUTE[0],corner=BAG_ROUTE[1],outlet=at(...[source[0],source[1]-.07,source[2]]);
  outlet.name='beumer-factory-bag-outlet';
  const transferLength=source[0]-corner[0];
  box(transferLength,.12,.9,[-transferLength/2,0,0],m.rubber,outlet);
  for(const z of [-.5,.5])box(transferLength,.22,.07,[-transferLength/2,.04,z],light,outlet);
  box(1.08,.58,1.08,[0,.64,0],blue,outlet,.03);
  box(.84,.08,.15,[-.2,.30,0],grey,outlet);
  const boardExit=group([0,0,0],root);boardExit.name='board-finish-line';
  // Keep the drive cabinet beside the pallet conveyor, clear of its rollers.
  box(1.6,1.2,1.4,localPoint([BOARD_END[0]-2.6,.6,BOARD_END[2]-2.6]),blue,boardExit).name='board-packaging-drive-cabinet';
  const palletizer=buildBoardPalletizer(k,{parent:boardExit,equipment,receiver:BOARD_END});
  const bagStock=buildBagStock(k,{parent:root,equipment});
  return {root:line,boardExit,palletizer,bagStock,updateBeumer:(dt,enabled)=>machines.update(dt,enabled,bagStock)};
}
