import {quarryCycle,QUARRY_LOADING_SECONDS} from './quarryCycle.js';
import {LOADING_DURATION,loadingCounts} from './industrial/forkliftMotion.js';
import {quarryPoint} from './industrial/quarryLayout.js';
import {HAUL_PROFILE} from './industrial/haulMotion.js';
import {RAW_STOCK} from './industrial/siteLayout.js';
import {DISPATCH_PROFILE} from './industrial/trafficLayout.js';
import {JOURNEY_STAGE} from './journeyStages.js';
export {JOURNEY_STAGE} from './journeyStages.js';

// One deterministic, compressed presentation cycle. Durations are not plant timings.
const definitions=[
  ['quarry','Kän','Kände ýüklemek','Ekskawator kamyony 4 susguçda ýükleýär — her aýlaw 18 sekunt.',QUARRY_LOADING_SECONDS,'CR',false,quarryPoint(-15,11,16),quarryPoint(-1,2,0)],
  ['haul','Daşama','Çig mal ýolda','Ýükli kamyon köne zawodyň yzky kabul ediş meýdançasyna gelýär.',HAUL_PROFILE.duration,'CR',false,quarryPoint(13,9,15),quarryPoint(-2,2,0)],
  ['receive','Üýşmek','Çig maly meýdança boşatmak','Kamyon çig maly daşky konweýeriň ýanynda boşadýar.',12,'CR',false,[RAW_STOCK[0]+20.5,18,RAW_STOCK[2]+24],[RAW_STOCK[0],2,RAW_STOCK[2]]],
  ['scoop','Susguç','Çig maly susup almak','Ýükleýji sagdaky çig mal üýşmeginden iri daşlary alýar.',18,'CR',false,[88,12,31.5],[70,2,14.5]],
  ['carry','Bunkere','Ýükleýji bunkere barýar','Ýükleýji sagdaky üýşmekden alan daşlaryny döwüji binanyň sag derwezesine getirýär.',28,'CR',false,[104,24,48],[80,2,25]],
  ['tip','Bunker','Susgujy bunkere boşatmak','Ýükleýji susgujyny galdyryp iri daşlary bunkere dökýär.',13,'CR',true,[88,11,47],[71,2,34.8]],
  ['infeed','Besleýji','Daşlary ölçegli bermek','Bunker → yrgyldyly besleýji → döwüji → ýapyk konweýer → burçdaky silo.',16,'CR',true,[79,24,58],[48,2,34.8]],
  ['crush','Silolar','Taýýarlanan çig mal silolarda','Döwlen çig mal burçdaky silodan önümçilik silolaryna geçirilýär.',16,'CR',true,[6,20,53],[-15,5,31]],
  ['calcine','Bişirme','Bişirmek we sowatmak','Taýýarlanan gips bişirme bölüminden geçýär.',14,'BS',true,[-55,30,44],[-29,3,8]],
  ['mix','Gury garyndy','Gury gurluşyk garyndylary','Aýratyn dozirleme, garyşdyrma we haltalama liniýasy.',16,'GR',true,[-78,31,-57],[-44,3,-25]],
  ['form','Gipsokarton','Gipsokarton önümçiligi','Suw bilen garyşdyrmak → şekil bermek → gatamak → kesmek → guratmak → gaplamak.',24,'GK',true,[49,65,-76],[8,2,-19]],
  ['pack','Gaplama','Palet taýýarlamak','Robot taýýar önümleri palete ýerleşdirýär.',14,'GP',true,[17,24,-61],[-7,2,-30]],
  ['load','Ýükleme','TIR we wagon ýüklemek','Forkliftler paletleri ammardan ulaglara geçirýär.',LOADING_DURATION,'GP',true,[101,54,-112],[31,1,-46]],
  ['dispatch','Ugratmak','Ýükli ulaglar ugraýar','TIR derwezeden çykýar; otly demir ýol bilen gidýär.',DISPATCH_PROFILE.duration,'GP',false,[-244,133,146],[-93,0,-37]],
];
let start=0;
export const JOURNEY_STEPS=definitions.map(([id,short,title,caption,duration,zone,cutaway,position,target],index)=>{const step={id,short,title,caption,duration,zone,cutaway,position,target,index,start};start+=duration;return step;});
export const JOURNEY_DURATION=start;
// Hide the deterministic reset behind a short fade out / fade in at the tour boundary.
export function journeyFade(time){const t=Math.min(time,JOURNEY_DURATION-time)/1.4,p=Math.max(0,Math.min(1,t));return 1-p*p*(3-2*p);}
// The reset fade belongs only to the playing guided tour. An independently
// running process clock must never blank the scene during manual inspection.
export function journeyOpacity(time,{following=false,playing=false,loopStep=null}={}){
  return following&&playing&&loopStep===null?1-journeyFade(time):1;
}
export const clamp01=n=>n<1e-12?0:n>1-1e-12?1:n;
export function completedLoads(elapsed,period,count){return Math.min(count,Math.max(0,Math.floor(elapsed/period)+(elapsed%period>=period*.78?1:0)));}
export function journeyAt(seconds){
  // Avoid rounding an exact stage boundary backwards by adding a full cycle.
  const wrapped=seconds%JOURNEY_DURATION,time=wrapped<0?wrapped+JOURNEY_DURATION:wrapped;
  const step=JOURNEY_STEPS.find(s=>time<s.start+s.duration)||JOURNEY_STEPS.at(-1);
  const elapsed=time-step.start,progress=clamp01(elapsed/step.duration),index=step.index;
  const loads=step.id==='load'?loadingCounts(elapsed):null;
  return {time,step,index,elapsed,progress,
    rawLoad:index===0?quarryCycle(progress).rawLoad:index===1?1:index===2?1-clamp01((progress-.2)/.5):0,
    hopperFill:step.id==='tip'?clamp01((progress-.42)/.36):step.id==='infeed'?1-progress:0,
    truckLoads:index<JOURNEY_STAGE.load?0:loads?loads.truck:6,
    trainLoads:index<JOURNEY_STAGE.load?0:loads?loads.train:8,
    depart:step.id==='dispatch'?progress:0,
  };
}
