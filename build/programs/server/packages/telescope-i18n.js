(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var i18n;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/telescope-i18n/i18n.js                                   //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
i18n = {                                                             // 1
                                                                     // 2
  translations: {},                                                  // 3
                                                                     // 4
  t: function (str) {                                                // 5
    var lang = getSetting('language', 'en');                         // 6
    if(i18n.translations[lang] && i18n.translations[lang][str]){     // 7
      return i18n.translations[lang][str];                           // 8
    }                                                                // 9
    return str;                                                      // 10
  }                                                                  // 11
                                                                     // 12
};                                                                   // 13
                                                                     // 14
if(Meteor.isClient){                                                 // 15
  UI.registerHelper('i18n', function(str){                           // 16
    return i18n.t(str);                                              // 17
  });                                                                // 18
}                                                                    // 19
                                                                     // 20
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-i18n'] = {
  i18n: i18n
};

})();

//# sourceMappingURL=telescope-i18n.js.map
