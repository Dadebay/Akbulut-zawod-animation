import * as T from 'three';
import {inRawYard,RAW_YARD,outerRailPath} from './siteLayout.js';
import {QUARRY} from './quarryLayout.js';
import {freightRailExtensionPath} from './rail.js';

// Sculpted from the supplied aerial photo and the site's Google Maps satellite
// view. This is a compressed visual reconstruction, not surveyed elevation data.
const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+19.7)*43758.5453;return n-Math.floor(n);};
export function noise(x,y){
  const a=Math.floor(x),b=Math.floor(y),u=smooth(0,1,x-a),v=smooth(0,1,y-b);
  return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),u),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v);
}
function fbm(x,z){let value=0,weight=.55;for(let i=0;i<5;i++){value+=weight*noise(x,z);x=x*2.07+13.7;z=z*2.03-7.3;weight*=.47;}return value;}
function ridge(x,z){let value=0,weight=.6;for(let i=0;i<4;i++){value+=weight*(1-Math.abs(2*noise(x,z)-1));x=x*2.11+4.3;z=z*2.04+19.1;weight*=.44;}return value;}
function drainage(x,z){
  // Wide main wadis and smaller tributaries, running downhill towards the plain.
  let d=1e4;
  for(const [offset,slope,width] of [[-255,-.14,19],[-80,.17,11],[132,.27,16],[375,-.12,23]]){
    const centre=offset+slope*(x-120)+19*Math.sin(x*.009+offset*.013)+10*Math.sin(x*.023+offset);
    d=Math.min(d,Math.abs(z-centre)/width);
    const branch=centre+(x-320)*.42;
    if(x>320)d=Math.min(d,Math.abs(z-branch)/(width*.43));
  }
  return d;
}
export function naturalHeight(x,z){
  const rise=smooth(104,300,x),warp=fbm(x*.006,z*.006);
  const r=ridge(x*.012+warp*2,z*.008+warp);
  const front=19*Math.exp(-(((x-285-z*.09)/120)**2))*(.48+.52*r);
  const middle=47*Math.exp(-(((x-505-z*.12-40*Math.sin(z*.006))/155)**2))*(.46+.54*r);
  const back=67*Math.exp(-(((x-890+z*.19)/230)**2))*(.6+.4*r);
  let h=(3+front+middle+back+12*r+5*fbm(x*.041,z*.032))*rise;
  const d=drainage(x,z),cut=Math.exp(-d*d*.7)*(.25+.75*smooth(135,430,x));
  h*=1-.48*cut;
  h+=rise*(fbm(x*.18,z*.15)-.5)*2.8;
  // Exposed limestone behind the working apron; open on its downhill side.
  h+=12*Math.exp(-(((x-QUARRY.x-45)/45)**2)-((z-QUARRY.z)/51)**2);
  const q=Math.hypot((x-QUARRY.x-13)/34,(z-QUARRY.z-1)/32);
  if(q<2.1){
    const terrace=QUARRY.y+.51+Math.floor(Math.max(0,q-.78)/.24)*4.1;
    const floor=q<.78?QUARRY.y+.51:Math.min(h,terrace);
    h=T.MathUtils.lerp(floor,h,smooth(1.65,2.1,q));
  }
  return Math.max(-.55,h-.55);
}

function groundTexture(k){
  const size=k.tablet?256:768,c=document.createElement('canvas');c.width=c.height=size;
  const ctx=c.getContext('2d'),pixels=ctx.createImageData(size,size);let seed=487;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    seed=(1664525*seed+1013904223)>>>0;
    const grain=seed/4294967296,patch=noise(x/75,y/75),small=noise(x/12,y/12);
    const v=172+patch*43+small*20+(grain-.5)*47,i=(y*size+x)*4;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  // Discontinuous fissures and coarse grit, rather than uniform white noise.
  for(let i=0;i<95;i++){
    const x=hash(i,2)*size,y=hash(i,9)*size,l=6+hash(i,8)*35;
    ctx.strokeStyle=`rgba(77,70,60,${.08+hash(i,11)*.13})`;ctx.lineWidth=.6+hash(i,6)*1.2;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+l*.4,y+l*.12);ctx.lineTo(x+l*.6,y-l*.14);ctx.lineTo(x+l,y-l*.1);ctx.stroke();
  }
  const t=k.trackTexture(new T.CanvasTexture(c));t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}

