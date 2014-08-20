(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Deps = Package.deps.Deps;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var Accounts = Package['accounts-base'].Accounts;
var _ = Package.underscore._;
var RouteController = Package['iron-router'].RouteController;
var Route = Package['iron-router'].Route;
var Router = Package['iron-router'].Router;
var T9n = Package['accounts-t9n'].T9n;
var Iron = Package['iron-core'].Iron;

/* Package-scope variables */
var AccountsEntry, __coffeescriptShare;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// packages/accounts-entry/server/entry.coffee.js                                                    //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Meteor.startup(function() {
  var AccountsEntry;
  Accounts.urls.resetPassword = function(token) {
    return Meteor.absoluteUrl('reset-password/' + token);
  };
  AccountsEntry = {
    settings: {},
    config: function(appConfig) {
      return this.settings = _.extend(this.settings, appConfig);
    }
  };
  this.AccountsEntry = AccountsEntry;
  return Meteor.methods({
    entryValidateSignupCode: function(signupCode) {
      check(signupCode, Match.OneOf(String, null, void 0));
      return !AccountsEntry.settings.signupCode || signupCode === AccountsEntry.settings.signupCode;
    },
    entryCreateUser: function(user) {
      var profile, userId;
      check(user, Object);
      profile = AccountsEntry.settings.defaultProfile || {};
      if (user.username) {
        userId = Accounts.createUser({
          username: user.username,
          email: user.email,
          password: user.password,
          profile: _.extend(profile, user.profile)
        });
      } else {
        userId = Accounts.createUser({
          email: user.email,
          password: user.password,
          profile: _.extend(profile, user.profile)
        });
      }
      if (user.email && Accounts._options.sendVerificationEmail) {
        return Accounts.sendVerificationEmail(userId, user.email);
      }
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// packages/accounts-entry/shared/router.coffee.js                                                   //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {
  this.route("entrySignIn", {
    path: "/sign-in",
    onBeforeAction: function() {
      Session.set('entryError', void 0);
      Session.set('buttonText', 'in');
      return Session.set('fromWhere', Router.current().path);
    },
    onRun: function() {
      var pkgRendered, userRendered;
      if (Meteor.userId()) {
        Router.go(AccountsEntry.settings.dashboardRoute);
      }
      if (AccountsEntry.settings.signInTemplate) {
        this.template = AccountsEntry.settings.signInTemplate;
        pkgRendered = Template.entrySignIn.rendered;
        userRendered = Template[this.template].rendered;
        if (userRendered) {
          Template[this.template].rendered = function() {
            pkgRendered.call(this);
            return userRendered.call(this);
          };
        } else {
          Template[this.template].rendered = pkgRendered;
        }
        Template[this.template].events(AccountsEntry.entrySignInEvents);
        return Template[this.template].helpers(AccountsEntry.entrySignInHelpers);
      }
    }
  });
  this.route("entrySignUp", {
    path: "/sign-up",
    onBeforeAction: function() {
      Session.set('entryError', void 0);
      return Session.set('buttonText', 'up');
    },
    onRun: function() {
      var pkgRendered, userRendered;
      if (AccountsEntry.settings.signUpTemplate) {
        this.template = AccountsEntry.settings.signUpTemplate;
        pkgRendered = Template.entrySignUp.rendered;
        userRendered = Template[this.template].rendered;
        if (userRendered) {
          Template[this.template].rendered = function() {
            pkgRendered.call(this);
            return userRendered.call(this);
          };
        } else {
          Template[this.template].rendered = pkgRendered;
        }
        Template[this.template].events(AccountsEntry.entrySignUpEvents);
        return Template[this.template].helpers(AccountsEntry.entrySignUpHelpers);
      }
    }
  });
  this.route("entryForgotPassword", {
    path: "/forgot-password",
    onBeforeAction: function() {
      return Session.set('entryError', void 0);
    }
  });
  this.route('entrySignOut', {
    path: '/sign-out',
    onBeforeAction: function(pause) {
      Session.set('entryError', void 0);
      if (AccountsEntry.settings.homeRoute) {
        Meteor.logout(function() {
          return Router.go(AccountsEntry.settings.homeRoute);
        });
      }
      return pause();
    }
  });
  return this.route('entryResetPassword', {
    path: 'reset-password/:resetToken',
    onBeforeAction: function() {
      Session.set('entryError', void 0);
      return Session.set('resetToken', this.params.resetToken);
    }
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-entry'] = {
  AccountsEntry: AccountsEntry
};

})();

//# sourceMappingURL=accounts-entry.js.map
