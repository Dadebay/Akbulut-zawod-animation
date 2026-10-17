import test from 'node:test';
import assert from 'node:assert/strict';
import {quarryCycle} from './quarryCycle.js';
import {journeyAt,JOURNEY_STEPS} from './journey.js';

test('the quarry load only grows while a bucket is discharging over the truck',()=>{
  let previous=0;
  for(let i=0;i<=2000;i++){
    const progress=i/2000,p=quarryCycle(progress);
    assert.ok(p.rawLoad>=previous-1e-10,'the truck never loses material while loading');
    if(p.rawLoad>previous+1e-10)assert.ok(p.pouring||quarryCycle(progress-.0005).pouring,'load growth coincides with the discharge phase');
    if(p.pouring){assert.equal(p.slew,0);assert.equal(p.boom,.1);assert.equal(p.stick,.12);}
    previous=p.rawLoad;
  }
  assert.equal(quarryCycle(0).rawLoad,0);
  assert.equal(quarryCycle(.5).rawLoad,.5);
  assert.equal(quarryCycle(1).rawLoad,1);
});

test('the loaded truck stays full through transport and empties onto the stock apron',()=>{
  assert.equal(journeyAt(JOURNEY_STEPS[1].start).rawLoad,1);
  assert.equal(journeyAt(JOURNEY_STEPS[1].start+10).rawLoad,1);
  const receive=JOURNEY_STEPS[2];
  assert.equal(journeyAt(receive.start).rawLoad,1);
  assert.equal(journeyAt(receive.start+receive.duration*.9).rawLoad,0);
  assert.equal(journeyAt(receive.start+receive.duration*.9).hopperFill,0);
});
