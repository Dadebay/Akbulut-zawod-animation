import * as T from 'three';

const cache=new WeakMap();

// Shared fractured stone shapes keep the coarse rock silhouette at every distance.
export function rubbleAssets(k){
  if(cache.has(k))return cache.get(k);
  const geometries=Array.from({length:4},(_,variant)=>{
    const geometry=new T.IcosahedronGeometry(1,0),position=geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      const irregular=.86+.16*Math.sin(x*7.3+y*4.1+z*6.8+variant*2.7);
      position.setXYZ(i,Math.min(.83,x*irregular+z*.12),Math.max(-.7,Math.min(.82,y*irregular+x*.08)),z*irregular+y*.09);
    }
    geometry.computeVertexNormals();
    const colours=[];
    for(let i=0;i<position.count;i+=3){
      const shade=.81+.18*(.5+.5*Math.sin(i*1.73+variant*2.8));
      for(let corner=0;corner<3;corner++)colours.push(shade,shade*.985,shade*.955);
    }
    geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    return geometry;
  });
  const material=k.material('#e2dfd2',.02,.97,{vertexColors:true});
  const shades=['#ffffff','#e8e4d8','#d9d5c9','#f4ecdc','#c5c5bb'].map(c=>new T.Color(c));
  const assets={geometries,material,shades};cache.set(k,assets);return assets;
}

export function buildBoulderPiles(k,spots,{parent=k.scene,seed=177,depthScale=.88}={}){
  const {geometries,material,shades}=rubbleAssets(k),batches=geometries.map(()=>[]);
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(const [cx,cz,radius,height] of spots){
    const small=radius<2,spacing=small?.48:.82,step=small?.27:.47;
    const phase=random()*Math.PI*2,stretch=depthScale*(.94+random()*.06);
    for(let layer=0,y=.14;y<height;layer++,y+=step){
      const outline=radius*Math.pow(Math.max(.08,1-y/(height+.4)),.75);
      const angle=phase+layer*.57,cos=Math.cos(angle),sin=Math.sin(angle);
      for(let row=-Math.ceil(outline/spacing);row<=Math.ceil(outline/spacing);row++){
        for(let col=-Math.ceil(outline/spacing);col<=Math.ceil(outline/spacing);col++){
          const xx=(col+(row%2)*.5)*spacing+(random()-.5)*spacing*.3;
          const zz=row*spacing*.88+(random()-.5)*spacing*.3;
          const distance=Math.hypot(xx,zz);
          if(distance>outline-.12)continue;
          // Keep a thick outer layer; buried interior stones cannot be seen.
          const nextOutline=radius*Math.pow(Math.max(0,1-(y+step)/(height+.4)),.75);
          if(y+step<height&&distance<nextOutline-spacing*1.15)continue;
          const size=(small?.25:.40)+random()*(small?.15:.23),x=xx*cos-zz*sin,z=(xx*sin+zz*cos)*stretch;
          batches[Math.floor(random()*geometries.length)].push({x:cx+x,y:y+random()*.14,z:cz+z,sx:size*(.9+random()*.4),sy:size*(.66+random()*.27),sz:size*(.85+random()*.35),rx:(random()-.5)*.5,ry:random()*Math.PI*2,rz:(random()-.5)*.5,tint:Math.floor(random()*shades.length)});
        }
      }
    }
    // Loose chunks around the foot break up the circular pile boundary.
    for(let i=0;i<(small?5:18);i++){
      const angle=random()*Math.PI*2,distance=radius*(.84+random()*.1),size=(small?.12:.20)+random()*.15;
      batches[i%4].push({x:cx+Math.cos(angle)*distance,y:size*.45,z:cz+Math.sin(angle)*distance*stretch,sx:size*1.2,sy:size*.7,sz:size,rx:random(),ry:random()*6,rz:random(),tint:i%shades.length});
    }
  }
  const pose=new T.Object3D();
  return batches.map((stones,variant)=>{
    const field=k.instances(geometries[variant],material,stones.length,parent);
    stones.forEach((stone,index)=>{
      pose.position.set(stone.x,stone.y,stone.z);pose.rotation.set(stone.rx,stone.ry,stone.rz);pose.scale.set(stone.sx,stone.sy,stone.sz);pose.updateMatrix();
      field.setMatrixAt(index,pose.matrix);field.setColorAt(index,shades[stone.tint]);
    });
    field.instanceMatrix.needsUpdate=true;if(field.instanceColor)field.instanceColor.needsUpdate=true;
    // The stones are the pile itself, so they must never use distance-based hiding.
    return field;
  });
}
