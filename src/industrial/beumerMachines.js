import * as T from 'three';
import {BEUMER_LINE,localPoint} from './processPlan.js';
import {BAG_STOCK} from './bagStock.js';

// Photo-based equipment proportions, fitted to the existing production routes.
// The open frames are intentional: conveyors and products occupy these voids.
export function buildBeumerMachines(k,{parent,equipment}){
  const {box,cyl,rod,group,material,textPlate,m}=k;
  const blue=material('#1764a5',.38,.42),white=material('#e3e6e3',.24,.57);
  const steel=equipment.zinc,dark=equipment.cast,black=m.black,yellow=m.yellow;
  const W=BEUMER_LINE.west,Z=BEUMER_LINE.z;
  const at=(x,y,z,name)=>{const g=group(localPoint([x,y,z]),parent);g.name=name;return g;};
  function foot(x,z,g){box(.32,.055,.32,[x,.028,z],steel,g);for(const dx of [-.10,.10])equipment.bolt([x+dx,.07,z+.1],g);}
  function panel(w,h,x,y,z,g,colour=blue){
    box(w,h,.075,[x,y,z],colour,g,.015);
    for(const xx of [-w/2+.07,w/2-.07])for(const yy of [-h/2+.07,h/2-.07])
      equipment.bolt([x+xx,y+yy,z+.05],g,'z',.012);
  }
  function drawerCabinet(g,x,width=1.16){
    const cabinet=group([x,0,0],g);cabinet.name='beumer-drawer-casing';
    box(width,4.48,1.74,[0,2.30,0],white,cabinet);
    box(width,.10,1.8,[0,.08,0],dark,cabinet);
    for(let i=0;i<5;i++){
      const y=.58+i*.72;
      panel(width-.04,.68,0,y,.889,cabinet,white);
      for(const xx of [-width*.27,width*.27])box(.17,.025,.05,[xx,y+.17,.955],black,cabinet);
    }
    textPlate('BEUMERGROUP',width-.08,.20,[0,4.16,.925],cabinet,'#18578b','#e3e6e3');
    return cabinet;
  }
  function inlet(g){
    const port=group([0,0,.97],g);port.name='beumer-bag-inlet';
    for(const x of [-.64,.64])box(.065,.93,.12,[x,3.575,0],steel,port);
    for(const y of [3.08,4.07])box(1.35,.065,.12,[0,y,0],steel,port);
    // Dark rear wall makes the depth of the receiving pocket visible.
    box(1.22,.92,.10,[0,3.58,-1.85],dark,port);
    return port;
  }
  function openFrame(g,x0,x1,top=4.1){
    for(const x of [x0,x1])for(const z of [-.98,.98]){
      box(.14,top,.14,[x,top/2,z],dark,g);foot(x,z,g);
      box(.035,top-.4,.035,[x+.09,top/2,z],steel,g);
    }
    for(const z of [-.98,.98]){
      box(x1-x0+.15,.18,.16,[(x0+x1)/2,2.92,z],steel,g);
      box(x1-x0+.15,.16,.16,[(x0+x1)/2,.28,z],dark,g);
    }
    rod([x0,.45,-.99],[x1,2.8,-.99],.028,dark,g);
    rod([x1,.45,-.99],[x0,2.8,-.99],.028,dark,g);
  }
  function rollerDeck(g,x,y,width,depth){
    for(const z of [-depth/2,depth/2])box(width,.10,.09,[x,y-.08,z],steel,g);
    const n=Math.ceil(width/.15);
    for(let i=0;i<n;i++)equipment.cylinder(.035,depth-.1,[x-width/2+(i+.5)*width/n,y,0],steel,g,'z',undefined,10);
  }
  function lightCurtain(x,z){
    const g=at(x,0,z,'beumer-safety-light-curtain');
    box(.09,1.92,.09,[0,.96,0],yellow,g);foot(0,0,g);
    box(.035,1.42,.018,[0,1.12,z>Z?-.055:.055],black,g);
    box(.20,.34,.08,[.16,1.24,0],steel,g);
    cyl(.025,.035,[0,1.96,0],m.green,g,undefined,8);
  }

  // White drawer column at the side, open receiving pocket beside it, and
  // blue panelled upper beams above the exposed lift and layer-forming deck.
  const tower=at(W+1.5,0,Z,'beumer-stacker-tower');
  drawerCabinet(tower,-1.57).rotation.y=-Math.PI/2;
  box(.14,4.64,1.9,[-.64,2.32,0],blue,tower);
  inlet(tower);
  const frame=group([0,0,0],tower);frame.name='beumer-open-lift-frame';
  openFrame(frame,.76,2.55,4.40);
  for(const z of [-.98,.98]){
    box(3.34,.59,.15,[.96,4.37,z],blue,tower);
    for(let i=0;i<3;i++)panel(1.02,.51,-.11+i*1.09,4.37,z+.085,tower);
  }
  for(const x of [-.64,2.55])box(.16,.59,1.9,[x,4.37,0],blue,tower);
  for(const x of [-.5,2.35])for(const z of [-.82,.82])box(.24,.09,.25,[x,4.72,z],white,tower);
  const liftDeck=group([BAG_STOCK.receiveX-(W+1.5),BAG_STOCK.fillLiftY,0],frame,true);liftDeck.name='beumer-pallet-lift-deck';
  rollerDeck(liftDeck,0,1.14,1.65,1.40);
  box(1.76,.10,1.52,[0,1.01,0],steel,liftDeck);
  for(const z of [-.82,.82]){
    equipment.cylinder(.075,1.38,[2,.79,z],dark,frame);
    rod([2,.79,z],[2,3.38,z],.035,steel,frame);
  }
  for(const z of [-.8,.8])rod([.9,3.22,z],[2.40,3.22,z],.035,steel,frame);
  equipment.gearmotor([1.02,3.12,-.65],frame,.28,Math.PI/2);
  const stackHead=group([BAG_STOCK.receiveX-(W+1.5),4,0],frame,true);stackHead.name='beumer-stacking-head';
  for(const z of [-.68,.68])box(1.5,.14,.09,[0,0,z],steel,stackHead);
  for(const x of [-.70,.70])box(.10,.14,1.45,[x,0,0],steel,stackHead);
  for(const z of [-.72,.72]){
    box(1.28,.12,.06,[0,-.20,z],black,stackHead);
    rod([-.56,.04,z],[-.56,.58,z],.027,steel,stackHead);
  }
  // Empty-pallet magazine with tall sheet-metal guards and visible low shuttle.
  const magazine=at(W+1.5,0,Z-2.18,'beumer-pallet-magazine');
  for(const x of [-.92,.92]){
    box(.12,4.48,1.48,[x,2.24,0],white,magazine);
    box(.09,4.5,.10,[x,2.25,-.72],blue,magazine);foot(x,-.62,magazine);
    box(.06,3.9,.08,[x*.7,2.1,-.62],steel,magazine);
  }
  box(1.76,4.40,.10,[0,2.25,-.73],white,magazine);
  panel(1.72,2.62,0,3.09,.73,magazine,white);
  for(let y=2.0;y<4.35;y+=.75)box(1.6,.016,.015,[0,y,.78],steel,magazine);
  for(let i=0;i<6;i++){
    const y=.48+i*.18;
    for(const zz of [-.43,0,.43])box(1.4,.065,.15,[0,y,zz],m.wood,magazine);
    for(const x of [-.55,.55])box(.15,.095,1.0,[x,y-.08,0],m.wood,magazine);
  }
  const shuttle=group([0,0,.67],magazine);shuttle.name='beumer-empty-pallet-shuttle';
  for(const x of [-.73,.73])box(.10,.16,1.08,[x,.55,0],steel,shuttle);
  for(let z=-.45;z<=.5;z+=.2)equipment.cylinder(.055,1.32,[0,.66,z],steel,shuttle,'x');
  equipment.gearmotor([1.03,.20,.35],magazine,.28,Math.PI/2);

  // Second open upper forming section, visible behind the first in the photos.
  const housing=at(W+5.5,0,Z,'beumer-layer-housing');
  openFrame(housing,-1.10,1.10,4.40);
  inlet(housing);
  for(const x of [-1.2,1.2])box(.12,.83,2.1,[x,3.94,0],blue,housing);
  panel(2.4,.83,0,3.94,-1.03,housing);
  for(const x of [-.97,.97])panel(.47,.83,x,3.94,1.03,housing);
  box(2.52,.24,.14,[0,4.47,1.03],blue,housing);
  for(const x of [-.84,.84])box(.35,.12,.25,[x,4.43,-.83],white,housing);
  rollerDeck(housing,0,2.97,2.1,1.66);
  equipment.gearmotor([-.82,3.08,-.65],housing,.26,Math.PI/2);
  const pusher=group([0,3.12,0],housing,true);pusher.name='beumer-layer-pusher';
  box(1.7,.16,.08,[0,0,-.55],steel,pusher);
  for(const x of [-.78,.78])rod([x,0,-.6],[x,0,.55],.025,steel,pusher);

  // Grated service bridge and its own staircase, outside both pallet paths.
  const platform=at(W+5.0,0,Z-1.87,'beumer-service-platform');
  const platformWidth=3.5,platformDepth=1.25,platformY=2.55;
  for(const z of [-platformDepth/2,platformDepth/2])box(platformWidth,.14,.10,[0,platformY-.09,z],steel,platform);
  for(let x=-1.7;x<1.75;x+=.14)box(.045,.035,platformDepth,[x,platformY,0],steel,platform);
  for(const x of [-1.57,1.57])for(const z of [-.48,.48]){
    box(.12,platformY,.12,[x,platformY/2,z],dark,platform);foot(x,z,platform);
  }
  for(const x of [-1.7,-.6,.6,1.7])rod([x,platformY,-.63],[x,platformY+1.02,-.63],.027,yellow,platform);
  for(const y of [platformY+.5,platformY+1.02])box(platformWidth,.045,.045,[0,y,-.63],yellow,platform);
  box(platformWidth,.13,.035,[0,platformY+.09,-.63],yellow,platform);
  for(const y of [platformY+.5,platformY+1.02])rod([1.72,y,-.63],[1.72,y,.60],.025,yellow,platform);
  const stairs=at(W+3.4,0,Z-2.5,'beumer-service-stairs');
  const steps=13,run=3.38;
  for(let i=1;i<=steps;i++)box(.76,.045,.27,[0,i*platformY/steps,-run+i*run/steps],steel,stairs);
  for(const x of [-.43,.43]){
    rod([x,.08,-run],[x,platformY-.10,0],.06,steel,stairs);
    rod([x,1.10,-run],[x,platformY+1.02,0],.026,yellow,stairs);
    rod([x,.60,-run],[x,platformY+.52,0],.026,yellow,stairs);
    for(let i=0;i<=steps;i+=4){const y=i*platformY/steps,z=-run+i*run/steps;rod([x,y,z],[x,y+1.02,z],.025,yellow,stairs);}
  }

  // Separate electrical cabinets with louvred cooling units and an HMI.
  for(const [i,x] of [W+5.2,W+6.4,W+7.6].entries()){
    const cabinet=at(x,0,Z-3.02,`beumer-cabinet-${i+1}`);cabinet.rotation.y=Math.PI;
    box(1.10,2.32,.62,[0,1.22,0],white,cabinet);
    box(1.14,.12,.66,[0,.06,0],black,cabinet);
    for(const xx of [-.27,.27]){panel(.51,2.18,xx,1.24,.335,cabinet,white);equipment.handle([xx+.14,1.1,.40],cabinet);}
    const cooler=group([.28,1.24,.42],cabinet);cooler.name='beumer-cabinet-cooler';
    box(.43,1.50,.18,[0,0,0],white,cooler,.025);
    for(const y of [-.51,.43]){
      box(.33,.31,.018,[0,y,.10],dark,cooler);
      for(let yy=-.12;yy<=.12;yy+=.04)box(.34,.018,.02,[0,y+yy,.117],steel,cooler);
    }
    box(.54,.14,.36,[.2,2.47,0],steel,cabinet);
    if(i===2){box(.33,.28,.045,[-.27,1.68,.41],black,cabinet);box(.27,.21,.018,[-.27,1.68,.445],m.blueLight,cabinet);cyl(.035,.025,[-.32,1.30,.43],m.red,cabinet);}
  }

  // Open stretch-hood portal: four columns, driven crosshead, clamps and reels.
  const gantry=at(W+8.5,0,Z,'beumer-bag-gantry');
  for(const x of [-.62,.62])for(const z of [-1.12,1.12]){
    box(.17,4.16,.17,[x,2.08,z],dark,gantry);foot(x,z,gantry);
    box(.035,3.65,.035,[x-.10,2.04,z],steel,gantry);
    for(let y=.65;y<3.9;y+=.22)box(.055,.025,.028,[x-.12,y,z+.1],black,gantry);
  }
  for(const z of [-1.22,1.22])box(1.6,.42,.22,[0,4.20,z],blue,gantry);
  for(const x of [-.7,.7])box(.22,.42,2.5,[x,4.20,0],blue,gantry);
  for(const x of [-.55,.55])for(const z of [-.92,.92]){
    box(.28,.13,.28,[x,4.48,z],white,gantry);
    equipment.gearmotor([x,4.48,z],gantry,.17,Math.PI/2);
  }
  const stretchHead=group([0,2.45,0],gantry,true);stretchHead.name='beumer-bag-gantry-carriage';
  for(const z of [-.83,.83])box(1.22,.17,.12,[0,0,z],steel,stretchHead);
  for(const x of [-.55,.55])box(.14,.17,1.78,[x,0,0],steel,stretchHead);
  for(const x of [-.48,.48])for(const z of [-.78,.78]){
    box(.18,.34,.19,[x,-.15,z],dark,stretchHead);
    equipment.cylinder(.065,.22,[x,-.33,z],steel,stretchHead,'x');
    rod([x,.15,z],[x,.75,z],.024,steel,stretchHead);
  }
  const reels=group([0,0,-1.72],gantry);reels.name='beumer-film-reel-unit';
  box(1.55,.72,.84,[0,.42,0],blue,reels,.025);
  for(const y of [1.02,1.65]){
    equipment.cylinder(.21,1.18,[0,y,0],m.paper,reels,'x');
    for(const x of [-.68,.68])rod([x,.75,-.20],[x,y,.15],.04,steel,reels);
  }
  for(const x of [W+3.2,W+5.8,W+8.9])for(const zz of [Z-.91,Z+.91])lightCurtain(x,zz);

  let accepted=0,pulse=2;
  function update(dt,enabled,stock){
    if(!enabled)return;
    if(stock.accepted!==accepted){accepted=stock.accepted;pulse=0;}
    pulse=Math.min(1.4,pulse+dt);
    const stroke=Math.sin(Math.PI*pulse/1.4);
    liftDeck.position.y=stock.liftOffset;
    stackHead.position.y=4-.04*stroke;
    pusher.position.z=.22*stroke;
    const packX=stock.moving?stock.moving.pack.root.position.x+8:Infinity;
    const engagement=Math.max(0,1-Math.abs(packX-(W+8.5))/1.2);
    stretchHead.position.y=2.45-.24*engagement;
  }
  return {tower,housing,gantry,update};
}
