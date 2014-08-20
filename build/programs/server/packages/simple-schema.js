(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Deps = Package.deps.Deps;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;

/* Package-scope variables */
var SimpleSchema, MongoObject, Utility, S, doValidation1, doValidation2, SimpleSchemaValidationContext;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/simple-schema/mongo-object.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*                                                                                                                     // 1
 * @constructor                                                                                                        // 2
 * @param {Object} objOrModifier                                                                                       // 3
 * @param {string[]} blackBoxKeys - A list of the names of keys that shouldn't be traversed                            // 4
 * @returns {undefined}                                                                                                // 5
 *                                                                                                                     // 6
 * Creates a new MongoObject instance. The object passed as the first argument                                         // 7
 * will be modified in place by calls to instance methods. Also, immediately                                           // 8
 * upon creation of the instance, the object will have any `undefined` keys                                            // 9
 * removed recursively.                                                                                                // 10
 */                                                                                                                    // 11
MongoObject = function(objOrModifier, blackBoxKeys) {                                                                  // 12
  var self = this;                                                                                                     // 13
  self._obj = objOrModifier;                                                                                           // 14
  self._affectedKeys = {};                                                                                             // 15
  self._genericAffectedKeys = {};                                                                                      // 16
  self._parentPositions = [];                                                                                          // 17
  self._positionsInsideArrays = [];                                                                                    // 18
  self._objectPositions = [];                                                                                          // 19
                                                                                                                       // 20
  function parseObj(val, currentPosition, affectedKey, operator, adjusted, isWithinArray) {                            // 21
                                                                                                                       // 22
    // Adjust for first-level modifier operators                                                                       // 23
    if (!operator && affectedKey && affectedKey.substring(0, 1) === "$") {                                             // 24
      operator = affectedKey;                                                                                          // 25
      affectedKey = null;                                                                                              // 26
    }                                                                                                                  // 27
                                                                                                                       // 28
    var affectedKeyIsBlackBox = false;                                                                                 // 29
    var affectedKeyGeneric;                                                                                            // 30
    var stop = false;                                                                                                  // 31
    if (affectedKey) {                                                                                                 // 32
                                                                                                                       // 33
      // Adjust for $push and $addToSet and $pull and $pop                                                             // 34
      if (!adjusted) {                                                                                                 // 35
        if (operator === "$push" || operator === "$addToSet" || operator === "$pop") {                                 // 36
          // Adjust for $each                                                                                          // 37
          // We can simply jump forward and pretend like the $each array                                               // 38
          // is the array for the field. This has the added benefit of                                                 // 39
          // skipping past any $slice, which we also don't care about.                                                 // 40
          if (isBasicObject(val) && "$each" in val) {                                                                  // 41
            val = val.$each;                                                                                           // 42
            currentPosition = currentPosition + "[$each]";                                                             // 43
          } else {                                                                                                     // 44
            affectedKey = affectedKey + ".0";                                                                          // 45
          }                                                                                                            // 46
          adjusted = true;                                                                                             // 47
        } else if (operator === "$pull") {                                                                             // 48
          affectedKey = affectedKey + ".0";                                                                            // 49
          if (isBasicObject(val)) {                                                                                    // 50
            stop = true;                                                                                               // 51
          }                                                                                                            // 52
          adjusted = true;                                                                                             // 53
        }                                                                                                              // 54
      }                                                                                                                // 55
                                                                                                                       // 56
      // Make generic key                                                                                              // 57
      affectedKeyGeneric = makeGeneric(affectedKey);                                                                   // 58
                                                                                                                       // 59
      // Determine whether affected key should be treated as a black box                                               // 60
      affectedKeyIsBlackBox = _.contains(blackBoxKeys, affectedKeyGeneric);                                            // 61
                                                                                                                       // 62
      // Mark that this position affects this generic and non-generic key                                              // 63
      if (currentPosition) {                                                                                           // 64
        self._affectedKeys[currentPosition] = affectedKey;                                                             // 65
        self._genericAffectedKeys[currentPosition] = affectedKeyGeneric;                                               // 66
                                                                                                                       // 67
        // If we're within an array, mark this position so we can omit it from flat docs                               // 68
        isWithinArray && self._positionsInsideArrays.push(currentPosition);                                            // 69
      }                                                                                                                // 70
    }                                                                                                                  // 71
                                                                                                                       // 72
    if (stop)                                                                                                          // 73
      return;                                                                                                          // 74
                                                                                                                       // 75
    // Loop through arrays                                                                                             // 76
    if (_.isArray(val) && !_.isEmpty(val)) {                                                                           // 77
      if (currentPosition) {                                                                                           // 78
        // Mark positions with arrays that should be ignored when we want endpoints only                               // 79
        self._parentPositions.push(currentPosition);                                                                   // 80
      }                                                                                                                // 81
                                                                                                                       // 82
      // Loop                                                                                                          // 83
      _.each(val, function(v, i) {                                                                                     // 84
        parseObj(v, (currentPosition ? currentPosition + "[" + i + "]" : i), affectedKey + '.' + i, operator, adjusted, true);
      });                                                                                                              // 86
    }                                                                                                                  // 87
                                                                                                                       // 88
    // Loop through object keys, only for basic objects,                                                               // 89
    // but always for the passed-in object, even if it                                                                 // 90
    // is a custom object.                                                                                             // 91
    else if ((isBasicObject(val) && !affectedKeyIsBlackBox) || !currentPosition) {                                     // 92
      if (currentPosition && !_.isEmpty(val)) {                                                                        // 93
        // Mark positions with objects that should be ignored when we want endpoints only                              // 94
        self._parentPositions.push(currentPosition);                                                                   // 95
        // Mark positions with objects that should be left out of flat docs.                                           // 96
        self._objectPositions.push(currentPosition);                                                                   // 97
      }                                                                                                                // 98
      // Loop                                                                                                          // 99
      _.each(val, function(v, k) {                                                                                     // 100
        if (v === void 0) {                                                                                            // 101
          delete val[k];                                                                                               // 102
        } else if (k !== "$slice") {                                                                                   // 103
          parseObj(v, (currentPosition ? currentPosition + "[" + k + "]" : k), appendAffectedKey(affectedKey, k), operator, adjusted, isWithinArray);
        }                                                                                                              // 105
      });                                                                                                              // 106
    }                                                                                                                  // 107
                                                                                                                       // 108
  }                                                                                                                    // 109
  parseObj(self._obj);                                                                                                 // 110
                                                                                                                       // 111
  function reParseObj() {                                                                                              // 112
    self._affectedKeys = {};                                                                                           // 113
    self._genericAffectedKeys = {};                                                                                    // 114
    self._parentPositions = [];                                                                                        // 115
    self._positionsInsideArrays = [];                                                                                  // 116
    self._objectPositions = [];                                                                                        // 117
    parseObj(self._obj);                                                                                               // 118
  }                                                                                                                    // 119
                                                                                                                       // 120
  /**                                                                                                                  // 121
   * @method MongoObject.forEachNode                                                                                   // 122
   * @param {Function} func                                                                                            // 123
   * @param {Object} [options]                                                                                         // 124
   * @param {Boolean} [options.endPointsOnly=true] - Only call function for endpoints and not for nodes that contain other nodes
   * @returns {undefined}                                                                                              // 126
   *                                                                                                                   // 127
   * Runs a function for each endpoint node in the object tree, including all items in every array.                    // 128
   * The function arguments are                                                                                        // 129
   * (1) the value at this node                                                                                        // 130
   * (2) a string representing the node position                                                                       // 131
   * (3) the representation of what would be changed in mongo, using mongo dot notation                                // 132
   * (4) the generic equivalent of argument 3, with "$" instead of numeric pieces                                      // 133
   */                                                                                                                  // 134
  self.forEachNode = function(func, options) {                                                                         // 135
    if (typeof func !== "function")                                                                                    // 136
      throw new Error("filter requires a loop function");                                                              // 137
                                                                                                                       // 138
    options = _.extend({                                                                                               // 139
      endPointsOnly: true                                                                                              // 140
    }, options);                                                                                                       // 141
                                                                                                                       // 142
    var updatedValues = {};                                                                                            // 143
    _.each(self._affectedKeys, function(affectedKey, position) {                                                       // 144
      if (options.endPointsOnly && _.contains(self._parentPositions, position))                                        // 145
        return; //only endpoints                                                                                       // 146
      func.call({                                                                                                      // 147
        value: self.getValueForPosition(position),                                                                     // 148
        operator: extractOp(position),                                                                                 // 149
        position: position,                                                                                            // 150
        key: affectedKey,                                                                                              // 151
        genericKey: self._genericAffectedKeys[position],                                                               // 152
        updateValue: function(newVal) {                                                                                // 153
          updatedValues[position] = newVal;                                                                            // 154
        },                                                                                                             // 155
        remove: function() {                                                                                           // 156
          updatedValues[position] = void 0;                                                                            // 157
        }                                                                                                              // 158
      });                                                                                                              // 159
    });                                                                                                                // 160
                                                                                                                       // 161
    // Actually update/remove values as instructed                                                                     // 162
    _.each(updatedValues, function(newVal, position) {                                                                 // 163
      self.setValueForPosition(position, newVal);                                                                      // 164
    });                                                                                                                // 165
                                                                                                                       // 166
  };                                                                                                                   // 167
                                                                                                                       // 168
  self.getValueForPosition = function(position) {                                                                      // 169
    var subkey, subkeys = position.split("["), current = self._obj;                                                    // 170
    for (var i = 0, ln = subkeys.length; i < ln; i++) {                                                                // 171
      subkey = subkeys[i];                                                                                             // 172
      // If the subkey ends in "]", remove the ending                                                                  // 173
      if (subkey.slice(-1) === "]") {                                                                                  // 174
        subkey = subkey.slice(0, -1);                                                                                  // 175
      }                                                                                                                // 176
      current = current[subkey];                                                                                       // 177
      if (!_.isArray(current) && !isBasicObject(current) && i < ln - 1) {                                              // 178
        return;                                                                                                        // 179
      }                                                                                                                // 180
    }                                                                                                                  // 181
    return current;                                                                                                    // 182
  };                                                                                                                   // 183
                                                                                                                       // 184
  /**                                                                                                                  // 185
   * @method MongoObject.prototype.setValueForPosition                                                                 // 186
   * @param {String} position                                                                                          // 187
   * @param {Any} value                                                                                                // 188
   * @returns {undefined}                                                                                              // 189
   */                                                                                                                  // 190
  self.setValueForPosition = function(position, value) {                                                               // 191
    var nextPiece, subkey, subkeys = position.split("["), current = self._obj;                                         // 192
                                                                                                                       // 193
    for (var i = 0, ln = subkeys.length; i < ln; i++) {                                                                // 194
      subkey = subkeys[i];                                                                                             // 195
      // If the subkey ends in "]", remove the ending                                                                  // 196
      if (subkey.slice(-1) === "]") {                                                                                  // 197
        subkey = subkey.slice(0, -1);                                                                                  // 198
      }                                                                                                                // 199
      // If we've reached the key in the object tree that needs setting or                                             // 200
      // deleting, do it.                                                                                              // 201
      if (i === ln - 1) {                                                                                              // 202
        current[subkey] = value;                                                                                       // 203
        //if value is undefined, delete the property                                                                   // 204
        if (value === void 0)                                                                                          // 205
          delete current[subkey];                                                                                      // 206
      }                                                                                                                // 207
      // Otherwise attempt to keep moving deeper into the object.                                                      // 208
      else {                                                                                                           // 209
        // If we're setting (as opposed to deleting) a key and we hit a place                                          // 210
        // in the ancestor chain where the keys are not yet created, create them.                                      // 211
        if (current[subkey] === void 0 && value !== void 0) {                                                          // 212
          //see if the next piece is a number                                                                          // 213
          nextPiece = subkeys[i + 1];                                                                                  // 214
          nextPiece = parseInt(nextPiece, 10);                                                                         // 215
          current[subkey] = isNaN(nextPiece) ? {} : [];                                                                // 216
        }                                                                                                              // 217
                                                                                                                       // 218
        // Move deeper into the object                                                                                 // 219
        current = current[subkey];                                                                                     // 220
                                                                                                                       // 221
        // If we can go no further, then quit                                                                          // 222
        if (!_.isArray(current) && !isBasicObject(current) && i < ln - 1) {                                            // 223
          return;                                                                                                      // 224
        }                                                                                                              // 225
      }                                                                                                                // 226
    }                                                                                                                  // 227
                                                                                                                       // 228
    reParseObj();                                                                                                      // 229
  };                                                                                                                   // 230
                                                                                                                       // 231
  /**                                                                                                                  // 232
   * @method MongoObject.prototype.removeValueForPosition                                                              // 233
   * @param {String} position                                                                                          // 234
   * @returns {undefined}                                                                                              // 235
   */                                                                                                                  // 236
  self.removeValueForPosition = function(position) {                                                                   // 237
    self.setValueForPosition(position, void 0);                                                                        // 238
  };                                                                                                                   // 239
                                                                                                                       // 240
  /**                                                                                                                  // 241
   * @method MongoObject.prototype.getKeyForPosition                                                                   // 242
   * @param {String} position                                                                                          // 243
   * @returns {undefined}                                                                                              // 244
   */                                                                                                                  // 245
  self.getKeyForPosition = function(position) {                                                                        // 246
    return self._affectedKeys[position];                                                                               // 247
  };                                                                                                                   // 248
                                                                                                                       // 249
  /**                                                                                                                  // 250
   * @method MongoObject.prototype.getGenericKeyForPosition                                                            // 251
   * @param {String} position                                                                                          // 252
   * @returns {undefined}                                                                                              // 253
   */                                                                                                                  // 254
  self.getGenericKeyForPosition = function(position) {                                                                 // 255
    return self._genericAffectedKeys[position];                                                                        // 256
  };                                                                                                                   // 257
                                                                                                                       // 258
  /**                                                                                                                  // 259
   * @method MongoObject.getInfoForKey                                                                                 // 260
   * @param {String} key - Non-generic key                                                                             // 261
   * @returns {undefined|Object}                                                                                       // 262
   *                                                                                                                   // 263
   * Returns the value and operator of the requested non-generic key.                                                  // 264
   * Example: {value: 1, operator: "$pull"}                                                                            // 265
   */                                                                                                                  // 266
  self.getInfoForKey = function(key) {                                                                                 // 267
    // Get the info                                                                                                    // 268
    var position = self.getPositionForKey(key);                                                                        // 269
    if (position) {                                                                                                    // 270
      return {                                                                                                         // 271
        value: self.getValueForPosition(position),                                                                     // 272
        operator: extractOp(position)                                                                                  // 273
      };                                                                                                               // 274
    }                                                                                                                  // 275
                                                                                                                       // 276
    // If we haven't returned yet, check to see if there is an array value                                             // 277
    // corresponding to this key                                                                                       // 278
    // We find the first item within the array, strip the last piece off the                                           // 279
    // position string, and then return whatever is at that new position in                                            // 280
    // the original object.                                                                                            // 281
    var positions = self.getPositionsForGenericKey(key + ".$"), p, v;                                                  // 282
    for (var i = 0, ln = positions.length; i < ln; i++) {                                                              // 283
      p = positions[i];                                                                                                // 284
      v = self.getValueForPosition(p) || self.getValueForPosition(p.slice(0, p.lastIndexOf("[")));                     // 285
      if (v) {                                                                                                         // 286
        return {                                                                                                       // 287
          value: v,                                                                                                    // 288
          operator: extractOp(p)                                                                                       // 289
        };                                                                                                             // 290
      }                                                                                                                // 291
    }                                                                                                                  // 292
  };                                                                                                                   // 293
                                                                                                                       // 294
  /**                                                                                                                  // 295
   * @method MongoObject.getPositionForKey                                                                             // 296
   * @param {String} key - Non-generic key                                                                             // 297
   * @returns {undefined|String} Position string                                                                       // 298
   *                                                                                                                   // 299
   * Returns the position string for the place in the object that                                                      // 300
   * affects the requested non-generic key.                                                                            // 301
   * Example: 'foo[bar][0]'                                                                                            // 302
   */                                                                                                                  // 303
  self.getPositionForKey = function(key) {                                                                             // 304
    // Get the info                                                                                                    // 305
    for (var position in self._affectedKeys) {                                                                         // 306
      if (self._affectedKeys.hasOwnProperty(position)) {                                                               // 307
        if (self._affectedKeys[position] === key) {                                                                    // 308
          // We return the first one we find. While it's                                                               // 309
          // possible that multiple update operators could                                                             // 310
          // affect the same non-generic key, we'll assume that's not the case.                                        // 311
          return position;                                                                                             // 312
        }                                                                                                              // 313
      }                                                                                                                // 314
    }                                                                                                                  // 315
                                                                                                                       // 316
    // If we haven't returned yet, we need to check for affected keys                                                  // 317
  };                                                                                                                   // 318
                                                                                                                       // 319
  /**                                                                                                                  // 320
   * @method MongoObject.getPositionsForGenericKey                                                                     // 321
   * @param {String} key - Generic key                                                                                 // 322
   * @returns {String[]} Array of position strings                                                                     // 323
   *                                                                                                                   // 324
   * Returns an array of position strings for the places in the object that                                            // 325
   * affect the requested generic key.                                                                                 // 326
   * Example: ['foo[bar][0]']                                                                                          // 327
   */                                                                                                                  // 328
  self.getPositionsForGenericKey = function(key) {                                                                     // 329
    // Get the info                                                                                                    // 330
    var list = [];                                                                                                     // 331
    for (var position in self._genericAffectedKeys) {                                                                  // 332
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 333
        if (self._genericAffectedKeys[position] === key) {                                                             // 334
          list.push(position);                                                                                         // 335
        }                                                                                                              // 336
      }                                                                                                                // 337
    }                                                                                                                  // 338
                                                                                                                       // 339
    return list;                                                                                                       // 340
  };                                                                                                                   // 341
                                                                                                                       // 342
  /**                                                                                                                  // 343
   * @deprecated Use getInfoForKey                                                                                     // 344
   * @method MongoObject.getValueForKey                                                                                // 345
   * @param {String} key - Non-generic key                                                                             // 346
   * @returns {undefined|Any}                                                                                          // 347
   *                                                                                                                   // 348
   * Returns the value of the requested non-generic key                                                                // 349
   */                                                                                                                  // 350
  self.getValueForKey = function(key) {                                                                                // 351
    var position = self.getPositionForKey(key);                                                                        // 352
    if (position) {                                                                                                    // 353
      return self.getValueForPosition(position);                                                                       // 354
    }                                                                                                                  // 355
  };                                                                                                                   // 356
                                                                                                                       // 357
  /**                                                                                                                  // 358
   * @method MongoObject.prototype.addKey                                                                              // 359
   * @param {String} key - Key to set                                                                                  // 360
   * @param {Any} val - Value to give this key                                                                         // 361
   * @param {String} op - Operator under which to set it, or `null` for a non-modifier object                          // 362
   * @returns {undefined}                                                                                              // 363
   *                                                                                                                   // 364
   * Adds `key` with value `val` under operator `op` to the source object.                                             // 365
   */                                                                                                                  // 366
  self.addKey = function(key, val, op) {                                                                               // 367
    var position = op ? op + "[" + key + "]" : MongoObject._keyToPosition(key);                                        // 368
    self.setValueForPosition(position, val);                                                                           // 369
  };                                                                                                                   // 370
                                                                                                                       // 371
  /**                                                                                                                  // 372
   * @method MongoObject.prototype.removeGenericKeys                                                                   // 373
   * @param {String[]} keys                                                                                            // 374
   * @returns {undefined}                                                                                              // 375
   *                                                                                                                   // 376
   * Removes anything that affects any of the generic keys in the list                                                 // 377
   */                                                                                                                  // 378
  self.removeGenericKeys = function(keys) {                                                                            // 379
    for (var position in self._genericAffectedKeys) {                                                                  // 380
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 381
        if (_.contains(keys, self._genericAffectedKeys[position])) {                                                   // 382
          self.removeValueForPosition(position);                                                                       // 383
        }                                                                                                              // 384
      }                                                                                                                // 385
    }                                                                                                                  // 386
  };                                                                                                                   // 387
                                                                                                                       // 388
  /**                                                                                                                  // 389
   * @method MongoObject.removeGenericKey                                                                              // 390
   * @param {String} key                                                                                               // 391
   * @returns {undefined}                                                                                              // 392
   *                                                                                                                   // 393
   * Removes anything that affects the requested generic key                                                           // 394
   */                                                                                                                  // 395
  self.removeGenericKey = function(key) {                                                                              // 396
    for (var position in self._genericAffectedKeys) {                                                                  // 397
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 398
        if (self._genericAffectedKeys[position] === key) {                                                             // 399
          self.removeValueForPosition(position);                                                                       // 400
        }                                                                                                              // 401
      }                                                                                                                // 402
    }                                                                                                                  // 403
  };                                                                                                                   // 404
                                                                                                                       // 405
  /**                                                                                                                  // 406
   * @method MongoObject.removeKey                                                                                     // 407
   * @param {String} key                                                                                               // 408
   * @returns {undefined}                                                                                              // 409
   *                                                                                                                   // 410
   * Removes anything that affects the requested non-generic key                                                       // 411
   */                                                                                                                  // 412
  self.removeKey = function(key) {                                                                                     // 413
    // We don't use getPositionForKey here because we want to be sure to                                               // 414
    // remove for all positions if there are multiple.                                                                 // 415
    for (var position in self._affectedKeys) {                                                                         // 416
      if (self._affectedKeys.hasOwnProperty(position)) {                                                               // 417
        if (self._affectedKeys[position] === key) {                                                                    // 418
          self.removeValueForPosition(position);                                                                       // 419
        }                                                                                                              // 420
      }                                                                                                                // 421
    }                                                                                                                  // 422
  };                                                                                                                   // 423
                                                                                                                       // 424
  /**                                                                                                                  // 425
   * @method MongoObject.removeKeys                                                                                    // 426
   * @param {String[]} keys                                                                                            // 427
   * @returns {undefined}                                                                                              // 428
   *                                                                                                                   // 429
   * Removes anything that affects any of the non-generic keys in the list                                             // 430
   */                                                                                                                  // 431
  self.removeKeys = function(keys) {                                                                                   // 432
    for (var i = 0, ln = keys.length; i < ln; i++) {                                                                   // 433
      self.removeKey(keys[i]);                                                                                         // 434
    }                                                                                                                  // 435
  };                                                                                                                   // 436
                                                                                                                       // 437
  /**                                                                                                                  // 438
   * @method MongoObject.filterGenericKeys                                                                             // 439
   * @param {Function} test - Test function                                                                            // 440
   * @returns {undefined}                                                                                              // 441
   *                                                                                                                   // 442
   * Passes all affected keys to a test function, which                                                                // 443
   * should return false to remove whatever is affecting that key                                                      // 444
   */                                                                                                                  // 445
  self.filterGenericKeys = function(test) {                                                                            // 446
    var gk, checkedKeys = [], keysToRemove = [];                                                                       // 447
    for (var position in self._genericAffectedKeys) {                                                                  // 448
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 449
        gk = self._genericAffectedKeys[position];                                                                      // 450
        if (!_.contains(checkedKeys, gk)) {                                                                            // 451
          checkedKeys.push(gk);                                                                                        // 452
          if (gk && !test(gk)) {                                                                                       // 453
            keysToRemove.push(gk);                                                                                     // 454
          }                                                                                                            // 455
        }                                                                                                              // 456
      }                                                                                                                // 457
    }                                                                                                                  // 458
                                                                                                                       // 459
    _.each(keysToRemove, function(key) {                                                                               // 460
      self.removeGenericKey(key);                                                                                      // 461
    });                                                                                                                // 462
  };                                                                                                                   // 463
                                                                                                                       // 464
  /**                                                                                                                  // 465
   * @method MongoObject.setValueForKey                                                                                // 466
   * @param {String} key                                                                                               // 467
   * @param {Any} val                                                                                                  // 468
   * @returns {undefined}                                                                                              // 469
   *                                                                                                                   // 470
   * Sets the value for every place in the object that affects                                                         // 471
   * the requested non-generic key                                                                                     // 472
   */                                                                                                                  // 473
  self.setValueForKey = function(key, val) {                                                                           // 474
    // We don't use getPositionForKey here because we want to be sure to                                               // 475
    // set the value for all positions if there are multiple.                                                          // 476
    for (var position in self._affectedKeys) {                                                                         // 477
      if (self._affectedKeys.hasOwnProperty(position)) {                                                               // 478
        if (self._affectedKeys[position] === key) {                                                                    // 479
          self.setValueForPosition(position, val);                                                                     // 480
        }                                                                                                              // 481
      }                                                                                                                // 482
    }                                                                                                                  // 483
  };                                                                                                                   // 484
                                                                                                                       // 485
  /**                                                                                                                  // 486
   * @method MongoObject.setValueForGenericKey                                                                         // 487
   * @param {String} key                                                                                               // 488
   * @param {Any} val                                                                                                  // 489
   * @returns {undefined}                                                                                              // 490
   *                                                                                                                   // 491
   * Sets the value for every place in the object that affects                                                         // 492
   * the requested generic key                                                                                         // 493
   */                                                                                                                  // 494
  self.setValueForGenericKey = function(key, val) {                                                                    // 495
    // We don't use getPositionForKey here because we want to be sure to                                               // 496
    // set the value for all positions if there are multiple.                                                          // 497
    for (var position in self._genericAffectedKeys) {                                                                  // 498
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 499
        if (self._genericAffectedKeys[position] === key) {                                                             // 500
          self.setValueForPosition(position, val);                                                                     // 501
        }                                                                                                              // 502
      }                                                                                                                // 503
    }                                                                                                                  // 504
  };                                                                                                                   // 505
                                                                                                                       // 506
  /**                                                                                                                  // 507
   * @method MongoObject.getObject                                                                                     // 508
   * @returns {Object}                                                                                                 // 509
   *                                                                                                                   // 510
   * Get the source object, potentially modified by other method calls on this                                         // 511
   * MongoObject instance.                                                                                             // 512
   */                                                                                                                  // 513
  self.getObject = function() {                                                                                        // 514
    return self._obj;                                                                                                  // 515
  };                                                                                                                   // 516
                                                                                                                       // 517
  /**                                                                                                                  // 518
   * @method MongoObject.getFlatObject                                                                                 // 519
   * @returns {Object}                                                                                                 // 520
   *                                                                                                                   // 521
   * Gets a flat object based on the MongoObject instance.                                                             // 522
   * In a flat object, the key is the name of the non-generic affectedKey,                                             // 523
   * with mongo dot notation if necessary, and the value is the value for                                              // 524
   * that key.                                                                                                         // 525
   *                                                                                                                   // 526
   * With `keepArrays: true`, we don't flatten within arrays. Currently                                                // 527
   * MongoDB does not see a key such as `a.0.b` and automatically assume                                               // 528
   * an array. Instead it would create an object with key "0" if there                                                 // 529
   * wasn't already an array saved as the value of `a`, which is rarely                                                // 530
   * if ever what we actually want. To avoid this confusion, we                                                        // 531
   * set entire arrays.                                                                                                // 532
   */                                                                                                                  // 533
  self.getFlatObject = function(options) {                                                                             // 534
    options = options || {};                                                                                           // 535
    var newObj = {};                                                                                                   // 536
    _.each(self._affectedKeys, function(affectedKey, position) {                                                       // 537
      if (typeof affectedKey === "string" &&                                                                           // 538
        (options.keepArrays === true && !_.contains(self._positionsInsideArrays, position) && !_.contains(self._objectPositions, position)) ||
        (!options.keepArrays && !_.contains(self._parentPositions, position))                                          // 540
        ) {                                                                                                            // 541
        newObj[affectedKey] = self.getValueForPosition(position);                                                      // 542
      }                                                                                                                // 543
    });                                                                                                                // 544
    return newObj;                                                                                                     // 545
  };                                                                                                                   // 546
                                                                                                                       // 547
  /**                                                                                                                  // 548
   * @method MongoObject.affectsKey                                                                                    // 549
   * @param {String} key                                                                                               // 550
   * @returns {Object}                                                                                                 // 551
   *                                                                                                                   // 552
   * Returns true if the non-generic key is affected by this object                                                    // 553
   */                                                                                                                  // 554
  self.affectsKey = function(key) {                                                                                    // 555
    return !!self.getPositionForKey(key);                                                                              // 556
  };                                                                                                                   // 557
                                                                                                                       // 558
  /**                                                                                                                  // 559
   * @method MongoObject.affectsGenericKey                                                                             // 560
   * @param {String} key                                                                                               // 561
   * @returns {Object}                                                                                                 // 562
   *                                                                                                                   // 563
   * Returns true if the generic key is affected by this object                                                        // 564
   */                                                                                                                  // 565
  self.affectsGenericKey = function(key) {                                                                             // 566
    for (var position in self._genericAffectedKeys) {                                                                  // 567
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 568
        if (self._genericAffectedKeys[position] === key) {                                                             // 569
          return true;                                                                                                 // 570
        }                                                                                                              // 571
      }                                                                                                                // 572
    }                                                                                                                  // 573
    return false;                                                                                                      // 574
  };                                                                                                                   // 575
                                                                                                                       // 576
  /**                                                                                                                  // 577
   * @method MongoObject.affectsGenericKeyImplicit                                                                     // 578
   * @param {String} key                                                                                               // 579
   * @returns {Object}                                                                                                 // 580
   *                                                                                                                   // 581
   * Like affectsGenericKey, but will return true if a child key is affected                                           // 582
   */                                                                                                                  // 583
  self.affectsGenericKeyImplicit = function(key) {                                                                     // 584
    for (var position in self._genericAffectedKeys) {                                                                  // 585
      if (self._genericAffectedKeys.hasOwnProperty(position)) {                                                        // 586
        var affectedKey = self._genericAffectedKeys[position];                                                         // 587
                                                                                                                       // 588
        // If the affected key is the test key                                                                         // 589
        if (affectedKey === key) {                                                                                     // 590
          return true;                                                                                                 // 591
        }                                                                                                              // 592
                                                                                                                       // 593
        // If the affected key implies the test key because the affected key                                           // 594
        // starts with the test key followed by a period                                                               // 595
        if (affectedKey.substring(0, key.length + 1) === key + ".") {                                                  // 596
          return true;                                                                                                 // 597
        }                                                                                                              // 598
                                                                                                                       // 599
        // If the affected key implies the test key because the affected key                                           // 600
        // starts with the test key and the test key ends with ".$"                                                    // 601
        var lastTwo = key.slice(-2);                                                                                   // 602
        if (lastTwo === ".$" && key.slice(0, -2) === affectedKey) {                                                    // 603
          return true;                                                                                                 // 604
        }                                                                                                              // 605
      }                                                                                                                // 606
    }                                                                                                                  // 607
    return false;                                                                                                      // 608
  };                                                                                                                   // 609
};                                                                                                                     // 610
                                                                                                                       // 611
