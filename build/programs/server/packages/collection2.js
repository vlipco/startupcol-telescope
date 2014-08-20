(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var SimpleSchema = Package['simple-schema'].SimpleSchema;
var MongoObject = Package['simple-schema'].MongoObject;
var _ = Package.underscore._;
var Deps = Package.deps.Deps;
var check = Package.check.check;
var Match = Package.check.Match;
var MongoInternals = Package['mongo-livedata'].MongoInternals;
var EJSON = Package.ejson.EJSON;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/collection2/collection2.js                                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Extend the schema options allowed by SimpleSchema                                                                  // 1
SimpleSchema.extendOptions({                                                                                          // 2
  index: Match.Optional(Match.OneOf(Number, String, Boolean)),                                                        // 3
  unique: Match.Optional(Boolean),                                                                                    // 4
  denyInsert: Match.Optional(Boolean),                                                                                // 5
  denyUpdate: Match.Optional(Boolean)                                                                                 // 6
});                                                                                                                   // 7
                                                                                                                      // 8
// Define some extra validation error messages                                                                        // 9
SimpleSchema.messages({                                                                                               // 10
  notUnique: "[label] must be unique",                                                                                // 11
  insertNotAllowed: "[label] cannot be set during an insert",                                                         // 12
  updateNotAllowed: "[label] cannot be set during an update"                                                          // 13
});                                                                                                                   // 14
                                                                                                                      // 15
/*                                                                                                                    // 16
 * Public API                                                                                                         // 17
 */                                                                                                                   // 18
                                                                                                                      // 19
var constructor = Meteor.Collection;                                                                                  // 20
Meteor.Collection = function c2CollectionConstructor(name, options) {                                                 // 21
  var self = this, ss;                                                                                                // 22
  options = options || {};                                                                                            // 23
                                                                                                                      // 24
  if (options.schema) {                                                                                               // 25
    ss = options.schema;                                                                                              // 26
    delete options.schema;                                                                                            // 27
  }                                                                                                                   // 28
                                                                                                                      // 29
  if (options.virtualFields) {                                                                                        // 30
    throw new Error('Collection2: Sorry, the virtualFields option is no longer supported.');                          // 31
  }                                                                                                                   // 32
                                                                                                                      // 33
  // Call original Meteor.Collection constructor                                                                      // 34
  constructor.call(self, name, options);                                                                              // 35
                                                                                                                      // 36
  // Attach schema                                                                                                    // 37
  ss && self.attachSchema(ss);                                                                                        // 38
};                                                                                                                    // 39
                                                                                                                      // 40
// Make sure prototype and normal properties are kept                                                                 // 41
Meteor.Collection.prototype = constructor.prototype;                                                                  // 42
                                                                                                                      // 43
for (var prop in constructor) {                                                                                       // 44
  if (constructor.hasOwnProperty(prop)) {                                                                             // 45
    Meteor.Collection[prop] = constructor[prop];                                                                      // 46
  }                                                                                                                   // 47
}                                                                                                                     // 48
                                                                                                                      // 49
if (Meteor.isServer) {                                                                                                // 50
  // A function passed to Meteor.startup is only run on the server if                                                 // 51
  // the process has not yet started up. So we need a flag to tell                                                    // 52
  // us whether to wrap in Meteor.startup or not                                                                      // 53
  var hasStartedUp = false;                                                                                           // 54
  Meteor.startup(function () {                                                                                        // 55
    hasStartedUp = true;                                                                                              // 56
  });                                                                                                                 // 57
}                                                                                                                     // 58
                                                                                                                      // 59
/**                                                                                                                   // 60
 * Meteor.Collection.prototype.attachSchema                                                                           // 61
 * @param  {SimpleSchema|Object} ss - SimpleSchema instance or a schema definition object from which to create a new SimpleSchema instance
 * @return {undefined}                                                                                                // 63
 *                                                                                                                    // 64
 * Use this method to attach a schema to a collection created by another package,                                     // 65
 * such as Meteor.users. It is most likely unsafe to call this method more than                                       // 66
 * once for a single collection, or to call this for a collection that had a                                          // 67
 * schema object passed to its constructor.                                                                           // 68
 */                                                                                                                   // 69
Meteor.Collection.prototype.attachSchema = function c2AttachSchema(ss) {                                              // 70
  var self = this;                                                                                                    // 71
                                                                                                                      // 72
  if (!(ss instanceof SimpleSchema)) {                                                                                // 73
    ss = new SimpleSchema(ss);                                                                                        // 74
  }                                                                                                                   // 75
                                                                                                                      // 76
  self._c2 = {};                                                                                                      // 77
  self._c2._simpleSchema = ss;                                                                                        // 78
                                                                                                                      // 79
  // Loop over fields definitions and ensure collection indexes (server side only)                                    // 80
  _.each(ss.schema(), function(definition, fieldName) {                                                               // 81
    if (Meteor.isServer && ('index' in definition || definition.unique === true)) {                                   // 82
                                                                                                                      // 83
      function setUpIndex() {                                                                                         // 84
        var index = {}, indexValue;                                                                                   // 85
        // If they specified `unique: true` but not `index`, we assume `index: 1` to set up the unique index in mongo // 86
        if ('index' in definition) {                                                                                  // 87
          indexValue = definition['index'];                                                                           // 88
          if (indexValue === true) {                                                                                  // 89
            indexValue = 1;                                                                                           // 90
          }                                                                                                           // 91
        } else {                                                                                                      // 92
          indexValue = 1;                                                                                             // 93
        }                                                                                                             // 94
        var indexName = 'c2_' + fieldName;                                                                            // 95
        // In the index object, we want object array keys without the ".$" piece                                      // 96
        var idxFieldName = fieldName.replace(/\.\$\./g, ".");                                                         // 97
        index[idxFieldName] = indexValue;                                                                             // 98
        var unique = !!definition.unique && (indexValue === 1 || indexValue === -1);                                  // 99
        var sparse = !!definition.optional && unique;                                                                 // 100
        if (indexValue !== false) {                                                                                   // 101
          self._collection._ensureIndex(index, {                                                                      // 102
            background: true,                                                                                         // 103
            name: indexName,                                                                                          // 104
            unique: unique,                                                                                           // 105
            sparse: sparse                                                                                            // 106
          });                                                                                                         // 107
        } else {                                                                                                      // 108
          try {                                                                                                       // 109
            self._collection._dropIndex(indexName);                                                                   // 110
          } catch (err) {                                                                                             // 111
            console.warn("Collection2: Tried to drop mongo index " + indexName + ", but there is no index with that name");
          }                                                                                                           // 113
        }                                                                                                             // 114
      }                                                                                                               // 115
                                                                                                                      // 116
      if (hasStartedUp) {                                                                                             // 117
        setUpIndex();                                                                                                 // 118
      } else {                                                                                                        // 119
        Meteor.startup(setUpIndex);                                                                                   // 120
      }                                                                                                               // 121
                                                                                                                      // 122
    }                                                                                                                 // 123
  });                                                                                                                 // 124
                                                                                                                      // 125
  // Set up additional checks                                                                                         // 126
  ss.validator(function() {                                                                                           // 127
    var test, totalUsing, totalWillUse, sel;                                                                          // 128
    var def = this.definition;                                                                                        // 129
    var val = this.value;                                                                                             // 130
    var op = this.operator;                                                                                           // 131
    var key = this.key;                                                                                               // 132
                                                                                                                      // 133
    if (def.denyInsert && val !== void 0 && !op) {                                                                    // 134
      // This is an insert of a defined value into a field where denyInsert=true                                      // 135
      return "insertNotAllowed";                                                                                      // 136
    }                                                                                                                 // 137
                                                                                                                      // 138
    if (def.denyUpdate && op) {                                                                                       // 139
      // This is an insert of a defined value into a field where denyUpdate=true                                      // 140
      if (op !== "$set" || (op === "$set" && val !== void 0)) {                                                       // 141
        return "updateNotAllowed";                                                                                    // 142
      }                                                                                                               // 143
    }                                                                                                                 // 144
                                                                                                                      // 145
    return true;                                                                                                      // 146
  });                                                                                                                 // 147
                                                                                                                      // 148
  // First define deny functions to extend doc with the results of clean                                              // 149
  // and autovalues. This must be done with "transform: null" or we would be                                          // 150
  // extending a clone of doc and therefore have no effect.                                                           // 151
  self.deny({                                                                                                         // 152
    insert: function(userId, doc) {                                                                                   // 153
      // If _id has already been added, remove it temporarily if it's                                                 // 154
      // not explicitly defined in the schema.                                                                        // 155
      var id;                                                                                                         // 156
      if (Meteor.isServer && doc._id && !ss.allowsKey("_id")) {                                                       // 157
        id = doc._id;                                                                                                 // 158
        delete doc._id;                                                                                               // 159
      }                                                                                                               // 160
                                                                                                                      // 161
      // Referenced doc is cleaned in place                                                                           // 162
      ss.clean(doc, {                                                                                                 // 163
        isModifier: false,                                                                                            // 164
        // We don't do these here because they are done on the client if desired                                      // 165
        filter: false,                                                                                                // 166
        autoConvert: false,                                                                                           // 167
        removeEmptyStrings: false,                                                                                    // 168
        extendAutoValueContext: {                                                                                     // 169
          isInsert: true,                                                                                             // 170
          isUpdate: false,                                                                                            // 171
          isUpsert: false,                                                                                            // 172
          userId: userId,                                                                                             // 173
          isFromTrustedCode: false                                                                                    // 174
        }                                                                                                             // 175
      });                                                                                                             // 176
                                                                                                                      // 177
      // Add the ID back                                                                                              // 178
      if (id) {                                                                                                       // 179
        doc._id = id;                                                                                                 // 180
      }                                                                                                               // 181
                                                                                                                      // 182
      return false;                                                                                                   // 183
    },                                                                                                                // 184
    update: function(userId, doc, fields, modifier) {                                                                 // 185
                                                                                                                      // 186
      // Referenced modifier is cleaned in place                                                                      // 187
      ss.clean(modifier, {                                                                                            // 188
        isModifier: true,                                                                                             // 189
        // We don't do these here because they are done on the client if desired                                      // 190
        filter: false,                                                                                                // 191
        autoConvert: false,                                                                                           // 192
        removeEmptyStrings: false,                                                                                    // 193
        extendAutoValueContext: {                                                                                     // 194
          isInsert: false,                                                                                            // 195
          isUpdate: true,                                                                                             // 196
          isUpsert: false,                                                                                            // 197
          userId: userId,                                                                                             // 198
          isFromTrustedCode: false                                                                                    // 199
        }                                                                                                             // 200
      });                                                                                                             // 201
                                                                                                                      // 202
      return false;                                                                                                   // 203
    },                                                                                                                // 204
    fetch: [],                                                                                                        // 205
    transform: null                                                                                                   // 206
  });                                                                                                                 // 207
                                                                                                                      // 208
  // Second define deny functions to validate again on the server                                                     // 209
  // for client-initiated inserts and updates. These should be                                                        // 210
  // called after the clean/autovalue functions since we're adding                                                    // 211
  // them after. These must *not* have "transform: null" because                                                      // 212
  // we need to pass the doc through any transforms to be sure                                                        // 213
  // that custom types are properly recognized for type validation.                                                   // 214
  self.deny({                                                                                                         // 215
    insert: function(userId, doc) {                                                                                   // 216
      // We pass the false options because we will have done them on client if desired                                // 217
      doValidate.call(self, "insert", [doc, {removeEmptyStrings: false, filter: false, autoConvert: false}, function(error) {
          if (error) {                                                                                                // 219
            throw new Meteor.Error(400, 'INVALID', EJSON.stringify(error.invalidKeys));                               // 220
          }                                                                                                           // 221
        }], true, userId, false);                                                                                     // 222
                                                                                                                      // 223
      return false;                                                                                                   // 224
    },                                                                                                                // 225
    update: function(userId, doc, fields, modifier) {                                                                 // 226
      // NOTE: This will never be an upsert because client-side upserts                                               // 227
      // are not allowed once you define allow/deny functions.                                                        // 228
      // We pass the false options because we will have done them on client if desired                                // 229
      doValidate.call(self, "update", [null, modifier, {removeEmptyStrings: false, filter: false, autoConvert: false}, function(error) {
          if (error) {                                                                                                // 231
            throw new Meteor.Error(400, 'INVALID', EJSON.stringify(error.invalidKeys));                               // 232
          }                                                                                                           // 233
        }], true, userId, false);                                                                                     // 234
                                                                                                                      // 235
      return false;                                                                                                   // 236
    },                                                                                                                // 237
    fetch: []                                                                                                         // 238
  });                                                                                                                 // 239
                                                                                                                      // 240
  // If insecure package is in use, we need to add allow rules that return                                            // 241
  // true. Otherwise, it would seemingly turn off insecure mode.                                                      // 242
  if (Package && Package.insecure) {                                                                                  // 243
    self.allow({                                                                                                      // 244
      insert: function() {                                                                                            // 245
        return true;                                                                                                  // 246
      },                                                                                                              // 247
      update: function() {                                                                                            // 248
        return true;                                                                                                  // 249
      },                                                                                                              // 250
      remove: function () {                                                                                           // 251
        return true;                                                                                                  // 252
      },                                                                                                              // 253
      fetch: [],                                                                                                      // 254
      transform: null                                                                                                 // 255
    });                                                                                                               // 256
  }                                                                                                                   // 257
  // If insecure package is NOT in use, then adding the two deny functions                                            // 258
  // does not have any effect on the main app's security paradigm. The                                                // 259
  // user will still be required to add at least one allow function of her                                            // 260
  // own for each operation for this collection. And the user may still add                                           // 261
  // additional deny functions, but does not have to.                                                                 // 262
};                                                                                                                    // 263
                                                                                                                      // 264
Meteor.Collection.prototype.simpleSchema = function c2SS() {                                                          // 265
  var self = this;                                                                                                    // 266
  return self._c2 ? self._c2._simpleSchema : null;                                                                    // 267
};                                                                                                                    // 268
                                                                                                                      // 269
// Wrap DB write operation methods                                                                                    // 270
_.each(['insert', 'update', 'upsert'], function(methodName) {                                                         // 271
  var _super = Meteor.Collection.prototype[methodName];                                                               // 272
  Meteor.Collection.prototype[methodName] = function () {                                                             // 273
    var self = this, args = _.toArray(arguments);                                                                     // 274
    if (self._c2) {                                                                                                   // 275
      args = doValidate.call(self, methodName, args, false,                                                           // 276
        (Meteor.isClient && Meteor.userId && Meteor.userId()) || null, Meteor.isServer);                              // 277
      if (!args) {                                                                                                    // 278
        // doValidate already called the callback or threw the error                                                  // 279
        if (methodName === "insert") {                                                                                // 280
          // insert should always return an ID to match core behavior                                                 // 281
          return self._makeNewID();                                                                                   // 282
        } else {                                                                                                      // 283
          return;                                                                                                     // 284
        }                                                                                                             // 285
      }                                                                                                               // 286
    }                                                                                                                 // 287
    return _super.apply(self, args);                                                                                  // 288
  };                                                                                                                  // 289
});                                                                                                                   // 290
                                                                                                                      // 291
/*                                                                                                                    // 292
 * Private                                                                                                            // 293
 */                                                                                                                   // 294
                                                                                                                      // 295
function doValidate(type, args, skipAutoValue, userId, isFromTrustedCode) {                                           // 296
  var self = this, schema = self._c2._simpleSchema,                                                                   // 297
      doc, callback, error, options, isUpsert, selector;                                                              // 298
                                                                                                                      // 299
  if (!args.length) {                                                                                                 // 300
    throw new Error(type + " requires an argument");                                                                  // 301
  }                                                                                                                   // 302
                                                                                                                      // 303
  // Gather arguments and cache the selector                                                                          // 304
  if (type === "insert") {                                                                                            // 305
    doc = args[0];                                                                                                    // 306
    options = args[1];                                                                                                // 307
    callback = args[2];                                                                                               // 308
                                                                                                                      // 309
    // The real insert doesn't take options                                                                           // 310
    if (typeof options === "function") {                                                                              // 311
      args = [doc, options];                                                                                          // 312
    } else if (typeof callback === "function") {                                                                      // 313
      args = [doc, callback];                                                                                         // 314
    } else {                                                                                                          // 315
      args = [doc];                                                                                                   // 316
    }                                                                                                                 // 317
                                                                                                                      // 318
  } else if (type === "update" || type === "upsert") {                                                                // 319
    selector = args[0];                                                                                               // 320
    doc = args[1];                                                                                                    // 321
    options = args[2];                                                                                                // 322
    callback = args[3];                                                                                               // 323
  } else {                                                                                                            // 324
    throw new Error("invalid type argument");                                                                         // 325
  }                                                                                                                   // 326
                                                                                                                      // 327
  // Support missing options arg                                                                                      // 328
  if (!callback && typeof options === "function") {                                                                   // 329
    callback = options;                                                                                               // 330
    options = {};                                                                                                     // 331
  }                                                                                                                   // 332
  options = options || {};                                                                                            // 333
                                                                                                                      // 334
  // If update was called with upsert:true or upsert was called, flag as an upsert                                    // 335
  isUpsert = (type === "upsert" || (type === "update" && options.upsert === true));                                   // 336
                                                                                                                      // 337
  // Add a default callback function if we're on the client and no callback was given                                 // 338
  if (Meteor.isClient && !callback) {                                                                                 // 339
    // Client can't block, so it can't report errors by exception,                                                    // 340
    // only by callback. If they forget the callback, give them a                                                     // 341
    // default one that logs the error, so they aren't totally                                                        // 342
    // baffled if their writes don't work because their database is                                                   // 343
    // down.                                                                                                          // 344
    callback = function(err) {                                                                                        // 345
      if (err)                                                                                                        // 346
        Meteor._debug(type + " failed: " + (err.reason || err.stack));                                                // 347
    };                                                                                                                // 348
  }                                                                                                                   // 349
                                                                                                                      // 350
  // If client validation is fine or is skipped but then something                                                    // 351
  // is found to be invalid on the server, we get that error back                                                     // 352
  // as a special Meteor.Error that we need to parse.                                                                 // 353
  if (Meteor.isClient) {                                                                                              // 354
    var last = args.length - 1;                                                                                       // 355
    if (typeof args[last] === 'function') {                                                                           // 356
      callback = args[last] = wrapCallbackForParsingServerErrors(self, options.validationContext, callback);          // 357
    }                                                                                                                 // 358
  }                                                                                                                   // 359
                                                                                                                      // 360
  if (options.validate === false) {                                                                                   // 361
    return args;                                                                                                      // 362
  }                                                                                                                   // 363
                                                                                                                      // 364
  // If _id has already been added, remove it temporarily if it's                                                     // 365
  // not explicitly defined in the schema.                                                                            // 366
  var id;                                                                                                             // 367
  if (Meteor.isServer && doc._id && !schema.allowsKey("_id")) {                                                       // 368
    id = doc._id;                                                                                                     // 369
    delete doc._id;                                                                                                   // 370
  }                                                                                                                   // 371
                                                                                                                      // 372
  function doClean(docToClean, getAutoValues, filter, autoConvert, removeEmptyStrings) {                              // 373
    // Clean the doc/modifier in place (removes any virtual fields added                                              // 374
    // by the deny transform, too)                                                                                    // 375
    schema.clean(docToClean, {                                                                                        // 376
      filter: filter,                                                                                                 // 377
      autoConvert: autoConvert,                                                                                       // 378
      getAutoValues: getAutoValues,                                                                                   // 379
      isModifier: (type !== "insert"),                                                                                // 380
      removeEmptyStrings: removeEmptyStrings,                                                                         // 381
      extendAutoValueContext: {                                                                                       // 382
        isInsert: (type === "insert"),                                                                                // 383
        isUpdate: (type === "update" && options.upsert !== true),                                                     // 384
        isUpsert: isUpsert,                                                                                           // 385
        userId: userId,                                                                                               // 386
        isFromTrustedCode: isFromTrustedCode                                                                          // 387
      }                                                                                                               // 388
    });                                                                                                               // 389
  }                                                                                                                   // 390
                                                                                                                      // 391
  // Preliminary cleaning on both client and server. On the server, automatic                                         // 392
  // values will also be set at this point.                                                                           // 393
  doClean(doc, (Meteor.isServer && !skipAutoValue), options.filter !== false, options.autoConvert !== false, options.removeEmptyStrings !== false);
                                                                                                                      // 395
  // We clone before validating because in some cases we need to adjust the                                           // 396
  // object a bit before validating it. If we adjusted `doc` itself, our                                              // 397
  // changes would persist into the database.                                                                         // 398
  var docToValidate = {};                                                                                             // 399
  for (var prop in doc) {                                                                                             // 400
    // We omit prototype properties when cloning because they will not be valid                                       // 401
    // and mongo omits them when saving to the database anyway.                                                       // 402
    if (doc.hasOwnProperty(prop)) {                                                                                   // 403
      docToValidate[prop] = doc[prop];                                                                                // 404
    }                                                                                                                 // 405
  }                                                                                                                   // 406
                                                                                                                      // 407
  // On the server, upserts are possible; SimpleSchema handles upserts pretty                                         // 408
  // well by default, but it will not know about the fields in the selector,                                          // 409
  // which are also stored in the database if an insert is performed. So we                                           // 410
  // will allow these fields to be considered for validation by adding them                                           // 411
  // to the $set in the modifier. This is no doubt prone to errors, but there                                         // 412
  // probably isn't any better way right now.                                                                         // 413
  if (Meteor.isServer && isUpsert && _.isObject(selector)) {                                                          // 414
    var set = docToValidate.$set || {};                                                                               // 415
    docToValidate.$set = _.clone(selector);                                                                           // 416
    _.extend(docToValidate.$set, set);                                                                                // 417
  }                                                                                                                   // 418
                                                                                                                      // 419
  // Set automatic values for validation on the client.                                                               // 420
  // On the server, we already updated doc with auto values, but on the client,                                       // 421
  // we will add them to docToValidate for validation purposes only.                                                  // 422
  // This is because we want all actual values generated on the server.                                               // 423
  if (Meteor.isClient) {                                                                                              // 424
    doClean(docToValidate, true, false, false, false);                                                                // 425
  }                                                                                                                   // 426
                                                                                                                      // 427
  // Validate doc                                                                                                     // 428
  var ctx = schema.namedContext(options.validationContext);                                                           // 429
  var isValid = ctx.validate(docToValidate, {                                                                         // 430
    modifier: (type === "update" || type === "upsert"),                                                               // 431
    upsert: isUpsert,                                                                                                 // 432
    extendedCustomContext: {                                                                                          // 433
      isInsert: (type === "insert"),                                                                                  // 434
      isUpdate: (type === "update" && options.upsert !== true),                                                       // 435
      isUpsert: isUpsert,                                                                                             // 436
      userId: userId,                                                                                                 // 437
      isFromTrustedCode: isFromTrustedCode                                                                            // 438
    }                                                                                                                 // 439
  });                                                                                                                 // 440
                                                                                                                      // 441
  if (isValid) {                                                                                                      // 442
    // Add the ID back                                                                                                // 443
    if (id) {                                                                                                         // 444
      doc._id = id;                                                                                                   // 445
    }                                                                                                                 // 446
    // Update the args to reflect the cleaned doc                                                                     // 447
    if (type === "insert") {                                                                                          // 448
      args[0] = doc;                                                                                                  // 449
    } else {                                                                                                          // 450
      args[1] = doc;                                                                                                  // 451
    }                                                                                                                 // 452
                                                                                                                      // 453
    // If callback, set invalidKey when we get a mongo unique error                                                   // 454
    if (Meteor.isServer) {                                                                                            // 455
      var last = args.length - 1;                                                                                     // 456
      if (typeof args[last] === 'function') {                                                                         // 457
        args[last] = wrapCallbackForParsingMongoValidationErrors(self, doc, options.validationContext, args[last]);   // 458
      }                                                                                                               // 459
    }                                                                                                                 // 460
    return args;                                                                                                      // 461
  } else {                                                                                                            // 462
    error = getErrorObject(ctx);                                                                                      // 463
    if (callback) {                                                                                                   // 464
      // insert/update/upsert pass `false` when there's an error, so we do that                                       // 465
      callback(error, false);                                                                                         // 466
    } else {                                                                                                          // 467
      throw error;                                                                                                    // 468
    }                                                                                                                 // 469
  }                                                                                                                   // 470
}                                                                                                                     // 471
                                                                                                                      // 472
function getErrorObject(context) {                                                                                    // 473
  var message, invalidKeys = context.invalidKeys();                                                                   // 474
  if (invalidKeys.length) {                                                                                           // 475
    message = context.keyErrorMessage(invalidKeys[0].name);                                                           // 476
  } else {                                                                                                            // 477
    message = "Failed validation";                                                                                    // 478
  }                                                                                                                   // 479
  var error = new Error(message);                                                                                     // 480
  error.invalidKeys = invalidKeys;                                                                                    // 481
  // If on the server, we add a sanitized error, too, in case we're                                                   // 482
  // called from a method.                                                                                            // 483
  if (Meteor.isServer) {                                                                                              // 484
    error.sanitizedError = new Meteor.Error(400, message);                                                            // 485
  }                                                                                                                   // 486
  return error;                                                                                                       // 487
}                                                                                                                     // 488
                                                                                                                      // 489
function addUniqueError(context, errorMessage) {                                                                      // 490
  var name = errorMessage.split('c2_')[1].split(' ')[0];                                                              // 491
  var val = errorMessage.split('dup key:')[1].split('"')[1];                                                          // 492
  context.addInvalidKeys([{                                                                                           // 493
    name: name,                                                                                                       // 494
    type: 'notUnique',                                                                                                // 495
    value: val                                                                                                        // 496
  }]);                                                                                                                // 497
}                                                                                                                     // 498
                                                                                                                      // 499
function wrapCallbackForParsingMongoValidationErrors(col, doc, vCtx, cb) {                                            // 500
  return function wrappedCallbackForParsingMongoValidationErrors(error) {                                             // 501
    if (error && ((error.name === "MongoError" && error.code === 11001) || error.message.indexOf('MongoError: E11000' !== -1)) && error.message.indexOf('c2_') !== -1) {
      var context = col.simpleSchema().namedContext(vCtx);                                                            // 503
      addUniqueError(context, error.message);                                                                         // 504
      arguments[0] = getErrorObject(context);                                                                         // 505
    }                                                                                                                 // 506
    return cb.apply(this, arguments);                                                                                 // 507
  };                                                                                                                  // 508
}                                                                                                                     // 509
                                                                                                                      // 510
function wrapCallbackForParsingServerErrors(col, vCtx, cb) {                                                          // 511
  return function wrappedCallbackForParsingServerErrors(error) {                                                      // 512
    // Handle our own validation errors                                                                               // 513
    var context = col.simpleSchema().namedContext(vCtx);                                                              // 514
    if (error instanceof Meteor.Error && error.error === 400 && error.reason === "INVALID" && typeof error.details === "string") {
      var invalidKeysFromServer = EJSON.parse(error.details);                                                         // 516
      context.addInvalidKeys(invalidKeysFromServer);                                                                  // 517
      arguments[0] = getErrorObject(context);                                                                         // 518
    }                                                                                                                 // 519
    // Handle Mongo unique index errors, which are forwarded to the client as 409 errors                              // 520
    else if (error instanceof Meteor.Error && error.error === 409 && error.reason && error.reason.indexOf('E11000') !== -1 && error.reason.indexOf('c2_') !== -1) {
      addUniqueError(context, error.reason);                                                                          // 522
      arguments[0] = getErrorObject(context);                                                                         // 523
    }                                                                                                                 // 524
    return cb.apply(this, arguments);                                                                                 // 525
  };                                                                                                                  // 526
}                                                                                                                     // 527
                                                                                                                      // 528
// Meteor.Collection2 is deprecated                                                                                   // 529
Meteor.Collection2 = function () {                                                                                    // 530
  throw new Error("Collection2: Doing `new Meteor.Collection2` no longer works. Just use a normal `new Meteor.Collection` call.");
};                                                                                                                    // 532
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.collection2 = {};

})();

//# sourceMappingURL=collection2.js.map
