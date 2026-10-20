// Deliberately local to the scene: no window/debug API in shipped builds.
export const REVIEW_CAMERAS=[
  {name:'Site',position:[-170,90,90],target:[-60,0,-20]},
  {name:'Loading deck',position:[2,22,-68],target:[20,2,-46]},
  {name:'Main gate',position:[-165,16,-16],target:[-139,2,-2]},
  {name:'Truck',position:[50,6,-55],target:[64,2,-43]},
  {name:'Weighbridge',position:[80,14,-11],target:[92.5,0,-21]},
  {name:'Production',position:[-52,30,-27],target:[-52,0,-26.9],interior:true},
  {name:'Process tower',position:[-40,8,0],target:[-29,4,-12],interior:true},
  {name:'Old campus',position:[-50,25,-100],target:[-29,1,-124.5]},
];

export function createReviewControls(container,onCamera){
  if(!import.meta.env?.DEV||!new URLSearchParams(location.search).has('review'))return null;
  const panel=document.createElement('nav');panel.setAttribute('aria-label','Review cameras');
  panel.style.cssText='position:absolute;right:16px;top:120px;z-index:30;display:flex;gap:4px;background:#fff;padding:6px;border-radius:6px';
  const state={index:0,interior:false};
  REVIEW_CAMERAS.forEach((preset,index)=>{
    const button=document.createElement('button');button.textContent=String(index+1);button.title=preset.name;button.setAttribute('aria-label',`Review ${index+1}: ${preset.name}`);
    button.onclick=()=>{state.index=index;state.interior=!!preset.interior;panel.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));onCamera(preset);};panel.appendChild(button);
  });
  container.appendChild(panel);container.dataset.review='true';
  return {...state,get index(){return state.index;},get interior(){return state.interior;},select(index=0){panel.children[index].click();},dispose(){panel.remove();delete container.dataset.review;}};
}
