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
var MailChimpAPI = Package.mailchimp.MailChimpAPI;
var MailChimp = Package.mailchimp.MailChimp;
var MailChimpOptions = Package.mailchimp.MailChimpOptions;
var SyncedCron = Package['synced-cron'].SyncedCron;
var Handlebars = Package['handlebars-server'].Handlebars;
var OriginalHandlebars = Package['handlebars-server'].OriginalHandlebars;
var Async = Package.npm.Async;

/* Package-scope variables */
var campaignSchema, Campaigns, defaultFrequency, defaultPosts, getCampaignPosts, buildCampaign, scheduleNextCampaign, later, getSchedule, getNextCampaignSchedule, scheduleCampaign, addToMailChimpList, syncAddToMailChimpList, Handlebars;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/newsletter.js                                                                //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
campaignSchema = new SimpleSchema({                                                                               // 1
 _id: {                                                                                                           // 2
    type: String,                                                                                                 // 3
    optional: true                                                                                                // 4
  },                                                                                                              // 5
  createdAt: {                                                                                                    // 6
    type: Date,                                                                                                   // 7
    optional: true                                                                                                // 8
  },                                                                                                              // 9
  sentAt: {                                                                                                       // 10
    type: String,                                                                                                 // 11
    optional: true                                                                                                // 12
  },                                                                                                              // 13
  status: {                                                                                                       // 14
    type: String,                                                                                                 // 15
    optional: true                                                                                                // 16
  },                                                                                                              // 17
  posts: {                                                                                                        // 18
    type: [String],                                                                                               // 19
    optional: true                                                                                                // 20
  },                                                                                                              // 21
  webHits: {                                                                                                      // 22
    type: Number,                                                                                                 // 23
    optional: true                                                                                                // 24
  },                                                                                                              // 25
});                                                                                                               // 26
                                                                                                                  // 27
Campaigns = new Meteor.Collection("campaigns", {                                                                  // 28
  schema: campaignSchema                                                                                          // 29
});                                                                                                               // 30
                                                                                                                  // 31
addToPostSchema.push(                                                                                             // 32
  {                                                                                                               // 33
    propertyName: 'scheduledAt',                                                                                  // 34
    propertySchema: {                                                                                             // 35
      type: Date,                                                                                                 // 36
      optional: true                                                                                              // 37
    }                                                                                                             // 38
  }                                                                                                               // 39
);                                                                                                                // 40
                                                                                                                  // 41
// Settings                                                                                                       // 42
                                                                                                                  // 43
// note for next two fields: need to add a way to tell app not to publish field to client except for admins       // 44
                                                                                                                  // 45
var showBanner = {                                                                                                // 46
  propertyName: 'showBanner',                                                                                     // 47
  propertySchema: {                                                                                               // 48
    type: Boolean,                                                                                                // 49
    optional: true,                                                                                               // 50
    label: 'Show newsletter sign-up banner'                                                                       // 51
  }                                                                                                               // 52
}                                                                                                                 // 53
addToSettingsSchema.push(showBanner);                                                                             // 54
                                                                                                                  // 55
var mailChimpAPIKey = {                                                                                           // 56
  propertyName: 'mailChimpAPIKey',                                                                                // 57
  propertySchema: {                                                                                               // 58
    type: String,                                                                                                 // 59
    optional: true,                                                                                               // 60
  }                                                                                                               // 61
}                                                                                                                 // 62
addToSettingsSchema.push(mailChimpAPIKey);                                                                        // 63
                                                                                                                  // 64
var mailChimpListId = {                                                                                           // 65
  propertyName: 'mailChimpListId',                                                                                // 66
  propertySchema: {                                                                                               // 67
    type: String,                                                                                                 // 68
    optional: true,                                                                                               // 69
  }                                                                                                               // 70
}                                                                                                                 // 71
addToSettingsSchema.push(mailChimpListId);                                                                        // 72
                                                                                                                  // 73
