import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl} from './standaloneAssets.js';

test('embedded binary files survive chunk decoding and reuse their URL',async t=>{
  const bytes=Uint8Array.from({length:70001},(_,i)=>i%256);
  let removed=0,reads=0;
  const previous=globalThis.document;
  globalThis.document={getElementById(id){
    reads++;
    assert.equal(id,'akbulut-asset:models/test.glb');
    return {textContent:Buffer.from(bytes).toString('base64'),dataset:{mime:'model/gltf-binary'},remove(){removed++;}};
  }};
  t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const url=assetUrl('/models/test.glb');
  t.after(()=>URL.revokeObjectURL(url));
  const response=await fetch(url);
  assert.equal(response.headers.get('content-type'),'model/gltf-binary');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  assert.equal(assetUrl('models/test.glb'),url);
  assert.equal(reads,1);
  assert.equal(removed,1);
});

test('a missing embedded asset fails explicitly without requesting a server',t=>{
  const previous=globalThis.document;
  globalThis.document={getElementById(){return null;}};
  t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  assert.throws(()=>assetUrl('missing.png'),/Embedded asset is missing: missing.png/);
});