export function buildTerrain(k,curve){
  const route=Array.from({length:281},(_,i)=>curve.getPointAt(i/280));
  const roadBounds=new T.Box3().setFromPoints(route).expandByScalar(12);
  const rail=outerRailPath(),railRoute=Array.from({length:481},(_,i)=>rail.getPointAt(i/480));
  const freightRail=freightRailExtensionPath(),freightRoute=Array.from({length:181},(_,i)=>freightRail.getPointAt(i/180));
  const freightBounds=new T.Box3().setFromPoints(freightRoute).expandByScalar(16);
  function freightRailDistance(x,z){
    if(x<freightBounds.min.x||x>freightBounds.max.x||z<freightBounds.min.z||z>freightBounds.max.z)return Infinity;
    let nearest=Infinity;
    for(const p of freightRoute)nearest=Math.min(nearest,(x-p.x)**2+(z-p.z)**2);
    return Math.sqrt(nearest);
  }
  function roadDistance(x,z){
    let nearest=1e9,height=0;
    // The haul loop occupies only a small part of the terrain.
    if(x>roadBounds.min.x&&x<roadBounds.max.x&&z>roadBounds.min.z&&z<roadBounds.max.z)for(const p of route){const d=(x-p.x)**2+(z-p.z)**2;if(d<nearest){nearest=d;height=p.y;}}
    return {distance:Math.sqrt(nearest),height};
  }
  function elevation(x,z){
    let h=naturalHeight(x,z);const {distance,height}=roadDistance(x,z);
    h=T.MathUtils.lerp(height-.06,h,smooth(4,12,distance));
    if(inRawYard(x,z,10)){const edge=Math.max(RAW_YARD.west-x,x-RAW_YARD.east,RAW_YARD.north-z,z-RAW_YARD.south,0);h=T.MathUtils.lerp(-.27,h,smooth(0,10,edge));}
    // A level track bed with soft shoulders keeps the yard-side line visible
    // even on the coarser tablet terrain grid.
    h=T.MathUtils.lerp(-.18,h,smooth(8,16,freightRailDistance(x,z)));
    if(x>95&&x<575&&z>33&&z<181){let nearest=Infinity,y=0;for(const p of railRoute){const ds=(x-p.x)**2+(z-p.z)**2;if(ds<nearest){nearest=ds;y=p.y;}}h=T.MathUtils.lerp(y-.13,h,smooth(3.5,10,Math.sqrt(nearest)));}
    // Excavator and turnaround apron, at exactly the same level as the vehicles.
    const apron=Math.hypot((x-QUARRY.x-2)/17,(z-QUARRY.z)/13);
    h=T.MathUtils.lerp(QUARRY.y-.04,h,smooth(.8,1.25,apron));
    return h;
  }
  const columns=k.tablet?160:320,rows=k.tablet?180:360;
  const geometry=new T.PlaneGeometry(1,1,columns,rows);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position,uv=geometry.attributes.uv,colors=[];
  const sand=new T.Color('#c4bca9'),chalk=new T.Color('#ddd7c7'),clay=new T.Color('#9e9585'),bed=new T.Color('#b0a18b'),color=new T.Color();
  for(let i=0;i<p.count;i++){
    const u=p.getX(i)+.5,v=p.getZ(i)*2;
    const x=-230+1830*Math.pow(u,1.65),z=Math.sign(v)*1300*Math.pow(Math.abs(v),1.6),h=elevation(x,z);
    p.setXYZ(i,x,h,z);uv.setXY(i,x/24,z/24);
    const dx=naturalHeight(x+1.5,z)-naturalHeight(x-1.5,z),dz=naturalHeight(x,z+1.5)-naturalHeight(x,z-1.5),slope=Math.hypot(dx,dz)/3;
    const band=noise(x*.02,z*.02)*1.7+h*.46;
    const strata=smooth(.63,.9,Math.sin(band*2.1)*.5+.5);
    color.copy(sand).lerp(chalk,Math.min(.62,slope*.32+strata*.25));
    color.lerp(clay,fbm(x*.032,z*.032)*.34);
    color.lerp(bed,Math.exp(-(drainage(x,z)**2))*.3*smooth(110,180,x));
    color.multiplyScalar(.91+noise(x*.3,z*.3)*.13);
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  // Sample the rendered triangles for loose stones. Sampling the analytic field
  // alone can leave a stone suspended over a sharp, tessellated quarry bench.
  function surfaceHeight(x,z){
    const gx=T.MathUtils.clamp(Math.pow((x+230)/1830,1/1.65)*columns,0,columns-.001);
    const gz=T.MathUtils.clamp((Math.sign(z)*Math.pow(Math.abs(z)/1300,1/1.6)+1)*rows/2,0,rows-.001);
    const ix=Math.floor(gx),iz=Math.floor(gz),tx=gx-ix,tz=gz-iz,a=iz*(columns+1)+ix;
    const h00=p.getY(a),h10=p.getY(a+1),h01=p.getY(a+columns+1),h11=p.getY(a+columns+2);
    return tx+tz<=1?h00+(h10-h00)*tx+(h01-h00)*tz:h11+(h01-h11)*(1-tx)+(h10-h11)*(1-tz);
  }
  const grain=groundTexture(k),ground=k.material('#ffffff',0,1,{vertexColors:true,map:grain,bumpMap:grain,bumpScale:.24});
  // Project the grain from three directions so steep quarry faces do not stretch
  // the horizontal ground texture into long, artificial vertical streaks.
  ground.onBeforeCompile=shader=>{
    const varyings='varying vec3 vTerrainPosition;\nvarying vec3 vTerrainNormal;\n';
    shader.vertexShader=varyings+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainPosition = position;\nvTerrainNormal = normal;');
    shader.fragmentShader=varyings+shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 terrainBlend = pow(abs(normalize(vTerrainNormal)), vec3(5.0));
      terrainBlend /= max(dot(terrainBlend, vec3(1.0)), 0.001);
      vec4 terrainGrain = texture2D(map, vTerrainPosition.yz / 24.0) * terrainBlend.x
        + texture2D(map, vTerrainPosition.xz / 24.0) * terrainBlend.y
        + texture2D(map, vTerrainPosition.xy / 24.0) * terrainBlend.z;
      diffuseColor *= terrainGrain;
    `);
  };
  ground.customProgramCacheKey=()=> 'akbulut-terrain-triplanar-v1';
  const surface=k.mesh(geometry,ground);surface.castShadow=false;
  // The sculpted grid ends at x=-230. Continue the same flat plain westwards so the
  // edge of the model never shows behind the campus (fog hides the far end).
  const plain=new T.PlaneGeometry(2400,2600);plain.rotateX(-Math.PI/2);plain.translate(-229-1200,-.56,0);
  const plainColor=new T.Color('#bdb4a0'),plainColors=[];for(let i=0;i<plain.attributes.position.count;i++)plainColors.push(plainColor.r,plainColor.g,plainColor.b);
  plain.setAttribute('color',new T.Float32BufferAttribute(plainColors,3));
  k.mesh(plain,ground).castShadow=false;

  function ribbon(width,offset,color){
    const positions=[],uvs=[],indices=[];
    for(let i=0;i<=280;i++){
      const pt=route[i],d=curve.getTangentAt(i/280),w=width+(noise(i*.13,9)-.5)*.45;
      for(const side of [-1,1]){const x=pt.x-d.z*w*side,z=pt.z+d.x*w*side;positions.push(x,pt.y+offset,z);uvs.push(x/24,z/24);}
      if(i<280){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
    const road=k.mesh(g,k.material(color,0,1,{map:grain,bumpMap:grain,bumpScale:.035,side:T.DoubleSide}));road.castShadow=false;
  }
  ribbon(3.7,.015,'#b5ad9c');ribbon(2.7,.045,'#bdb6a6');
  const tyre=k.material('#9e9584',0,1);
  for(let i=8;i<273;i+=2){const pt=route[i],d=curve.getTangentAt(i/280);for(const side of [-1,1]){
    const mark=k.box(1.1,.009,.18,[pt.x-d.z*side*.82,pt.y+.06,pt.z+d.x*side*.82],tyre);mark.rotation.y=-Math.atan2(d.z,d.x);
  }}

  // Low, angular fragments across the slopes. Instancing keeps the whole field
  // to two draw calls; no thousands of separate per-frame objects.
  const rockGeo=new T.IcosahedronGeometry(1,1),stone=k.material('#ffffff',0,.98,{map:grain,bumpMap:grain,bumpScale:.08});
  const rp=rockGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),r=.76+noise(x*4+z,y*4)*.4;rp.setXYZ(i,x*r,y*r,z*r);}
  const rockCount=k.tablet?1000:3000;
  const rocks=k.instances(rockGeo,stone,rockCount),dummy=new T.Object3D(),rockColor=new T.Color();
  for(let i=0;i<rockCount;i++){
    let x=122+hash(i,1)*640,z=(hash(i,3)-.5)*1040;
    if(i<650){const a=hash(i,4)*Math.PI*2,r=12+hash(i,7)*32;x=QUARRY.x+18+Math.cos(a)*r;z=QUARRY.z+1+Math.sin(a)*r;}
    const gap=roadDistance(x,z).distance,apron=Math.hypot((x-QUARRY.x-2)/17,(z-QUARRY.z)/13);
    const scale=gap<4.1||freightRailDistance(x,z)<4||apron<.8||inRawYard(x,z,3)?0:(i<650?.16+hash(i,5)*.65:.10+hash(i,5)**4*1.5);
    dummy.position.set(x,surfaceHeight(x,z)+scale*.06,z);dummy.rotation.set(hash(i,8)*.5,hash(i,9)*6,hash(i,11)*.5);dummy.scale.set(scale*1.4,scale*.55,scale);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    rockColor.set(i%3?'#bcb3a1':'#d4cdbd').multiplyScalar(.9+hash(i,15)*.18);rocks.setColorAt(i,rockColor);
  }
  rocks.instanceMatrix.needsUpdate=true;rocks.instanceColor.needsUpdate=true;
  // Sparse, low desert scrub visible in the satellite reference, separate from
  // the user's yolka planting inside the factory grounds.
  const scrubCount=k.tablet?600:2200;
  const scrub=k.instances(new T.IcosahedronGeometry(1,0),k.material('#76715e',0,1),scrubCount);
  for(let i=0;i<scrubCount;i++){
    const x=115+hash(i,28)*800,z=(hash(i,31)-.5)*1500,gap=roadDistance(x,z).distance;
    const q=Math.hypot((x-QUARRY.x-13)/45,(z-QUARRY.z-1)/43),s=gap<6||freightRailDistance(x,z)<4||q<1.6||inRawYard(x,z,3)?0:.12+hash(i,32)*.45;
    dummy.position.set(x,surfaceHeight(x,z)+s*.12,z);dummy.rotation.set(hash(i,36),i,hash(i,37));dummy.scale.set(s,s*.35,s*.8);dummy.updateMatrix();scrub.setMatrixAt(i,dummy.matrix);
  }
  scrub.instanceMatrix.needsUpdate=true;
  function vehicleSurface(x,z){if(inRawYard(x,z))return 0;const road=roadDistance(x,z);return road.distance<3.7?road.height+.045:surfaceHeight(x,z);}
  return {elevation,vehicleSurface};
}
