(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
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
var deepExtend = Package['telescope-lib'].deepExtend;
var camelToDash = Package['telescope-lib'].camelToDash;
var dashToCamel = Package['telescope-lib'].dashToCamel;
var getSetting = Package['telescope-lib'].getSetting;
var getThemeSetting = Package['telescope-lib'].getThemeSetting;
var getSiteUrl = Package['telescope-lib'].getSiteUrl;
var trimWords = Package['telescope-lib'].trimWords;

/* Package-scope variables */
var serveAPI, twitterName;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                     //
// packages/telescope-api/lib/server/api.js                                                            //
//                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                       //
serveAPI = function(limitSegment){                                                                     // 1
  var posts = [];                                                                                      // 2
  var limit = typeof limitSegment === 'undefined' ? 20 : limitSegment // default limit: 20 posts       // 3
                                                                                                       // 4
  Posts.find({status: STATUS_APPROVED}, {sort: {postedAt: -1}, limit: limit}).forEach(function(post) { // 5
    var url = getPostLink(post);                                                                       // 6
    var properties = {                                                                                 // 7
     title: post.title,                                                                                // 8
     headline: post.title, // for backwards compatibility                                              // 9
     author: post.author,                                                                              // 10
     date: post.postedAt,                                                                              // 11
     url: url,                                                                                         // 12
     guid: post._id                                                                                    // 13
    };                                                                                                 // 14
                                                                                                       // 15
    if(post.body)                                                                                      // 16
      properties.body = post.body;                                                                     // 17
                                                                                                       // 18
    if(post.url)                                                                                       // 19
      properties.domain = getDomain(url);                                                              // 20
                                                                                                       // 21
    if(twitterName = getTwitterNameById(post.userId))                                                  // 22
      properties.twitterName = twitterName;                                                            // 23
                                                                                                       // 24
    posts.push(properties);                                                                            // 25
  });                                                                                                  // 26
                                                                                                       // 27
  return JSON.stringify(posts);                                                                        // 28
};                                                                                                     // 29
/////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                     //
// packages/telescope-api/lib/server/routes.js                                                         //
//                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                       //
Meteor.startup(function () {                                                                           // 1
                                                                                                       // 2
  Router.map(function() {                                                                              // 3
                                                                                                       // 4
    this.route('api', {                                                                                // 5
      where: 'server',                                                                                 // 6
      path: '/api/:limit?',                                                                            // 7
      action: function() {                                                                             // 8
        var limit = parseInt(this.params.limit);                                                       // 9
        this.response.write(serveAPI(limit));                                                          // 10
        this.response.end();                                                                           // 11
      }                                                                                                // 12
    });                                                                                                // 13
                                                                                                       // 14
  });                                                                                                  // 15
                                                                                                       // 16
});                                                                                                    // 17
/////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-api'] = {
  serveAPI: serveAPI
};

})();

//# sourceMappingURL=telescope-api.js.map
