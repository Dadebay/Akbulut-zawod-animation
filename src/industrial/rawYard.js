import {RAW_YARD,RAW_STOCK} from './siteLayout.js';
import {buildBoulderPiles} from './rubble.js';

export function buildRawYard(k){
  const {box,cyl,group,material,m,textPlate}=k;
  const soil=material('#aca392',0,1),concrete=material('#bfc0b8',0,.95),steel=material('#657078',.5,.65);
  box(137,.14,100,[169.5,-.20,-115],soil);
  // Separate bays, coarse aggregate, vehicle circulation and workshop apron.
  const piles=[[128,-89,8,3.6],[147,-87,7,2.8],[168,-86,8.5,4],[195,-83,9,3.6],[217,-84,6,2.7],[130,-148,7,2.4],[143,-148,6,2.9],[199,-152,7,2.2]];
  buildBoulderPiles(k,piles,{seed:426,depthScale:.68});
  for(const x of [117,137,157,179,205,228])box(.55,3.4,20,[x,1.7,-86],concrete);
  box(111,3.4,.55,[172.5,1.7,-76],concrete);
  // Wheel wash / weighing deck and the truck's open stockpile apron.
  box(13,.18,5.8,[216,.05,-110],concrete);box(11,.06,4.8,[216,.17,-110],steel);
  for(let x=211;x<222;x+=.7)box(.08,.02,4.6,[x,.21,-110],m.dark);
  for(const z of [-113.4,-106.6]){box(15,.17,.25,[216,.18,z],m.white);for(let x=210;x<224;x+=2)box(.6,.18,.26,[x,.18,z],m.yellow);}
  box(8,.12,8,[RAW_STOCK[0],-.06,RAW_STOCK[2]],concrete);
  // Primary crusher housing with inspection panels, drive and dust extraction.
  const crusher=group([157,0,-110]);k.frame(5,4,2,crusher);box(5,3.5,4,[0,3.1,0],m.white,crusher,.12);box(3.6,.24,3.6,[0,4.98,0],steel,crusher);
  for(const z of [-2.03,2.03]){box(3.4,1.7,.07,[0,3.1,z],m.blue,crusher);for(const x of [-1.2,0,1.2])box(.08,1.7,.08,[x,3.1,z],steel,crusher);}
  k.motor([3.2,1.3,0],crusher,1.8);cyl(.45,5,[2.6,5.7,1.6],steel,crusher);k.platform(6.2,5,1.8,crusher);k.ladder(2,-3.2,-1.4,crusher);
  // Store/workshop, sorting equipment and stacks visible in the rear-yard photo.
  const shed=group([217,0,-149]);box(18,4.6,9,[0,2.3,0],m.white,shed);box(18.8,.2,9.8,[0,4.7,0],m.blue,shed);
  for(const x of [-5,1,6])box(3,3.4,.08,[x,1.7,4.56],steel,shed);
  for(let x=108;x<132;x+=4)for(let z=-130;z<-119;z+=3){box(3.2,.2,2.3,[x,.12,z],m.wood);for(let i=0;i<5;i++)box(2.8,.19,1.8,[x,.32+i*.2,z],i%2?steel:m.concrete);}
  for(let i=0;i<15;i++){const pipe=cyl(.24,6,[132+(i%5)*.55,.3+Math.floor(i/5)*.45,-132],steel,k.scene,undefined,12);pipe.rotation.x=Math.PI/2;}
  // Separate openings for arriving trucks and the loader's factory-bound lane.
  for(const [x,z,w,d] of [[169.5,-165,137,.35],[102,-65,2,.35],[176.5,-65,123,.35],[238,-144.5,.35,41],[238,-81,.35,32]]){box(w,1.8,d,[x,.9,z],concrete);}
  for(const x of [103,115])box(.35,2.2,.45,[x,1.1,-65],m.white);
  for(const z of [-124,-97]){box(.6,3,.6,[238,1.5,z],m.white);box(.9,.2,.9,[238,3.1,z],m.blue);}
  for(const [x,z] of [[117,-68],[181,-68],[231,-68],[231,-158],[152,-158]]){cyl(.08,8,[x,4,z],m.steel);box(1,.16,.5,[x,8,z],m.light);}
  textPlate('ÇIG MAL · KABUL EDIŞ',12,1.1,[204,3.6,-100],k.scene);
  return {bounds:RAW_YARD};
}