/** Takes a string representation of an object key and its value                                                       // 612
 *  and updates "obj" to contain that key with that value.                                                             // 613
 *                                                                                                                     // 614
 *  Example keys and results if val is 1:                                                                              // 615
 *    "a" -> {a: 1}                                                                                                    // 616
 *    "a[b]" -> {a: {b: 1}}                                                                                            // 617
 *    "a[b][0]" -> {a: {b: [1]}}                                                                                       // 618
 *    "a[b.0.c]" -> {a: {'b.0.c': 1}}                                                                                  // 619
 */                                                                                                                    // 620
                                                                                                                       // 621
/** Takes a string representation of an object key and its value                                                       // 622
 *  and updates "obj" to contain that key with that value.                                                             // 623
 *                                                                                                                     // 624
 *  Example keys and results if val is 1:                                                                              // 625
 *    "a" -> {a: 1}                                                                                                    // 626
 *    "a[b]" -> {a: {b: 1}}                                                                                            // 627
 *    "a[b][0]" -> {a: {b: [1]}}                                                                                       // 628
 *    "a[b.0.c]" -> {a: {'b.0.c': 1}}                                                                                  // 629
 *                                                                                                                     // 630
 * @param {any} val                                                                                                    // 631
 * @param {String} key                                                                                                 // 632
 * @param {Object} obj                                                                                                 // 633
 * @returns {undefined}                                                                                                // 634
 */                                                                                                                    // 635
MongoObject.expandKey = function(val, key, obj) {                                                                      // 636
  var nextPiece, subkey, subkeys = key.split("["), current = obj;                                                      // 637
  for (var i = 0, ln = subkeys.length; i < ln; i++) {                                                                  // 638
    subkey = subkeys[i];                                                                                               // 639
    if (subkey.slice(-1) === "]") {                                                                                    // 640
      subkey = subkey.slice(0, -1);                                                                                    // 641
    }                                                                                                                  // 642
    if (i === ln - 1) {                                                                                                // 643
      //last iteration; time to set the value; always overwrite                                                        // 644
      current[subkey] = val;                                                                                           // 645
      //if val is undefined, delete the property                                                                       // 646
      if (val === void 0)                                                                                              // 647
        delete current[subkey];                                                                                        // 648
    } else {                                                                                                           // 649
      //see if the next piece is a number                                                                              // 650
      nextPiece = subkeys[i + 1];                                                                                      // 651
      nextPiece = parseInt(nextPiece, 10);                                                                             // 652
      if (!current[subkey]) {                                                                                          // 653
        current[subkey] = isNaN(nextPiece) ? {} : [];                                                                  // 654
      }                                                                                                                // 655
    }                                                                                                                  // 656
    current = current[subkey];                                                                                         // 657
  }                                                                                                                    // 658
};                                                                                                                     // 659
                                                                                                                       // 660
MongoObject._keyToPosition = function keyToPosition(key, wrapAll) {                                                    // 661
  var position = '';                                                                                                   // 662
  _.each(key.split("."), function (piece, i) {                                                                         // 663
    if (i === 0 && !wrapAll) {                                                                                         // 664
      position += piece;                                                                                               // 665
    } else {                                                                                                           // 666
      position += "[" + piece + "]";                                                                                   // 667
    }                                                                                                                  // 668
  });                                                                                                                  // 669
  return position;                                                                                                     // 670
};                                                                                                                     // 671
                                                                                                                       // 672
/**                                                                                                                    // 673
 * @method MongoObject._positionToKey                                                                                  // 674
 * @param {String} position                                                                                            // 675
 * @returns {String} The key that this position in an object would affect.                                             // 676
 *                                                                                                                     // 677
 * This is different from MongoObject.prototype.getKeyForPosition in that                                              // 678
 * this method does not depend on the requested position actually being                                                // 679
 * present in any particular MongoObject.                                                                              // 680
 */                                                                                                                    // 681
MongoObject._positionToKey = function positionToKey(position) {                                                        // 682
  //XXX Probably a better way to do this, but this is                                                                  // 683
  //foolproof for now.                                                                                                 // 684
  var mDoc = new MongoObject({});                                                                                      // 685
  mDoc.setValueForPosition(position, 1); //value doesn't matter                                                        // 686
  var key = mDoc.getKeyForPosition(position);                                                                          // 687
  mDoc = null;                                                                                                         // 688
  return key;                                                                                                          // 689
};                                                                                                                     // 690
                                                                                                                       // 691
var isArray = _.isArray;                                                                                               // 692
                                                                                                                       // 693
var isObject = function(obj) {                                                                                         // 694
  return obj === Object(obj);                                                                                          // 695
};                                                                                                                     // 696
                                                                                                                       // 697
// getPrototypeOf polyfill                                                                                             // 698
if (typeof Object.getPrototypeOf !== "function") {                                                                     // 699
  if (typeof "".__proto__ === "object") {                                                                              // 700
    Object.getPrototypeOf = function(object) {                                                                         // 701
      return object.__proto__;                                                                                         // 702
    };                                                                                                                 // 703
  } else {                                                                                                             // 704
    Object.getPrototypeOf = function(object) {                                                                         // 705
      // May break if the constructor has been tampered with                                                           // 706
      return object.constructor.prototype;                                                                             // 707
    };                                                                                                                 // 708
  }                                                                                                                    // 709
}                                                                                                                      // 710
                                                                                                                       // 711
/* Tests whether "obj" is an Object as opposed to                                                                      // 712
 * something that inherits from Object                                                                                 // 713
 *                                                                                                                     // 714
 * @param {any} obj                                                                                                    // 715
 * @returns {Boolean}                                                                                                  // 716
 */                                                                                                                    // 717
var isBasicObject = function(obj) {                                                                                    // 718
  return isObject(obj) && Object.getPrototypeOf(obj) === Object.prototype;                                             // 719
};                                                                                                                     // 720
                                                                                                                       // 721
