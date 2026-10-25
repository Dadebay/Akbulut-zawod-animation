// Extract equipment owned by a coded CAD occurrence, never its building shell.
// Usage: node scripts/import-cad-interiors.mjs /path/to/mapping-source /path/to/native-library
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {compactPrimitive,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder} from 'meshoptimizer';

const source=process.argv[2],native=process.argv[3];
if(!source||!native)throw new Error('Provide mapping-source and the full-resolution native equipment export (see docs/cad-interior-integration.md).');
const root=fileURLToPath(new URL('../',import.meta.url));
const mappingBytes=await readFile(join(source,'MAPPING.json'));
const mapping=JSON.parse(mappingBytes);
const nativeMeta=JSON.parse(await readFile(join(native,'geometry.json'),'utf8'));
const provenance=JSON.parse(await readFile(join(native,'provenance.json'),'utf8'));
const bytes=await readFile(join(native,'geometry.bin'));
const binary=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const selection={
  silo:'1-003-250',tallSilo:'1-004-390',hopper:'1-004-330',weighHopper:'1-005-600',
  filter:'1-004-490',roundFilter:'1-003-257',cyclone:'1-004-367',fan:'1-003-275',
  elevator:'1-004-370',hammerMill:'1-004-325',mixer:'1-005-605',burner:'1-003-260',
};
const selected=new Map(Object.entries(selection).map(([name,code])=>{
  const occurrences=mapping.equipment_occurrences.filter(o=>o.code===code&&(name!=='silo'||o.group==='Gypsum_Calcination:1'));
  if(occurrences.length!==1)throw new Error(`Ambiguous CAD code ${code}`);
  const source=occurrences[0],owner=mapping.objects.findIndex(o=>o.object_id===source.object_id);
  if(owner<0)throw new Error(`Missing owner ${code}`);
  const part=nativeMeta[name];
  if(!part)throw new Error(`Missing native geometry for ${name}`);
  return [owner,{name,source,
    positions:new Float32Array(binary,part.p_offset,part.p_bytes/4),
    normals:new Float32Array(binary,part.n_offset,part.n_bytes/4),
    indices:new Uint32Array(binary,part.f_offset,part.f_bytes/4),
  }];
}));
await MeshoptSimplifier.ready;
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('Adapted CAD equipment');
const material=doc.createMaterial('CAD steel').setBaseColorFactor([.57,.64,.65,1]).setMetallicFactor(.35).setRoughnessFactor(.52).setDoubleSided(true);
const manifest={version:1,asset:'models/cad-interiors.glb',sourceModel:'FabrikaGenelMontaj.iam',
  mappingSha256:createHash('sha256').update(mappingBytes).digest('hex'),
  geometrySha256:createHash('sha256').update(bytes).digest('hex'),
  nativeSource:provenance,geometryMethod:'Full-resolution DWFX surfaces; attribute-aware mesh simplification, without the handoff preview decimation.',
  placement:'Source equipment shapes adapted to existing rooms; not surveyed site coordinates or live asset identities.',models:{}};
for(const {name,source,positions:ps,normals:ns,indices:is} of selected.values()){
  if(!is.length)throw new Error(`No source surfaces for ${name}`);
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<ps.length;i++) {const axis=i%3;lo[axis]=Math.min(lo[axis],ps[i]);hi[axis]=Math.max(hi[axis],ps[i]);}
  // The native export already applies viewer metres (Y up).
  const offset=[(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2];
  const positions=Float32Array.from(ps,(v,i)=>Math.round((v-offset[i%3])*10000)/10000),normals=ns;
  const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(is),positions,3,normals,3,[.2,.2,.2],null,Math.min(is.length,18000*3),.002,['Permissive']);
  const accessor=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const primitive=doc.createPrimitive().setAttribute('POSITION',accessor('VEC3',positions)).setAttribute('NORMAL',accessor('VEC3',normals)).setIndices(accessor('SCALAR',indices)).setMaterial(material);
  compactPrimitive(primitive);
  const entry={code:source.code,objectId:source.object_id,label:source.inventory.name_tr,assembly:source.group,
    size:hi.map((v,i)=>v-lo[i]),sourceTriangles:is.length/3,triangles:indices.length/3,error};
  manifest.models[name]=entry;
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)).setExtras({cadSource:entry}));
  console.log(`${name} (${entry.code}): ${entry.sourceTriangles} → ${entry.triangles} triangles`);
}
await MeshoptEncoder.ready;
await doc.transform(prune(),meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeNormal:12}));
await mkdir(resolve(root,'public/models'),{recursive:true});
const output=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder}).writeBinary(doc);
await writeFile(resolve(root,'public/models/cad-interiors.glb'),output);
await writeFile(resolve(root,'src/industrial/cadInteriorCatalog.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`CAD library: ${(output.length/1024/1024).toFixed(2)} MiB`);
