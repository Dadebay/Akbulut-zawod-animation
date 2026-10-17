import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=new URL('../dist/',import.meta.url);
const extensions=new Set(['.html','.js','.css','.json','.svg','.txt','.wasm']);
let count=0,saved=0;
async function compress(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=join(directory,entry.name);
    if(entry.isDirectory()){await compress(path);continue;}
    if(!entry.isFile()||!extensions.has(extname(path)))continue;
    const original=await readFile(path),compressed=gzipSync(original,{level:9});
    if(compressed.length>=original.length)continue;
    await writeFile(`${path}.gz`,compressed);count++;saved+=original.length-compressed.length;
  }
}
await compress(fileURLToPath(root));
console.log(`Precompressed ${count} files; ${(saved/1024).toFixed(0)} KiB saved for nginx gzip_static.`);
