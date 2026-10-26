import * as T from 'three';
import {NEW_FACTORY_ENTRANCE} from './siteLayout.js';

export const FACTORY_PAVING={west:NEW_FACTORY_ENTRANCE.southFenceX,east:97,north:-50,south:40,pitch:4.5};

// The asphalt already supplies a world-space grain. Draw the joints in the
// same coordinates so adjoining slabs, road ribbons and batched parts align.
// Public roads outside the factory fence retain their existing finish.
export function applyFactoryPaving(material){
  if(material.userData.factoryPaving)return;
  material.userData.factoryPaving=true;
  const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey(),p=FACTORY_PAVING;
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    Object.assign(shader.uniforms,{
      factoryPavingBounds:{value:new T.Vector4(p.west,p.north,p.east,p.south)},
      factoryPavingPitch:{value:p.pitch},
      factoryPavingColor:{value:new T.Color('#43494d')},
      factoryPavingJoint:{value:new T.Color('#1d2326')},
    });
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform vec4 factoryPavingBounds;
        uniform float factoryPavingPitch;
        uniform vec3 factoryPavingColor;
        uniform vec3 factoryPavingJoint;`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec2 factoryPosition=vSurfaceWorld.xz;
        float factoryMask=step(factoryPavingBounds.x,factoryPosition.x)
          *step(factoryPavingBounds.y,factoryPosition.y)
          *step(factoryPosition.x,factoryPavingBounds.z)
          *step(factoryPosition.y,factoryPavingBounds.w);
        vec2 factoryCell=(factoryPosition-factoryPavingBounds.xy)/factoryPavingPitch;
        vec2 factoryEdge=abs(fract(factoryCell+.5)-.5)*factoryPavingPitch;
        vec2 factoryAA=max(fwidth(factoryPosition),vec2(.001));
        vec2 factoryLine=vec2(1.0)-smoothstep(vec2(.025)-factoryAA*.5,vec2(.025)+factoryAA*.5,factoryEdge);
        float factorySeam=max(factoryLine.x,factoryLine.y);
        float factoryGrain=clamp(dot(sampledDiffuseColor.rgb/photoMean,vec3(1.0/3.0)),.92,1.08);
        vec3 factoryFinish=mix(factoryPavingColor*factoryGrain,factoryPavingJoint,factorySeam);
        diffuseColor.rgb=mix(diffuseColor.rgb,factoryFinish,factoryMask);`);
  };
  material.customProgramCacheKey=()=>`${cacheKey}:factory-paving-v1`;
  material.needsUpdate=true;
}
