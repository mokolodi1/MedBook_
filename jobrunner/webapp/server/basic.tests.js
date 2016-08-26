import { chai } from 'meteor/practicalmeteor:chai';
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
    chai.assert.isUndefined(runjob);
  });
  it('has no wrangling datasets',function(){
    let ds = DataSets.findOne({currently_wrangling:true});
    chai.assert.isUndefined(ds);
  });
});

describe('synched cron', function(){
  it('is scheduled to start another job', function(){
    let foo = SyncedCron.nextScheduledAtDate("start-next-job");
    console.log(foo);
    chai.assert.typeOf(foo, 'Date', "start next job at some date.");
  });
});

describe('my first test', function(){
  it('doesnt do much', function(){
    console.log("hello world");
    chai.assert.equal(2,2);
  });
});

