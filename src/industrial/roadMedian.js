// Shared planting and double-arm lamps for the two entrance roads.
export function buildRoadMedian(k,plants,{west,east,z,width=1.05,lit=false,name='road-median'}){
  if(east-west<3)return;
  const {box,cyl,rod,group,m}=k,length=east-west,centre=(west+east)/2;
  const g=group([centre,0,z]);g.name=name;
  const curb=k.material('#c5c4b7',0,.92);
  box(length,.15,width,[0,.025,0],curb,g);
  box(length-.4,.06,width-.33,[0,.13,0],m.grass,g);
  for(let x=west+2;x<east-1;x+=3.5)plants.plant(x,z,.18,{plantedMedian:true});
  if(lit)for(let x=west+3.75;x<east-2;x+=14){
    // Keep each pole halfway between neighbouring trees.
    const lamp=group([x-centre,0,0],g);lamp.name='road-median-light';
    box(.38,.22,.38,[0,.15,0],m.concrete,lamp);
    cyl(.085,7,[0,3.7,0],m.steel,lamp,.05,12);
    for(const side of [-1,1]){
      rod([0,6.9,0],[0,7.2,side*1.6],.045,m.steel,lamp);
      box(.34,.16,.9,[0,7.2,side*1.85],m.dark,lamp,.025);
      box(.28,.035,.78,[0,7.105,side*1.85],m.light,lamp);
    }
  }
  return g;
}
