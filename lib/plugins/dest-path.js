'use strict';

/**
 * Module dependencies.
 */

var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var parsePath = require('parse-filepath');
var utils = require('../utils');
var _ = require('lodash');


/**
 * ## Dest path plugin
 *
 * Assemble plugin to calcuate the destination for each file.
 */

module.exports = function destPathPlugin(dest, options) {
  var assemble = this;
  var opts = _.extend({}, options);

  return through.obj(function (file, encoding, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }
    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('assemble-dest-path', 'Streaming not supported'));
      return cb();
    }

    try {
      // get the new dest extension based on the engine extension
      var destExt = opts.ext || utils.getDestExt(file, assemble);

      // calculate the new destination path and parse the path
      var actualDest = path.join(dest, file.relative);
      actualDest = utils.replaceExt(actualDest, destExt);
      var parsed = parsePath(actualDest);

      // update file.dest with the new properties
      file.dest = file.dest || {};

      for (var key in parsed) {
        if (parsed.hasOwnProperty(key)) {
          file.dest[key] = parsed[key];
        }
      }

      file.dest = _.extend(file.dest, {
        path: actualDest,
        ext: parsed.extname
      });

      // push the file along
      this.push(file);
    } catch (err) {
      this.emit('error', new gutil.PluginError('assemble-dest-path', err));
    }

    return cb();
  });
};