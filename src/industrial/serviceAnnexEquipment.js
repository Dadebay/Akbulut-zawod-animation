import {localPoint} from './processPlan.js';
import {REAR_SERVICE_YARD} from './rearServiceYard.js';
import {machinePort} from './equipmentConnections.js';

// The October 25 views establish the shells, not their machinery. Keep this
// service layout explicitly illustrative and inside those actual envelopes.
export function buildServiceAnnexEquipment(k,{root,models,equipment,units,inventory,network}){
  const {box,cyl,rod,group,m}=k;
  const annex=REAR_SERVICE_YARD.buildings.find(b=>b.name==='rear-hall-link');
  const room=REAR_SERVICE_YARD.buildings.find(b=>b.name==='rear-service-room');
  const water=k.material('#367e99',.4,.5),air=k.material('#638797',.4,.5);
  function register(id,kind,position,g,enclosure=annex.name){
    const entry={id,kind,zone:'BS',enclosure,position,scale:g.scale.x,references:[],illustrative:true};
    g.name=`interior-${id}`;g.userData.equipment=entry;inventory.push(entry);units[id]=g;return g;
  }
  function install(id,kind,position,options={},scale=1){
    const g=register(id,kind,position,group(localPoint(position),root));
    g.scale.setScalar(scale);g.userData.equipment.scale=scale;g.userData.equipmentOptions=options;
    models.builders[kind](g,'BS',options);return g;
  }
  function join(a,out,b,input,via=[],medium='air'){
    network.connect(units[a].userData.ports[out],units[b].userData.ports[input],{
      via:via.map(localPoint),kind:'duct',material:medium,shellMaterial:medium==='water'?water:air,zone:'BS',hangerY:annex.height-.2,
    });
  }
  const floor=group(localPoint([annex.x,0,annex.z]),root);floor.name='rear-hall-link-interior-floor';
  box(annex.width-.36,.10,annex.depth-.36,[0,0,0],m.floor,floor);
  const back=REAR_SERVICE_YARD.buildings.find(b=>b.sharedRoof===annex.name);
  box(back.width-.36,.10,back.depth-.36,localPoint([back.x,0,back.z]),m.floor,root).name='rear-hall-return-floor';
  // Keep the east/west doors connected by a two-metre unobstructed aisle.
  for(const z of [-1,1])box(annex.width-.5,.012,.06,[0,.065,z],m.yellow,floor);
  const label=k.textPlate('HOWA · SUW',3.6,.32,[0,.075,0],floor,'#344f5c','#e4e9e7');label.rotation.x=-Math.PI/2;

  install('annex-water-tank','vessel',[-11.6,.12,-8.5],{horizontal:true});
  install('annex-water-pump','pump',[-9.05,.12,-6.35],{},.65);
  machinePort(k,units['annex-water-tank'],'return',[1,3.03,0],[0,1,0],.12,'water');
  join('annex-water-tank','out','annex-water-pump','in',[
    [-14.25,1.77,-8.5],[-14.25,1.77,-7.2],[-10.1,1.77,-7.2],[-10.1,.64,-6.35],
  ],'water');
  join('annex-water-pump','out','annex-water-tank','return',[
    [-9.1475,3.65,-6.35],[-9.1475,3.65,-8.5],[-10.6,3.65,-8.5],
  ],'water');

  install('annex-compressor','compressor',[-13.15,.12,-.2]);
  install('annex-air-receiver','vessel',[-9.65,.12,-.2],{height:3.5});
  join('annex-compressor','out','annex-air-receiver','in',[
    [-11.6,3.6,-.2],[-11.6,3.6,.9],[-8.15,3.6,.9],[-8.15,1.62,-.2],
  ]);

  // A pair of ducted ventilation fans leaves the low roof and door clearances
  // intact. These use the same detailed native-CAD fan skin as the main tower.
  for(const [i,x] of [-12.65,-9.4].entries()){
    const id=`annex-vent-fan-${i+1}`;
    install(id,'fan',[x,.12,-2.25],{},.8);
    units[id].userData.ports.in.open=true;
    const outlet=register(`${id}-grille`,'vent-grille',[x+.2,3.9,-2.25],group(localPoint([x+.2,3.9,-2.25]),root));
    box(.85,.65,.12,[0,0,0],m.steel,outlet);
    for(let y=-.24;y<.3;y+=.1)box(.72,.04,.06,[0,y,.09],m.dark,outlet);
    machinePort(k,outlet,'in',[0,-.32,0],[0,-1,0],.18,'air');
    join(id,'out',`${id}-grille`,'in');
  }
  // Exposed service air manifold, above the compressors rather than across a door.
  const manifold=register('annex-air-manifold','air-manifold',[-8.5,4.65,-.2],group(localPoint([-8.5,4.65,-.2]),root));
  cyl(.1,.8,[0,0,0],air,manifold);
  machinePort(k,manifold,'in',[0,-.4,0],[0,-1,0],.1,'air');
  join('annex-air-receiver','out','annex-air-manifold','in',[[-8.15,2.72,-.2]]);
  equipment.gauge([.15,.1,0],manifold);

  // Building 2 already contains the drum and extraction fan. Add its electrical
  // service bank in the unused northern strip, clear of those machines.
  for(const [i,p] of [[-14,.12,2.1],[-13.05,.12,2.1],[-10.12,.12,2.15],[-10.12,.12,2.95]].entries()){
    const g=k.cabinet(localPoint(p),root);if(i>1)g.scale.setScalar(.8);
    register(`service-electrical-${i+1}`,'control-cabinet',p,g,room.name);
  }
  const tray=group(localPoint([-12.575,3.1,2.1]),root);tray.name='service-electrical-cable-tray';
  for(const z of [-.18,.18])box(3.8,.1,.045,[0,0,z],m.steel,tray);
  for(let x=-1.85;x<1.9;x+=.24)box(.035,.035,.36,[x,-.03,0],m.steel,tray);
  for(const x of [-1.8,1.8])rod([x,-1.3,0],[x,0,0],.035,m.dark,tray);
}