var postsPerNewsletter = {                                                                                        // 74
  propertyName: 'postsPerNewsletter',                                                                             // 75
  propertySchema: {                                                                                               // 76
    type: Number,                                                                                                 // 77
    optional: true                                                                                                // 78
  }                                                                                                               // 79
}                                                                                                                 // 80
addToSettingsSchema.push(postsPerNewsletter);                                                                     // 81
                                                                                                                  // 82
var newsletterFrequency = {                                                                                       // 83
  propertyName: 'newsletterFrequency',                                                                            // 84
  propertySchema: {                                                                                               // 85
    type: Number,                                                                                                 // 86
    optional: true,                                                                                               // 87
    autoform: {                                                                                                   // 88
      options: [                                                                                                  // 89
        {                                                                                                         // 90
          value: 1,                                                                                               // 91
          label: 'Every Day'                                                                                      // 92
        },                                                                                                        // 93
        {                                                                                                         // 94
          value: 2,                                                                                               // 95
          label: 'Mondays, Wednesdays, Fridays'                                                                   // 96
        },                                                                                                        // 97
        {                                                                                                         // 98
          value: 3,                                                                                               // 99
          label: 'Mondays & Thursdays'                                                                            // 100
        },                                                                                                        // 101
        {                                                                                                         // 102
          value: 7,                                                                                               // 103
          label: 'Once a week (Mondays)'                                                                          // 104
        },                                                                                                        // 105
        {                                                                                                         // 106
          value: 0,                                                                                               // 107
          label: "Don't send newsletter"                                                                          // 108
        }                                                                                                         // 109
      ]                                                                                                           // 110
    },                                                                                                            // 111
    label: 'Newsletter Frequency (requires restart)'                                                              // 112
  }                                                                                                               // 113
}                                                                                                                 // 114
addToSettingsSchema.push(newsletterFrequency);                                                                    // 115
                                                                                                                  // 116
// create new "campaign" lens for all posts from the past X days that haven't been scheduled yet                  // 117
viewParameters.campaign = function (terms) {                                                                      // 118
  return {                                                                                                        // 119
    find: {                                                                                                       // 120
      scheduledAt: {$exists: false},                                                                              // 121
      postedAt: {                                                                                                 // 122
        $gte: terms.after                                                                                         // 123
      }                                                                                                           // 124
    },                                                                                                            // 125
    options: {sort: {sticky: -1, score: -1}}                                                                      // 126
  };                                                                                                              // 127
}                                                                                                                 // 128
                                                                                                                  // 129
heroModules.push({                                                                                                // 130
  template: 'newsletterBanner'                                                                                    // 131
});                                                                                                               // 132
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/campaign.js                                                           //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
defaultFrequency = 7;                                                                                             // 1
defaultPosts = 5;                                                                                                 // 2
                                                                                                                  // 3
getCampaignPosts = function (postsCount) {                                                                        // 4
                                                                                                                  // 5
  var newsletterFrequency = getSetting('newsletterFrequency', defaultFrequency);                                  // 6
                                                                                                                  // 7
  // look for last scheduled campaign in the database                                                             // 8
  var lastCampaign = SyncedCron._collection.findOne({name: 'Schedule newsletter'}, {sort: {finishedAt: -1}, limit: 1});
                                                                                                                  // 10
  // if there is a last campaign use its date, else default to posts from the last 7 days                         // 11
  var lastWeek = moment().subtract('days', 7).toDate();                                                           // 12
  var after = (typeof lastCampaign != 'undefined') ? lastCampaign.finishedAt : lastWeek                           // 13
                                                                                                                  // 14
  var params = getParameters({                                                                                    // 15
    view: 'campaign',                                                                                             // 16
    limit: postsCount,                                                                                            // 17
    after: after                                                                                                  // 18
  });                                                                                                             // 19
  return Posts.find(params.find, params.options).fetch();                                                         // 20
}                                                                                                                 // 21
                                                                                                                  // 22