/* Takes a specific string that uses mongo-style dot notation                                                          // 722
 * and returns a generic string equivalent. Replaces all numeric                                                       // 723
 * "pieces" with a dollar sign ($).                                                                                    // 724
 *                                                                                                                     // 725
 * @param {type} name                                                                                                  // 726
 * @returns {unresolved}                                                                                               // 727
 */                                                                                                                    // 728
var makeGeneric = function makeGeneric(name) {                                                                         // 729
  if (typeof name !== "string")                                                                                        // 730
    return null;                                                                                                       // 731
  return name.replace(/\.[0-9]+\./g, '.$.').replace(/\.[0-9]+/g, '.$');                                                // 732
};                                                                                                                     // 733
                                                                                                                       // 734
var appendAffectedKey = function appendAffectedKey(affectedKey, key) {                                                 // 735
  if (key === "$each") {                                                                                               // 736
    return affectedKey;                                                                                                // 737
  } else {                                                                                                             // 738
    return (affectedKey ? affectedKey + "." + key : key);                                                              // 739
  }                                                                                                                    // 740
};                                                                                                                     // 741
                                                                                                                       // 742
// Extracts operator piece, if present, from position string                                                           // 743
var extractOp = function extractOp(position) {                                                                         // 744
  var firstPositionPiece = position.slice(0, position.indexOf("["));                                                   // 745
  return (firstPositionPiece.substring(0, 1) === "$") ? firstPositionPiece : null;                                     // 746
};                                                                                                                     // 747
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/simple-schema/simple-schema-utility.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Utility = {                                                                                                            // 1
  appendAffectedKey: function appendAffectedKey(affectedKey, key) {                                                    // 2
    if (key === "$each") {                                                                                             // 3
      return affectedKey;                                                                                              // 4
    } else {                                                                                                           // 5
      return (affectedKey ? affectedKey + "." + key : key);                                                            // 6
    }                                                                                                                  // 7
  },                                                                                                                   // 8
  shouldCheck: function shouldCheck(key) {                                                                             // 9
    if (key === "$pushAll") {                                                                                          // 10
      throw new Error("$pushAll is not supported; use $push + $each");                                                 // 11
    }                                                                                                                  // 12
    return !_.contains(["$pull", "$pullAll", "$pop", "$slice"], key);                                                  // 13
  },                                                                                                                   // 14
  errorObject: function errorObject(errorType, keyName, keyValue, def, ss) {                                           // 15
    return {name: keyName, type: errorType, value: keyValue};                                                          // 16
  },                                                                                                                   // 17
  // Tests whether it's an Object as opposed to something that inherits from Object                                    // 18
  isBasicObject: function isBasicObject(obj) {                                                                         // 19
    return _.isObject(obj) && Object.getPrototypeOf(obj) === Object.prototype;                                         // 20
  },                                                                                                                   // 21
  // The latest Safari returns false for Uint8Array, etc. instanceof Function                                          // 22
  // unlike other browsers.                                                                                            // 23
  safariBugFix: function safariBugFix(type) {                                                                          // 24
    return (typeof Uint8Array !== "undefined" && type === Uint8Array)                                                  // 25
    || (typeof Uint16Array !== "undefined" && type === Uint16Array)                                                    // 26
    || (typeof Uint32Array !== "undefined" && type === Uint32Array)                                                    // 27
    || (typeof Uint8ClampedArray !== "undefined" && type === Uint8ClampedArray);                                       // 28
  },                                                                                                                   // 29
  isNotNullOrUndefined: function isNotNullOrUndefined(val) {                                                           // 30
    return val !== void 0 && val !== null;                                                                             // 31
  },                                                                                                                   // 32
  // Extracts operator piece, if present, from position string                                                         // 33
    extractOp: function extractOp(position) {                                                                          // 34
      var firstPositionPiece = position.slice(0, position.indexOf("["));                                               // 35
      return (firstPositionPiece.substring(0, 1) === "$") ? firstPositionPiece : null;                                 // 36
  },                                                                                                                   // 37
  deleteIfPresent: function deleteIfPresent(obj, key) {                                                                // 38
    if (key in obj) {                                                                                                  // 39
      delete obj[key];                                                                                                 // 40
    }                                                                                                                  // 41
  },                                                                                                                   // 42
  looksLikeModifier: function looksLikeModifier(obj) {                                                                 // 43
    for (var key in obj) {                                                                                             // 44
      if (obj.hasOwnProperty(key) && key.substring(0, 1) === "$") {                                                    // 45
        return true;                                                                                                   // 46
      }                                                                                                                // 47
    }                                                                                                                  // 48
    return false;                                                                                                      // 49
  },                                                                                                                   // 50
  dateToDateString: function dateToDateString(date) {                                                                  // 51
    var m = (date.getUTCMonth() + 1);                                                                                  // 52
    if (m < 10) {                                                                                                      // 53
      m = "0" + m;                                                                                                     // 54
    }                                                                                                                  // 55
    var d = date.getUTCDate();                                                                                         // 56
    if (d < 10) {                                                                                                      // 57
      d = "0" + d;                                                                                                     // 58
    }                                                                                                                  // 59
    return date.getUTCFullYear() + '-' + m + '-' + d;                                                                  // 60
  }                                                                                                                    // 61
};                                                                                                                     // 62
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/simple-schema/simple-schema.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 1
  S = Npm.require("string");                                                                                           // 2
}                                                                                                                      // 3
if (Meteor.isClient) {                                                                                                 // 4
  S = window.S;                                                                                                        // 5
}                                                                                                                      // 6
                                                                                                                       // 7
var schemaDefinition = {                                                                                               // 8
  type: Match.Any,                                                                                                     // 9
  label: Match.Optional(Match.OneOf(String, Function)),                                                                // 10
  optional: Match.Optional(Match.OneOf(Boolean, Function)),                                                            // 11
  min: Match.Optional(Match.OneOf(Number, Date, Function)),                                                            // 12
  max: Match.Optional(Match.OneOf(Number, Date, Function)),                                                            // 13
  minCount: Match.Optional(Match.OneOf(Number, Function)),                                                             // 14
  maxCount: Match.Optional(Match.OneOf(Number, Function)),                                                             // 15
  allowedValues: Match.Optional(Match.OneOf([Match.Any], Function)),                                                   // 16
  decimal: Match.Optional(Boolean),                                                                                    // 17
  regEx: Match.Optional(Match.OneOf(RegExp, [RegExp])),                                                                // 18
  custom: Match.Optional(Function),                                                                                    // 19
  blackbox: Match.Optional(Boolean),                                                                                   // 20
  autoValue: Match.Optional(Function),                                                                                 // 21
  defaultValue: Match.Optional(Match.Any)                                                                              // 22
};                                                                                                                     // 23
                                                                                                                       // 24
//exported                                                                                                             // 25
SimpleSchema = function(schemas, options) {                                                                            // 26
  var self = this;                                                                                                     // 27
  var firstLevelSchemaKeys = [];                                                                                       // 28
  var requiredSchemaKeys = [], firstLevelRequiredSchemaKeys = [];                                                      // 29
  var customSchemaKeys = [], firstLevelCustomSchemaKeys = [];                                                          // 30
  var fieldNameRoot;                                                                                                   // 31
  options = options || {};                                                                                             // 32
  schemas = schemas || {};                                                                                             // 33
                                                                                                                       // 34
  if (!_.isArray(schemas)) {                                                                                           // 35
    schemas = [schemas];                                                                                               // 36
  }                                                                                                                    // 37
                                                                                                                       // 38
  // adjust and store a copy of the schema definitions                                                                 // 39
  self._schema = mergeSchemas(schemas);                                                                                // 40
                                                                                                                       // 41
  // store the list of defined keys for speedier checking                                                              // 42
  self._schemaKeys = [];                                                                                               // 43
                                                                                                                       // 44
  // store autoValue functions by key                                                                                  // 45
  self._autoValues = {};                                                                                               // 46
                                                                                                                       // 47
  // store the list of blackbox keys for passing to MongoObject constructor                                            // 48
  self._blackboxKeys = [];                                                                                             // 49
                                                                                                                       // 50
  // a place to store custom validators for this instance                                                              // 51
  self._validators = [];                                                                                               // 52
                                                                                                                       // 53
  // a place to store custom error messages for this schema                                                            // 54
  self._messages = {};                                                                                                 // 55
                                                                                                                       // 56
  self._depsMessages = new Deps.Dependency;                                                                            // 57
  self._depsLabels = {};                                                                                               // 58
                                                                                                                       // 59
  _.each(self._schema, function(definition, fieldName) {                                                               // 60
    // Validate the field definition                                                                                   // 61
    if (!Match.test(definition, schemaDefinition)) {                                                                   // 62
      throw new Error('Invalid definition for ' + fieldName + ' field.');                                              // 63
    }                                                                                                                  // 64
                                                                                                                       // 65
    fieldNameRoot = fieldName.split(".")[0];                                                                           // 66
                                                                                                                       // 67
    self._schemaKeys.push(fieldName);                                                                                  // 68
                                                                                                                       // 69
    // We support defaultValue shortcut by converting it immediately into an                                           // 70
    // autoValue.                                                                                                      // 71
    if ('defaultValue' in definition) {                                                                                // 72
      if ('autoValue' in definition) {                                                                                 // 73
        console.warn('SimpleSchema: Found both autoValue and defaultValue options for "' + fieldName + '". Ignoring defaultValue.');
      } else {                                                                                                         // 75
        if (fieldName.slice(-2) === ".$") {                                                                            // 76
          throw new Error('An array item field (one that ends with ".$") cannot have defaultValue.')                   // 77
        }                                                                                                              // 78
        self._autoValues[fieldName] = (function defineAutoValue(v) {                                                   // 79
          return function() {                                                                                          // 80
            if (this.operator === null && !this.isSet) {                                                               // 81
              return v;                                                                                                // 82
            }                                                                                                          // 83
          };                                                                                                           // 84
        })(definition.defaultValue);                                                                                   // 85
      }                                                                                                                // 86
    }                                                                                                                  // 87
                                                                                                                       // 88
    if ('autoValue' in definition) {                                                                                   // 89
      if (fieldName.slice(-2) === ".$") {                                                                              // 90
        throw new Error('An array item field (one that ends with ".$") cannot have autoValue.')                        // 91
      }                                                                                                                // 92
      self._autoValues[fieldName] = definition.autoValue;                                                              // 93
    }                                                                                                                  // 94
                                                                                                                       // 95
    self._depsLabels[fieldName] = new Deps.Dependency;                                                                 // 96
                                                                                                                       // 97
    if (definition.blackbox === true) {                                                                                // 98
      self._blackboxKeys.push(fieldName);                                                                              // 99
    }                                                                                                                  // 100
                                                                                                                       // 101
    if (!_.contains(firstLevelSchemaKeys, fieldNameRoot)) {                                                            // 102
      firstLevelSchemaKeys.push(fieldNameRoot);                                                                        // 103
      if (!definition.optional) {                                                                                      // 104
        firstLevelRequiredSchemaKeys.push(fieldNameRoot);                                                              // 105
      }                                                                                                                // 106
                                                                                                                       // 107
      if (definition.custom) {                                                                                         // 108
        firstLevelCustomSchemaKeys.push(fieldNameRoot);                                                                // 109
      }                                                                                                                // 110
    }                                                                                                                  // 111
                                                                                                                       // 112
    if (!definition.optional) {                                                                                        // 113
      requiredSchemaKeys.push(fieldName);                                                                              // 114
    }                                                                                                                  // 115
                                                                                                                       // 116
    if (definition.custom) {                                                                                           // 117
      customSchemaKeys.push(fieldName);                                                                                // 118
    }                                                                                                                  // 119
                                                                                                                       // 120
  });                                                                                                                  // 121
                                                                                                                       // 122
                                                                                                                       // 123
  // Cache these lists                                                                                                 // 124
  self._firstLevelSchemaKeys = firstLevelSchemaKeys;                                                                   // 125
  //required                                                                                                           // 126
  self._requiredSchemaKeys = requiredSchemaKeys;                                                                       // 127
  self._firstLevelRequiredSchemaKeys = firstLevelRequiredSchemaKeys;                                                   // 128
  self._requiredObjectKeys = getObjectKeys(self._schema, requiredSchemaKeys);                                          // 129
  //custom                                                                                                             // 130
  self._customSchemaKeys = customSchemaKeys;                                                                           // 131
  self._firstLevelCustomSchemaKeys = firstLevelCustomSchemaKeys;                                                       // 132
  self._customObjectKeys = getObjectKeys(self._schema, customSchemaKeys);                                              // 133
                                                                                                                       // 134
  // We will store named validation contexts here                                                                      // 135
  self._validationContexts = {};                                                                                       // 136
};                                                                                                                     // 137
                                                                                                                       // 138
// This allows other packages or users to extend the schema                                                            // 139
// definition options that are supported.                                                                              // 140
SimpleSchema.extendOptions = function(options) {                                                                       // 141
  _.extend(schemaDefinition, options);                                                                                 // 142
};                                                                                                                     // 143
                                                                                                                       // 144
// this domain regex matches all domains that have at least one .                                                      // 145
// sadly IPv4 Adresses will be caught too but technically those are valid domains                                      // 146
// this expression is extracted from the original RFC 5322 mail expression                                             // 147
// a modification enforces that the tld consists only of characters                                                    // 148
var RX_DOMAIN = '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z](?:[a-z-]*[a-z])?';                                       // 149
// this domain regex matches everythign that could be a domain in intranet                                             // 150
// that means "localhost" is a valid domain                                                                            // 151
var RX_NAME_DOMAIN = '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.|$))+';                                                  // 152
// strict IPv4 expression which allows 0-255 per oktett                                                                // 153
var RX_IPv4 = '(?:(?:[0-1]?\\d{1,2}|2[0-4]\\d|25[0-5])(?:\\.|$)){4}';                                                  // 154
// strict IPv6 expression which allows (and validates) all shortcuts                                                   // 155
var RX_IPv6 = '(?:(?:[\\dA-Fa-f]{1,4}(?::|$)){8}' // full adress                                                       // 156
  + '|(?=(?:[^:\\s]|:[^:\\s])*::(?:[^:\\s]|:[^:\\s])*$)' // or min/max one '::'                                        // 157
  + '[\\dA-Fa-f]{0,4}(?:::?(?:[\\dA-Fa-f]{1,4}|$)){1,6})'; // and short adress                                         // 158
// this allows domains (also localhost etc) and ip adresses                                                            // 159
var RX_WEAK_DOMAIN = '(?:' + [RX_NAME_DOMAIN,RX_IPv4,RX_IPv6].join('|') + ')';                                         // 160
                                                                                                                       // 161
SimpleSchema.RegEx = {                                                                                                 // 162
  // We use the RegExp suggested by W3C in http://www.w3.org/TR/html5/forms.html#valid-e-mail-address                  // 163
  // This is probably the same logic used by most browsers when type=email, which is our goal. It is                   // 164
  // a very permissive expression. Some apps may wish to be more strict and can write their own RegExp.                // 165
  Email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
                                                                                                                       // 167
  Domain: new RegExp('^' + RX_DOMAIN + '$'),                                                                           // 168
  WeakDomain: new RegExp('^' + RX_WEAK_DOMAIN + '$'),                                                                  // 169
                                                                                                                       // 170
  IP: new RegExp('^(?:' + RX_IPv4 + '|' + RX_IPv6 + ')$'),                                                             // 171
  IPv4: new RegExp('^' + RX_IPv4 + '$'),                                                                               // 172
  IPv6: new RegExp('^' + RX_IPv6 + '$'),                                                                               // 173
  // URL RegEx from https://gist.github.com/dperini/729294                                                             // 174
  // http://mathiasbynens.be/demo/url-regex                                                                            // 175
  Url: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i,
  // unique id from the random package also used by minimongo                                                          // 177
  // character list: https://github.com/meteor/meteor/blob/release/0.8.0/packages/random/random.js#L88                 // 178
  // string length: https://github.com/meteor/meteor/blob/release/0.8.0/packages/random/random.js#L143                 // 179
  Id: /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17}$/                                                // 180
};                                                                                                                     // 181
                                                                                                                       // 182
SimpleSchema._makeGeneric = function(name) {                                                                           // 183
  if (typeof name !== "string")                                                                                        // 184
    return null;                                                                                                       // 185
                                                                                                                       // 186
  return name.replace(/\.[0-9]+\./g, '.$.').replace(/\.[0-9]+/g, '.$');                                                // 187
};                                                                                                                     // 188
                                                                                                                       // 189
SimpleSchema._depsGlobalMessages = new Deps.Dependency;                                                                // 190
                                                                                                                       // 191
// Inherit from Match.Where                                                                                            // 192
// This allow SimpleSchema instance to be recognized as a Match.Where instance as well                                 // 193
// as a SimpleSchema instance                                                                                          // 194
SimpleSchema.prototype = new Match.Where();                                                                            // 195
                                                                                                                       // 196
// If an object is an instance of Match.Where, Meteor built-in check API will look at                                  // 197
// the function named `condition` and will pass it the document to validate                                            // 198
SimpleSchema.prototype.condition = function(obj) {                                                                     // 199
  var self = this;                                                                                                     // 200
                                                                                                                       // 201
  //determine whether obj is a modifier                                                                                // 202
  var isModifier, isNotModifier;                                                                                       // 203
  _.each(obj, function(val, key) {                                                                                     // 204
    if (key.substring(0, 1) === "$") {                                                                                 // 205
      isModifier = true;                                                                                               // 206
    } else {                                                                                                           // 207
      isNotModifier = true;                                                                                            // 208
    }                                                                                                                  // 209
  });                                                                                                                  // 210
                                                                                                                       // 211
  if (isModifier && isNotModifier)                                                                                     // 212
    throw new Match.Error("Object cannot contain modifier operators alongside other keys");                            // 213
                                                                                                                       // 214
  if (!self.newContext().validate(obj, {modifier: isModifier, filter: false, autoConvert: false}))                     // 215
    throw new Match.Error("One or more properties do not match the schema.");                                          // 216
                                                                                                                       // 217
  return true;                                                                                                         // 218
};                                                                                                                     // 219
                                                                                                                       // 220
function logInvalidKeysForContext(context, name) {                                                                     // 221
  Meteor.startup(function() {                                                                                          // 222
    Deps.autorun(function() {                                                                                          // 223
      if (!context.isValid()) {                                                                                        // 224
        console.log('SimpleSchema invalid keys for "' + name + '" context:', context.invalidKeys());                   // 225
      }                                                                                                                // 226
    });                                                                                                                // 227
  });                                                                                                                  // 228
}                                                                                                                      // 229
                                                                                                                       // 230
