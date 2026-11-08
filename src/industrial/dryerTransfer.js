import {BOARD_DRYER,BOARD_ROUTE} from './processPlan.js';

const clamp=t=>Math.max(0,Math.min(1,t));
export const dryerTransferRuns=()=>[
  {name:'GK-infeed-merge',floorX:BOARD_DRYER.entryX+BOARD_DRYER.entryApron,deckX:BOARD_DRYER.entryX+.9},
  {name:'GK-outfeed-merge',floorX:BOARD_DRYER.exitX-BOARD_DRYER.exitApron,deckX:BOARD_DRYER.exitX-.9},
];
export function dryerRampProfile(t,deck){
  t=clamp(t);const rise=deck*BOARD_DRYER.deckPitch;
  return {height:BOARD_ROUTE[2][1]+rise*t*t*(3-2*t),slope:rise*6*t*(1-t)};
}
function surfacePose(x,deck){
  const runs=dryerTransferRuns(),base=BOARD_ROUTE[2][1];
  if(x>runs[0].floorX||x<runs[1].floorX)return {height:base,pitch:0};
  for(const run of runs){
    const t=(x-run.floorX)/(run.deckX-run.floorX);
    if(t>=0&&t<=1){
      const profile=dryerRampProfile(t,deck);
      return {height:profile.height,pitch:Math.atan(-profile.slope/(run.deckX-run.floorX))};
    }
  }
  return {height:base+deck*BOARD_DRYER.deckPitch,pitch:0};
}
export function dryerBoardPose(x,deck){
  // A rigid sheet bridges neighbouring rollers. Use its end supports and
  // clearance over the whole footprint instead of bending it into the curve.
  let half=1.2,pitch=0;
  for(let i=0;i<3;i++){
    pitch=Math.atan2(surfacePose(x-half,deck).height-surfacePose(x+half,deck).height,2*half);
    half=1.2*Math.cos(pitch);
  }
  let height=surfacePose(x,deck).height;
  for(let i=0;i<=24;i++){
    const offset=-half+2*half*i/24;
    height=Math.max(height,surfacePose(x+offset,deck).height+Math.tan(pitch)*offset);
  }
  return {height,pitch};
}

// Five visible, curved roller branches meet one floor-level throat. The
// shared tongue selects the arriving branch, keeping five sets of rollers
// from being drawn through each other where the paths converge.
export function buildDryerTransfers(k,{parent,cylinder,gearmotor,blue,zinc,cast,cream}){
  const {group,box,rod,textPlate,m}=k;
  for(const run of dryerTransferRuns()){
    const floor=BOARD_DRYER.x-run.floorX,delta=run.floorX-run.deckX,length=Math.abs(delta);
    const root=group([floor,0,0],parent);root.name=run.name;
    for(const z of [-1.62,1.62]){
      box(length,.17,.14,[delta/2,.38,z],cast,root);
      for(const t of [0,.45,1]){
        box(.13,.72,.13,[delta*t,.36,z],cream,root);
        box(.34,.05,.32,[delta*t,.025,z],cast,root);
      }
    }
    for(let deck=0;deck<BOARD_DRYER.decks;deck++){
      const branch=group([0,0,0],root);branch.name=`${run.name}-level-${deck+1}`;
      const tongue=group([0,0,0],branch,true);tongue.name=`${run.name}-tongue-${deck+1}`;tongue.visible=deck===0;
      const samples=Math.ceil(length/.23);
      for(let i=0;i<=samples;i++){
        const t=i/samples,y=dryerRampProfile(t,deck).height-.005;
        const bed=t<.5?tongue:branch;
        const roll=cylinder(.035,2.6,[delta*t,y-.035,0],zinc,bed,'z',undefined,12);
        if(i===0||i===samples)roll.name=`${run.name}-level-${deck+1}-${i===0?'floor':'deck'}-joint`;
        if(i===samples)continue;
        const t1=(i+1)/samples,y1=dryerRampProfile(t1,deck).height-.005;
        for(const side of [-1,1]){
          const z=side*(1.42+deck*.035*t),z1=side*(1.42+deck*.035*t1);
          rod([delta*t,y-.11,z],[delta*t1,y1-.11,z1],.028,blue,branch);
        }
      }
      gearmotor([delta*.92,dryerRampProfile(.92,deck).height-.28,-1.9],branch,.3,-Math.PI/2);
      textPlate(`${deck+1}`, .22,.18,[delta*.87,dryerRampProfile(.87,deck).height+.08,-1.68],branch).rotation.y=Math.PI;
    }
    const cabinet=k.cabinet([delta*.22,0,-2.03],root);cabinet.scale.setScalar(.6);cabinet.rotation.y=Math.PI;
    for(const z of [-1.5,1.5]){
      box(.08,1.45,.08,[0,.725,z],m.yellow,root);
      box(.035,1.1,.04,[0,.82,z-Math.sign(z)*.06],m.black,root);
    }
  }
}
