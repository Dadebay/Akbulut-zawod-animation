import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFramePresenter} from './industrial/renderPipeline.js';

test('viewport and quality changes cannot leave a cleared canvas between frames',()=>{
  let ratio=1,buffer='scene';const calls=[];
  const renderer={
    getPixelRatio:()=>ratio,
    setPixelRatio(value){ratio=value;buffer='cleared';calls.push(['ratio',value]);},
    setSize(w,h){buffer='cleared';calls.push(['size',w,h]);},
  };
  const presenter=createFramePresenter(renderer,(w,h)=>calls.push(['targets',w,h]),()=>{buffer='scene';calls.push(['draw']);});
  presenter.resize(1200,800);assert.equal(buffer,'scene');assert.equal(calls.length,0);
  presenter.render();assert.equal(buffer,'scene');assert.equal(calls.at(-1)[0],'draw');
  for(const scale of [.9,.8,.7,.75,.8,1]){
    calls.length=0;
    presenter.resize(1200,800,scale);
    assert.equal(buffer,'scene','previous frame survives until next draw');
    assert.equal(calls.length,0,'resize must not touch the live canvas eagerly');
    presenter.render();
    assert.equal(buffer,'scene');assert.equal(calls.at(-1)[0],'draw');
    assert.equal(ratio,scale);
  }
  calls.length=0;
  presenter.resize(600,400,.8);presenter.resize(640,480);
  assert.equal(buffer,'scene');presenter.render();
  assert.deepEqual(calls,[['ratio',.8],['size',640,480],['targets',640,480],['draw']]);
  calls.length=0;presenter.resize(640,480);presenter.render();
  assert.deepEqual(calls,[['draw']],'unchanged size must not clear the canvas');
});