SimpleSchema.prototype.namedContext = function(name) {                                                                 // 231
  var self = this;                                                                                                     // 232
  if (typeof name !== "string") {                                                                                      // 233
    name = "default";                                                                                                  // 234
  }                                                                                                                    // 235
  if (!self._validationContexts[name]) {                                                                               // 236
    self._validationContexts[name] = new SimpleSchemaValidationContext(self);                                          // 237
                                                                                                                       // 238
    // In debug mode, log all invalid key errors to the browser console                                                // 239
    if (SimpleSchema.debug && Meteor.isClient) {                                                                       // 240
      Deps.nonreactive(function() {                                                                                    // 241
        logInvalidKeysForContext(self._validationContexts[name], name);                                                // 242
      });                                                                                                              // 243
    }                                                                                                                  // 244
  }                                                                                                                    // 245
  return self._validationContexts[name];                                                                               // 246
};                                                                                                                     // 247
                                                                                                                       // 248
// Global custom validators                                                                                            // 249
SimpleSchema._validators = [];                                                                                         // 250
SimpleSchema.addValidator = function(func) {                                                                           // 251
  SimpleSchema._validators.push(func);                                                                                 // 252
};                                                                                                                     // 253
                                                                                                                       // 254
// Instance custom validators                                                                                          // 255
// validator is deprecated; use addValidator                                                                           // 256
SimpleSchema.prototype.addValidator = SimpleSchema.prototype.validator = function(func) {                              // 257
  this._validators.push(func);                                                                                         // 258
};                                                                                                                     // 259
                                                                                                                       // 260
/**                                                                                                                    // 261
 * @method SimpleSchema.prototype.clean                                                                                // 262
 * @param {Object} doc - Document or modifier to clean. Referenced object will be modified in place.                   // 263
 * @param {Object} [options]                                                                                           // 264
 * @param {Boolean} [options.filter=true] - Do filtering?                                                              // 265
 * @param {Boolean} [options.autoConvert=true] - Do automatic type converting?                                         // 266
 * @param {Boolean} [options.removeEmptyStrings=true] - Remove keys in normal object or $set where the value is an empty string?
 * @param {Boolean} [options.getAutoValues=true] - Inject automatic and default values?                                // 268
 * @param {Boolean} [options.isModifier=false] - Is doc a modifier object?                                             // 269
 * @param {Object} [options.extendAutoValueContext] - This object will be added to the `this` context of autoValue functions.
 * @returns {Object} The modified doc.                                                                                 // 271
 *                                                                                                                     // 272
 * Cleans a document or modifier object. By default, will filter, automatically                                        // 273
 * type convert where possible, and inject automatic/default values. Use the options                                   // 274
 * to skip one or more of these.                                                                                       // 275
 */                                                                                                                    // 276
SimpleSchema.prototype.clean = function(doc, options) {                                                                // 277
  var self = this;                                                                                                     // 278
                                                                                                                       // 279
  // By default, doc will be filtered and autoconverted                                                                // 280
  options = _.extend({                                                                                                 // 281
    filter: true,                                                                                                      // 282
    autoConvert: true,                                                                                                 // 283
    removeEmptyStrings: true,                                                                                          // 284
    getAutoValues: true,                                                                                               // 285
    isModifier: false,                                                                                                 // 286
    extendAutoValueContext: {}                                                                                         // 287
  }, options || {});                                                                                                   // 288
                                                                                                                       // 289
  // Convert $pushAll (deprecated) to $push with $each                                                                 // 290
  if ("$pushAll" in doc) {                                                                                             // 291
    console.warn("SimpleSchema.clean: $pushAll is deprecated; converting to $push with $each");                        // 292
    doc.$push = doc.$push || {};                                                                                       // 293
    for (var field in doc.$pushAll) {                                                                                  // 294
      doc.$push[field] = doc.$push[field] || {};                                                                       // 295
      doc.$push[field].$each = doc.$push[field].$each || [];                                                           // 296
      for (var i = 0, ln = doc.$pushAll[field].length; i < ln; i++) {                                                  // 297
        doc.$push[field].$each.push(doc.$pushAll[field][i]);                                                           // 298
      }                                                                                                                // 299
      delete doc.$pushAll;                                                                                             // 300
    }                                                                                                                  // 301
  }                                                                                                                    // 302
                                                                                                                       // 303
  var mDoc = new MongoObject(doc, self._blackboxKeys);                                                                 // 304
                                                                                                                       // 305
  // Filter out anything that would affect keys not defined                                                            // 306
  // or implied by the schema                                                                                          // 307
  options.filter && mDoc.filterGenericKeys(function(genericKey) {                                                      // 308
    var allowed = self.allowsKey(genericKey);                                                                          // 309
    if (!allowed && SimpleSchema.debug) {                                                                              // 310
      console.info('SimpleSchema.clean: filtered out value that would have affected key "' + genericKey + '", which is not allowed by the schema');
    }                                                                                                                  // 312
    return allowed;                                                                                                    // 313
  });                                                                                                                  // 314
                                                                                                                       // 315
  // Autoconvert values if requested and if possible                                                                   // 316
  (options.autoConvert || options.removeEmptyStrings) && mDoc.forEachNode(function() {                                 // 317
    if (this.genericKey) {                                                                                             // 318
      var def = self._schema[this.genericKey];                                                                         // 319
      var val = this.value;                                                                                            // 320
      if (def && val !== void 0) {                                                                                     // 321
        var wasAutoConverted = false;                                                                                  // 322
        if (options.autoConvert) {                                                                                     // 323
          var newVal = typeconvert(val, def.type);                                                                     // 324
          if (newVal !== void 0 && newVal !== val) {                                                                   // 325
            SimpleSchema.debug && console.info('SimpleSchema.clean: autoconverted value ' + val + ' from ' + typeof val + ' to ' + typeof newVal + ' for ' + this.genericKey);
            this.updateValue(newVal);                                                                                  // 327
            wasAutoConverted = true;                                                                                   // 328
            // remove empty strings                                                                                    // 329
            if (options.removeEmptyStrings && (!this.operator || this.operator === "$set") && typeof newVal === "string" && !newVal.length) {
              this.remove();                                                                                           // 331
            }                                                                                                          // 332
          }                                                                                                            // 333
        }                                                                                                              // 334
        // remove empty strings                                                                                        // 335
        if (options.removeEmptyStrings && !wasAutoConverted && (!this.operator || this.operator === "$set") && typeof val === "string" && !val.length) {
          // For a document, we remove any fields that are being set to an empty string                                // 337
          this.remove();                                                                                               // 338
          // For a modifier, we $unset any fields that are being set to an empty string                                // 339
          if (this.operator === "$set") {                                                                              // 340
            var p = this.position.replace("$set", "$unset");                                                           // 341
            mDoc.setValueForPosition(p, "");                                                                           // 342
          }                                                                                                            // 343
        }                                                                                                              // 344
      }                                                                                                                // 345
    }                                                                                                                  // 346
  }, {endPointsOnly: false});                                                                                          // 347
                                                                                                                       // 348
  // Set automatic values                                                                                              // 349
  options.getAutoValues && getAutoValues.call(self, mDoc, options.isModifier, options.extendAutoValueContext);         // 350
                                                                                                                       // 351
  return doc;                                                                                                          // 352
};                                                                                                                     // 353
                                                                                                                       // 354
// Returns the entire schema object or just the definition for one key                                                 // 355
// in the schema.                                                                                                      // 356
SimpleSchema.prototype.schema = function(key) {                                                                        // 357
  var self = this;                                                                                                     // 358
  // if not null or undefined (more specific)                                                                          // 359
  if (key != null) {                                                                                                   // 360
    return self._schema[SimpleSchema._makeGeneric(key)];                                                               // 361
  } else {                                                                                                             // 362
    return self._schema;                                                                                               // 363
  }                                                                                                                    // 364
};                                                                                                                     // 365
                                                                                                                       // 366
// Returns the evaluated definition for one key in the schema                                                          // 367
// key = non-generic key                                                                                               // 368
// [propList] = props to include in the result, for performance                                                        // 369
// [functionContext] = used for evaluating schema options that are functions                                           // 370
SimpleSchema.prototype.getDefinition = function(key, propList, functionContext) {                                      // 371
  var self = this;                                                                                                     // 372
  var defs = self.schema(key);                                                                                         // 373
  if (!defs)                                                                                                           // 374
    return;                                                                                                            // 375
                                                                                                                       // 376
  if (_.isArray(propList)) {                                                                                           // 377
    defs = _.pick(defs, propList);                                                                                     // 378
  } else {                                                                                                             // 379
    defs = _.clone(defs);                                                                                              // 380
  }                                                                                                                    // 381
                                                                                                                       // 382
  // For any options that support specifying a function,                                                               // 383
  // evaluate the functions.                                                                                           // 384
  _.each(['min', 'max', 'minCount', 'maxCount', 'allowedValues', 'optional', 'label'], function (prop) {               // 385
    if (_.isFunction(defs[prop])) {                                                                                    // 386
      defs[prop] = defs[prop].call(functionContext || {});                                                             // 387
    }                                                                                                                  // 388
  });                                                                                                                  // 389
                                                                                                                       // 390
  // Inflect label if not defined                                                                                      // 391
  defs["label"] = defs["label"] || inflectedLabel(key);                                                                // 392
                                                                                                                       // 393
  return defs;                                                                                                         // 394
};                                                                                                                     // 395
                                                                                                                       // 396
// Check if the key is a nested dot-syntax key inside of a blackbox object                                             // 397
SimpleSchema.prototype.keyIsInBlackBox = function(key) {                                                               // 398
  var self = this;                                                                                                     // 399
  var parentPath = SimpleSchema._makeGeneric(key), lastDot, def;                                                       // 400
                                                                                                                       // 401
  // Iterate the dot-syntax hierarchy until we find a key in our schema                                                // 402
  do {                                                                                                                 // 403
    lastDot = parentPath.lastIndexOf('.');                                                                             // 404
    if (lastDot !== -1) {                                                                                              // 405
      parentPath = parentPath.slice(0, lastDot); // Remove last path component                                         // 406
      def = self.getDefinition(parentPath);                                                                            // 407
    }                                                                                                                  // 408
  } while (lastDot !== -1 && !def);                                                                                    // 409
                                                                                                                       // 410
  return !!(def && def.blackbox);                                                                                      // 411
};                                                                                                                     // 412
                                                                                                                       // 413
// Use to dynamically change the schema labels.                                                                        // 414
SimpleSchema.prototype.labels = function(labels) {                                                                     // 415
  var self = this;                                                                                                     // 416
  _.each(labels, function(label, fieldName) {                                                                          // 417
    if (!_.isString(label) && !_.isFunction(label))                                                                    // 418
      return;                                                                                                          // 419
                                                                                                                       // 420
    if (!(fieldName in self._schema))                                                                                  // 421
      return;                                                                                                          // 422
                                                                                                                       // 423
    self._schema[fieldName].label = label;                                                                             // 424
    self._depsLabels[fieldName] && self._depsLabels[fieldName].changed();                                              // 425
  });                                                                                                                  // 426
};                                                                                                                     // 427
                                                                                                                       // 428
// should be used to safely get a label as string                                                                      // 429
SimpleSchema.prototype.label = function(key) {                                                                         // 430
  var self = this;                                                                                                     // 431
                                                                                                                       // 432
  // Get all labels                                                                                                    // 433
  if (key == null) {                                                                                                   // 434
    var result = {};                                                                                                   // 435
    _.each(self.schema(), function(def, fieldName) {                                                                   // 436
      result[fieldName] = self.label(fieldName);                                                                       // 437
    });                                                                                                                // 438
    return result;                                                                                                     // 439
  }                                                                                                                    // 440
                                                                                                                       // 441
  // Get label for one field                                                                                           // 442
  var def = self.getDefinition(key);                                                                                   // 443
  if (def) {                                                                                                           // 444
    self._depsLabels[key] && self._depsLabels[key].depend();                                                           // 445
    return def.label;                                                                                                  // 446
  }                                                                                                                    // 447
                                                                                                                       // 448
  return null;                                                                                                         // 449
};                                                                                                                     // 450
                                                                                                                       // 451
// Global messages                                                                                                     // 452
                                                                                                                       // 453
SimpleSchema._globalMessages = {                                                                                       // 454
  required: "[label] is required",                                                                                     // 455
  minString: "[label] must be at least [min] characters",                                                              // 456
  maxString: "[label] cannot exceed [max] characters",                                                                 // 457
  minNumber: "[label] must be at least [min]",                                                                         // 458
  maxNumber: "[label] cannot exceed [max]",                                                                            // 459
  minDate: "[label] must be on or before [min]",                                                                       // 460
  maxDate: "[label] cannot be after [max]",                                                                            // 461
  minCount: "You must specify at least [minCount] values",                                                             // 462
  maxCount: "You cannot specify more than [maxCount] values",                                                          // 463
  noDecimal: "[label] must be an integer",                                                                             // 464
  notAllowed: "[value] is not an allowed value",                                                                       // 465
  expectedString: "[label] must be a string",                                                                          // 466
  expectedNumber: "[label] must be a number",                                                                          // 467
  expectedBoolean: "[label] must be a boolean",                                                                        // 468
  expectedArray: "[label] must be an array",                                                                           // 469
  expectedObject: "[label] must be an object",                                                                         // 470
  expectedConstructor: "[label] must be a [type]",                                                                     // 471
  regEx: [                                                                                                             // 472
    {msg: "[label] failed regular expression validation"},                                                             // 473
    {exp: SimpleSchema.RegEx.Email, msg: "[label] must be a valid e-mail address"},                                    // 474
    {exp: SimpleSchema.RegEx.WeakEmail, msg: "[label] must be a valid e-mail address"},                                // 475
    {exp: SimpleSchema.RegEx.Domain, msg: "[label] must be a valid domain"},                                           // 476
    {exp: SimpleSchema.RegEx.WeakDomain, msg: "[label] must be a valid domain"},                                       // 477
    {exp: SimpleSchema.RegEx.IP, msg: "[label] must be a valid IPv4 or IPv6 address"},                                 // 478
    {exp: SimpleSchema.RegEx.IPv4, msg: "[label] must be a valid IPv4 address"},                                       // 479
    {exp: SimpleSchema.RegEx.IPv6, msg: "[label] must be a valid IPv6 address"},                                       // 480
    {exp: SimpleSchema.RegEx.Url, msg: "[label] must be a valid URL"},                                                 // 481
    {exp: SimpleSchema.RegEx.Id, msg: "[label] must be a valid alphanumeric ID"}                                       // 482
  ],                                                                                                                   // 483
  keyNotInSchema: "[label] is not allowed by the schema"                                                               // 484
};                                                                                                                     // 485
                                                                                                                       // 486
SimpleSchema.messages = function(messages) {                                                                           // 487
  _.extend(SimpleSchema._globalMessages, messages);                                                                    // 488
  SimpleSchema._depsGlobalMessages.changed();                                                                          // 489
};                                                                                                                     // 490
                                                                                                                       // 491
// Schema-specific messages                                                                                            // 492
                                                                                                                       // 493
SimpleSchema.prototype.messages = function(messages) {                                                                 // 494
  var self = this;                                                                                                     // 495
  _.extend(self._messages, messages);                                                                                  // 496
  self._depsMessages.changed();                                                                                        // 497
};                                                                                                                     // 498
                                                                                                                       // 499
