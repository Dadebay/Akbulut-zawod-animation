import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {CEILING_PANEL_TYPES,createCeilingPanelStyles} from './industrial/ceilingPanelStyles.js';

test('local product photos load independently and are shared across panel consumers',()=>{
  const previousDocument=globalThis.document,previousImage=globalThis.Image,images=[];
  globalThis.document={createElement:()=>({
    getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})}),
  })};
  globalThis.Image=class {constructor(){images.push(this);}};
  const k=createKit(new T.Scene(),{tablet:true});
  try{
    const styles=createCeilingPanelStyles(k);
    assert.equal(createCeilingPanelStyles(k),styles);
    assert.equal(images.length,CEILING_PANEL_TYPES.length,'one request per finish, not per sheet');
    assert.equal(new Set(styles.decorated.map(m=>m.map)).size,CEILING_PANEL_TYPES.length);
    styles.decorated.forEach((mat,i)=>{
      assert.equal(images[i].src,`/${mat.userData.productPhoto}`);
      assert.ok(existsSync(new URL(`../public/${mat.userData.productPhoto}`,import.meta.url)));
    });
    const [white,green,yellow,metal]=styles.decorated,greenVersion=green.map.version;
    const whiteVersion=white.map.version;
    images[0].onload();
    assert.equal(white.map.version,whiteVersion+1);
    assert.equal(white.color.getHexString(),'ffffff');
    assert.equal(green.map.version,greenVersion,'white photo cannot overwrite the green finish');
    images[1].onload();
    assert.equal(green.color.getHexString(),'89ad87');
    const yellowColor=yellow.color.getHexString(),yellowVersion=yellow.map.version;
    images[2].onerror();
    assert.equal(yellow.color.getHexString(),yellowColor,'failed photo keeps its fallback');
    assert.equal(yellow.map.version,yellowVersion);
    metal.map.dispose();
    assert.equal(images[3].onload,null,'late image callback cannot update a disposed texture');
    assert.equal(images[3].onerror,null);
  }finally{
    k.dispose();globalThis.document=previousDocument;
    if(previousImage===undefined)delete globalThis.Image;else globalThis.Image=previousImage;
  }
});
