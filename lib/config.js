/**
 * Helpers to build the initialization configuration.
 *
 * These are meant to be used to help your entrypoint script build a config
 * object
 *
 * @since 3.0.0
 * @module config
 * @example
 *
 * // Get the config helpers
 * var config = require('./config');
 */

'use strict';

// Modules
var _ = require('lodash');
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var yaml = require('js-yaml');
var _config = this;

/**
 * Document
 */
var getSysConfRoot = function() {

  // Win path
  var win = process.env.LANDO_INSTALL_PATH || 'C:\\Program Files\\Lando';

  // Return sysConfRoot based on path
  switch (process.platform) {
    case 'win32': return win;
    case 'darwin': return '/Applications/Lando.app/Contents/MacOS';
    case 'linux': return '/usr/share/lando';
  }

};

/**
 * Uses _.mergeWith to concat arrays, this helps replicate how Docker
 * Compose merges its things
 *
 * @since 3.0.0
 * @example
 *
 * // Take an object and write a docker compose file
 * var newObject = _.mergeWith(a, b, lando.utils.merger);
 */
exports.merge = function(old, fresh) {
  return _.mergeWith(old, fresh, function(s, f) {
    if (_.isArray(s)) {
      return _.uniq(s.concat(f));
    }
  });
};

/**
 * Updates the PATH with dir. This adds dir to the beginning of PATH.
 *
 * @since 3.0.0
 * @param {String} dir - The dir to add
 * @returns {String} Updated PATH string
 * @example
 *
 * // Update the path
 * var config.path = config.updatePath(path);
 */
exports.updatePath = function(dir) {

  // Determine the path string
  var p = (process.platform === 'win32') ? 'Path' : 'PATH';

  // Update process.env and return the path
  if (!_.startsWith(process.env[p], dir)) {
    process.env[p] = [dir, process.env[p]].join(path.delimiter);
  }

  // Return
  return process.env[p];

};

/**
 * Strips process.env of all envvars with PREFIX
 *
 * @since 3.0.0
 * @param {String} prefix - The prefix to strip
 * @returns {Object} Updated process.env
 * @example
 *
 * // Reset the process.env without any LANDO_ prefixed envvars
 * process.env = config.stripEnv('LANDO_');
 */
exports.stripEnv = function(prefix) {

  // Strip it down
  _.each(process.env, function(value, key) {
    if (_.includes(key, prefix)) {
      delete process.env[key];
    }
  });

  // Return
  return process.env;

};


/*
 * Define default config
 */
exports.defaults = function() {

  // Grab version things
  var configFilename = 'config.yml';
  var srcRoot = path.resolve(__dirname, '..');

  // The default config
  var config = {
    configFilename: configFilename,
    configSources: [path.join(srcRoot, configFilename)],
    env: process.env,
    home: os.homedir(),
    logLevel: 'debug',
    logLevelConsole: 'warn',
    node: process.version,
    os: {
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch()
    },
    pluginDirs: [srcRoot],
    srcRoot: srcRoot,
    sysConfRoot: getSysConfRoot(),
    userConfRoot: path.join(os.homedir(), '.lando')
  };

  // Set Path environmental variable if we are on windows so we get access
  // to things like ssh.exe
  // @TODO: is all of this still needed?
  if (process.platform === 'win32') {
    var appData = process.env.LOCALAPPDATA;
    var programFiles = process.env.ProgramFiles;
    var programFiles2 = process.env.ProgramW6432;
    var gitBin1 = path.join(appData, 'Programs', 'Git', 'usr', 'bin');
    var gitBin2 = path.join(programFiles, 'Git', 'usr', 'bin');
    var gitBin3 = path.join(programFiles2, 'Git', 'usr', 'bin');

    // Only add the gitbin to the path if the path doesn't start with
    // it. We want to make sure gitBin is first so other things like
    // putty don't F with it.
    //
    // See https://github.com/kalabox/kalabox/issues/342
    _.forEach([gitBin1, gitBin2, gitBin3], function(gBin) {
      if (fs.existsSync(gBin) && !_.startsWith(process.env.Path, gBin)) {
        process.env.Path = [gBin, process.env.Path].join(';');
      }
    });

  }

  // Return default config
  return config;

};

/*
 * Merge in config file if it exists
 */
exports.loadFiles = function(files) {

  // Start collecting
  var conf = {};

  // Merge all the files on top of one another, last file is last merged and
  // has precedent
  _.forEach(files, function(file) {
    if (fs.existsSync(file)) {
      conf = _config.merge(conf, yaml.safeLoad(fs.readFileSync(file)));
    }
  });

  // Return
  return conf;

};

/*
 * Grab envvars and map to config
 */
exports.loadEnvs = function(prefix) {

  // Start an object of our env
  var envConfig = {};

  // Build object of lando_ envvars
  _.forEach(process.env, function(value, key) {
    if (_.includes(key, prefix)) {
      envConfig[_.camelCase(_.trimStart(key, prefix))] = value;
    }
  });

  // Return our findings
  return envConfig;

};
