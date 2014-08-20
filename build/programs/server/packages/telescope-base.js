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

/* Package-scope variables */
var adminNav, viewNav, addToPostSchema, addToCommentsSchema, addToSettingsSchema, preloadSubscriptions, primaryNav, secondaryNav, viewParameters, footerModules, heroModules, postModules, postHeading, postMeta, modulePositions, postSubmitRenderedCallbacks, postSubmitClientCallbacks, postSubmitServerCallbacks, postEditRenderedCallbacks, postEditClientCallbacks, commentSubmitClientCallbacks, commentSubmitServerCallbacks, commentEditClientCallbacks, getTemplate, templates, themeSettings, commentEditServerCallbacks;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/telescope-base/lib/base.js                                                      //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
// Initialize common arrays                                                                 // 1
                                                                                            // 2
// array containing properties to be added to the post/settings/comments schema on startup. // 3
addToPostSchema = [];                                                                       // 4
addToCommentsSchema = [];                                                                   // 5
addToSettingsSchema = [];                                                                   // 6
                                                                                            // 7
// array containing items in the views menu                                                 // 8
viewNav = [                                                                                 // 9
  {                                                                                         // 10
    route: 'posts_top',                                                                     // 11
    label: 'Top'                                                                            // 12
  },                                                                                        // 13
  {                                                                                         // 14
    route: 'posts_new',                                                                     // 15
    label: 'New'                                                                            // 16
  },                                                                                        // 17
  {                                                                                         // 18
    route: 'posts_best',                                                                    // 19
    label: 'Best'                                                                           // 20
  },                                                                                        // 21
  {                                                                                         // 22
    route: 'posts_digest',                                                                  // 23
    label: 'Digest'                                                                         // 24
  }                                                                                         // 25
];                                                                                          // 26
                                                                                            // 27
// array containing items in the admin menu                                                 // 28
adminNav = [];                                                                              // 29
                                                                                            // 30
// array containing subscriptions to be preloaded                                           // 31
preloadSubscriptions = [];                                                                  // 32
                                                                                            // 33
// array containing nav items; initialize with views menu and admin menu                    // 34
primaryNav = ['viewsMenu', 'adminMenu'];                                                    // 35
                                                                                            // 36
secondaryNav = ['userMenu', 'submitButton'];                                                // 37
                                                                                            // 38
// object containing post list view parameters                                              // 39
viewParameters = {}                                                                         // 40
                                                                                            // 41
viewParameters.top = function (terms) {                                                     // 42
  return {                                                                                  // 43
    options: {sort: {sticky: -1, score: -1}}                                                // 44
  };                                                                                        // 45
}                                                                                           // 46
                                                                                            // 47
viewParameters.new = function (terms) {                                                     // 48
  return {                                                                                  // 49
    options: {sort: {sticky: -1, postedAt: -1}}                                             // 50
  };                                                                                        // 51
}                                                                                           // 52
                                                                                            // 53
viewParameters.best = function (terms) {                                                    // 54
  return {                                                                                  // 55
    options: {sort: {sticky: -1, baseScore: -1}}                                            // 56
  };                                                                                        // 57
}                                                                                           // 58
                                                                                            // 59
viewParameters.pending = function (terms) {                                                 // 60
  return {                                                                                  // 61
    find: {status: 1},                                                                      // 62
    options: {sort: {createdAt: -1}}                                                        // 63
  };                                                                                        // 64
}                                                                                           // 65
                                                                                            // 66
viewParameters.digest = function (terms) {                                                  // 67
  return {                                                                                  // 68
    find: {                                                                                 // 69
      postedAt: {                                                                           // 70
        $gte: terms.after,                                                                  // 71
        $lt: terms.before                                                                   // 72
      }                                                                                     // 73
    },                                                                                      // 74
    options: {                                                                              // 75
      sort: {sticky: -1, baseScore: -1}                                                     // 76
    }                                                                                       // 77
  };                                                                                        // 78
}                                                                                           // 79
                                                                                            // 80
footerModules = [];                                                                         // 81
                                                                                            // 82
heroModules = [];                                                                           // 83
                                                                                            // 84
// array containing post modules                                                            // 85
modulePositions = [                                                                         // 86
  'left-left',                                                                              // 87
  'left-center',                                                                            // 88
  'left-right',                                                                             // 89
  'center-left',                                                                            // 90
  'center-center',                                                                          // 91
  'center-right',                                                                           // 92
  'right-left',                                                                             // 93
  'right-center',                                                                           // 94
  'right-right'                                                                             // 95
];                                                                                          // 96
                                                                                            // 97