buildCampaign = function (postsArray) {                                                                           // 23
  var postsHTML = '', subject = '';                                                                               // 24
                                                                                                                  // 25
  // 1. Iterate through posts and pass each of them through a handlebars template                                 // 26
  postsArray.forEach(function (post, index) {                                                                     // 27
    if(index > 0)                                                                                                 // 28
      subject += ', ';                                                                                            // 29
                                                                                                                  // 30
    subject += post.title;                                                                                        // 31
                                                                                                                  // 32
    var postUser = Meteor.users.findOne(post.userId);                                                             // 33
                                                                                                                  // 34
    // the naked post object as stored in the database is missing a few properties, so let's add them             // 35
    var properties = _.extend(post, {                                                                             // 36
      authorName: getAuthorName(post),                                                                            // 37
      postLink: getPostLink(post),                                                                                // 38
      profileUrl: getProfileUrl(postUser),                                                                        // 39
      postPageLink: getPostPageUrl(post),                                                                         // 40
      date: moment(post.postedAt).format("MMMM D YYYY")                                                           // 41
    });                                                                                                           // 42
                                                                                                                  // 43
    if (post.body)                                                                                                // 44
      properties.body = marked(trimWords(post.body, 20)).replace('<p>', '').replace('</p>', ''); // remove p tags // 45
                                                                                                                  // 46
    if(post.url)                                                                                                  // 47
      properties.domain = getDomain(post.url)                                                                     // 48
                                                                                                                  // 49
    postsHTML += Handlebars.templates[getTemplate('emailPostItem')](properties);                                  // 50
  });                                                                                                             // 51
                                                                                                                  // 52
  // 2. Wrap posts HTML in digest template                                                                        // 53
  var digestHTML = Handlebars.templates[getTemplate('emailDigest')]({                                             // 54
    siteName: getSetting('title'),                                                                                // 55
    date: moment().format("dddd, MMMM Do YYYY"),                                                                  // 56
    content: postsHTML                                                                                            // 57
  });                                                                                                             // 58
                                                                                                                  // 59
  // 3. wrap digest HTML in email wrapper tempalte                                                                // 60
  var emailHTML = buildEmailTemplate(digestHTML);                                                                 // 61
                                                                                                                  // 62
  return {                                                                                                        // 63
    postIds: _.pluck(postsArray, '_id'),                                                                          // 64
    subject: trimWords(subject, 15),                                                                              // 65
    html: emailHTML                                                                                               // 66
  }                                                                                                               // 67
}                                                                                                                 // 68
                                                                                                                  // 69
scheduleNextCampaign = function () {                                                                              // 70
  var posts = getCampaignPosts(getSetting('postsPerNewsletter', defaultPosts));                                   // 71
  if(!!posts.length){                                                                                             // 72
    return scheduleCampaign(buildCampaign(posts))                                                                 // 73
  }else{                                                                                                          // 74
    var result = 'No posts to schedule today…';                                                                   // 75
    console.log(result)                                                                                           // 76
    return result                                                                                                 // 77
  }                                                                                                               // 78
}                                                                                                                 // 79
                                                                                                                  // 80
Meteor.methods({                                                                                                  // 81
  testCampaign: function () {                                                                                     // 82
    scheduleNextCampaign();                                                                                       // 83
  }                                                                                                               // 84
});                                                                                                               // 85
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/cron.js                                                               //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
later = Npm.require('later');                                                                                     // 1
                                                                                                                  // 2
defaultFrequency = 7; // once a week                                                                              // 3
                                                                                                                  // 4
