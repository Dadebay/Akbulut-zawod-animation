import {localPoint} from './processPlan.js';

// Four working levels and roof services, arranged from the user's interior
// reference. Open grating around the process shafts preserves the cutaway view.
export function buildProcessTower(k,parent){
  const {box,rod,group,m}=k;
  // Footprint of the existing 17 × 29 m processing building, without importing
  // siteLayout (which also depends on the journey and process-plan modules).
  const root=group(localPoint([-29,0,5]),parent);
  const frame=k.material('#65716e',.6,.5),floor=k.material('#b3b5ac',.32,.75);
  const levels=[6,12,18,24.5],xs=[-7.5,0,7.5],zs=[-13,-4,5,13];
  function rail(a,b){
    const length=Math.hypot(b[0]-a[0],b[2]-a[2]),count=Math.ceil(length/1.4);
    for(let i=0;i<=count;i++){
      const t=i/count,p=a.map((v,j)=>v+(b[j]-v)*t);
      rod(p,[p[0],p[1]+1.05,p[2]],.025,m.yellow,root);
    }
    for(const h of [.5,1.05])rod([a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],.03,m.yellow,root);
  }
  function grating(w,d,x,y,z){
    box(w,.12,d,[x,y,z],floor,root);
    for(let xx=x-w/2+.1;xx<x+w/2;xx+=.22)box(.018,.012,d,[xx,y+.07,z],frame,root);
  }
  for(const x of xs)for(const z of zs){
    box(.26,25,.26,[x,12.5,z],frame,root);
    box(.7,.1,.7,[x,.05,z],m.steel,root);
  }
  for(const y of levels){
    for(const z of zs){
      box(15.2,.3,.14,[0,y-.2,z],frame,root);
      for(const h of [-.17,.17])box(15.2,.045,.30,[0,y-.2+h,z],frame,root);
    }
    for(const x of [-7.5,7.5])box(.18,.35,26,[x,y-.2,0],frame,root);
    // Perimeter catwalks and two transverse service aisles leave large machine
    // openings for the bins, cyclone cones, mill and vertical elevators.
    for(const x of [-6.9,6.9]){grating(1,26,x,y,0);rail([x,y,-13],[x,y,13]);}
    for(const z of [-12.5,12.5,-4]){grating(13.8,1.05,0,y,z);rail([-6.4,y,z+.55],[6.4,y,z+.55]);}
    // Equipment mounting pads, with an open centre for gravity discharge.
    for(const x of [-4,3.6])for(const side of [-1,1])grating(3.8,.7,x,y,2.5+side*1.6);
    // Alternating flights connect successive levels; stair rails follow the
    // exact slope, and landings meet the floor instead of stopping in midair.
    const bottom=y===24.5?18:y-6,rise=y-bottom,from=y===12||y===24.5?-.7:-6.4,to=y===12||y===24.5?-6.4:-.7;
    const steps=Math.ceil(rise/.22),z=10.7;
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps;box(Math.abs(to-from)/steps+.035,.075,1.12,[from+(to-from)*t,bottom+rise*(i+1)/steps,z],floor,root);
    }
    for(const side of [-.62,.62]){
      rod([from,bottom,z+side],[to,y,z+side],.09,frame,root);
      rod([from,bottom+1.03,z+side],[to,y+1.03,z+side],.03,m.yellow,root);
      for(let i=0;i<=steps;i+=4){const t=i/steps;rod([from+(to-from)*t,bottom+rise*t,z+side],[from+(to-from)*t,bottom+rise*t+1.03,z+side],.025,m.yellow,root);}
    }
    grating(1.35,2.6,to,y,11.35);
  }
  // Bracing on the back and side faces leaves the front machinery exposed.
  for(const y of [0,6,12,18])for(const x of [-7.5,0])rod([x,y,-13],[x+7.5,y+6,-13],.065,frame,root);
  for(const y of [0,6,12,18])rod([7.5,y,-13],[7.5,y+6,-4],.065,frame,root);
  return root;
}
