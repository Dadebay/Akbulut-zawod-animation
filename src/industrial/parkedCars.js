import * as T from 'three';

const builders=new WeakMap();

// Shared static passenger-car geometry for the visitor lot and covered bays.
export function createParkedCarBuilder(k){
  if(builders.has(k))return builders.get(k);
  const {box,cyl,mesh,group,material,m}=k;
  const bodyPaint=[m.white,material('#c1c5c5',.4,.38),material('#535c61',.4,.38)];
  const cabinShape=new T.Shape();cabinShape.moveTo(-1.28,.83);cabinShape.lineTo(-.61,1.49);cabinShape.lineTo(.63,1.49);cabinShape.lineTo(1.24,.83);cabinShape.closePath();
  const cabinGeo=new T.ExtrudeGeometry(cabinShape,{depth:1.48,bevelEnabled:false});cabinGeo.translate(0,0,-.74);
  const windGeo=new T.BufferGeometry();windGeo.setAttribute('position',new T.Float32BufferAttribute([.64,1.50,-.70,1.25,.84,-.70,1.25,.84,.70,.64,1.50,.70],3));windGeo.setIndex([0,1,2,0,2,3]);windGeo.computeVertexNormals();
  const rearGeo=new T.BufferGeometry();rearGeo.setAttribute('position',new T.Float32BufferAttribute([-1.29,.84,.70,-1.29,.84,-.70,-.62,1.50,-.70,-.62,1.50,.70],3));rearGeo.setIndex([0,1,2,0,2,3]);rearGeo.computeVertexNormals();
  const windowShape=new T.Shape();windowShape.moveTo(-1.08,.91);windowShape.lineTo(-.55,1.39);windowShape.lineTo(.55,1.39);windowShape.lineTo(1.06,.91);windowShape.closePath();
  const sideGeo=new T.ShapeGeometry(windowShape),carGlass=material('#30464e',.4,.24,{side:T.DoubleSide});
  function car(x,z,angle,index=1){
    const g=group([x,.01,z]);g.rotation.y=angle;const colour=bodyPaint[index%7===0?2:index%5===0?1:0];
    box(4.45,.51,1.78,[0,.61,0],colour,g,.15);box(3.8,.17,1.55,[0,.29,0],m.dark,g,.04);
    mesh(cabinGeo,colour,[0,0,0],g);mesh(windGeo,carGlass,[0,0,0],g);mesh(rearGeo,carGlass,[0,0,0],g);
    for(const side of [-1,1]){
      mesh(sideGeo,carGlass,[0,0,side*.746],g);box(.07,.53,.024,[0,1.15,side*.765],colour,g);
      for(const x of [-.65,.6])box(.16,.035,.035,[x,.85,side*.91],m.steel,g);
      box(.18,.12,.20,[.96,1.02,side*.94],colour,g,.035);
      for(const x of [-1.42,1.36]){const wheel=cyl(.31,.19,[x,.32,side*.86],m.rubber,g,undefined,12);wheel.rotation.x=Math.PI/2;const hub=cyl(.18,.015,[x,.32,side*.965],m.steel,g,undefined,10);hub.rotation.x=Math.PI/2;}
      box(.06,.15,.46,[2.21,.70,side*.56],m.light,g,.025);box(.06,.14,.42,[-2.21,.68,side*.59],m.red,g,.025);
    }
    box(.025,.18,.75,[2.23,.50,0],m.dark,g);box(.03,.10,.36,[2.25,.47,0],m.white,g);box(.03,.10,.36,[-2.25,.51,0],m.white,g);
    return g;
  }
  builders.set(k,car);return car;
}
