import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,extname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareTabletCab,tabletAsset} from './prepare-tablet.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const publicDir=join(root,'public');
const assetModule=join(root,'src/assets.js');
const mapModule=join(root,'src/FleetMap.jsx');
const tablet=process.argv.includes('--tablet');
const outputDir=join(root,tablet?'standalone-tablet':'standalone');
const mimeTypes={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.txt':'text/plain;charset=utf-8'};

async function filesIn(directory,prefix=''){
  const entries=await readdir(directory,{withFileTypes:true});
  const files=[];
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    if(entry.name.startsWith('.'))continue;
    const relative=prefix+entry.name;
    if(entry.isDirectory())files.push(...await filesIn(join(directory,entry.name),relative+'/'));
    else if(entry.isFile())files.push(relative);
  }
  return files;
}

if(tablet)await prepareTabletCab();
const result=await build({
  root,configFile:false,publicDir:false,base:'./',mode:'standalone',
  plugins:[{
    name:'akbulut-standalone',
    enforce:'pre',
    resolveId(id,importer){
      if(!importer||!id.startsWith('.'))return;
      const target=resolve(dirname(importer),id);
      if(target===assetModule)return join(root,'src/standaloneAssets.js');
      if(target===mapModule)return join(root,'src/StandaloneMap.jsx');
    },
  },react()],
  define:{
    'process.env.NODE_ENV':JSON.stringify('production'),
    'import.meta.env.VITE_DATA_MODE':JSON.stringify('demo'),
    'import.meta.env.VITE_RENDER_PROFILE':JSON.stringify(tablet?'tablet':'desktop'),
    'import.meta.env.VITE_SCADA_SNAPSHOT_URL':JSON.stringify(''),
    'import.meta.env.VITE_FLEET_POSITIONS_URL':JSON.stringify(''),
  },
  build:{
    write:false,copyPublicDir:false,cssCodeSplit:false,sourcemap:false,target:'safari15',
    lib:{entry:join(root,'src/main.jsx'),name:'AkBulut',formats:['iife']},
    rollupOptions:{output:{inlineDynamicImports:true}},
  },
});
const outputs=Array.isArray(result)?result.flatMap(item=>item.output):result.output;
const chunks=outputs.filter(item=>item.type==='chunk');
if(chunks.length!==1||chunks[0].imports.length||chunks[0].dynamicImports.length)throw new Error('Standalone build must have exactly one self-contained script.');
const modules=Object.keys(chunks[0].modules);
if(modules.includes(assetModule)||modules.includes(mapModule)||!modules.includes(join(root,'src/standaloneAssets.js'))||!modules.includes(join(root,'src/StandaloneMap.jsx')))throw new Error('Standalone asset/map substitutions were not applied.');
const styles=outputs.filter(item=>item.type==='asset'&&item.fileName.endsWith('.css')).map(item=>item.source.toString()).join('\n');
const extra=outputs.filter(item=>item.type==='asset'&&!item.fileName.endsWith('.css'));
if(extra.length)throw new Error('Unembedded build assets: '+extra.map(item=>item.fileName).join(', '));
const js=chunks[0].code.replace(/<\/script/gi,'<\\/script');
if(/<\/style/i.test(styles))throw new Error('Unexpected closing style tag in generated CSS.');

const files=(await filesIn(publicDir)).filter(file=>file!==(tablet?'models/man-tractor-cab.glb':'models/man-tractor-cab-tablet.glb'));
const embedded=[];
for(const file of files){
  let mime=mimeTypes[extname(file).toLowerCase()];
  if(!mime||!/^[-a-zA-Z0-9_./]+$/.test(file))throw new Error('Unsupported public asset: '+file);
  const asset=tablet?await tabletAsset(file,mime):{bytes:await readFile(join(publicDir,file)),mime};
  mime=asset.mime;
  const data=asset.bytes.toString('base64');
  embedded.push(`<script type="application/octet-stream" id="akbulut-asset:${file}" data-mime="${mime}">${data}</script>`);
}
const icon=(await readFile(join(publicDir,'brand/akbulut-icon.webp'))).toString('base64');
const html=`<!doctype html>
<html lang="tk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Ak Bulut">
<meta name="description" content="Ak Bulut — oflaýn 3D görkeziliş. Nusga maglumatlar.">
<title>AK BULUT · Önümçilik merkezi</title>
<link rel="icon" type="image/webp" href="data:image/webp;base64,${icon}">
<style>${styles}</style></head><body>
<div id="root"><div style="min-height:100vh;display:grid;place-content:center;gap:20px;text-align:center;background:#f3f7fc;color:#244e83;font-family:system-ui;padding:24px">
<img src="data:image/webp;base64,${icon}" alt="Ak Bulut" style="width:100px;margin:auto">
<h1>Önümçilik merkezi</h1><p>Interaktiw 3D görnüş üçin JavaScript we WebGL gerek.</p>
<p style="max-width:460px;line-height:1.7">Bu faýly JavaScript goldaýan HTML görkeziji arkaly açyň. Ähli modeller we suratlar faýlyň içinde. Internet gerek däl.</p>
</div></div>
${embedded.join('\n')}
<script>${js}</script>
</body></html>`;
await mkdir(outputDir,{recursive:true});
await writeFile(join(outputDir,'index.html'),html);
console.log(`Standalone: ${join(outputDir,'index.html')} — ${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MiB, ${files.length} embedded assets.`);
