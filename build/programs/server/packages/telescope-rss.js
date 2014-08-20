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
var RSS = Package.rss.RSS;

/* Package-scope variables */
var serveRSS;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/telescope-rss/lib/server/rss.js                                                         //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
serveRSS = function() {                                                                             // 1
  var feed = new RSS({                                                                              // 2
    title: getSetting('title'),                                                                     // 3
    description: getSetting('tagline'),                                                             // 4
    feed_url: Meteor.absoluteUrl()+'feed.xml',                                                      // 5
    site_url: Meteor.absoluteUrl(),                                                                 // 6
    image_url: Meteor.absoluteUrl()+'img/favicon.png',                                              // 7
  });                                                                                               // 8
                                                                                                    // 9
  Posts.find({status: STATUS_APPROVED}, {sort: {postedAt: -1}, limit: 20}).forEach(function(post) { // 10
    feed.item({                                                                                     // 11
     title: post.title,                                                                             // 12
     description: post.body+'</br></br> <a href="'+getPostPageUrl(post._id)+'">Comments</a>',       // 13
     author: post.author,                                                                           // 14
     date: post.postedAt,                                                                           // 15
     url: getPostLink(post),                                                                        // 16
     guid: post._id                                                                                 // 17
    });                                                                                             // 18
  });                                                                                               // 19
                                                                                                    // 20
  return feed.xml();                                                                                // 21
};                                                                                                  // 22
                                                                                                    // 23
//////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/telescope-rss/lib/server/routes.js                                                      //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
Meteor.startup(function () {                                                                        // 1
                                                                                                    // 2
  Router.map(function() {                                                                           // 3
                                                                                                    // 4
    // RSS                                                                                          // 5
                                                                                                    // 6
    this.route('feed', {                                                                            // 7
      where: 'server',                                                                              // 8
      path: '/feed.xml',                                                                            // 9
      action: function() {                                                                          // 10
        this.response.write(serveRSS());                                                            // 11
        this.response.end();                                                                        // 12
      }                                                                                             // 13
    });                                                                                             // 14
                                                                                                    // 15
  });                                                                                               // 16
                                                                                                    // 17
});                                                                                                 // 18
//////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-rss'] = {
  serveRSS: serveRSS
};

})();

//# sourceMappingURL=telescope-rss.js.map