// Returns a string message for the given error type and key. Uses the                                                 // 500
// def and value arguments to fill in placeholders in the error messages.                                              // 501
SimpleSchema.prototype.messageForError = function(type, key, def, value) {                                             // 502
  var self = this;                                                                                                     // 503
  def = def || self.schema(key) || {};                                                                                 // 504
                                                                                                                       // 505
  // Adjust for complex types, currently only regEx,                                                                   // 506
  // where we might have regEx.1 meaning the second                                                                    // 507
  // expression in the array.                                                                                          // 508
  var firstTypePeriod = type.indexOf("."), index = null;                                                               // 509
  if (firstTypePeriod !== -1) {                                                                                        // 510
    index = type.substring(firstTypePeriod + 1);                                                                       // 511
    index = parseInt(index, 10);                                                                                       // 512
    type = type.substring(0, firstTypePeriod);                                                                         // 513
  }                                                                                                                    // 514
                                                                                                                       // 515
  // Which regExp is it?                                                                                               // 516
  var regExpMatch;                                                                                                     // 517
  if (type === "regEx") {                                                                                              // 518
    if (index != null && !isNaN(index)) {                                                                              // 519
      regExpMatch = def.regEx[index];                                                                                  // 520
    } else {                                                                                                           // 521
      regExpMatch = def.regEx;                                                                                         // 522
    }                                                                                                                  // 523
    if (regExpMatch) {                                                                                                 // 524
      regExpMatch = regExpMatch.toString();                                                                            // 525
    }                                                                                                                  // 526
  }                                                                                                                    // 527
                                                                                                                       // 528
  // Prep some strings to be used when finding the correct message for this error                                      // 529
  var typePlusKey = type + " " + key;                                                                                  // 530
  var genericKey = SimpleSchema._makeGeneric(key);                                                                     // 531
  var typePlusGenKey = type + " " + genericKey;                                                                        // 532
                                                                                                                       // 533
  // reactively update when message templates or labels are changed                                                    // 534
  SimpleSchema._depsGlobalMessages.depend();                                                                           // 535
  self._depsMessages.depend();                                                                                         // 536
  self._depsLabels[key] && self._depsLabels[key].depend();                                                             // 537
                                                                                                                       // 538
  // Prep a function that finds the correct message for regEx errors                                                   // 539
  function findRegExError(message) {                                                                                   // 540
    if (type !== "regEx" || !_.isArray(message)) {                                                                     // 541
      return message;                                                                                                  // 542
    }                                                                                                                  // 543
    // Parse regEx messages, which are provided in a special object array format                                       // 544
    // [{exp: RegExp, msg: "Foo"}]                                                                                     // 545
    // Where `exp` is optional                                                                                         // 546
                                                                                                                       // 547
    var msgObj;                                                                                                        // 548
    // First see if there's one where exp matches this expression                                                      // 549
    if (regExpMatch) {                                                                                                 // 550
      msgObj = _.find(message, function (o) {                                                                          // 551
        return o.exp && o.exp.toString() === regExpMatch;                                                              // 552
      });                                                                                                              // 553
    }                                                                                                                  // 554
                                                                                                                       // 555
    // If not, see if there's a default message defined                                                                // 556
    if (!msgObj) {                                                                                                     // 557
      msgObj = _.findWhere(message, {exp: null});                                                                      // 558
      if (!msgObj) {                                                                                                   // 559
        msgObj = _.findWhere(message, {exp: void 0});                                                                  // 560
      }                                                                                                                // 561
    }                                                                                                                  // 562
                                                                                                                       // 563
    return msgObj ? msgObj.msg : null;                                                                                 // 564
  }                                                                                                                    // 565
                                                                                                                       // 566
  // Try finding the correct message to use at various levels, from most                                               // 567
  // specific to least specific.                                                                                       // 568
  var message = self._messages[typePlusKey] ||                  // (1) Use schema-specific message for specific key    // 569
                self._messages[typePlusGenKey] ||               // (2) Use schema-specific message for generic key     // 570
                self._messages[type];                           // (3) Use schema-specific message for type            // 571
  message = findRegExError(message);                                                                                   // 572
                                                                                                                       // 573
  if (!message) {                                                                                                      // 574
    message = SimpleSchema._globalMessages[typePlusKey] ||      // (4) Use global message for specific key             // 575
              SimpleSchema._globalMessages[typePlusGenKey] ||   // (5) Use global message for generic key              // 576
              SimpleSchema._globalMessages[type];               // (6) Use global message for type                     // 577
    message = findRegExError(message);                                                                                 // 578
  }                                                                                                                    // 579
                                                                                                                       // 580
  if (!message) {                                                                                                      // 581
    return "Unknown validation error";                                                                                 // 582
  }                                                                                                                    // 583
                                                                                                                       // 584
  // Now replace all placeholders in the message with the correct values                                               // 585
  message = message.replace("[label]", self.label(key));                                                               // 586
  if (typeof def.minCount !== "undefined") {                                                                           // 587
    message = message.replace("[minCount]", def.minCount);                                                             // 588
  }                                                                                                                    // 589
  if (typeof def.maxCount !== "undefined") {                                                                           // 590
    message = message.replace("[maxCount]", def.maxCount);                                                             // 591
  }                                                                                                                    // 592
  if (value !== void 0 && value !== null) {                                                                            // 593
    message = message.replace("[value]", value.toString());                                                            // 594
  }                                                                                                                    // 595
  var min = def.min;                                                                                                   // 596
  var max = def.max;                                                                                                   // 597
  if (typeof min === "function") {                                                                                     // 598
    min = min();                                                                                                       // 599
  }                                                                                                                    // 600
  if (typeof max === "function") {                                                                                     // 601
    max = max();                                                                                                       // 602
  }                                                                                                                    // 603
  if (def.type === Date || def.type === [Date]) {                                                                      // 604
    if (typeof min !== "undefined") {                                                                                  // 605
      message = message.replace("[min]", Utility.dateToDateString(min));                                               // 606
    }                                                                                                                  // 607
    if (typeof max !== "undefined") {                                                                                  // 608
      message = message.replace("[max]", Utility.dateToDateString(max));                                               // 609
    }                                                                                                                  // 610
  } else {                                                                                                             // 611
    if (typeof min !== "undefined") {                                                                                  // 612
      message = message.replace("[min]", min);                                                                         // 613
    }                                                                                                                  // 614
    if (typeof max !== "undefined") {                                                                                  // 615
      message = message.replace("[max]", max);                                                                         // 616
    }                                                                                                                  // 617
  }                                                                                                                    // 618
  if (def.type instanceof Function) {                                                                                  // 619
    message = message.replace("[type]", def.type.name);                                                                // 620
  }                                                                                                                    // 621
                                                                                                                       // 622
  // Now return the message                                                                                            // 623
  return message;                                                                                                      // 624
};                                                                                                                     // 625
                                                                                                                       // 626
// Returns true if key is explicitly allowed by the schema or implied                                                  // 627
// by other explicitly allowed keys.                                                                                   // 628
// The key string should have $ in place of any numeric array positions.                                               // 629
SimpleSchema.prototype.allowsKey = function(key) {                                                                     // 630
  var self = this;                                                                                                     // 631
                                                                                                                       // 632
  // Loop through all keys in the schema                                                                               // 633
  return _.any(self._schemaKeys, function(schemaKey) {                                                                 // 634
                                                                                                                       // 635
    // If the schema key is the test key, it's allowed.                                                                // 636
    if (schemaKey === key) {                                                                                           // 637
      return true;                                                                                                     // 638
    }                                                                                                                  // 639
                                                                                                                       // 640
    // Black box handling                                                                                              // 641
    if (self.schema(schemaKey).blackbox === true) {                                                                    // 642
      var kl = schemaKey.length;                                                                                       // 643
      var compare1 = key.slice(0, kl + 2);                                                                             // 644
      var compare2 = compare1.slice(0, -1);                                                                            // 645
                                                                                                                       // 646
      // If the test key is the black box key + ".$", then the test                                                    // 647
      // key is NOT allowed because black box keys are by definition                                                   // 648
      // only for objects, and not for arrays.                                                                         // 649
      if (compare1 === schemaKey + '.$')                                                                               // 650
        return false;                                                                                                  // 651
                                                                                                                       // 652
      // Otherwise                                                                                                     // 653
      if (compare2 === schemaKey + '.')                                                                                // 654
        return true;                                                                                                   // 655
    }                                                                                                                  // 656
                                                                                                                       // 657
    return false;                                                                                                      // 658
  });                                                                                                                  // 659
};                                                                                                                     // 660
                                                                                                                       // 661
SimpleSchema.prototype.newContext = function() {                                                                       // 662
  return new SimpleSchemaValidationContext(this);                                                                      // 663
};                                                                                                                     // 664
                                                                                                                       // 665
SimpleSchema.prototype.requiredObjectKeys = function(keyPrefix) {                                                      // 666
  var self = this;                                                                                                     // 667
  if (!keyPrefix) {                                                                                                    // 668
    return self._firstLevelRequiredSchemaKeys;                                                                         // 669
  }                                                                                                                    // 670
  return self._requiredObjectKeys[keyPrefix + "."] || [];                                                              // 671
};                                                                                                                     // 672
                                                                                                                       // 673
SimpleSchema.prototype.requiredSchemaKeys = function() {                                                               // 674
  return this._requiredSchemaKeys;                                                                                     // 675
};                                                                                                                     // 676
                                                                                                                       // 677
SimpleSchema.prototype.firstLevelSchemaKeys = function() {                                                             // 678
  return this._firstLevelSchemaKeys;                                                                                   // 679
};                                                                                                                     // 680
                                                                                                                       // 681
SimpleSchema.prototype.customObjectKeys = function(keyPrefix) {                                                        // 682
  var self = this;                                                                                                     // 683
  if (!keyPrefix) {                                                                                                    // 684
    return self._firstLevelCustomSchemaKeys;                                                                           // 685
  }                                                                                                                    // 686
  return self._customObjectKeys[keyPrefix + "."] || [];                                                                // 687
};                                                                                                                     // 688
                                                                                                                       // 689
SimpleSchema.prototype.customSchemaKeys = function() {                                                                 // 690
  return this._customSchemaKeys;                                                                                       // 691
};                                                                                                                     // 692
                                                                                                                       // 693
/*                                                                                                                     // 694
 * PRIVATE FUNCTIONS                                                                                                   // 695
 */                                                                                                                    // 696
                                                                                                                       // 697
//called by clean()                                                                                                    // 698
var typeconvert = function(value, type) {                                                                              // 699
  if (_.isArray(value) || (_.isObject(value) && !(value instanceof Date)))                                             // 700
    return value; //can't and shouldn't convert arrays or objects                                                      // 701
  if (type === String) {                                                                                               // 702
    if (typeof value !== "undefined" && value !== null && typeof value !== "string") {                                 // 703
      return value.toString();                                                                                         // 704
    }                                                                                                                  // 705
    return value;                                                                                                      // 706
  }                                                                                                                    // 707
  if (type === Number) {                                                                                               // 708
    if (typeof value === "string" && !S(value).isEmpty()) {                                                            // 709
      //try to convert numeric strings to numbers                                                                      // 710
      var numberVal = Number(value);                                                                                   // 711
      if (!isNaN(numberVal)) {                                                                                         // 712
        return numberVal;                                                                                              // 713
      } else {                                                                                                         // 714
        return value; //leave string; will fail validation                                                             // 715
      }                                                                                                                // 716
    }                                                                                                                  // 717
    return value;                                                                                                      // 718
  }                                                                                                                    // 719
  return value;                                                                                                        // 720
};                                                                                                                     // 721
                                                                                                                       // 722
var mergeSchemas = function(schemas) {                                                                                 // 723
                                                                                                                       // 724
  // Merge all provided schema definitions.                                                                            // 725
  // This is effectively a shallow clone of each object, too,                                                          // 726
  // which is what we want since we are going to manipulate it.                                                        // 727
  var mergedSchema = {};                                                                                               // 728
  _.each(schemas, function(schema) {                                                                                   // 729
                                                                                                                       // 730
    // Create a temporary SS instance so that the internal object                                                      // 731
    // we use for merging/extending will be fully expanded                                                             // 732
    if (Match.test(schema, SimpleSchema)) {                                                                            // 733
      schema = schema._schema;                                                                                         // 734
    } else {                                                                                                           // 735
      schema = addImplicitKeys(expandSchema(schema));                                                                  // 736
    }                                                                                                                  // 737
                                                                                                                       // 738
    // Loop through and extend each individual field                                                                   // 739
    // definition. That way you can extend and overwrite                                                               // 740
    // base field definitions.                                                                                         // 741
    _.each(schema, function(def, field) {                                                                              // 742
      mergedSchema[field] = mergedSchema[field] || {};                                                                 // 743
      _.extend(mergedSchema[field], def);                                                                              // 744
    });                                                                                                                // 745
                                                                                                                       // 746
  });                                                                                                                  // 747
                                                                                                                       // 748
  // If we merged some schemas, do this again to make sure                                                             // 749
  // extended definitions are pushed into array item field                                                             // 750
  // definitions properly.                                                                                             // 751
  schemas.length && adjustArrayFields(mergedSchema);                                                                   // 752
                                                                                                                       // 753
  return mergedSchema;                                                                                                 // 754
};                                                                                                                     // 755
                                                                                                                       // 756
var expandSchema = function(schema) {                                                                                  // 757
  // Flatten schema by inserting nested definitions                                                                    // 758
  _.each(schema, function(val, key) {                                                                                  // 759
    var dot, type;                                                                                                     // 760
    if (!val)                                                                                                          // 761
      return;                                                                                                          // 762
    if (Match.test(val.type, SimpleSchema)) {                                                                          // 763
      dot = '.';                                                                                                       // 764
      type = val.type;                                                                                                 // 765
      val.type = Object;                                                                                               // 766
    } else if (Match.test(val.type, [SimpleSchema])) {                                                                 // 767
      dot = '.$.';                                                                                                     // 768
      type = val.type[0];                                                                                              // 769
      val.type = [Object];                                                                                             // 770
    } else {                                                                                                           // 771
      return;                                                                                                          // 772
    }                                                                                                                  // 773
    //add child schema definitions to parent schema                                                                    // 774
    _.each(type._schema, function(subVal, subKey) {                                                                    // 775
      var newKey = key + dot + subKey;                                                                                 // 776
      if (!(newKey in schema))                                                                                         // 777
        schema[newKey] = subVal;                                                                                       // 778
    });                                                                                                                // 779
  });                                                                                                                  // 780
  return schema;                                                                                                       // 781
};                                                                                                                     // 782
                                                                                                                       // 783
var adjustArrayFields = function(schema) {                                                                             // 784
  _.each(schema, function(def, existingKey) {                                                                          // 785
    if (_.isArray(def.type) || def.type === Array) {                                                                   // 786
      // Copy some options to array-item definition                                                                    // 787
      var itemKey = existingKey + ".$";                                                                                // 788
      if (!(itemKey in schema)) {                                                                                      // 789
        schema[itemKey] = {};                                                                                          // 790
      }                                                                                                                // 791
      if (_.isArray(def.type)) {                                                                                       // 792
        schema[itemKey].type = def.type[0];                                                                            // 793
      }                                                                                                                // 794
      if (def.label) {                                                                                                 // 795
        schema[itemKey].label = def.label;                                                                             // 796
      }                                                                                                                // 797
      schema[itemKey].optional = true;                                                                                 // 798
      if (typeof def.min !== "undefined") {                                                                            // 799
        schema[itemKey].min = def.min;                                                                                 // 800
      }                                                                                                                // 801
      if (typeof def.max !== "undefined") {                                                                            // 802
        schema[itemKey].max = def.max;                                                                                 // 803
      }                                                                                                                // 804
      if (typeof def.allowedValues !== "undefined") {                                                                  // 805
        schema[itemKey].allowedValues = def.allowedValues;                                                             // 806
      }                                                                                                                // 807
      if (typeof def.decimal !== "undefined") {                                                                        // 808
        schema[itemKey].decimal = def.decimal;                                                                         // 809
      }                                                                                                                // 810
      if (typeof def.regEx !== "undefined") {                                                                          // 811
        schema[itemKey].regEx = def.regEx;                                                                             // 812
      }                                                                                                                // 813
      // Remove copied options and adjust type                                                                         // 814
      def.type = Array;                                                                                                // 815
      _.each(['min', 'max', 'allowedValues', 'decimal', 'regEx'], function(k) {                                        // 816
        Utility.deleteIfPresent(def, k);                                                                               // 817
      });                                                                                                              // 818
    }                                                                                                                  // 819
  });                                                                                                                  // 820
};                                                                                                                     // 821
                                                                                                                       // 822
/**                                                                                                                    // 823
 * Adds implied keys.                                                                                                  // 824
 * * If schema contains a key like "foo.$.bar" but not "foo", adds "foo".                                              // 825
 * * If schema contains a key like "foo" with an array type, adds "foo.$".                                             // 826
 * @param {Object} schema                                                                                              // 827
 * @returns {Object} modified schema                                                                                   // 828
 */                                                                                                                    // 829
var addImplicitKeys = function(schema) {                                                                               // 830
  var arrayKeysToAdd = [], objectKeysToAdd = [], newKey, key;                                                          // 831
                                                                                                                       // 832
  // Pass 1 (objects)                                                                                                  // 833
  _.each(schema, function(def, existingKey) {                                                                          // 834
    var pos = existingKey.indexOf(".");                                                                                // 835
    while (pos !== -1) {                                                                                               // 836
      newKey = existingKey.substring(0, pos);                                                                          // 837
                                                                                                                       // 838
      // It's an array item; nothing to add                                                                            // 839
      if (newKey.substring(newKey.length - 2) === ".$") {                                                              // 840
        pos = -1;                                                                                                      // 841
      }                                                                                                                // 842
      // It's an array of objects; add it with type [Object] if not already in the schema                              // 843
      else if (existingKey.substring(pos, pos + 3) === ".$.") {                                                        // 844
        arrayKeysToAdd.push(newKey); // add later, since we are iterating over schema right now                        // 845
        pos = existingKey.indexOf(".", pos + 3); // skip over next dot, find the one after                             // 846
      }                                                                                                                // 847
      // It's an object; add it with type Object if not already in the schema                                          // 848
      else {                                                                                                           // 849
        objectKeysToAdd.push(newKey); // add later, since we are iterating over schema right now                       // 850
        pos = existingKey.indexOf(".", pos + 1); // find next dot                                                      // 851
      }                                                                                                                // 852
    }                                                                                                                  // 853
  });                                                                                                                  // 854
                                                                                                                       // 855
  for (var i = 0, ln = arrayKeysToAdd.length; i < ln; i++) {                                                           // 856
    key = arrayKeysToAdd[i];                                                                                           // 857
    if (!(key in schema)) {                                                                                            // 858
      schema[key] = {type: [Object], optional: true};                                                                  // 859
    }                                                                                                                  // 860
  }                                                                                                                    // 861
                                                                                                                       // 862
  for (var i = 0, ln = objectKeysToAdd.length; i < ln; i++) {                                                          // 863
    key = objectKeysToAdd[i];                                                                                          // 864
    if (!(key in schema)) {                                                                                            // 865
      schema[key] = {type: Object, optional: true};                                                                    // 866
    }                                                                                                                  // 867
  }                                                                                                                    // 868
                                                                                                                       // 869
  // Pass 2 (arrays)                                                                                                   // 870
  adjustArrayFields(schema);                                                                                           // 871
                                                                                                                       // 872
  return schema;                                                                                                       // 873
};                                                                                                                     // 874
                                                                                                                       // 875
// Returns an object relating the keys in the list                                                                     // 876
// to their parent object.                                                                                             // 877
var getObjectKeys = function(schema, schemaKeyList) {                                                                  // 878
  var keyPrefix, remainingText, rKeys = {}, loopArray;                                                                 // 879
  _.each(schema, function(definition, fieldName) {                                                                     // 880
    if (definition.type === Object) {                                                                                  // 881
      //object                                                                                                         // 882
      keyPrefix = fieldName + ".";                                                                                     // 883
    } else {                                                                                                           // 884
      return;                                                                                                          // 885
    }                                                                                                                  // 886
                                                                                                                       // 887
    loopArray = [];                                                                                                    // 888
    _.each(schemaKeyList, function(fieldName2) {                                                                       // 889
      if (S(fieldName2).startsWith(keyPrefix)) {                                                                       // 890
        remainingText = fieldName2.substring(keyPrefix.length);                                                        // 891
        if (remainingText.indexOf(".") === -1) {                                                                       // 892
          loopArray.push(remainingText);                                                                               // 893
        }                                                                                                              // 894
      }                                                                                                                // 895
    });                                                                                                                // 896
    rKeys[keyPrefix] = loopArray;                                                                                      // 897
  });                                                                                                                  // 898
  return rKeys;                                                                                                        // 899
};                                                                                                                     // 900
                                                                                                                       // 901
// returns an inflected version of fieldName to use as the label                                                       // 902
var inflectedLabel = function(fieldName) {                                                                             // 903
  var label = fieldName, lastPeriod = label.lastIndexOf(".");                                                          // 904
  if (lastPeriod !== -1) {                                                                                             // 905
    label = label.substring(lastPeriod + 1);                                                                           // 906
    if (label === "$") {                                                                                               // 907
      var pcs = fieldName.split(".");                                                                                  // 908
      label = pcs[pcs.length - 2];                                                                                     // 909
    }                                                                                                                  // 910
  }                                                                                                                    // 911
  if (label === "_id")                                                                                                 // 912
    return "ID";                                                                                                       // 913
  return S(label).humanize().s;                                                                                        // 914
};                                                                                                                     // 915
                                                                                                                       // 916
