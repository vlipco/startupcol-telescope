(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var RSS;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/rss/rss.js                                               //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
RSS = Npm.require('rss');                                            // 1
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.rss = {
  RSS: RSS
};

})();

//# sourceMappingURL=rss.js.map