getSchedule = function (parser) {                                                                                 // 5
  var frequency = getSetting('newsletterFrequency', defaultFrequency);                                            // 6
  switch (frequency) {                                                                                            // 7
    case 1: // every day                                                                                          // 8
    // sched = {schedules: [{dw: [1,2,3,4,5,6,0]}]};                                                              // 9
    return parser.recur().on(1,2,3,4,5,6,0).dayOfWeek();                                                          // 10
                                                                                                                  // 11
    case 2: // Mondays, Wednesdays, Fridays                                                                       // 12
    // sched = {schedules: [{dw: [2,4,6]}]};                                                                      // 13
    return parser.recur().on(2,4,6).dayOfWeek();                                                                  // 14
                                                                                                                  // 15
    case 3: // Mondays, Thursdays                                                                                 // 16
    // sched = {schedules: [{dw: [2,5]}]};                                                                        // 17
    return parser.recur().on(2,5).dayOfWeek();                                                                    // 18
                                                                                                                  // 19
    case 7: // Once a week (Mondays)                                                                              // 20
    // sched = {schedules: [{dw: [2]}]};                                                                          // 21
    return parser.recur().on(2).dayOfWeek();                                                                      // 22
                                                                                                                  // 23
    default: // Don't send                                                                                        // 24
    return null;                                                                                                  // 25
  }                                                                                                               // 26
}                                                                                                                 // 27
                                                                                                                  // 28
getNextCampaignSchedule = function () {                                                                           // 29
  // var s;                                                                                                       // 30
  var s = SyncedCron._entries[0].schedule(later.parse)                                                            // 31
  // SyncedCron._entries.forEach(function(entry) {                                                                // 32
  //   s = entry.schedule(later.parse);                                                                           // 33
                                                                                                                  // 34
  // });                                                                                                          // 35
  return later.schedule(s).next(1)                                                                                // 36
}                                                                                                                 // 37
                                                                                                                  // 38
SyncedCron.add({                                                                                                  // 39
  name: 'Schedule newsletter',                                                                                    // 40
  schedule: function(parser) {                                                                                    // 41
    // parser is a later.parse object                                                                             // 42
    // var sched;                                                                                                 // 43
    return getSchedule(parser)                                                                                    // 44
                                                                                                                  // 45
  },                                                                                                              // 46
  job: function() {                                                                                               // 47
    scheduleNextCampaign();                                                                                       // 48
  }                                                                                                               // 49
});                                                                                                               // 50
                                                                                                                  // 51
