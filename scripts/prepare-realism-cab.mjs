// Run after prepare-truck.py to cap the existing desktop scan at the 2K budget.
// The source geometry, origins, UVs and animation mount remain unchanged.
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {NodeIO} from '@gltf-transform/core';
import {textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),file=new URL('../public/models/man-tractor-cab.glb',import.meta.url).pathname;
const doc=await io.read(process.argv[2]||file);
await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:90}));
await io.write(file,doc);
