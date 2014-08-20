(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;

/* Package-scope variables */
var SyncedCron, Later;

(function () {

/////////////////////////////////////////////////////////////////////////////////////
//                                                                                 //
// packages/synced-cron/synced-cron-server.js                                      //
//                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////
                                                                                   //
// A package for running jobs synchronized across multiple processes               // 1
SyncedCron = {                                                                     // 2
  _entries: [],                                                                    // 3
}                                                                                  // 4
                                                                                   // 5
Later = Npm.require('later');                                                      // 6
                                                                                   // 7
// collection holding the job history records                                      // 8
SyncedCron._collection = new Meteor.Collection('cronHistory');                     // 9
SyncedCron._collection._ensureIndex({intendedAt: 1, name: 1}, {unique: true});     // 10
                                                                                   // 11
                                                                                   // 12
// add a scheduled job                                                             // 13
// SyncedCron.add({                                                                // 14
//   name: String, //*required* unique name of the job                             // 15
//   schedule: function(laterParser) {},//*required* when to run the job           // 16
//   job: function() {}, //*required* the code to run                              // 17
// });                                                                             // 18
SyncedCron.add = function(entry) {                                                 // 19
  check(entry.name, String);                                                       // 20
  check(entry.schedule, Function);                                                 // 21
  check(entry.job, Function);                                                      // 22
                                                                                   // 23
  // check                                                                         // 24
  this._entries.push(entry);                                                       // 25
}                                                                                  // 26
                                                                                   // 27
// Start processing added jobs                                                     // 28
SyncedCron.start = function() {                                                    // 29
  var self = this;                                                                 // 30
                                                                                   // 31
  // Schedule each job with later.js                                               // 32
  this._entries.forEach(function(entry) {                                          // 33
    var schedule = entry.schedule(Later.parse);                                    // 34
    self._timer = self._laterSetInterval(self._entryWrapper(entry), schedule);     // 35
                                                                                   // 36
    console.log('SyncedCron: scheduled "' + entry.name + '" next run @'            // 37
      + Later.schedule(schedule).next(1));                                         // 38
  });                                                                              // 39
}                                                                                  // 40
                                                                                   // 41
// Stop processing jobs                                                            // 42
SyncedCron.stop = function() {                                                     // 43
  if (this._timer) {                                                               // 44
    this._timer.clear();                                                           // 45
    this._timer = null;                                                            // 46
  }                                                                                // 47
}                                                                                  // 48
                                                                                   // 49
// The meat of our logic. Checks if the specified has already run. If not,         // 50
// records that it's running the job, runs it, and records the output              // 51
SyncedCron._entryWrapper = function(entry) {                                       // 52
  var self = this;                                                                 // 53
                                                                                   // 54
  return function(intendedAt) {                                                    // 55
    var jobHistory = {                                                             // 56
      intendedAt: intendedAt,                                                      // 57
      name: entry.name,                                                            // 58
      startedAt: new Date()                                                        // 59
    };                                                                             // 60
                                                                                   // 61
    // If we have a dup key error, another instance has already tried to run       // 62
    // this job.                                                                   // 63
    try {                                                                          // 64
      jobHistory._id = self._collection.insert(jobHistory);                        // 65
    } catch(e) {                                                                   // 66
      // http://www.mongodb.org/about/contributors/error-codes/                    // 67
      // 11000 == duplicate key error                                              // 68
      if (e.name === 'MongoError' && e.code === 11000) {                           // 69
        console.log('SyncedCron: Not running "' + entry.name + '" again.');        // 70
        return;                                                                    // 71
      }                                                                            // 72
                                                                                   // 73
      throw e;                                                                     // 74
    };                                                                             // 75
                                                                                   // 76
    // run and record the job                                                      // 77
    try {                                                                          // 78
      console.log('SyncedCron: Starting "' + entry.name + '".');                   // 79
      var output = entry.job(intendedAt); // <- Run the actual job                 // 80
                                                                                   // 81
      console.log('SyncedCron: Finished "' + entry.name + '".');                   // 82
      self._collection.update({_id: jobHistory._id}, {                             // 83
        $set: {                                                                    // 84
          finishedAt: new Date(),                                                  // 85
          result: output                                                           // 86
        }                                                                          // 87
      });                                                                          // 88
    } catch(e) {                                                                   // 89
      console.log('SyncedCron: Exception "' + entry.name +'" ' + e.stack);         // 90
      self._collection.update({_id: jobHistory._id}, {                             // 91
        $set: {                                                                    // 92
          finishedAt: new Date(),                                                  // 93
          error: e.stack                                                           // 94
        }                                                                          // 95
      });                                                                          // 96
    }                                                                              // 97
  };                                                                               // 98
}                                                                                  // 99
                                                                                   // 100
// for tests                                                                       // 101
SyncedCron._reset = function() {                                                   // 102
  this._entries = [];                                                              // 103
  this._collection.remove({});                                                     // 104
}                                                                                  // 105
                                                                                   // 106
// ---------------------------------------------------------------------------     // 107
// The following two functions are lifted from the later.js package, however       // 108
// I've made the following changes:                                                // 109
// - Use Meteor.setTimeout and Meteor.clearTimeout                                 // 110
// - Added an 'intendedAt' parameter to the callback fn that specifies the precise // 111
//   time the callback function *should* be run (so we can co-ordinate jobs)       // 112
//   between multiple, potentially laggy and unsynced machines                     // 113
                                                                                   // 114
// From: https://github.com/bunkat/later/blob/master/src/core/setinterval.js       // 115
SyncedCron._laterSetInterval = function(fn, sched) {                               // 116
                                                                                   // 117
  var t = SyncedCron._laterSetTimeout(scheduleTimeout, sched),                     // 118
      done = false;                                                                // 119
                                                                                   // 120
  /**                                                                              // 121
  * Executes the specified function and then sets the timeout for the next         // 122
  * interval.                                                                      // 123
  */                                                                               // 124
  function scheduleTimeout(intendedAt) {                                           // 125
    if(!done) {                                                                    // 126
      fn(intendedAt);                                                              // 127
      t = SyncedCron._laterSetTimeout(scheduleTimeout, sched);                     // 128
    }                                                                              // 129
  }                                                                                // 130
                                                                                   // 131
  return {                                                                         // 132
                                                                                   // 133
    /**                                                                            // 134
    * Clears the timeout.                                                          // 135
    */                                                                             // 136
    clear: function() {                                                            // 137
      done = true;                                                                 // 138
      t.clear();                                                                   // 139
    }                                                                              // 140
                                                                                   // 141
  };                                                                               // 142
                                                                                   // 143
};                                                                                 // 144
                                                                                   // 145
// From: https://github.com/bunkat/later/blob/master/src/core/settimeout.js        // 146
SyncedCron._laterSetTimeout = function(fn, sched) {                                // 147
                                                                                   // 148
  var s = Later.schedule(sched), t;                                                // 149
  scheduleTimeout();                                                               // 150
                                                                                   // 151
  /**                                                                              // 152
  * Schedules the timeout to occur. If the next occurrence is greater than the     // 153
  * max supported delay (2147483647 ms) than we delay for that amount before       // 154
  * attempting to schedule the timeout again.                                      // 155
  */                                                                               // 156
  function scheduleTimeout() {                                                     // 157
    var now = Date.now(),                                                          // 158
        next = s.next(2, now),                                                     // 159
        diff = next[0].getTime() - now,                                            // 160
        intendedAt = next[0];                                                      // 161
                                                                                   // 162
    // minimum time to fire is one second, use next occurrence instead             // 163
    if(diff < 1000) {                                                              // 164
      diff = next[1].getTime() - now;                                              // 165
      intendedAt = next[1];                                                        // 166
    }                                                                              // 167
                                                                                   // 168
    if(diff < 2147483647) {                                                        // 169
      t = Meteor.setTimeout(function() { fn(intendedAt); }, diff);                 // 170
    }                                                                              // 171
    else {                                                                         // 172
      t = Meteor.setTimeout(scheduleTimeout, 2147483647);                          // 173
    }                                                                              // 174
  }                                                                                // 175
                                                                                   // 176
  return {                                                                         // 177
                                                                                   // 178
    /**                                                                            // 179
    * Clears the timeout.                                                          // 180
    */                                                                             // 181
    clear: function() {                                                            // 182
      Meteor.clearTimeout(t);                                                      // 183
    }                                                                              // 184
                                                                                   // 185
  };                                                                               // 186
                                                                                   // 187
};                                                                                 // 188
// ---------------------------------------------------------------------------     // 189
/////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['synced-cron'] = {
  SyncedCron: SyncedCron
};

})();

//# sourceMappingURL=synced-cron.js.map
