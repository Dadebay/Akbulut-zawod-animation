import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoSnapshot,summarize,filterMachines,validateSnapshot} from './data.js';
test('720 unique points and counts agree',()=>{const {machines}=createDemoSnapshot();assert.equal(new Set(machines.map(m=>m.id)).size,720);assert.deepEqual(summarize(machines),{running:632,idle:54,fault:18,offline:16,total:720,availability:632/720*100});});
test('filters combine code, zone and status',()=>{const {machines}=createDemoSnapshot();const result=filterMachines(machines,{search:'AKB-CR',zone:'CR',status:'running'});assert.ok(result.length>0);assert.ok(result.every(m=>m.id.startsWith('AKB-CR')&&m.status==='running'));assert.equal(filterMachines(machines,{search:'no-such-id'}).length,0);});
test('lost communication is shown as offline',()=>{const now=Date.now();const raw=createDemoSnapshot(0,'normal',now-31000);const parsed=validateSnapshot(raw,now);assert.ok(parsed.machines.every(m=>m.status==='offline'));assert.throws(()=>validateSnapshot({machines:[raw.machines[0],raw.machines[0]]}),/unique/);});
test('network demo affects only packaging',()=>{const {machines}=createDemoSnapshot(0,'network');assert.equal(machines.filter(m=>m.zone==='GP'&&m.status==='offline').length,120);assert.equal(summarize(machines).total,720);});
