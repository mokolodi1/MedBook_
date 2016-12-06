var assert = require('assert');
import "./startup.js";

// TODO create a test data set with running jobs so we can ensure
// that startup clears them out

// TODO
describe('running a job', function(){
  // add a job
  // see if it runs
  let newjob = {status:"waiting", name:"TestJob"};
  // Jobs.insert(newjob);
});

describe('no running jobs or wrangling datasets on startup',function(){
  it('has no running jobs', function(){
    let runjob = Jobs.findOne({status:"running"});
    assert.strictEqual(runjob, undefined);
  });
  it('has no wrangling datasets',function(){
    let ds = DataSets.findOne({currently_wrangling:true});
    assert.strictEqual(ds, undefined);
  });
});

