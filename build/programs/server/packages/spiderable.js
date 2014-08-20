(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var _ = Package.underscore._;

/* Package-scope variables */
var Spiderable;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/spiderable/spiderable.js                                                                               //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var fs = Npm.require('fs');                                                                                        // 1
var child_process = Npm.require('child_process');                                                                  // 2
var querystring = Npm.require('querystring');                                                                      // 3
var urlParser = Npm.require('url');                                                                                // 4
                                                                                                                   // 5
Spiderable = {};                                                                                                   // 6
                                                                                                                   // 7
// list of bot user agents that we want to serve statically, but do                                                // 8
// not obey the _escaped_fragment_ protocol. The page is served                                                    // 9
// statically to any client whos user agent matches any of these                                                   // 10
// regexps. Users may modify this array.                                                                           // 11
//                                                                                                                 // 12
// An original goal with the spiderable package was to avoid doing                                                 // 13
// user-agent based tests. But the reality is not enough bots support                                              // 14
// the _escaped_fragment_ protocol, so we need to hardcode a list                                                  // 15
// here. I shed a silent tear.                                                                                     // 16
Spiderable.userAgentRegExps = [                                                                                    // 17
    /^facebookexternalhit/i, /^linkedinbot/i, /^twitterbot/i];                                                     // 18
                                                                                                                   // 19
// how long to let phantomjs run before we kill it                                                                 // 20
var REQUEST_TIMEOUT = 15*1000;                                                                                     // 21
// maximum size of result HTML. node's default is 200k which is too                                                // 22
// small for our docs.                                                                                             // 23
var MAX_BUFFER = 5*1024*1024; // 5MB                                                                               // 24
                                                                                                                   // 25
// Exported for tests.                                                                                             // 26
Spiderable._urlForPhantom = function (siteAbsoluteUrl, requestUrl) {                                               // 27
  // reassembling url without escaped fragment if exists                                                           // 28
  var parsedUrl = urlParser.parse(requestUrl);                                                                     // 29
  var parsedQuery = querystring.parse(parsedUrl.query);                                                            // 30
  delete parsedQuery['_escaped_fragment_'];                                                                        // 31
                                                                                                                   // 32
  var parsedAbsoluteUrl = urlParser.parse(siteAbsoluteUrl);                                                        // 33
  // If the ROOT_URL contains a path, Meteor strips that path off of the                                           // 34
  // request's URL before we see it. So we concatenate the pathname from                                           // 35
  // the request's URL with the root URL's pathname to get the full                                                // 36
  // pathname.                                                                                                     // 37
  if (parsedUrl.pathname.charAt(0) === "/") {                                                                      // 38
    parsedUrl.pathname = parsedUrl.pathname.substring(1);                                                          // 39
  }                                                                                                                // 40
  parsedAbsoluteUrl.pathname = urlParser.resolve(parsedAbsoluteUrl.pathname,                                       // 41
                                                 parsedUrl.pathname);                                              // 42
  parsedAbsoluteUrl.query = parsedQuery;                                                                           // 43
  // `url.format` will only use `query` if `search` is absent                                                      // 44
  parsedAbsoluteUrl.search = null;                                                                                 // 45
                                                                                                                   // 46
  return urlParser.format(parsedAbsoluteUrl);                                                                      // 47
};                                                                                                                 // 48
                                                                                                                   // 49
WebApp.connectHandlers.use(function (req, res, next) {                                                             // 50
  // _escaped_fragment_ comes from Google's AJAX crawling spec:                                                    // 51
  // https://developers.google.com/webmasters/ajax-crawling/docs/specification                                     // 52
  // This spec was designed during the brief era where using "#!" URLs was                                         // 53
  // common, so it mostly describes how to translate "#!" URLs into                                                // 54
  // _escaped_fragment_ URLs. Since then, "#!" URLs have gone out of style, but                                    // 55
  // the <meta name="fragment" content="!"> (see spiderable.html) approach also                                    // 56
  // described in the spec is still common and used by several crawlers.                                           // 57
  if (/\?.*_escaped_fragment_=/.test(req.url) ||                                                                   // 58
      _.any(Spiderable.userAgentRegExps, function (re) {                                                           // 59
        return re.test(req.headers['user-agent']); })) {                                                           // 60
                                                                                                                   // 61
    var url = Spiderable._urlForPhantom(Meteor.absoluteUrl(), req.url);                                            // 62
                                                                                                                   // 63
    // This string is going to be put into a bash script, so it's important                                        // 64
    // that 'url' (which comes from the network) can neither exploit phantomjs                                     // 65
    // or the bash script. JSON stringification should prevent it from                                             // 66
    // exploiting phantomjs, and since the output of JSON.stringify shouldn't                                      // 67
    // be able to contain newlines, it should be unable to exploit bash as                                         // 68
    // well.                                                                                                       // 69
    var phantomScript = "var url = " + JSON.stringify(url) + ";" +                                                 // 70
          "var page = require('webpage').create();" +                                                              // 71
          "page.open(url);" +                                                                                      // 72
          "setInterval(function() {" +                                                                             // 73
          "  var ready = page.evaluate(function () {" +                                                            // 74
          "    if (typeof Meteor !== 'undefined' " +                                                               // 75
          "        && typeof(Meteor.status) !== 'undefined' " +                                                    // 76
          "        && Meteor.status().connected) {" +                                                              // 77
          "      Deps.flush();" +                                                                                  // 78
          "      return DDP._allSubscriptionsReady();" +                                                           // 79
          "    }" +                                                                                                // 80
          "    return false;" +                                                                                    // 81
          "  });" +                                                                                                // 82
          "  if (ready) {" +                                                                                       // 83
          "    var out = page.content;" +                                                                          // 84
          "    out = out.replace(/<script[^>]+>(.|\\n|\\r)*?<\\/script\\s*>/ig, '');" +                            // 85
          "    out = out.replace('<meta name=\"fragment\" content=\"!\">', '');" +                                 // 86
          "    console.log(out);" +                                                                                // 87
          "    phantom.exit();" +                                                                                  // 88
          "  }" +                                                                                                  // 89
          "}, 100);\n";                                                                                            // 90
                                                                                                                   // 91
    // Run phantomjs.                                                                                              // 92
    //                                                                                                             // 93
    // Use '/dev/stdin' to avoid writing to a temporary file. We can't                                             // 94
    // just omit the file, as PhantomJS takes that to mean 'use a                                                  // 95
    // REPL' and exits as soon as stdin closes.                                                                    // 96
    //                                                                                                             // 97
    // However, Node 0.8 broke the ability to open /dev/stdin in the                                               // 98
    // subprocess, so we can't just write our string to the process's stdin                                        // 99
    // directly; see https://gist.github.com/3751746 for the gory details. We                                      // 100
    // work around this with a bash heredoc. (We previous used a "cat |"                                           // 101
    // instead, but that meant we couldn't use exec and had to manage several                                      // 102
    // processes.)                                                                                                 // 103
    child_process.execFile(                                                                                        // 104
      '/bin/bash',                                                                                                 // 105
      ['-c',                                                                                                       // 106
       ("exec phantomjs --load-images=no /dev/stdin <<'END'\n" +                                                   // 107
        phantomScript + "END\n")],                                                                                 // 108
      {timeout: REQUEST_TIMEOUT, maxBuffer: MAX_BUFFER},                                                           // 109
      function (error, stdout, stderr) {                                                                           // 110
        if (!error && /<html/i.test(stdout)) {                                                                     // 111
          res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});                                        // 112
          res.end(stdout);                                                                                         // 113
        } else {                                                                                                   // 114
          // phantomjs failed. Don't send the error, instead send the                                              // 115
          // normal page.                                                                                          // 116
          if (error && error.code === 127)                                                                         // 117
            Meteor._debug("spiderable: phantomjs not installed. Download and install from http://phantomjs.org/"); // 118
          else                                                                                                     // 119
            Meteor._debug("spiderable: phantomjs failed:", error, "\nstderr:", stderr);                            // 120
                                                                                                                   // 121
          next();                                                                                                  // 122
        }                                                                                                          // 123
      });                                                                                                          // 124
  } else {                                                                                                         // 125
    next();                                                                                                        // 126
  }                                                                                                                // 127
});                                                                                                                // 128
                                                                                                                   // 129
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.spiderable = {
  Spiderable: Spiderable
};

})();

//# sourceMappingURL=spiderable.js.map
