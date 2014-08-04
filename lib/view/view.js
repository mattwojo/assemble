'use strict';

/**
 * Module dependencies.
 */

var path = require('path');
var _ = require('lodash');
var Layout = require('layouts');


/**
 * ## View
 *
 * Initialize a new `View`.
 *
 * Options:
 *
 *   - `defaultEngine` the default view engine name
 *   - `engines` list of available engines
 *   - `encoding` the encoding to use. Defaults to `utf8`.
 *
 * @param {Object} `file` object containing file information
 * @param {Object} `options` additional options
 * @api public
 */

function View(file, options) {
  this.encoding = options.encoding || 'utf8';
  this._layouts = options._layouts || {};
  this.engines = options.engines || {};
  this.data = options.data || {};

  this.partials = this.makePartialsObject(options.partials || {});
  this.layouts = options.layouts || {};
  this.options = options || {};

  this.file = file;
  this.ext = this.file.ext;
  this.defaultEngine = options.defaultEngine || this.ext;

  // this can happen in `minimal` mode
  if (!this.ext && !this.defaultEngine) {
    throw new Error('No default engine was specified and no extension was provided.');
  }

  if (this.defaultEngine && this.defaultEngine[0] !== '.') {
    this.defaultEngine = '.' + this.defaultEngine;
  }

  // If `file.path` was originally passed as just a name
  if (!this.ext) {
    this.path += (this.ext = this.defaultEngine);
  }

  // get the engine needed for rendering based on the current extension
  this.engine = (this.engines[this.ext] || this.engines[this.defaultEngine]);
  // when no engine is found, use the noop engine and setup
  // the ext so it'll be passed around correctly.
  if (!this.engine) {
    this.engine = this.engines['.*'];
    this.options.ext = this.ext;
  }
  this._layout = (this._layouts[this.ext] || this._layouts[this.defaultEngine]);
}


View.prototype.isRenderable = function () {

};


View.prototype.applyLayout = function () {

};


/**
 * ## .partials
 *
 * Return the partials in a format that engines understand
 *
 * **Example:**
 *
 * ```js
 * var partials = assemble.partials(...);
 * ```
 * Results in:
 *
 * ```js
 * {
 *   'foo': 'this is a foo partial',
 *   'bar': 'this is a bar partial'
 * }
 * ```
 *
 * @param {Object} `partials` object of key => View objects to normalize
 * @param  {Function} `fn` renaming function to identify partial
 * @return {Object} The normalized partials object
 * @api private
 */

View.prototype.makePartialsObject = function (partials, fn) {
  fn = fn || function (key) {
    return path.basename(key, path.extname(key));
  };

  var results = {};
  var layouts = new Layout();

  // `name` is most likely a filepath
  _.forOwn(partials, function (partial, name) {

    // let partials use layouts
    if (!partial.layout) {
      var layout = layouts.get(partial.ext);
      partial.layout = layout && layout.flatten(partial);
    }

    // if a layout exists, use that, otherwise, use the partial.contents
    var contents = (partial.layout ? partial.layout.contents : partial.contents);
    results[fn(name)] = contents.toString();

  }.bind(this));
  return results;
};


/**
 * ## .render
 *
 * Render a view with the given context.
 *
 * **Example:**
 *
 * ```js
 * view.render('<%= a %>', {a: 'b'});
 * ```
 *
 * @param  {Object} `options` Options and context to pass to views.
 * @param  {Function} `cb` function that receives the Vinyl file after rendering
 * @api public
 */

View.prototype.render = function (options, cb) {
  var engine = this.engine;
  var str = '';

  // if a layout exists on this view
  // replace the view information with the layout information
  if (this._layout) {
    _.forOwn(this.layouts, function (value, key) {
      var name = path.basename(key, path.extname(key));
      this._layout.set(name, value.data, value.contents.toString(this.encoding));
    }.bind(this));

    str = this.file.contents.toString(this.encoding);
    var obj = this._layout.inject(str, this.file.layout);
    this.file.data = _.extend({}, obj.data, this.file.data);
    this.file.contents = new Buffer(obj.content);
  }

  var opts = _.extend({}, this.options, engine.options, options, this.file.data, {
    partials: this.partials
  }, this.data);

  str = this.file.contents.toString(this.encoding);

  // call the engine to render the view
  engine.render(str, opts, function (err, contents, ext) {
    if (err) {
      return cb(err);
    }

    ext = engine.outputFormat || options.ext || ext;
    if (ext && ext[0] !== '.') {
      ext = '.' + ext;
    }
    this.file.contents = new Buffer(contents);
    cb(null, this.file, ext);
  }.bind(this));
};


/**
 * Expose `View`
 */

module.exports = View;