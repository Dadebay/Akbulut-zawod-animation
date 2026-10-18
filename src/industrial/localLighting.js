import * as T from 'three';

// World-space light lists. Every lamp stays on; fragments only evaluate lamps
// whose fixed range reaches their tile, independently of the camera and zoom.
export function createLocalLighting(k,lights){
  const cellSize=16,columns=128,rows=64,origin=new T.Vector2(-1024,-384),indexWidth=256;
  const cells=Array.from({length:columns*rows},()=>[]);
  const capacity=Math.max(1,lights.reduce((n,l)=>n+(Math.ceil(2*l.range/cellSize)+2)**2,0));
  const indexHeight=Math.ceil(capacity/indexWidth);
  const lightData=new Float32Array(Math.max(1,lights.length)*16);
  const cellData=new Float32Array(columns*rows*4),indexData=new Float32Array(indexWidth*indexHeight*4);
  function texture(data,w,h){
    const map=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);
    map.minFilter=map.magFilter=T.NearestFilter;map.generateMipmaps=false;
    map.needsUpdate=true;return k.trackTexture(map);
  }
  const lightMap=texture(lightData,4,Math.max(1,lights.length));
  const cellMap=texture(cellData,columns,rows),indexMap=texture(indexData,indexWidth,indexHeight);
  const uniforms={campusNight:{value:0},campusLights:{value:lightMap},campusCells:{value:cellMap},campusIndices:{value:indexMap}};
  k.addMaterialEffect(mat=>{
    if(!mat.isMeshStandardMaterial)return;
    const previous=mat.onBeforeCompile,cacheKey=mat.customProgramCacheKey();
    mat.onBeforeCompile=function(shader,renderer){
      previous.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCampusPosition;')
        .replace('#include <project_vertex>',`#include <project_vertex>
          vec4 campusPosition = vec4(transformed, 1.0);
          #ifdef USE_BATCHING
            campusPosition = batchingMatrix * campusPosition;
          #endif
          #ifdef USE_INSTANCING
            campusPosition = instanceMatrix * campusPosition;
          #endif
          vCampusPosition = (modelMatrix * campusPosition).xyz;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vCampusPosition;
        uniform float campusNight;
        uniform sampler2D campusLights;
        uniform sampler2D campusCells;
        uniform sampler2D campusIndices;`)
        .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        if (campusNight > 0.5) {
          ivec2 tile = ivec2(floor((vCampusPosition.xz - vec2(${origin.x}.0, ${origin.y}.0)) / ${cellSize}.0));
          if (tile.x >= 0 && tile.y >= 0 && tile.x < ${columns} && tile.y < ${rows}) {
            vec2 list = texelFetch(campusCells, tile, 0).rg;
            for (int entry = 0; entry < int(list.y); entry++) {
              int at = int(list.x) + entry;
              int lamp = int(texelFetch(campusIndices, ivec2(at % ${indexWidth}, at / ${indexWidth}), 0).r);
              vec4 source = texelFetch(campusLights, ivec2(0, lamp), 0);
              vec3 delta = source.xyz - vCampusPosition;
              float distanceSquared = dot(delta, delta);
              if (distanceSquared >= source.w * source.w) continue;
              vec4 colour = texelFetch(campusLights, ivec2(1, lamp), 0);
              vec4 cone = texelFetch(campusLights, ivec2(2, lamp), 0);
              vec3 direction = delta / max(sqrt(distanceSquared), 0.001);
              float cutoff = pow(max(1.0 - pow(distanceSquared / (source.w * source.w), 2.0), 0.0), 2.0);
              float beam = cone.w < -1.0 ? 1.0 : smoothstep(cone.w, mix(cone.w, 1.0, 0.55), dot(-direction, cone.xyz));
              if (beam <= 0.0) continue;
              IncidentLight campusLight;
              campusLight.color = colour.rgb * (colour.a * cutoff * beam / max(distanceSquared, 0.5));
              campusLight.direction = (viewMatrix * vec4(direction, 0.0)).xyz;
              campusLight.visible = true;
              RE_Direct(campusLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
            }
          }
        }`);
    };
    mat.customProgramCacheKey=()=>`${cacheKey}:campus-all-lights-v1`;mat.needsUpdate=true;
  });
  function update(){
    cells.forEach(cell=>{cell.length=0;});
    lights.forEach((light,i)=>{
      const {position:p,color:c,range,direction}=light,offset=i*16;
      lightData.set([p.x,p.y,p.z,range,c.r,c.g,c.b,light.enabled?light.intensity:0,direction?.x||0,direction?.y||0,direction?.z||0,light.cone??-2],offset);
      if(!light.enabled)return;
      const minX=Math.max(0,Math.floor((p.x-range-origin.x)/cellSize)),maxX=Math.min(columns-1,Math.floor((p.x+range-origin.x)/cellSize));
      const minZ=Math.max(0,Math.floor((p.z-range-origin.y)/cellSize)),maxZ=Math.min(rows-1,Math.floor((p.z+range-origin.y)/cellSize));
      for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
        const dx=Math.max(origin.x+x*cellSize-p.x,p.x-origin.x-(x+1)*cellSize,0);
        const dz=Math.max(origin.y+z*cellSize-p.z,p.z-origin.y-(z+1)*cellSize,0);
        if(dx*dx+dz*dz<=range*range)cells[z*columns+x].push(i);
      }
    });
    let offset=0;
    cells.forEach((cell,i)=>{cellData[i*4]=offset;cellData[i*4+1]=cell.length;for(const lamp of cell)indexData[offset++*4]=lamp;});
    lightMap.needsUpdate=cellMap.needsUpdate=indexMap.needsUpdate=true;
  }
  return {update,setNight:value=>{uniforms.campusNight.value=value?1:0;}};
}
