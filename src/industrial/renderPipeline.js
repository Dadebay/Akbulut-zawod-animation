import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {LUTPass} from 'three/addons/postprocessing/LUTPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {Vector2} from 'three';
import {createArchitecturalLUT} from './lighting.js';
import {N8AOPass} from 'n8ao';

// The AO transparency subpasses must reuse the beauty pass's shadow maps.
// Re-rendering shadows after hiding opaque geometry discards its occlusion and
// submits distant casters again. Always restore renderer state, even on failure.
export function withoutShadowRefresh(renderer,draw){
  const {autoUpdate,needsUpdate}=renderer.shadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  try{return draw();}finally{renderer.shadowMap.autoUpdate=autoUpdate;renderer.shadowMap.needsUpdate=needsUpdate;}
}
class PlantAOPass extends N8AOPass {
  renderTransparency(renderer){
    this.beautyTriangles=renderer.info.render.triangles;
    withoutShadowRefresh(renderer,()=>super.renderTransparency(renderer));
    this.transparencyTriangles=renderer.info.render.triangles-this.beautyTriangles;
  }
}

// Resizing WebGL clears its drawing buffer. Queue size/quality changes and
// apply them immediately before drawing, so the browser never presents that
// cleared buffer between animation frames (including when paused/throttled).
export function createFramePresenter(renderer,configure,draw){
  let pending=null,width=0,height=0;
  return {
    resize(w,h,pixelRatio){
      pending={width:Math.max(1,w),height:Math.max(1,h),ratio:pixelRatio??pending?.ratio??renderer.getPixelRatio()};
    },
    render(){
      if(pending){
        const next=pending;pending=null;
        const ratioChanged=renderer.getPixelRatio()!==next.ratio;
        const sizeChanged=width!==next.width||height!==next.height;
        if(ratioChanged)renderer.setPixelRatio(next.ratio);
        if(sizeChanged)renderer.setSize(next.width,next.height);
        if(ratioChanged||sizeChanged)configure(next.width,next.height);
        width=next.width;height=next.height;
      }
      draw();
    },
  };
}

export function createRenderPipeline(renderer,scene,camera,{ambientOcclusion=false}={}){
  const composer=new EffectComposer(renderer),output=new OutputPass();
  const aa=ambientOcclusion?new SMAAPass():new ShaderPass(FXAAShader);
  const lut=createArchitecturalLUT(),grade=new LUTPass({lut,intensity:.35});
  let render;
  if(ambientOcclusion){
    render=new PlantAOPass(scene,camera,1,1);render.autosetGamma=false;
    Object.assign(render.configuration,{aoRadius:2,distanceFalloff:1,intensity:2.4,gammaCorrection:false,aoSamples:16,denoiseSamples:8,halfRes:true,depthAwareUpsampling:true});
  }else render=new RenderPass(scene,camera);
  const bloom=ambientOcclusion?new UnrealBloomPass(new Vector2(1,1),.045,.15,4):null;
  composer.addPass(render);
  if(bloom){bloom.enabled=false;composer.addPass(bloom);}
  // r181 SMAA operates in linear space; FXAA and the neutral LUT use display RGB.
  if(ambientOcclusion)composer.addPass(aa);
  composer.addPass(output);composer.addPass(grade);
  if(!ambientOcclusion)composer.addPass(aa);
  renderer.info.autoReset=false;
  let previousSamples=-1;
  function resize(width,height){
    // FXAA remains active in the light profile; 2× MSAA avoids the large
    // 4× colour/depth buffers that stall integrated GPUs at desktop sizes.
    const ratio=renderer.getPixelRatio(),samples=ambientOcclusion?0:Math.min(2,renderer.capabilities.maxSamples);
    if(samples!==previousSamples){
      for(const target of [composer.renderTarget1,composer.renderTarget2]){target.dispose();target.samples=samples;}
      previousSamples=samples;
    }
    composer.setPixelRatio(ratio);composer.setSize(width,height);
    if(!ambientOcclusion)aa.uniforms.resolution.value.set(1/Math.max(1,width*ratio),1/Math.max(1,height*ratio));
  }
  const presenter=createFramePresenter(renderer,resize,()=>{renderer.info.reset();composer.render();});
  return {...presenter,get breakdown(){return {beauty:render.beautyTriangles,transparency:render.transparencyTriangles};},resources:[composer.renderTarget1,composer.renderTarget2,render,aa,grade,bloom],
    update(distance,night){
      if(ambientOcclusion){render.configuration.aoRadius=Math.min(4,Math.max(1.5,distance*.018));render.configuration.intensity=Math.min(3.1,2.2+distance*.003);}
      if(bloom)bloom.enabled=night;
    },
    dispose(){render.dispose();aa.dispose();output.dispose();grade.dispose();lut.dispose();bloom?.dispose();composer.dispose();},
  };
}
