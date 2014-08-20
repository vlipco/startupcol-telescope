(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Deps = Package.deps.Deps;

/* Package-scope variables */
var T9n, __coffeescriptShare;

(function () {

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
// packages/accounts-t9n/t9n.coffee.js                                        //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
                                                                              //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Handlebars;     

if (Meteor.isClient) {
  if (Package.ui) {
    Handlebars = Package.ui.Handlebars;
  }
  Handlebars.registerHelper('t9n', function(x) {
    return T9n.get(x);
  });
}

T9n = (function() {
  function T9n() {}

  T9n.maps = {};

  T9n.defaultLanguage = 'en';

  T9n.language = '';

  T9n.dep = new Deps.Dependency();

  T9n.missingPrefix = ">";

  T9n.missingPostfix = "<";

  T9n.map = function(language, map) {
    if (!this.maps[language]) {
      this.maps[language] = {};
    }
    this.registerMap(language, '', false, map);
    return this.dep.changed();
  };

  T9n.get = function(label) {
    var _ref, _ref1;
    this.dep.depend();
    if (typeof label !== 'string') {
      return '';
    }
    return ((_ref = this.maps[this.language]) != null ? _ref[label] : void 0) || ((_ref1 = this.maps[this.defaultLanguage]) != null ? _ref1[label] : void 0) || this.missingPrefix + label + this.missingPostfix;
  };

  T9n.registerMap = function(language, prefix, dot, map) {
    var key, value, _results;
    if (typeof map === 'string') {
      return this.maps[language][prefix] = map;
    } else if (typeof map === 'object') {
      if (dot) {
        prefix = prefix + '.';
      }
      _results = [];
      for (key in map) {
        value = map[key];
        _results.push(this.registerMap(language, prefix + key, true, value));
      }
      return _results;
    }
  };

  return T9n;

})();

this.T9n = T9n;

this.t9n = function(x) {
  return T9n.get(x);
};
////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-t9n'] = {
  T9n: T9n
};

})();

//# sourceMappingURL=accounts-t9n.js.map
