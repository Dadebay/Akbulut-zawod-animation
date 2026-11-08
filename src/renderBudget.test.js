import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRenderClock,createResolutionBudget,antialiasMode} from './renderBudget.js';

test('all resolutions filter thin edges and subpixel rendering releases MSAA',()=>{
  assert.deepEqual(antialiasMode(.7),{samples:0,useFXAA:true});
  assert.deepEqual(antialiasMode(1),{samples:2,useFXAA:true});
});

test('30 and 60 Hz rendering preserve journey time on 60 Hz and 120 Hz displays',()=>{
  for(const fps of [30,60])for(const refresh of [60,120]){
    const clock=createRenderClock(fps);let renders=0,seconds=0;
    for(let i=0;i<=refresh*10;i++){const dt=clock.next(i*1000/refresh);if(dt!==null){renders++;seconds+=dt;}}
    assert.ok(renders>=fps*10&&renders<=fps*10+1);
    assert.ok(Math.abs(seconds-10)<.001);
  }
});

test('small display jitter does not accumulate into a lower frame rate',()=>{
  const clock=createRenderClock(60);let rendered=0;
  for(let i=0;i<=1200;i++)if(clock.next(i*1000/120+Math.sin(i)*.7)!==null)rendered++;
  assert.ok(rendered>=599&&rendered<=601);
});

test('resolution responds to sustained pressure and recovers slowly within bounds',()=>{
  const budget=createResolutionBudget();let value=1;
  for(let i=0;i<500;i++)value=budget.sample(1/30)??value;
  assert.equal(value,.7);
  for(let i=0;i<120;i++)value=budget.sample(1/60)??value;
  assert.equal(value,.7);
  for(let i=0;i<4000;i++)value=budget.sample(1/60)??value;
  assert.equal(value,1);
});

test('returning from a hidden tab does not fast-forward the tour',()=>{
  const clock=createRenderClock(30);clock.next(0);clock.next(40);clock.reset();
  assert.equal(clock.next(60000),0);
  assert.equal(clock.next(60010),null);
  assert.equal(clock.next(60040),.04);
});

test('Eko maintains full resolution at its intended 30 FPS',()=>{
  const budget=createResolutionBudget(30);
  for(let i=0;i<900;i++)assert.equal(budget.sample(1/30),null);
});

test('Eko wide view stops reducing resolution at its configured floor',()=>{
  const budget=createResolutionBudget(30,.6);let scale=1;
  for(let i=0;i<600;i++)scale=budget.sample(1/15)??scale;
  assert.equal(scale,.6);
});