/**                                                                                                                    // 917
 * @method getAutoValues                                                                                               // 918
 * @private                                                                                                            // 919
 * @param {MongoObject} mDoc                                                                                           // 920
 * @param {Boolean} [isModifier=false] - Is it a modifier doc?                                                         // 921
 * @param {Object} [extendedAutoValueContext] - Object that will be added to the context when calling each autoValue function
 * @returns {undefined}                                                                                                // 923
 *                                                                                                                     // 924
 * Updates doc with automatic values from autoValue functions or default                                               // 925
 * values from defaultValue. Modifies the referenced object in place.                                                  // 926
 */                                                                                                                    // 927
function getAutoValues(mDoc, isModifier, extendedAutoValueContext) {                                                   // 928
  var self = this;                                                                                                     // 929
  var doneKeys = [];                                                                                                   // 930
                                                                                                                       // 931
  //on the client we can add the userId if not already in the custom context                                           // 932
  if (Meteor.isClient && extendedAutoValueContext.userId === void 0) {                                                 // 933
    extendedAutoValueContext.userId = (Meteor.userId && Meteor.userId()) || null;                                      // 934
  }                                                                                                                    // 935
                                                                                                                       // 936
  function runAV(func) {                                                                                               // 937
    var affectedKey = this.key;                                                                                        // 938
    // If already called for this key, skip it                                                                         // 939
    if (_.contains(doneKeys, affectedKey))                                                                             // 940
      return;                                                                                                          // 941
    var lastDot = affectedKey.lastIndexOf('.');                                                                        // 942
    var fieldParentName = lastDot === -1 ? '' : affectedKey.slice(0, lastDot + 1);                                     // 943
    var doUnset = false;                                                                                               // 944
    var autoValue = func.call(_.extend({                                                                               // 945
      isSet: (this.value !== void 0),                                                                                  // 946
      unset: function() {                                                                                              // 947
        doUnset = true;                                                                                                // 948
      },                                                                                                               // 949
      value: this.value,                                                                                               // 950
      operator: this.operator,                                                                                         // 951
      field: function(fName) {                                                                                         // 952
        var keyInfo = mDoc.getInfoForKey(fName) || {};                                                                 // 953
        return {                                                                                                       // 954
          isSet: (keyInfo.value !== void 0),                                                                           // 955
          value: keyInfo.value,                                                                                        // 956
          operator: keyInfo.operator || null                                                                           // 957
        };                                                                                                             // 958
      },                                                                                                               // 959
      siblingField: function(fName) {                                                                                  // 960
        var keyInfo = mDoc.getInfoForKey(fieldParentName + fName) || {};                                               // 961
        return {                                                                                                       // 962
          isSet: (keyInfo.value !== void 0),                                                                           // 963
          value: keyInfo.value,                                                                                        // 964
          operator: keyInfo.operator || null                                                                           // 965
        };                                                                                                             // 966
      }                                                                                                                // 967
    }, extendedAutoValueContext || {}), mDoc.getObject());                                                             // 968
                                                                                                                       // 969
    // Update tracking of which keys we've run autovalue for                                                           // 970
    doneKeys.push(affectedKey);                                                                                        // 971
                                                                                                                       // 972
    if (autoValue === void 0) {                                                                                        // 973
      if (doUnset) {                                                                                                   // 974
        mDoc.removeValueForPosition(this.position);                                                                    // 975
      }                                                                                                                // 976
      return;                                                                                                          // 977
    }                                                                                                                  // 978
                                                                                                                       // 979
    // If the user's auto value is of the pseudo-modifier format, parse it                                             // 980
    // into operator and value.                                                                                        // 981
    var op, newValue;                                                                                                  // 982
    if (_.isObject(autoValue)) {                                                                                       // 983
      for (var key in autoValue) {                                                                                     // 984
        if (autoValue.hasOwnProperty(key) && key.substring(0, 1) === "$") {                                            // 985
          op = key;                                                                                                    // 986
          newValue = autoValue[key];                                                                                   // 987
          break;                                                                                                       // 988
        }                                                                                                              // 989
      }                                                                                                                // 990
    }                                                                                                                  // 991
                                                                                                                       // 992
    // Add $set for updates and upserts if necessary                                                                   // 993
    if (!op && isModifier && this.position.slice(0, 1) !== '$') {                                                      // 994
      op = "$set";                                                                                                     // 995
      newValue = autoValue;                                                                                            // 996
    }                                                                                                                  // 997
                                                                                                                       // 998
    // Update/change value                                                                                             // 999
    if (op) {                                                                                                          // 1000
      mDoc.removeValueForPosition(this.position);                                                                      // 1001
      mDoc.setValueForPosition(op + '[' + affectedKey + ']', newValue);                                                // 1002
    } else {                                                                                                           // 1003
      mDoc.setValueForPosition(this.position, autoValue);                                                              // 1004
    }                                                                                                                  // 1005
  }                                                                                                                    // 1006
                                                                                                                       // 1007
  _.each(self._autoValues, function(func, fieldName) {                                                                 // 1008
    var positionSuffix, key, keySuffix, positions;                                                                     // 1009
                                                                                                                       // 1010
    // If we're under an array, run autovalue for all the properties of                                                // 1011
    // any objects that are present in the nearest ancestor array.                                                     // 1012
    if (fieldName.indexOf("$") !== -1) {                                                                               // 1013
      var testField = fieldName.slice(0, fieldName.lastIndexOf("$") + 1);                                              // 1014
      keySuffix = fieldName.slice(testField.length + 1);                                                               // 1015
      positionSuffix = MongoObject._keyToPosition(keySuffix, true);                                                    // 1016
      keySuffix = '.' + keySuffix;                                                                                     // 1017
      positions = mDoc.getPositionsForGenericKey(testField);                                                           // 1018
    } else {                                                                                                           // 1019
                                                                                                                       // 1020
      // See if anything in the object affects this key                                                                // 1021
      positions = mDoc.getPositionsForGenericKey(fieldName);                                                           // 1022
                                                                                                                       // 1023
      // Run autovalue for properties that are set in the object                                                       // 1024
      if (positions.length) {                                                                                          // 1025
        key = fieldName;                                                                                               // 1026
        keySuffix = '';                                                                                                // 1027
        positionSuffix = '';                                                                                           // 1028
      }                                                                                                                // 1029
                                                                                                                       // 1030
      // Run autovalue for properties that are NOT set in the object                                                   // 1031
      else {                                                                                                           // 1032
        key = fieldName;                                                                                               // 1033
        keySuffix = '';                                                                                                // 1034
        positionSuffix = '';                                                                                           // 1035
        if (isModifier) {                                                                                              // 1036
          positions = ["$set[" + fieldName + "]"];                                                                     // 1037
        } else {                                                                                                       // 1038
          positions = [MongoObject._keyToPosition(fieldName)];                                                         // 1039
        }                                                                                                              // 1040
      }                                                                                                                // 1041
                                                                                                                       // 1042
    }                                                                                                                  // 1043
                                                                                                                       // 1044
    _.each(positions, function(position) {                                                                             // 1045
      runAV.call({                                                                                                     // 1046
        key: (key || MongoObject._positionToKey(position)) + keySuffix,                                                // 1047
        value: mDoc.getValueForPosition(position + positionSuffix),                                                    // 1048
        operator: Utility.extractOp(position),                                                                         // 1049
        position: position + positionSuffix                                                                            // 1050
      }, func);                                                                                                        // 1051
    });                                                                                                                // 1052
  });                                                                                                                  // 1053
}                                                                                                                      // 1054
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/simple-schema/simple-schema-validation.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
doValidation1 = function doValidation1(obj, isModifier, isUpsert, keyToValidate, ss, extendedCustomContext) {          // 1
  // First do some basic checks of the object, and throw errors if necessary                                           // 2
  if (!_.isObject(obj)) {                                                                                              // 3
    throw new Error("The first argument of validate() or validateOne() must be an object");                            // 4
  }                                                                                                                    // 5
                                                                                                                       // 6
  if (!isModifier && Utility.looksLikeModifier(obj)) {                                                                 // 7
    throw new Error("When the validation object contains mongo operators, you must set the modifier option to true");  // 8
  }                                                                                                                    // 9
                                                                                                                       // 10
  var invalidKeys = [];                                                                                                // 11
  var mDoc; // for caching the MongoObject if necessary                                                                // 12
                                                                                                                       // 13
  // Validation function called for each affected key                                                                  // 14
  function validate(val, affectedKey, affectedKeyGeneric, def, op, skipRequiredCheck, isInArrayItemObject, isInSubObject) {
                                                                                                                       // 16
    // Get the schema for this key, marking invalid if there isn't one.                                                // 17
    if (!def) {                                                                                                        // 18
      invalidKeys.push(Utility.errorObject("keyNotInSchema", affectedKey, val, def, ss));                              // 19
      return;                                                                                                          // 20
    }                                                                                                                  // 21
                                                                                                                       // 22
    // Check for missing required values. The general logic is this:                                                   // 23
    // * If the operator is $unset or $rename, it's invalid.                                                           // 24
    // * If the value is null, it's invalid.                                                                           // 25
    // * If the value is undefined and one of the following are true, it's invalid:                                    // 26
    //     * We're validating a key of a sub-object.                                                                   // 27
    //     * We're validating a key of an object that is an array item.                                                // 28
    //     * We're validating a document (as opposed to a modifier).                                                   // 29
    //     * We're validating a key under the $set operator in a modifier, and it's an upsert.                         // 30
    if (!skipRequiredCheck && !def.optional) {                                                                         // 31
      if (                                                                                                             // 32
        val === null ||                                                                                                // 33
        op === "$unset" ||                                                                                             // 34
        op === "$rename" ||                                                                                            // 35
        (val === void 0 && (isInArrayItemObject || isInSubObject || !op || op === "$set"))                             // 36
        ) {                                                                                                            // 37
        invalidKeys.push(Utility.errorObject("required", affectedKey, null, def, ss));                                 // 38
        return;                                                                                                        // 39
      }                                                                                                                // 40
    }                                                                                                                  // 41
                                                                                                                       // 42
    // For $rename, make sure that the new name is allowed by the schema                                               // 43
    if (op === "$rename" && typeof val === "string" && !ss.allowsKey(val)) {                                           // 44
      invalidKeys.push(Utility.errorObject("keyNotInSchema", val, null, null, ss));                                    // 45
      return;                                                                                                          // 46
    }                                                                                                                  // 47
                                                                                                                       // 48
    // No further checking necessary for $unset or $rename                                                             // 49
    if (_.contains(["$unset", "$rename"], op)) {                                                                       // 50
      return;                                                                                                          // 51
    }                                                                                                                  // 52
                                                                                                                       // 53
    // Value checks are not necessary for null or undefined values                                                     // 54
    if (Utility.isNotNullOrUndefined(val)) {                                                                           // 55
                                                                                                                       // 56
      // Check that value is of the correct type                                                                       // 57
      var typeError = doTypeChecks(def, val, op);                                                                      // 58
      if (typeError) {                                                                                                 // 59
        invalidKeys.push(Utility.errorObject(typeError, affectedKey, val, def, ss));                                   // 60
        return;                                                                                                        // 61
      }                                                                                                                // 62
                                                                                                                       // 63
      // Check value against allowedValues array                                                                       // 64
      if (def.allowedValues && !_.contains(def.allowedValues, val)) {                                                  // 65
        invalidKeys.push(Utility.errorObject("notAllowed", affectedKey, val, def, ss));                                // 66
        return;                                                                                                        // 67
      }                                                                                                                // 68
                                                                                                                       // 69
    }                                                                                                                  // 70
                                                                                                                       // 71
    // Perform custom validation                                                                                       // 72
    var lastDot = affectedKey.lastIndexOf('.');                                                                        // 73
    var fieldParentName = lastDot === -1 ? '' : affectedKey.slice(0, lastDot + 1);                                     // 74
    var validators = def.custom ? [def.custom] : [];                                                                   // 75
    validators = validators.concat(ss._validators).concat(SimpleSchema._validators);                                   // 76
    _.every(validators, function(validator) {                                                                          // 77
      var errorType = validator.call(_.extend({                                                                        // 78
        key: affectedKey,                                                                                              // 79
        genericKey: affectedKeyGeneric,                                                                                // 80
        definition: def,                                                                                               // 81
        isSet: (val !== void 0),                                                                                       // 82
        value: val,                                                                                                    // 83
        operator: op,                                                                                                  // 84
        field: function(fName) {                                                                                       // 85
          mDoc = mDoc || new MongoObject(obj, ss._blackboxKeys); //create if necessary, cache for speed                // 86
          var keyInfo = mDoc.getInfoForKey(fName) || {};                                                               // 87
          return {                                                                                                     // 88
            isSet: (keyInfo.value !== void 0),                                                                         // 89
            value: keyInfo.value,                                                                                      // 90
            operator: keyInfo.operator                                                                                 // 91
          };                                                                                                           // 92
        },                                                                                                             // 93
        siblingField: function(fName) {                                                                                // 94
          mDoc = mDoc || new MongoObject(obj, ss._blackboxKeys); //create if necessary, cache for speed                // 95
          var keyInfo = mDoc.getInfoForKey(fieldParentName + fName) || {};                                             // 96
          return {                                                                                                     // 97
            isSet: (keyInfo.value !== void 0),                                                                         // 98
            value: keyInfo.value,                                                                                      // 99
            operator: keyInfo.operator                                                                                 // 100
          };                                                                                                           // 101
        }                                                                                                              // 102
      }, extendedCustomContext || {}));                                                                                // 103
      if (typeof errorType === "string") {                                                                             // 104
        invalidKeys.push(Utility.errorObject(errorType, affectedKey, val, def, ss));                                   // 105
        return false;                                                                                                  // 106
      }                                                                                                                // 107
      return true;                                                                                                     // 108
    });                                                                                                                // 109
  }                                                                                                                    // 110
                                                                                                                       // 111
  // The recursive function                                                                                            // 112
  function checkObj(val, affectedKey, operator, setKeys, isInArrayItemObject, isInSubObject) {                         // 113
    var affectedKeyGeneric, def;                                                                                       // 114
                                                                                                                       // 115
    if (affectedKey) {                                                                                                 // 116
      // When we hit a blackbox key, we don't progress any further                                                     // 117
      if (ss.keyIsInBlackBox(affectedKey)) {                                                                           // 118
        return;                                                                                                        // 119
      }                                                                                                                // 120
                                                                                                                       // 121
      // Make a generic version of the affected key, and use that                                                      // 122
      // to get the schema for this key.                                                                               // 123
      affectedKeyGeneric = SimpleSchema._makeGeneric(affectedKey);                                                     // 124
      def = ss.getDefinition(affectedKey);                                                                             // 125
                                                                                                                       // 126
      // Perform validation for this key                                                                               // 127
      if (!keyToValidate || keyToValidate === affectedKey || keyToValidate === affectedKeyGeneric) {                   // 128
        // We can skip the required check for keys that are ancestors                                                  // 129
        // of those in $set or $setOnInsert because they will be created                                               // 130
        // by MongoDB while setting.                                                                                   // 131
        var skipRequiredCheck = _.some(setKeys, function(sk) {                                                         // 132
          return (sk.slice(0, affectedKey.length + 1) === affectedKey + ".");                                          // 133
        });                                                                                                            // 134
        validate(val, affectedKey, affectedKeyGeneric, def, operator, skipRequiredCheck, isInArrayItemObject, isInSubObject);
      }                                                                                                                // 136
    }                                                                                                                  // 137
                                                                                                                       // 138
    // Temporarily convert missing objects to empty objects                                                            // 139
    // so that the looping code will be called and required                                                            // 140
    // descendent keys can be validated.                                                                               // 141
    if ((val === void 0 || val === null) && (!def || (def.type === Object && !def.optional))) {                        // 142
      val = {};                                                                                                        // 143
    }                                                                                                                  // 144
                                                                                                                       // 145
    // Loop through arrays                                                                                             // 146
    if (_.isArray(val)) {                                                                                              // 147
      _.each(val, function(v, i) {                                                                                     // 148
        checkObj(v, affectedKey + '.' + i, operator, setKeys);                                                         // 149
      });                                                                                                              // 150
    }                                                                                                                  // 151
                                                                                                                       // 152
    // Loop through object keys                                                                                        // 153
    else if (Utility.isBasicObject(val) && (!def || !def.blackbox)) {                                                  // 154
      var presentKeys, requiredKeys, customKeys;                                                                       // 155
                                                                                                                       // 156
      // Get list of present keys                                                                                      // 157
      presentKeys = _.keys(val);                                                                                       // 158
                                                                                                                       // 159
      // For required checks, we want to also loop through all keys expected                                           // 160
      // based on the schema, in case any are missing.                                                                 // 161
      requiredKeys = ss.requiredObjectKeys(affectedKeyGeneric);                                                        // 162
                                                                                                                       // 163
      // We want to be sure to call any present custom functions                                                       // 164
      // even if the value isn't set, so they can be used for custom                                                   // 165
      // required errors, such as basing it on another field's value.                                                  // 166
      customKeys = ss.customObjectKeys(affectedKeyGeneric);                                                            // 167
                                                                                                                       // 168
      // Merge the lists                                                                                               // 169
      var keysToCheck = _.union(presentKeys, requiredKeys || [], customKeys || []);                                    // 170
                                                                                                                       // 171
      // If this object is within an array, make sure we check for                                                     // 172
      // required as if it's not a modifier                                                                            // 173
      var isInArrayItemObject = (affectedKeyGeneric && affectedKeyGeneric.slice(-2) === ".$");                         // 174
                                                                                                                       // 175
      // Check all keys in the merged list                                                                             // 176
      _.each(keysToCheck, function(key) {                                                                              // 177
        checkObj(val[key], Utility.appendAffectedKey(affectedKey, key), operator, setKeys, isInArrayItemObject, true); // 178
      });                                                                                                              // 179
    }                                                                                                                  // 180
                                                                                                                       // 181
  }                                                                                                                    // 182
                                                                                                                       // 183
  function checkModifier(mod) {                                                                                        // 184
    // Check for empty modifier                                                                                        // 185
    if (_.isEmpty(mod)) {                                                                                              // 186
      throw new Error("When the modifier option is true, validation object must have at least one operator");          // 187
    }                                                                                                                  // 188
                                                                                                                       // 189
    // Get a list of all keys in $set and $setOnInsert combined, for use later                                         // 190
    var setKeys = _.keys(mod.$set || {}).concat(_.keys(mod.$setOnInsert || {}));                                       // 191
                                                                                                                       // 192
    // If this is an upsert, add all the $setOnInsert keys to $set;                                                    // 193
    // since we don't know whether it will be an insert or update, we'll                                               // 194
    // validate upserts as if they will be an insert.                                                                  // 195
    if ("$setOnInsert" in mod) {                                                                                       // 196
      if (isUpsert) {                                                                                                  // 197
        mod.$set = mod.$set || {};                                                                                     // 198
        mod.$set = _.extend(mod.$set, mod.$setOnInsert);                                                               // 199
      }                                                                                                                // 200
      delete mod.$setOnInsert;                                                                                         // 201
    }                                                                                                                  // 202
                                                                                                                       // 203
    // Loop through operators                                                                                          // 204
    _.each(mod, function (opObj, op) {                                                                                 // 205
      // If non-operators are mixed in, throw error                                                                    // 206
      if (op.slice(0, 1) !== "$") {                                                                                    // 207
        throw new Error("When the modifier option is true, all validation object keys must be operators. Did you forget `$set`?");
      }                                                                                                                // 209
      if (Utility.shouldCheck(op)) {                                                                                   // 210
        // For an upsert, missing props would not be set if an insert is performed,                                    // 211
        // so we add null keys to the modifier to force the "required" checks to fail                                  // 212
        if (isUpsert && op === "$set") {                                                                               // 213
          var blankObj = {};                                                                                           // 214
          var keys = _.union(ss.requiredObjectKeys(), ss.customObjectKeys());                                          // 215
          _.each(keys, function (extraKey) {                                                                           // 216
            blankObj[extraKey] = null;                                                                                 // 217
          });                                                                                                          // 218
          opObj = _.extend({}, blankObj, opObj);                                                                       // 219
        }                                                                                                              // 220
        _.each(opObj, function (v, k) {                                                                                // 221
          if (op === "$push" || op === "$addToSet") {                                                                  // 222
            if (Utility.isBasicObject(v) && "$each" in v) {                                                            // 223
              v = v.$each;                                                                                             // 224
            } else {                                                                                                   // 225
              k = k + ".0";                                                                                            // 226
            }                                                                                                          // 227
          }                                                                                                            // 228
          checkObj(v, k, op, setKeys);                                                                                 // 229
        });                                                                                                            // 230
      }                                                                                                                // 231
    });                                                                                                                // 232
  }                                                                                                                    // 233
                                                                                                                       // 234
  // Kick off the validation                                                                                           // 235
  if (isModifier)                                                                                                      // 236
    checkModifier(obj);                                                                                                // 237
  else                                                                                                                 // 238
    checkObj(obj);                                                                                                     // 239
                                                                                                                       // 240
  // Make sure there is only one error per fieldName                                                                   // 241
  var addedFieldNames = [];                                                                                            // 242
  invalidKeys = _.filter(invalidKeys, function(errObj) {                                                               // 243
    if (!_.contains(addedFieldNames, errObj.name)) {                                                                   // 244
      addedFieldNames.push(errObj.name);                                                                               // 245
      return true;                                                                                                     // 246
    }                                                                                                                  // 247
    return false;                                                                                                      // 248
  });                                                                                                                  // 249
                                                                                                                       // 250
  return invalidKeys;                                                                                                  // 251
};                                                                                                                     // 252
                                                                                                                       // 253