Meteor.startup(function() {                                                                                       // 52
  if(getSetting('newsletterFrequency', defaultFrequency) != 0) {                                                  // 53
    SyncedCron.start();                                                                                           // 54
  };                                                                                                              // 55
});                                                                                                               // 56
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/mailchimp.js                                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
scheduleCampaign = function (campaign) {                                                                          // 1
  MailChimpOptions.apiKey = getSetting('mailChimpAPIKey');                                                        // 2
  MailChimpOptions.listId = getSetting('mailChimpListId');                                                        // 3
                                                                                                                  // 4
  var htmlToText = Meteor.require('html-to-text');                                                                // 5
  var text = htmlToText.fromString(campaign.html, {                                                               // 6
      wordwrap: 130                                                                                               // 7
  });                                                                                                             // 8
  var defaultEmail = getSetting('defaultEmail');                                                                  // 9
  var result= '';                                                                                                 // 10
                                                                                                                  // 11
  if(!!MailChimpOptions.apiKey && !!MailChimpOptions.listId){                                                     // 12
                                                                                                                  // 13
    console.log( 'Creating campaign…');                                                                           // 14
                                                                                                                  // 15
    try {                                                                                                         // 16
        var api = new MailChimp();                                                                                // 17
    } catch ( error ) {                                                                                           // 18
        console.log( error.message );                                                                             // 19
    }                                                                                                             // 20
                                                                                                                  // 21
    api.call( 'campaigns', 'create', {                                                                            // 22
      type: 'regular',                                                                                            // 23
      options: {                                                                                                  // 24
        list_id: MailChimpOptions.listId,                                                                         // 25
        subject: campaign.subject,                                                                                // 26
        from_email: getSetting('defaultEmail'),                                                                   // 27
        from_name: getSetting('title')+ ' Top Posts',                                                             // 28
      },                                                                                                          // 29
      content: {                                                                                                  // 30
        html: campaign.html,                                                                                      // 31
        text: text                                                                                                // 32
      }                                                                                                           // 33
    }, Meteor.bindEnvironment(function ( error, result ) {                                                        // 34
      if ( error ) {                                                                                              // 35
        console.log( error.message );                                                                             // 36
        result = error.message;                                                                                   // 37
      } else {                                                                                                    // 38
        console.log( 'Campaign created');                                                                         // 39
        // console.log( JSON.stringify( result ) );                                                               // 40
                                                                                                                  // 41
        var cid = result.id;                                                                                      // 42
        var archive_url = result.archive_url;                                                                     // 43
        var scheduledTime = moment().zone(0).add('hours', 1).format("YYYY-MM-DD HH:mm:ss");                       // 44
                                                                                                                  // 45
        api.call('campaigns', 'schedule', {                                                                       // 46
          cid: cid,                                                                                               // 47
          schedule_time: scheduledTime                                                                            // 48
        }, Meteor.bindEnvironment(function ( error, result) {                                                     // 49
          if (error) {                                                                                            // 50
            console.log( error.message );                                                                         // 51
            result = error.message;                                                                               // 52
          }else{                                                                                                  // 53
            console.log('Campaign scheduled for '+scheduledTime);                                                 // 54
            console.log(campaign.subject)                                                                         // 55
            // console.log( JSON.stringify( result ) );                                                           // 56
                                                                                                                  // 57
            // mark posts as sent                                                                                 // 58
            Posts.update({_id: {$in: campaign.postIds}}, {$set: {scheduledAt: new Date()}}, {multi: true})        // 59
                                                                                                                  // 60
            // send confirmation email                                                                            // 61
            var confirmationHtml = Handlebars.templates[getTemplate('emailDigestConfirmation')]({                 // 62
              time: scheduledTime,                                                                                // 63
              newsletterLink: archive_url,                                                                        // 64
              subject: campaign.subject                                                                           // 65
            });                                                                                                   // 66
            sendEmail(defaultEmail, 'Newsletter scheduled', buildEmailTemplate(confirmationHtml));                // 67
            result = campaign.subject;                                                                            // 68
          }                                                                                                       // 69
        }));                                                                                                      // 70
      }                                                                                                           // 71
    }));                                                                                                          // 72
  }                                                                                                               // 73
  return result;                                                                                                  // 74
}                                                                                                                 // 75
                                                                                                                  // 76
addToMailChimpList = function(userOrEmail, confirm, done){                                                        // 77
  var user, email;                                                                                                // 78
                                                                                                                  // 79
  if(typeof userOrEmail == "string"){                                                                             // 80
    user = null;                                                                                                  // 81
    email = userOrEmail;                                                                                          // 82
  }else if(typeof userOrEmail == "object"){                                                                       // 83
    user = userOrEmail;                                                                                           // 84
    email = getEmail(user);                                                                                       // 85
    if (!email)                                                                                                   // 86
      throw 'User must have an email address';                                                                    // 87
  }                                                                                                               // 88
                                                                                                                  // 89
  MailChimpOptions.apiKey = getSetting('mailChimpAPIKey');                                                        // 90
  MailChimpOptions.listId = getSetting('mailChimpListId');                                                        // 91
  // add a user to a MailChimp list.                                                                              // 92
  // called when a new user is created, or when an existing user fills in their email                             // 93
  if(!!MailChimpOptions.apiKey && !!MailChimpOptions.listId){                                                     // 94
                                                                                                                  // 95
    console.log('adding "'+email+'" to MailChimp list…');                                                         // 96
                                                                                                                  // 97
    try {                                                                                                         // 98
        var api = new MailChimp();                                                                                // 99
    } catch ( error ) {                                                                                           // 100
        console.log( error.message );                                                                             // 101
    }                                                                                                             // 102
                                                                                                                  // 103
    api.call( 'lists', 'subscribe', {                                                                             // 104
      id: MailChimpOptions.listId,                                                                                // 105
      email: {"email": email},                                                                                    // 106
      double_optin: confirm                                                                                       // 107
    }, Meteor.bindEnvironment(function ( error, result ) {                                                        // 108
      if ( error ) {                                                                                              // 109
        console.log( error.message );                                                                             // 110
        done(error, null);                                                                                        // 111
      } else {                                                                                                    // 112
        console.log( JSON.stringify( result ) );                                                                  // 113
        if(!!user)                                                                                                // 114
          setUserSetting('subscribedToNewsletter', true, user);                                                   // 115
        done(null, result);                                                                                       // 116
      }                                                                                                           // 117
    }));                                                                                                          // 118
  }                                                                                                               // 119
                                                                                                                  // 120
};                                                                                                                // 121
                                                                                                                  // 122
