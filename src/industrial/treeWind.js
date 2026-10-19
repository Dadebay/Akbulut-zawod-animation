import * as T from 'three';

export const treeWindDisplacement=(height,phase,time)=>Math.pow(Math.max(0,height)/7.5,2)*.10*Math.sin(time*.85+phase);
export function addTreeWind(k,material){
  const patch=shader=>{
    shader.uniforms.treeWindTime=k.windTime;
    shader.vertexShader='uniform float treeWindTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 windOrigin = vec3(0.0);
      #ifdef USE_INSTANCING
        windOrigin = instanceMatrix[3].xyz;
      #endif
      float windBend = pow(max(position.y, 0.0) / 7.5, 2.0) * 0.10;
      transformed.x += windBend * sin(treeWindTime * 0.85 + windOrigin.x * 0.07 + windOrigin.z * 0.09);
      transformed.z += windBend * 0.55 * sin(treeWindTime * 0.63 + windOrigin.x * 0.06);`);
  };
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);patch(shader);};
  material.customProgramCacheKey=()=>cache+':tree-wind-v1';
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:material.map,alphaTest:material.alphaTest,side:material.side});
  depth.onBeforeCompile=patch;depth.customProgramCacheKey=()=> 'tree-wind-depth-v1';k.trackMaterial(depth);
  material.userData.treeDepth=depth;
}
