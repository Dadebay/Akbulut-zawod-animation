import * as T from 'three';

// HDRLoader stores scanlines from the top, and uploads with flipY=true.
export function brightestSkyDirection({data,width,height},type=T.HalfFloatType){
  const channels=data.length/(width*height),read=type===T.HalfFloatType?T.DataUtils.fromHalfFloat:v=>v;
  let peak=-Infinity,index=0;
  for(let i=0;i<width*Math.floor(height/2);i++){
    const at=i*channels,luma=.2126*read(data[at])+.7152*read(data[at+1])+.0722*read(data[at+2]);
    if(Number.isFinite(luma)&&luma>peak){peak=luma;index=i;}
  }
  const azimuth=((index%width+.5)/width-.5)*Math.PI*2;
  const elevation=(.5-(Math.floor(index/width)+.5)/height)*Math.PI;
  return new T.Vector3(Math.cos(elevation)*Math.cos(azimuth),Math.sin(elevation),Math.cos(elevation)*Math.sin(azimuth));
}

// The production facade faces -X; a little +Z light also reaches the entrances.
// Rotate the sky and its reflections together, preserving the photographed sun's height.
export function orientSkyToFront(scene,direction){
  const yaw=Math.atan2(direction.z,direction.x)-Math.atan2(.55,-1);
  scene.backgroundRotation.set(0,yaw,0);
  scene.environmentRotation.set(0,yaw,0);
  return direction.clone().applyEuler(scene.backgroundRotation);
}

// Fixed light basis + texel-snapped translation. The square only changes size
// when zoom crosses a 16 m band; orbiting cannot rotate the shadow texel grid.
export function fitSunShadow(sun,camera,target,direction,{mapSize=4096}={}){
  const distance=camera.position.distanceTo(target);
  const halfView=distance*Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.max(1,camera.aspect);
  const required=halfView*1.5+24,previous=sun.userData.fittedShadowExtent;
  const extent=!previous||required>previous+.01||required<previous-16.01?Math.max(48,Math.ceil((required+.01)/16)*16):previous;
  sun.userData.fittedShadowExtent=extent;
  const basis=new T.Matrix4().lookAt(direction,new T.Vector3(),new T.Vector3(0,1,0));
  const inverse=basis.clone().invert(),centre=target.clone().applyMatrix4(inverse),texel=extent*2/mapSize;
  centre.x=Math.round(centre.x/texel)*texel;centre.y=Math.round(centre.y/texel)*texel;
  centre.applyMatrix4(basis);
  sun.target.position.copy(centre);sun.target.updateMatrix();
  sun.position.copy(centre).addScaledVector(direction,900);sun.updateMatrix();
  Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:200,far:1600});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias=.03;sun.shadow.bias=-.000045;sun.shadow.radius=1.5;
  return {extent,texel};
}

export function createArchitecturalLUT(size=16){
  const bytes=new Uint8Array(size**3*4);
  for(let b=0;b<size;b++)for(let g=0;g<size;g++)for(let r=0;r<size;r++){
    const rgb=[r,g,b].map(v=>v/(size-1)),luma=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    const at=((b*size+g)*size+r)*4;
    rgb.forEach((v,c)=>{bytes[at+c]=Math.round(T.MathUtils.clamp((luma+(v-luma)*.97-.5)*1.025+.5,0,1)*255);});bytes[at+3]=255;
  }
  const lut=new T.Data3DTexture(bytes,size,size,size);lut.minFilter=lut.magFilter=T.LinearFilter;lut.needsUpdate=true;return lut;
}
