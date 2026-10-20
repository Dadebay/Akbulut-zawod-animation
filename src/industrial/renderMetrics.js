import * as T from 'three';

// Estimate allocated texture storage, not JS heap or driver-reported VRAM.
// Includes mip chains, depth attachments and multisampled composer targets.
export function estimateTextureBytes(texture){
  if(texture.isCompressedTexture)return texture.mipmaps.reduce((sum,m)=>sum+m.data.byteLength,0);
  const images=Array.isArray(texture.image)?texture.image:[texture.image];
  return images.reduce((sum,img)=>{
    if(!img)return sum;
    const channels=texture.format===T.RedFormat||texture.format===T.DepthFormat?1:texture.format===T.RGFormat?2:4;
    const bytes=texture.type===T.FloatType||texture.type===T.UnsignedIntType||texture.type===T.UnsignedInt248Type?4:texture.type===T.HalfFloatType||texture.type===T.UnsignedShortType?2:1;
    return sum+(img.width||0)*(img.height||0)*(img.depth||1)*channels*bytes*(texture.generateMipmaps?4/3:1);
  },0);
}

export function estimateSceneTextureBytes(scene,kit,pipeline){
  const seen=new Set(),textures=new Set();let extra=0;
  function scan(value,depth=0){
    if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
    if(value.isTexture){textures.add(value);return;}
    if(value.isWebGLRenderTarget){
      for(const tex of value.textures){scan(tex);extra+=estimateTextureBytes(tex)*(value.samples||0);}
      if(value.depthTexture)scan(value.depthTexture);
      else if(value.depthBuffer)extra+=value.width*value.height*4*Math.max(1,value.samples||0);
      return;
    }
    if(depth>5||value.isObject3D||ArrayBuffer.isView(value))return;
    for(const [key,child] of Object.entries(value))if(!['renderer','_renderer','parent','scene','camera'].includes(key))scan(child,depth+1);
  }
  kit.getTextures().forEach(scan);scan(scene.environment);scan(scene.background);scan(pipeline.resources);
  scene.traverse(o=>{if(o.shadow?.map)scan(o.shadow.map);});
  return Math.ceil([...textures].reduce((sum,t)=>sum+estimateTextureBytes(t),extra));
}