syncAddToMailChimpList = Async.wrap(addToMailChimpList);                                                          // 123
                                                                                                                  // 124
Meteor.methods({                                                                                                  // 125
  addCurrentUserToMailChimpList: function(){                                                                      // 126
    var currentUser = Meteor.users.findOne(this.userId);                                                          // 127
    try {                                                                                                         // 128
      return syncAddToMailChimpList(currentUser, false);                                                          // 129
    } catch (error) {                                                                                             // 130
      throw new Meteor.Error(500, error.message);                                                                 // 131
    }                                                                                                             // 132
  },                                                                                                              // 133
  addEmailToMailChimpList: function (email) {                                                                     // 134
    try {                                                                                                         // 135
      return syncAddToMailChimpList(email, true);                                                                 // 136
    } catch (error) {                                                                                             // 137
      throw new Meteor.Error(500, error.message);                                                                 // 138
    }                                                                                                             // 139
  }                                                                                                               // 140
})                                                                                                                // 141
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/routes.js                                                             //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
                                                                                                                  // 1
Meteor.startup(function () {                                                                                      // 2
                                                                                                                  // 3
  Router.map(function() {                                                                                         // 4
                                                                                                                  // 5
    this.route('campaign', {                                                                                      // 6
      where: 'server',                                                                                            // 7
      path: '/email/campaign',                                                                                    // 8
      action: function() {                                                                                        // 9
        var campaign = buildCampaign(getCampaignPosts(getSetting('postsPerNewsletter', 5)));                      // 10
        var campaignSubject = '<div class="campaign-subject"><strong>Subject:</strong> '+campaign.subject+' (note: contents might change)</div>';
        var campaignSchedule = '<div class="campaign-schedule"><strong>Scheduled for:</strong> '+getNextCampaignSchedule()+'</div>';
                                                                                                                  // 13
        this.response.write(campaignSubject+campaignSchedule+campaign.html);                                      // 14
        this.response.end();                                                                                      // 15
      }                                                                                                           // 16
    });                                                                                                           // 17
                                                                                                                  // 18
    this.route('digestConfirmation', {                                                                            // 19
      where: 'server',                                                                                            // 20
      path: '/email/digest-confirmation',                                                                         // 21
      action: function() {                                                                                        // 22
        var confirmationHtml = Handlebars.templates[getTemplate('emailDigestConfirmation')]({                     // 23
          time: 'January 1st, 1901',                                                                              // 24
          newsletterLink: 'http://example.com',                                                                   // 25
          subject: 'Lorem ipsum dolor sit amet'                                                                   // 26
        });                                                                                                       // 27
        this.response.write(buildEmailTemplate(confirmationHtml));                                                // 28
        this.response.end();                                                                                      // 29
      }                                                                                                           // 30
    });                                                                                                           // 31
                                                                                                                  // 32
  });                                                                                                             // 33
                                                                                                                  // 34
});                                                                                                               // 35
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/templates/handlebars.emailDigest.js                                   //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Handlebars = Handlebars || {};Handlebars.templates = Handlebars.templates || {} ;var template = OriginalHandlebars.compile("<style type=\"text/css\">\n  .email-digest{\n  }\n  .digest-date{\n    color: #999;\n    font-weight: normal;\n    font-size: 16px;\n  }\n  .post-item{\n    border-top: 1px solid #ddd;\n  }\n  .post-date{\n    font-size: 13px;\n    color: #999;\n  }\n  .post-title{\n    font-size: 18px;\n    line-height: 1.6;\n  }\n  .post-thumbnail{\n  }\n  .post-meta{\n    font-size: 13px;\n    color: #999;\n    margin: 5px 0;\n  }\n  .post-meta a{\n    color: #333;\n  }  \n  .post-domain{\n    font-weight: bold;\n  }\n  .post-body-excerpt{\n    font-size: 14px;\n  }\n  .post-body-excerpt p{\n    margin: 0;\n  }\n</style>\n\n<span class=\"heading\">Recently on {{siteName}}</span>\n<span class=\"digest-date\">– {{date}}</span>\n<br><br>\n\n<div class=\"email-digest\">\n  {{{content}}}\n</div>\n<br>");Handlebars.templates["emailDigest"] = function (data, partials) { partials = (partials || {});return template(data || {}, { helpers: OriginalHandlebars.helpers,partials: partials,name: "emailDigest"});};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/templates/handlebars.emailDigestConfirmation.js                       //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Handlebars = Handlebars || {};Handlebars.templates = Handlebars.templates || {} ;var template = OriginalHandlebars.compile("<span class=\"heading\">Newsletter scheduled for {{time}}</span><br><br>\n\n<a href=\"{{newsletterLink}}\">{{subject}}</a><br><br>");Handlebars.templates["emailDigestConfirmation"] = function (data, partials) { partials = (partials || {});return template(data || {}, { helpers: OriginalHandlebars.helpers,partials: partials,name: "emailDigestConfirmation"});};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/telescope-newsletter/lib/server/templates/handlebars.emailPostItem.js                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Handlebars = Handlebars || {};Handlebars.templates = Handlebars.templates || {} ;var template = OriginalHandlebars.compile("<div class=\"post-item\">\n<br >\n\n<span class=\"post-title\">\n  {{#if thumbnailUrl}}\n    <img class=\"post-thumbnail\" src=\"{{thumbnailUrl}}\"/>&nbsp;\n  {{/if}}\n\n  <a href=\"{{postLink}}\" target=\"_blank\">{{title}}</a>\n</span>\n\n<div class=\"post-meta\">\n  {{#if domain}}\n    <a class=\"post-domain\" href=\"\">{{domain}}</a>\n    | \n  {{/if}}\n  <span class=\"post-submitted\">Submitted by <a href=\"{{profileUrl}}\" class=\"comment-link\" target=\"_blank\">{{authorName}}</a></span>\n  <span class=\"post-date\">on {{date}}</span>\n  |\n  <a href=\"{{postPageLink}}\" class=\"comment-link\" target=\"_blank\">{{comments}} Comments</a>\n</div>\n\n\n{{#if body}}\n  <div class=\"post-body-excerpt\">\n    {{{body}}}\n    <a href=\"{{postPageLink}}\" class=\"comment-link\" target=\"_blank\">Read more</a>\n  </div>\n{{/if}}\n\n\n<br>\n</div>\n\n");Handlebars.templates["emailPostItem"] = function (data, partials) { partials = (partials || {});return template(data || {}, { helpers: OriginalHandlebars.helpers,partials: partials,name: "emailPostItem"});};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['telescope-newsletter'] = {};

})();

//# sourceMappingURL=telescope-newsletter.js.map
