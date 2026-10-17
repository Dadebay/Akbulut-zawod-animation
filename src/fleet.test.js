import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePositions} from './fleet.js';
const now=Date.parse('2026-10-16T10:00:00Z');
const position={deviceId:1,latitude:37.77,longitude:65.35,fixTime:'2026-10-16T10:00:00Z',valid:true};
test('GPS marks current positions fresh and invalid, stale or future fixes stale',()=>{
  assert.equal(parsePositions([position],now)[0].fresh,true);
  for(const change of [{valid:false},{fixTime:'2026-10-16T09:59:29Z'},{fixTime:'2026-10-16T10:00:06Z'},{fixTime:'unknown'}])assert.equal(parsePositions([{...position,...change}],now)[0].fresh,false);
});
test('GPS rejects malformed coordinates and duplicate devices',()=>{
  for(const latitude of [null,'37.77',91,NaN])assert.throws(()=>parsePositions([{...position,latitude}],now));
  assert.throws(()=>parsePositions([position,position],now));assert.throws(()=>parsePositions({},now));
});
