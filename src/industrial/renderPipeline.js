import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {antialiasMode} from '../renderBudget.js';
import {N8AOPass} from 'n8ao';

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
  const composer=new EffectComposer(renderer),fxaa=new ShaderPass(FXAAShader),output=new OutputPass();
  // Ambient occlusion grounds objects in their contact shadows. It replaces the
  // plain scene pass; the output pass after it handles tone mapping and sRGB.
  let render;
  if(ambientOcclusion){
    render=new N8AOPass(scene,camera,1,1);render.autosetGamma=false;
    Object.assign(render.configuration,{aoRadius:3.5,distanceFalloff:1,intensity:3.5,gammaCorrection:false,aoSamples:16,denoiseSamples:8});
  }else render=new RenderPass(scene,camera);
  // FXAA detects contrast in display space, after tone mapping and output conversion.
  composer.addPass(render);composer.addPass(output);composer.addPass(fxaa);
  renderer.info.autoReset=false;
  let previousSamples=-1;
  function resize(width,height){
    const ratio=renderer.getPixelRatio(),{samples,useFXAA}=antialiasMode(ratio);fxaa.enabled=useFXAA;
    if(samples!==previousSamples){
      for(const target of [composer.renderTarget1,composer.renderTarget2]){target.dispose();target.samples=samples;}
      previousSamples=samples;
    }
    composer.setPixelRatio(ratio);composer.setSize(width,height);
    fxaa.uniforms.resolution.value.set(1/Math.max(1,width*ratio),1/Math.max(1,height*ratio));
  }
  const presenter=createFramePresenter(renderer,resize,()=>{renderer.info.reset();composer.render();});
  return {...presenter,dispose(){render.dispose();fxaa.dispose();output.dispose();composer.dispose();}};
}