function doTypeChecks(def, keyValue, op) {                                                                             // 254
  var expectedType = def.type;                                                                                         // 255
                                                                                                                       // 256
  // String checks                                                                                                     // 257
  if (expectedType === String) {                                                                                       // 258
    if (typeof keyValue !== "string") {                                                                                // 259
      return "expectedString";                                                                                         // 260
    } else if (def.max !== null && def.max < keyValue.length) {                                                        // 261
      return "maxString";                                                                                              // 262
    } else if (def.min !== null && def.min > keyValue.length) {                                                        // 263
      return "minString";                                                                                              // 264
    } else if (def.regEx instanceof RegExp && !def.regEx.test(keyValue)) {                                             // 265
      return "regEx";                                                                                                  // 266
    } else if (_.isArray(def.regEx)) {                                                                                 // 267
      var regExError;                                                                                                  // 268
      _.every(def.regEx, function(re, i) {                                                                             // 269
        if (!re.test(keyValue)) {                                                                                      // 270
          regExError = "regEx." + i;                                                                                   // 271
          return false;                                                                                                // 272
        }                                                                                                              // 273
        return true;                                                                                                   // 274
      });                                                                                                              // 275
      if (regExError)                                                                                                  // 276
        return regExError;                                                                                             // 277
    }                                                                                                                  // 278
  }                                                                                                                    // 279
                                                                                                                       // 280
  // Number checks                                                                                                     // 281
  else if (expectedType === Number) {                                                                                  // 282
    if (typeof keyValue !== "number" || isNaN(keyValue)) {                                                             // 283
      return "expectedNumber";                                                                                         // 284
    } else if (op !== "$inc" && def.max !== null && def.max < keyValue) {                                              // 285
      return "maxNumber";                                                                                              // 286
    } else if (op !== "$inc" && def.min !== null && def.min > keyValue) {                                              // 287
      return "minNumber";                                                                                              // 288
    } else if (!def.decimal && keyValue.toString().indexOf(".") > -1) {                                                // 289
      return "noDecimal";                                                                                              // 290
    }                                                                                                                  // 291
  }                                                                                                                    // 292
                                                                                                                       // 293
  // Boolean checks                                                                                                    // 294
  else if (expectedType === Boolean) {                                                                                 // 295
    if (typeof keyValue !== "boolean") {                                                                               // 296
      return "expectedBoolean";                                                                                        // 297
    }                                                                                                                  // 298
  }                                                                                                                    // 299
                                                                                                                       // 300
  // Object checks                                                                                                     // 301
  else if (expectedType === Object) {                                                                                  // 302
    if (!Utility.isBasicObject(keyValue)) {                                                                            // 303
      return "expectedObject";                                                                                         // 304
    }                                                                                                                  // 305
  }                                                                                                                    // 306
                                                                                                                       // 307
  // Array checks                                                                                                      // 308
  else if (expectedType === Array) {                                                                                   // 309
    if (!_.isArray(keyValue)) {                                                                                        // 310
      return "expectedArray";                                                                                          // 311
    } else if (def.minCount !== null && keyValue.length < def.minCount) {                                              // 312
      return "minCount";                                                                                               // 313
    } else if (def.maxCount !== null && keyValue.length > def.maxCount) {                                              // 314
      return "maxCount";                                                                                               // 315
    }                                                                                                                  // 316
  }                                                                                                                    // 317
                                                                                                                       // 318
  // Constructor function checks                                                                                       // 319
  else if (expectedType instanceof Function || Utility.safariBugFix(expectedType)) {                                   // 320
                                                                                                                       // 321
    // Generic constructor checks                                                                                      // 322
    if (!(keyValue instanceof expectedType)) {                                                                         // 323
      return "expectedConstructor";                                                                                    // 324
    }                                                                                                                  // 325
                                                                                                                       // 326
    // Date checks                                                                                                     // 327
    else if (expectedType === Date) {                                                                                  // 328
      if (_.isDate(def.min) && def.min.getTime() > keyValue.getTime()) {                                               // 329
        return "minDate";                                                                                              // 330
      } else if (_.isDate(def.max) && def.max.getTime() < keyValue.getTime()) {                                        // 331
        return "maxDate";                                                                                              // 332
      }                                                                                                                // 333
    }                                                                                                                  // 334
  }                                                                                                                    // 335
                                                                                                                       // 336
}                                                                                                                      // 337
                                                                                                                       // 338
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/simple-schema/simple-schema-validation-new.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
doValidation2 = function doValidation2(obj, isModifier, isUpsert, keyToValidate, ss, extendedCustomContext) {          // 1
                                                                                                                       // 2
  // First do some basic checks of the object, and throw errors if necessary                                           // 3
  if (!_.isObject(obj)) {                                                                                              // 4
    throw new Error("The first argument of validate() or validateOne() must be an object");                            // 5
  }                                                                                                                    // 6
                                                                                                                       // 7
  if (isModifier) {                                                                                                    // 8
    if (_.isEmpty(obj)) {                                                                                              // 9
      throw new Error("When the modifier option is true, validation object must have at least one operator");          // 10
    } else {                                                                                                           // 11
      var allKeysAreOperators = _.every(obj, function(v, k) {                                                          // 12
        return (k.substring(0, 1) === "$");                                                                            // 13
      });                                                                                                              // 14
      if (!allKeysAreOperators) {                                                                                      // 15
        throw new Error("When the modifier option is true, all validation object keys must be operators");             // 16
      }                                                                                                                // 17
                                                                                                                       // 18
      // We use a LocalCollection to figure out what the resulting doc                                                 // 19
      // would be in a worst case scenario. Then we validate that doc                                                  // 20
      // so that we don't have to validate the modifier object directly.                                               // 21
      obj = convertModifierToDoc(obj, ss.schema(), isUpsert);                                                          // 22
    }                                                                                                                  // 23
  } else if (Utility.looksLikeModifier(obj)) {                                                                         // 24
    throw new Error("When the validation object contains mongo operators, you must set the modifier option to true");  // 25
  }                                                                                                                    // 26
                                                                                                                       // 27
  var invalidKeys = [];                                                                                                // 28
  var mDoc; // for caching the MongoObject if necessary                                                                // 29
                                                                                                                       // 30
  // Validation function called for each affected key                                                                  // 31
  function validate(val, affectedKey, affectedKeyGeneric, def, op, skipRequiredCheck, strictRequiredCheck) {           // 32
                                                                                                                       // 33
    // Get the schema for this key, marking invalid if there isn't one.                                                // 34
    if (!def) {                                                                                                        // 35
      invalidKeys.push(Utility.errorObject("keyNotInSchema", affectedKey, val, def, ss));                              // 36
      return;                                                                                                          // 37
    }                                                                                                                  // 38
                                                                                                                       // 39
    // Check for missing required values. The general logic is this:                                                   // 40
    // * If the operator is $unset or $rename, it's invalid.                                                           // 41
    // * If the value is null, it's invalid.                                                                           // 42
    // * If the value is undefined and one of the following are true, it's invalid:                                    // 43
    //     * We're validating a key of a sub-object.                                                                   // 44
    //     * We're validating a key of an object that is an array item.                                                // 45
    //     * We're validating a document (as opposed to a modifier).                                                   // 46
    //     * We're validating a key under the $set operator in a modifier, and it's an upsert.                         // 47
    if (!skipRequiredCheck && !def.optional) {                                                                         // 48
      if (val === null || val === void 0) {                                                                            // 49
        invalidKeys.push(Utility.errorObject("required", affectedKey, null, def, ss));                                 // 50
        return;                                                                                                        // 51
      }                                                                                                                // 52
    }                                                                                                                  // 53
                                                                                                                       // 54
    // Value checks are not necessary for null or undefined values                                                     // 55
    if (Utility.isNotNullOrUndefined(val)) {                                                                           // 56
                                                                                                                       // 57
      // Check that value is of the correct type                                                                       // 58
      var typeError = doTypeChecks(def, val, op);                                                                      // 59
      if (typeError) {                                                                                                 // 60
        invalidKeys.push(Utility.errorObject(typeError, affectedKey, val, def, ss));                                   // 61
        return;                                                                                                        // 62
      }                                                                                                                // 63
                                                                                                                       // 64
      // Check value against allowedValues array                                                                       // 65
      if (def.allowedValues && !_.contains(def.allowedValues, val)) {                                                  // 66
        invalidKeys.push(Utility.errorObject("notAllowed", affectedKey, val, def, ss));                                // 67
        return;                                                                                                        // 68
      }                                                                                                                // 69
                                                                                                                       // 70
    }                                                                                                                  // 71
                                                                                                                       // 72
    // Perform custom validation                                                                                       // 73
    var lastDot = affectedKey.lastIndexOf('.');                                                                        // 74
    var fieldParentName = lastDot === -1 ? '' : affectedKey.slice(0, lastDot + 1);                                     // 75
    var validators = def.custom ? [def.custom] : [];                                                                   // 76
    validators = validators.concat(ss._validators).concat(SimpleSchema._validators);                                   // 77
    _.every(validators, function(validator) {                                                                          // 78
      var errorType = validator.call(_.extend({                                                                        // 79
        key: affectedKey,                                                                                              // 80
        genericKey: affectedKeyGeneric,                                                                                // 81
        definition: def,                                                                                               // 82
        isSet: (val !== void 0),                                                                                       // 83
        value: val,                                                                                                    // 84
        operator: op,                                                                                                  // 85
        field: function(fName) {                                                                                       // 86
          mDoc = mDoc || new MongoObject(obj, ss._blackboxKeys); //create if necessary, cache for speed                // 87
          var keyInfo = mDoc.getInfoForKey(fName) || {};                                                               // 88
          return {                                                                                                     // 89
            isSet: (keyInfo.value !== void 0),                                                                         // 90
            value: keyInfo.value,                                                                                      // 91
            operator: keyInfo.operator                                                                                 // 92
          };                                                                                                           // 93
        },                                                                                                             // 94
        siblingField: function(fName) {                                                                                // 95
          mDoc = mDoc || new MongoObject(obj, ss._blackboxKeys); //create if necessary, cache for speed                // 96
          var keyInfo = mDoc.getInfoForKey(fieldParentName + fName) || {};                                             // 97
          return {                                                                                                     // 98
            isSet: (keyInfo.value !== void 0),                                                                         // 99
            value: keyInfo.value,                                                                                      // 100
            operator: keyInfo.operator                                                                                 // 101
          };                                                                                                           // 102
        }                                                                                                              // 103
      }, extendedCustomContext || {}));                                                                                // 104
      if (typeof errorType === "string") {                                                                             // 105
        invalidKeys.push(Utility.errorObject(errorType, affectedKey, val, def, ss));                                   // 106
        return false;                                                                                                  // 107
      }                                                                                                                // 108
      return true;                                                                                                     // 109
    });                                                                                                                // 110
  }                                                                                                                    // 111
                                                                                                                       // 112
  // The recursive function                                                                                            // 113
  function checkObj(val, affectedKey, skipRequiredCheck, strictRequiredCheck) {                                        // 114
    var affectedKeyGeneric, def;                                                                                       // 115
                                                                                                                       // 116
    if (affectedKey) {                                                                                                 // 117
                                                                                                                       // 118
      // When we hit a blackbox key, we don't progress any further                                                     // 119
      if (ss.keyIsInBlackBox(affectedKey)) {                                                                           // 120
        return;                                                                                                        // 121
      }                                                                                                                // 122
                                                                                                                       // 123
      // Make a generic version of the affected key, and use that                                                      // 124
      // to get the schema for this key.                                                                               // 125
      affectedKeyGeneric = SimpleSchema._makeGeneric(affectedKey);                                                     // 126
      def = ss.getDefinition(affectedKey);                                                                             // 127
                                                                                                                       // 128
      // Perform validation for this key                                                                               // 129
      if (!keyToValidate || keyToValidate === affectedKey || keyToValidate === affectedKeyGeneric) {                   // 130
        validate(val, affectedKey, affectedKeyGeneric, def, null, skipRequiredCheck, strictRequiredCheck);             // 131
      }                                                                                                                // 132
    }                                                                                                                  // 133
                                                                                                                       // 134
    // Temporarily convert missing objects to empty objects                                                            // 135
    // so that the looping code will be called and required                                                            // 136
    // descendent keys can be validated.                                                                               // 137
    if ((val === void 0 || val === null) && (!def || (def.type === Object && !def.optional))) {                        // 138
      val = {};                                                                                                        // 139
    }                                                                                                                  // 140
                                                                                                                       // 141
    // Loop through arrays                                                                                             // 142
    if (_.isArray(val)) {                                                                                              // 143
      _.each(val, function(v, i) {                                                                                     // 144
        checkObj(v, affectedKey + '.' + i);                                                                            // 145
      });                                                                                                              // 146
    }                                                                                                                  // 147
                                                                                                                       // 148
    // Loop through object keys                                                                                        // 149
    else if (Utility.isBasicObject(val) && (!def || !def.blackbox)) {                                                  // 150
      var presentKeys, requiredKeys, customKeys;                                                                       // 151
                                                                                                                       // 152
      // Get list of present keys                                                                                      // 153
      presentKeys = _.keys(val);                                                                                       // 154
                                                                                                                       // 155
      // For required checks, we want to also loop through all keys expected                                           // 156
      // based on the schema, in case any are missing.                                                                 // 157
      requiredKeys = ss.requiredObjectKeys(affectedKeyGeneric);                                                        // 158
                                                                                                                       // 159
      // We want to be sure to call any present custom functions                                                       // 160
      // even if the value isn't set, so they can be used for custom                                                   // 161
      // required errors, such as basing it on another field's value.                                                  // 162
      customKeys = ss.customObjectKeys(affectedKeyGeneric);                                                            // 163
                                                                                                                       // 164
      // Merge the lists                                                                                               // 165
      var keysToCheck = _.union(presentKeys, requiredKeys || [], customKeys || []);                                    // 166
                                                                                                                       // 167
      // If this object is within an array, make sure we check for                                                     // 168
      // required as if it's not a modifier                                                                            // 169
      var strictRequiredCheck = (affectedKeyGeneric && affectedKeyGeneric.slice(-2) === ".$");                         // 170
                                                                                                                       // 171
      // Check all keys in the merged list                                                                             // 172
      _.each(keysToCheck, function(key) {                                                                              // 173
        if (Utility.shouldCheck(key)) {                                                                                // 174
          checkObj(val[key], Utility.appendAffectedKey(affectedKey, key), skipRequiredCheck, strictRequiredCheck);     // 175
        }                                                                                                              // 176
      });                                                                                                              // 177
    }                                                                                                                  // 178
                                                                                                                       // 179
  }                                                                                                                    // 180
                                                                                                                       // 181
  // Kick off the validation                                                                                           // 182
  checkObj(obj);                                                                                                       // 183
                                                                                                                       // 184
  // Make sure there is only one error per fieldName                                                                   // 185
  var addedFieldNames = [];                                                                                            // 186
  invalidKeys = _.filter(invalidKeys, function(errObj) {                                                               // 187
    if (!_.contains(addedFieldNames, errObj.name)) {                                                                   // 188
      addedFieldNames.push(errObj.name);                                                                               // 189
      return true;                                                                                                     // 190
    }                                                                                                                  // 191
    return false;                                                                                                      // 192
  });                                                                                                                  // 193
                                                                                                                       // 194
  return invalidKeys;                                                                                                  // 195
};                                                                                                                     // 196
                                                                                                                       // 197
