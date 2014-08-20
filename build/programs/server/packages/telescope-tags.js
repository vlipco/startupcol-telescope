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
var preloadSubscriptions, adminNav, Categories, addToPostSchema, primaryNav, postModules, categorySchema, getCategoryUrl;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/telescope-tags/lib/tags.js                                                              //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
categorySchema = new SimpleSchema({                                                                 // 1
 _id: {                                                                                             // 2
    type: String,                                                                                   // 3
    optional: true                                                                                  // 4
  },                                                                                                // 5
  order: {                                                                                          // 6
    type: Number,                                                                                   // 7
    optional: true                                                                                  // 8
  },                                                                                                // 9
  slug: {                                                                                           // 10
    type: String                                                                                    // 11
  },                                                                                                // 12
  name: {                                                                                           // 13
    type: String                                                                                    // 14
  },                                                                                                // 15
});                                                                                                 // 16
                                                                                                    // 17
Categories = new Meteor.Collection("categories", {                                                  // 18
  schema: categorySchema                                                                            // 19
});                                                                                                 // 20
                                                                                                    // 21
// category post list parameters                                                                    // 22
viewParameters.category = function (terms) {                                                        // 23
  return {                                                                                          // 24
    find: {'categories.slug': terms.category},                                                      // 25
    options: {sort: {sticky: -1, score: -1}}                                                        // 26
  };                                                                                                // 27
}                                                                                                   // 28
                                                                                                    // 29
// push "categories" modules to postHeading                                                         // 30
postHeading.push({                                                                                  // 31
  template: 'postCategories',                                                                       // 32
  order: 3                                                                                          // 33
});                                                                                                 // 34
                                                                                                    // 35
// push "categoriesMenu" template to primaryNav                                                     // 36
primaryNav.push('categoriesMenu');                                                                  // 37
                                                                                                    // 38
// push "categories" property to addToPostSchema, so that it's later added to postSchema            // 39
addToPostSchema.push(                                                                               // 40
  {                                                                                                 // 41
    propertyName: 'categories',                                                                     // 42
    propertySchema: {                                                                               // 43
      type: [categorySchema],                                                                       // 44
      optional: true                                                                                // 45
    }                                                                                               // 46
  }                                                                                                 // 47
);                                                                                                  // 48
                                                                                                    // 49
var getCheckedCategories = function (properties) {                                                  // 50
  properties.categories = [];                                                                       // 51
  $('input[name=category]:checked').each(function() {                                               // 52
    var categoryId = $(this).val();                                                                 // 53
    properties.categories.push(Categories.findOne(categoryId));                                     // 54
  });                                                                                               // 55
  return properties;                                                                                // 56
}                                                                                                   // 57
                                                                                                    // 58
postSubmitClientCallbacks.push(getCheckedCategories);                                               // 59
postEditClientCallbacks.push(getCheckedCategories);                                                 // 60
                                                                                                    // 61
Meteor.startup(function () {                                                                        // 62
  Categories.allow({                                                                                // 63
    insert: isAdminById                                                                             // 64
  , update: isAdminById                                                                             // 65
  , remove: isAdminById                                                                             // 66
  });                                                                                               // 67
                                                                                                    // 68
  Meteor.methods({                                                                                  // 69
    category: function(category){                                                                   // 70
      console.log(category)                                                                         // 71
      if (!Meteor.user() || !isAdmin(Meteor.user()))                                                // 72
        throw new Meteor.Error(i18n.t('You need to login and be an admin to add a new category.')); // 73
      var categoryId=Categories.insert(category);                                                   // 74
      return category.name;                                                                         // 75
    }                                                                                               // 76
  });                                                                                               // 77
});                                                                                                 // 78
                                                                                                    // 79
getCategoryUrl = function(slug){                                                                    // 80
  return getSiteUrl()+'category/'+slug;                                                             // 81
};                                                                                                  // 82
//////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/telescope-tags/lib/server/publications.js                                               //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
Meteor.publish('categories', function() {                                                           // 1
  if(canViewById(this.userId)){                                                                     // 2
    return Categories.find();                                                                       // 3
  }                                                                                                 // 4
  return [];                                                                                        // 5
});                                                                                                 // 6
//////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-tags'] = {
  preloadSubscriptions: preloadSubscriptions,
  adminNav: adminNav,
  Categories: Categories,
  addToPostSchema: addToPostSchema,
  primaryNav: primaryNav,
  postModules: postModules
};

})();

//# sourceMappingURL=telescope-tags.js.map