postModules = [                                                                             // 98
  {                                                                                         // 99
    template: 'postUpvote',                                                                 // 100
    position: 'left-left'                                                                   // 101
  },                                                                                        // 102
  {                                                                                         // 103
    template: 'postActions',                                                                // 104
    position: 'left-right'                                                                  // 105
  },                                                                                        // 106
  {                                                                                         // 107
    template: 'postContent',                                                                // 108
    position: 'center-center'                                                               // 109
  },                                                                                        // 110
  {                                                                                         // 111
    template: 'postDiscuss',                                                                // 112
    position: 'right-right'                                                                 // 113
  }                                                                                         // 114
];                                                                                          // 115
                                                                                            // 116
postHeading = [                                                                             // 117
  {                                                                                         // 118
    template: 'postTitle',                                                                  // 119
    order: 1                                                                                // 120
  },                                                                                        // 121
  {                                                                                         // 122
    template: 'postDomain',                                                                 // 123
    order: 5                                                                                // 124
  }                                                                                         // 125
]                                                                                           // 126
                                                                                            // 127
postMeta = [                                                                                // 128
  {                                                                                         // 129
    template: 'postMeta',                                                                   // 130
    order: 1                                                                                // 131
  },                                                                                        // 132
  {                                                                                         // 133
    template: 'postCommentsLink',                                                           // 134
    order: 3                                                                                // 135
  },                                                                                        // 136
  {                                                                                         // 137
    template: 'postAdmin',                                                                  // 138
    order: 5                                                                                // 139
  }                                                                                         // 140
]                                                                                           // 141
// ------------------------------ Callbacks ------------------------------ //               // 142
                                                                                            // 143
postSubmitRenderedCallbacks = [];                                                           // 144
postSubmitClientCallbacks = [];                                                             // 145
postSubmitServerCallbacks = [];                                                             // 146
                                                                                            // 147
postEditRenderedCallbacks = [];                                                             // 148
postEditClientCallbacks = [];                                                               // 149
                                                                                            // 150
commentEditClientCallbacks = []; // not used yet                                            // 151
commentEditServerCallbacks = []; // not used yet                                            // 152
                                                                                            // 153
commentEditClientCallbacks = []; // not used yet                                            // 154
                                                                                            // 155
// ------------------------------ Dynamic Templates ------------------------------ //       // 156
                                                                                            // 157
                                                                                            // 158
templates = {}                                                                              // 159
                                                                                            // 160
getTemplate = function (name) {                                                             // 161
  // if template has been overwritten, return this; else return template name               // 162
  return !!templates[name] ? templates[name] : name;                                        // 163
}                                                                                           // 164
                                                                                            // 165
// ------------------------------ Theme Settings ------------------------------ //          // 166
                                                                                            // 167
themeSettings = {                                                                           // 168
  'useDropdowns': true // whether or not to use dropdown menus in a theme                   // 169
};                                                                                          // 170
//////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/telescope-base/lib/base_server.js                                               //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
                                                                                            //
                                                                                            // 1
//////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-base'] = {
  adminNav: adminNav,
  viewNav: viewNav,
  addToPostSchema: addToPostSchema,
  addToCommentsSchema: addToCommentsSchema,
  addToSettingsSchema: addToSettingsSchema,
  preloadSubscriptions: preloadSubscriptions,
  primaryNav: primaryNav,
  secondaryNav: secondaryNav,
  viewParameters: viewParameters,
  footerModules: footerModules,
  heroModules: heroModules,
  postModules: postModules,
  postHeading: postHeading,
  postMeta: postMeta,
  modulePositions: modulePositions,
  postSubmitRenderedCallbacks: postSubmitRenderedCallbacks,
  postSubmitClientCallbacks: postSubmitClientCallbacks,
  postSubmitServerCallbacks: postSubmitServerCallbacks,
  postEditRenderedCallbacks: postEditRenderedCallbacks,
  postEditClientCallbacks: postEditClientCallbacks,
  commentSubmitClientCallbacks: commentSubmitClientCallbacks,
  commentSubmitServerCallbacks: commentSubmitServerCallbacks,
  commentEditClientCallbacks: commentEditClientCallbacks,
  getTemplate: getTemplate,
  templates: templates,
  themeSettings: themeSettings
};

})();

//# sourceMappingURL=telescope-base.js.map