function convertModifierToDoc(mod, schema, isUpsert) {                                                                 // 198
  // Create unmanaged LocalCollection as scratchpad                                                                    // 199
  var t = new Meteor.Collection(null);                                                                                 // 200
                                                                                                                       // 201
  // LocalCollections are in memory, and it seems                                                                      // 202
  // that it's fine to use them synchronously on                                                                       // 203
  // either client or server                                                                                           // 204
  var id;                                                                                                              // 205
  if (isUpsert) {                                                                                                      // 206
    // We assume upserts will be inserts (conservative                                                                 // 207
    // validation of requiredness)                                                                                     // 208
    id = Random.id();                                                                                                  // 209
    t.upsert({_id: id}, mod);                                                                                          // 210
  } else {                                                                                                             // 211
    var mDoc = new MongoObject(mod);                                                                                   // 212
    // Create a ficticious existing document                                                                           // 213
    var fakeDoc = new MongoObject({});                                                                                 // 214
    _.each(schema, function (def, fieldName) {                                                                         // 215
      var setVal;                                                                                                      // 216
      // Prefill doc with empty arrays to avoid the                                                                    // 217
      // mongodb issue where it does not understand                                                                    // 218
      // that numeric pieces should create arrays.                                                                     // 219
      if (def.type === Array && mDoc.affectsGenericKey(fieldName)) {                                                   // 220
        setVal = [];                                                                                                   // 221
      }                                                                                                                // 222
      // Set dummy values for required fields because                                                                  // 223
      // we assume any existing data would be valid.                                                                   // 224
      else if (!def.optional) {                                                                                        // 225
        // TODO correct value type based on schema type                                                                // 226
        if (def.type === Boolean)                                                                                      // 227
          setVal = true;                                                                                               // 228
        else if (def.type === Number)                                                                                  // 229
          setVal = def.min || 0;                                                                                       // 230
        else if (def.type === Date)                                                                                    // 231
          setVal = def.min || new Date;                                                                                // 232
        else if (def.type === Array)                                                                                   // 233
          setVal = [];                                                                                                 // 234
        else if (def.type === Object)                                                                                  // 235
          setVal = {};                                                                                                 // 236
        else                                                                                                           // 237
          setVal = "0";                                                                                                // 238
      }                                                                                                                // 239
                                                                                                                       // 240
      if (setVal !== void 0) {                                                                                         // 241
        var key = fieldName.replace(/\.\$/g, ".0");                                                                    // 242
        var pos = MongoObject._keyToPosition(key, false);                                                              // 243
        fakeDoc.setValueForPosition(pos, setVal);                                                                      // 244
      }                                                                                                                // 245
    });                                                                                                                // 246
    fakeDoc = fakeDoc.getObject();                                                                                     // 247
    // Insert fake doc into local scratch collection                                                                   // 248
    id = t.insert(fakeDoc);                                                                                            // 249
    // Now update it with the modifier                                                                                 // 250
    t.update(id, mod);                                                                                                 // 251
  }                                                                                                                    // 252
                                                                                                                       // 253
  var doc = t.findOne(id);                                                                                             // 254
  // We're done with it                                                                                                // 255
  t.remove(id);                                                                                                        // 256
  // Currently we don't validate _id unless it is                                                                      // 257
  // explicitly added to the schema                                                                                    // 258
  if (!schema._id) {                                                                                                   // 259
    delete doc._id;                                                                                                    // 260
  }                                                                                                                    // 261
  return doc;                                                                                                          // 262
}                                                                                                                      // 263
                                                                                                                       // 264
function doTypeChecks(def, keyValue, op) {                                                                             // 265
  var expectedType = def.type;                                                                                         // 266
                                                                                                                       // 267
  // String checks                                                                                                     // 268
  if (expectedType === String) {                                                                                       // 269
    if (typeof keyValue !== "string") {                                                                                // 270
      return "expectedString";                                                                                         // 271
    } else if (def.max !== null && def.max < keyValue.length) {                                                        // 272
      return "maxString";                                                                                              // 273
    } else if (def.min !== null && def.min > keyValue.length) {                                                        // 274
      return "minString";                                                                                              // 275
    } else if (def.regEx instanceof RegExp && !def.regEx.test(keyValue)) {                                             // 276
      return "regEx";                                                                                                  // 277
    } else if (_.isArray(def.regEx)) {                                                                                 // 278
      var regExError;                                                                                                  // 279
      _.every(def.regEx, function(re, i) {                                                                             // 280
        if (!re.test(keyValue)) {                                                                                      // 281
          regExError = "regEx." + i;                                                                                   // 282
          return false;                                                                                                // 283
        }                                                                                                              // 284
        return true;                                                                                                   // 285
      });                                                                                                              // 286
      if (regExError)                                                                                                  // 287
        return regExError;                                                                                             // 288
    }                                                                                                                  // 289
  }                                                                                                                    // 290
                                                                                                                       // 291
  // Number checks                                                                                                     // 292
  else if (expectedType === Number) {                                                                                  // 293
    if (typeof keyValue !== "number" || isNaN(keyValue)) {                                                             // 294
      return "expectedNumber";                                                                                         // 295
    } else if (op !== "$inc" && def.max !== null && def.max < keyValue) {                                              // 296
      return "maxNumber";                                                                                              // 297
    } else if (op !== "$inc" && def.min !== null && def.min > keyValue) {                                              // 298
      return "minNumber";                                                                                              // 299
    } else if (!def.decimal && keyValue.toString().indexOf(".") > -1) {                                                // 300
      return "noDecimal";                                                                                              // 301
    }                                                                                                                  // 302
  }                                                                                                                    // 303
                                                                                                                       // 304
  // Boolean checks                                                                                                    // 305
  else if (expectedType === Boolean) {                                                                                 // 306
    if (typeof keyValue !== "boolean") {                                                                               // 307
      return "expectedBoolean";                                                                                        // 308
    }                                                                                                                  // 309
  }                                                                                                                    // 310
                                                                                                                       // 311
  // Object checks                                                                                                     // 312
  else if (expectedType === Object) {                                                                                  // 313
    if (!Utility.isBasicObject(keyValue)) {                                                                            // 314
      return "expectedObject";                                                                                         // 315
    }                                                                                                                  // 316
  }                                                                                                                    // 317
                                                                                                                       // 318
  // Array checks                                                                                                      // 319
  else if (expectedType === Array) {                                                                                   // 320
    if (!_.isArray(keyValue)) {                                                                                        // 321
      return "expectedArray";                                                                                          // 322
    } else if (def.minCount !== null && keyValue.length < def.minCount) {                                              // 323
      return "minCount";                                                                                               // 324
    } else if (def.maxCount !== null && keyValue.length > def.maxCount) {                                              // 325
      return "maxCount";                                                                                               // 326
    }                                                                                                                  // 327
  }                                                                                                                    // 328
                                                                                                                       // 329
  // Constructor function checks                                                                                       // 330
  else if (expectedType instanceof Function || Utility.safariBugFix(expectedType)) {                                   // 331
                                                                                                                       // 332
    // Generic constructor checks                                                                                      // 333
    if (!(keyValue instanceof expectedType)) {                                                                         // 334
      return "expectedConstructor";                                                                                    // 335
    }                                                                                                                  // 336
                                                                                                                       // 337
    // Date checks                                                                                                     // 338
    else if (expectedType === Date) {                                                                                  // 339
      if (_.isDate(def.min) && def.min.getTime() > keyValue.getTime()) {                                               // 340
        return "minDate";                                                                                              // 341
      } else if (_.isDate(def.max) && def.max.getTime() < keyValue.getTime()) {                                        // 342
        return "maxDate";                                                                                              // 343
      }                                                                                                                // 344
    }                                                                                                                  // 345
  }                                                                                                                    // 346
                                                                                                                       // 347
}                                                                                                                      // 348
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/simple-schema/simple-schema-context.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/*                                                                                                                     // 1
 * PUBLIC API                                                                                                          // 2
 */                                                                                                                    // 3
                                                                                                                       // 4
SimpleSchemaValidationContext = function(ss) {                                                                         // 5
  var self = this;                                                                                                     // 6
  self._simpleSchema = ss;                                                                                             // 7
  self._schema = ss.schema();                                                                                          // 8
  self._schemaKeys = _.keys(self._schema);                                                                             // 9
  self._invalidKeys = [];                                                                                              // 10
  //set up validation dependencies                                                                                     // 11
  self._deps = {};                                                                                                     // 12
  self._depsAny = new Deps.Dependency;                                                                                 // 13
  _.each(self._schemaKeys, function(name) {                                                                            // 14
    self._deps[name] = new Deps.Dependency;                                                                            // 15
  });                                                                                                                  // 16
};                                                                                                                     // 17
                                                                                                                       // 18
//validates the object against the simple schema and sets a reactive array of error objects                            // 19
SimpleSchemaValidationContext.prototype.validate = function(doc, options) {                                            // 20
  var self = this;                                                                                                     // 21
  options = _.extend({                                                                                                 // 22
    modifier: false,                                                                                                   // 23
    upsert: false,                                                                                                     // 24
    extendedCustomContext: {}                                                                                          // 25
  }, options || {});                                                                                                   // 26
                                                                                                                       // 27
  //on the client we can add the userId if not already in the custom context                                           // 28
  if (Meteor.isClient && options.extendedCustomContext.userId === void 0) {                                            // 29
    options.extendedCustomContext.userId = (Meteor.userId && Meteor.userId()) || null;                                 // 30
  }                                                                                                                    // 31
                                                                                                                       // 32
  var invalidKeys = doValidation(doc, options.modifier, options.upsert, null, self._simpleSchema, options.extendedCustomContext);
                                                                                                                       // 34
  //now update self._invalidKeys and dependencies                                                                      // 35
                                                                                                                       // 36
  //note any currently invalid keys so that we can mark them as changed                                                // 37
  //due to new validation (they may be valid now, or invalid in a different way)                                       // 38
  var removedKeys = _.pluck(self._invalidKeys, "name");                                                                // 39
                                                                                                                       // 40
  //update                                                                                                             // 41
  self._invalidKeys = invalidKeys;                                                                                     // 42
                                                                                                                       // 43
  //add newly invalid keys to changedKeys                                                                              // 44
  var addedKeys = _.pluck(self._invalidKeys, "name");                                                                  // 45
                                                                                                                       // 46
  //mark all changed keys as changed                                                                                   // 47
  var changedKeys = _.union(addedKeys, removedKeys);                                                                   // 48
  self._markKeysChanged(changedKeys);                                                                                  // 49
                                                                                                                       // 50
  // Return true if it was valid; otherwise, return false                                                              // 51
  return self._invalidKeys.length === 0;                                                                               // 52
};                                                                                                                     // 53
                                                                                                                       // 54
//validates doc against self._schema for one key and sets a reactive array of error objects                            // 55
SimpleSchemaValidationContext.prototype.validateOne = function(doc, keyName, options) {                                // 56
  var self = this;                                                                                                     // 57
  options = _.extend({                                                                                                 // 58
    modifier: false,                                                                                                   // 59
    upsert: false,                                                                                                     // 60
    extendedCustomContext: {}                                                                                          // 61
  }, options || {});                                                                                                   // 62
                                                                                                                       // 63
  //on the client we can add the userId if not already in the custom context                                           // 64
  if (Meteor.isClient && options.extendedCustomContext.userId === void 0) {                                            // 65
    options.extendedCustomContext.userId = (Meteor.userId && Meteor.userId()) || null;                                 // 66
  }                                                                                                                    // 67
                                                                                                                       // 68
  var invalidKeys = doValidation(doc, options.modifier, options.upsert, keyName, self._simpleSchema, options.extendedCustomContext);
                                                                                                                       // 70
  //now update self._invalidKeys and dependencies                                                                      // 71
                                                                                                                       // 72
  //remove objects from self._invalidKeys where name = keyName                                                         // 73
  var newInvalidKeys = [];                                                                                             // 74
  for (var i = 0, ln = self._invalidKeys.length, k; i < ln; i++) {                                                     // 75
    k = self._invalidKeys[i];                                                                                          // 76
    if (k.name !== keyName) {                                                                                          // 77
      newInvalidKeys.push(k);                                                                                          // 78
    }                                                                                                                  // 79
  }                                                                                                                    // 80
  self._invalidKeys = newInvalidKeys;                                                                                  // 81
                                                                                                                       // 82
  //merge invalidKeys into self._invalidKeys                                                                           // 83
  for (var i = 0, ln = invalidKeys.length, k; i < ln; i++) {                                                           // 84
    k = invalidKeys[i];                                                                                                // 85
    self._invalidKeys.push(k);                                                                                         // 86
  }                                                                                                                    // 87
                                                                                                                       // 88
  //mark key as changed due to new validation (they may be valid now, or invalid in a different way)                   // 89
  self._markKeysChanged([keyName]);                                                                                    // 90
                                                                                                                       // 91
  // Return true if it was valid; otherwise, return false                                                              // 92
  return !self._keyIsInvalid(keyName);                                                                                 // 93
};                                                                                                                     // 94
                                                                                                                       // 95
function doValidation(obj, isModifier, isUpsert, keyToValidate, ss, extendedCustomContext) {                           // 96
  var useOld = true; //for now this can be manually changed to try the experimental method, which doesn't yet work properly
  var func = useOld ? doValidation1 : doValidation2;                                                                   // 98
  return func(obj, isModifier, isUpsert, keyToValidate, ss, extendedCustomContext);                                    // 99
}                                                                                                                      // 100
                                                                                                                       // 101
//reset the invalidKeys array                                                                                          // 102
SimpleSchemaValidationContext.prototype.resetValidation = function() {                                                 // 103
  var self = this;                                                                                                     // 104
  var removedKeys = _.pluck(self._invalidKeys, "name");                                                                // 105
  self._invalidKeys = [];                                                                                              // 106
  self._markKeysChanged(removedKeys);                                                                                  // 107
};                                                                                                                     // 108
                                                                                                                       // 109
SimpleSchemaValidationContext.prototype.isValid = function() {                                                         // 110
  var self = this;                                                                                                     // 111
  self._depsAny.depend();                                                                                              // 112
  return !self._invalidKeys.length;                                                                                    // 113
};                                                                                                                     // 114
                                                                                                                       // 115
SimpleSchemaValidationContext.prototype.invalidKeys = function() {                                                     // 116
  var self = this;                                                                                                     // 117
  self._depsAny.depend();                                                                                              // 118
  return self._invalidKeys;                                                                                            // 119
};                                                                                                                     // 120
                                                                                                                       // 121
SimpleSchemaValidationContext.prototype.addInvalidKeys = function(errors) {                                            // 122
  var self = this;                                                                                                     // 123
                                                                                                                       // 124
  if (!errors || !errors.length)                                                                                       // 125
    return;                                                                                                            // 126
                                                                                                                       // 127
  var changedKeys = [];                                                                                                // 128
  _.each(errors, function (errorObject) {                                                                              // 129
    changedKeys.push(errorObject.name);                                                                                // 130
    self._invalidKeys.push(errorObject);                                                                               // 131
  });                                                                                                                  // 132
                                                                                                                       // 133
  self._markKeysChanged(changedKeys);                                                                                  // 134
};                                                                                                                     // 135
                                                                                                                       // 136
SimpleSchemaValidationContext.prototype._markKeysChanged = function(keys) {                                            // 137
  var self = this;                                                                                                     // 138
                                                                                                                       // 139
  if (!keys || !keys.length)                                                                                           // 140
    return;                                                                                                            // 141
                                                                                                                       // 142
  _.each(keys, function(name) {                                                                                        // 143
    var genericName = SimpleSchema._makeGeneric(name);                                                                 // 144
    if (genericName in self._deps) {                                                                                   // 145
      self._deps[genericName].changed();                                                                               // 146
    }                                                                                                                  // 147
  });                                                                                                                  // 148
  self._depsAny.changed();                                                                                             // 149
};                                                                                                                     // 150
                                                                                                                       // 151
SimpleSchemaValidationContext.prototype._keyIsInvalid = function(name, genericName) {                                  // 152
  var self = this;                                                                                                     // 153
  genericName = genericName || SimpleSchema._makeGeneric(name);                                                        // 154
  var specificIsInvalid = !!_.findWhere(self._invalidKeys, {name: name});                                              // 155
  var genericIsInvalid = (genericName !== name) ? (!!_.findWhere(self._invalidKeys, {name: genericName})) : false;     // 156
  return specificIsInvalid || genericIsInvalid;                                                                        // 157
};                                                                                                                     // 158
                                                                                                                       // 159
SimpleSchemaValidationContext.prototype.keyIsInvalid = function(name) {                                                // 160
  var self = this, genericName = SimpleSchema._makeGeneric(name);                                                      // 161
  self._deps[genericName].depend();                                                                                    // 162
  return self._keyIsInvalid(name, genericName);                                                                        // 163
};                                                                                                                     // 164
                                                                                                                       // 165
SimpleSchemaValidationContext.prototype.keyErrorMessage = function(name) {                                             // 166
  var self = this, genericName = SimpleSchema._makeGeneric(name);                                                      // 167
  var ss = self._simpleSchema;                                                                                         // 168
  self._deps[genericName].depend();                                                                                    // 169
                                                                                                                       // 170
  var errorObj = _.findWhere(self._invalidKeys, {name: name});                                                         // 171
  if (!errorObj) {                                                                                                     // 172
    errorObj = _.findWhere(self._invalidKeys, {name: genericName});                                                    // 173
    if (!errorObj) {                                                                                                   // 174
      return "";                                                                                                       // 175
    }                                                                                                                  // 176
  }                                                                                                                    // 177
                                                                                                                       // 178
  var def = ss.schema(genericName);                                                                                    // 179
  if (!def) {                                                                                                          // 180
    return "";                                                                                                         // 181
  }                                                                                                                    // 182
                                                                                                                       // 183
  return ss.messageForError(errorObj.type, errorObj.name, def, errorObj.value);                                        // 184
};                                                                                                                     // 185
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['simple-schema'] = {
  SimpleSchema: SimpleSchema,
  MongoObject: MongoObject
};

})();

//# sourceMappingURL=simple-schema.js.map
