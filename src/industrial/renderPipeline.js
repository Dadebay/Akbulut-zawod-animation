import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {antialiasMode} from '../renderBudget.js';

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

export function createRenderPipeline(renderer,scene,camera){
  const composer=new EffectComposer(renderer),render=new RenderPass(scene,camera),fxaa=new ShaderPass(FXAAShader),output=new OutputPass();
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
