import {NodeIO} from '@gltf-transform/core';
import {compactPrimitive,prune,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const triangles=doc=>doc.getRoot().listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);

export async function prepareTabletCab(){
  const io=new NodeIO(),source=join(root,'public/models/man-tractor-cab.glb');
  const document=await io.read(source),before=triangles(document);
  await MeshoptSimplifier.ready;
  const sourceNode=document.getRoot().listNodes()[0],sourceMesh=sourceNode.getMesh();
  const scene=document.getRoot().listScenes()[0];
  // The scan has many UV seams. Attribute-aware collapse preserves the paint,
  // normals and silhouette without retaining every seam at distant viewpoints.
  for(const [name,ratio,error] of [['CabNear',.18,.008],['CabFar',.035,.025]]){
    const result=document.createMesh(name);
    for(const sourcePrimitive of sourceMesh.listPrimitives()){
      const p=sourcePrimitive.clone(),position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0');
      const attributes=new Float32Array(position.getCount()*5);
      for(let i=0;i<position.getCount();i++){attributes.set(normal.getArray().subarray(i*3,i*3+3),i*5);attributes.set(uv.getArray().subarray(i*2,i*2+2),i*5+3);}
      const [indices]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(p.getIndices().getArray()),position.getArray(),3,attributes,5,[.25,.25,.25,1,1],null,Math.floor(p.getIndices().getCount()*ratio/3)*3,error,['Permissive']);
      p.setIndices(document.createAccessor().setType('SCALAR').setBuffer(document.getRoot().listBuffers()[0]).setArray(indices));compactPrimitive(p);result.addPrimitive(p);
    }
    scene.addChild(document.createNode(name).setMesh(result));
  }
  scene.removeChild(sourceNode);sourceNode.dispose();
  await document.transform(prune(),textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[2048,2048],quality:85}));
  // Plain glTF buffers: no runtime decompressor or network request required.
  const binary=await io.writeBinary(document);
  await writeFile(join(root,'public/models/man-tractor-cab-tablet.glb'),binary);
  console.log(`Tablet cab: ${before} → ${triangles(document)} triangles, ${(binary.byteLength/1024/1024).toFixed(2)} MiB.`);
}

export async function tabletAsset(path,mime){
  let bytes=await readFile(join(root,'public',path));
  if(mime.startsWith('image/')&&!path.startsWith('brand/')){
    const edge=path.startsWith('equipment/')?1280:1920;
    const original=bytes;
    const compact=await sharp(bytes).rotate().resize(edge,edge,{fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
    if(compact.length<original.length){bytes=compact;mime='image/webp';}
  }
  if(path==='models/ATTRIBUTION.txt')bytes=Buffer.concat([bytes,Buffer.from('\nTablet version: mesh simplified into near/far distance levels and texture resized to 2048 pixels. Original attribution and license apply.\n')]);
  return {bytes,mime};
}

if(process.argv[1]===fileURLToPath(import.meta.url))await prepareTabletCab();
