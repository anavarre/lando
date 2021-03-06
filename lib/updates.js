/**
 * Contains update helpers.
 *
 * @since 3.0.0
 * @fires pre-bootstrap
 * @module update
 */

'use strict';

// Modules
var _ = require('./node')._;
var GitHubApi = require('github');
var Promise = require('./promise');
var semver = require('./node').semver;

/**
 * Compares two versions
 *
 * @since 3.0.0
 */
exports.updateAvailable = function(version1, version2) {
  return semver.lt(version1, version2);
};

/**
 * Determines whether we need to fetch updatest or not
 *
 * @since 3.0.0
 */
exports.fetch = function(data) {

  // Return true immediately if update is undefined
  if (!data) {
    return true;
  }

  // Else return based on the expiration
  return !(data.expires >= Math.floor(Date.now()));

};

/**
 * Get latest version info from github
 *
 * @since 3.0.0
 */
exports.refresh = function(version) {

  // GitHub object
  var github = new GitHubApi({Promise: Promise});

  // GitHub repo config
  var landoRepoConfig = {
    owner: 'lando',
    repo: 'lando',
    page: 1,
    'per_page': 10
  };

  // This i promise you
  return github.repos.getReleases(landoRepoConfig)

  // Extract and return the metadata
  .then(function(data) {

    // Get the latest non-draft/non-prerelease version
    data = _.find(_.get(data, 'data', []), function(release) {
      return (release.draft === false && release.prerelease === false);
    });

    // Return the update data
    return {
      version: _.trimStart(_.get(data, 'tag_name', version), 'v'),
      url: _.get(data, 'html_url', ''),
      expires: Math.floor(Date.now()) + 86400000
    };
  })

  // Dont let an error here kill things
  .catch(function() {
    return {
      version: _.trimStart(version, 'v'),
      url: '',
      expires: Math.floor(Date.now()) + 86400000
    };
  });

};
