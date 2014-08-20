(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Deps = Package.deps.Deps;
var _ = Package.underscore._;

/* Package-scope variables */
var SubsManager;

(function () {

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/subs-manager/lib/sub_manager.js                                      //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
SubsManager = function (options) {                                               // 1
  var self = this;                                                               // 2
  self.options = options || {};                                                  // 3
  // maxiumum number of subscriptions are cached                                 // 4
  self.options.cacheLimit = self.options.cacheLimit || 10;                       // 5
  // maximum time, subscription stay in the cache                                // 6
  self.options.expireIn = self.options.expireIn || 5;                            // 7
                                                                                 // 8
  self._cacheMap = {};                                                           // 9
  self._cacheList = [];                                                          // 10
  self.ready = false;                                                            // 11
  self.dep = new Deps.Dependency();                                              // 12
                                                                                 // 13
  self.computation = Deps.autorun(function() {                                   // 14
    self._applyExpirations();                                                    // 15
    self._applyCacheLimit();                                                     // 16
                                                                                 // 17
    var ready = true;                                                            // 18
    _.each(self._cacheList, function(sub) {                                      // 19
      sub.ready = Meteor.subscribe.apply(Meteor, sub.args).ready();              // 20
      ready = ready && sub.ready;                                                // 21
    });                                                                          // 22
                                                                                 // 23
    if(ready) {                                                                  // 24
      self.ready = true;                                                         // 25
      self.dep.changed();                                                        // 26
    }                                                                            // 27
  });                                                                            // 28
};                                                                               // 29
                                                                                 // 30
SubsManager.prototype.subscribe = function() {                                   // 31
  var self = this;                                                               // 32
  if(Meteor.isClient) {                                                          // 33
    this._addSub(arguments);                                                     // 34
                                                                                 // 35
    return {                                                                     // 36
      ready: function() {                                                        // 37
        self.dep.depend();                                                       // 38
        return self.ready;                                                       // 39
      }                                                                          // 40
    };                                                                           // 41
  } else {                                                                       // 42
    // to support fast-render                                                    // 43
    if(Meteor.subscribe) {                                                       // 44
      return Meteor.subscribe.apply(Meteor, arguments);                          // 45
    }                                                                            // 46
  }                                                                              // 47
};                                                                               // 48
                                                                                 // 49
SubsManager.prototype._addSub = function(args) {                                 // 50
  var self = this;                                                               // 51
  var hash = JSON.stringify(args);                                               // 52
  if(!self._cacheMap[hash]) {                                                    // 53
    var sub = {                                                                  // 54
      args: args,                                                                // 55
      hash: hash                                                                 // 56
    };                                                                           // 57
                                                                                 // 58
    self._cacheMap[hash] = sub;                                                  // 59
    self._cacheList.push(sub);                                                   // 60
                                                                                 // 61
    self.ready = false;                                                          // 62
    // no need to interfere with the current computation                         // 63
    if(Deps.currentComputation) {                                                // 64
      Deps.afterFlush(function() {                                               // 65
        self.computation.invalidate();                                           // 66
      });                                                                        // 67
    } else {                                                                     // 68
      self.computation.invalidate();                                             // 69
    }                                                                            // 70
  }                                                                              // 71
                                                                                 // 72
  // add the current sub to the top of the list                                  // 73
  var sub = self._cacheMap[hash];                                                // 74
  sub.updated = (new Date).getTime();                                            // 75
                                                                                 // 76
  var index = self._cacheList.indexOf(sub);                                      // 77
  self._cacheList.splice(index, 1);                                              // 78
  self._cacheList.push(sub);                                                     // 79
};                                                                               // 80
                                                                                 // 81
SubsManager.prototype._applyCacheLimit = function () {                           // 82
  var self = this;                                                               // 83
  var overflow = self._cacheList.length - self.options.cacheLimit;               // 84
  if(overflow > 0) {                                                             // 85
    var removedSubs = self._cacheList.splice(0, overflow);                       // 86
    _.each(removedSubs, function(sub) {                                          // 87
      delete self._cacheMap[sub.hash];                                           // 88
    });                                                                          // 89
  }                                                                              // 90
};                                                                               // 91
                                                                                 // 92
SubsManager.prototype._applyExpirations = function() {                           // 93
  var self = this;                                                               // 94
  var newCacheList = [];                                                         // 95
                                                                                 // 96
  var expirationTime = (new Date).getTime() - self.options.expireIn * 60 * 1000; // 97
  _.each(self._cacheList, function(sub) {                                        // 98
    if(sub.updated >= expirationTime) {                                          // 99
      newCacheList.push(sub);                                                    // 100
    } else {                                                                     // 101
      delete self._cacheMap[sub.hash];                                           // 102
    }                                                                            // 103
  });                                                                            // 104
                                                                                 // 105
  self._cacheList = newCacheList;                                                // 106
};                                                                               // 107
                                                                                 // 108
///////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['subs-manager'] = {
  SubsManager: SubsManager
};

})();

//# sourceMappingURL=subs-manager.js.map
