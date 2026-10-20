import * as T from 'three';

const builders=new WeakMap();

// Shared static passenger-car geometry for the visitor lot and covered bays.
// Cars are drawn 20% smaller than their modelled size.
export const CAR_SCALE=.8;
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
  function car(x,z,angle,index=1,moving=false){
    const g=group([x,.01,z],k.scene,moving),wheels=[],steering=[];g.rotation.y=angle;g.scale.setScalar(CAR_SCALE);const colour=bodyPaint[index%7===0?2:index%5===0?1:0];
    const tailMaterial=moving?material('#ab3b39',.2,.5,{unique:true,emissive:'#ff3020',emissiveIntensity:0}):m.red;
    box(4.45,.51,1.78,[0,.61,0],colour,g,.15);box(3.8,.17,1.55,[0,.29,0],m.dark,g,.04);
    const glazing=moving?material('#30464e',.12,.18,{transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide}):carGlass;
    if(moving){
      box(1.32,.07,1.53,[.01,1.48,0],colour,g,.035);
      for(const side of [-1,1]){
        k.rod([1.23,.86,side*.73],[.63,1.47,side*.73],.038,colour,g);
        k.rod([-1.27,.86,side*.73],[-.61,1.47,side*.73],.040,colour,g);
      }
    }else mesh(cabinGeo,colour,[0,0,0],g);
    mesh(windGeo,glazing,[0,0,0],g);mesh(rearGeo,glazing,[0,0,0],g);
    for(const side of [-1,1]){
      mesh(sideGeo,glazing,[0,0,side*.746],g);box(.07,.53,.024,[0,1.15,side*.765],colour,g);
      for(const x of [-.65,.6])box(.16,.035,.035,[x,.85,side*.91],m.steel,g);
      box(.18,.12,.20,[.96,1.02,side*.94],colour,g,.035);
      for(const axleX of [-1.42,1.36]){
        const pivot=group([axleX,.31,side*.86],g,moving&&axleX>0),wheel=group([0,0,0],pivot,moving);
        if(moving){wheel.userData.wheelKey=`service-car:${side}`;wheels.push({wheel,axle:axleX+1.42,side:side*.86});if(axleX>0)steering.push(pivot);}
        const tyre=cyl(.31,.19,[0,0,0],m.rubber,wheel,undefined,moving?32:16);tyre.rotation.x=Math.PI/2;
        const hub=cyl(.18,.015,[0,0,side*.105],m.steel,wheel,undefined,20);hub.rotation.x=Math.PI/2;
        for(let n=0;n<5;n++){const a=n/5*Math.PI*2,spoke=box(.04,.26,.02,[0,0,side*.12],m.dark,wheel);spoke.rotation.z=a;}
      }
      for(const xx of [-1.02,.03,1.04])box(.012,.37,.012,[xx,.63,side*.896],m.dark,g);
      box(1.65,.025,.03,[0,.40,side*.89],m.steel,g);
      box(.06,.15,.46,[2.21,.70,side*.56],m.light,g,.025);box(.06,.14,.42,[-2.21,.68,side*.59],tailMaterial,g,.025);
    }
    box(.025,.18,.75,[2.23,.50,0],m.dark,g);box(.03,.10,.36,[2.25,.47,0],m.white,g);box(.03,.10,.36,[-2.25,.51,0],m.white,g);
    for(let z=-.34;z<=.35;z+=.10)box(.035,.12,.025,[2.249,.52,z],m.steel,g);
    const brakeLights=moving?group([0,0,0],g,true):null;
    if(brakeLights){
      const glow=material('#c94437',0,.35,{emissive:'#ff2820',emissiveIntensity:.7});
      for(const side of [-1,1])box(.012,.12,.36,[-2.247,.68,side*.59],glow,brakeLights);
      brakeLights.visible=false;g.carRig={wheels,steering,brakeLights,tailMaterial,brakeMaterial:glow};
    }
    k.vehicleLights.push({root:g,front:2.26,width:.56,height:.70,rear:-2.26,length:moving?16:9});
    return g;
  }
  builders.set(k,car);return car;
}
