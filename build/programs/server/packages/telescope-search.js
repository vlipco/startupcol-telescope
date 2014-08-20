(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var deepExtend = Package['telescope-lib'].deepExtend;
var camelToDash = Package['telescope-lib'].camelToDash;
var dashToCamel = Package['telescope-lib'].dashToCamel;
var getSetting = Package['telescope-lib'].getSetting;
var getThemeSetting = Package['telescope-lib'].getThemeSetting;
var getSiteUrl = Package['telescope-lib'].getSiteUrl;
var trimWords = Package['telescope-lib'].trimWords;
var adminNav = Package['telescope-base'].adminNav;
var viewNav = Package['telescope-base'].viewNav;
var addToPostSchema = Package['telescope-base'].addToPostSchema;
var addToCommentsSchema = Package['telescope-base'].addToCommentsSchema;
var addToSettingsSchema = Package['telescope-base'].addToSettingsSchema;
var preloadSubscriptions = Package['telescope-base'].preloadSubscriptions;
var primaryNav = Package['telescope-base'].primaryNav;
var secondaryNav = Package['telescope-base'].secondaryNav;
var viewParameters = Package['telescope-base'].viewParameters;
var footerModules = Package['telescope-base'].footerModules;
var heroModules = Package['telescope-base'].heroModules;
var postModules = Package['telescope-base'].postModules;
var postHeading = Package['telescope-base'].postHeading;
var postMeta = Package['telescope-base'].postMeta;
var modulePositions = Package['telescope-base'].modulePositions;
var postSubmitRenderedCallbacks = Package['telescope-base'].postSubmitRenderedCallbacks;
var postSubmitClientCallbacks = Package['telescope-base'].postSubmitClientCallbacks;
var postSubmitServerCallbacks = Package['telescope-base'].postSubmitServerCallbacks;
var postEditRenderedCallbacks = Package['telescope-base'].postEditRenderedCallbacks;
var postEditClientCallbacks = Package['telescope-base'].postEditClientCallbacks;
var commentSubmitClientCallbacks = Package['telescope-base'].commentSubmitClientCallbacks;
var commentSubmitServerCallbacks = Package['telescope-base'].commentSubmitServerCallbacks;
var commentEditClientCallbacks = Package['telescope-base'].commentEditClientCallbacks;
var getTemplate = Package['telescope-base'].getTemplate;
var templates = Package['telescope-base'].templates;
var themeSettings = Package['telescope-base'].themeSettings;
var SimpleSchema = Package['simple-schema'].SimpleSchema;
var MongoObject = Package['simple-schema'].MongoObject;

/* Package-scope variables */
var adminNav, viewParameters, Searches, isAdminById, logSearch;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages/telescope-search/lib/search.js                                              //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
// push "search" template to primaryNav                                                 // 1
primaryNav.push('search');                                                              // 2
                                                                                        // 3
Searches = new Meteor.Collection("searches", {                                          // 4
  schema: new SimpleSchema({                                                            // 5
    _id: {                                                                              // 6
      type: String,                                                                     // 7
      optional: true                                                                    // 8
    },                                                                                  // 9
    timestamp: {                                                                        // 10
      type: Date                                                                        // 11
    },                                                                                  // 12
    keyword: {                                                                          // 13
      type: String                                                                      // 14
    }                                                                                   // 15
  })                                                                                    // 16
});                                                                                     // 17
                                                                                        // 18
Searches.allow({                                                                        // 19
  update: isAdminById                                                                   // 20
, remove: isAdminById                                                                   // 21
});                                                                                     // 22
                                                                                        // 23
// XXX                                                                                  // 24
// TODO: find a way to make the package use the same isAdminById as the rest of the app // 25
isAdminById=function(userId){                                                           // 26
  var user = Meteor.users.findOne(userId);                                              // 27
  return !!(user && isAdmin(user));                                                     // 28
};                                                                                      // 29
                                                                                        // 30
                                                                                        // 31
// search post list parameters                                                          // 32
viewParameters.search = function (terms, baseParameters) {                              // 33
  // if query is empty, just return parameters that will result in an empty collection  // 34
  if(typeof terms.query == 'undefined' || !terms.query)                                 // 35
    return {find:{_id: 0}}                                                              // 36
                                                                                        // 37
  // log current search in the db                                                       // 38
  if(Meteor.isServer)                                                                   // 39
    logSearch(terms.query);                                                             // 40
                                                                                        // 41
  var parameters = deepExtend(true, baseParameters, {                                   // 42
    find: {                                                                             // 43
      $or: [                                                                            // 44
        {title: {$regex: terms.query, $options: 'i'}},                                  // 45
        {url: {$regex: terms.query, $options: 'i'}},                                    // 46
        {body: {$regex: terms.query, $options: 'i'}}                                    // 47
      ]                                                                                 // 48
    }                                                                                   // 49
  });                                                                                   // 50
  return parameters;                                                                    // 51
}                                                                                       // 52
//////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages/telescope-search/lib/server/log_search.js                                   //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
logSearch = function (keyword) {                                                        // 1
  Searches.insert({                                                                     // 2
    timestamp: new Date(),                                                              // 3
    keyword: keyword                                                                    // 4
  });                                                                                   // 5
};                                                                                      // 6
//////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages/telescope-search/lib/server/publications.js                                 //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
Meteor.publish('searches', function(limit) {                                            // 1
  var limit = typeof limit === undefined ? 20 : limit;                                  // 2
  if(isAdminById(this.userId)){                                                         // 3
   return Searches.find({}, {limit: limit, sort: {timestamp: -1}});                     // 4
  }                                                                                     // 5
  return [];                                                                            // 6
});                                                                                     // 7
//////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-search'] = {
  adminNav: adminNav,
  viewParameters: viewParameters
};

})();

//# sourceMappingURL=telescope-search.js.map
