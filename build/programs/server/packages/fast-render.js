(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package.livedata.DDP;
var DDPServer = Package.livedata.DDPServer;
var MongoInternals = Package['mongo-livedata'].MongoInternals;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Accounts = Package['accounts-base'].Accounts;
var RouteController = Package['iron-router'].RouteController;
var Route = Package['iron-router'].Route;
var Router = Package['iron-router'].Router;
var Iron = Package['iron-core'].Iron;

/* Package-scope variables */
var FastRender, EncodeEJSON, DecodeEJSON, Utils, paramParts, PublishContext, Context;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/utils.js                                                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
EncodeEJSON = function(ejson) {                                                                                 // 1
  var ejsonString = EJSON.stringify(ejson);                                                                     // 2
  return encodeURI(ejsonString);                                                                                // 3
};                                                                                                              // 4
                                                                                                                // 5
DecodeEJSON = function(encodedEjson) {                                                                          // 6
  var decodedEjsonString = decodeURI(encodedEjson);                                                             // 7
  return EJSON.fromJSONValue(JSON.parse(decodedEjsonString));                                                   // 8
};                                                                                                              // 9
                                                                                                                // 10
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/server/utils.js                                                                     //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
/*                                                                                                              // 1
  stolen from express: http://goo.gl/qgarJu                                                                     // 2
  some parts has been changed to deal with our api                                                              // 3
*/                                                                                                              // 4
                                                                                                                // 5
Utils = {};                                                                                                     // 6
                                                                                                                // 7
Utils._pathRegexp = function _pathRegexp(path, keys, sensitive, strict) {                                       // 8
  if (toString.call(path) == '[object RegExp]') return path;                                                    // 9
  if (Array.isArray(path)) path = '(' + path.join('|') + ')';                                                   // 10
  path = path                                                                                                   // 11
    .replace(/(.)\/$/, '$1')                                                                                    // 12
    .concat(strict ? '' : '/?')                                                                                 // 13
    .replace(/\/\(/g, '(?:/')                                                                                   // 14
    .replace(/#/, '/?#')                                                                                        // 15
    .replace(                                                                                                   // 16
      /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g,                                                                   // 17
    function(match, slash, format, key, capture, optional){                                                     // 18
      keys.push({ name: key, optional: !! optional });                                                          // 19
      slash = slash || '';                                                                                      // 20
      return ''                                                                                                 // 21
        + (optional ? '' : slash)                                                                               // 22
        + '(?:'                                                                                                 // 23
        + (optional ? slash : '')                                                                               // 24
        + (format || '')                                                                                        // 25
        + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'                                              // 26
        + (optional || '');                                                                                     // 27
    })                                                                                                          // 28
    .replace(/([\/.])/g, '\\$1')                                                                                // 29
    .replace(/\*/g, '(.*)');                                                                                    // 30
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');                                                    // 31
};                                                                                                              // 32
                                                                                                                // 33
Utils._pathMatch = function _pathMatch(uri, route){                                                             // 34
  uri = decodeURI(uri);                                                                                         // 35
                                                                                                                // 36
  var params = [];                                                                                              // 37
  var uriParts2 = uri.split('?');                                                                               // 38
  var path = uriParts2[0];                                                                                      // 39
  var queryString = uriParts2[1];                                                                               // 40
                                                                                                                // 41
  if(queryString) {                                                                                             // 42
    _.each(queryString.split('&'), function (paramString) {                                                     // 43
      paramParts = paramString.split('=');                                                                      // 44
      params[paramParts[0]] = decodeURIComponent(paramParts[1]);                                                // 45
    });                                                                                                         // 46
  }                                                                                                             // 47
                                                                                                                // 48
  var keys = route.keys                                                                                         // 49
    , m = route.regexp.exec(path);                                                                              // 50
                                                                                                                // 51
  if (!m) return false;                                                                                         // 52
                                                                                                                // 53
  for (var i = 1, len = m.length; i < len; ++i) {                                                               // 54
    var key = keys[i - 1];                                                                                      // 55
                                                                                                                // 56
    try {                                                                                                       // 57
      var val = 'string' == typeof m[i]                                                                         // 58
        ? decodeURIComponent(m[i])                                                                              // 59
        : m[i];                                                                                                 // 60
    } catch(e) {                                                                                                // 61
      var err = new Error("Failed to decode param '" + m[i] + "'");                                             // 62
      err.status = 400;                                                                                         // 63
      throw err;                                                                                                // 64
    }                                                                                                           // 65
                                                                                                                // 66
    if (key) {                                                                                                  // 67
      params[key.name] = val;                                                                                   // 68
    } else {                                                                                                    // 69
      params.push(val);                                                                                         // 70
    }                                                                                                           // 71
  }                                                                                                             // 72
                                                                                                                // 73
  return params;                                                                                                // 74
};                                                                                                              // 75
                                                                                                                // 76
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/server/fast_render.js                                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
var Fiber = Npm.require('fibers');                                                                              // 1
                                                                                                                // 2
FastRender = {                                                                                                  // 3
  _routes: [],                                                                                                  // 4
  _onAllRoutes: []                                                                                              // 5
};                                                                                                              // 6
                                                                                                                // 7
FastRender.route = function route(path, callback) {                                                             // 8
  var keys = [];                                                                                                // 9
  FastRender._routes.push({                                                                                     // 10
    regexp: Utils._pathRegexp(path, keys, false, false),                                                        // 11
    callback: callback,                                                                                         // 12
    keys: keys                                                                                                  // 13
  });                                                                                                           // 14
};                                                                                                              // 15
                                                                                                                // 16
FastRender.onAllRoutes = function onAllRoutes(callback) {                                                       // 17
  FastRender._onAllRoutes.push(callback);                                                                       // 18
};                                                                                                              // 19
                                                                                                                // 20
FastRender._processRoutes = function _processRoutes(path, loginToken, headers, callback) {                      // 21
  var selectedRoute;                                                                                            // 22
  var params;                                                                                                   // 23
                                                                                                                // 24
  for(var lc=0; lc<FastRender._routes.length; lc++) {                                                           // 25
    var route = FastRender._routes[lc];                                                                         // 26
    params = Utils._pathMatch(path, route);                                                                     // 27
    if(params) {                                                                                                // 28
      selectedRoute = route;                                                                                    // 29
      break;                                                                                                    // 30
    }                                                                                                           // 31
  }                                                                                                             // 32
                                                                                                                // 33
  Fiber(function() {                                                                                            // 34
    var context = new Context(loginToken, { headers: headers });                                                // 35
    try {                                                                                                       // 36
                                                                                                                // 37
      //run onAllRoutes callbacks if provided                                                                   // 38
      FastRender._onAllRoutes.forEach(function(callback) {                                                      // 39
        callback.call(context, path);                                                                           // 40
      });                                                                                                       // 41
                                                                                                                // 42
      if(selectedRoute) {                                                                                       // 43
        selectedRoute.callback.call(context, params, path);                                                     // 44
      }                                                                                                         // 45
                                                                                                                // 46
      callback(context.getData());                                                                              // 47
    } catch(err) {                                                                                              // 48
      console.error('error on fast-rendering path: ' + path + " ; error: " + err.stack);                        // 49
      callback(null);                                                                                           // 50
    }                                                                                                           // 51
  }).run();                                                                                                     // 52
};                                                                                                              // 53
                                                                                                                // 54
// adding support for null publications                                                                         // 55
FastRender.onAllRoutes(function() {                                                                             // 56
  var context = this;                                                                                           // 57
  var nullHandlers = Meteor.default_server.universal_publish_handlers;                                          // 58
                                                                                                                // 59
  if(nullHandlers && nullHandlers) {                                                                            // 60
    nullHandlers.forEach(function(publishHandler) {                                                             // 61
      var publishContext = new PublishContext(context, null);                                                   // 62
      var params = [];                                                                                          // 63
      context.processPublication(publishHandler, publishContext, params);                                       // 64
    });                                                                                                         // 65
  }                                                                                                             // 66
});                                                                                                             // 67
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/server/publish_context.js                                                           //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
PublishContext = function PublishContext(context, subscription) {                                               // 1
  this.userId = context.userId;                                                                                 // 2
  this._subscription = subscription;                                                                            // 3
  this._context = context;                                                                                      // 4
  this._collectionData = {};                                                                                    // 5
  this._onStop = [];                                                                                            // 6
  this._stopped = false;                                                                                        // 7
                                                                                                                // 8
  // connection object                                                                                          // 9
  this.connection = {                                                                                           // 10
    _id: Meteor.uuid(),                                                                                         // 11
    close: function() {},                                                                                       // 12
    onClose: function() {},                                                                                     // 13
    // fake value, will be supported later on                                                                   // 14
    clientAddress: "127.0.0.1",                                                                                 // 15
    httpHeaders: context.headers                                                                                // 16
  };                                                                                                            // 17
                                                                                                                // 18
  // we won't be supporting all the other fields of the Meteor's                                                // 19
  // Subscription class since they are private variables                                                        // 20
};                                                                                                              // 21
                                                                                                                // 22
PublishContext.prototype._ensureCollection = function(collection) {                                             // 23
  if (!this._collectionData[collection]) {                                                                      // 24
    this._collectionData[collection] = [];                                                                      // 25
                                                                                                                // 26
    //put this collection data in the parent context                                                            // 27
    this._context._ensureCollection(collection);                                                                // 28
    this._context._collectionData[collection].push(this._collectionData[collection]);                           // 29
  }                                                                                                             // 30
};                                                                                                              // 31
                                                                                                                // 32
PublishContext.prototype.added = function(collection, id, fields) {                                             // 33
  this._ensureCollection(collection);                                                                           // 34
  var doc = _.clone(fields);                                                                                    // 35
  doc._id = id;                                                                                                 // 36
  this._collectionData[collection].push(doc);                                                                   // 37
};                                                                                                              // 38
                                                                                                                // 39
PublishContext.prototype.changed = function(collection, id, fields) {                                           // 40
  var collectionData = this._collectionData;                                                                    // 41
                                                                                                                // 42
  collectionData[collection] = collectionData[collection].map(function(doc) {                                   // 43
    if (doc._id === id) {                                                                                       // 44
      return _.extend(doc, fields);                                                                             // 45
    }                                                                                                           // 46
                                                                                                                // 47
    return doc;                                                                                                 // 48
  });                                                                                                           // 49
};                                                                                                              // 50
                                                                                                                // 51
PublishContext.prototype.removed = function(collection, id) {                                                   // 52
  var collectionData = this._collectionData;                                                                    // 53
                                                                                                                // 54
  collectionData[collection] = collectionData[collection].filter(function(doc) {                                // 55
    return doc._id !== id;                                                                                      // 56
  });                                                                                                           // 57
};                                                                                                              // 58
                                                                                                                // 59
PublishContext.prototype.onStop = function(cb) {                                                                // 60
  if (this._stopped) {                                                                                          // 61
    cb();                                                                                                       // 62
  } else {                                                                                                      // 63
    this._onStop.push(cb);                                                                                      // 64
  }                                                                                                             // 65
};                                                                                                              // 66
                                                                                                                // 67
PublishContext.prototype.ready = function() {                                                                   // 68
  this._stopped = true;                                                                                         // 69
                                                                                                                // 70
  //make the subscription be marked as ready                                                                    // 71
  if(this._subscription) {                                                                                      // 72
    //don't do this for null subscriptions                                                                      // 73
    this._context.completeSubscriptions(this._subscription);                                                    // 74
  }                                                                                                             // 75
                                                                                                                // 76
  //make sure that any observe callbacks are cancelled                                                          // 77
  this._onStop.forEach(function(cb) {                                                                           // 78
    cb();                                                                                                       // 79
  });                                                                                                           // 80
};                                                                                                              // 81
                                                                                                                // 82
PublishContext.prototype.error = function() {};                                                                 // 83
PublishContext.prototype.stop = function() {};                                                                  // 84
                                                                                                                // 85
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/server/context.js                                                                   //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
var Fibers = Npm.require('fibers');                                                                             // 1
var Future = Npm.require('fibers/future');                                                                      // 2
                                                                                                                // 3
Context = function Context(loginToken, otherParams) {                                                           // 4
  this._collectionData = {};                                                                                    // 5
  this._subscriptions = {};                                                                                     // 6
  this._subscriptionFutures = [];                                                                               // 7
                                                                                                                // 8
  _.extend(this, otherParams);                                                                                  // 9
                                                                                                                // 10
  // get the user                                                                                               // 11
  if(Meteor.users) {                                                                                            // 12
    // check to make sure, we've the loginToken,                                                                // 13
    // otherwise a random user will fetched from the db                                                         // 14
    if(loginToken) {                                                                                            // 15
      if (typeof Accounts._hashLoginToken === 'function'){                                                      // 16
        var hashedToken = loginToken && Accounts._hashLoginToken( loginToken );                                 // 17
        var query = {'services.resume.loginTokens.hashedToken': hashedToken };                                  // 18
      } else {                                                                                                  // 19
        var query = {'services.resume.loginTokens.token': loginToken};                                          // 20
      }                                                                                                         // 21
      var options = {fields: {_id: 1}};                                                                         // 22
      var user = Meteor.users.findOne(query, options);                                                          // 23
    }                                                                                                           // 24
                                                                                                                // 25
    //support for Meteor.user                                                                                   // 26
    Fibers.current._meteor_dynamics = {};                                                                       // 27
    Fibers.current._meteor_dynamics[DDP._CurrentInvocation.slot] = this;                                        // 28
                                                                                                                // 29
    if(user) {                                                                                                  // 30
      this.userId = user._id;                                                                                   // 31
    }                                                                                                           // 32
  }                                                                                                             // 33
};                                                                                                              // 34
                                                                                                                // 35
Context.prototype.find = function(collectionName, query, options) {                                             // 36
  var self = this;                                                                                              // 37
  if(collectionName.constructor == Meteor.Collection) {                                                         // 38
    collectionName = collectionName._name;                                                                      // 39
  } else if(typeof collectionName != 'string') {                                                                // 40
    throw new Error("find's first arg should be either a Meteor.Collection or a string");                       // 41
  }                                                                                                             // 42
                                                                                                                // 43
  var mongo = MongoInternals.defaultRemoteCollectionDriver().mongo;                                             // 44
  if(mongo && mongo.db) {                                                                                       // 45
    var future = new Future();                                                                                  // 46
    var args = Array.prototype.slice.call(arguments, 1);                                                        // 47
    var coll = mongo.db.collection(collectionName);                                                             // 48
                                                                                                                // 49
    coll.find.apply(coll, args).toArray(function(err, result) {                                                 // 50
      if(err) {                                                                                                 // 51
        throw err;                                                                                              // 52
      } else {                                                                                                  // 53
        self._ensureCollection(collectionName);                                                                 // 54
        self._collectionData[collectionName].push(result);                                                      // 55
        future.return();                                                                                        // 56
      }                                                                                                         // 57
    });                                                                                                         // 58
    future.wait();                                                                                              // 59
  } else {                                                                                                      // 60
    console.warn('fast-render still cannot access the mongo connection');                                       // 61
  }                                                                                                             // 62
};                                                                                                              // 63
                                                                                                                // 64
Context.prototype.subscribe = function(subscription /*, params */) {                                            // 65
  var self = this;                                                                                              // 66
                                                                                                                // 67
  var publishHandler = Meteor.default_server.publish_handlers[subscription];                                    // 68
  if(publishHandler) {                                                                                          // 69
    var publishContext = new PublishContext(this, subscription);                                                // 70
    var params = Array.prototype.slice.call(arguments, 1);                                                      // 71
                                                                                                                // 72
    this.processPublication(publishHandler, publishContext, params);                                            // 73
  } else {                                                                                                      // 74
    console.warn('There is no such publish handler named:', subscription);                                      // 75
  }                                                                                                             // 76
};                                                                                                              // 77
                                                                                                                // 78
Context.prototype.processPublication = function(publishHandler, publishContext, params) {                       // 79
  var self = this;                                                                                              // 80
                                                                                                                // 81
  var future = new Future;                                                                                      // 82
  this._subscriptionFutures.push(future);                                                                       // 83
  //detect when the context is ready to be sent to the client                                                   // 84
  publishContext.onStop(function() {                                                                            // 85
    if(!future.isResolved()) {                                                                                  // 86
      future.return();                                                                                          // 87
    }                                                                                                           // 88
  });                                                                                                           // 89
                                                                                                                // 90
  var cursors;                                                                                                  // 91
                                                                                                                // 92
  try {                                                                                                         // 93
    cursors = publishHandler.apply(publishContext, params);                                                     // 94
  } catch(ex) {                                                                                                 // 95
    console.warn('error caught on publication: ', publishContext._subscription, ': ', ex.message);              // 96
    // since, this subscription caught on an error we can't proceed.                                            // 97
    // but we can't also throws an error since other publications might have something useful                   // 98
    // So, it's not fair to ignore running them due to error of this sub                                        // 99
    // this might also be failed due to the use of some private API's of Meteor's Susbscription class           // 100
    publishContext.ready();                                                                                     // 101
  }                                                                                                             // 102
                                                                                                                // 103
  if(cursors) {                                                                                                 // 104
    //the publish function returned a cursor                                                                    // 105
    if(cursors.constructor != Array) {                                                                          // 106
      cursors = [cursors];                                                                                      // 107
    }                                                                                                           // 108
                                                                                                                // 109
    //add collection data                                                                                       // 110
    cursors.forEach(function(cursor) {                                                                          // 111
      cursor.rewind();                                                                                          // 112
      var collectionName =                                                                                      // 113
        (cursor._cursorDescription)? cursor._cursorDescription.collectionName: null || //for meteor-collections // 114
        (cursor._collection)? cursor._collection._name: null; //for smart-collections                           // 115
                                                                                                                // 116
      self._ensureCollection(collectionName);                                                                   // 117
      self._collectionData[collectionName].push(cursor.fetch());                                                // 118
    });                                                                                                         // 119
                                                                                                                // 120
    //the subscription is ready                                                                                 // 121
    publishContext.ready();                                                                                     // 122
  } else if(cursors === null) {                                                                                 // 123
    //some developers send null to indicate they are not using the publication                                  // 124
    //this is not the way to go, but meteor's accounts-base also does this                                      // 125
    //so we need some special handling on this                                                                  // 126
    publishContext.ready();                                                                                     // 127
  }                                                                                                             // 128
                                                                                                                // 129
  if (!future.isResolved()) {                                                                                   // 130
    //don't wait forever for handler to fire ready()                                                            // 131
    Meteor.setTimeout(function() {                                                                              // 132
      if (!future.isResolved()) {                                                                               // 133
        //publish handler failed to send ready signal in time                                                   // 134
        console.warn('Publish handler for', publishContext._subscription, 'sent no ready signal');              // 135
        future.return();                                                                                        // 136
      }                                                                                                         // 137
    }, 500);  //arbitrarially set timeout to 500ms, should probably be configurable                             // 138
  }                                                                                                             // 139
};                                                                                                              // 140
                                                                                                                // 141
Context.prototype.completeSubscriptions = function(subscriptions) {                                             // 142
  var self = this;                                                                                              // 143
  if(typeof subscriptions == 'string') {                                                                        // 144
    subscriptions = [subscriptions];                                                                            // 145
  } else if(!subscriptions || subscriptions.constructor != Array) {                                             // 146
    throw new Error('subscriptions params should be either a string or array of strings');                      // 147
  }                                                                                                             // 148
                                                                                                                // 149
  subscriptions.forEach(function(subscription) {                                                                // 150
    self._subscriptions[subscription] = true;                                                                   // 151
  });                                                                                                           // 152
};                                                                                                              // 153
                                                                                                                // 154
Context.prototype._ensureCollection = function(collectionName) {                                                // 155
  if(!this._collectionData[collectionName]) {                                                                   // 156
    this._collectionData[collectionName] = [];                                                                  // 157
  }                                                                                                             // 158
};                                                                                                              // 159
                                                                                                                // 160
Context.prototype.getData = function() {                                                                        // 161
  // Ensure that all of the subscriptions are ready                                                             // 162
  this._subscriptionFutures.forEach(function(future) {                                                          // 163
    future.wait();                                                                                              // 164
  });                                                                                                           // 165
                                                                                                                // 166
  return {                                                                                                      // 167
    collectionData: this._collectionData,                                                                       // 168
    subscriptions: this._subscriptions                                                                          // 169
  };                                                                                                            // 170
};                                                                                                              // 171
                                                                                                                // 172
FastRender._Context = Context;                                                                                  // 173
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/server/inject.js                                                                    //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
//When a HTTP Request comes, we need to figure out is it a proper request                                       // 1
//then get some query data                                                                                      // 2
//then hijack html return by meteor                                                                             // 3
//code below, does that in abstract way                                                                         // 4
                                                                                                                // 5
var http = Npm.require('http');                                                                                 // 6
                                                                                                                // 7
var injectDataTemplate;                                                                                         // 8
Assets.getText('lib/server/inject_data.html', function(err, text) {                                             // 9
  if(err) {                                                                                                     // 10
    console.error('Error reading fast-render inject_data.html: ', err.message);                                 // 11
  } else {                                                                                                      // 12
    injectDataTemplate = _.template(text.trim());                                                               // 13
  }                                                                                                             // 14
});                                                                                                             // 15
                                                                                                                // 16
var injectConfigTemplate;                                                                                       // 17
Assets.getText('lib/server/inject_config.html', function(err, text) {                                           // 18
  if(err) {                                                                                                     // 19
    console.error('Error reading fast-render inject_config.html: ', err.message);                               // 20
  } else {                                                                                                      // 21
    injectConfigTemplate = _.template(text.trim());                                                             // 22
  }                                                                                                             // 23
});                                                                                                             // 24
                                                                                                                // 25
var originalWrite = http.OutgoingMessage.prototype.write;                                                       // 26
http.OutgoingMessage.prototype.write = function(chunk, encoding) {                                              // 27
  //prevent hijacking other http requests                                                                       // 28
  if(this.queryData && !this.injected &&                                                                        // 29
    encoding === undefined && /<!DOCTYPE html>/.test(chunk)) {                                                  // 30
                                                                                                                // 31
    //if cors headers included if may cause some security holes. see more:                                      // 32
    //so we simply turn off fast-render if we detect an cors header                                             // 33
    //read more: http://goo.gl/eGwb4e                                                                           // 34
    if(this._headers['access-control-allow-origin']) {                                                          // 35
      var warnMessage =                                                                                         // 36
        'warn: fast-render turned off due to CORS headers. read more: http://goo.gl/eGwb4e';                    // 37
      console.warn(warnMessage);                                                                                // 38
      originalWrite.call(this, chunk, encoding);                                                                // 39
      return;                                                                                                   // 40
    }                                                                                                           // 41
                                                                                                                // 42
    //inject config                                                                                             // 43
    if(injectConfigTemplate) {                                                                                  // 44
      var jsonContent = JSON.stringify({                                                                        // 45
        subscriptions: this.queryData.subscriptions,                                                            // 46
        serverRoutePath: this.queryData.serverRoutePath,                                                        // 47
        subscriptionIdMap: {}, //map of ids and its subscription name                                           // 48
        loadedSubscriptions: {} //loaded Subscriptions, which have been forcely completed earlier               // 49
      });                                                                                                       // 50
      var injectHtml = injectConfigTemplate({jsonContent: jsonContent});                                        // 51
      chunk = chunk.replace('<head>', '<head>\n' + injectHtml + '\n');                                          // 52
    } else {                                                                                                    // 53
      console.warn('injectConfigTemplate is not ready yet!');                                                   // 54
    }                                                                                                           // 55
                                                                                                                // 56
    //inject data                                                                                               // 57
    if(injectDataTemplate) {                                                                                    // 58
      var ejsonString = EncodeEJSON({                                                                           // 59
        collectionData: this.queryData.collectionData                                                           // 60
      });                                                                                                       // 61
      var injectHtml = injectDataTemplate({ejsonString: ejsonString});                                          // 62
      chunk = chunk.replace('</head>', injectHtml + '\n</head>');                                               // 63
    } else {                                                                                                    // 64
      console.warn('injectDataTemplate is not ready yet!');                                                     // 65
    }                                                                                                           // 66
                                                                                                                // 67
    this.injected = true;                                                                                       // 68
  }                                                                                                             // 69
                                                                                                                // 70
  originalWrite.call(this, chunk, encoding);                                                                    // 71
};                                                                                                              // 72
                                                                                                                // 73
//meteor algorithm to check if this is a meteor serving http request or not                                     // 74
//add routepolicy package to the fast-render                                                                    // 75
function appUrl(url) {                                                                                          // 76
  if (url === '/favicon.ico' || url === '/robots.txt')                                                          // 77
    return false;                                                                                               // 78
                                                                                                                // 79
  // NOTE: app.manifest is not a web standard like favicon.ico and                                              // 80
  // robots.txt. It is a file name we have chosen to use for HTML5                                              // 81
  // appcache URLs. It is included here to prevent using an appcache                                            // 82
  // then removing it from poisoning an app permanently. Eventually,                                            // 83
  // once we have server side routing, this won't be needed as                                                  // 84
  // unknown URLs with return a 404 automatically.                                                              // 85
  if (url === '/app.manifest')                                                                                  // 86
    return false;                                                                                               // 87
                                                                                                                // 88
  // Avoid serving app HTML for declared routes such as /sockjs/.                                               // 89
  try {                                                                                                         // 90
    // If url is a absolute URL with http:// this throws and error and                                          // 91
    // kill the app. Sometimes intruders will do this                                                           // 92
    // and that causes DOS for us.                                                                              // 93
    if (typeof(RoutePolicy) != 'undefined' && RoutePolicy.classify(url))                                        // 94
      return false;                                                                                             // 95
  } catch(ex) {                                                                                                 // 96
    console.error(ex.stack);                                                                                    // 97
    return false;                                                                                               // 98
  }                                                                                                             // 99
                                                                                                                // 100
  // we currently return app HTML on all URLs by default                                                        // 101
  return true;                                                                                                  // 102
};                                                                                                              // 103
                                                                                                                // 104
//check page and add queries                                                                                    // 105
WebApp.connectHandlers.use(Npm.require('connect').cookieParser());                                              // 106
WebApp.connectHandlers.use(function(req, res, next) {                                                           // 107
  if(appUrl(req.url)) {                                                                                         // 108
    var loginToken = req.cookies['meteor_login_token'];                                                         // 109
    FastRender._processRoutes(req.url, loginToken, req.headers, function(queryData) {                           // 110
      res.queryData = queryData;                                                                                // 111
      if(res.queryData) {                                                                                       // 112
        // encode the url and assign it. This is to prevent XSS                                                 // 113
        // some browsers like Chrome does the URL encoding manually                                             // 114
        // So, we need to clear that and encode ourselves                                                       // 115
        res.queryData.serverRoutePath = encodeURI(decodeURI(req.url));                                          // 116
      }                                                                                                         // 117
      next();                                                                                                   // 118
    });                                                                                                         // 119
    //run our route handlers and add proper queryData                                                           // 120
  } else {                                                                                                      // 121
    next();                                                                                                     // 122
  }                                                                                                             // 123
});                                                                                                             // 124
                                                                                                                // 125
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/fast-render/lib/server/iron_router_support.js                                                       //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
if(!Package['iron-router']) return;                                                                             // 1
                                                                                                                // 2
var RouteController = Package['iron-router'].RouteController;                                                   // 3
var ServerRouter = Package['iron-router'].ServerRouter;                                                         // 4
                                                                                                                // 5
var currentSubscriptions = [];                                                                                  // 6
Meteor.subscribe = function(subscription) {                                                                     // 7
  currentSubscriptions.push(arguments);                                                                         // 8
};                                                                                                              // 9
                                                                                                                // 10
//assuming, no runtime routes will be added                                                                     // 11
Meteor.startup(function() {                                                                                     // 12
  Router.routes.forEach(function(route) {                                                                       // 13
    //resolve controller class                                                                                  // 14
    if(route.options && typeof route.options.controller == 'string') {                                          // 15
      route.options.controller = this[route.options.controller];                                                // 16
    }                                                                                                           // 17
    handleRoute(route.name, route.options);                                                                     // 18
  });                                                                                                           // 19
                                                                                                                // 20
  var globalWaitOns = [];                                                                                       // 21
  if(Router.options && typeof Router.options.waitOn == 'function') {                                            // 22
    //for 0.6.x                                                                                                 // 23
    globalWaitOns.push(Router.options.waitOn);                                                                  // 24
  } else if(Router._globalHooks && Router._globalHooks.waitOn && Router._globalHooks.waitOn.length > 0) {       // 25
    //for 0.7.x                                                                                                 // 26
    Router._globalHooks.waitOn.forEach(function(waitOn) {                                                       // 27
      globalWaitOns.push(waitOn.hook);                                                                          // 28
    });                                                                                                         // 29
  }                                                                                                             // 30
                                                                                                                // 31
  FastRender.onAllRoutes(function(path) {                                                                       // 32
    var self = this;                                                                                            // 33
                                                                                                                // 34
    currentSubscriptions = [];                                                                                  // 35
    globalWaitOns.forEach(function(waitOn) {                                                                    // 36
      waitOn.call({path: path});                                                                                // 37
    });                                                                                                         // 38
                                                                                                                // 39
    currentSubscriptions.forEach(function(args) {                                                               // 40
      self.subscribe.apply(self, args);                                                                         // 41
    });                                                                                                         // 42
  });                                                                                                           // 43
});                                                                                                             // 44
                                                                                                                // 45
function handleRoute(name, options) {                                                                           // 46
  var waitOnFunction;                                                                                           // 47
  if(!options) {                                                                                                // 48
    return false;                                                                                               // 49
  } else if(options.fastRender && typeof options.waitOn == 'function') {                                        // 50
    //do FR support                                                                                             // 51
    waitOnFunction = options.waitOn;                                                                            // 52
    FastRender.route(getPath(), onRoute);                                                                       // 53
    return true;                                                                                                // 54
  } else if(options.controller &&                                                                               // 55
    options.controller.prototype &&                                                                             // 56
    options.controller.prototype.fastRender &&                                                                  // 57
    typeof options.controller.prototype.waitOn == 'function') {                                                 // 58
                                                                                                                // 59
    waitOnFunction = options.controller.prototype.waitOn;                                                       // 60
    FastRender.route(getPath(), onRoute);                                                                       // 61
    return true;                                                                                                // 62
  } else {                                                                                                      // 63
    return false;                                                                                               // 64
  }                                                                                                             // 65
                                                                                                                // 66
  //FastRender onRoute callback                                                                                 // 67
  function onRoute(params, path) {                                                                              // 68
    var self = this;                                                                                            // 69
    var context = {                                                                                             // 70
      params: params,                                                                                           // 71
      path: path                                                                                                // 72
    };                                                                                                          // 73
                                                                                                                // 74
    //reset subscriptions;                                                                                      // 75
    currentSubscriptions = [];                                                                                  // 76
    waitOnFunction.call(context);                                                                               // 77
                                                                                                                // 78
    currentSubscriptions.forEach(function(args) {                                                               // 79
      self.subscribe.apply(self, args);                                                                         // 80
    });                                                                                                         // 81
  }                                                                                                             // 82
                                                                                                                // 83
  function getPath() {                                                                                          // 84
    name = (name == "/")? "" : name;                                                                            // 85
    return options.path || ("/" + name);                                                                        // 86
  }                                                                                                             // 87
}                                                                                                               // 88
                                                                                                                // 89
FastRender.RouteController = RouteController.extend({                                                           // 90
  fastRender: true,                                                                                             // 91
  //disabling any IR specific serverside stuffs                                                                 // 92
  where: 'client'                                                                                               // 93
});                                                                                                             // 94
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['fast-render'] = {
  FastRender: FastRender
};

})();

//# sourceMappingURL=fast-render.js.map
