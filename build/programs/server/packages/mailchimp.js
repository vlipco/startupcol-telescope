(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var MailChimpAPI, MailChimp, MailChimpOptions;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/mailchimp/lib/server/mailchimp.js                                                         //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
var mailchimp = Npm.require( 'mailchimp' );                                                           // 1
var Future = Npm.require( 'fibers/future' );                                                          // 2
                                                                                                      // 3
MailChimpOptions = {                                                                                  // 4
	'apiKey'	: '',		// Set this in                                                                       // 5
	'listId'	: '',		// settings.json file!                                                               // 6
	'options'	: {                                                                                        // 7
		'version': '2.0'	// Living on The Edge ;)                                                           // 8
	}                                                                                                    // 9
}                                                                                                     // 10
                                                                                                      // 11
if ( Meteor.settings && Meteor.settings.MailChimpOptions !== undefined &&                             // 12
	Meteor.settings.MailChimpOptions.apiKey !== undefined &&                                             // 13
	Meteor.settings.MailChimpOptions.listId !== undefined ) {                                            // 14
                                                                                                      // 15
	MailChimpOptions.apiKey = Meteor.settings.MailChimpOptions.apiKey;                                   // 16
	MailChimpOptions.listId = Meteor.settings.MailChimpOptions.listId;                                   // 17
} else {                                                                                              // 18
	console.log( '[MailChimp] Error: MailChimp Options have not been set in your settings.json file.' ); // 19
}                                                                                                     // 20
                                                                                                      // 21
MailChimp = function( apiKey, options ) {                                                             // 22
	this.asyncAPI = mailchimp.MailChimpAPI(                                                              // 23
		( apiKey )	? apiKey	: MailChimpOptions.apiKey,                                                      // 24
		( options )	? options	: MailChimpOptions.options                                                    // 25
	);                                                                                                   // 26
}                                                                                                     // 27
                                                                                                      // 28
MailChimp.prototype.call = function( section, method, options, callback ) {                           // 29
	this.asyncAPI.call( section, method, options, function( error, result ) {                            // 30
		if ( error ) {                                                                                      // 31
			console.log( '[MailChimp] Error: ' + error.code + ' - ' + error.message );                         // 32
		}                                                                                                   // 33
		callback( error, result );                                                                          // 34
	});                                                                                                  // 35
}                                                                                                     // 36
                                                                                                      // 37
Meteor.methods({                                                                                      // 38
	'MailChimp': function ( clientOptions, section, method, options ) {                                  // 39
		switch ( section ) {                                                                                // 40
			case 'lists':                                                                                      // 41
				if ( !options.id || options.id === "" ) {                                                         // 42
					options.id = MailChimpOptions.listId;                                                            // 43
				}                                                                                                 // 44
				break;                                                                                            // 45
			default:                                                                                           // 46
		}                                                                                                   // 47
                                                                                                      // 48
		try {                                                                                               // 49
			var mailChimp = new MailChimp( clientOptions.apiKey, clientOptions.options );                      // 50
		} catch ( error ) {                                                                                 // 51
			throw new Meteor.Error( error.error, error.reason, error.details );                                // 52
		}                                                                                                   // 53
                                                                                                      // 54
		var future = new Future();                                                                          // 55
		mailChimp.call( section, method, options, function ( error, result ) {                              // 56
			if ( error ) {                                                                                     // 57
				// Pass the original MailChimpAPI Error to the client                                             // 58
				future.throw( new Meteor.Error( error.code, error.message ) );                                    // 59
			} else {                                                                                           // 60
				future.return( result );                                                                          // 61
			}                                                                                                  // 62
		});                                                                                                 // 63
		return future.wait();                                                                               // 64
	}                                                                                                    // 65
});                                                                                                   // 66
                                                                                                      // 67
////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.mailchimp = {
  MailChimpAPI: MailChimpAPI,
  MailChimp: MailChimp,
  MailChimpOptions: MailChimpOptions
};

})();

//# sourceMappingURL=mailchimp.js.map
